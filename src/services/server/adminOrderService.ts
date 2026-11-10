import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import {
  ADMIN_ORDER_MESSAGES,
  COUNTER_METHOD_LABEL,
  OVERRIDE_TEXT,
  canPickupNow,
  counterHoldMinutes,
  counterPaymentFor,
  guestCustomerDoc,
  isProviderChoice,
  planAdminOrder,
  type AdminOverride,
  type AdminPaymentChoice,
  type GuestInput,
} from "@/rental/adminOrders";
import { todaySP } from "@/rental/dates";
import { ORDER_ERROR_MESSAGES, buildOrderRecords, buildRentalOrderDoc, generateOrderCode } from "@/rental/orders";
import { countActiveGames, holdUntilFor, withLiveBookings } from "@/rental/payments";
import type { RentalCustomerType, RentalGameType, RentalOrderType, RentalType } from "@/types";
import { ApiError, isDocId } from "./apiHelpers";
import { getAdminDb } from "./firebaseAdmin";
import { paymentsStatus } from "./payments";
import { ProviderError } from "./payments/mercadoPago";
import { rentalRulesUrl, sendOrderConfirmation } from "./rentalEmails";
import { abortUnpaidOrder, checkoutFailed, createOrderCheckout, createOrderPix, pixFailed } from "./rentalOrderService";
import { MAX_CODE_ATTEMPTS, readRulesVersion, readSettings, settingsRef } from "./rentalService";

export type AdminCustomerRef = { kind: "existing"; uid: string } | { kind: "new"; guest: GuestInput };

export type AdminOrderBody = {
  customer: AdminCustomerRef;
  gameIds: string[];
  startDate: string;
  overrides: AdminOverride[];
  payment: AdminPaymentChoice;
  pickupNow: boolean;
};

export type AdminOrderResult = {
  orderId: string;
  code: string;
  customerUid: string;
  /** Link ou Pix: até quando vale (ms). */
  holdUntil?: number;
  checkoutUrl?: string;
  pixCode?: string;
};

/** Quem criou, como aparece nos cards ("criado por …"). */
function actorOf(token: DecodedIdToken): { uid: string; name: string } {
  const name = (typeof token.name === "string" && token.name.trim()) || token.email || "admin";
  return { uid: token.uid, name };
}

const PAYMENT_NOTE: Record<"paid" | "courtesy", (choice: AdminPaymentChoice) => string> = {
  paid: (c) => `Pago no balcão (${c.kind === "paid" ? COUNTER_METHOD_LABEL[c.method] : "balcão"}).`,
  courtesy: () => "Cortesia do Carcassonne Pub.",
};

/**
 * Aluguel criado pelo admin no balcão. Mesma transação do pedido do site (lê
 * tudo, planeja, grava), com o cliente escolhido pelo admin ou cadastrado na
 * hora sem conta (`guest_…`, com o CPF no índice para juntar depois).
 *
 * - pago no balcão / cortesia / paga na retirada → pedido de balcão, reservado
 *   (ou já retirado, com "levando agora");
 * - link / Pix → pedido online aguardando pagamento: o checkout ou o Pix é
 *   criado depois da transação e, se falhar, as cópias são liberadas na hora.
 */
