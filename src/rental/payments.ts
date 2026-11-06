import type { CancellationPolicy, RentalBooking, RentalOrderPayment, RentalOrderType } from "@/types";

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
  | { state: "rejected"; msLeft: number }
  | { state: "paid"; method?: "pix" | "card" }
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
      return { state: "expired" };
    case "pending":
    case "rejected":
      if (p.holdUntil <= nowMs) return { state: "expired" };
      return p.status === "pending"
        ? { state: "awaiting", msLeft: p.holdUntil - nowMs }
        : { state: "rejected", msLeft: p.holdUntil - nowMs };
  }
}

/** "mm:ss", nunca negativo. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
