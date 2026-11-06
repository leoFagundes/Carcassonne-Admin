import type {
  CancellationPolicy,
  OnlinePaymentSettings,
  OrderPaymentStatus,
  RentalBooking,
  RentalCancellationReview,
  RentalOrderPayment,
  RentalOrderType,
  RentalPendingRefund,
  RentalRefund,
  RentalStatus,
  RentalType,
  RentalUnit,
} from "@/types";
import { isUnitFree } from "./availability";

/** Remove reservas temporárias (held) vencidas; as demais permanecem. */
export function liveBookings(bookings: RentalBooking[], nowMs: number): RentalBooking[] {
  return bookings.filter((b) => !(b.status === "held" && (b.holdUntil ?? 0) <= nowMs));
}

export function withLiveBookings<T extends { bookings: RentalBooking[] }>(game: T, nowMs: number): T {
  return { ...game, bookings: liveBookings(game.bookings, nowMs) };
}

const MAX_FEE_PERCENT = 50;

/** Taxa de cancelamento entre 0 e 50%; inválida (NaN, texto) → 0, a favor do cliente. */
export function clampFeePercent(feePercent: unknown): number {
  if (typeof feePercent !== "number" || Number.isNaN(feePercent)) return 0;
  return Math.min(MAX_FEE_PERCENT, Math.max(0, feePercent));
}

/** Valor a devolver segundo a política; null = decisão manual do admin. */
export function refundFor(policy: CancellationPolicy, feePercent: number, amount: number): number | null {
  if (policy === "full") return amount;
  if (policy === "fee") return amount - Math.round((amount * clampFeePercent(feePercent)) / 100);
  return null;
}

type RefundableOrder = Pick<RentalOrderType, "total"> & {
  payment?: Pick<RentalOrderPayment, "refundedTotal"> &
    Partial<Pick<RentalOrderPayment, "pendingRefunds">>;
};

/**
 * Quanto ainda pode ser devolvido: total − já reembolsado − reembolsos em
 * andamento (exceto o da chave `exceptKey`, quando é a própria operação).
 */
export function refundableLeft(order: RefundableOrder, exceptKey?: string): number {
  const pendingTotal = (order.payment?.pendingRefunds ?? [])
    .filter((p) => p.key !== exceptKey)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, order.total - (order.payment?.refundedTotal ?? 0) - pendingTotal);
}

const PAID_STATUSES: OrderPaymentStatus[] = ["approved", "partially_refunded", "refunded"];

/** Pedido online com pagamento aprovado (mesmo que já parcial ou totalmente reembolsado). */
export function isPaidOnline(
  order: (Pick<RentalOrderType, "paymentMode"> & { payment?: Pick<RentalOrderPayment, "status" | "providerPaymentId"> }) | undefined,
): boolean {
  const p = order?.payment;
  return order?.paymentMode === "online" && !!p?.providerPaymentId && PAID_STATUSES.includes(p.status);
}

/** Preço do aluguel no pedido (0 se o aluguel não é do pedido). */
export function rentalPrice(order: Pick<RentalOrderType, "items">, rentalId: string): number {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.find((i) => i.rentalId === rentalId)?.price ?? 0;
}

/**
 * Reembolso de UM jogo do pedido segundo a política: o preço daquele jogo
 * (menos a taxa), nunca acima do que falta devolver. Manual → null.
 */
export function refundForRental(
  order: RefundableOrder & Pick<RentalOrderType, "items">,
  rentalId: string,
  policy: CancellationPolicy,
  feePercent: number,
): number | null {
  const base = refundFor(policy, feePercent, rentalPrice(order, rentalId));
  if (base === null) return null;
  return Math.min(Math.max(0, base), refundableLeft(order));
}

export type CancelPreview =
  /** Sem pagamento online: cancela como sempre. */
  | { kind: "none" }
  | { kind: "refund"; amount: number; feePercent?: number }
  | { kind: "review" };

