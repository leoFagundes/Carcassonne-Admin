"use client";

import React, { useState } from "react";
import {
  LuArrowLeftRight,
  LuChevronLeft,
  LuChevronRight,
  LuCombine,
  LuEyeOff,
  LuHand,
  LuMove,
  LuRotateCcw,
  LuRotateCw,
  LuSplit,
  LuTriangleAlert,
  LuUndo2,
  LuUserCheck,
  LuUserX,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { addDays, todaySP, weekdayOf } from "@/rental/dates";
import { tableTitle } from "@/floorplan/catalog";
import { STATE_META, type DayStatus, type SeatUnit } from "@/floorplan/day";
import type { ManualState, MapReserve, PlanElement, TableState } from "@/floorplan/types";
import { Btn, Section, TextField } from "./ui";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export type DayTool = { kind: "select" } | { kind: "join"; tables: string[] } | { kind: "assign"; reserve: MapReserve };

export interface DayActions {
  setManual: (unit: SeatUnit, state: ManualState | null) => void;
  renameTable: (tableId: string, name: string) => void;
  renameGroup: (unit: SeatUnit, name: string) => void;
  hideTable: (tableId: string) => void;
  unhideTable: (tableId: string) => void;
  resetPose: (tableId: string) => void;
  rotateTable: (tableId: string, delta: number) => void;
  split: (unit: SeatUnit) => void;
  assign: (reserve: MapReserve, unit: SeatUnit) => void;
  unassign: (reserve: MapReserve) => void;
  setArrived: (reserve: MapReserve, arrived: boolean) => void;
  resetDay: () => void;
}

export function unitTitle(u: SeatUnit): string {
  if (u.isGroup) return u.name === u.reserveName ? `Mesas ${u.reserveName}` : `${u.name} (mesas ${u.reserveName})`;
  return tableTitle(u.name);
}

export function people(r: MapReserve): number {
  return (r.adults || 0) + (r.childs || 0);
}

function StatePill({ state }: { state: TableState }) {
  const m = STATE_META[state];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: m.color, color: m.ink }}>
      {m.label}
    </span>
  );
}

