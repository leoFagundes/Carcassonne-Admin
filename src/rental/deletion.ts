import type { RentalOrderType, RentalType } from "@/types";
import { orderNeedsAttention } from "./attention";

/**
 * Regras de exclusão definitiva (admin). Normal: só sai o que já terminou e
 * cujo dinheiro está resolvido. Forçada (`force`): sai também o que está em
 * andamento (a cópia é liberada). Sempre seguram: reembolso ou análise em
 * aberto e pagamento em andamento no Mercado Pago (pedido online não pago, no
 * prazo, sem a confirmação `verifiedUnpaid`), porque sem o pedido esse
 * dinheiro não seria devolvido sozinho.
 */

export type DeletionOptions = {
  force?: boolean;
  /**
   * Pedidos online não pagos (ids) em que o Mercado Pago confirmou, agora, que
   * não há pagamento aprovado nem em andamento: podem sair sem esperar o prazo.
   */
  verifiedUnpaid?: ReadonlySet<string>;
  /** Só na tela: prevê que o servidor vai conferir no Mercado Pago (não bloqueia por prazo). */
  skipUnpaidGrace?: boolean;
};

/**
 * Pedido online não pago (expirado/cancelado/recusado): o Mercado Pago ainda
 * pode aprovar um pagamento que estava em análise. Sem o pedido no banco esse
 * pagamento não seria devolvido sozinho, então o pedido fica por este prazo
 * depois do fim do tempo para pagar.
 */
export const UNPAID_ORDER_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

const FINISHED: RentalType["status"][] = ["returned", "canceled"];

export function isRentalFinished(rental: Pick<RentalType, "status">): boolean {
  return FINISHED.includes(rental.status);
}

function formatDayMonth(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Pedido online não pago ainda dentro do prazo em que o Mercado Pago pode aprovar algo. */
export function unpaidGraceApplies(order: RentalOrderType | undefined, nowMs: number): boolean {
  const p = order?.payment;
  if (!order || order.paymentMode !== "online" || !p) return false;
  if (!["pending", "rejected", "expired"].includes(p.status)) return false;
  return nowMs < p.holdUntil + UNPAID_ORDER_GRACE_MS;
}

/**
 * Os pagamentos achados no Mercado Pago para o pedido deixam apagá-lo? Só se
 * nenhum foi aprovado nem está em andamento (pendente ou em análise).
 */
export function paymentsAllowDeletion(payments: { status: string }[]): boolean {
  return !payments.some((p) => ["approved", "pending", "in_process", "authorized"].includes(p.status));
}

/** Motivo para o pedido ainda não poder ser apagado, ou `null` se pode. */
export function orderDeletionBlock(
  order: RentalOrderType | undefined,
  nowMs: number,
  subject = "O pedido deste aluguel",
  opts: DeletionOptions = {},
): string | null {
  if (!order) return null;
  const p = order.payment;
  const moneyOpen =
    orderNeedsAttention(order) ||
    (p?.pendingRefunds?.length ?? 0) > 0 ||
    !!p?.lateApprovalRefundPending ||
    (p?.duplicatePayments ?? []).some((d) => !d.providerRefundId);
  if (moneyOpen) {
    return `${subject} tem reembolso ou análise pendente. Resolva antes de excluir.`;
  }
  const verified = !!order.id && !!opts.verifiedUnpaid?.has(order.id);
  if (!opts.skipUnpaidGrace && !verified && p && unpaidGraceApplies(order, nowMs)) {
    return `Este pedido tem um pagamento em andamento no Mercado Pago (ou não deu para conferir agora). Se ele for aprovado, o valor é devolvido sozinho, mas só com o pedido guardado. A exclusão fica liberada a partir de ${formatDayMonth(p.holdUntil + UNPAID_ORDER_GRACE_MS)}.`;
  }
  return null;
}

/** Motivo para o aluguel ainda não poder ser apagado, ou `null` se pode. */
export function rentalDeletionBlock(
  rental: Pick<RentalType, "status">,
  order: RentalOrderType | undefined,
  nowMs: number,
  opts: DeletionOptions = {},
): string | null {
  if (!opts.force && !isRentalFinished(rental)) {
    return "Só dá para excluir aluguéis devolvidos ou cancelados.";
  }
  return orderDeletionBlock(order, nowMs, "O pedido deste aluguel", opts);
}

/** Motivo para a conta do cliente ainda não poder ser apagada, ou `null` se pode. */
export function customerDeletionBlock(
  rentals: Pick<RentalType, "status">[],
  orders: RentalOrderType[],
  nowMs: number,
  opts: DeletionOptions = {},
): string | null {
  const open = rentals.filter((r) => !isRentalFinished(r)).length;
  if (!opts.force && open > 0) {
    return `Este cliente tem ${open === 1 ? "1 aluguel" : `${open} aluguéis`} em andamento. Devolva ou cancele antes de excluir a conta.`;
  }
  for (const order of orders) {
    const block = orderDeletionBlock(order, nowMs, "Um pedido deste cliente", opts);
    if (block) return block;
  }
  return null;
}

/** Quando o aluguel terminou (ms): devolução, cancelamento ou, sem registro, a data de devolução. */
export function rentalEndedAt(rental: Pick<RentalType, "returnedAt" | "canceledAt" | "dueDate">): number {
  const at = rental.returnedAt ?? rental.canceledAt;
  if (at && typeof at.toMillis === "function") return at.toMillis();
  return Date.parse(`${rental.dueDate}T23:59:59-03:00`);
}