/** O que acontece se o cliente cancelar este aluguel (o navegador mostra antes de confirmar). */
export function cancelPreview(
  order: RentalOrderType | undefined,
  rentalId: string,
  onlinePayment: Pick<OnlinePaymentSettings, "cancellationPolicy" | "feePercent">,
): CancelPreview {
  if (!order || !isPaidOnline(order)) return { kind: "none" };
  // Nada mais a devolver: não há o que analisar.
  if (refundableLeft(order) === 0) return { kind: "refund", amount: 0 };
  const policy = onlinePayment.cancellationPolicy;
  const feePercent = clampFeePercent(onlinePayment.feePercent);
  const amount = refundForRental(order, rentalId, policy, feePercent);
  if (amount === null) return { kind: "review" };
  return policy === "fee" && feePercent > 0 ? { kind: "refund", amount, feePercent } : { kind: "refund", amount };
}

/** Resultado do cancelamento devolvido ao cliente/admin. */
export type CancelOutcome =
  | { kind: "canceled" }
  | { kind: "refunded"; amount: number }
  | { kind: "review" };

/** Limite da aprovação de uma análise: soma dos jogos analisados, até o que falta devolver. */
export function reviewRefundCap(
  order: RefundableOrder & Pick<RentalOrderType, "items">,
  rentalIds: string[],
  exceptKey?: string,
): number {
  const sum = [...new Set(rentalIds)].reduce((acc, id) => acc + rentalPrice(order, id), 0);
  return Math.min(sum, refundableLeft(order, exceptKey));
}

/** Valor em centavos: inteiro, ≥ 0 e ≤ limite. */
export function isValidRefundAmount(amount: unknown, cap: number): amount is number {
  return typeof amount === "number" && Number.isInteger(amount) && amount >= 0 && amount <= cap;
}

export type BeginRefund =
  /** Grava a intenção (lista nova de pendentes) e chama o provedor. */
  | { kind: "start"; pendingRefunds: RentalPendingRefund[] }
  /**
   * Mesma operação já em andamento: chama o provedor de novo com a mesma chave.
   * Com `pendingRefunds`, a intenção estava marcada com falha: gravar a lista limpa.
   */
  | { kind: "resume"; pending: RentalPendingRefund; pendingRefunds?: RentalPendingRefund[] }
  /** Mesma operação já concluída. */
  | { kind: "done"; refund: RentalRefund }
  | { kind: "exceeds"; left: number }
  | { kind: "invalid" };

type RefundBook = RefundableOrder & {
  payment?: Partial<Pick<RentalOrderPayment, "refunds" | "pendingRefunds">>;
};

/** 1ª etapa do reembolso (na transação): registra a intenção, conferindo o limite. */
export function beginRefund(order: RefundBook, intent: RentalPendingRefund): BeginRefund {
  const done = (order.payment?.refunds ?? []).find((r) => r.key === intent.key);
  if (done) return { kind: "done", refund: done };
  const pendingList = order.payment?.pendingRefunds ?? [];
  const same = pendingList.find((p) => p.key === intent.key);
  if (same?.failed) {
    // Nova tentativa de uma chamada que falhou sem resposta definitiva: volta a "em andamento".
    const retry = { ...same };
    delete retry.failed;
    return {
      kind: "resume",
      pending: retry,
      pendingRefunds: pendingList.map((p) => (p === same ? retry : p)),
    };
  }
  if (same) return { kind: "resume", pending: same };
  if (!Number.isInteger(intent.amount) || intent.amount <= 0) return { kind: "invalid" };
  const left = refundableLeft(order);
  if (intent.amount > left) return { kind: "exceeds", left };
  return { kind: "start", pendingRefunds: [...pendingList, intent] };
}

/** Tira a intenção (o provedor recusou): a operação pode ser tentada de novo. */
export function dropPendingRefund(
  payment: Partial<Pick<RentalOrderPayment, "pendingRefunds">> | undefined,
  key: string,
): RentalPendingRefund[] {
  return (payment?.pendingRefunds ?? []).filter((p) => p.key !== key);
}

/**
 * Falha sem resposta definitiva (5xx, rede, tempo esgotado): o reembolso pode
 * ter saído, então a intenção fica (contando no limite), marcada `failed`.
 */
export function markPendingRefundFailed(
  payment: Partial<Pick<RentalOrderPayment, "pendingRefunds">> | undefined,
  key: string,
): RentalPendingRefund[] {
  return (payment?.pendingRefunds ?? []).map((p) => (p.key === key ? { ...p, failed: true } : p));
}

const RECENT_REFUND_MS = 10 * 60_000;

