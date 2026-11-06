"use client";

import { useState } from "react";
import { LuReceipt } from "react-icons/lu";
import type { OrderPaymentStatus, RentalOrderType, RentalType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi } from "@/services/rentalApi";
import FormCard from "@/components/formCard";
import PaymentBadge from "@/app/(client)/aluguel/paymentBadge";
import { formatBRL } from "@/rental/money";
import { isPaidOnline, orderPaymentView, refundableLeft } from "@/rental/payments";
import { RefundForm, ReviewForm } from "./refundForms";
import OrderIssues from "./orderIssues";
import { STATUS_LABEL, whatsappLink } from "./rentalShared";

type Order = RentalOrderType & { id: string };
type Rental = RentalType & { id: string };

const METHOD_LABEL = { pix: "Pix", card: "Cartão", other: "Saldo Mercado Pago" } as const;

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 min-w-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-primary-gold/55 shrink-0">{label}</span>
      <span className="text-primary-gold/90 text-right min-w-0 break-words">{value}</span>
    </div>
  );
}

/** Mensagem do resultado da consulta no Mercado Pago, pelo status gravado depois dela. */
function verifyMessage(status: OrderPaymentStatus | null | undefined): string {
  if (status === "approved") return "Pagamento aprovado encontrado no Mercado Pago: pedido confirmado.";
  if (status === "refunded" || status === "partially_refunded") {
    return "Pagamento encontrado depois do prazo: o valor foi devolvido ao cliente.";
  }
  return "Consulta feita: nenhum pagamento foi confirmado neste pedido. Confira os avisos acima, se houver.";
}

/**
 * Consulta os pagamentos do pedido no Mercado Pago e aplica o que achar (para
 * quando o aviso do webhook não chegou): mesmo caminho da confirmação normal.
 */
function CheckProviderButton({ orderId }: { orderId: string }) {
  const { addAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    const result = await rentalApi.verifyOrder(orderId);
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    addAlert(verifyMessage((result.data as { status?: OrderPaymentStatus | null } | null)?.status));
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={run}
      className="self-start h-8 px-3 rounded-lg border border-primary-gold/30 text-xs font-medium text-primary-gold/80 hover:border-primary-gold/60 cursor-pointer disabled:opacity-50"
    >
      {loading ? "Consultando..." : "Consultar no Mercado Pago"}
    </button>
  );
}

export default function OrderDetail({
  order,
  rentals,
  now,
  onClose,
}: {
  order: Order;
  rentals: Rental[];
  now: number;
  onClose: VoidFunction;
}) {
  const p = order.payment;
  const view = orderPaymentView(order, now);
  const paid = isPaidOnline(order);
  const reviewIds = order.cancellationReview?.status === "pending" ? order.cancellationReview.rentalIds : [];
  const pendingRefunds = (p?.pendingRefunds ?? []).filter((r) => !r.failed);
  // Aguardando, recusado ou expirado/cancelado: o pagamento pode ter saído sem o aviso chegar.
  const canCheckProvider =
    order.paymentMode === "online" &&
    (p?.status === "pending" || p?.status === "rejected" || p?.status === "expired");
  const statusOf = (rentalId: string) => rentals.find((r) => r.id === rentalId)?.status;

  return (
    <FormCard
      title={`Pedido ${order.code}`}
      subtitle={order.customer.name}
      icon={<LuReceipt size={18} />}
      onClose={onClose}
      hideFooter
      maxWidth="sm:max-w-[520px]"
    >
      <div className="flex flex-col gap-5 min-w-0">
        <PaymentBadge view={view} className="self-start" />

        <OrderIssues order={order} />

        {reviewIds.length > 0 && (
          <Section title="Cancelamento em análise">
            <p className="text-xs text-primary-gold/70">
              O cliente cancelou{" "}
              {reviewIds
                .map((id) => order.items.find((i) => i.rentalId === id)?.gameName)
                .filter(Boolean)
                .join(", ")}{" "}
              e aguarda a sua decisão sobre quanto devolver.
            </p>
            <ReviewForm order={order} />
          </Section>
        )}

        <Section title="Jogos">
          <ul className="flex flex-col gap-1">
            {order.items.map((item) => {
              const status = statusOf(item.rentalId);
              return (
                <li key={item.rentalId} className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 text-primary-gold/90">
                    {item.gameName}
                    {status && <span className="text-primary-gold/50"> · {STATUS_LABEL[status]}</span>}
                  </span>
                  <span className="shrink-0 text-primary-gold/80">{formatBRL(item.price)}</span>
                </li>
              );
            })}
          </ul>
          <Row label="Total do pedido" value={<strong>{formatBRL(order.total)}</strong>} />
        </Section>

        <Section title="Cliente">
          <Row label="Nome" value={order.customer.name} />
          <Row
            label="WhatsApp"
            value={
              <a
                href={whatsappLink(order.customer.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {order.customer.phone}
              </a>
            }
          />
          <Row label="E-mail" value={order.customer.email} />
        </Section>

        <Section title="Pagamento">
          {order.paymentMode === "counter" || !p ? (
            <p className="text-xs text-primary-gold/65">Pagamento no balcão, sem cobrança online.</p>
          ) : (
            <>
              {p.method && <Row label="Forma" value={METHOD_LABEL[p.method]} />}
              {p.paidAt && <Row label="Pago em" value={dateTime(p.paidAt)} />}
              <Row label="Valor" value={formatBRL(order.total)} />
              {p.providerPaymentId && <Row label="Nº no Mercado Pago" value={p.providerPaymentId} />}
              {!paid && (
                <p className="text-xs text-primary-gold/60">
                  Ainda não há pagamento aprovado neste pedido.
                  {p.status === "pending" && p.holdUntil > now
                    ? ` A reserva vale até ${dateTime(p.holdUntil)}.`
                    : ""}
                </p>
              )}
              {canCheckProvider && (
                <>
                  <p className="text-[11px] text-primary-gold/50">
                    O cliente diz que pagou? Consulte no Mercado Pago: se houver pagamento aprovado, o
                    pedido é confirmado (ou, se as cópias já foram liberadas, o valor é devolvido).
                  </p>
                  <CheckProviderButton orderId={order.id} />
                </>
              )}
            </>
          )}
        </Section>

        {p && (p.refunds.length > 0 || pendingRefunds.length > 0) && (
          <Section title="Reembolsos">
            <ul className="flex flex-col gap-1.5">
              {p.refunds.map((r) => (
                <li key={r.providerRefundId || r.key} className="flex flex-col text-xs">
                  <span className="flex justify-between gap-3">
                    <span className="text-primary-gold/90">{formatBRL(r.amount)}</span>
                    <span className="text-primary-gold/55">{dateTime(r.at)}</span>
                  </span>
                  {r.reason && <span className="text-primary-gold/50">{r.reason}</span>}
                </li>
              ))}
              {pendingRefunds.map((r) => (
                <li key={r.key} className="text-xs text-orange-300">
                  {formatBRL(r.amount)} em andamento...
                </li>
              ))}
            </ul>
            <Row label="Já devolvido" value={formatBRL(p.refundedTotal)} />
          </Section>
        )}

        {paid && (
          <Section title="Reembolsar">
            <p className="text-xs text-primary-gold/55">
              Ainda dá para devolver {formatBRL(refundableLeft(order))}. O cliente é avisado por e-mail.
            </p>
            {/* A chave refaz o formulário (e o requestId) quando o saldo muda. */}
            <RefundForm key={`${order.id}:${refundableLeft(order)}`} order={order} />
          </Section>
        )}
      </div>
    </FormCard>
  );
}
