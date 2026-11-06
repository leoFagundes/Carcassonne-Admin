import type { RentalOrderType } from "@/types";

export type PaymentFilter = "all" | "paid" | "awaiting" | "expired" | "refunded";

/** Pedido online no filtro de pagamento da aba Aluguéis (pedidos do balcão só aparecem em "Todos"). */
export function matchesPaymentFilter(
  order: RentalOrderType | undefined,
  filter: PaymentFilter,
  nowMs: number,
): boolean {
  if (filter === "all") return true;
  const p = order?.payment;
  if (!order || order.paymentMode !== "online" || !p) return false;
  const open = p.status === "pending" || p.status === "rejected";
  switch (filter) {
    case "paid":
      return p.status === "approved";
    case "awaiting":
      return open && p.holdUntil > nowMs;
    case "expired":
      return p.status === "expired" || (open && p.holdUntil <= nowMs);
    case "refunded":
      return p.status === "refunded" || p.status === "partially_refunded";
  }
}
