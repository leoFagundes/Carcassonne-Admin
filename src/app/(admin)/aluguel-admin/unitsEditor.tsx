"use client";

import { LuInfo, LuPlus, LuTrash } from "react-icons/lu";
import Tooltip from "@/components/Tooltip";
import type { RentalBooking, RentalUnit } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import { formatDateBR } from "@/rental/dates";
import { withLiveBookings } from "@/rental/payments";

export type UnitStatus = "free" | "reserved" | "rented" | "overdue" | "unavailable";

interface WithBookings {
  bookings: RentalBooking[];
}

/** Reservas ainda relevantes da cópia (retiradas, ou reservadas que não terminaram). */
function activeBookings(game: WithBookings, unit: RentalUnit, today: string): RentalBooking[] {
  return game.bookings.filter(
    (b) => b.unitId === unit.id && (b.status === "picked_up" || b.dueDate >= today),
  );
}

/** Situação da cópia hoje: atrasada > alugada > reservada > livre (ou indisponível). */
export function unitStatus(game: WithBookings, unit: RentalUnit, today: string): UnitStatus {
  if (unit.status === "unavailable") return "unavailable";
  const list = activeBookings(game, unit, today);
  if (list.some((b) => b.status === "picked_up" && b.dueDate < today)) return "overdue";
  if (list.some((b) => b.status === "picked_up")) return "rented";
  if (list.some((b) => b.status === "reserved")) return "reserved";
  return "free";
}

/** Texto curto da situação, com a data (ex.: "Alugada até 12/11"). */
export function unitStatusText(game: WithBookings, unit: RentalUnit, today: string): string {
  const status = unitStatus(game, unit, today);
  const list = activeBookings(game, unit, today);
  if (status === "unavailable") return "Indisponível";
  if (status === "free") return "Livre";
  if (status === "overdue") {
    const b = list.find((x) => x.status === "picked_up" && x.dueDate < today)!;
    return `Atrasada desde ${formatDateBR(b.dueDate)}`;
  }
  if (status === "rented") {
    const b = list.find((x) => x.status === "picked_up")!;
    return `Alugada até ${formatDateBR(b.dueDate)}`;
  }
  const b = list
    .filter((x) => x.status === "reserved")
    .sort((x, y) => (x.startDate < y.startDate ? -1 : 1))[0];
  return `Reservada ${formatDateBR(b.startDate)}–${formatDateBR(b.dueDate)}`;
}

const STATUS_STYLE: Record<UnitStatus, string> = {
  free: "text-green-400 border-green-400/30",
  reserved: "text-primary-gold border-primary-gold/35",
  rented: "text-sky-300 border-sky-300/30",
  overdue: "text-invalid-color border-invalid-color/40",
  unavailable: "text-primary-gold/40 border-primary-gold/15",
};

export default function UnitsEditor({
  units,
  setUnits,
  bookings,
  today,
}: {
  units: RentalUnit[];
  setUnits: (units: RentalUnit[]) => void;
  bookings: RentalBooking[];
  today: string;
}) {
  const { addAlert } = useAlert();
  // Reserva temporária vencida (pagamento não concluído) já não ocupa a cópia.
  const game = withLiveBookings({ bookings }, Date.now());

  const patch = (id: string, change: Partial<RentalUnit>) =>
    setUnits(units.map((u) => (u.id === id ? { ...u, ...change } : u)));

  const add = () =>
    setUnits([
      ...units,
      { id: crypto.randomUUID(), label: `Cópia ${units.length + 1}`, status: "active" },
    ]);

  const remove = (unit: RentalUnit) => {
    if (game.bookings.some((b) => b.unitId === unit.id)) {
      addAlert("Esta cópia tem aluguéis ou reservas em aberto.");
      return;
    }
    setUnits(units.filter((u) => u.id !== unit.id));
  };

  const inputClass =
    "w-full rounded-lg border border-primary-gold/20 bg-primary-black px-2.5 py-1.5 text-sm text-primary-gold outline-none focus:border-primary-gold/60";

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60">
          Cópias ({units.length})
          <Tooltip
            portal
            textWrap
            direction="top"
            content="Cada cópia é um exemplar físico do jogo na prateleira. Com 2 cópias, dois clientes podem alugar o mesmo jogo ao mesmo tempo. Marque uma cópia como Indisponível (ex.: peça faltando, caixa danificada) para ela não ser alugada até voltar. A observação é só para a equipe. Cópia com aluguel em aberto não pode ser removida."
          >
            <span
              aria-label="O que são as cópias?"
              className="flex items-center justify-center w-4 h-4 rounded-full border border-primary-gold/40 text-primary-gold/70 cursor-help normal-case tracking-normal"
            >
              <LuInfo size={10} />
            </span>
          </Tooltip>
        </span>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 cursor-pointer"
        >
          <LuPlus size={12} /> Adicionar cópia
        </button>
      </div>
      {units.length === 0 && (
        <p className="text-xs text-primary-gold/45">Nenhuma cópia: o jogo ficará indisponível.</p>
      )}
      {units.map((unit) => {
        const status = unitStatus(game, unit, today);
        const isActive = unit.status === "active";
        return (
          <div
            key={unit.id}
            className="flex flex-col gap-2 rounded-xl border border-primary-gold/15 bg-primary-black/40 p-2.5"
          >
            <div className="flex items-center gap-2">
              <input
                aria-label="Nome da cópia"
                // min-w-0: sem isso o input não encolhe e empurra os botões para fora no celular
                className={`${inputClass} min-w-0 flex-1`}
                value={unit.label}
                onChange={(e) => patch(unit.id, { label: e.target.value })}
              />
              <button
                type="button"
                onClick={() => patch(unit.id, { status: isActive ? "unavailable" : "active" })}
                className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                  isActive
                    ? "border-primary-gold/40 text-primary-gold"
                    : "border-primary-gold/15 text-primary-gold/40"
                }`}
              >
                {isActive ? "Ativa" : "Indisponível"}
              </button>
              <button
                type="button"
                aria-label="Remover cópia"
                onClick={() => remove(unit)}
                className="shrink-0 p-2 rounded-lg border border-primary-gold/15 text-primary-gold/50 hover:text-invalid-color hover:border-invalid-color/40 cursor-pointer"
              >
                <LuTrash size={14} />
              </button>
            </div>
            <input
              aria-label="Observação"
              placeholder="Observação (ex.: caixa amassada)"
              className={`${inputClass} text-xs`}
              value={unit.note ?? ""}
              onChange={(e) => patch(unit.id, { note: e.target.value })}
            />
            <span
              className={`self-start text-[11px] px-2 py-0.5 rounded-md border ${STATUS_STYLE[status]}`}
            >
              {unitStatusText(game, unit, today)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
