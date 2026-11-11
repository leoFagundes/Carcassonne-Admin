import type { RentalOrderType, RentalPendingRefund, RentalType } from "@/types";
import { isCheckPending } from "./returns";

export interface RentalAttention {
  pickupsToday: number;
  returnsToday: number;
  overdue: number;
  notPickedUp: number;
  /** Devolvidos que a equipe ainda não conferiu. */
  toCheck: number;
  /** Pedidos que pedem decisão ou socorro do admin (análise de cancelamento, reembolso com falha). */
  refundReviews: number;
}

/** O que pede atenção em um pedido pago online. */
export interface OrderFlags {
  /** Cancelamento em análise (política manual) aguardando decisão. */
  review: boolean;
  /** Pago depois de o pedido fechar e o reembolso automático falhou. */
  lateRefundFailed: boolean;
  /** Pagamentos em duplicidade cujo reembolso falhou. */
  duplicateFailed: number;
  /** Reembolsos que não receberam resposta definitiva do Mercado Pago. */
  failedRefunds: RentalPendingRefund[];
}

export function orderFlags(order: RentalOrderType): OrderFlags {
  const p = order.payment;
  return {
    review: order.cancellationReview?.status === "pending",
    lateRefundFailed: !!p?.lateApprovalRefundFailed && !p.lateApprovalRefunded,
    duplicateFailed: (p?.duplicatePayments ?? []).filter((d) => d.refundFailed && !d.providerRefundId)
      .length,
    failedRefunds: (p?.pendingRefunds ?? []).filter((r) => r.failed),
  };
}

export function orderNeedsAttention(order: RentalOrderType): boolean {
  const f = orderFlags(order);
  return f.review || f.lateRefundFailed || f.duplicateFailed > 0 || f.failedRefunds.length > 0;
}

/** Quantos aluguéis/pedidos pedem atenção do admin hoje (datas "YYYY-MM-DD"). */
export function rentalAttention(
  rentals: RentalType[],
  today: string,
  orders: RentalOrderType[] = [],
): RentalAttention {
  const result: RentalAttention = {
    pickupsToday: 0,
    returnsToday: 0,
    overdue: 0,
    notPickedUp: 0,
    toCheck: 0,
    refundReviews: 0,
  };
  for (const rental of rentals) {
    if (rental.status === "reserved") {
      if (rental.startDate === today) result.pickupsToday++;
      else if (rental.startDate < today) result.notPickedUp++;
    } else if (rental.status === "picked_up") {
      if (rental.dueDate === today) result.returnsToday++;
      else if (rental.dueDate < today) result.overdue++;
    } else if (isCheckPending(rental)) {
      result.toCheck++;
    }
  }
  result.refundReviews = orders.filter(orderNeedsAttention).length;
  return result;
}
