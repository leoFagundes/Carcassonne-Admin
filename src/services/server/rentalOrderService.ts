import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { asBookings, asUnits } from "@/rental/bookings";
import { todaySP } from "@/rental/dates";
import { mergeRentalSettings } from "@/rental/defaults";
import {
  checkoutItemsFor,
  decideApproval,
  isAwaitingPayment,
  isOrderExpirable,
  orderPaymentView,
  releaseHeldBookings,
  type ApprovalContext,
  type OrderPaymentView,
} from "@/rental/payments";
import type {
  OrderPaymentStatus,
  RentalDuplicatePayment,
  RentalOrderType,
  RentalRefund,
  RentalSettingsType,
  RentalType,
} from "@/types";
import { siteUrl } from "./accountEmails";
import { ApiError, isAdminUid, isDocId } from "./apiHelpers";
import { getAdminDb } from "./firebaseAdmin";
import { getPaymentProvider } from "./payments";
import { ProviderError } from "./payments/mercadoPago";
import type { ProviderPayment } from "./payments/provider";
import { rentalRulesUrl, sendOrderConfirmation, sendRefundEmail } from "./rentalEmails";

const EXPIRED_REASON = "Pagamento não concluído";
const CUSTOMER_CANCEL_REASON = "Cancelado pelo cliente antes do pagamento";

const notFound = () => new ApiError(404, "not_found", "Pedido não encontrado.");
const alreadyPaid = () => new ApiError(409, "already_paid", "Este pedido já foi pago.");
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

    tx.update(orderRef, {
      "payment.status": "expired",
      "payment.closedBy": isCustomer ? "customer" : "system",
    });

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
    throw alreadyPaid();
  }
  if (isOrderExpirable(order, Date.now())) {
    if (!(await expireOrder(orderId))) {
      // Não expirou: o pedido mudou no meio (ex.: pagamento aprovado agora).
      const fresh = await ordersCol().doc(orderId).get();
      if ((fresh.data() as RentalOrderType | undefined)?.payment?.status === "approved") {
        throw alreadyPaid();
      }
    }
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

// ---------- Confirmação do pagamento ----------

const LATE_CANCEL_REASON = "Tempo para pagamento esgotado";
const LATE_REFUND_KEY = (orderId: string) => `${orderId}:full:late`;
const DUPLICATE_REFUND_KEY = (orderId: string, paymentId: string) =>
  `${orderId}:${paymentId}:duplicate`;
const LATE_REFUND_TEXT = {
  expired: {
    record: "Tempo esgotado",
    email:
      "O seu pagamento foi aprovado depois que o tempo para pagar acabou, e as cópias do pedido já tinham sido liberadas. Por isso devolvemos o valor integral. Se ainda quiser os jogos, é só fazer um novo pedido.",
  },
  canceled: {
    record: "Pedido cancelado antes do pagamento",
    email:
      "O seu pagamento foi aprovado depois que você cancelou o pedido. Por isso devolvemos o valor integral. Se ainda quiser os jogos, é só fazer um novo pedido.",
  },
} as const;
const DUPLICATE_REFUND_EMAIL =
  "Recebemos mais de um pagamento para o mesmo pedido e devolvemos integralmente o pagamento a mais.";

export type ApplyPaymentResult = "confirmed" | "already" | "rejected" | "late_refunded" | "ignored";

type OrderSummary = Pick<RentalOrderType, "code" | "customer" | "total"> & {
  closedBy?: "customer" | "system";
  duplicatePayments: RentalDuplicatePayment[];
};

type EmailItem = { gameName: string; startDate: string; dueDate: string; price: number };

/** Confere se o pagamento é deste pedido online e do valor certo (diferente → log). */
function paymentMatchesOrder(orderId: string, order: RentalOrderType, payment: ProviderPayment): boolean {
  if (order.paymentMode !== "online" || !order.payment) {
    console.error(`Pagamento ${payment.id} para o pedido ${orderId}, que não é online; ignorado.`);
    return false;
  }
  if (payment.amount !== order.total || payment.currency !== "BRL") {
    console.error(
      `Pagamento ${payment.id} não confere com o pedido ${orderId}: ` +
        `${payment.amount} ${payment.currency} × ${order.total} BRL; ignorado.`,
    );
    return false;
  }
  return true;
}

/**
 * Aplica um pagamento consultado no provedor ao pedido `orderId`. Tudo numa
 * transação que lê e grava o pedido, os rentals e os jogos — serializa com a
 * expiração (`releaseOrder`), então pagamento e expiração nunca se cruzam.
 *
 * - approved → confirma (e-mail) se as cópias continuam garantidas; senão
 *   reembolso integral automático (pedido "Reembolsado · tempo esgotado").
 *   Repetido (mesmo pagamento) → "already", sem e-mail. Outro pagamento num
 *   pedido já pago → devolve o novo integralmente.
 * - rejected/cancelled → pedido `rejected` (o hold continua até vencer).
 * - pending/in_process e demais → nada.
 *
 * Falha do provedor ao reembolsar fica gravada no pedido e é relançada (o
 * webhook responde 500 e o Mercado Pago reenvia; o reembolso é idempotente).
 */
export async function applyPayment(
  orderId: string,
  payment: ProviderPayment,
): Promise<ApplyPaymentResult> {
  if (!isDocId(orderId) || payment.externalReference !== orderId) {
    console.error(
      `Pagamento ${payment.id} com referência ${payment.externalReference} não é do pedido ${orderId}; ignorado.`,
    );
    return "ignored";
  }
  if (payment.status === "approved") return applyApproved(orderId, payment);
  if (payment.status === "rejected" || payment.status === "cancelled") {
    return applyRejected(orderId, payment);
  }
  return "ignored";
}

async function applyRejected(orderId: string, payment: ProviderPayment): Promise<ApplyPaymentResult> {
  const orderRef = ordersCol().doc(orderId);
  return getAdminDb().runTransaction(async (tx): Promise<ApplyPaymentResult> => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      console.error(`Pagamento ${payment.id} para o pedido ${orderId}, que não existe; ignorado.`);
      return "ignored";
    }
    const order = snap.data() as RentalOrderType;
    if (!paymentMatchesOrder(orderId, order, payment)) return "ignored";
    const status = order.payment?.status;
    if (status === "pending") tx.update(orderRef, { "payment.status": "rejected" });
    return status === "pending" || status === "rejected" ? "rejected" : "ignored";
  });
}

