import { KINDS } from "./catalog";
import { cm, MIN_SIZE, normRot } from "./geometry";
import { emptyDay } from "./day";
import type {
  DayPlan,
  ElementKind,
  FloorPlan,
  ManualMark,
  PlanElement,
  PlanLevel,
  Pose,
  StoredFloorPlan,
  TableGroup,
} from "./types";

/** Limite de elementos (o documento do Firestore tem teto de 1 MB). */
export const MAX_ELEMENTS = 2000;
const MAX_COORD = 500;
const MAX_LABEL = 60;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, max = MAX_LABEL): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function sanitizeElement(raw: unknown, levels: Set<string>): PlanElement | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id, 80);
  const kind = raw.kind as ElementKind;
  const level = str(raw.level, 40);
  if (!id || !level || !levels.has(level) || !(kind in KINDS)) return null;
  const x = num(raw.x);
  const y = num(raw.y);
  const w = num(raw.w);
  const d = num(raw.d);
  if (x === null || y === null || w === null || d === null) return null;
  const el: PlanElement = {
    id,
    level,
    kind,
    x: cm(clamp(x, -MAX_COORD, MAX_COORD)),
    y: cm(clamp(y, -MAX_COORD, MAX_COORD)),
    w: cm(clamp(w, MIN_SIZE, 100)),
    d: cm(clamp(d, MIN_SIZE, 100)),
    rot: normRot(num(raw.rot) ?? 0),
  };
  const label = str(raw.label);
  if (label) el.label = label;
  const seats = num(raw.seats);
  if (kind === "table" && seats !== null) el.seats = clamp(Math.round(seats), 0, 99);
  const variant = str(raw.variant, 30);
  if (variant && KINDS[kind].variants?.some((v) => v.id === variant)) el.variant = variant;
  const count = num(raw.count);
  if (count !== null) el.count = clamp(Math.round(count), 1, 60);
  const parent = str(raw.parent, 80);
  if (parent && parent !== id) el.parent = parent;
  if (raw.hideLabel === true) el.hideLabel = true;
  const lx = num(raw.lx);
  const ly = num(raw.ly);
  if (lx !== null) el.lx = cm(clamp(lx, -50, 50));
  if (ly !== null) el.ly = cm(clamp(ly, -50, 50));
  return el;
}

export function sanitizePlan(raw: unknown): StoredFloorPlan | null {
  if (!isObj(raw) || !Array.isArray(raw.levels) || !Array.isArray(raw.elements)) return null;
  const levels: PlanLevel[] = [];
  for (const l of raw.levels) {
    if (!isObj(l)) continue;
    const id = str(l.id, 40);
    const name = str(l.name, 40);
    if (!id || !name || levels.some((x) => x.id === id)) continue;
    levels.push({ id, name, order: num(l.order) ?? levels.length });
  }
  if (!levels.length) return null;
  levels.sort((a, b) => a.order - b.order);
  const ids = new Set(levels.map((l) => l.id));
  const seen = new Set<string>();
  const elements: PlanElement[] = [];
  for (const r of raw.elements.slice(0, MAX_ELEMENTS)) {
    const el = sanitizeElement(r, ids);
    if (!el || seen.has(el.id)) continue;
    seen.add(el.id);
    elements.push(el);
  }
  // Preso a algo que não existe mais: solta
  for (const el of elements) if (el.parent && !seen.has(el.parent)) delete el.parent;
  return {
    levels,
    elements,
    levelHeight: clamp(num(raw.levelHeight) ?? 3.2, 2, 8),
    version: Math.max(0, Math.round(num(raw.version) ?? 0)),
    updatedAt: num(raw.updatedAt) ?? undefined,
  };
}

/** Para gravar: só os campos do modelo, sem `undefined` (o Firestore recusa). */
export function planForStorage(plan: FloorPlan): FloorPlan {
  return {
    levels: plan.levels.map(({ id, name, order }) => ({ id, name, order })),
    levelHeight: plan.levelHeight,
    elements: plan.elements.map((el) => {
      const out: PlanElement = { id: el.id, level: el.level, kind: el.kind, x: el.x, y: el.y, w: el.w, d: el.d, rot: el.rot };
      if (el.label) out.label = el.label;
      if (el.kind === "table" && el.seats !== undefined) out.seats = el.seats;
      if (el.variant) out.variant = el.variant;
      if (el.count !== undefined) out.count = el.count;
      if (el.parent) out.parent = el.parent;
      if (el.hideLabel) out.hideLabel = true;
      if (el.lx !== undefined) out.lx = el.lx;
      if (el.ly !== undefined) out.ly = el.ly;
      return out;
    }),
  };
}

function sanitizePose(v: unknown): Pose | null {
  if (!isObj(v)) return null;
  const x = num(v.x);
  const y = num(v.y);
  if (x === null || y === null) return null;
  return { x: cm(clamp(x, -MAX_COORD, MAX_COORD)), y: cm(clamp(y, -MAX_COORD, MAX_COORD)), rot: normRot(num(v.rot) ?? 0) };
}

export function sanitizeDay(date: string, raw: unknown): DayPlan {
  const day = emptyDay(date);
  if (!isObj(raw)) return day;
  if (isObj(raw.moves)) {
    for (const [id, v] of Object.entries(raw.moves)) {
      const p = sanitizePose(v);
      if (p) day.moves[id] = p;
    }
  }
  if (isObj(raw.names)) {
    for (const [id, v] of Object.entries(raw.names)) {
      const s = str(v);
      if (s) day.names[id] = s;
    }
  }
  if (isObj(raw.hidden)) {
    for (const [id, v] of Object.entries(raw.hidden)) if (v === true) day.hidden[id] = true;
  }
  if (isObj(raw.groups)) {
    for (const [id, v] of Object.entries(raw.groups)) {
      if (!isObj(v) || !Array.isArray(v.tables)) continue;
      const tables = [...new Set(v.tables.filter((t): t is string => typeof t === "string"))];
      if (tables.length < 2) continue;
      const g: TableGroup = { tables };
      const name = str(v.name);
      if (name) g.name = name;
      day.groups[id] = g;
    }
  }
  if (isObj(raw.manual)) {
    for (const [id, v] of Object.entries(raw.manual)) {
      if (!isObj(v)) continue;
      const state = v.state;
      if (state !== "free" && state !== "occupied" && state !== "blocked") continue;
      const mark: ManualMark = { state, at: num(v.at) ?? 0 };
      day.manual[id] = mark;
    }
  }
  return day;
}

/** Data no formato do documento do dia. */
export function isDayKey(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
