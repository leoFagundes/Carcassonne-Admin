"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { rentalApi } from "@/services/rentalApi";
import { FaWhatsapp } from "react-icons/fa";
import { LuPackage } from "react-icons/lu";
import type { RentalOrderType, RentalStatus, RentalType } from "@/types";
import {
  CatalogEmpty,
  CatalogSearch,
  FilterPills,
} from "@/components/adminCatalog";
import { foldText, searchWords } from "@/components/showcase/search";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import Modal from "@/components/modal";
import { orderNeedsAttention } from "@/rental/attention";
import {
  formatCountdown,
  isOrderExpirable,
  orderPaymentView,
  rentalRefundInfo,
  type OrderPaymentView,
} from "@/rental/payments";

/** Aguardando pagamento cujo pedido já fechou sem pagar (prazo vencido ou cliente cancelou). */
function unpaidClosed(
  rental: { status: RentalStatus },
  order: RentalOrderType | undefined,
  now: number,
): "expired" | "canceled" | undefined {
  if (rental.status !== "awaiting_payment" || !order) return undefined;
  const state = orderPaymentView(order, now).state;
  return state === "expired"
    ? "expired"
    : state === "canceled"
      ? "canceled"
      : undefined;
}
import { rentalAttention } from "@/rental/attention";
import { counterPaymentText } from "@/rental/adminOrders";
import { diffDays, formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import RentalActions from "./rentalActions";
import { CustomerModal } from "./customerDetail";
import {
  formatStamp,
  plural,
  useNow,
  useToday,
  whatsappLink,
} from "./rentalShared";
import OrderDetail from "./orderDetail";
import RefundBand from "./refundBand";
import BulkDelete from "./bulkDelete";
import { matchesPaymentFilter, type PaymentFilter } from "./paymentFilters";

export { rentalAttention };

type Rental = RentalType & { id: string };
type Order = RentalOrderType & { id: string };
type StatusFilter = "all" | "active" | RentalStatus;

const ACTIVE: RentalStatus[] = ["awaiting_payment", "reserved", "picked_up"];
const statusMatches = (r: { status: RentalStatus }, s: StatusFilter) =>
  s === "all" || (s === "active" ? ACTIVE.includes(r.status) : r.status === s);

type AgendaGroup = {
  key: string;
  title: string;
  tone: string;
  rentals: Rental[];
  note?: (r: Rental) => string;
};

/**
 * O que fazer hoje: atrasados, devoluções, retiradas e não retirados — cada
 * linha com o botão da ação (registrar retirada/devolução) e o WhatsApp.
 */
function TodayAgenda({
  groups,
  orderById,
  onOpenCustomer,
}: {
  groups: AgendaGroup[];
  orderById: Map<string, Order>;
  onOpenCustomer: (rental: Rental) => void;
}) {
  const visible = groups.filter((g) => g.rentals.length > 0);
  const total = visible.reduce((sum, g) => sum + g.rentals.length, 0);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60">
          Hoje
        </span>
        {total > 0 && (
          <span className="text-[11px] text-primary-gold/45">
            {plural(total, "pendência", "pendências")}
          </span>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-emerald-300/90">
          Nada pendente para hoje: nenhuma retirada, devolução ou atraso.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((group) => (
            <div
              key={group.key}
              className={`flex flex-col gap-1.5 rounded-xl border p-2.5 ${group.tone}`}
            >
              <span className="flex items-center justify-between text-xs font-semibold">
                {group.title}
                <span className="text-base">{group.rentals.length}</span>
              </span>
              <ul className="flex flex-col gap-1.5">
                {group.rentals.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg bg-primary-black/40 px-2.5 py-2"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-primary-gold truncate">
                        {r.gameName}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-primary-gold/60 min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenCustomer(r)}
                          className="truncate underline underline-offset-2 hover:text-primary-gold cursor-pointer"
                        >
                          {r.customer.name}
                        </button>
                        <a
                          href={whatsappLink(r.customer.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp de ${r.customer.name}`}
                          className="shrink-0 hover:text-primary-gold"
                        >
                          <FaWhatsapp size={12} />
                        </a>
                        {group.note && (
                          <span className="shrink-0 font-semibold">
                            · {group.note(r)}
                          </span>
                        )}
                      </span>
                    </div>
                    <RentalActions
                      rental={r}
                      order={orderById.get(r.orderId)}
                      compact
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type Tone = "gold" | "sky" | "green" | "orange" | "red" | "violet" | "muted";

/** Cor do texto + borda de cada tom (selo da situação e linha do pagamento). */
const TONE: Record<Tone, { text: string; border: string }> = {
  gold: { text: "text-primary-gold", border: "border-primary-gold/50" },
  sky: { text: "text-sky-300", border: "border-sky-300/50" },
  green: { text: "text-emerald-300", border: "border-emerald-400/50" },
  orange: { text: "text-orange-300", border: "border-orange-400/50" },
  red: { text: "text-invalid-color", border: "border-invalid-color/60" },
  violet: { text: "text-violet-300", border: "border-violet-400/50" },
  muted: { text: "text-primary-gold/55", border: "border-primary-gold/20" },
};

/** Uma situação só, com cor: o que o admin precisa saber deste aluguel agora. */
function rentalSituation(
  rental: Rental,
  today: string,
  unpaid?: "expired" | "canceled",
): { label: string; tone: Tone } {
  // O status gravado só muda quando a varredura roda; o prazo já diz que acabou.
  if (unpaid)
    return {
      label:
        unpaid === "expired"
          ? "Pagamento expirado"
          : "Cancelado antes de pagar",
      tone: "muted",
    };
  switch (rental.status) {
    case "awaiting_payment":
      return { label: "Aguardando pagamento", tone: "orange" };
    case "reserved":
      return rental.startDate < today
        ? { label: "Não retirado", tone: "orange" }
        : { label: "Reservado", tone: "gold" };
    case "picked_up":
      return rental.dueDate < today
        ? {
            label: `Atrasado ${plural(diffDays(rental.dueDate, today), "dia", "dias")}`,
            tone: "red",
          }
        : { label: "Retirado", tone: "sky" };
    case "returned":
      return { label: "Devolvido", tone: "green" };
    case "canceled":
      return { label: "Cancelado", tone: "muted" };
  }
}

/** Complemento das datas: o prazo que importa hoje. */
function dateHint(rental: Rental, today: string): string | null {
  if (rental.status === "reserved" && rental.startDate === today)
    return "retira hoje";
  if (rental.status !== "picked_up" || rental.dueDate < today) return null;
  const left = diffDays(today, rental.dueDate);
  return left === 0 ? "devolve hoje" : `faltam ${plural(left, "dia", "dias")}`;
}

/** Quem cancelou e por quê, numa linha. */
function cancelText(rental: Rental): string | null {
  if (rental.status !== "canceled") return null;
  const who =
    rental.canceledBy === "customer"
      ? "Cancelado pelo cliente"
      : rental.canceledBy === "system"
        ? "Cancelado automaticamente"
        : rental.canceledBy === "admin"
          ? "Cancelado pelo admin"
          : "Cancelado";
  const reason = rental.cancelReason?.trim();
  if (!reason) return who;
  // Motivos gerados pelo sistema já dizem quem cancelou.
  return /^cancelad/i.test(reason) ? reason : `${who}: ${reason}`;
}

/** Linha do pagamento — só para pedidos online (balcão é o normal, não precisa dizer). */
function paymentLine(
  view: OrderPaymentView,
  pixAtCounter = false,
): { text: string; tone: Tone } | null {
  switch (view.state) {
    case "counter":
      return null;
    case "awaiting":
      return {
        text: `${pixAtCounter ? "Pix do balcão" : "Pagamento online"} · aguardando (expira em ${formatCountdown(view.msLeft)})`,
        tone: "orange",
      };
    case "rejected":
      return {
        text: "Pagamento online · recusado, cliente pode tentar de novo",
        tone: "orange",
      };
    case "expired":
      return {
        text: "Pagamento online · prazo esgotado sem pagamento",
        tone: "muted",
      };
    case "canceled":
      return {
        text: "Pagamento online · pedido cancelado antes de pagar",
        tone: "muted",
      };
    case "paid": {
      const how =
        view.method === "pix"
          ? " (Pix)"
          : view.method === "card"
            ? " (cartão)"
            : "";
      return { text: `Pago online${how}`, tone: "green" };
    }
    case "refunded":
      return {
        text: `Pago online · pedido reembolsado (${formatBRL(view.amount)})`,
        tone: "muted",
      };
    case "partially_refunded":
      return {
        text: `Pago online · ${formatBRL(view.amount)} já devolvidos do pedido`,
        tone: "orange",
      };
    case "review":
      return { text: "Pago online · cancelamento em análise", tone: "orange" };
  }
}

function RentalRow({
  rental,
  today,
  order,
  now,
  onOpenOrder,
  onOpenCustomer,
}: {
  rental: Rental;
  today: string;
  order?: Order;
  now: number;
  onOpenOrder: (order: Order) => void;
  onOpenCustomer: (rental: Rental) => void;
}) {
  const unpaid = unpaidClosed(rental, order, now);
  const situation = rentalSituation(rental, today, unpaid);
  const finished = rental.status === "returned" || rental.status === "canceled";
  const placedAt = formatStamp(rental.createdAt);
  const canceled = rental.status === "canceled";
  const hint = dateHint(rental, today);
  const cancel = cancelText(rental);
  const counterPaid = order ? counterPaymentText(order) : null;
  const payment = order
    ? counterPaid
      ? {
          text:
            order.counterPayment?.kind === "courtesy" && order.counterPayment.reason
              ? `${counterPaid} · ${order.counterPayment.reason}`
              : counterPaid,
          tone: (order.counterPayment?.kind === "courtesy" ? "violet" : "green") as Tone,
        }
      : paymentLine(orderPaymentView(order, now), order.payment?.channel === "pix")
    : null;
  const byAdmin = order?.origin === "admin";
  const othersInOrder = order ? order.rentalIds.length - 1 : 0;
  const refund = order ? rentalRefundInfo(order, rental.id) : null;
  const refundTag = refund
    ? {
        label:
          refund.state === "pending"
            ? "Reembolso em andamento"
            : refund.amount !== undefined
              ? `Reembolsado ${formatBRL(refund.amount)}`
              : "Reembolsado",
        tone: (refund.state === "pending" ? "orange" : "violet") as Tone,
      }
    : null;

  return (
    <article
      className={`overflow-hidden rounded-xl border transition-all ${
        canceled
          ? "border-dashed border-primary-gold/15 bg-secondary-black/20 opacity-60 hover:opacity-90"
          : "border-primary-gold/15 bg-secondary-black/50 hover:border-primary-gold/25"
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 p-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h3 className="min-w-0 text-sm font-semibold leading-snug text-primary-gold">
              {rental.gameName}
            </h3>

            <span className="text-xs text-primary-gold/45">
              {rental.unitLabel}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 ${
                TONE[situation.tone].text
              } ${TONE[situation.tone].border}`}
            >
              {situation.label}
            </span>

            {refundTag && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 ${
                  TONE[refundTag.tone].text
                } ${TONE[refundTag.tone].border}`}
              >
                {refundTag.label}
              </span>
            )}

            {byAdmin && (
              <span
                title={order?.createdBy ? `Criado no balcão por ${order.createdBy.name}` : "Criado no balcão"}
                className="rounded-full border border-primary-gold/25 px-2 py-0.5 text-[10px] font-medium leading-4 text-primary-gold/60"
              >
                Balcão
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="block text-[10px] uppercase tracking-wide text-primary-gold/35">
            Valor
          </span>
          <span
            className={`text-sm font-semibold text-primary-gold/90 ${
              canceled ? "line-through" : ""
            }`}
          >
            {formatBRL(rental.price)}
          </span>
        </div>
      </div>

      {/* Informações principais */}
      <div className="mx-3 grid gap-2 rounded-lg border border-primary-gold/10 bg-secondary-black/30 p-2.5 sm:grid-cols-2">
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-primary-gold/35">
            Cliente
          </span>

          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenCustomer(rental)}
              title="Ver dados do cliente"
              className="min-w-0 truncate text-left text-xs font-medium text-primary-gold/75 underline decoration-primary-gold/30 underline-offset-2 transition-colors hover:text-primary-gold"
            >
              {rental.customer.name}
            </button>

            <a
              href={whatsappLink(rental.customer.phone)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp de ${rental.customer.name}`}
              title="Abrir WhatsApp"
              className="shrink-0 rounded-md p-1 text-primary-gold/45 transition-colors hover:bg-primary-gold/10 hover:text-primary-gold"
            >
              <FaWhatsapp size={13} />
            </a>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-primary-gold/35">
            Período do aluguel
          </span>

          <p
            title="Retirada → devolução"
            className="text-xs font-medium text-primary-gold/70"
          >
            {formatDateBR(rental.startDate)}
            <span className="mx-1.5 text-primary-gold/30">→</span>
            {formatDateBR(rental.dueDate)}

            {hint && (
              <span className="ml-1 font-normal text-primary-gold/45">
                ({hint})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Avisos */}
      {(cancel ||
        (rental.returnCondition && rental.returnCondition !== "ok") ||
        payment ||
        (order && orderNeedsAttention(order))) && (
        <div className="space-y-1.5 px-3 pt-3">
          {cancel && (
            <p className="rounded-lg bg-primary-gold/5 px-2.5 py-2 text-[11px] leading-relaxed text-primary-gold/55">
              {cancel}
            </p>
          )}

          {rental.returnCondition && rental.returnCondition !== "ok" && (
            <p className="rounded-lg border border-invalid-color/15 bg-invalid-color/5 px-2.5 py-2 text-[11px] leading-relaxed text-invalid-color/85">
              <span className="font-semibold">
                {rental.returnCondition === "damaged"
                  ? "Devolvido com avaria"
                  : "Devolvido com peça faltando"}
              </span>

              {rental.returnNote && (
                <span className="text-invalid-color/70">
                  {" "}
                  — {rental.returnNote}
                </span>
              )}
            </p>
          )}

          {payment && (
            <p
              className={`rounded-lg bg-primary-gold/5 px-2.5 py-2 text-[11px] font-medium leading-relaxed ${
                TONE[payment.tone].text
              }`}
            >
              {payment.text}
            </p>
          )}

          {order && orderNeedsAttention(order) && (
            <p className="rounded-lg border border-orange-300/15 bg-orange-300/5 px-2.5 py-2 text-[11px] font-semibold leading-relaxed text-orange-300">
              Reembolso pendente de atenção. Abra o pedido para revisar.
            </p>
          )}
        </div>
      )}

      {/* Rodapé */}
      <div className="mt-3 border-t border-primary-gold/10 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {order ? (
              <button
                type="button"
                onClick={() => onOpenOrder(order)}
                title="Ver detalhes do pedido"
                className="text-[11px] font-medium text-primary-gold/60 underline decoration-primary-gold/25 underline-offset-2 transition-colors hover:text-primary-gold"
              >
                Pedido {order.code}
                {othersInOrder > 0 &&
                  ` · +${plural(othersInOrder, "jogo", "jogos")}`}
              </button>
            ) : (
              <span className="text-[11px] font-medium text-primary-gold/45">
                Pedido {rental.code}
              </span>
            )}

            {placedAt && (
              <>
                <span
                  aria-hidden="true"
                  className="text-[10px] text-primary-gold/20"
                >
                  •
                </span>
                <span className="text-[11px] text-primary-gold/35">
                  feito em {placedAt}
                </span>
              </>
            )}
          </div>

          {finished && <RentalActions rental={rental} order={order} />}
        </div>

        {!finished && !unpaid && (
          <div className="mt-2.5">
            <RentalActions rental={rental} order={order} />
          </div>
        )}
      </div>
    </article>
  );
}

export default function RentalsTab() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [customerOf, setCustomerOf] = useState<Rental | null>(null);
  const today = useToday();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const [orderOpen, setOrderOpen] = useState<string | null>(null);
  const now = useNow();
  const [onlineEnabled, setOnlineEnabled] = useState(false);

  useEffect(() => {
    const unsub = RentalRepository.subscribeToAll((list) => {
      setRentals(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = RentalOrderRepository.subscribeToAll(setOrders);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = RentalConfigRepository.subscribeSettings((s) =>
      setOnlineEnabled(s.onlinePayment.enabled),
    );
    return () => unsub();
  }, []);

  // Loja só de balcão: sem selos nem filtro de pagamento.
  const showPayment =
    onlineEnabled || orders.some((o) => o.paymentMode === "online");
  const orderById = useMemo(
    () => new Map(orders.map((o) => [o.id, o])),
    [orders],
  );
  const attentionOrders = useMemo(
    () => orders.filter(orderNeedsAttention),
    [orders],
  );
  const openedOrder = orderOpen ? orderById.get(orderOpen) : undefined;

  // Sem cron (ou entre uma rodada e outra), o admin aberto expira os vencidos de vez.
  const hasExpirable = orders.some((o) => isOrderExpirable(o, now));
  const lastSweep = useRef(0);
  useEffect(() => {
    if (!hasExpirable || Date.now() - lastSweep.current < 120_000) return;
    lastSweep.current = Date.now();
    void rentalApi.sweepExpired();
  }, [hasExpirable, now]);

  const bands = useMemo(
    () => ({
      pickups: rentals.filter(
        (r) => r.status === "reserved" && r.startDate === today,
      ),
      returns: rentals.filter(
        (r) => r.status === "picked_up" && r.dueDate === today,
      ),
      overdue: rentals.filter(
        (r) => r.status === "picked_up" && r.dueDate < today,
      ),
      notPickedUp: rentals.filter(
        (r) => r.status === "reserved" && r.startDate < today,
      ),
    }),
    [rentals, today],
  );

  const words = useMemo(() => searchWords(search), [search]);
  const searched = useMemo(
    () =>
      rentals.filter((r) => {
        if (!words.length) return true;
        const text = foldText(`${r.customer.name} ${r.code} ${r.gameName}`);
        return words.every((w) => text.includes(w));
      }),
    [rentals, words],
  );
  const paymentOk = (r: Rental) =>
    matchesPaymentFilter(orderById.get(r.orderId), payment, now);
  // Aguardando pagamento com o prazo vencido conta como cancelado nos filtros.
  const asShown = (r: Rental): Rental =>
    unpaidClosed(r, orderById.get(r.orderId), now)
      ? { ...r, status: "canceled" }
      : r;
  const filtered = searched.filter(
    (r) => statusMatches(asShown(r), status) && paymentOk(r),
  );
  // Ordem do banco: os mais recentes primeiro (a urgência fica no quadro "Hoje").

  const count = (s: StatusFilter) =>
    searched.filter((r) => statusMatches(asShown(r), s) && paymentOk(r)).length;
  const countPayment = (p: PaymentFilter) =>
    searched.filter(
      (r) =>
        statusMatches(asShown(r), status) &&
        matchesPaymentFilter(orderById.get(r.orderId), p, now),
    ).length;

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <RefundBand orders={attentionOrders} onOpen={(o) => setOrderOpen(o.id)} />

      <TodayAgenda
        orderById={orderById}
        onOpenCustomer={setCustomerOf}
        groups={[
          {
            key: "overdue",
            title: "Atrasados",
            tone: "border-invalid-color/40 text-invalid-color",
            rentals: bands.overdue,
            note: (r) =>
              `${plural(diffDays(r.dueDate, today), "dia", "dias")} de atraso`,
          },
          {
            key: "returns",
            title: "Devoluções de hoje",
            tone: "border-sky-300/30 text-sky-200",
            rentals: bands.returns,
          },
          {
            key: "pickups",
            title: "Retiradas de hoje",
            tone: "border-primary-gold/30 text-primary-gold",
            rentals: bands.pickups,
          },
          {
            key: "notPickedUp",
            title: "Não retirados",
            tone: "border-orange-400/35 text-orange-200",
            rentals: bands.notPickedUp,
            note: (r) => `desde ${formatDateBR(r.startDate)}`,
          },
        ]}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
        <CatalogSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por cliente, código ou jogo"
        />
        <FilterPills<StatusFilter>
          label="Situação"
          scroll
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Em andamento", count: count("active") },
            ...(showPayment
              ? [
                  {
                    value: "awaiting_payment" as const,
                    label: "Aguardando pagamento",
                    count: count("awaiting_payment"),
                  },
                ]
              : []),
            {
              value: "reserved",
              label: "Reservados",
              count: count("reserved"),
            },
            {
              value: "picked_up",
              label: "Retirados",
              count: count("picked_up"),
            },
            {
              value: "returned",
              label: "Devolvidos",
              count: count("returned"),
            },
            {
              value: "canceled",
              label: "Cancelados",
              count: count("canceled"),
            },
            { value: "all", label: "Todos", count: count("all") },
          ]}
        />
        {showPayment && (
          <FilterPills<PaymentFilter>
            label="Pagamento"
            value={payment}
            onChange={setPayment}
            scroll
            options={[
              { value: "all", label: "Todos", count: countPayment("all") },
              {
                value: "paid",
                label: "Pagos online",
                count: countPayment("paid"),
              },
              {
                value: "awaiting",
                label: "Aguardando",
                count: countPayment("awaiting"),
              },
              {
                value: "expired",
                label: "Expirados",
                count: countPayment("expired"),
              },
              {
                value: "refunded",
                label: "Reembolsados",
                count: countPayment("refunded"),
              },
            ]}
          />
        )}
        <BulkDelete rentals={rentals} orderById={orderById} />
      </div>

      {loading ? (
        <span className="text-xs text-primary-gold/50 px-1">
          Carregando aluguéis...
        </span>
      ) : filtered.length === 0 ? (
        <CatalogEmpty
          icon={LuPackage}
          title={
            !rentals.length
              ? "Nenhum aluguel ainda."
              : status === "active" && !search && payment === "all"
                ? "Nenhum aluguel em andamento agora."
                : "Nenhum aluguel com essa busca e filtro."
          }
          onClear={
            search || status !== "active" || payment !== "all"
              ? () => {
                  setSearch("");
                  setStatus("active");
                  setPayment("all");
                }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <RentalRow
              key={r.id}
              rental={r}
              today={today}
              order={orderById.get(r.orderId)}
              now={now}
              onOpenOrder={(o) => setOrderOpen(o.id)}
              onOpenCustomer={setCustomerOf}
            />
          ))}
        </div>
      )}

      <CustomerModal
        rental={customerOf}
        rentals={rentals}
        onClose={() => setCustomerOf(null)}
      />

      <Modal
        isOpen={!!openedOrder}
        onClose={() => setOrderOpen(null)}
        noPadding
        isFixed
        patternCloseButton={false}
      >
        {openedOrder && (
          <OrderDetail
            order={openedOrder}
            rentals={rentals.filter((r) => r.orderId === openedOrder.id)}
            now={now}
            onClose={() => setOrderOpen(null)}
          />
        )}
      </Modal>
    </div>
  );
}