export default function DayPanel({
  date,
  setDate,
  status,
  selected,
  onSelect,
  tool,
  setTool,
  onConfirmJoin,
  moveTables,
  setMoveTables,
  hasLayoutChanges,
  hiddenTables,
  movedTables,
  baseNameOf,
  levelName,
  loadingReserves,
  actions,
}: {
  date: string;
  setDate: (d: string) => void;
  status: DayStatus;
  selected: SeatUnit | null;
  onSelect: (key: string | null) => void;
  tool: DayTool;
  setTool: (t: DayTool) => void;
  onConfirmJoin: () => void;
  moveTables: boolean;
  setMoveTables: (v: boolean) => void;
  hasLayoutChanges: boolean;
  hiddenTables: PlanElement[];
  movedTables: ReadonlySet<string>;
  baseNameOf: (tableId: string) => string;
  levelName: (id: string) => string;
  loadingReserves: boolean;
  actions: DayActions;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const today = todaySP();
  const c = status.counts;
  const confirmed = status.units.flatMap((u) => u.reservations);
  const allReserves = [
    ...new Map([...confirmed, ...status.unassigned, ...status.unmatched.map((m) => m.reserve)].map((r) => [r.id, r])).values(),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const totalPeople = allReserves.reduce((s, r) => s + people(r), 0);
  const unitOfReserve = (r: MapReserve) => status.units.filter((u) => u.reservations.some((x) => x.id === r.id));

  return (
    <div className="flex flex-col gap-3">
      {/* Dia */}
      <Section title="Dia">
        <div className="flex items-center gap-1.5">
          <Btn tone="ghost" title="Dia anterior" onClick={() => setDate(addDays(date, -1))}>
            <LuChevronLeft size={16} />
          </Btn>
          <label className="flex min-w-0 flex-1 flex-col items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-center text-sm font-semibold text-primary-gold outline-none [color-scheme:dark] focus:border-primary-gold/60"
              aria-label="Escolher o dia"
            />
            <span className="mt-1 text-[11px] text-primary-gold/55">
              {date === today ? "Hoje · " : ""}
              {WEEKDAYS[weekdayOf(date)]}
            </span>
          </label>
          <Btn tone="ghost" title="Próximo dia" onClick={() => setDate(addDays(date, 1))}>
            <LuChevronRight size={16} />
          </Btn>
          {date !== today && (
            <Btn onClick={() => setDate(today)} title="Voltar para hoje">
              Hoje
            </Btn>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(["free", "reserved", "occupied", "blocked"] as TableState[]).map((s) => (
            <div key={s} className="flex flex-col items-center rounded-xl border border-primary-gold/10 bg-primary-black/40 px-1 py-1.5">
              <span className="text-lg font-extrabold leading-none" style={{ color: STATE_META[s].color }}>
                {c[s]}
              </span>
              <span className="mt-1 text-[10px] text-primary-gold/60">{STATE_META[s].label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-primary-gold/65">
          <strong className="text-primary-gold">{c.seatsFree}</strong> de {c.seatsTotal} lugares livres ·{" "}
          {loadingReserves ? "carregando reservas…" : `${allReserves.length} ${allReserves.length === 1 ? "reserva" : "reservas"} (${totalPeople} pessoas)`}
        </p>
      </Section>

      {/* Ferramentas */}
      <div className="flex flex-wrap gap-1.5">
        <Btn
          active={tool.kind === "join"}
          onClick={() => setTool(tool.kind === "join" ? { kind: "select" } : { kind: "join", tables: selected?.tableIds ?? [] })}
          title="Juntar mesas"
        >
          <LuCombine size={14} /> Juntar mesas
        </Btn>
        <Btn active={moveTables} onClick={() => setMoveTables(!moveTables)} title="Arrastar mesas no mapa (só neste dia)">
          <LuMove size={14} /> Mover mesas
        </Btn>
        {hasLayoutChanges && (
          <Btn tone="ghost" onClick={() => setConfirmReset(true)} title="Voltar as mesas para a planta">
            <LuUndo2 size={14} /> Desfazer mudanças do dia
          </Btn>
        )}
      </div>
      {confirmReset && (
        <div className="flex flex-col gap-2 rounded-xl border border-invalid-color/30 bg-invalid-color/[0.06] p-3 text-xs text-primary-gold/80">
          Voltar todas as mesas deste dia para a planta? Posições, nomes, mesas retiradas e mesas juntadas voltam ao normal.
          As reservas e os estados marcados continuam.
          <div className="flex justify-end gap-1.5">
            <Btn tone="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Btn>
            <Btn
              tone="danger"
              onClick={() => {
                setConfirmReset(false);
                actions.resetDay();
              }}
            >
              Desfazer
            </Btn>
          </div>
        </div>
      )}

      {tool.kind === "join" && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/40 bg-primary-gold/[0.07] p-3 text-xs text-primary-gold/85">
          <span className="flex items-center gap-1.5 font-semibold text-primary-gold">
            <LuHand size={14} /> Toque nas mesas que vão ficar juntas
          </span>
          <span>
            {tool.tables.length
              ? `Escolhidas: ${tool.tables.map(baseNameOf).join(", ")}`
              : "Nenhuma mesa escolhida ainda."}{" "}
            Elas passam a valer como uma mesa só neste dia (mesmo estado e as mesmas reservas).
          </span>
          <div className="flex justify-end gap-1.5">
            <Btn tone="ghost" onClick={() => setTool({ kind: "select" })}>
              Cancelar
            </Btn>
            <Btn tone="primary" disabled={tool.tables.length < 2} onClick={onConfirmJoin}>
              Juntar {tool.tables.length >= 2 ? tool.tables.length : ""} mesas
            </Btn>
          </div>
        </div>
      )}
      {tool.kind === "assign" && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/40 bg-primary-gold/[0.07] p-3 text-xs text-primary-gold/85">
          <span className="flex items-center gap-1.5 font-semibold text-primary-gold">
            <LuHand size={14} /> Toque na mesa de {tool.reserve.name || "esta reserva"}
          </span>
          <span>
            {tool.reserve.time} · {people(tool.reserve)} {people(tool.reserve) === 1 ? "pessoa" : "pessoas"}. A mesa escolhida é gravada na reserva
            (aparece em Reservas também).
          </span>
          <div className="flex justify-end">
            <Btn tone="ghost" onClick={() => setTool({ kind: "select" })}>
              Cancelar
            </Btn>
          </div>
        </div>
      )}

      {/* Mesa escolhida */}
      {selected ? (
        <UnitCard
          unit={selected}
          levelName={levelName(selected.level)}
          moved={selected.tableIds.some((id) => movedTables.has(id))}
          baseName={selected.isGroup ? "" : baseNameOf(selected.tableIds[0])}
          allReserves={allReserves}
          unitOfReserve={unitOfReserve}
          onClose={() => onSelect(null)}
          actions={actions}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-primary-gold/20 px-3 py-4 text-center text-xs text-primary-gold/55">
          Toque numa mesa no mapa para ver as reservas, mudar o estado, renomear ou juntar.
        </p>
      )}

      {/* Sem mesa e avisos */}
      {(status.unassigned.length > 0 || status.unmatched.length > 0) && (
        <Section title="Precisa de mesa">
          <ul className="flex flex-col gap-1.5">
            {status.unassigned.map((r) => (
              <ReserveRow key={r.id} r={r} note="Sem mesa" onPlace={() => setTool({ kind: "assign", reserve: r })} />
            ))}
            {status.unmatched.map(({ reserve, missing }) => (
              <ReserveRow
                key={reserve.id}
                r={reserve}
                warn
                note={`"${reserve.table}": ${missing.map((m) => (/^\d/.test(m) ? `mesa ${m}` : m)).join(", ")} não ${missing.length === 1 ? "está" : "estão"} no mapa`}
                onPlace={() => setTool({ kind: "assign", reserve })}
              />
            ))}
          </ul>
        </Section>
      )}

      {hiddenTables.length > 0 && (
        <Section title="Retiradas neste dia">
          <ul className="flex flex-wrap gap-1.5">
            {hiddenTables.map((t) => (
              <li key={t.id}>
                <Btn onClick={() => actions.unhideTable(t.id)} title={`Devolver ${tableTitle(t.label ?? "")} ao mapa`}>
                  <LuUndo2 size={13} /> {tableTitle(t.label ?? "")}
                </Btn>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Todas as reservas do dia */}
      {allReserves.length > 0 && (
        <Section title={`Reservas do dia (${allReserves.length})`}>
          <ul className="flex flex-col divide-y divide-primary-gold/10">
            {allReserves.map((r) => {
              const units = unitOfReserve(r);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => (units[0] ? onSelect(units[0].key) : setTool({ kind: "assign", reserve: r }))}
                    className="flex w-full items-center gap-2 py-1.5 text-left text-xs transition-colors hover:text-primary-gold"
                  >
                    <span className="w-10 shrink-0 font-semibold text-primary-gold/85">{r.time}</span>
                    <span className="min-w-0 flex-1 truncate text-primary-gold/80">
                      {r.name || "Sem nome"} <span className="text-primary-gold/45">· {people(r)}p</span>
                    </span>
                    {r.isArrived && <LuUserCheck size={13} className="shrink-0 text-emerald-300" aria-label="Chegou" />}
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${units.length ? "bg-primary-gold/15 text-primary-gold" : "bg-invalid-color/15 text-invalid-color"}`}>
                      {units.length ? units.map((u) => u.reserveName).join(" + ") : r.table || "sem mesa"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}

function ReserveRow({ r, note, warn, onPlace }: { r: MapReserve; note: string; warn?: boolean; onPlace: () => void }) {
  return (
    <li className="flex items-center gap-2 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-xs">
      {warn ? <LuTriangleAlert size={14} className="shrink-0 text-amber-300" /> : <LuUsers size={14} className="shrink-0 text-primary-gold/50" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-primary-gold/90">
          {r.time} · {r.name || "Sem nome"} · {people(r)}p
        </span>
        <span className={`truncate text-[11px] ${warn ? "text-amber-200/80" : "text-primary-gold/50"}`}>{note}</span>
      </span>
      <Btn onClick={onPlace} title="Escolher a mesa no mapa">
        Escolher mesa
      </Btn>
    </li>
  );
}

function UnitCard({
  unit,
  levelName,
  moved,
  baseName,
  allReserves,
  unitOfReserve,
  onClose,
  actions,
}: {
  unit: SeatUnit;
  levelName: string;
  moved: boolean;
  baseName: string;
  allReserves: MapReserve[];
  unitOfReserve: (r: MapReserve) => SeatUnit[];
  onClose: () => void;
  actions: DayActions;
}) {
  const choices: { id: ManualState | "auto"; label: string }[] = [
    { id: "auto", label: `Automático (${STATE_META[unit.auto].label.toLowerCase()})` },
    { id: "free", label: "Livre" },
    { id: "occupied", label: "Ocupada" },
    { id: "blocked", label: "Indisponível" },
  ];
  const current = unit.manual?.state ?? "auto";
  const others = allReserves.filter((r) => !unit.reservations.some((x) => x.id === r.id));
  const tableId = unit.tableIds[0];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-primary-gold/35 bg-secondary-black/60 p-3">
      <header className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-base font-bold text-primary-gold">{unitTitle(unit)}</h3>
          <span className="flex flex-wrap items-center gap-2 text-[11px] text-primary-gold/60">
            <StatePill state={unit.state} />
            {unit.seats} lugares · {levelName}
            {!unit.isGroup && baseName && baseName !== unit.name && <span>(na planta: {tableTitle(baseName)})</span>}
          </span>
        </div>
        <Btn tone="ghost" title="Fechar" onClick={onClose}>
          <LuX size={15} />
        </Btn>
      </header>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Estado</span>
        <div className="grid grid-cols-2 gap-1.5">
          {choices.map((ch) => (
            <button
              key={ch.id}
              type="button"
              aria-pressed={current === ch.id}
              onClick={() => actions.setManual(unit, ch.id === "auto" ? null : ch.id)}
              className={`rounded-lg border px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                current === ch.id ? "border-primary-gold bg-primary-gold/15 text-primary-gold" : "border-primary-gold/15 text-primary-gold/65 hover:border-primary-gold/40"
              } ${ch.id === "auto" ? "col-span-2" : ""}`}
            >
              {ch.id !== "auto" && (
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: STATE_META[ch.id].color }} />
              )}
              {ch.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] leading-snug text-primary-gold/45">
          No automático, a mesa fica reservada quando tem reserva no dia e ocupada quando a reserva chega.
          {unit.manual ? ` Marcado à mão às ${new Date(unit.manual.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` : ""}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Reservas nesta mesa</span>
        {unit.reservations.length === 0 && <span className="text-xs text-primary-gold/50">Nenhuma reserva neste dia.</span>}
        <ul className="flex flex-col gap-1.5">
          {unit.reservations.map((r) => {
            const shared = unitOfReserve(r).length > 1;
            return (
              <li key={r.id} className="flex flex-col gap-1 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="font-bold text-primary-gold">{r.time}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-primary-gold/90">{r.name || "Sem nome"}</span>
                  <span className="shrink-0 text-primary-gold/55">
                    {r.adults} {r.adults === 1 ? "adulto" : "adultos"}
                    {r.childs ? ` + ${r.childs} ${r.childs === 1 ? "criança" : "crianças"}` : ""}
                  </span>
                </span>
                {(r.observation || shared) && (
                  <span className="text-[11px] text-primary-gold/55">
                    {shared && <>Mesa da reserva: {r.table}. </>}
                    {r.observation}
                  </span>
                )}
                <span className="flex flex-wrap gap-1.5">
                  <Btn active={r.isArrived} onClick={() => actions.setArrived(r, !r.isArrived)} title={r.isArrived ? "Desmarcar chegada" : "Marcar que chegou"}>
                    {r.isArrived ? <LuUserCheck size={13} /> : <LuUserX size={13} />} {r.isArrived ? "Chegou" : "Ainda não chegou"}
                  </Btn>
                  <Btn tone="ghost" onClick={() => actions.unassign(r)} title="Tirar a reserva desta mesa">
                    Tirar da mesa
                  </Btn>
                </span>
              </li>
            );
          })}
        </ul>
        {others.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const r = others.find((x) => x.id === e.target.value);
              if (r) actions.assign(r, unit);
            }}
            className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-xs text-primary-gold outline-none focus:border-primary-gold/60"
            aria-label="Colocar uma reserva nesta mesa"
          >
            <option value="">+ Colocar uma reserva nesta mesa…</option>
            {others.map((r) => {
              const at = unitOfReserve(r);
              return (
                <option key={r.id} value={r.id} className="bg-primary-black">
                  {r.time} · {r.name || "Sem nome"} · {people(r)}p · {at.length ? `hoje em ${at.map((u) => u.reserveName).join(" + ")}` : r.table ? `"${r.table}"` : "sem mesa"}
                </option>
              );
            })}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-primary-gold/10 pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Só neste dia</span>
        {unit.isGroup ? (
          <>
            <TextField
              label="Nome do grupo"
              value={unit.name === unit.reserveName ? "" : unit.name}
              placeholder={unit.reserveName}
              onCommit={(v) => actions.renameGroup(unit, v)}
            />
            <div className="flex flex-wrap gap-1.5">
              <Btn onClick={() => actions.split(unit)}>
                <LuSplit size={13} /> Separar as mesas
              </Btn>
            </div>
          </>
        ) : (
          <>
            <TextField label="Nome neste dia" value={unit.name === baseName ? "" : unit.name} placeholder={baseName} onCommit={(v) => actions.renameTable(tableId, v)} />
            <div className="flex flex-wrap gap-1.5">
              <Btn onClick={() => actions.rotateTable(tableId, -90)} title="Girar 90° para a esquerda">
                <LuRotateCcw size={13} />
              </Btn>
              <Btn onClick={() => actions.rotateTable(tableId, 90)} title="Girar 90° para a direita">
                <LuRotateCw size={13} />
              </Btn>
              {moved && (
                <Btn onClick={() => actions.resetPose(tableId)} title="Voltar para o lugar da planta">
                  <LuArrowLeftRight size={13} /> Voltar ao lugar
                </Btn>
              )}
              <Btn tone="ghost" onClick={() => actions.hideTable(tableId)} title="Tirar a mesa do mapa só neste dia">
                <LuEyeOff size={13} /> Retirar hoje
              </Btn>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