/** Há reembolso em andamento (ou com falha) deste aluguel há menos de 10 min. */
export function hasRecentRefundFor(
  order: { payment?: Partial<Pick<RentalOrderPayment, "pendingRefunds">> } | undefined,
  rentalId: string,
  nowMs: number,
): boolean {
  return (order?.payment?.pendingRefunds ?? []).some(
    (p) =>
      (p.rentalId === rentalId || (p.rentalIds ?? []).includes(rentalId)) &&
      nowMs - p.at < RECENT_REFUND_MS,
  );
}

/** Há reembolso de aprovação de análise em andamento (ou com falha) no pedido. */
export function hasPendingReviewRefund(
  order: { payment?: Partial<Pick<RentalOrderPayment, "pendingRefunds">> } | undefined,
  orderId: string,
): boolean {
  const prefix = `${orderId}:review:`;
  return (order?.payment?.pendingRefunds ?? []).some((p) => p.key.startsWith(prefix));
}

/**
 * Intenção já gravada com a chave `key` e valor diferente de `amount`
 * (inclusive 0): a operação só pode seguir com o mesmo valor, senão o
 * reembolso que talvez já tenha saído fica sem registro. null = sem conflito.
 */
export function conflictingPendingRefund(
  order: { payment?: Partial<Pick<RentalOrderPayment, "pendingRefunds">> } | undefined,
  key: string,
  amount: unknown,
): RentalPendingRefund | null {
  const same = (order?.payment?.pendingRefunds ?? []).find((p) => p.key === key);
  return same && same.amount !== amount ? same : null;
}

type ReviewKeyOrder = Pick<RentalOrderType, "cancellationReview"> & {
  payment?: Partial<Pick<RentalOrderPayment, "pendingRefunds" | "refunds">>;
};

/**
 * Chave do reembolso da aprovação da análise aberta. Reembolso de análise em
 * andamento (ou com falha) → a chave dele, para retomar a mesma operação
 * (vale também para chaves antigas, com os ids dos aluguéis). Senão, estável
 * durante toda a análise: `${orderId}:review:${requestedAt}`, com `:2`, `:3`…
 * quando a mesma análise já teve reembolsos (aprovação parcial: outro
 * cancelamento entrou no meio e a análise continuou aberta).
 */
export function reviewRefundKey(order: ReviewKeyOrder, orderId: string): string {
  const prefix = `${orderId}:review:`;
  const pending = (order.payment?.pendingRefunds ?? []).find((p) => p.key.startsWith(prefix));
  if (pending) return pending.key;
  const base = `${prefix}${order.cancellationReview?.requestedAt ?? 0}`;
  const done = (order.payment?.refunds ?? []).filter(
    (r) => r.key === base || (r.key ?? "").startsWith(`${base}:`),
  ).length;
  return done === 0 ? base : `${base}:${done + 1}`;
}

/**
 * 2ª etapa (na transação): grava o reembolso feito no provedor. null quando a
 * mesma chave já foi registrada (nunca soma duas vezes).
 */
export function finishRefund(
  order: RefundBook,
  intent: RentalPendingRefund,
  result: { refundId: string; amount: number },
  at: number,
): {
  refunds: RentalRefund[];
  refundedTotal: number;
  status: OrderPaymentStatus;
  pendingRefunds: RentalPendingRefund[];
} | null {
  const refunds = order.payment?.refunds ?? [];
  if (refunds.some((r) => r.key === intent.key)) return null;
  const entry: RentalRefund = {
    amount: result.amount,
    at,
    by: intent.by,
    providerRefundId: result.refundId,
    key: intent.key,
    ...(intent.rentalId !== undefined ? { rentalId: intent.rentalId } : {}),
    ...(intent.rentalIds !== undefined ? { rentalIds: intent.rentalIds } : {}),
    ...(intent.reason !== undefined ? { reason: intent.reason } : {}),
  };
  const refundedTotal = (order.payment?.refundedTotal ?? 0) + result.amount;
  return {
    refunds: [...refunds, entry],
    refundedTotal,
    status: refundedTotal >= order.total ? "refunded" : "partially_refunded",
    pendingRefunds: dropPendingRefund(order.payment, intent.key),
  };
}

