"use client";

import React, { useState } from "react";
import {
  LuArrowLeftRight,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuCombine,
  LuCopy,
  LuEyeOff,
  LuHand,
  LuLayoutTemplate,
  LuMapPin,
  LuMove,
  LuPrinter,
  LuRefreshCw,
  LuRotateCcw,
  LuRotateCw,
  LuSparkles,
  LuSplit,
  LuTrash2,
  LuTriangleAlert,
  LuUndo2,
  LuUserCheck,
  LuUserX,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { addDays, formatDateBR, todaySP, weekdayOf } from "@/rental/dates";
import { tableTitle } from "@/floorplan/catalog";
import { formatMinutes, minutesOf, STATE_META, type DayStatus, type SeatUnit, type TableSuggestion } from "@/floorplan/day";
import type { DayTemplate, ManualState, MapReserve, MapSettings, PlanElement, TableState, Walkin } from "@/floorplan/types";
import { since, WalkinForm } from "./quickUnitBar";
import { people, unitTitle } from "./labels";
import { Btn, Section, TextField } from "./ui";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export type DayTool = { kind: "select" } | { kind: "join"; tables: string[] } | { kind: "assign"; reserve: MapReserve };

/** O que o mapa mostra: o dia todo, agora, ou um horário (minutos). */
export type TimeScope = "day" | "now" | number;

export interface DayActions {
  setManual: (unit: SeatUnit, state: ManualState | null) => void;
  /** Cliente sem reserva senta na mesa (nome opcional). */
  seatWalkin: (unit: SeatUnit, name: string, people: number) => void;
  /** Quem estava sem reserva foi embora. */
  release: (unit: SeatUnit) => void;
  renameTable: (tableId: string, name: string) => void;
  renameGroup: (unit: SeatUnit, name: string) => void;
  hideTable: (tableId: string) => void;
  unhideTable: (tableId: string) => void;
  resetPose: (tableId: string) => void;
  rotateTable: (tableId: string, delta: number) => void;
  split: (unit: SeatUnit) => void;
  assign: (reserve: MapReserve, unit: SeatUnit) => void;
  /** Grava o campo "mesa" com o texto da sugestão ("8, 9"). */
  assignName: (reserve: MapReserve, reserveName: string) => void;
  unassign: (reserve: MapReserve) => void;
  setArrived: (reserve: MapReserve, arrived: boolean) => void;
  resetDay: () => void;
  copyFrom: (date: string) => void;
  applyTemplate: (t: DayTemplate) => void;
  saveTemplate: (name: string) => void;
  deleteTemplate: (t: DayTemplate) => void;
}

export { people, unitTitle } from "./labels";

function StatePill({ state }: { state: TableState }) {
  const m = STATE_META[state];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: m.color, color: m.ink }}>
      {m.label}
    </span>
  );
}

