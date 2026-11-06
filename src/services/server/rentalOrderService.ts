import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { asBookings } from "@/rental/bookings";
import {
  checkoutItemsFor,
  isAwaitingPayment,
  isOrderExpirable,
  releaseHeldBookings,
} from "@/rental/payments";
import type { RentalOrderType, RentalType } from "@/types";
import { siteUrl } from "./accountEmails";
import { ApiError } from "./apiHelpers";
import { getAdminDb } from "./firebaseAdmin";
import { getPaymentProvider } from "./payments";

const EXPIRED_REASON = "Pagamento não concluído";
const CUSTOMER_CANCEL_REASON = "Cancelado pelo cliente antes do pagamento";

const notFound = () => new ApiError(404, "not_found", "Pedido não encontrado.");
const orderExpired = () =>
  new ApiError(409, "order_expired", "O tempo para pagar acabou e as cópias foram liberadas.");
/** Erro padrão quando o checkout não pôde ser criado. */
export const checkoutFailed = () =>
  new ApiError(
    502,
    "payment_unavailable",
    "Não foi possível iniciar o pagamento. Tente novamente em instantes.",
  );

function ordersCol() {
  return getAdminDb().collection("rentalOrders");
}

type ReleaseMode =
  /** Só se a reserva já venceu (sweep, reabrir checkout). */
  | { kind: "expire"; reason: string }
  /** Na hora, mesmo com a reserva valendo (checkout não pôde ser criado). */
  | { kind: "abort"; reason: string }
  /** Cliente desistiu antes de pagar. */
  | { kind: "customer"; uid: string };

/**
 * Encerra um pedido online não pago numa transação: pedido `expired`, rentals
 * `awaiting_payment` → `canceled` e remove os bookings `held` desses rentals
 * (limpando de quebra os holds vencidos de outros pedidos). Idempotente:
 * pedido já pago/expirado → `false` (ou 409 para o cliente).
 */
async function releaseOrder(orderId: string, mode: ReleaseMode): Promise<boolean> {
  const db = getAdminDb();
  const orderRef = ordersCol().doc(orderId);
  const isCustomer = mode.kind === "customer";

  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      if (isCustomer) throw notFound();
      return false;
    }
    const order = orderSnap.data() as RentalOrderType;
    if (isCustomer && order.customerUid !== mode.uid) throw notFound();

    const now = Date.now();
    const allowed = mode.kind === "expire" ? isOrderExpirable(order, now) : isAwaitingPayment(order);
    if (!allowed) {
      if (isCustomer) {
        throw new ApiError(409, "not_cancelable", "Este pedido não pode mais ser cancelado.");
      }
      return false;
    }

    // Leituras antes de qualquer escrita.
    const rentalIds = Array.isArray(order.rentalIds) ? order.rentalIds : [];
    const gameIds = [...new Set(Array.isArray(order.gameIds) ? order.gameIds : [])];
    const rentalRefs = rentalIds.map((id) => db.collection("rentals").doc(id));
    const gameRefs = gameIds.map((id) => db.collection("rentalGames").doc(id));
    const [rentalSnaps, gameSnaps] = await Promise.all([
      Promise.all(rentalRefs.map((ref) => tx.get(ref))),
      Promise.all(gameRefs.map((ref) => tx.get(ref))),
    ]);

    tx.update(orderRef, { "payment.status": "expired" });

    const cancelReason = isCustomer ? CUSTOMER_CANCEL_REASON : mode.reason;
    for (const snap of rentalSnaps) {
      if (!snap.exists || (snap.data() as RentalType).status !== "awaiting_payment") continue;
      tx.update(snap.ref, {
        status: "canceled",
        canceledAt: FieldValue.serverTimestamp(),
        canceledBy: isCustomer ? "customer" : "system",
        cancelReason,
      });
    }

    for (const snap of gameSnaps) {
      if (!snap.exists) continue;
      tx.update(snap.ref, {
        bookings: releaseHeldBookings(asBookings(snap.data()?.bookings), rentalIds, now),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return true;
  });
}

