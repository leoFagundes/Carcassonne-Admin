"use client";

import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { LuPackage } from "react-icons/lu";
import type { RentalOrderType, RentalStatus, RentalType } from "@/types";
import { CatalogEmpty, CatalogSearch, FilterPills } from "@/components/adminCatalog";
import { foldText, searchWords } from "@/components/showcase/search";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import Modal from "@/components/modal";
import { orderNeedsAttention } from "@/rental/attention";
import { formatCountdown, orderPaymentView, type OrderPaymentView } from "@/rental/payments";
import { rentalAttention } from "@/rental/attention";
import { diffDays, formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import RentalActions from "./rentalActions";
import { CustomerModal } from "./customerDetail";
import { plural, useNow, useToday, whatsappLink } from "./rentalShared";
import OrderDetail from "./orderDetail";
import RefundBand from "./refundBand";
import BulkDelete from "./bulkDelete";
import { matchesPaymentFilter, type PaymentFilter } from "./paymentFilters";

export { rentalAttention };

type Rental = RentalType & { id: string };
type Order = RentalOrderType & { id: string };
type StatusFilter = "all" | RentalStatus;

function Band({
  title,
  tone,
  rentals,
  note,
}: {
  title: string;
  tone: string;
  rentals: Rental[];
  note?: (r: Rental) => string;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest">{title}</span>
        <span className="text-lg font-semibold">{rentals.length}</span>
      </div>
      {rentals.length === 0 ? (
        <span className="text-[11px] opacity-50">Nada por aqui.</span>
      ) : (
        <ul className="flex flex-col gap-1">
          {rentals.map((r) => (
            <li key={r.id} className="text-xs flex flex-wrap gap-x-2 opacity-90">
              <span className="font-semibold">{r.code}</span>
              <span>{r.gameName}</span>
              <span className="opacity-70">{r.customer.name}</span>
              {note && <span className="font-semibold">{note(r)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Tone = "gold" | "sky" | "green" | "orange" | "red" | "muted";

/** Cor do texto + borda de cada tom (selo da situação e linha do pagamento). */
const TONE: Record<Tone, { text: string; border: string }> = {
  gold: { text: "text-primary-gold", border: "border-primary-gold/50" },
  sky: { text: "text-sky-300", border: "border-sky-300/50" },
  green: { text: "text-emerald-300", border: "border-emerald-400/50" },
  orange: { text: "text-orange-300", border: "border-orange-400/50" },
  red: { text: "text-invalid-color", border: "border-invalid-color/60" },
  muted: { text: "text-primary-gold/55", border: "border-primary-gold/20" },
};

/** Uma situação só, com cor: o que o admin precisa saber deste aluguel agora. */
function rentalSituation(rental: Rental, today: string): { label: string; tone: Tone } {
  switch (rental.status) {
    case "awaiting_payment":
      return { label: "Aguardando pagamento", tone: "orange" };
    case "reserved":
      return rental.startDate < today
        ? { label: "Não retirado", tone: "orange" }
        : { label: "Reservado", tone: "gold" };
    case "picked_up":
      return rental.dueDate < today
        ? { label: `Atrasado ${plural(diffDays(rental.dueDate, today), "dia", "dias")}`, tone: "red" }
        : { label: "Retirado", tone: "sky" };
    case "returned":
      return { label: "Devolvido", tone: "green" };
    case "canceled":
      return { label: "Cancelado", tone: "muted" };
  }
}

/** Complemento das datas: o prazo que importa hoje. */
function dateHint(rental: Rental, today: string): string | null {
  if (rental.status === "reserved" && rental.startDate === today) return "retira hoje";
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
function paymentLine(view: OrderPaymentView): { text: string; tone: Tone } | null {
  switch (view.state) {
    case "counter":
      return null;
    case "awaiting":
      return { text: `Pagamento online · aguardando (expira em ${formatCountdown(view.msLeft)})`, tone: "orange" };
    case "rejected":
      return { text: "Pagamento online · recusado, cliente pode tentar de novo", tone: "orange" };
    case "expired":
      return { text: "Pagamento online · prazo esgotado sem pagamento", tone: "muted" };
    case "canceled":
      return { text: "Pagamento online · pedido cancelado antes de pagar", tone: "muted" };
    case "paid": {
      const how = view.method === "pix" ? " (Pix)" : view.method === "card" ? " (cartão)" : "";
      return { text: `Pago online${how}`, tone: "green" };
    }
    case "refunded":
      return { text: `Pago online · reembolsado ${formatBRL(view.amount)}`, tone: "muted" };
    case "partially_refunded":
      return { text: `Pago online · reembolso parcial de ${formatBRL(view.amount)}`, tone: "orange" };
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
  const situation = rentalSituation(rental, today);
  const finished = rental.status === "returned" || rental.status === "canceled";
  const canceled = rental.status === "canceled";
  const hint = dateHint(rental, today);
  const cancel = cancelText(rental);
  const payment = order ? paymentLine(orderPaymentView(order, now)) : null;
  const othersInOrder = order ? order.rentalIds.length - 1 : 0;

  return (
    <article
      className={`flex flex-col gap-1.5 rounded-xl border p-3 transition-opacity ${
        canceled
          ? "border-dashed border-primary-gold/10 bg-secondary-black/20 opacity-60 hover:opacity-90"
          : "border-primary-gold/15 bg-secondary-black/50"
      }`}
    >
      {/* Jogo (o que importa) · situação · valor */}
      <div className="flex items-start gap-x-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
          <span className="text-sm font-semibold text-primary-gold">{rental.gameName}</span>
          <span className="text-xs text-primary-gold/50">{rental.unitLabel}</span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TONE[situation.tone].text} ${TONE[situation.tone].border}`}
          >
            {situation.label}
          </span>
        </div>
        <span className={`shrink-0 text-sm font-semibold text-primary-gold/80 ${canceled ? "line-through" : ""}`}>
          {formatBRL(rental.price)}
        </span>
      </div>

      {/* Cliente · datas */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-primary-gold/70">
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenCustomer(rental)}
            title="Ver dados do cliente"
            className="underline underline-offset-2 hover:text-primary-gold cursor-pointer text-left"
          >
            {rental.customer.name}
          </button>
          <a
            href={whatsappLink(rental.customer.phone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp de ${rental.customer.name}`}
            title="Abrir WhatsApp"
            className="text-primary-gold/50 hover:text-primary-gold transition-colors"
          >
            <FaWhatsapp size={13} />
          </a>
        </span>
        <span aria-hidden="true" className="text-primary-gold/30">
          ·
        </span>
        <span title="Retirada → devolução">
          {formatDateBR(rental.startDate)} → {formatDateBR(rental.dueDate)}
          {hint && <span className="text-primary-gold/50"> ({hint})</span>}
        </span>
      </div>

      {cancel && <span className="text-[11px] text-primary-gold/55">{cancel}</span>}
      {rental.returnCondition && rental.returnCondition !== "ok" && (
        <span className="text-[11px] text-invalid-color/80">
          {rental.returnCondition === "damaged" ? "Devolvido com avaria" : "Devolvido com peça faltando"}
          {rental.returnNote ? `: ${rental.returnNote}` : ""}
        </span>
      )}
      {payment && <span className={`text-[11px] font-medium ${TONE[payment.tone].text}`}>{payment.text}</span>}
      {order && orderNeedsAttention(order) && (
        <span className="text-[11px] font-semibold text-orange-300">Reembolso pede sua atenção — abra o pedido</span>
      )}

      {/* Pedido (+ lixeira nos encerrados) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {order ? (
          <button
            type="button"
            onClick={() => onOpenOrder(order)}
            title="Ver detalhes do pedido"
            className="text-[11px] underline underline-offset-2 text-primary-gold/55 hover:text-primary-gold cursor-pointer"
          >
            Pedido {order.code}
            {othersInOrder > 0 && ` · +${plural(othersInOrder, "jogo", "jogos")}`}
          </button>
        ) : (
          <span className="text-[11px] text-primary-gold/45">Pedido {rental.code}</span>
        )}
        {finished && (
          <div className="ml-auto">
            <RentalActions rental={rental} order={order} />
          </div>
        )}
      </div>
      {!finished && <RentalActions rental={rental} order={order} />}
    </article>
  );
}

export default function RentalsTab() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
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
    const unsub = RentalConfigRepository.subscribeSettings((s) => setOnlineEnabled(s.onlinePayment.enabled));
    return () => unsub();
  }, []);

  // Loja só de balcão: sem selos nem filtro de pagamento.
  const showPayment = onlineEnabled || orders.some((o) => o.paymentMode === "online");
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);
  const attentionOrders = useMemo(() => orders.filter(orderNeedsAttention), [orders]);
  const openedOrder = orderOpen ? orderById.get(orderOpen) : undefined;

  const bands = useMemo(
    () => ({
      pickups: rentals.filter((r) => r.status === "reserved" && r.startDate === today),
      returns: rentals.filter((r) => r.status === "picked_up" && r.dueDate === today),
      overdue: rentals.filter((r) => r.status === "picked_up" && r.dueDate < today),
      notPickedUp: rentals.filter((r) => r.status === "reserved" && r.startDate < today),
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
  const paymentOk = (r: Rental) => matchesPaymentFilter(orderById.get(r.orderId), payment, now);
  const filtered = searched.filter((r) => (status === "all" || r.status === status) && paymentOk(r));
  const count = (s: StatusFilter) =>
    searched.filter((r) => (s === "all" || r.status === s) && paymentOk(r)).length;
  const countPayment = (p: PaymentFilter) =>
    searched.filter(
      (r) => (status === "all" || r.status === status) && matchesPaymentFilter(orderById.get(r.orderId), p, now),
    ).length;

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <RefundBand orders={attentionOrders} onOpen={(o) => setOrderOpen(o.id)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Band
          title="Retiradas de hoje"
          tone="border-primary-gold/25 text-primary-gold"
          rentals={bands.pickups}
        />
        <Band
          title="Devoluções de hoje"
          tone="border-primary-gold/25 text-primary-gold"
          rentals={bands.returns}
        />
        <Band
          title="Atrasados"
          tone="border-invalid-color/40 text-invalid-color"
          rentals={bands.overdue}
          note={(r) => plural(diffDays(r.dueDate, today), "dia", "dias")}
        />
        <Band
          title="Não retirados"
          tone="border-primary-gold/15 text-primary-gold/70"
          rentals={bands.notPickedUp}
          note={(r) => `desde ${formatDateBR(r.startDate)}`}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
        <CatalogSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por cliente, código ou jogo"
        />
        <FilterPills<StatusFilter>
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Todos", count: count("all") },
            { value: "reserved", label: "Reservados", count: count("reserved") },
            { value: "picked_up", label: "Retirados", count: count("picked_up") },
            { value: "returned", label: "Devolvidos", count: count("returned") },
            { value: "canceled", label: "Cancelados", count: count("canceled") },
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
            { value: "paid", label: "Pagos online", count: countPayment("paid") },
            { value: "awaiting", label: "Aguardando", count: countPayment("awaiting") },
            { value: "expired", label: "Expirados", count: countPayment("expired") },
            { value: "refunded", label: "Reembolsados", count: countPayment("refunded") },
          ]}
        />
        )}
        <BulkDelete rentals={rentals} orderById={orderById} />
      </div>

      {loading ? (
        <span className="text-xs text-primary-gold/50 px-1">Carregando aluguéis...</span>
      ) : filtered.length === 0 ? (
        <CatalogEmpty
          icon={LuPackage}
          title={rentals.length ? "Nenhum aluguel com essa busca e filtro." : "Nenhum aluguel ainda."}
          onClear={
            search || status !== "all" || payment !== "all"
              ? () => {
                  setSearch("");
                  setStatus("all");
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

      <CustomerModal rental={customerOf} rentals={rentals} onClose={() => setCustomerOf(null)} />

      <Modal isOpen={!!openedOrder} onClose={() => setOrderOpen(null)} noPadding isFixed patternCloseButton={false}>
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