/** Cancelamento na política manual: abre a análise ou acrescenta o aluguel à que está aberta. */
export function openCancellationReview(
  current: RentalCancellationReview | undefined,
  rentalId: string,
  nowMs: number,
): RentalCancellationReview {
  if (current?.status === "pending") {
    const ids = Array.isArray(current.rentalIds) ? current.rentalIds : [];
    return ids.includes(rentalId) ? current : { ...current, rentalIds: [...ids, rentalId] };
  }
  return { status: "pending", requestedAt: nowMs, rentalIds: [rentalId] };
}

/**
 * Nova análise sobre uma já decidida: a decidida (com o motivo da recusa, se
 * houver) vai para o fim do histórico. null = nada a guardar (sem análise ou
 * análise aberta, que só recebe o novo aluguel).
 */
export function archiveDecidedReview(
  current: RentalCancellationReview | undefined,
  history: RentalCancellationReview[] | undefined,
): RentalCancellationReview[] | null {
  if (!current || current.status === "pending") return null;
  return [...(Array.isArray(history) ? history : []), current];
}

/**
 * Decide os aluguéis `decidedIds` da análise. Se outro cancelamento entrou na
 * análise nesse meio-tempo, ela continua pendente só com os não decididos.
 */
export function closeCancellationReview(
  review: RentalCancellationReview,
  decidedIds: string[],
  decision: Pick<RentalCancellationReview, "decidedBy" | "decidedAt" | "amount" | "reason"> & {
    status: "approved" | "denied";
  },
): RentalCancellationReview {
  const decided = new Set(decidedIds);
  const remaining = review.rentalIds.filter((id) => !decided.has(id));
  if (remaining.length > 0) return { ...review, rentalIds: remaining };
  return { ...review, ...decision };
}

/**
 * Pagamento reapresentado já com status "refunded" pelo provedor: termina de
 * registrar um reembolso nosso que ficou sem registro (tardio ou pagamento a
 * mais). Os demais (reembolsos já registrados) são ignorados.
 */
export function decideRefundedRedelivery(
  order: Pick<RentalOrderType, "paymentMode"> & { payment?: RentalOrderPayment },
  paymentId: string,
): "late" | "duplicate" | "ignored" {
  const p = order.payment;
  if (order.paymentMode !== "online" || !p) return "ignored";
  if (p.providerPaymentId === paymentId) {
    return p.lateApprovalRefundPending && !p.lateApprovalRefunded ? "late" : "ignored";
  }
  const dup = (p.duplicatePayments ?? []).find((d) => d.paymentId === paymentId);
  return dup && !dup.providerRefundId ? "duplicate" : "ignored";
}

export type OrderPaymentView =
  | { state: "counter" }
  | { state: "awaiting"; msLeft: number }
  | { state: "expired" }
  | { state: "canceled" }
  | { state: "rejected"; msLeft: number }
  | { state: "paid"; method?: "pix" | "card" | "other" }
  | { state: "refunded"; amount: number }
  | { state: "partially_refunded"; amount: number }
  | { state: "review" };

export function orderPaymentView(order: RentalOrderType, nowMs: number): OrderPaymentView {
  const p = order.payment;
  if (order.paymentMode === "counter" || !p) return { state: "counter" };
  if (order.cancellationReview?.status === "pending") return { state: "review" };
  switch (p.status) {
    case "approved":
      return { state: "paid", method: p.method };
    case "refunded":
      return { state: "refunded", amount: p.refundedTotal };
    case "partially_refunded":
      return { state: "partially_refunded", amount: p.refundedTotal };
    case "expired":
      return p.closedBy === "customer" ? { state: "canceled" } : { state: "expired" };
    case "pending":
    case "rejected":
      if (p.holdUntil <= nowMs) return { state: "expired" };
      return p.status === "pending"
        ? { state: "awaiting", msLeft: p.holdUntil - nowMs }
        : { state: "rejected", msLeft: p.holdUntil - nowMs };
  }
}

const MIN_HOLD_MINUTES = 15;
const MAX_HOLD_MINUTES = 60;
const DEFAULT_HOLD_MINUTES = 30;

/** Fim da reserva temporária: agora + minutos (15–60; inválido → 30). */
export function holdUntilFor(nowMs: number, holdMinutes: number): number {
  const minutes =
    typeof holdMinutes === "number" && Number.isFinite(holdMinutes)
      ? Math.min(MAX_HOLD_MINUTES, Math.max(MIN_HOLD_MINUTES, holdMinutes))
      : DEFAULT_HOLD_MINUTES;
  return nowMs + Math.round(minutes * 60_000);
}

