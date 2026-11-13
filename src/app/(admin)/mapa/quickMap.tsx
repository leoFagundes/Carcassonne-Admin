"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { LuArrowUpRight, LuX } from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import { formatDateBR, RENTAL_TZ, todaySP, weekdayOf } from "@/rental/dates";
import { applyDay, computeDayStatus, DEFAULT_SETTINGS, emptyDay, formatMinutes, STATE_META, syncEnabledOn, type SeatUnit } from "@/floorplan/day";
import { SEED_PLAN } from "@/floorplan/seed";
import type { DayPlan, FloorPlan, ManualState, MapReserve, MapSettings, TableState } from "@/floorplan/types";
import FloorPlanRepository from "@/services/repositories/FloorPlanRepository";
import PlanCanvas, { type GroupOutline } from "./planCanvas";
import QuickUnitBar from "./quickUnitBar";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function nowSP(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: RENTAL_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return (Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24) * 60 + Number(parts.find((p) => p.type === "minute")?.value ?? 0);
}

/**
 * Atalho por cima de Reservas: os dois andares de uma vez, para ver as mesas
 * livres e trocar o estado com um toque. O mapa completo fica a um clique.
 */
export default function QuickMap({ date, onClose }: { date: string; onClose: () => void }) {
  const { addAlert } = useAlert();
  const [plan, setPlan] = useState<FloorPlan | null>(null);
  const [day, setDay] = useState<DayPlan>(() => emptyDay(date));
  const [reserves, setReserves] = useState<MapReserve[]>([]);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [loadingReserves, setLoadingReserves] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const today = todaySP();
  const [scope, setScope] = useState<"day" | "now">("day");
  const [now, setNow] = useState(nowSP);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => FloorPlanRepository.subscribePlan((p) => setPlan(p ?? SEED_PLAN), () => setPlan(SEED_PLAN)), []);
  useEffect(() => FloorPlanRepository.subscribeDay(date, setDay), [date]);
  useEffect(() => FloorPlanRepository.subscribeSettings(setSettings), []);
  useEffect(
    () =>
      FloorPlanRepository.subscribeReservesOfDay(
        date,
        (r) => {
          setReserves(r);
          setLoadingReserves(false);
        },
        () => setLoadingReserves(false),
      ),
    [date],
  );
  useEffect(() => {
    const t = setInterval(() => setNow(nowSP()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Esc fecha; a página de trás não rola enquanto o atalho está aberto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sel) setSel(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, sel]);

  const base = plan ?? SEED_PLAN;
  const at = scope === "now" ? now : null;
  const layout = useMemo(() => applyDay(base, day), [base, day]);
  const status = useMemo(
    () => computeDayStatus(base, day, layout, reserves, { autoSync: syncEnabledOn(settings.syncHistory, date), at, stayMinutes: settings.stayMinutes }),
    [base, day, layout, reserves, settings, date, at],
  );
  const tableStates = useMemo(() => {
    const m = new Map<string, TableState>();
    for (const u of status.units) for (const id of u.tableIds) m.set(id, u.state);
    return m;
  }, [status]);
  const badges = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of status.units) if (!u.isGroup) m.set(u.tableIds[0], u.reservations.length);
    return m;
  }, [status]);
  const groups: GroupOutline[] = useMemo(
    () => status.units.filter((u) => u.isGroup).map((u) => ({ key: u.key, tableIds: u.tableIds, state: u.state, label: `${u.isAuto ? "↻ " : ""}${u.name} · ${u.seats} lug.` })),
    [status],
  );
  const unit: SeatUnit | null = sel ? status.unitByKey.get(sel) ?? null : null;
  const levels = [...base.levels].sort((a, b) => b.order - a.order);
  const selectedSet = useMemo(() => new Set(unit?.tableIds ?? []), [unit]);

  const freeOn = (level: string) => {
    const us = status.units.filter((u) => u.level === level);
    return { free: us.filter((u) => u.state === "free").length, total: us.length, seats: us.filter((u) => u.state === "free").reduce((s, u) => s + u.seats, 0) };
  };

  const setState = (u: SeatUnit, state: ManualState | null) =>
    FloorPlanRepository.setManual(date, u.key, state ? { state, at: Date.now() } : null).catch((error) => {
      console.error("Erro ao mudar o estado da mesa:", error);
      addAlert("Não foi possível salvar. Confira a internet e tente de novo.");
    });

  const c = status.counts;
  return (
    <div
      className="fp-quick-in fixed inset-0 z-[90] flex items-stretch justify-center bg-[#0b0907]/45 p-2 backdrop-blur-md sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mesas do dia"
    >
      <style>{`
        @keyframes fpQuickIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fpQuickPanel { from { opacity: 0; transform: translateY(10px) scale(0.985); } to { opacity: 1; transform: none; } }
        .fp-quick-in { animation: fpQuickIn 200ms ease-out both; }
        .fp-quick-panel { animation: fpQuickPanel 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) { .fp-quick-in, .fp-quick-panel { animation: none; } }
      `}</style>
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="fp-quick-panel flex w-full max-w-7xl flex-col gap-3 overflow-hidden rounded-2xl border border-primary-gold/25 bg-primary-black/55 p-3 shadow-card outline-none backdrop-blur-sm sm:p-4"
      >
        {/* Cabeçalho */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="order-1 min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
            <h2 className="text-base font-bold text-primary-gold">Mesas · {date === today ? "hoje" : WEEKDAYS[weekdayOf(date)]}, {formatDateBR(date)}</h2>
            <p className="text-[11px] text-primary-gold/60">
              {loadingReserves ? "Carregando reservas…" : `${c.free} livres · ${c.reserved} reservadas · ${c.occupied} ocupadas${c.blocked ? ` · ${c.blocked} fechadas` : ""} · ${c.seatsFree} de ${c.seatsTotal} lugares livres`}
            </p>
          </div>
          {date === today && (
            <div role="group" aria-label="Horário" className="order-3 inline-flex rounded-xl border border-primary-gold/20 bg-primary-black/60 p-0.5 sm:order-2">
              {(
                [
                  { id: "day", label: "Dia todo" },
                  { id: "now", label: `Agora (${formatMinutes(now)})` },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={scope === o.id}
                  onClick={() => setScope(o.id)}
                  className={`rounded-[10px] px-2.5 py-1 text-[11px] font-semibold ${scope === o.id ? "bg-primary-gold text-primary-black" : "text-primary-gold/65 hover:text-primary-gold"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <Link
            href={`/mapa?data=${date}`}
            className="order-3 flex items-center gap-1.5 rounded-lg border border-primary-gold/45 bg-primary-gold/10 px-3 py-1.5 text-xs font-semibold text-primary-gold transition-colors hover:bg-primary-gold/20"
          >
            Abrir o mapa completo <LuArrowUpRight size={14} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar (Esc)"
            className="order-2 flex h-9 w-9 shrink-0 items-center sm:order-4 justify-center rounded-lg border border-primary-gold/25 text-primary-gold/75 transition-colors hover:border-primary-gold/60 hover:text-primary-gold"
          >
            <LuX size={17} />
          </button>
        </header>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-primary-gold/70">
          {(["free", "reserved", "occupied", "blocked"] as TableState[]).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATE_META[s].color }} /> {STATE_META[s].label}
            </span>
          ))}
          <span className="text-primary-gold/45">· toque numa mesa para mudar o estado</span>
        </div>

        {/* Os dois andares */}
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto lg:auto-rows-fr lg:grid-cols-2 lg:overflow-hidden">
          {!plan ? (
            <div className="flex h-64 items-center justify-center text-sm text-primary-gold/60 lg:col-span-2">Carregando a planta…</div>
          ) : (
            levels.map((l) => {
              const f = freeOn(l.id);
              return (
                <section key={l.id} className="flex flex-col gap-1.5 lg:min-h-0">
                  <h3 className="flex items-baseline justify-between gap-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-primary-gold/75">
                    {l.name}
                    <span className="text-[11px] font-semibold normal-case tracking-normal text-emerald-300/90">
                      {f.free} de {f.total} livres · {f.seats} lugares
                    </span>
                  </h3>
                  <div className="h-[46dvh] min-h-[280px] lg:h-auto lg:min-h-0 lg:flex-1">
                    <PlanCanvas
                      elements={layout.elements}
                      level={l.id}
                      mode="day"
                      selected={selectedSet}
                      tableStates={tableStates}
                      tableBadges={badges}
                      groups={groups}
                      isInteractive={(el) => el.kind === "table"}
                      fitKey={`quick|${l.id}|${!!plan}`}
                      onTap={(id) => setSel(id ? status.unitOfTable.get(id)?.key ?? null : null)}
                      onMoveStart={() => false}
                      onMove={() => {}}
                      onMoveEnd={() => {}}
                    />
                  </div>
                </section>
              );
            })
          )}
        </div>

        {unit && <QuickUnitBar unit={unit} onSet={(s) => void setState(unit, s)} onClose={() => setSel(null)} />}
      </div>
    </div>
  );
}
