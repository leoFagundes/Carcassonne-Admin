import { containsPoint, gapBetween, placeWithChildren, withDescendants } from "./geometry";
import type {
  DayPlan,
  FloorPlan,
  ManualMark,
  MapReserve,
  MapSettings,
  PlanElement,
  SyncChange,
  TableGroup,
  TableState,
} from "./types";

export function emptyDay(date: string): DayPlan {
  return { date, moves: {}, names: {}, hidden: {}, groups: {}, manual: {} };
}

export const DEFAULT_SETTINGS: MapSettings = { syncHistory: [], stayMinutes: 180 };

/** Sincronização ligada por padrão (antes de qualquer mudança). */
export const SYNC_DEFAULT = true;

/** A mudança que vale no dia (a última com início até ele), ou null se nunca mudou. */
export function syncChangeFor(history: SyncChange[], date: string): SyncChange | null {
  let found: SyncChange | null = null;
  for (const c of history ?? []) if (c.from <= date && (!found || c.from >= found.from)) found = c;
  return found;
}

/** A sincronização vale neste dia? */
export function syncEnabledOn(history: SyncChange[], date: string): boolean {
  return syncChangeFor(history, date)?.on ?? SYNC_DEFAULT;
}

/**
 * Liga/desliga a partir de `today`: os dias anteriores continuam como estavam
 * e qualquer mudança marcada para depois é substituída por esta.
 */
export function withSyncChange(history: SyncChange[], today: string, on: boolean): SyncChange[] {
  const before = (history ?? []).filter((c) => c.from < today).sort((a, b) => a.from.localeCompare(b.from));
  const prev = before.length ? before[before.length - 1].on : SYNC_DEFAULT;
  return prev === on ? before : [...before, { from: today, on }];
}

/** O dia tem alguma mudança de mesa (posição, nome, retirada ou junção)? */
export function dayHasLayoutChanges(day: Pick<DayPlan, "moves" | "names" | "hidden" | "groups">): boolean {
  return (
    Object.keys(day.moves).length > 0 ||
    Object.keys(day.names).length > 0 ||
    Object.keys(day.hidden).length > 0 ||
    Object.keys(day.groups).length > 0
  );
}

// ───────────────────────── nomes de mesa ─────────────────────────

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "Mesa 01" → "1"; "  Salas " → "salas". Para comparar nomes de mesa. */
export function normalizeTableName(raw: string): string {
  let s = stripAccents(raw).toLowerCase().trim();
  s = s.replace(/^mesas?\b\.?\s*/, "").replace(/\s+/g, " ").trim();
  if (/^0*\d+$/.test(s)) s = String(Number(s));
  return s;
}

/**
 * O campo "mesa" da reserva é texto livre: "5", "3/8", "2,7,12", "1 e 6",
 * "salas/12". Devolve os nomes normalizados, sem repetir.
 */
export function parseTableField(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const parts = stripAccents(raw)
    .toLowerCase()
    .split(/[/,;+&|]|\s+e\s+|\s+-\s+/)
    .map(normalizeTableName)
    .filter(Boolean);
  return [...new Set(parts)];
}

function numericFirst(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b, "pt-BR", { numeric: true });
}

/** Nomes das mesas no formato que a equipe usa no campo "mesa": "8, 9". */
export function joinTableNames(names: string[]): string {
  return [...names].sort(numericFirst).join(", ");
}

// ───────────────────────── horário ─────────────────────────

