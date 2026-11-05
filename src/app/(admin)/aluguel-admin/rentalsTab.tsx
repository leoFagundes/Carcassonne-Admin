"use client";

import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { LuPackage } from "react-icons/lu";
import type { RentalStatus, RentalType } from "@/types";
import { CatalogEmpty, CatalogSearch, FilterPills } from "@/components/adminCatalog";
import { foldText, searchWords } from "@/components/showcase/search";
import RentalRepository from "@/services/repositories/RentalRepository";
import { rentalAttention } from "@/rental/attention";
import { diffDays, formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import RentalActions from "./rentalActions";
import { CustomerModal } from "./customerDetail";
import { STATUS_LABEL, plural, useToday, whatsappLink } from "./rentalShared";

export { rentalAttention };

type Rental = RentalType & { id: string };
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

function RentalRow({
  rental,
  today,
  onOpenCustomer,
}: {
  rental: Rental;
  today: string;
  onOpenCustomer: (rental: Rental) => void;
}) {
  const late = rental.status === "picked_up" && rental.dueDate < today;
  // Cancelado não pede ação nenhuma: fica esmaecido, mas legível para consulta.
  const canceled = rental.status === "canceled";
  return (
    <article
      className={`flex flex-col gap-2 rounded-xl border p-3 transition-opacity ${
        canceled
          ? "border-dashed border-primary-gold/10 bg-secondary-black/20 opacity-55 hover:opacity-80"
          : "border-primary-gold/15 bg-secondary-black/50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-primary-gold">{rental.code}</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            late
              ? "border-invalid-color/50 text-invalid-color"
              : canceled
                ? "border-primary-gold/15 text-primary-gold/50"
                : "border-primary-gold/30 text-primary-gold/70"
          }`}
        >
          {late
            ? `Atrasado ${plural(diffDays(rental.dueDate, today), "dia", "dias")}`
            : canceled && rental.canceledBy
              ? `Cancelado pelo ${rental.canceledBy === "customer" ? "cliente" : "admin"}`
              : STATUS_LABEL[rental.status]}
        </span>
        <span
          className={`ml-auto text-sm font-semibold text-primary-gold/80 ${
            canceled ? "line-through" : ""
          }`}
        >
          {formatBRL(rental.price)}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-6 gap-y-0.5 text-xs text-primary-gold/65">
        <span>
          {rental.gameName} · {rental.unitLabel}
        </span>
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
        <span>
          Retirada {formatDateBR(rental.startDate)} · Devolução {formatDateBR(rental.dueDate)}
        </span>
      </div>
      {rental.status === "canceled" && rental.cancelReason && (
        <span className="text-[11px] text-primary-gold/45">Motivo: {rental.cancelReason}</span>
      )}
      {rental.returnCondition && rental.returnCondition !== "ok" && (
        <span className="text-[11px] text-invalid-color/80">
          {rental.returnCondition === "damaged" ? "Com avaria" : "Peça faltando"}
          {rental.returnNote ? `: ${rental.returnNote}` : ""}
        </span>
      )}
      <RentalActions rental={rental} />
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

  useEffect(() => {
    const unsub = RentalRepository.subscribeToAll((list) => {
      setRentals(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
  const filtered = searched.filter((r) => status === "all" || r.status === status);
  const count = (s: StatusFilter) => searched.filter((r) => s === "all" || r.status === s).length;

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
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
      </div>

      {loading ? (
        <span className="text-xs text-primary-gold/50 px-1">Carregando aluguéis...</span>
      ) : filtered.length === 0 ? (
        <CatalogEmpty
          icon={LuPackage}
          title={rentals.length ? "Nenhum aluguel com essa busca e filtro." : "Nenhum aluguel ainda."}
          onClear={
            search || status !== "all"
              ? () => {
                  setSearch("");
                  setStatus("all");
                }
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <RentalRow key={r.id} rental={r} today={today} onOpenCustomer={setCustomerOf} />
          ))}
        </div>
      )}

      <CustomerModal rental={customerOf} rentals={rentals} onClose={() => setCustomerOf(null)} />
    </div>
  );
}