export async function createAdminOrder(token: DecodedIdToken, body: AdminOrderBody): Promise<AdminOrderResult> {
  const db = getAdminDb();
  const actor = actorOf(token);
  const rentalsCol = db.collection("rentals");
  const gamesCol = db.collection("rentalGames");
  const ordersCol = db.collection("rentalOrders");
  const customersCol = db.collection("rentalCustomers");
  const gameIds = [...new Set(body.gameIds)];
  const choice = body.payment;
  const online = isProviderChoice(choice);

  if (online && !paymentsStatus().configured) {
    throw new ApiError(503, "payment_unavailable", "O Mercado Pago não está configurado no servidor.");
  }

  const order = await db.runTransaction(async (tx) => {
    // 1) Leituras.
    const existingUid = body.customer.kind === "existing" ? body.customer.uid : null;
    const guest = body.customer.kind === "new" ? body.customer.guest : null;
    const cpfRef = guest?.cpf ? db.collection("rentalCpfIndex").doc(guest.cpf) : null;
    const [settingsSnap, rulesSnap, customerSnap, cpfSnap, rentalsSnap, ...gameSnaps] = await Promise.all([
      tx.get(settingsRef(db)),
      tx.get(db.collection("rental-config").doc("rules")),
      existingUid ? tx.get(customersCol.doc(existingUid)) : Promise.resolve(null),
      cpfRef ? tx.get(cpfRef) : Promise.resolve(null),
      existingUid ? tx.get(rentalsCol.where("customerUid", "==", existingUid)) : Promise.resolve(null),
      ...gameIds.map((id) => tx.get(gamesCol.doc(id))),
    ]);

    const now = Date.now();
    const today = todaySP();
    const settings = readSettings(settingsSnap);
    const rulesVersion = readRulesVersion(rulesSnap);

    let customer: RentalCustomerType;
    if (existingUid) {
      if (!customerSnap?.exists) throw new ApiError(404, "customer_not_found", "Cliente não encontrado.");
      customer = customerSnap.data() as RentalCustomerType;
    } else {
      if (cpfSnap?.exists) {
        const ownerUid = String(cpfSnap.data()?.uid ?? "");
        throw new ApiError(409, "customer_exists", "Já existe um cliente com este CPF. Use o cadastro dele.", {
          customerUid: ownerUid,
        });
      }
      customer = guestCustomerDoc(guest!, actor.uid);
    }

    const customerRentals = (rentalsSnap?.docs ?? []).map((d) => d.data() as RentalType);
    const ordersById: Record<string, RentalOrderType> = {};
    const pendingOrderIds = [
      ...new Set(
        customerRentals.filter((r) => r.status === "awaiting_payment" && isDocId(r.orderId)).map((r) => r.orderId),
      ),
    ];
    if (pendingOrderIds.length > 0) {
      const snaps = await tx.getAll(...pendingOrderIds.map((id) => ordersCol.doc(id)));
      for (const s of snaps) if (s.exists) ordersById[s.id] = s.data() as RentalOrderType;
    }
    const activeGamesCount = countActiveGames(customerRentals, ordersById, now);

    const games: Record<string, RentalGameType & { id: string }> = {};
    for (const snap of gameSnaps) {
      if (!snap.exists) continue;
      const data = snap.data() as RentalGameType;
      games[snap.id] = withLiveBookings(
        {
          ...data,
          id: snap.id,
          units: Array.isArray(data.units) ? data.units : [],
          bookings: Array.isArray(data.bookings) ? data.bookings : [],
        },
        now,
      );
    }

    // 2) Planejamento.
    const plan = planAdminOrder(
      { gameIds, startDate: body.startDate, overrides: body.overrides },
      { today, settings, customer, activeGamesCount, games },
    );
    if (!plan.ok) {
      if (plan.code === "override_required") {
        throw new ApiError(
          409,
          "override_required",
          plan.overrides.map((o) => OVERRIDE_TEXT[o]).join(" "),
          { overrides: plan.overrides },
        );
      }
      throw new ApiError(
        409,
        plan.code,
        ADMIN_ORDER_MESSAGES[plan.code] ?? ORDER_ERROR_MESSAGES[plan.code],
        "gameId" in plan && plan.gameId !== undefined ? { gameId: plan.gameId } : undefined,
      );
    }
    if (body.pickupNow && !canPickupNow(choice, body.startDate, today)) {
      throw new ApiError(400, "pickup_not_allowed", "Só dá para registrar a retirada agora em aluguéis que começam hoje e já estão pagos.");
    }

    let code = "";
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !code; attempt++) {
      const candidate = generateOrderCode();
      const clash = await tx.get(rentalsCol.where("code", "==", candidate).limit(1));
      if (clash.empty) code = candidate;
    }
    if (!code) throw new Error("Não foi possível gerar um código de pedido único.");

    // 3) Escritas.
    const customerUid = existingUid ?? `guest_${customersCol.doc().id}`;
    if (guest) {
      tx.set(customersCol.doc(customerUid), {
        ...customer,
        acceptedTermsAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
      if (cpfRef) tx.set(cpfRef, { uid: customerUid, guest: true });
    }

    // Cortesia: o pedido sai a R$ 0 (o valor cheio fica em counterPayment.waived).
    const items = choice.kind === "courtesy" ? plan.items.map((i) => ({ ...i, price: 0 })) : plan.items;
    const fullTotal = plan.items.reduce((sum, i) => sum + i.price, 0);
    const holdUntil = online ? holdUntilFor(now, counterHoldMinutes(settings.onlinePayment.holdMinutes)) : undefined;

    const orderId = rentalsCol.doc().id;
    const rentalRefs = items.map(() => rentalsCol.doc());
    const rentalIds = rentalRefs.map((r) => r.id);
    const customerInfo = { name: customer.name, email: customer.email ?? "", phone: customer.phone };
    const records = buildOrderRecords(items, {
      orderId,
      code,
      rentalIds,
      customerUid,
      customer: customerInfo,
      gameNames: Object.fromEntries(Object.values(games).map((g) => [g.id, g.name])),
      rulesVersion,
      ...(holdUntil !== undefined ? { initialStatus: "awaiting_payment" as const, holdUntil } : {}),
    });
    const orderDoc = buildRentalOrderDoc(
      records.rentals,
      { code, customerUid, customer: customerInfo, rentalIds },
      holdUntil !== undefined ? { holdUntil } : undefined,
    );
    const counterPayment = counterPaymentFor(choice, fullTotal, actor, now);

    records.rentals.forEach((rental, i) => {
      tx.set(rentalRefs[i], {
        ...rental,
        ...(body.pickupNow
          ? { status: "picked_up", pickedUpAt: FieldValue.serverTimestamp(), pickedUpBy: actor.uid }
          : {}),
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    for (const [gameId, newBookings] of Object.entries(records.bookingsByGame)) {
      const added = body.pickupNow ? newBookings.map((b) => ({ ...b, status: "picked_up" as const })) : newBookings;
      tx.update(gamesCol.doc(gameId), {
        bookings: [...games[gameId].bookings, ...added],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.set(ordersCol.doc(orderId), {
      ...orderDoc,
      origin: "admin",
      createdBy: actor,
      ...(counterPayment ? { counterPayment } : {}),
      ...(orderDoc.payment && choice.kind === "pix" ? { payment: { ...orderDoc.payment, channel: "pix" } } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });

    return { orderId, code, customerUid, orderDoc, rentals: records.rentals, customer: customerInfo };
  });

  // Link ou Pix: criados depois da transação; se falharem, as cópias voltam na hora.
  const payment = order.orderDoc.payment;
  if (payment) {
    try {
      if (choice.kind === "pix") {
        const pix = await createOrderPix(order.orderId, { ...order.orderDoc, payment });
        return { orderId: order.orderId, code: order.code, customerUid: order.customerUid, holdUntil: payment.holdUntil, pixCode: pix.qrCode };
      }
      const checkoutUrl = await createOrderCheckout(order.orderId, { ...order.orderDoc, payment });
      return { orderId: order.orderId, code: order.code, customerUid: order.customerUid, holdUntil: payment.holdUntil, checkoutUrl };
    } catch (error) {
      console.error(`Erro ao criar o pagamento do pedido de balcão ${order.orderId}:`, error);
      try {
        await abortUnpaidOrder(order.orderId, "Não foi possível iniciar o pagamento");
      } catch (releaseError) {
        console.error(`Erro ao liberar o pedido ${order.orderId}:`, releaseError);
      }
      throw choice.kind === "pix" && error instanceof ProviderError ? pixFailed() : checkoutFailed();
    }
  }

  // Confirmação só para o cliente (quem criou já sabe); sem e-mail, nada sai.
  if (order.customer.email) {
    try {
      await sendOrderConfirmation(order.customer.email, {
        customerName: order.customer.name,
        code: order.code,
        items: order.rentals.map((r) => ({
          gameName: r.gameName,
          startDate: r.startDate,
          dueDate: r.dueDate,
          price: r.price,
        })),
        total: order.rentals.reduce((sum, r) => sum + r.price, 0),
        rulesUrl: rentalRulesUrl(),
        ...(choice.kind === "paid" || choice.kind === "courtesy" ? { paymentNote: PAYMENT_NOTE[choice.kind](choice) } : {}),
        ...(body.pickupNow ? { pickedUp: true } : {}),
      });
    } catch (error) {
      console.error(`Erro ao enviar a confirmação do pedido de balcão ${order.orderId}:`, error);
    }
  }

  return { orderId: order.orderId, code: order.code, customerUid: order.customerUid };
}
