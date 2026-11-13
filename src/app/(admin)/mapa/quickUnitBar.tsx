"use client";

import React from "react";
import { LuX } from "react-icons/lu";
import { STATE_META, type SeatUnit } from "@/floorplan/day";
import type { ManualState } from "@/floorplan/types";
import { people, unitTitle } from "./dayPanel";

const CHOICES: { id: ManualState | null; label: string }[] = [
  { id: null, label: "Auto" },
  { id: "free", label: "Livre" },
  { id: "occupied", label: "Ocupada" },
  { id: "blocked", label: "Fechada" },
];

/** Mesa escolhida: estado, reservas e os botões para trocar o estado com um toque. */
export default function QuickUnitBar({
  unit,
  onSet,
  onClose,
  extra,
}: {
  unit: SeatUnit;
  onSet: (state: ManualState | null) => void;
  onClose: () => void;
  /** Botão extra ao lado do fechar (ex.: "Detalhes"). */
  extra?: React.ReactNode;
}) {
  const res = unit.reservations.slice(0, 2);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/35 bg-primary-black/95 p-2.5 shadow-card backdrop-blur">
      <div className="flex items-start gap-2">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: STATE_META[unit.state].color }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-primary-gold">{unitTitle(unit)}</span>
          <span className="block truncate text-[11px] text-primary-gold/60">
            {STATE_META[unit.state].label} · {unit.seats} lugares
            {unit.manual ? " · marcado à mão" : ""}
          </span>
          {res.length > 0 && (
            <span className="mt-0.5 block truncate text-[11px] text-primary-gold/75">
              {res.map((r) => `${r.time} ${r.name.split(" ")[0] || "reserva"} (${people(r)}p)${r.isArrived ? " ✓" : ""}`).join(" · ")}
              {unit.reservations.length > 2 ? ` +${unit.reservations.length - 2}` : ""}
            </span>
          )}
        </span>
        {extra}
        <button type="button" aria-label="Fechar" onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-primary-gold/60 hover:text-primary-gold">
          <LuX size={15} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {CHOICES.map((o) => {
          const on = (unit.manual?.state ?? null) === o.id;
          return (
            <button
              key={o.label}
              type="button"
              aria-pressed={on}
              onClick={() => onSet(o.id)}
              className={`flex items-center justify-center gap-1 rounded-lg border px-1 py-1.5 text-[11px] font-bold transition-colors ${
                on ? "border-primary-gold bg-primary-gold/20 text-primary-gold" : "border-primary-gold/15 text-primary-gold/70 hover:border-primary-gold/45 hover:text-primary-gold"
              }`}
            >
              {o.id && <span className="h-2 w-2 rounded-full" style={{ background: STATE_META[o.id].color }} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