type OrderPaymentLike = Pick<RentalOrderType, "paymentMode"> & {
  payment?: Pick<RentalOrderPayment, "status" | "holdUntil">;
};

/** Pedido online ainda sem pagamento aprovado (pending ou rejected). */
export function isAwaitingPayment(order: OrderPaymentLike): boolean {
  const status = order.payment?.status;
  return order.paymentMode === "online" && (status === "pending" || status === "rejected");
}

/** Aguardando pagamento e com a reserva vencida (decide pelo holdUntil, não só pelo status). */
export function isOrderExpirable(order: OrderPaymentLike, nowMs: number): boolean {
  return isAwaitingPayment(order) && (order.payment?.holdUntil ?? 0) <= nowMs;
}

/** Tira os bookings `held` dos rentals do pedido e, de quebra, os holds vencidos de outros. */
export function releaseHeldBookings(
  bookings: RentalBooking[],
  rentalIds: string[],
  nowMs: number,
): RentalBooking[] {
  const ids = new Set(rentalIds);
  return liveBookings(bookings, nowMs).filter((b) => !(b.status === "held" && ids.has(b.rentalId)));
}

/** Itens do checkout (um por jogo), em centavos. */
export function checkoutItemsFor(
  items: RentalOrderType["items"],
): { id: string; title: string; unitPrice: number }[] {
  return items.map((item) => ({
    id: item.rentalId,
    title: `Aluguel: ${item.gameName}`,
    unitPrice: item.price,
  }));
}

/**
 * Jogos que contam no limite de aluguéis simultâneos: reserved e picked_up, e
 * awaiting_payment só enquanto a reserva temporária do pedido ainda vale.
 */
export function countActiveGames(
  rentals: { status: RentalStatus; orderId: string }[],
  ordersById: Record<string, OrderPaymentLike>,
  nowMs: number,
): number {
  return rentals.filter((r) => {
    if (r.status === "reserved" || r.status === "picked_up") return true;
    if (r.status !== "awaiting_payment") return false;
    const order = Object.prototype.hasOwnProperty.call(ordersById, r.orderId)
      ? ordersById[r.orderId]
      : undefined;
    return order !== undefined && isAwaitingPayment(order) && !isOrderExpirable(order, nowMs);
  }).length;
}

/** "mm:ss", nunca negativo. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ---------- Confirmação do pagamento ----------

/** Pagamento consultado no provedor, como a escolha abaixo precisa dele. */
type FoundPayment = { id: string; status: string; approvedAt?: number };

