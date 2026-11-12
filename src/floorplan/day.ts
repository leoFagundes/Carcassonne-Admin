import { containsPoint, placeWithChildren, withDescendants } from "./geometry";
import type {
  DayPlan,
  FloorPlan,
  ManualMark,
  MapReserve,
  PlanElement,
  TableGroup,
  TableState,
} from "./types";

export function emptyDay(date: string): DayPlan {
  return { date, moves: {}, names: {}, hidden: {}, groups: {}, manual: {} };
}

/** O dia tem alguma mudança de mesa (posição, nome, retirada ou junção)? */
export function dayHasLayoutChanges(day: DayPlan): boolean {
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

/** Nomes das mesas no formato que a equipe já usa nas reservas: "2/3/7". */
export function joinTableNames(names: string[]): string {
  return [...names].sort(numericFirst).join("/");
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

export function applyDay(plan: FloorPlan, day: DayPlan): DayLayout {
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
  tableIds: string[];
  level: string;
  /** "12" ou "2/3" (ou o nome dado ao grupo). */
  name: string;
  /** Nomes das mesas no formato das reservas ("2/3"). */
  reserveName: string;
  seats: number;
  reservations: MapReserve[];
  auto: TableState;
  state: TableState;
  manual?: ManualMark;
}

export interface UnmatchedReserve {
  reserve: MapReserve;
  /** Nomes do campo "mesa" que não existem no mapa do dia. */
  missing: string[];
}

export interface DayStatus {
  units: SeatUnit[];
  unitOfTable: Map<string, SeatUnit>;
  unitByKey: Map<string, SeatUnit>;
  /** Reservas confirmadas sem mesa. */
  unassigned: MapReserve[];
  /** Reservas com mesa que não está no mapa. */
  unmatched: UnmatchedReserve[];
  counts: Record<TableState, number> & { seatsFree: number; seatsTotal: number };
}

/** Grupos válidos: 2+ mesas que existem no dia, cada mesa em um grupo só. */
export function validGroups(day: DayPlan, tables: Map<string, PlanElement>): [string, TableGroup][] {
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

export function computeDayStatus(
  plan: FloorPlan,
  day: DayPlan,
  layout: DayLayout,
  reserves: MapReserve[],
): DayStatus {
  const tables = new Map(layout.elements.filter((e) => e.kind === "table").map((e) => [e.id, e]));
  const baseById = new Map(plan.elements.map((e) => [e.id, e]));
  const units: SeatUnit[] = [];
  const unitOfTable = new Map<string, SeatUnit>();

  const makeUnit = (key: string, tableIds: string[], isGroup: boolean, groupName?: string): SeatUnit => {
    const els = tableIds.map((id) => tables.get(id)!);
    const names = els.map((e) => e.label ?? "");
    const reserveName = joinTableNames(names);
    const unit: SeatUnit = {
      key,
      isGroup,
      tableIds,
      level: els[0].level,
      name: groupName?.trim() || reserveName,
      reserveName,
      seats: els.reduce((s, e) => s + (e.seats ?? 0), 0),
      reservations: [],
      auto: "free",
      state: "free",
    };
    units.push(unit);
    tableIds.forEach((id) => unitOfTable.set(id, unit));
    return unit;
  };

  for (const [id, g] of validGroups(day, tables)) makeUnit(id, g.tables, true, g.name);
  for (const id of tables.keys()) if (!unitOfTable.has(id)) makeUnit(id, [id], false);

  // Índice de nomes → unidades (nome do dia, nome da planta e nome do grupo)
  const byName = new Map<string, Set<SeatUnit>>();
  const addName = (name: string | undefined, u: SeatUnit) => {
    const n = name ? normalizeTableName(name) : "";
    if (!n) return;
    if (!byName.has(n)) byName.set(n, new Set());
    byName.get(n)!.add(u);
  };
  for (const u of units) {
    if (u.isGroup) addName(u.name, u);
    for (const id of u.tableIds) {
      addName(tables.get(id)?.label, u);
      addName(baseById.get(id)?.label, u);
    }
  }
  // Ambientes ("salas"): todas as mesas dentro dele
  const rooms = layout.elements.filter((e) => e.kind === "room" && e.label);
  const unitsInRoom = (room: PlanElement) =>
    units.filter((u) => u.tableIds.some((id) => {
      const t = tables.get(id)!;
      return t.level === room.level && containsPoint(room, t);
    }));

  const unassigned: MapReserve[] = [];
  const unmatched: UnmatchedReserve[] = [];
  for (const r of reserves) {
    if (r.status !== "confirmed") continue;
    const tokens = parseTableField(r.table);
    if (!tokens.length) {
      unassigned.push(r);
      continue;
    }
    const hit = new Set<SeatUnit>();
    const missing: string[] = [];
    for (const t of tokens) {
      const direct = byName.get(t);
      if (direct?.size) {
        direct.forEach((u) => hit.add(u));
        continue;
      }
      const room = rooms.find((rm) => normalizeTableName(rm.label!) === t);
      const inRoom = room ? unitsInRoom(room) : [];
      if (inRoom.length) inRoom.forEach((u) => hit.add(u));
      else missing.push(t);
    }
    hit.forEach((u) => u.reservations.push(r));
    if (missing.length) unmatched.push({ reserve: r, missing });
  }

  const counts = { free: 0, reserved: 0, occupied: 0, blocked: 0, seatsFree: 0, seatsTotal: 0 };
  for (const u of units) {
    u.reservations.sort((a, b) => a.time.localeCompare(b.time));
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
    unassigned: unassigned.sort((a, b) => a.time.localeCompare(b.time)),
    unmatched,
    counts,
  };
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
