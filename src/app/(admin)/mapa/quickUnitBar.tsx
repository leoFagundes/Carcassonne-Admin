"use client";

import React, { useEffect, useState } from "react";
import { LuMinus, LuPlus, LuUserPlus, LuX } from "react-icons/lu";
import { STATE_META, type SeatUnit } from "@/floorplan/day";
import type { ManualState } from "@/floorplan/types";
import { people, unitTitle } from "./labels";

const CHOICES: { id: ManualState | null; label: string }[] = [
  { id: null, label: "Auto" },
  { id: "free", label: "Livre" },
  { id: "occupied", label: "Ocupada" },
  { id: "blocked", label: "Fechada" },
];

/** "há 35 min" / "há 1h20". */
export function since(ms: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - ms) / 60000));
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

/** Atualiza a cada minuto (para o "há X min"). */
function useMinuteTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
}

/** Formulário curtinho: nome (opcional) e quantas pessoas. */
export function WalkinForm({
  seats,
  onSeat,
  onCancel,
  compact,
}: {
  seats: number;
  onSeat: (name: string, people: number) => void;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [n, setN] = useState(Math.max(1, Math.min(seats || 2, 2)));
  return (
    <form
      className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "rounded-lg border border-primary-gold/15 bg-primary-black/40 p-2"}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSeat(name.trim(), n);
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        placeholder="Nome (opcional)"
        aria-label="Nome do cliente (opcional)"
        className="min-w-0 flex-1 basis-32 rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-sm text-primary-gold outline-none placeholder:text-primary-gold/35 focus:border-primary-gold/60"
      />
      <span className="flex items-center rounded-lg border border-primary-gold/20 bg-primary-black/70" role="group" aria-label="Pessoas">
        <button type="button" onClick={() => setN((v) => Math.max(1, v - 1))} aria-label="Menos uma pessoa" className="px-2 py-1.5 text-primary-gold/70 hover:text-primary-gold">
          <LuMinus size={13} />
        </button>
        <span className="min-w-[3.2rem] text-center text-sm font-bold text-primary-gold">
          {n} <span className="text-[10px] font-semibold text-primary-gold/55">{n === 1 ? "pessoa" : "pessoas"}</span>
        </span>
        <button type="button" onClick={() => setN((v) => Math.min(99, v + 1))} aria-label="Mais uma pessoa" className="px-2 py-1.5 text-primary-gold/70 hover:text-primary-gold">
          <LuPlus size={13} />
        </button>
      </span>
      <button type="submit" className="rounded-lg border border-primary-gold bg-primary-gold px-3 py-1.5 text-xs font-bold text-primary-black hover:bg-primary-gold/90">
        Sentar
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1.5 text-xs text-primary-gold/60 hover:text-primary-gold">
          Cancelar
        </button>
      )}
    </form>
  );
}

/** Mesa escolhida: estado, reservas e os botões para trocar o estado com um toque. */
export default function QuickUnitBar({
  unit,
  onSet,
  onClose,
  extra,
  onSeatWalkin,
  onRelease,
}: {
  unit: SeatUnit;
  onSet: (state: ManualState | null) => void;
  onClose: () => void;
  /** Botão extra ao lado do fechar (ex.: "Detalhes"). */
  extra?: React.ReactNode;
  /** Cliente sem reserva (opcional): nome e pessoas. */
  onSeatWalkin?: (name: string, people: number) => void;
  /** Libera a mesa (o cliente sem reserva foi embora). */
  onRelease?: () => void;
}) {
  useMinuteTick();
  const [adding, setAdding] = useState(false);
  useEffect(() => setAdding(false), [unit.key]);
  const res = unit.reservations.slice(0, 2);
  const walk = unit.walkins;
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

      {walk.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[#f0716b]/35 bg-[#f0716b]/10 px-2 py-1.5 text-[11px] text-primary-gold/85">
          <span className="min-w-0 flex-1 truncate">
            Sem reserva: {walk.map((w) => `${w.name || "cliente"} · ${w.people}p · ${since(w.at)}`).join(" · ")}
          </span>
          {onRelease && (
            <button type="button" onClick={onRelease} className="shrink-0 rounded-md border border-primary-gold/40 px-2 py-0.5 font-bold text-primary-gold hover:bg-primary-gold/10">
              Liberar
            </button>
          )}
        </div>
      )}

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

      {onSeatWalkin &&
        (adding ? (
          <WalkinForm
            compact
            seats={unit.seats}
            onCancel={() => setAdding(false)}
            onSeat={(name, n) => {
              onSeatWalkin(name, n);
              setAdding(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center justify-center gap-1.5 self-start text-[11px] font-semibold text-primary-gold/60 underline-offset-2 hover:text-primary-gold hover:underline"
          >
            <LuUserPlus size={13} /> Cliente sem reserva (opcional: nome e pessoas)
          </button>
        ))}
    </div>
  );
}