const STAYS = [90, 120, 150, 180, 210, 240, 300, 720];
const stayLabel = (m: number) => (m >= 720 ? "a noite toda" : m % 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m / 60}h`);

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
  settings,
  setSettings,
  syncOn,
  syncSince,
  setSync,
  scope,
  setScope,
  nowMinutes,
  reservationTimes,
  suggestionsFor,
  templates,
  onPrint,
  actions,
  dayWalkins,
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
  settings: MapSettings;
  setSettings: (patch: Partial<MapSettings>) => void;
  /** A sincronização vale no dia aberto. */
  syncOn: boolean;
  /** Desde quando vale assim (null = padrão, nunca mudou). */
  syncSince: string | null;
  setSync: (on: boolean) => void;
  scope: TimeScope;
  setScope: (s: TimeScope) => void;
  nowMinutes: number;
  reservationTimes: string[];
  suggestionsFor: (r: MapReserve) => TableSuggestion[];
  templates: DayTemplate[];
  onPrint: () => void;
  actions: DayActions;
  /** Clientes sem reserva do dia (para o histórico da mesa). */
  dayWalkins?: Record<string, Walkin>;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const today = todaySP();
  const c = status.counts;
  const allReserves = [
    ...new Map(
      [...status.units.flatMap((u) => u.dayReservations), ...status.unassigned, ...status.unmatched.map((m) => m.reserve)].map((r) => [r.id, r]),
    ).values(),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const totalPeople = allReserves.reduce((s, r) => s + people(r), 0);
  const unitOfReserve = (r: MapReserve) => status.units.filter((u) => u.dayReservations.some((x) => x.id === r.id));
  const scopeOptions: { id: TimeScope; label: string }[] = [
    { id: "day", label: "Dia todo" },
    ...(date === today ? [{ id: "now" as TimeScope, label: `Agora (${formatMinutes(nowMinutes)})` }] : []),
    ...reservationTimes
      .map((t) => ({ id: minutesOf(t), label: t }))
      .filter((o): o is { id: number; label: string } => o.id !== null),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Dia e horário */}
      <Section
        title="Dia"
        aside={
          <Btn tone="ghost" onClick={onPrint} title="Imprimir o mapa e a lista do dia">
            <LuPrinter size={14} /> Imprimir
          </Btn>
        }
      >
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

        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">
            <LuClock size={11} /> Horário
          </span>
          <div className="flex flex-wrap gap-1">
            {scopeOptions.map((o) => (
              <button
                key={String(o.id)}
                type="button"
                aria-pressed={scope === o.id}
                onClick={() => setScope(o.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  scope === o.id ? "bg-primary-gold text-primary-black" : "border border-primary-gold/20 text-primary-gold/65 hover:text-primary-gold"
                }`}
              >
                {o.label}
              </button>
            ))}
            <input
              type="time"
              aria-label="Outro horário"
              value={typeof scope === "number" ? formatMinutes(scope) : ""}
              onChange={(e) => {
                const m = minutesOf(e.target.value);
                if (m !== null) setScope(m);
              }}
              className="rounded-full border border-primary-gold/20 bg-primary-black/70 px-2 py-0.5 text-[11px] text-primary-gold outline-none [color-scheme:dark] focus:border-primary-gold/60"
            />
          </div>
          {scope !== "day" && (
            <span className="text-[11px] leading-snug text-primary-gold/50">
              Conta cada reserva da chegada até {stayLabel(settings.stayMinutes)} depois. A etiqueta embaixo da mesa mostra a próxima
              reserva.
            </span>
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
          {loadingReserves ? "carregando reservas…" : `${allReserves.length} ${allReserves.length === 1 ? "reserva" : "reservas"} no dia (${totalPeople} pessoas)`}
          {c.walkinPeople ? ` · ${c.walkinPeople} sem reserva agora` : ""}
        </p>
      </Section>

      {/* Sincronização */}
      <Section
        title="Reservas e mesas"
        collapse={{ id: "day-sync", defaultOpen: false }}
        summary={`${syncOn ? "sincronizando com as reservas" : "sincronização desligada"} · ${stayLabel(settings.stayMinutes)}`}
      >
        <label className="flex items-start justify-between gap-3 text-xs text-primary-gold/80">
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-semibold text-primary-gold">
              <LuRefreshCw size={13} /> Sincronizar com o campo &quot;mesa&quot;
            </span>
            <span className="text-[11px] leading-snug text-primary-gold/50">
              Ligado, as mesas seguem o que está escrito em cada reserva: &quot;8, 9&quot; aparece como a 8 e a 9 juntas e &quot;salas&quot;
              junta as mesas das salas (24 e 42).
            </span>
          </span>
          <input
            type="checkbox"
            checked={syncOn}
            disabled={date < today}
            onChange={(e) => setSync(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#e6c56b] disabled:opacity-50"
            aria-label="Sincronizar mesas com as reservas"
          />
        </label>
        <span className="-mt-1 text-[11px] leading-snug text-primary-gold/45">
          {date < today
            ? `Num dia que já passou vale o que estava configurado na época (${syncOn ? "ligada" : "desligada"}). Para mudar, abra hoje.`
            : `${syncOn ? "Ligada" : "Desligada"} ${syncSince ? `desde ${formatDateBR(syncSince, true)}` : "(padrão)"}. Mudar aqui vale a partir de hoje; os dias anteriores ficam como estavam.`}
        </span>
        <label className="flex items-center justify-between gap-2 text-xs text-primary-gold/75">
          Uma reserva costuma ficar
          <select
            value={settings.stayMinutes}
            onChange={(e) => setSettings({ stayMinutes: Number(e.target.value) })}
            className="rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1 text-xs text-primary-gold outline-none focus:border-primary-gold/60"
          >
            {[...new Set([...STAYS, settings.stayMinutes])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m} className="bg-primary-black">
                  {stayLabel(m)}
                </option>
              ))}
          </select>
        </label>
        <span className="-mt-1 text-[11px] text-primary-gold/45">Usado para ver por horário, achar conflitos e sugerir mesas. Vale para todo mundo.</span>
      </Section>

      {/* Ferramentas */}
      <div className="flex flex-wrap gap-1.5">
        <Btn
          active={tool.kind === "join"}
          onClick={() => setTool(tool.kind === "join" ? { kind: "select" } : { kind: "join", tables: selected && !selected.isAuto ? selected.tableIds : [] })}
          title="Juntar mesas à mão (ex.: cliente sem reserva)"
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
          Voltar todas as mesas deste dia para a planta? Posições, nomes, mesas retiradas e mesas juntadas à mão voltam ao normal. As
          reservas e os estados marcados continuam.
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
            {tool.tables.length ? `Escolhidas: ${tool.tables.map(baseNameOf).join(", ")}` : "Nenhuma mesa escolhida ainda."} Elas passam a
            valer como uma mesa só neste dia (mesmo estado e as mesmas reservas).
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
            {tool.reserve.time} · {people(tool.reserve)} {people(tool.reserve) === 1 ? "pessoa" : "pessoas"}. A mesa escolhida é gravada no
            campo &quot;mesa&quot; da reserva (aparece em Reservas também).
          </span>
          <Suggestions
            list={suggestionsFor(tool.reserve)}
            onPick={(s) => {
              actions.assignName(tool.reserve, s.reserveName);
              setTool({ kind: "select" });
            }}
          />
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
          scoped={scope !== "day"}
          onClose={() => onSelect(null)}
          actions={actions}
          history={Object.entries(dayWalkins ?? {})
            .filter(([, w]) => w.leftAt !== undefined && w.tables.some((t) => selected.tableIds.includes(t)))
            .map(([id, w]) => ({ ...w, id }))
            .sort((a, b) => b.at - a.at)}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-primary-gold/20 px-3 py-4 text-center text-xs text-primary-gold/55">
          Toque numa mesa no mapa para ver as reservas, mudar o estado, renomear ou juntar.
        </p>
      )}

      {/* Conflitos */}
      {status.conflicts.length > 0 && (
        <Section title="Conflitos de mesa">
          <ul className="flex flex-col gap-1.5">
            {status.conflicts.map((cf) => {
              const unit = status.unitOfTable.get(cf.tableId);
              return (
                <li key={`${cf.a.id}-${cf.b.id}`} className="flex items-start gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] px-2 py-1.5 text-xs text-amber-100/90">
                  <LuTriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1">
                    <button type="button" className="font-semibold text-amber-200 underline-offset-2 hover:underline" onClick={() => unit && onSelect(unit.key)}>
                      {tableTitle(baseNameOf(cf.tableId))}
                    </button>{" "}
                    tem {cf.a.name || "uma reserva"} ({cf.a.time}) e {cf.b.name || "outra"} ({cf.b.time}) ao mesmo tempo.
                  </span>
                  <Btn onClick={() => setTool({ kind: "assign", reserve: cf.b })} title="Escolher outra mesa para a segunda reserva">
                    Trocar
                  </Btn>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Sem mesa e avisos */}
      {(status.unassigned.length > 0 || status.unmatched.length > 0) && (
        <Section title="Precisa de mesa">
          <ul className="flex flex-col gap-1.5">
            {status.unassigned.map((r) => (
              <ReserveRow
                key={r.id}
                r={r}
                note="Sem mesa"
                suggestions={suggestionsFor(r)}
                onSuggest={(s) => actions.assignName(r, s.reserveName)}
                onPlace={() => setTool({ kind: "assign", reserve: r })}
              />
            ))}
            {status.unmatched.map(({ reserve, missing }) => (
              <ReserveRow
                key={reserve.id}
                r={reserve}
                warn
                note={`"${reserve.table}": ${missing.map((m) => (/^\d/.test(m) ? `mesa ${m}` : m)).join(", ")} não ${missing.length === 1 ? "está" : "estão"} no mapa`}
                suggestions={suggestionsFor(reserve)}
                onSuggest={(s) => actions.assignName(reserve, s.reserveName)}
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
        <Section title={`Reservas do dia (${allReserves.length})`} collapse={{ id: "day-list", defaultOpen: true }} summary={`${totalPeople} pessoas`}>
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
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        units.length ? "bg-primary-gold/15 text-primary-gold" : "bg-invalid-color/15 text-invalid-color"
                      }`}
                    >
                      {units.length ? units.map((u) => u.reserveName).join(" + ") : r.table || "sem mesa"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <ArrangementSection date={date} templates={templates} hasLayoutChanges={hasLayoutChanges} actions={actions} />
    </div>
  );
}

/** Sugestões em grade: cada uma é um botão de duas linhas (mesa e lugares) que se ajusta à largura. */
function Suggestions({ list, onPick }: { list: TableSuggestion[]; onPick: (s: TableSuggestion) => void }) {
  if (!list.length) return <span className="text-[11px] text-primary-gold/45">Nenhuma mesa livre comporta o grupo nesse horário.</span>;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">
        <LuSparkles size={11} /> Sugestões
      </span>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
        {list.map((s) => (
          <button
            key={s.reserveName}
            type="button"
            onClick={() => onPick(s)}
            title={s.join ? "Juntar as duas mesas para esta reserva" : "Usar esta mesa"}
            className="flex min-w-0 flex-col items-center rounded-lg border border-primary-gold/25 bg-primary-gold/[0.06] px-1.5 py-1.5 text-center transition-colors hover:border-primary-gold/60 hover:bg-primary-gold/[0.12]"
          >
            <span className="w-full truncate text-xs font-bold text-primary-gold">
              {s.tableIds.length > 1 ? `Mesas ${s.reserveName}` : tableTitle(s.reserveName)}
            </span>
            <span className="text-[10px] text-primary-gold/55">
              {s.seats} lugares{s.join ? " · juntar" : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReserveRow({
  r,
  note,
  warn,
  suggestions,
  onSuggest,
  onPlace,
}: {
  r: MapReserve;
  note: string;
  warn?: boolean;
  suggestions: TableSuggestion[];
  onSuggest: (s: TableSuggestion) => void;
  onPlace: () => void;
}) {
  return (
    <li className="flex flex-col gap-2.5 rounded-xl border border-primary-gold/10 bg-primary-black/40 p-2.5 text-xs">
      <div className="flex items-start gap-2.5">
        <span className="flex shrink-0 flex-col items-center rounded-lg bg-primary-gold/10 px-1.5 py-1 leading-none">
          <span className="text-[13px] font-extrabold tabular-nums text-primary-gold">{r.time}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="break-words font-semibold leading-snug text-primary-gold/90">{r.name || "Sem nome"}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-primary-gold/55">
            <span className="inline-flex items-center gap-1">
              <LuUsers size={11} /> {people(r)} {people(r) === 1 ? "pessoa" : "pessoas"}
            </span>
            <span aria-hidden="true">·</span>
            <span className={`inline-flex min-w-0 items-center gap-1 ${warn ? "text-amber-200/85" : ""}`}>
              {warn && <LuTriangleAlert size={11} className="shrink-0 text-amber-300" />}
              <span className="break-words">{note}</span>
            </span>
          </span>
        </div>
      </div>
      <Suggestions list={suggestions.slice(0, 3)} onPick={onSuggest} />
      <button
        type="button"
        onClick={onPlace}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary-gold/25 py-1.5 text-[11px] font-semibold text-primary-gold/70 transition-colors hover:border-primary-gold/60 hover:text-primary-gold"
      >
        <LuMapPin size={13} /> {suggestions.length ? "Escolher outra no mapa" : "Escolher no mapa"}
      </button>
    </li>
  );
}

function ArrangementSection({
  date,
  templates,
  hasLayoutChanges,
  actions,
}: {
  date: string;
  templates: DayTemplate[];
  hasLayoutChanges: boolean;
  actions: DayActions;
}) {
  const [from, setFrom] = useState(addDays(date, -7));
  const [name, setName] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  return (
    <Section
      title="Arrumação do dia"
      collapse={{ id: "day-arr", defaultOpen: false }}
      summary={templates.length ? `${templates.length} ${templates.length === 1 ? "modelo" : "modelos"}` : "copiar de outro dia ou usar modelo"}
    >
      <span className="text-[11px] leading-snug text-primary-gold/50">
        Posições, nomes, mesas retiradas e mesas juntadas à mão. Copiar ou aplicar troca a arrumação deste dia (as reservas e os estados
        continuam).
      </span>
      <div className="flex items-end gap-1.5">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Copiar de outro dia</span>
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-xs text-primary-gold outline-none [color-scheme:dark] focus:border-primary-gold/60"
          />
        </label>
        <Btn disabled={from === date} onClick={() => actions.copyFrom(from)} title={`Copiar a arrumação de ${formatDateBR(from, true)}`}>
          <LuCopy size={13} /> Copiar
        </Btn>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">
          <LuLayoutTemplate size={11} /> Modelos
        </span>
        {templates.length === 0 && <span className="text-[11px] text-primary-gold/45">Nenhum modelo ainda. Arrume as mesas e salve aqui.</span>}
        <ul className="flex flex-col gap-1">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-1.5 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1 text-xs">
              <span className="min-w-0 flex-1 truncate font-semibold text-primary-gold/85">{t.name}</span>
              {confirmDel === t.id ? (
                <>
                  <Btn tone="ghost" onClick={() => setConfirmDel(null)}>
                    Não
                  </Btn>
                  <Btn
                    tone="danger"
                    onClick={() => {
                      setConfirmDel(null);
                      actions.deleteTemplate(t);
                    }}
                  >
                    Excluir
                  </Btn>
                </>
              ) : (
                <>
                  <Btn onClick={() => actions.applyTemplate(t)}>Aplicar</Btn>
                  <Btn tone="ghost" title={`Excluir o modelo ${t.name}`} onClick={() => setConfirmDel(t.id)}>
                    <LuTrash2 size={13} />
                  </Btn>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-end gap-1.5">
          <div className="flex-1">
            <TextField label="Salvar a arrumação deste dia como" value={name} placeholder="Ex.: Noite de evento" onCommit={setName} />
          </div>
          <Btn
            disabled={!name.trim() || !hasLayoutChanges}
            title={hasLayoutChanges ? "Salvar como modelo" : "Mude alguma mesa neste dia para salvar um modelo"}
            onClick={() => {
              actions.saveTemplate(name.trim());
              setName("");
            }}
          >
            Salvar
          </Btn>
        </div>
      </div>
    </Section>
  );
}

function UnitCard({
  unit,
  levelName,
  moved,
  baseName,
  allReserves,
  unitOfReserve,
  scoped,
  onClose,
  actions,
  history,
}: {
  unit: SeatUnit;
  levelName: string;
  moved: boolean;
  baseName: string;
  allReserves: MapReserve[];
  unitOfReserve: (r: MapReserve) => SeatUnit[];
  scoped: boolean;
  onClose: () => void;
  actions: DayActions;
  /** Quem já passou sem reserva por esta mesa no dia. */
  history: (Walkin & { id: string })[];
}) {
  const [seating, setSeating] = useState(false);
  const choices: { id: ManualState | "auto"; label: string }[] = [
    { id: "auto", label: `Automático (${STATE_META[unit.auto].label.toLowerCase()})` },
    { id: "free", label: "Livre" },
    { id: "occupied", label: "Ocupada" },
    { id: "blocked", label: "Indisponível" },
  ];
  const current = unit.manual?.state ?? "auto";
  const others = allReserves.filter((r) => !unit.dayReservations.some((x) => x.id === r.id));
  const tableId = unit.tableIds[0];
  const list = scoped ? unit.reservations : unit.dayReservations;
  const autoField = unit.reservations[0]?.table ?? unit.dayReservations[0]?.table;

  return (
    <section id="fp-unit-card" className="flex scroll-mt-3 flex-col gap-3 rounded-2xl border border-primary-gold/35 bg-secondary-black/60 p-3">
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

      {unit.isAuto && (
        <p className="flex items-start gap-1.5 rounded-lg border border-primary-gold/15 bg-primary-gold/[0.05] px-2 py-1.5 text-[11px] leading-snug text-primary-gold/70">
          <LuRefreshCw size={12} className="mt-0.5 shrink-0" />
          Juntadas pela reserva (campo mesa &quot;{autoField}&quot;). Para separar, mude a mesa na reserva ou desligue a sincronização.
        </p>
      )}

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
              {ch.id !== "auto" && <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: STATE_META[ch.id].color }} />}
              {ch.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] leading-snug text-primary-gold/45">
          No automático, a mesa fica reservada quando tem reserva e ocupada quando a reserva chega. A marcação à mão vale o dia todo.
          {unit.manual ? ` Marcado às ${new Date(unit.manual.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` : ""}
        </span>
      </div>

      {/* Cliente sem reserva (opcional) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Cliente sem reserva</span>
        {unit.walkins.map((w) => (
          <div key={w.id} className="flex items-center gap-2 rounded-lg border border-[#f0716b]/35 bg-[#f0716b]/10 px-2 py-1.5 text-xs">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-primary-gold/90">{w.name || "Cliente"}</span>
              <span className="block text-[11px] text-primary-gold/60">
                {w.people} {w.people === 1 ? "pessoa" : "pessoas"} · chegou {new Date(w.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ({since(w.at)})
              </span>
            </span>
          </div>
        ))}
        {unit.walkins.length > 0 && (
          <Btn onClick={() => actions.release(unit)} className="self-start" title="O cliente foi embora: a mesa fica livre">
            Liberar a mesa
          </Btn>
        )}
        {seating ? (
          <WalkinForm
            seats={unit.seats}
            onCancel={() => setSeating(false)}
            onSeat={(name, n) => {
              actions.seatWalkin(unit, name, n);
              setSeating(false);
            }}
          />
        ) : (
          <button type="button" onClick={() => setSeating(true)} className="self-start text-[11px] font-semibold text-primary-gold/65 underline-offset-2 hover:text-primary-gold hover:underline">
            + Sentar um cliente sem reserva {unit.walkins.length ? "(mais um grupo)" : "(nome e pessoas, opcional)"}
          </button>
        )}
        {history.length > 0 && (
          <span className="text-[11px] leading-snug text-primary-gold/45">
            Já passaram hoje:{" "}
            {history
              .map(
                (w) =>
                  `${w.name || "cliente"} (${w.people}p, ${new Date(w.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}–${new Date(w.leftAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`,
              )
              .join(" · ")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">
          {scoped ? "Reservas neste horário" : "Reservas nesta mesa"}
        </span>
        {list.length === 0 && <span className="text-xs text-primary-gold/50">{scoped ? "Nenhuma neste horário." : "Nenhuma reserva neste dia."}</span>}
        <ul className="flex flex-col gap-1.5">
          {list.map((r) => {
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
        {scoped && unit.upcoming.length > 0 && (
          <span className="text-[11px] text-primary-gold/60">
            Depois: {unit.upcoming.map((r) => `${r.time} ${r.name.split(" ")[0] || "reserva"} (${people(r)}p)`).join(" · ")}
          </span>
        )}
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

      {!unit.isAuto && (
        <div className="flex flex-col gap-2 border-t border-primary-gold/10 pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Só neste dia</span>
          {unit.isGroup ? (
            <>
              <TextField label="Nome do grupo" value={unit.name === unit.reserveName ? "" : unit.name} placeholder={unit.reserveName} onCommit={(v) => actions.renameGroup(unit, v)} />
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
      )}
    </section>
  );
}
