"use client";

import { useState } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import type { RentalOrderType, RentalPendingRefund } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi, type ApiResult } from "@/services/rentalApi";
import { orderFlags } from "@/rental/attention";
import { formatBRL } from "@/rental/money";

type Order = RentalOrderType & { id: string };

/** Chaves de reembolso (iguais às do servidor) -> como retomar a operação. */
function retryFor(order: Order, refund: RentalPendingRefund): (() => Promise<ApiResult<unknown>>) | null {
  const adminPrefix = `${order.id}:admin:`;
  if (refund.key.startsWith(adminPrefix)) {
    return () =>
      rentalApi.refundOrder(order.id, {
        amount: refund.amount,
        requestId: refund.key.slice(adminPrefix.length),
        reason: refund.reason,
      });
  }
  if (refund.key.startsWith(`${order.id}:review:`)) {
    return () => rentalApi.reviewCancellation(order.id, { decision: "approve", amount: refund.amount });
  }
  // Cancelamento de um aluguel: repetir o cancelamento retoma o mesmo reembolso.
  if (refund.rentalId && refund.key === `${order.id}:${refund.rentalId}:cancel`) {
    return () => rentalApi.cancel(refund.rentalId!, undefined, refund.amount);
  }
  return null;
}

function Issue({
  title,
  text,
  retry,
  retryLabel = "Tentar de novo",
}: {
  title: string;
  text: string;
  retry?: () => Promise<ApiResult<unknown>>;
  retryLabel?: string;
}) {
  const { addAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!retry || loading) return;
    setLoading(true);
    setError("");
    const result = await retry();
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      addAlert(result.message);
      return;
    }
    addAlert("Feito. Confira o histórico de reembolsos do pedido.");
  };

  return (
    <div className="flex gap-2 rounded-xl border border-invalid-color/40 bg-invalid-color/5 p-3 text-xs text-primary-gold/85">
      <LuTriangleAlert size={16} className="shrink-0 mt-0.5 text-invalid-color" />
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="font-semibold text-invalid-color">{title}</span>
        <span>{text}</span>
        {error && <span className="text-invalid-color">{error}</span>}
        {retry && (
          <button
            type="button"
            disabled={loading}
            onClick={run}
            className="self-start h-8 px-3 rounded-lg border border-invalid-color/50 text-invalid-color font-semibold hover:bg-invalid-color/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Tentando..." : retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/** Avisos de reembolso que não terminaram e pedem a atenção do admin. */
export default function OrderIssues({ order }: { order: Order }) {
  const flags = orderFlags(order);
  const p = order.payment;
  const dups = (p?.duplicatePayments ?? []).filter((d) => d.refundFailed && !d.providerRefundId);
  const mpNote = p?.providerPaymentId ? ` (pagamento nº ${p.providerPaymentId})` : "";

  if (!flags.lateRefundFailed && dups.length === 0 && flags.failedRefunds.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {flags.lateRefundFailed && (
        <Issue
          title="Pagamento chegou tarde e a devolução falhou"
          text="O cliente pagou depois do tempo e o reembolso automático não foi concluído. Tente de novo; se continuar falhando, devolva pelo painel do Mercado Pago."
          retry={() => rentalApi.verifyOrder(order.id)}
        />
      )}
      {dups.map((d) => (
        <Issue
          key={d.paymentId}
          title={`Pagamento em duplicidade de ${formatBRL(d.amount)} sem devolução`}
          text={`O cliente pagou duas vezes (pagamento nº ${d.paymentId}) e a devolução automática falhou. O Mercado Pago tenta de novo quando reenvia o aviso; se demorar, devolva esse pagamento pelo painel do Mercado Pago.`}
        />
      ))}
      {flags.failedRefunds.map((r) => {
        const retry = retryFor(order, r);
        return (
          <Issue
            key={r.key}
            title={`Reembolso de ${formatBRL(r.amount)} sem confirmação`}
            text={`O Mercado Pago não respondeu a tempo${mpNote}: o dinheiro pode ou não ter saído. ${
              retry
                ? "Tentar de novo é seguro, o reembolso não sai em dobro."
                : "Confira no painel do Mercado Pago antes de devolver de novo."
            }`}
            retry={retry ?? undefined}
          />
        );
      })}
    </div>
  );
}
