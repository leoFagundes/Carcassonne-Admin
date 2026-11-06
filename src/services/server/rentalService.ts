import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  asBookings,
  asUnits,
  markUnitUnavailable,
  removeBooking,
  updateBooking,
} from "@/rental/bookings";
import { isValidCpf, normalizeCpf } from "@/rental/cpf";
import { formatDateBR, todaySP } from "@/rental/dates";
import { DEFAULT_RENTAL_RULES, mergeRentalSettings } from "@/rental/defaults";
import {
  ORDER_ERROR_MESSAGES,
  buildOrderRecords,
  buildRentalOrderDoc,
  canChangeDueDate,
  generateOrderCode,
  planOrder,
  type OrderInput,
} from "@/rental/orders";
import {
  cancelPreview,
  countActiveGames,
  holdUntilFor,
  isPaidOnline,
  isValidRefundAmount,
  liveBookings,
  openCancellationReview,
  refundableLeft,
  rentalPrice,
  withLiveBookings,
  type CancelOutcome,
} from "@/rental/payments";
import type {
  RentalCustomerType,
  RentalGameType,
  RentalOrderType,
  RentalPendingRefund,
  RentalReturnCondition,
  RentalSettingsType,
  RentalType,
} from "@/types";
import { ApiError, isDocId } from "./apiHelpers";
import { getAdminDb } from "./firebaseAdmin";
import { paymentsStatus } from "./payments";
import { rentalRulesUrl, sendOrderConfirmation } from "./rentalEmails";
import {
  abortUnpaidOrder,
  cancelRefundKey,
  checkoutFailed,
  commitRefund,
  createOrderCheckout,
  invalidRefundAmount,
  sendProviderRefund,
  sendRefundNotice,
  stageRefund,
} from "./rentalOrderService";

type ProfileBody = { name: string; phone: string; cpf: string; acceptTerms: boolean };

function invalid(message: string): never {
  throw new ApiError(400, "invalid_profile", message);
}

function settingsRef(db: Firestore) {
  return db.collection("rental-config").doc("settings");
}

/** Configurações salvas por cima dos padrões (doc ausente ou parcial). */
function readSettings(snap: DocumentSnapshot): RentalSettingsType {
  return mergeRentalSettings(snap.exists ? (snap.data() as Partial<RentalSettingsType>) : undefined);
}

/** Versão publicada das regras (doc ausente → versão padrão). */
function readRulesVersion(snap: DocumentSnapshot): number {
  const version = snap.exists ? snap.data()?.version : undefined;
  return typeof version === "number" ? version : DEFAULT_RENTAL_RULES.version;
}

/**
 * Grava o cadastro do cliente em rentalCustomers/{uid} e mantém o índice de
 * CPF (rentalCpfIndex/{cpf}) único, tudo na mesma transação.
 */