type ApprovedOutcome =
  | { kind: "ignored" | "already" }
  | { kind: "duplicate" | "late_refund"; summary: OrderSummary }
  | { kind: "confirmed"; summary: OrderSummary; items: EmailItem[] };

async function applyApproved(orderId: string, payment: ProviderPayment): Promise<ApplyPaymentResult> {
  const db = getAdminDb();
  const orderRef = ordersCol().doc(orderId);

  const outcome = await db.runTransaction(async (tx): Promise<ApprovedOutcome> => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) {
      console.error(`Pagamento ${payment.id} para o pedido ${orderId}, que não existe; ignorado.`);
      return { kind: "ignored" };
    }
    const order = orderSnap.data() as RentalOrderType;
    if (!paymentMatchesOrder(orderId, order, payment)) return { kind: "ignored" };

    // Leituras antes de qualquer escrita.
    const rentalIds = (Array.isArray(order.rentalIds) ? order.rentalIds : []).filter(isDocId);
    const gameIds = [...new Set(Array.isArray(order.gameIds) ? order.gameIds : [])].filter(isDocId);
    const [rentalSnaps, gameSnaps] = await Promise.all([
      Promise.all(rentalIds.map((id) => tx.get(db.collection("rentals").doc(id)))),
      Promise.all(gameIds.map((id) => tx.get(db.collection("rentalGames").doc(id)))),
    ]);
    const rentals = rentalSnaps
      .filter((s) => s.exists)
      .map((s) => ({ ...(s.data() as RentalType), id: s.id }));
    const games: ApprovalContext["games"] = {};
    for (const s of gameSnaps) {
      if (!s.exists) continue;
      games[s.id] = { units: asUnits(s.data()?.units), bookings: asBookings(s.data()?.bookings) };
    }

    const now = Date.now();
    const decision = decideApproval(
      order,
      { paymentId: payment.id, today: todaySP(), rentals, games },
      now,
    );
    const summary: OrderSummary = {
      code: order.code,
      customer: order.customer,
      total: order.total,
      closedBy: order.payment?.closedBy,
      duplicatePayments: order.payment?.duplicatePayments ?? [],
    };
    const paidFields = {
      "payment.providerPaymentId": payment.id,
      "payment.method": payment.method,
      "payment.paidAt": payment.approvedAt ?? now,
    };

    switch (decision.kind) {
      case "ignored":
        console.error(`Pagamento ${payment.id} do pedido ${orderId} não se aplica; ignorado.`);
        return { kind: "ignored" };
      case "already":
        return { kind: "already" };
      case "duplicate":
        return { kind: "duplicate", summary };
      case "retry_late_refund":
        return { kind: "late_refund", summary };

      case "confirm": {
        tx.update(orderRef, {
          ...paidFields,
          "payment.status": "approved",
          "payment.closedBy": FieldValue.delete(),
        });
        const confirmed = new Set(decision.rentalIds);
        for (const rental of rentals) {
          if (!confirmed.has(rental.id)) continue;
          tx.update(db.collection("rentals").doc(rental.id), {
            status: "reserved",
            ...(rental.status === "canceled"
              ? {
                  canceledAt: FieldValue.delete(),
                  canceledBy: FieldValue.delete(),
                  cancelReason: FieldValue.delete(),
                }
              : {}),
          });
        }
        for (const [gameId, bookings] of Object.entries(decision.bookingsByGame)) {
          tx.update(db.collection("rentalGames").doc(gameId), {
            bookings,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return {
          kind: "confirmed",
          summary,
          items: rentals
            .filter((r) => confirmed.has(r.id))
            .map((r) => ({
              gameName: r.gameName,
              startDate: r.startDate,
              dueDate: r.dueDate,
              price: r.price,
            })),
        };
      }

      case "late_refund": {
        // Registra o dinheiro recebido antes de tentar devolver.
        const closedBy = order.payment?.closedBy === "customer" ? "customer" : "system";
        tx.update(orderRef, {
          ...paidFields,
          "payment.status": "expired",
          "payment.closedBy": closedBy,
          "payment.lateApprovalRefundPending": true,
        });
        for (const rental of rentals) {
          if (rental.status !== "awaiting_payment") continue;
          tx.update(db.collection("rentals").doc(rental.id), {
            status: "canceled",
            canceledAt: FieldValue.serverTimestamp(),
            canceledBy: "system",
            cancelReason: LATE_CANCEL_REASON,
          });
        }
        for (const s of gameSnaps) {
          if (!s.exists) continue;
          tx.update(s.ref, {
            bookings: releaseHeldBookings(asBookings(s.data()?.bookings), rentalIds, now),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
        return { kind: "late_refund", summary: { ...summary, closedBy } };
      }
    }
  });

  switch (outcome.kind) {
    case "ignored":
    case "already":
      return outcome.kind;
    case "confirmed":
      await sendPaidConfirmation(orderId, outcome.summary, outcome.items, payment.method);
      return "confirmed";
    case "late_refund":
      await finishLateRefund(orderId, payment, outcome.summary);
      return "late_refunded";
    case "duplicate":
      await refundDuplicate(orderId, payment, outcome.summary);
      return "already";
  }
}

/** Confirmação do aluguel pago online (falha só vai para o log). */
async function sendPaidConfirmation(
  orderId: string,
  summary: OrderSummary,
  items: EmailItem[],
  method: ProviderPayment["method"],
): Promise<void> {
  try {
    const settingsSnap = await getAdminDb().collection("rental-config").doc("settings").get();
    const settings = mergeRentalSettings(
      settingsSnap.exists ? (settingsSnap.data() as Partial<RentalSettingsType>) : undefined,
    );
    await sendOrderConfirmation(
      summary.customer.email,
      {
        customerName: summary.customer.name,
        code: summary.code,
        items,
        total: summary.total,
        rulesUrl: rentalRulesUrl(),
        paidOnline: method,
      },
      settings.staffEmail,
    );
  } catch (error) {
    console.error(`Erro ao enviar a confirmação do pedido ${orderId}:`, error);
  }
}

/** E-mail de reembolso (falha só vai para o log). */
async function sendRefundNotice(
  orderId: string,
  summary: OrderSummary,
  amount: number,
  reason: string,
): Promise<void> {
  try {
    await sendRefundEmail(summary.customer.email, {
      customerName: summary.customer.name,
      code: summary.code,
      amount,
      reason,
    });
  } catch (error) {
    console.error(`Erro ao enviar o e-mail de reembolso do pedido ${orderId}:`, error);
  }
}

/**
 * Reembolso integral do pagamento aprovado tarde demais. Sucesso → pedido
 * `refunded` + `lateApprovalRefunded` (uma vez só) e e-mail. Falha → marca
 * `lateApprovalRefundFailed` no pedido e relança.
 */
async function finishLateRefund(
  orderId: string,
  payment: ProviderPayment,
  summary: OrderSummary,
): Promise<void> {
  const orderRef = ordersCol().doc(orderId);
  const text = LATE_REFUND_TEXT[summary.closedBy === "customer" ? "canceled" : "expired"];

  let refund: { refundId: string; amount: number };
  try {
    refund = await getPaymentProvider().refund(payment.id, undefined, LATE_REFUND_KEY(orderId));
  } catch (error) {
    console.error(
      `ATENÇÃO: pagamento ${payment.id} do pedido ${orderId} aprovado depois do prazo e o reembolso falhou:`,
      error,
    );
    try {
      await orderRef.update({ "payment.lateApprovalRefundFailed": true });
    } catch (markError) {
      console.error(`Erro ao marcar o reembolso pendente do pedido ${orderId}:`, markError);
    }
    throw error;
  }

  const first = await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    const p = (snap.data() as RentalOrderType | undefined)?.payment;
    if (!p || p.lateApprovalRefunded || p.providerPaymentId !== payment.id) return false;
    const entry: RentalRefund = {
      amount: refund.amount,
      at: Date.now(),
      by: "system",
      providerRefundId: refund.refundId,
      reason: text.record,
    };
    tx.update(orderRef, {
      "payment.status": "refunded",
      "payment.refunds": [...(Array.isArray(p.refunds) ? p.refunds : []), entry],
      "payment.refundedTotal": (p.refundedTotal ?? 0) + refund.amount,
      "payment.lateApprovalRefunded": true,
      "payment.lateApprovalRefundPending": FieldValue.delete(),
      "payment.lateApprovalRefundFailed": FieldValue.delete(),
    });
    return true;
  });
  if (first) {
    console.warn(`Pedido ${orderId}: pagamento ${payment.id} aprovado depois do prazo, reembolsado.`);
    await sendRefundNotice(orderId, summary, refund.amount, text.email);
  }
}

/** Devolve integralmente um segundo pagamento do mesmo pedido (registrado em `duplicatePayments`). */
async function refundDuplicate(
  orderId: string,
  payment: ProviderPayment,
  summary: OrderSummary,
): Promise<void> {
  if (summary.duplicatePayments.some((d) => d.paymentId === payment.id && d.providerRefundId)) return;
  console.warn(`Pedido ${orderId}: pagamento a mais ${payment.id}; devolvendo integralmente.`);
  const orderRef = ordersCol().doc(orderId);

  /** Grava/atualiza a entrada deste pagamento; true se o reembolso foi registrado agora. */
  const record = (entry: RentalDuplicatePayment) =>
    getAdminDb().runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      const p = (snap.data() as RentalOrderType | undefined)?.payment;
      if (!p) return false;
      const list = Array.isArray(p.duplicatePayments) ? p.duplicatePayments : [];
      const prev = list.find((d) => d.paymentId === entry.paymentId);
      if (prev?.providerRefundId) return false;
      tx.update(orderRef, {
        "payment.duplicatePayments": [...list.filter((d) => d !== prev), entry],
      });
      return entry.providerRefundId !== undefined;
    });

  let refund: { refundId: string; amount: number };
  try {
    refund = await getPaymentProvider().refund(
      payment.id,
      undefined,
      DUPLICATE_REFUND_KEY(orderId, payment.id),
    );
  } catch (error) {
    console.error(
      `ATENÇÃO: reembolso do pagamento a mais ${payment.id} do pedido ${orderId} falhou:`,
      error,
    );
    try {
      await record({ paymentId: payment.id, amount: payment.amount, at: Date.now(), refundFailed: true });
    } catch (markError) {
      console.error(`Erro ao registrar o pagamento a mais do pedido ${orderId}:`, markError);
    }
    throw error;
  }

  const first = await record({
    paymentId: payment.id,
    amount: refund.amount,
    at: Date.now(),
    providerRefundId: refund.refundId,
  });
  if (first) await sendRefundNotice(orderId, summary, refund.amount, DUPLICATE_REFUND_EMAIL);
}