/** Expira o pedido se ainda não foi pago e a reserva já venceu. */
export function expireOrder(orderId: string, reason: string = EXPIRED_REASON): Promise<boolean> {
  return releaseOrder(orderId, { kind: "expire", reason });
}

/** Libera na hora um pedido não pago (ex.: o checkout não pôde ser criado). */
export function abortUnpaidOrder(orderId: string, reason: string): Promise<boolean> {
  return releaseOrder(orderId, { kind: "abort", reason });
}

/** Cliente cancela o próprio pedido ainda não pago (pending ou rejected). */
export async function cancelPendingOrder(orderId: string, uid: string): Promise<void> {
  await releaseOrder(orderId, { kind: "customer", uid });
}

/**
 * Cria o checkout no provedor (expira junto com a reserva) e grava o link no
 * pedido. Lança o erro do provedor; quem chama decide o que fazer.
 */
export async function createOrderCheckout(
  orderId: string,
  order: Pick<RentalOrderType, "items" | "customer"> & { payment: { holdUntil: number } },
): Promise<string> {
  const provider = getPaymentProvider();
  const { checkoutUrl, providerCheckoutId } = await provider.createCheckout({
    orderId,
    items: checkoutItemsFor(order.items),
    payerEmail: order.customer.email,
    expiresAt: order.payment.holdUntil,
    returnUrl: `${siteUrl()}/aluguel/pedido/${orderId}`,
    notificationUrl: `${siteUrl()}/api/payments/mercadopago/webhook`,
  });
  await ordersCol().doc(orderId).update({
    "payment.checkoutUrl": checkoutUrl,
    "payment.providerCheckoutId": providerCheckoutId,
  });
  return checkoutUrl;
}

/**
 * Devolve o link de pagamento do pedido do cliente enquanto a reserva vale
 * (recria o checkout se o link não chegou a ser gravado). Reserva vencida →
 * expira o pedido e responde `order_expired`.
 */
export async function reopenCheckout(orderId: string, uid: string): Promise<{ checkoutUrl: string }> {
  const snap = await ordersCol().doc(orderId).get();
  if (!snap.exists) throw notFound();
  const order = snap.data() as RentalOrderType;
  if (order.customerUid !== uid) throw notFound();

  const payment = order.payment;
  if (order.paymentMode !== "online" || !payment) {
    throw new ApiError(409, "not_online", "Este pedido é pago no balcão, na retirada.");
  }
  if (!isAwaitingPayment(order)) {
    if (payment.status === "expired") throw orderExpired();
    throw new ApiError(409, "already_paid", "O pagamento deste pedido já foi aprovado.");
  }
  if (isOrderExpirable(order, Date.now())) {
    await expireOrder(orderId);
    throw orderExpired();
  }
  if (payment.checkoutUrl) return { checkoutUrl: payment.checkoutUrl };

  try {
    return { checkoutUrl: await createOrderCheckout(orderId, { ...order, payment }) };
  } catch (error) {
    console.error(`Erro ao recriar o checkout do pedido ${orderId}:`, error);
    throw checkoutFailed();
  }
}

/** Expira todos os pedidos online com a reserva vencida; devolve quantos expirou. */
export async function sweepExpiredOrders(): Promise<number> {
  // Igualdade num campo só (sem índice composto); status e holdUntil filtrados aqui.
  const snap = await ordersCol().where("paymentMode", "==", "online").get();
  const now = Date.now();
  const due = snap.docs.filter((doc) => isOrderExpirable(doc.data() as RentalOrderType, now));

  let expired = 0;
  for (const doc of due) {
    try {
      if (await expireOrder(doc.id)) expired++;
    } catch (error) {
      console.error(`Erro ao expirar o pedido ${doc.id}:`, error);
    }
  }
  return expired;
}