export async function saveCustomerProfile(
  uid: string,
  email: string,
  body: ProfileBody,
): Promise<void> {
  const db = getAdminDb();

  const settings = readSettings(await settingsRef(db).get());

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 3) invalid("Informe seu nome completo (mínimo 3 letras).");

  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phone.length < 10 || phone.length > 11) {
    invalid("Informe um WhatsApp válido com DDD.");
  }

  const cpf = typeof body?.cpf === "string" ? normalizeCpf(body.cpf) : "";
  if ((settings.requireCpf || cpf) && !isValidCpf(cpf)) invalid("CPF inválido.");

  const customerRef = db.collection("rentalCustomers").doc(uid);

  await db.runTransaction(async (tx) => {
    const customerSnap = await tx.get(customerRef);
    const exists = customerSnap.exists;
    const oldCpf = exists ? String(customerSnap.data()?.cpf ?? "") : "";

    if (!exists && body?.acceptTerms !== true) {
      invalid("É preciso aceitar as regras do aluguel.");
    }

    const newIndexRef = cpf && cpf !== oldCpf ? db.collection("rentalCpfIndex").doc(cpf) : null;
    if (newIndexRef) {
      const indexSnap = await tx.get(newIndexRef);
      if (indexSnap.exists && indexSnap.data()?.uid !== uid) {
        throw new ApiError(409, "cpf_in_use", "Este CPF já está cadastrado em outra conta.");
      }
    }

    if (newIndexRef) tx.set(newIndexRef, { uid });
    if (oldCpf && oldCpf !== cpf) {
      tx.delete(db.collection("rentalCpfIndex").doc(oldCpf));
    }

    if (exists) {
      tx.update(customerRef, { name, phone, cpf, email });
    } else {
      tx.set(customerRef, {
        name,
        phone,
        cpf,
        email,
        acceptedTermsAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

const MAX_CODE_ATTEMPTS = 5;

/**
 * Cria o pedido inteiro (tudo ou nada) numa transação: relê tudo do banco,
 * replaneja com `planOrder` e só então grava os `rentals`, os bookings dos
 * jogos e o doc `rentalOrders/{orderId}`. Em conflito (ex.: dois clientes
 * pegando a última cópia) o Firestore repete a função com leituras novas, e o
 * perdedor recebe `game_unavailable`.
 *
 * Pagamento online ligado: rentals `awaiting_payment` e bookings `held` até
 * `holdUntil`; depois da transação cria o checkout e devolve o link (sem
 * e-mail — ele vai na confirmação do pagamento). Desligado: reserva na hora e
 * envia a confirmação, como sempre.
 */
export async function createOrder(
  token: DecodedIdToken,
  input: OrderInput,
): Promise<{ orderId: string; code: string; checkoutUrl?: string }> {
  const db = getAdminDb();
  const uid = token.uid;
  const rentalsCol = db.collection("rentals");
  const gamesCol = db.collection("rentalGames");
  const ordersCol = db.collection("rentalOrders");
  // Repetidos são recusados pelo planOrder (duplicate_game); aqui só não lê duas vezes.
  const gameIds = [...new Set(input.gameIds)];

  const order = await db.runTransaction(async (tx) => {
    // 1) Leituras — o Admin SDK exige todas antes de qualquer escrita.
    const [settingsSnap, rulesSnap, customerSnap, rentalsSnap, ...gameSnaps] =
      await Promise.all([
        tx.get(settingsRef(db)),
        tx.get(db.collection("rental-config").doc("rules")),
        tx.get(db.collection("rentalCustomers").doc(uid)),
        tx.get(rentalsCol.where("customerUid", "==", uid)),
        ...gameIds.map((id) => tx.get(gamesCol.doc(id))),
      ]);

    const now = Date.now();
    const settings = readSettings(settingsSnap);
    const rulesVersion = readRulesVersion(rulesSnap);
    const customer = customerSnap.exists
      ? (customerSnap.data() as RentalCustomerType)
      : null;
    const customerRentals = rentalsSnap.docs.map((d) => d.data() as RentalType);
    // Só os pedidos dos aluguéis aguardando pagamento: eles contam no limite
    // enquanto a reserva temporária do pedido vale.
    const ordersById: Record<string, RentalOrderType> = {};
    const pendingOrderIds = [
      ...new Set(
        customerRentals
          .filter((r) => r.status === "awaiting_payment" && isDocId(r.orderId))
          .map((r) => r.orderId),
      ),
    ];
    if (pendingOrderIds.length > 0) {
      const orderSnaps = await tx.getAll(...pendingOrderIds.map((id) => ordersCol.doc(id)));
      for (const snap of orderSnaps) {
        if (snap.exists) ordersById[snap.id] = snap.data() as RentalOrderType;
      }
    }
    const activeGamesCount = countActiveGames(customerRentals, ordersById, now);

    // Holds vencidos não contam como ocupados (e somem do jogo ao gravar).
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

    // 2) Planejamento (puro, tudo ou nada).
    const plan = planOrder(input, {
      today: todaySP(),
      settings,
      rulesVersion,
      customer,
      emailVerified: token.email_verified === true,
      activeGamesCount,
      games,
    });
    if (!plan.ok) {
      throw new ApiError(
        409,
        plan.code,
        ORDER_ERROR_MESSAGES[plan.code],
        plan.gameId === undefined ? undefined : { gameId: plan.gameId },
      );
    }
    // planOrder já recusa cliente ausente (profile_incomplete).
    if (!customer) throw new Error("Pedido aprovado sem cadastro do cliente.");

    // Pagamento online ligado sem credenciais: recusa antes de reservar nada.
    const online = settings.onlinePayment.enabled === true;
    if (online && !paymentsStatus().configured) {
      throw new ApiError(
        503,
        "payment_unavailable",
        "O pagamento online está indisponível no momento. Tente novamente mais tarde.",
      );
    }
    const holdUntil = online ? holdUntilFor(now, settings.onlinePayment.holdMinutes) : undefined;

    // Código curto do balcão: não repete o de outro pedido (ainda é leitura).
    let code = "";
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !code; attempt++) {
      const candidate = generateOrderCode();
      const clash = await tx.get(rentalsCol.where("code", "==", candidate).limit(1));
      if (clash.empty) code = candidate;
    }
    if (!code) throw new Error("Não foi possível gerar um código de pedido único.");

    // 3) Escritas.
    const orderId = rentalsCol.doc().id;
    const rentalRefs = plan.items.map(() => rentalsCol.doc());
    const customerInfo = {
      name: customer.name,
      email: token.email ?? customer.email,
      phone: customer.phone,
    };
    const rentalIds = rentalRefs.map((ref) => ref.id);
    const { rentals, bookingsByGame } = buildOrderRecords(plan.items, {
      orderId,
      code,
      rentalIds,
      customerUid: uid,
      customer: customerInfo,
      gameNames: Object.fromEntries(Object.values(games).map((g) => [g.id, g.name])),
      rulesVersion,
      ...(holdUntil !== undefined
        ? { initialStatus: "awaiting_payment" as const, holdUntil }
        : {}),
    });
    const orderDoc = buildRentalOrderDoc(
      rentals,
      { code, customerUid: uid, customer: customerInfo, rentalIds },
      holdUntil !== undefined ? { holdUntil } : undefined,
    );

    rentals.forEach((rental, i) => {
      tx.set(rentalRefs[i], { ...rental, createdAt: FieldValue.serverTimestamp() });
    });
    for (const [gameId, newBookings] of Object.entries(bookingsByGame)) {
      tx.update(gamesCol.doc(gameId), {
        bookings: [...games[gameId].bookings, ...newBookings],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.set(ordersCol.doc(orderId), { ...orderDoc, createdAt: FieldValue.serverTimestamp() });

    return {
      orderId,
      code,
      rentals,
      orderDoc,
      customer: customerInfo,
      staffEmail: settings.staffEmail,
    };
  });

  // Online: checkout depois da transação; se falhar, libera as cópias na hora.
  const payment = order.orderDoc.payment;
  if (payment) {
    try {
      const checkoutUrl = await createOrderCheckout(order.orderId, {
        ...order.orderDoc,
        payment,
      });
      return { orderId: order.orderId, code: order.code, checkoutUrl };
    } catch (error) {
      console.error(`Erro ao criar o checkout do pedido ${order.orderId}:`, error);
      try {
        await abortUnpaidOrder(order.orderId, "Não foi possível iniciar o pagamento");
      } catch (releaseError) {
        console.error(`Erro ao liberar o pedido ${order.orderId}:`, releaseError);
      }
      throw checkoutFailed();
    }
  }

  // Fora da transação: falha no e-mail não desfaz o pedido.
  try {
    await sendOrderConfirmation(
      order.customer.email,
      {
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
      },
      order.staffEmail,
    );
  } catch (error) {
    console.error(`Erro ao enviar a confirmação do pedido ${order.orderId}:`, error);
  }

  return { orderId: order.orderId, code: order.code };
}

const MAX_CANCEL_REASON = 500;

type CancelActor = { uid: string; isAdmin: boolean };

/** Aluguel → canceled e libera a cópia (remove o booking; limpa holds vencidos). */
function writeCancel(
  tx: Transaction,
  rentalRef: DocumentReference,
  rentalId: string,
  gameSnap: DocumentSnapshot,
  actor: CancelActor,
  cleanReason: string,
): void {
  tx.update(rentalRef, {
    status: "canceled",
    canceledAt: FieldValue.serverTimestamp(),
    canceledBy: actor.isAdmin ? "admin" : "customer",
    ...(cleanReason ? { cancelReason: cleanReason } : {}),
  });
  if (gameSnap.exists) {
    tx.update(gameSnap.ref, {
      bookings: removeBooking(liveBookings(asBookings(gameSnap.data()?.bookings), Date.now()), rentalId),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

const cancelableFor = (actor: CancelActor): RentalType["status"][] =>
  actor.isAdmin ? ["reserved", "picked_up"] : ["reserved"];

type CancelPlan =
  | { kind: "done"; outcome: CancelOutcome }
  | {
      kind: "refund";
      orderId: string;
      paymentId: string;
      intent: RentalPendingRefund;
      emailReason: string;
      summary: Pick<RentalOrderType, "code" | "customer">;
    };

/**
 * Cancela um aluguel e libera a cópia. Cliente: só o próprio e só `reserved`.
 * Admin: `reserved` ou `picked_up`.
 *
 * Pedido no balcão ou online não pago: cancela numa transação, como sempre.
 * Pedido online pago:
 * - cliente, política `full`/`fee` → reembolsa o valor daquele jogo (menos a
 *   taxa, até o que falta devolver) e só então cancela; `manual` → cancela e
 *   abre a análise do reembolso (`cancellationReview`).
 * - admin → `refundAmount` (centavos, 0 = sem reembolso) obrigatório, até o
 *   preço do jogo e o que falta devolver.
 * Reembolso recusado pelo provedor → não cancela (`refund_failed`).
 */
export async function cancelRental(
  rentalId: string,
  actor: CancelActor,
  reason?: string,
  refundAmount?: unknown,
): Promise<CancelOutcome> {
  const db = getAdminDb();
  const rentalRef = db.collection("rentals").doc(rentalId);
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, MAX_CANCEL_REASON) : "";
  const cancelable = cancelableFor(actor);

  const plan = await db.runTransaction(async (tx): Promise<CancelPlan> => {
    const rentalSnap = await tx.get(rentalRef);
    if (!rentalSnap.exists) {
      throw new ApiError(404, "not_found", "Aluguel não encontrado.");
    }
    const rental = rentalSnap.data() as RentalType;

    if (!actor.isAdmin && rental.customerUid !== actor.uid) {
      throw new ApiError(403, "forbidden", "Você não tem permissão para esta ação.");
    }
    if (!cancelable.includes(rental.status)) {
      throw new ApiError(409, "not_cancelable", "Este aluguel não pode mais ser cancelado.");
    }

    // Leituras antes de qualquer escrita.
    const orderRef = isDocId(rental.orderId) ? db.collection("rentalOrders").doc(rental.orderId) : null;
    const [gameSnap, orderSnap, settingsSnap] = await Promise.all([
      tx.get(db.collection("rentalGames").doc(rental.gameId)),
      orderRef ? tx.get(orderRef) : Promise.resolve(null),
      tx.get(settingsRef(db)),
    ]);
    const order = orderSnap?.exists ? (orderSnap.data() as RentalOrderType) : undefined;
    const cancelNow = (outcome: CancelOutcome): CancelPlan => {
      writeCancel(tx, rentalRef, rentalId, gameSnap, actor, cleanReason);
      return { kind: "done", outcome };
    };

    if (!orderRef || !order || !isPaidOnline(order)) return cancelNow({ kind: "canceled" });

    const now = Date.now();
    const key = cancelRefundKey(orderRef.id, rentalId);
    const policy = readSettings(settingsSnap).onlinePayment;
    const feeNote = policy.cancellationPolicy === "fee" && policy.feePercent > 0;
    const ownPending = (order.payment?.pendingRefunds ?? []).find((p) => p.key === key);

    let amount: number;
    if (actor.isAdmin) {
      if (refundAmount === undefined || refundAmount === null) {
        throw new ApiError(
          400,
          "refund_amount_required",
          "Informe quanto devolver ao cliente (0 para não devolver).",
        );
      }
      const cap = Math.min(rentalPrice(order, rentalId), refundableLeft(order, key));
      if (!isValidRefundAmount(refundAmount, cap)) throw invalidRefundAmount(cap);
      amount = refundAmount;
    } else if (ownPending) {
      // Repetição de um cancelamento cujo reembolso ficou no meio.
      amount = ownPending.amount;
    } else {
      const preview = cancelPreview(order, rentalId, policy);
      if (preview.kind === "review") {
        tx.update(orderRef, {
          cancellationReview: openCancellationReview(order.cancellationReview, rentalId, now),
        });
        return cancelNow({ kind: "review" });
      }
      amount = preview.kind === "refund" ? preview.amount : 0;
    }
    if (amount === 0) return cancelNow({ kind: "canceled" });

    const step = stageRefund(
      tx,
      orderRef,
      order,
      {
        key,
        amount,
        at: now,
        by: actor.isAdmin ? actor.uid : "customer",
        rentalId,
        reason: actor.isAdmin
          ? cleanReason || "Aluguel cancelado pelo Carcassonne Pub"
          : "Aluguel cancelado pelo cliente",
      },
      { strict: actor.isAdmin },
    );
    if (step.kind === "done") return cancelNow({ kind: "refunded", amount: step.refund.amount });
    return {
      kind: "refund",
      orderId: orderRef.id,
      paymentId: step.paymentId,
      intent: step.intent,
      emailReason: actor.isAdmin
        ? `O Carcassonne Pub cancelou o aluguel de "${rental.gameName}" e devolveu o valor abaixo.`
        : `Você cancelou o aluguel de "${rental.gameName}" e devolvemos o valor do jogo${
            feeNote ? `, descontada a taxa de cancelamento de ${policy.feePercent}%` : ""
          }.`,
      summary: { code: order.code, customer: order.customer },
    };
  });
  if (plan.kind === "done") return plan.outcome;

  // Fora da transação: falhou → nada foi cancelado (refund_failed).
  const result = await sendProviderRefund(plan.orderId, plan.paymentId, plan.intent);

  const orderRef = db.collection("rentalOrders").doc(plan.orderId);
  const first = await db.runTransaction(async (tx) => {
    const rentalSnap = await tx.get(rentalRef);
    const rental = rentalSnap.exists ? (rentalSnap.data() as RentalType) : null;
    const [orderSnap, gameSnap] = await Promise.all([
      tx.get(orderRef),
      rental ? tx.get(db.collection("rentalGames").doc(rental.gameId)) : Promise.resolve(null),
    ]);
    const order = orderSnap.data() as RentalOrderType;
    if (commitRefund(tx, orderRef, order, plan.intent, result) === null) return false;
    if (rental && gameSnap && cancelable.includes(rental.status)) {
      writeCancel(tx, rentalRef, rentalId, gameSnap, actor, cleanReason);
    } else {
      console.error(
        `ATENÇÃO: reembolso ${plan.intent.key} feito, mas o aluguel ${rentalId} está em ` +
          `"${rental?.status ?? "inexistente"}" e não foi cancelado.`,
      );
    }
    return true;
  });
  if (first) await sendRefundNotice(plan.orderId, plan.summary, result.amount, plan.emailReason);
  return { kind: "refunded", amount: result.amount };
}

const invalidStatus = () =>
  new ApiError(409, "invalid_status", "Este aluguel está em outro status. Atualize a página.");

/** Lê o aluguel e depois o jogo, na transação; 404 se o aluguel não existir. */
async function readRentalAndGame(db: Firestore, tx: Transaction, rentalId: string) {
  const rentalRef = db.collection("rentals").doc(rentalId);
  const rentalSnap = await tx.get(rentalRef);
  if (!rentalSnap.exists) {
    throw new ApiError(404, "not_found", "Aluguel não encontrado.");
  }
  const rental = rentalSnap.data() as RentalType;
  const gameRef = db.collection("rentalGames").doc(rental.gameId);
  const gameSnap = await tx.get(gameRef);
  return { rentalRef, rental, gameRef, gameSnap };
}

/** Registra a retirada (reserved para picked_up). */
export async function pickupRental(rentalId: string, adminUid: string): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const { rentalRef, rental, gameRef, gameSnap } = await readRentalAndGame(db, tx, rentalId);
    if (rental.status === "awaiting_payment") {
      throw new ApiError(409, "awaiting_payment", "Este pedido ainda não foi pago.");
    }
    if (rental.status !== "reserved") throw invalidStatus();
    if (rental.startDate > todaySP()) {
      throw new ApiError(
        409,
        "too_early",
        `A retirada só pode ser registrada a partir de ${formatDateBR(rental.startDate)}.`,
      );
    }

    tx.update(rentalRef, {
      status: "picked_up",
      pickedUpAt: FieldValue.serverTimestamp(),
      pickedUpBy: adminUid,
    });
    if (gameSnap.exists) {
      tx.update(gameRef, {
        bookings: updateBooking(
          liveBookings(asBookings(gameSnap.data()?.bookings), Date.now()),
          rentalId,
          { status: "picked_up" },
        ),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

const DEFAULT_UNAVAILABLE_NOTES: Record<RentalReturnCondition, string> = {
  ok: "Devolvido",
  damaged: "Devolvido com avaria",
  missing_parts: "Devolvido com peças faltando",
};

/** Registra a devolução (picked_up para returned); opcionalmente tira a unidade de circulação. */
export async function returnRental(
  rentalId: string,
  adminUid: string,
  input: { condition: RentalReturnCondition; note?: string; markUnitUnavailable: boolean },
): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const { rentalRef, rental, gameRef, gameSnap } = await readRentalAndGame(db, tx, rentalId);
    if (rental.status !== "picked_up") throw invalidStatus();

    tx.update(rentalRef, {
      status: "returned",
      returnedAt: FieldValue.serverTimestamp(),
      returnedBy: adminUid,
      returnCondition: input.condition,
      ...(input.note ? { returnNote: input.note } : {}),
    });
    if (gameSnap.exists) {
      const data = gameSnap.data();
      tx.update(gameRef, {
        bookings: removeBooking(liveBookings(asBookings(data?.bookings), Date.now()), rentalId),
        ...(input.markUnitUnavailable
          ? {
              units: markUnitUnavailable(
                asUnits(data?.units),
                rental.unitId,
                input.note || DEFAULT_UNAVAILABLE_NOTES[input.condition],
              ),
            }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

/** Altera a devolução de um aluguel ativo, sem cruzar outra reserva da mesma cópia. */
export async function changeDueDate(rentalId: string, dueDate: string): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const { rentalRef, rental, gameRef, gameSnap } = await readRentalAndGame(db, tx, rentalId);
    if (rental.status !== "reserved" && rental.status !== "picked_up") throw invalidStatus();
    if (dueDate < rental.startDate) {
      throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
    }

    if (gameSnap.exists) {
      const data = gameSnap.data();
      // Holds vencidos não bloqueiam a nova data (e somem do jogo ao gravar).
      const bookings = liveBookings(asBookings(data?.bookings), Date.now());
      const game = {
        units: asUnits(data?.units),
        bookings,
        rentalDays: Number(data?.rentalDays ?? 0),
      };
      if (!canChangeDueDate(game, rentalId, dueDate, todaySP())) {
        throw new ApiError(
          409,
          "due_date_conflict",
          "A nova data cruza com outra reserva desta cópia.",
        );
      }
      tx.update(gameRef, {
        bookings: updateBooking(bookings, rentalId, { dueDate }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(rentalRef, { dueDate });
  });
}

/** Bloqueia ou desbloqueia um cliente (o cadastro precisa existir). */
export async function setCustomerBlocked(
  uid: string,
  blocked: boolean,
  reason?: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("rentalCustomers").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "not_found", "Cliente não encontrado.");
    tx.update(ref, {
      isBlocked: blocked,
      blockedReason: blocked ? reason : FieldValue.delete(),
    });
  });
}