/** Ordem dos ids numéricos do Mercado Pago (maior = mais recente). */
function compareIds(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

const NOT_SETTLED: ProviderPayment["status"][] = ["pending", "in_process", "rejected", "cancelled"];

/**
 * Consulta no provedor os pagamentos do pedido e aplica o resultado (para
 * quando o aviso do webhook atrasa). Dono ou admin. Aplica os aprovados (o
 * primeiro confirma; os outros são devolvidos) ou, sem aprovado, o mais recente.
 */
export async function verifyOrderPayment(
  orderId: string,
  uid: string,
): Promise<{ status: OrderPaymentStatus | null; view: OrderPaymentView }> {
  const orderRef = ordersCol().doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) throw notFound();
  const order = snap.data() as RentalOrderType;
  if (order.customerUid !== uid && !(await isAdminUid(uid))) throw notFound();

  const status = order.payment?.status;
  const open = status === "pending" || status === "rejected" || status === "expired";
  if (order.paymentMode === "online" && open) {
    let payments: ProviderPayment[];
    try {
      payments = (await getPaymentProvider().findPaymentsByReference(orderId)).filter(
        (p) => p.externalReference === orderId,
      );
    } catch (error) {
      console.error(`Erro ao consultar os pagamentos do pedido ${orderId}:`, error);
      throw new ApiError(
        502,
        "payment_unavailable",
        "Não foi possível consultar o pagamento agora. Tente novamente em instantes.",
      );
    }
    const approved = payments
      .filter((p) => p.status === "approved")
      .sort((a, b) => (a.approvedAt ?? 0) - (b.approvedAt ?? 0) || compareIds(a.id, b.id));
    const latest = payments
      .filter((p) => NOT_SETTLED.includes(p.status))
      .sort((a, b) => compareIds(b.id, a.id))[0];
    const toApply = approved.length > 0 ? approved : latest ? [latest] : [];
    try {
      for (const p of toApply) await applyPayment(orderId, p);
    } catch (error) {
      // Reembolso que falhou já ficou registrado no pedido; mostra o estado atual.
      if (!(error instanceof ProviderError)) throw error;
      console.error(`Erro do provedor ao aplicar o pagamento do pedido ${orderId}:`, error);
    }
  }

  const fresh = (await orderRef.get()).data() as RentalOrderType;
  return { status: fresh.payment?.status ?? null, view: orderPaymentView(fresh, Date.now()) };
}
