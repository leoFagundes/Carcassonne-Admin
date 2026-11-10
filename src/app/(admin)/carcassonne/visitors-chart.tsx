"use client";

import { useEffect, useMemo, useState } from "react";
import { LuUsers } from "react-icons/lu";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReserveType } from "@/types";
import DayAttendanceRepository, { type DayAttendanceType } from "@/services/repositories/DayAttendanceRepository";
import { monthlyVisitors } from "@/utils/attendance";

const GOLD = "#e6c56b";
const GOLD_DIM = "#d4af37";

/**
 * Clientes por mês: soma o público anotado em cada dia (Reservas → "Quantas
 * pessoas vieram?") e, nos dias sem anotação, as pessoas das reservas.
 */
export default function VisitorsChart({ reserves }: { reserves: ReserveType[] }) {
  const [attendance, setAttendance] = useState<DayAttendanceType[]>([]);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  useEffect(() => {
    DayAttendanceRepository.getAll().then(setAttendance);
  }, []);

  const months = useMemo(() => monthlyVisitors(reserves, attendance, year), [reserves, attendance, year]);
  const total = months.reduce((s, m) => s + m.pessoas, 0);
  const noted = months.reduce((s, m) => s + m.diasAnotados, 0);
  const max = Math.max(0, ...months.map((m) => m.pessoas));

  return (
    <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <LuUsers size={14} className="text-primary-gold/50" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">Clientes por mês</span>
        <span className="text-[10px] text-primary-gold/35">
          {total.toLocaleString("pt-BR")} em {year}
          {noted ? ` · ${noted} ${noted === 1 ? "dia anotado" : "dias anotados"}` : ""}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setYear((y) => y - 1)}
            aria-label="Ano anterior"
            className="text-[10px] px-1.5 py-0.5 rounded border border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70 transition-all cursor-pointer"
          >
            ‹
          </button>
          <span className="text-[11px] font-semibold text-primary-gold/60 px-1 min-w-[38px] text-center">{year}</span>
          <button
            onClick={() => setYear((y) => Math.min(y + 1, thisYear))}
            disabled={year >= thisYear}
            aria-label="Próximo ano"
            className="text-[10px] px-1.5 py-0.5 rounded border border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={months} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: GOLD, fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: GOLD, fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(230,197,107,0.05)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const m = payload[0].payload as (typeof months)[number];
              return (
                <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs text-primary-gold shadow-lg">
                  <p className="font-semibold mb-0.5">{label}</p>
                  <p>{m.pessoas.toLocaleString("pt-BR")} pessoas</p>
                  {m.diasAnotados > 0 && (
                    <p className="text-primary-gold/60">
                      {m.diasAnotados} {m.diasAnotados === 1 ? "dia anotado" : "dias anotados"} ({m.anotado} pessoas)
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="pessoas" radius={[4, 4, 0, 0]}>
            {months.map((m) => (
              <Cell key={m.name} fill={m.pessoas === max && max > 0 ? GOLD : GOLD_DIM + "60"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-primary-gold/35">
        Dias com o público anotado em Reservas (“Quantas pessoas vieram?”) usam esse número, que inclui quem veio sem
        reserva. Os outros dias contam as pessoas das reservas confirmadas.
      </p>
    </div>
  );
}
