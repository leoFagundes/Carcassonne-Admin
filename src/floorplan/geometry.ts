import type { PlanElement, Pose } from "./types";

export interface Pt {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const MIN_SIZE = 0.05;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Arredonda ao centímetro (evita 2.0000000004 no banco e na tela). */
export function cm(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Giro entre 0 e 360. */
export function normRot(deg: number): number {
  const r = ((deg % 360) + 360) % 360;
  return Math.round(r * 100) / 100 === 360 ? 0 : Math.round(r * 100) / 100;
}

export function snap(v: number, step: number): number {
  if (!step) return v;
  return Math.round(v / step) * step;
}

/** Ponto nos eixos do elemento (relativo ao centro) → ponto da planta. */
export function toWorld(el: Pose, lx: number, ly: number): Pt {
  const a = rad(el.rot);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: el.x + lx * c - ly * s, y: el.y + lx * s + ly * c };
}

/** Ponto da planta → eixos do elemento (relativo ao centro). */
export function toLocal(el: Pose, px: number, py: number): Pt {
  const a = rad(el.rot);
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = px - el.x;
  const dy = py - el.y;
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

export function corners(el: Pick<PlanElement, "x" | "y" | "w" | "d" | "rot">): Pt[] {
  const hw = el.w / 2;
  const hd = el.d / 2;
  return [
    toWorld(el, -hw, -hd),
    toWorld(el, hw, -hd),
    toWorld(el, hw, hd),
    toWorld(el, -hw, hd),
  ];
}

export function containsPoint(
  el: Pick<PlanElement, "x" | "y" | "w" | "d" | "rot">,
  p: Pt,
  pad = 0,
): boolean {
  const l = toLocal(el, p.x, p.y);
  return Math.abs(l.x) <= el.w / 2 + pad && Math.abs(l.y) <= el.d / 2 + pad;
}

export function boundsOf(els: Pick<PlanElement, "x" | "y" | "w" | "d" | "rot">[]): Bounds | null {
  if (!els.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of els) {
    for (const p of corners(el)) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return { minX, minY, maxX, maxY };
}

/** Os ids pedidos mais tudo o que está preso a eles (em qualquer profundidade). */
export function withDescendants(els: PlanElement[], ids: Iterable<string>): Set<string> {
  const out = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const el of els) {
      if (el.parent && out.has(el.parent) && !out.has(el.id)) {
        out.add(el.id);
        grew = true;
      }
    }
  }
  return out;
}

/** O elemento seria preso a si mesmo (direta ou indiretamente)? */
export function wouldCycle(els: PlanElement[], childId: string, parentId: string): boolean {
  return withDescendants(els, [childId]).has(parentId);
}

/** Move os ids (e o que está preso a eles) por (dx, dy). */
export function translate(els: PlanElement[], ids: Iterable<string>, dx: number, dy: number): PlanElement[] {
  const set = withDescendants(els, ids);
  if (!dx && !dy) return els;
  return els.map((el) => (set.has(el.id) ? { ...el, x: cm(el.x + dx), y: cm(el.y + dy) } : el));
}

/** Gira os ids (e o que está preso) em torno de um ponto. */
export function rotateAround(
  els: PlanElement[],
  ids: Iterable<string>,
  cx: number,
  cy: number,
  ddeg: number,
): PlanElement[] {
  const set = withDescendants(els, ids);
  if (!ddeg) return els;
  const pivot: Pose = { x: cx, y: cy, rot: ddeg };
  return els.map((el) => {
    if (!set.has(el.id)) return el;
    const p = toWorld(pivot, el.x - cx, el.y - cy);
    return { ...el, x: cm(p.x), y: cm(p.y), rot: normRot(el.rot + ddeg) };
  });
}

/**
 * Coloca um elemento numa nova posição e giro, levando junto o que está preso
 * a ele (mantendo a posição relativa).
 */
export function placeWithChildren(els: PlanElement[], id: string, pose: Pose): PlanElement[] {
  const el = els.find((e) => e.id === id);
  if (!el) return els;
  const ddeg = pose.rot - el.rot;
  const set = withDescendants(els, [id]);
  return els.map((e) => {
    if (!set.has(e.id)) return e;
    if (e.id === id) return { ...e, x: cm(pose.x), y: cm(pose.y), rot: normRot(pose.rot) };
    const rel = toLocal(el, e.x, e.y);
    const p = toWorld(pose, rel.x, rel.y);
    return { ...e, x: cm(p.x), y: cm(p.y), rot: normRot(e.rot + ddeg) };
  });
}

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Posição da alça nos eixos do elemento. */
export function handleLocal(el: Pick<PlanElement, "w" | "d">, h: Handle): Pt {
  const x = h.includes("e") ? el.w / 2 : h.includes("w") ? -el.w / 2 : 0;
  const y = h.includes("s") ? el.d / 2 : h.includes("n") ? -el.d / 2 : 0;
  return { x, y };
}

/**
 * Redimensiona puxando uma alça até o ponto `p` (da planta). O lado oposto
 * fica parado; o tamanho encaixa na grade `step`.
 */
export function resizeTo(el: PlanElement, h: Handle, p: Pt, step: number): PlanElement {
  const l = toLocal(el, p.x, p.y);
  let left = -el.w / 2;
  let right = el.w / 2;
  let top = -el.d / 2;
  let bottom = el.d / 2;
  if (h.includes("e")) right = left + Math.max(MIN_SIZE, snap(l.x - left, step) || MIN_SIZE);
  if (h.includes("w")) left = right - Math.max(MIN_SIZE, snap(right - l.x, step) || MIN_SIZE);
  if (h.includes("s")) bottom = top + Math.max(MIN_SIZE, snap(l.y - top, step) || MIN_SIZE);
  if (h.includes("n")) top = bottom - Math.max(MIN_SIZE, snap(bottom - l.y, step) || MIN_SIZE);
  const c = toWorld(el, (left + right) / 2, (top + bottom) / 2);
  return { ...el, x: cm(c.x), y: cm(c.y), w: cm(right - left), d: cm(bottom - top) };
}

/** Giro que aponta o "topo" do elemento para o ponto `p`, encaixando em `stepDeg`. */
export function rotationToward(el: Pose, p: Pt, stepDeg: number): number {
  // O topo (eixo -y do elemento) aponta para p: ângulo medido a partir do norte.
  const deg = (Math.atan2(p.x - el.x, -(p.y - el.y)) * 180) / Math.PI;
  return normRot(stepDeg ? snap(deg, stepDeg) : deg);
}

/** Distância de um ponto a um elemento (0 se estiver dentro). */
export function distanceTo(el: Pick<PlanElement, "x" | "y" | "w" | "d" | "rot">, p: Pt): number {
  const l = toLocal(el, p.x, p.y);
  const dx = Math.max(0, Math.abs(l.x) - el.w / 2);
  const dy = Math.max(0, Math.abs(l.y) - el.d / 2);
  return Math.hypot(dx, dy);
}

/** Distância entre dois elementos (aproximada pelos cantos; 0 se encostam). */
export function gapBetween(a: PlanElement, b: PlanElement): number {
  let best = Infinity;
  for (const p of corners(a)) best = Math.min(best, distanceTo(b, p));
  for (const p of corners(b)) best = Math.min(best, distanceTo(a, p));
  return best;
}

/** "2,00 m" no padrão brasileiro. */
export function formatMeters(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} m`;
}
