import { KINDS, suggestedSeats, tableTitle } from "./catalog";
import { boundsOf, cm, placeWithChildren, translate, withDescendants, wouldCycle } from "./geometry";
import { newId, normalizeTableName } from "./day";
import type { ElementKind, FloorPlan, PlanElement, Pose } from "./types";

/** Próximo número livre para mesa nova. */
export function nextTableName(els: PlanElement[]): string {
  const used = new Set(els.filter((e) => e.kind === "table" && e.label).map((e) => normalizeTableName(e.label!)));
  let max = 0;
  for (const n of used) if (/^\d+$/.test(n)) max = Math.max(max, Number(n));
  let next = max + 1;
  while (used.has(String(next))) next++;
  return String(next);
}

export function createElement(kind: ElementKind, level: string, at: { x: number; y: number }, els: PlanElement[]): PlanElement {
  const info = KINDS[kind];
  const el: PlanElement = {
    id: newId(kind),
    level,
    kind,
    x: cm(at.x),
    y: cm(at.y),
    w: info.size.w,
    d: info.size.d,
    rot: 0,
  };
  if (info.variants) el.variant = info.variants[0].id;
  if (kind === "table") {
    el.label = nextTableName(els);
    el.seats = suggestedSeats(el.w, el.d);
  }
  if (kind === "room") el.label = "Novo ambiente";
  if (kind === "text") el.label = "Texto";
  if (kind === "pouf") el.count = 3;
  if (kind === "stair") el.count = 16;
  return el;
}

export function updateElement(plan: FloorPlan, id: string, patch: Partial<PlanElement>): FloorPlan {
  const el = plan.elements.find((e) => e.id === id);
  if (!el) return plan;
  // Posição e giro levam junto o que está preso
  const { x, y, rot, ...rest } = patch;
  let elements = plan.elements;
  if (x !== undefined || y !== undefined || rot !== undefined) {
    const pose: Pose = { x: x ?? el.x, y: y ?? el.y, rot: rot ?? el.rot };
    elements = placeWithChildren(elements, id, pose);
  }
  if (Object.keys(rest).length) {
    elements = elements.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...rest };
      const r = rest as Partial<PlanElement>;
      for (const k of Object.keys(r) as (keyof PlanElement)[]) if (r[k] === undefined) delete next[k];
      return next;
    });
  }
  // Trocar de andar leva o que está preso
  if (patch.level && patch.level !== el.level) {
    const set = withDescendants(elements, [id]);
    elements = elements.map((e) => (set.has(e.id) ? { ...e, level: patch.level! } : e));
  }
  return { ...plan, elements };
}

/** Exclui (com o que está preso a eles). */
export function deleteElements(plan: FloorPlan, ids: string[]): FloorPlan {
  const set = withDescendants(plan.elements, ids);
  return { ...plan, elements: plan.elements.filter((e) => !set.has(e.id)) };
}

/** Duplica (com o que está preso), um pouco deslocado. Devolve os ids novos dos escolhidos. */
export function duplicateElements(plan: FloorPlan, ids: string[], offset = 0.3): { plan: FloorPlan; ids: string[] } {
  const set = withDescendants(plan.elements, ids);
  const map = new Map<string, string>();
  const source = plan.elements.filter((e) => set.has(e.id));
  for (const e of source) map.set(e.id, newId(e.kind));
  let all = plan.elements;
  const copies: PlanElement[] = [];
  for (const e of source) {
    const c: PlanElement = { ...e, id: map.get(e.id)!, x: cm(e.x + offset), y: cm(e.y + offset) };
    if (e.parent) c.parent = map.get(e.parent) ?? e.parent;
    if (c.kind === "table") c.label = nextTableName([...all, ...copies]);
    copies.push(c);
  }
  all = [...all, ...copies];
  return { plan: { ...plan, elements: all }, ids: ids.map((id) => map.get(id)!).filter(Boolean) };
}

export type AlignMode = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";

/** Alinha pelos limites de cada elemento (o que está preso acompanha). */
export function alignElements(plan: FloorPlan, ids: string[], mode: AlignMode): FloorPlan {
  // Quem está preso a outro escolhido já vai junto com ele
  const els = plan.elements.filter(
    (e) => ids.includes(e.id) && !ids.some((other) => other !== e.id && withDescendants(plan.elements, [other]).has(e.id)),
  );
  const all = boundsOf(els);
  if (!all || els.length < 2) return plan;
  let elements = plan.elements;
  for (const e of els) {
    const b = boundsOf([e])!;
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = all.minX - b.minX;
    if (mode === "right") dx = all.maxX - b.maxX;
    if (mode === "centerX") dx = (all.minX + all.maxX) / 2 - (b.minX + b.maxX) / 2;
    if (mode === "top") dy = all.minY - b.minY;
    if (mode === "bottom") dy = all.maxY - b.maxY;
    if (mode === "centerY") dy = (all.minY + all.maxY) / 2 - (b.minY + b.maxY) / 2;
    // Só o próprio elemento e o que está preso a ele (não os outros escolhidos)
    elements = translate(elements, [e.id], dx, dy);
  }
  return { ...plan, elements };
}

/** Prende os escolhidos à mesa escolhida (ignora o que faria um laço). */
export function attachTo(plan: FloorPlan, ids: string[], parentId: string): FloorPlan {
  return {
    ...plan,
    elements: plan.elements.map((e) =>
      ids.includes(e.id) && e.id !== parentId && !wouldCycle(plan.elements, e.id, parentId) ? { ...e, parent: parentId } : e,
    ),
  };
}

export function detach(plan: FloorPlan, ids: string[]): FloorPlan {
  return {
    ...plan,
    elements: plan.elements.map((e) => {
      if (!ids.includes(e.id) || !e.parent) return e;
      const next = { ...e };
      delete next.parent;
      return next;
    }),
  };
}

export interface PlanProblem {
  message: string;
  ids: string[];
}

/** O que impede salvar: mesa sem nome ou nome repetido. */
export function planProblems(plan: FloorPlan): PlanProblem[] {
  const problems: PlanProblem[] = [];
  const tables = plan.elements.filter((e) => e.kind === "table");
  const unnamed = tables.filter((t) => !t.label?.trim());
  if (unnamed.length) problems.push({ message: `${unnamed.length === 1 ? "Uma mesa está" : `${unnamed.length} mesas estão`} sem nome.`, ids: unnamed.map((t) => t.id) });
  const byName = new Map<string, PlanElement[]>();
  for (const t of tables) {
    const n = t.label ? normalizeTableName(t.label) : "";
    if (!n) continue;
    byName.set(n, [...(byName.get(n) ?? []), t]);
  }
  for (const list of byName.values()) {
    if (list.length > 1)
      problems.push({ message: `${tableTitle(list[0].label!)} aparece ${list.length} vezes: cada mesa precisa de um nome só dela.`, ids: list.map((t) => t.id) });
  }
  return problems;
}

/** Resumo da planta: mesas e lugares por andar. */
export function planSummary(plan: FloorPlan): { level: string; tables: number; seats: number }[] {
  return plan.levels.map((l) => {
    const tables = plan.elements.filter((e) => e.level === l.id && e.kind === "table");
    return { level: l.id, tables: tables.length, seats: tables.reduce((s, t) => s + (t.seats ?? 0), 0) };
  });
}
