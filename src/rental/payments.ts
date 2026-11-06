import type {
  CancellationPolicy,
  RentalBooking,
  RentalOrderPayment,
  RentalOrderType,
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

/** Valor a devolver segundo a política; null = decisão manual do admin. */
export function refundFor(policy: CancellationPolicy, feePercent: number, amount: number): number | null {
  if (policy === "full") return amount;
  if (policy === "fee") return amount - Math.round((amount * feePercent) / 100);
  return null;
}

export function refundableLeft(
  order: Pick<RentalOrderType, "total"> & { payment?: Pick<RentalOrderPayment, "refundedTotal"> }
): number {
  return Math.max(0, order.total - (order.payment?.refundedTotal ?? 0));
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