/** Ordem dos ids numéricos do Mercado Pago (maior = mais recente). */
export function compareProviderIds(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Ainda sem desfecho (nada a registrar além de "recusado"). */
const NOT_SETTLED = ["pending", "in_process", "rejected", "cancelled"];

/**
 * O que aplicar dos pagamentos do pedido encontrados no provedor (consulta
 * manual ou varredura, quando o aviso do webhook não chegou): os aprovados,
 * do mais antigo ao mais novo (o primeiro confirma; os outros são devolvidos),
 * ou, sem aprovado, só o mais recente ainda sem desfecho. Depois, os já
 * reembolsados no provedor (terminam de registrar um reembolso nosso que
 * ficou sem registro, ex.: reembolso tardio que falhou aqui mas saiu lá).
 */
export function paymentsToApply<T extends FoundPayment>(payments: T[]): T[] {
  const approved = payments
    .filter((p) => p.status === "approved")
    .sort((a, b) => (a.approvedAt ?? 0) - (b.approvedAt ?? 0) || compareProviderIds(a.id, b.id));
  const latest = payments
    .filter((p) => NOT_SETTLED.includes(p.status))
    .sort((a, b) => compareProviderIds(b.id, a.id))[0];
  const refunded = payments
    .filter((p) => p.status === "refunded")
    .sort((a, b) => compareProviderIds(a.id, b.id));
  return [...(approved.length > 0 ? approved : latest ? [latest] : []), ...refunded];
}

/** Aluguel do pedido como a confirmação precisa dele. */
export type ApprovalRental = Pick<
  RentalType,
  "gameId" | "unitId" | "startDate" | "dueDate" | "status"
> & { id: string };

export interface ApprovalContext {
  /** Id do pagamento aprovado no provedor. */
  paymentId: string;
  /** "YYYY-MM-DD" (America/Sao_Paulo). */
  today: string;
  /** Aluguéis do pedido que ainda existem. */
  rentals: ApprovalRental[];
  /** Jogos do pedido que ainda existem (bookings como estão gravados). */
  games: Record<string, { units: RentalUnit[]; bookings: RentalBooking[] }>;
}

export type ApprovalDecision =
  /** Reserva: rentals → reserved e bookings finais de cada jogo (sem holds vencidos). */
  | { kind: "confirm"; rentalIds: string[]; bookingsByGame: Record<string, RentalBooking[]> }
  /** Não dá para entregar (cópia pega por outro / pedido cancelado pelo cliente): reembolso integral. */
  | { kind: "late_refund"; reason: "expired" | "canceled" }
  /** Reembolso tardio deste pagamento já decidido, mas ainda não concluído. */
  | { kind: "retry_late_refund" }
  /** Este pagamento já foi processado. */
  | { kind: "already" }
  /** O pedido já tem outro pagamento: devolver este integralmente. */
  | { kind: "duplicate" }
  | { kind: "ignored" };

type ApprovalOrder = Pick<RentalOrderType, "paymentMode"> & {
  payment?: Pick<
    RentalOrderPayment,
    | "status"
    | "providerPaymentId"
    | "closedBy"
    | "lateApprovalRefunded"
    | "lateApprovalRefundPending"
  >;
};

/**
 * Decide o que fazer com um pagamento aprovado do pedido. Só confirma se TODAS
 * as cópias do pedido continuam garantidas: o hold do aluguel ainda vale ou a
 * mesma cópia está livre e ativa para as datas (descontados os holds vencidos).
 * Nunca confirma duas vezes nem um pedido que o cliente cancelou.
 */
export function decideApproval(
  order: ApprovalOrder,
  ctx: ApprovalContext,
  nowMs: number,
): ApprovalDecision {
  const p = order.payment;
  if (order.paymentMode !== "online" || !p) return { kind: "ignored" };

  if (p.providerPaymentId) {
    if (p.providerPaymentId !== ctx.paymentId) return { kind: "duplicate" };
    return p.lateApprovalRefundPending && !p.lateApprovalRefunded
      ? { kind: "retry_late_refund" }
      : { kind: "already" };
  }
  // Pago/reembolsado sem id registrado não deveria existir: nunca confirmar de novo.
  if (p.status !== "pending" && p.status !== "rejected" && p.status !== "expired") {
    return { kind: "duplicate" };
  }
  if (p.closedBy === "customer") return { kind: "late_refund", reason: "canceled" };

  const bookingsByGame: Record<string, RentalBooking[]> = {};
  const rentalIds: string[] = [];
  for (const r of ctx.rentals) {
    if (r.status !== "awaiting_payment" && r.status !== "canceled") continue;
    const game = ctx.games[r.gameId];
    if (!game) return { kind: "late_refund", reason: "expired" };

    const list = bookingsByGame[r.gameId] ?? liveBookings(game.bookings, nowMs);
    const own = list.find((b) => b.rentalId === r.id);
    let next: RentalBooking[];
    if (own) {
      next = list.map((b) => {
        if (b.rentalId !== r.id) return b;
        const kept = { ...b, status: "reserved" as const };
        delete kept.holdUntil;
        return kept;
      });
    } else {
      const unitActive = game.units.some((u) => u.id === r.unitId && u.status === "active");
      if (!unitActive || !isUnitFree(r.unitId, list, r.startDate, r.dueDate, ctx.today)) {
        return { kind: "late_refund", reason: "expired" };
      }
      next = [
        ...list,
        { rentalId: r.id, unitId: r.unitId, startDate: r.startDate, dueDate: r.dueDate, status: "reserved" },
      ];
    }
    bookingsByGame[r.gameId] = next;
    rentalIds.push(r.id);
  }
  // Nada a entregar (aluguéis apagados): não fica com o dinheiro.
  if (rentalIds.length === 0) return { kind: "late_refund", reason: "expired" };
  return { kind: "confirm", rentalIds, bookingsByGame };
}