/** "19:30" → 1170 (minutos desde 0h). Hora inválida → null. */
export function minutesOf(time: string): number | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatMinutes(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** A reserva está na mesa no minuto `at`? (da chegada até chegada + permanência) */
export function activeAt(r: Pick<MapReserve, "time">, at: number, stayMinutes: number): boolean {
  const s = minutesOf(r.time);
  if (s === null) return true; // sem hora: vale o dia todo
  return at >= s && at < s + stayMinutes;
}

/** As duas reservas ocupariam a mesa ao mesmo tempo? */
export function overlaps(a: Pick<MapReserve, "time">, b: Pick<MapReserve, "time">, stayMinutes: number): boolean {
  const sa = minutesOf(a.time);
  const sb = minutesOf(b.time);
  if (sa === null || sb === null) return true;
  return sa < sb + stayMinutes && sb < sa + stayMinutes;
}

// ───────────────────────── planta do dia ─────────────────────────

export interface DayLayout {
  /** Elementos com as mudanças do dia aplicadas (sem os retirados). */
  elements: PlanElement[];
  /** Mesas retiradas no dia (e o que estava preso a elas). */
  hiddenIds: Set<string>;
  /** Nome da mesa no dia (o renomeado, ou o da planta). */
  nameOf: (tableId: string) => string;
}

type LayoutPart = Pick<DayPlan, "moves" | "names" | "hidden">;

export function applyDay(plan: FloorPlan, day: LayoutPart): DayLayout {
  const known = new Map(plan.elements.map((e) => [e.id, e]));
  let elements = plan.elements;
  for (const [id, pose] of Object.entries(day.moves)) {
    if (known.get(id)?.kind === "table") elements = placeWithChildren(elements, id, pose);
  }
  const hiddenTables = Object.keys(day.hidden).filter((id) => day.hidden[id] && known.get(id)?.kind === "table");
  const hiddenIds = withDescendants(elements, hiddenTables);
  elements = elements
    .filter((e) => !hiddenIds.has(e.id))
    .map((e) => (e.kind === "table" && day.names[e.id]?.trim() ? { ...e, label: day.names[e.id].trim() } : e));
  const byId = new Map(elements.map((e) => [e.id, e]));
  return {
    elements,
    hiddenIds,
    nameOf: (id) => byId.get(id)?.label ?? known.get(id)?.label ?? "",
  };
}

// ───────────────────────── mesas e reservas ─────────────────────────

export interface SeatUnit {
  /** Id da mesa ou do grupo. */
  key: string;
  isGroup: boolean;
  /** Grupo criado pelo campo "mesa" de uma reserva (sincronização automática). */
  isAuto: boolean;
  tableIds: string[];
  level: string;
  /** "12" ou "8, 9" (ou o nome dado ao grupo). */
  name: string;
  /** Nomes das mesas no formato das reservas ("8, 9"). */
  reserveName: string;
  seats: number;
  /** Reservas no horário escolhido (ou no dia todo). */
  reservations: MapReserve[];
  /** Todas as reservas do dia nesta mesa. */
  dayReservations: MapReserve[];
  /** Próximas reservas depois do horário escolhido. */
  upcoming: MapReserve[];
  auto: TableState;
  state: TableState;
  manual?: ManualMark;
}

export interface UnmatchedReserve {
  reserve: MapReserve;
  /** Nomes do campo "mesa" que não existem no mapa do dia. */
  missing: string[];
}

/** Duas reservas na mesma mesa ao mesmo tempo. */
export interface TableConflict {
  tableId: string;
  a: MapReserve;
  b: MapReserve;
}

export interface DayStatus {
  units: SeatUnit[];
  unitOfTable: Map<string, SeatUnit>;
  unitByKey: Map<string, SeatUnit>;
  /** Mesas de cada reserva (resolvidas pelo nome ou pelo ambiente). */
  tablesOfReserve: Map<string, string[]>;
  /** Reservas confirmadas sem mesa. */
  unassigned: MapReserve[];
  /** Reservas com mesa que não está no mapa. */
  unmatched: UnmatchedReserve[];
  conflicts: TableConflict[];
  counts: Record<TableState, number> & { seatsFree: number; seatsTotal: number };
}

export interface StatusOptions {
  /** Junta as mesas que aparecem juntas no campo "mesa" de uma reserva. */
  autoSync?: boolean;
  /** Minuto do dia a mostrar (null = o dia todo). */
  at?: number | null;
  stayMinutes?: number;
}

/** Grupos válidos: 2+ mesas que existem no dia, cada mesa em um grupo só. */
export function validGroups(day: Pick<DayPlan, "groups">, tables: Map<string, PlanElement>): [string, TableGroup][] {
  const used = new Set<string>();
  const out: [string, TableGroup][] = [];
  for (const [id, g] of Object.entries(day.groups)) {
    const members = [...new Set(g.tables)].filter((t) => tables.has(t) && !used.has(t));
    if (members.length < 2) continue;
    members.forEach((t) => used.add(t));
    out.push([id, { ...g, tables: members }]);
  }
  return out;
}

export const autoGroupKey = (tableIds: string[]) => `auto-${[...tableIds].sort().join("+")}`;

export function computeDayStatus(
  plan: FloorPlan,
  day: DayPlan,
  layout: DayLayout,
  reserves: MapReserve[],
  opts: StatusOptions = {},
): DayStatus {
  const stay = opts.stayMinutes ?? DEFAULT_SETTINGS.stayMinutes;
  const at = opts.at ?? null;
  const inScope = (r: MapReserve) => at === null || activeAt(r, at, stay);
  const tables = new Map(layout.elements.filter((e) => e.kind === "table").map((e) => [e.id, e]));
  const baseById = new Map(plan.elements.map((e) => [e.id, e]));

  // Nome → mesas (nome do dia e nome da planta)
  const byName = new Map<string, Set<string>>();
  const addName = (name: string | undefined, id: string) => {
    const n = name ? normalizeTableName(name) : "";
    if (!n) return;
    if (!byName.has(n)) byName.set(n, new Set());
    byName.get(n)!.add(id);
  };
  for (const [id, t] of tables) {
    addName(t.label, id);
    addName(baseById.get(id)?.label, id);
  }
  const rooms = layout.elements.filter((e) => e.kind === "room" && e.label);
  const tablesInRoom = (room: PlanElement) =>
    [...tables.values()].filter((t) => t.level === room.level && containsPoint(room, t)).map((t) => t.id);

  // Grupos manuais primeiro (o nome deles também casa com reservas)
  const manualGroups = validGroups(day, tables);
  const groupNames = new Map<string, string[]>();
  for (const [, g] of manualGroups) if (g.name) groupNames.set(normalizeTableName(g.name), g.tables);

  // Mesas de cada reserva confirmada
  const confirmed = reserves.filter((r) => r.status === "confirmed");
  const tablesOfReserve = new Map<string, string[]>();
  const roomOfReserve = new Map<string, string>();
  const unassigned: MapReserve[] = [];
  const unmatched: UnmatchedReserve[] = [];
  for (const r of confirmed) {
    const tokens = parseTableField(r.table);
    if (!tokens.length) {
      unassigned.push(r);
      continue;
    }
    const ids = new Set<string>();
    const missing: string[] = [];
    for (const t of tokens) {
      const g = groupNames.get(t);
      const direct = byName.get(t);
      if (g) g.forEach((id) => ids.add(id));
      else if (direct?.size) direct.forEach((id) => ids.add(id));
      else {
        const room = rooms.find((rm) => normalizeTableName(rm.label!) === t);
        const inRoom = room ? tablesInRoom(room) : [];
        if (inRoom.length) {
          inRoom.forEach((id) => ids.add(id));
          if (tokens.length === 1) roomOfReserve.set(r.id, room!.label!);
        } else missing.push(t);
      }
    }
    tablesOfReserve.set(r.id, [...ids]);
    if (missing.length) unmatched.push({ reserve: r, missing });
  }

  // Grupos automáticos: mesas que a mesma reserva usa juntas (no horário escolhido)
  const used = new Set(manualGroups.flatMap(([, g]) => g.tables));
  const autoGroups: { key: string; tables: string[]; name?: string }[] = [];
  if (opts.autoSync) {
    const ordered = confirmed.filter(inScope).sort((a, b) => a.time.localeCompare(b.time));
    for (const r of ordered) {
      const ids = tablesOfReserve.get(r.id) ?? [];
      if (ids.length < 2 || ids.some((id) => used.has(id))) continue;
      ids.forEach((id) => used.add(id));
      autoGroups.push({ key: autoGroupKey(ids), tables: ids, name: roomOfReserve.get(r.id) });
    }
  }

  const units: SeatUnit[] = [];
  const unitOfTable = new Map<string, SeatUnit>();
  const makeUnit = (key: string, tableIds: string[], kind: "single" | "manual" | "auto", groupName?: string) => {
    const els = tableIds.map((id) => tables.get(id)!);
    const reserveName = joinTableNames(els.map((e) => e.label ?? ""));
    const unit: SeatUnit = {
      key,
      isGroup: kind !== "single",
      isAuto: kind === "auto",
      tableIds,
      level: els[0].level,
      name: groupName?.trim() || reserveName,
      reserveName,
      seats: els.reduce((s, e) => s + (e.seats ?? 0), 0),
      reservations: [],
      dayReservations: [],
      upcoming: [],
      auto: "free",
      state: "free",
    };
    units.push(unit);
    tableIds.forEach((id) => unitOfTable.set(id, unit));
  };
  for (const [id, g] of manualGroups) makeUnit(id, g.tables, "manual", g.name);
  for (const g of autoGroups) makeUnit(g.key, g.tables, "auto", g.name);
  for (const id of tables.keys()) if (!unitOfTable.has(id)) makeUnit(id, [id], "single");

  for (const r of confirmed) {
    const hit = new Set((tablesOfReserve.get(r.id) ?? []).map((id) => unitOfTable.get(id)!).filter(Boolean));
    for (const u of hit) {
      u.dayReservations.push(r);
      if (inScope(r)) u.reservations.push(r);
      else if (at !== null && (minutesOf(r.time) ?? -1) > at) u.upcoming.push(r);
    }
  }

  // Reservas que disputam a mesma mesa no mesmo horário
  const conflicts: TableConflict[] = [];
  const seen = new Set<string>();
  for (const id of tables.keys()) {
    const rs = confirmed.filter((r) => tablesOfReserve.get(r.id)?.includes(id));
    for (let i = 0; i < rs.length; i++)
      for (let j = i + 1; j < rs.length; j++) {
        if (!overlaps(rs[i], rs[j], stay)) continue;
        const k = [rs[i].id, rs[j].id].sort().join("|");
        if (seen.has(k)) continue;
        seen.add(k);
        conflicts.push({ tableId: id, a: rs[i], b: rs[j] });
      }
  }

  const counts = { free: 0, reserved: 0, occupied: 0, blocked: 0, seatsFree: 0, seatsTotal: 0 };
  const byTime = (a: MapReserve, b: MapReserve) => a.time.localeCompare(b.time);
  for (const u of units) {
    u.reservations.sort(byTime);
    u.dayReservations.sort(byTime);
    u.upcoming.sort(byTime);
    u.auto = u.reservations.some((r) => r.isArrived) ? "occupied" : u.reservations.length ? "reserved" : "free";
    u.manual = day.manual[u.key];
    u.state = u.manual?.state ?? u.auto;
    counts[u.state] += 1;
    counts.seatsTotal += u.seats;
    if (u.state === "free") counts.seatsFree += u.seats;
  }

  return {
    units,
    unitOfTable,
    unitByKey: new Map(units.map((u) => [u.key, u])),
    tablesOfReserve,
    unassigned: unassigned.sort(byTime),
    unmatched,
    conflicts,
    counts,
  };
}

// ───────────────────────── sugestão de mesa ─────────────────────────

export interface TableSuggestion {
  /** Mesas da sugestão (uma, ou duas vizinhas para juntar). */
  tableIds: string[];
  /** Como gravar no campo "mesa". */
  reserveName: string;
  seats: number;
  /** Juntar duas mesas que hoje estão separadas. */
  join: boolean;
}

/**
 * Mesas livres no horário da reserva que comportam o grupo: primeiro as que
 * sobram menos lugares; depois pares de mesas vizinhas (até 80 cm).
 */
export function suggestTables(
  status: DayStatus,
  layout: DayLayout,
  reserve: MapReserve,
  stayMinutes: number,
  limit = 4,
): TableSuggestion[] {
  const people = (reserve.adults || 0) + (reserve.childs || 0);
  const tables = new Map(layout.elements.filter((e) => e.kind === "table").map((e) => [e.id, e]));
  const busy = (u: SeatUnit) =>
    u.manual?.state === "blocked" ||
    u.dayReservations.some((r) => r.id !== reserve.id && overlaps(r, reserve, stayMinutes));
  const free = status.units.filter((u) => !busy(u));
  const out: (TableSuggestion & { score: number })[] = [];
  for (const u of free) {
    if (u.seats < people) continue;
    out.push({ tableIds: u.tableIds, reserveName: u.reserveName, seats: u.seats, join: false, score: u.seats - people });
  }
  const singles = free.filter((u) => !u.isGroup && u.seats < people);
  for (let i = 0; i < singles.length; i++)
    for (let j = i + 1; j < singles.length; j++) {
      const a = tables.get(singles[i].tableIds[0])!;
      const b = tables.get(singles[j].tableIds[0])!;
      const seats = singles[i].seats + singles[j].seats;
      if (a.level !== b.level || seats < people || gapBetween(a, b) > 0.8) continue;
      out.push({
        tableIds: [a.id, b.id],
        reserveName: joinTableNames([a.label ?? "", b.label ?? ""]),
        seats,
        join: true,
        score: seats - people + 2,
      });
    }
  return out
    .sort((x, y) => x.score - y.score || x.reserveName.localeCompare(y.reserveName, "pt-BR", { numeric: true }))
    .slice(0, limit)
    .map((x) => ({ tableIds: x.tableIds, reserveName: x.reserveName, seats: x.seats, join: x.join }));
}

export const STATE_META: Record<TableState, { label: string; short: string; color: string; ink: string }> = {
  free: { label: "Livre", short: "Livre", color: "#34d399", ink: "#062b1f" },
  reserved: { label: "Reservada", short: "Reserva", color: "#f5b841", ink: "#2b1d02" },
  occupied: { label: "Ocupada", short: "Ocupada", color: "#f0716b", ink: "#2e0907" },
  blocked: { label: "Indisponível", short: "Fechada", color: "#8b8f98", ink: "#141518" },
};

export function newId(prefix: string): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}-${rnd}`;
}
