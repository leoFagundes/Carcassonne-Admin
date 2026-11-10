"use client";

import { useState } from "react";
import { LuReceipt } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { formatDateBR } from "@/rental/dates";
import type { OrderPaymentStatus, RentalOrderType, RentalType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi } from "@/services/rentalApi";
import FormCard from "@/components/formCard";
import PaymentBadge from "@/app/(client)/aluguel/paymentBadge";
import { formatBRL } from "@/rental/money";
import {
  isPaidOnline,
  orderPaymentView,
  refundableLeft,
} from "@/rental/payments";
import { RefundForm, ReviewForm } from "./refundForms";
import OrderIssues from "./orderIssues";
import { STATUS_LABEL, formatStamp, whatsappLink } from "./rentalShared";

type Order = RentalOrderType & { id: string };
type Rental = RentalType & { id: string };

const METHOD_LABEL = {
  pix: "Pix",
  card: "Cartão",
  other: "Saldo Mercado Pago",
} as const;

const dateTime = (ms: number) =>
  new Date(ms).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 min-w-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-primary-gold/55 shrink-0">{label}</span>
      <span className="text-primary-gold/90 text-right min-w-0 break-words">
        {value}
      </span>
    </div>
  );
}

/** Mensagem do resultado da consulta no Mercado Pago, pelo status gravado depois dela. */
function verifyMessage(status: OrderPaymentStatus | null | undefined): string {
  if (status === "approved")
    return "Pagamento aprovado encontrado no Mercado Pago: pedido confirmado.";
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
    addAlert(
      verifyMessage(
        (result.data as { status?: OrderPaymentStatus | null } | null)?.status,
      ),
    );
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
  const reviewIds =
    order.cancellationReview?.status === "pending"
      ? order.cancellationReview.rentalIds
      : [];
  const pendingRefunds = (p?.pendingRefunds ?? []).filter((r) => !r.failed);
  // Aguardando, recusado ou expirado/cancelado: o pagamento pode ter saído sem o aviso chegar.
  const canCheckProvider =
    order.paymentMode === "online" &&
    (p?.status === "pending" ||
      p?.status === "rejected" ||
      p?.status === "expired");
  const rentalOf = (rentalId: string) => rentals.find((r) => r.id === rentalId);

  return (
    <FormCard
      title={`Pedido ${order.code}`}
      subtitle={order.customer.name}
      icon={<LuReceipt size={18} />}
      onClose={onClose}
      hideFooter
      maxWidth="sm:max-w-[520px]"
    >
      <div className="flex min-w-0 flex-col gap-4">
        {/* Status e contato */}
        <div className="flex flex-wrap items-center gap-2">
          <PaymentBadge view={view} />

          <a
            href={whatsappLink(order.customer.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary-gold/25 px-3 text-xs font-medium text-primary-gold/75 transition-colors hover:border-primary-gold/50 hover:bg-primary-gold/5 hover:text-primary-gold"
          >
            <FaWhatsapp size={13} />
            Falar com {order.customer.name.split(" ")[0]}
          </a>
        </div>

        {/* Resumo principal */}
        <div className="overflow-hidden rounded-xl border border-primary-gold/15 bg-primary-black/20">
          <div className="grid grid-cols-3 divide-x divide-primary-gold/10">
            {[
              ["Total", formatBRL(order.total)],
              ["Retirada", formatDateBR(order.startDate)],
              ["Jogos", String(order.items.length)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 px-3 py-3">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-primary-gold/40">
                  {label}
                </span>

                <span className="mt-1 block truncate text-sm font-semibold text-primary-gold">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {formatStamp(order.createdAt) && (
            <div className="border-t border-primary-gold/10 px-3 py-2">
              <p className="text-[11px] text-primary-gold/45">
                Pedido feito em {formatStamp(order.createdAt)}
              </p>
            </div>
          )}
        </div>

        <OrderIssues order={order} />

        {/* Cancelamento pendente */}
        {reviewIds.length > 0 && (
          <div className="rounded-xl border border-orange-300/20 bg-orange-300/5 p-3">
            <div className="mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-300/70">
                Ação necessária
              </span>

              <h3 className="mt-0.5 text-sm font-semibold text-orange-300">
                Cancelamento em análise
              </h3>

              <p className="mt-1 text-xs leading-relaxed text-primary-gold/65">
                O cliente cancelou{" "}
                <span className="font-medium text-primary-gold/85">
                  {reviewIds
                    .map(
                      (id) =>
                        order.items.find((item) => item.rentalId === id)
                          ?.gameName,
                    )
                    .filter(Boolean)
                    .join(", ")}
                </span>{" "}
                e aguarda a sua decisão sobre quanto devolver.
              </p>
            </div>

            <ReviewForm order={order} />
          </div>
        )}

        {/* Jogos */}
        <Section title="Jogos">
          <ul className="flex flex-col divide-y divide-primary-gold/10">
            {order.items.map((item) => {
              const rental = rentalOf(item.rentalId);
              const status = rental?.status;

              const statusLabel =
                status === "awaiting_payment" &&
                (view.state === "expired" || view.state === "canceled")
                  ? view.state === "expired"
                    ? "Pagamento expirado"
                    : "Cancelado antes de pagar"
                  : status
                    ? STATUS_LABEL[status]
                    : null;

              return (
                <li
                  key={item.rentalId}
                  className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium leading-relaxed ${
                        status === "canceled"
                          ? "text-primary-gold/45 line-through"
                          : "text-primary-gold/90"
                      }`}
                    >
                      {item.gameName}
                    </p>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      {statusLabel && (
                        <span className="text-[11px] text-primary-gold/50">
                          {statusLabel}
                        </span>
                      )}

                      {statusLabel &&
                        rental &&
                        (status === "reserved" || status === "picked_up") && (
                          <span
                            aria-hidden="true"
                            className="text-[10px] text-primary-gold/25"
                          >
                            •
                          </span>
                        )}

                      {rental &&
                        (status === "reserved" || status === "picked_up") && (
                          <span className="text-[11px] text-primary-gold/45">
                            {rental.unitLabel} · devolução até{" "}
                            {formatDateBR(rental.dueDate)}
                          </span>
                        )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 text-xs font-medium ${
                      status === "canceled"
                        ? "text-primary-gold/40 line-through"
                        : "text-primary-gold/80"
                    }`}
                  >
                    {formatBRL(item.price)}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 border-t border-primary-gold/15 pt-2">
            <Row
              label="Total do pedido"
              value={<strong>{formatBRL(order.total)}</strong>}
            />
          </div>
        </Section>

        {/* Cliente */}
        <Section title="Cliente">
          <div className="flex flex-col gap-2">
            <Row label="Nome" value={order.customer.name} />

            <Row
              label="WhatsApp"
              value={
                <a
                  href={whatsappLink(order.customer.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-primary-gold/30 underline-offset-2 transition-colors hover:text-primary-gold"
                >
                  {order.customer.phone}
                </a>
              }
            />

            <Row label="E-mail" value={order.customer.email} />
          </div>
        </Section>

        {/* Pagamento */}
        <Section title="Pagamento">
          {order.paymentMode === "counter" || !p ? (
            <div className="rounded-lg border border-primary-gold/10 bg-primary-gold/5 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-primary-gold/65">
                Pagamento no balcão, sem cobrança online.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {p.method && (
                  <Row label="Forma" value={METHOD_LABEL[p.method]} />
                )}

                {p.paidAt && <Row label="Pago em" value={dateTime(p.paidAt)} />}

                <Row label="Valor" value={formatBRL(order.total)} />

                {p.providerPaymentId && (
                  <Row label="Nº no Mercado Pago" value={p.providerPaymentId} />
                )}
              </div>

              {!paid && (
                <div className="rounded-lg border border-primary-gold/10 bg-primary-gold/5 px-3 py-2.5">
                  <p className="text-xs leading-relaxed text-primary-gold/60">
                    Ainda não há pagamento aprovado neste pedido.
                    {p.status === "pending" && p.holdUntil > now
                      ? ` A reserva vale até ${dateTime(p.holdUntil)}.`
                      : ""}
                  </p>
                </div>
              )}

              {canCheckProvider && (
                <div className="rounded-lg border border-primary-gold/10 bg-primary-black/20 p-3">
                  <p className="mb-2.5 text-[11px] leading-relaxed text-primary-gold/50">
                    O cliente diz que pagou? Consulte no Mercado Pago. Se houver
                    pagamento aprovado, o pedido será confirmado. Caso as cópias
                    já tenham sido liberadas, o valor será devolvido.
                  </p>

                  <CheckProviderButton orderId={order.id} />
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Histórico de reembolsos */}
        {p && (p.refunds.length > 0 || pendingRefunds.length > 0) && (
          <Section title="Reembolsos">
            <ul className="flex flex-col divide-y divide-primary-gold/10">
              {p.refunds.map((refund) => (
                <li
                  key={refund.providerRefundId || refund.key}
                  className="py-2 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-primary-gold/90">
                      {formatBRL(refund.amount)}
                    </span>

                    <span className="shrink-0 text-[11px] text-primary-gold/45">
                      {dateTime(refund.at)}
                    </span>
                  </div>

                  {refund.reason && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-primary-gold/50">
                      {refund.reason}
                    </p>
                  )}
                </li>
              ))}

              {pendingRefunds.map((refund) => (
                <li
                  key={refund.key}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="text-xs font-medium text-orange-300">
                    {formatBRL(refund.amount)}
                  </span>

                  <span className="text-[11px] text-orange-300/70">
                    Em andamento
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 border-t border-primary-gold/15 pt-2">
              <Row label="Já devolvido" value={formatBRL(p.refundedTotal)} />
            </div>
          </Section>
        )}

        {/* Novo reembolso */}
        {paid && (
          <Section title="Reembolsar">
            <div className="mb-3 rounded-lg border border-primary-gold/10 bg-primary-gold/5 px-3 py-2.5">
              <span className="block text-[10px] font-medium uppercase tracking-wider text-primary-gold/40">
                Disponível para reembolso
              </span>

              <strong className="mt-0.5 block text-sm text-primary-gold/90">
                {formatBRL(refundableLeft(order))}
              </strong>

              <p className="mt-1 text-[11px] text-primary-gold/50">
                O cliente será avisado por e-mail.
              </p>
            </div>

            {/* A chave refaz o formulário e o requestId quando o saldo muda. */}
            <RefundForm
              key={`${order.id}:${refundableLeft(order)}`}
              order={order}
              rentals={rentals}
            />
          </Section>
        )}
      </div>
    </FormCard>
  );
}
