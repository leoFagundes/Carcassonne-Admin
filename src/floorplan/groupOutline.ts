/**
 * Contorno de um grupo de mesas juntadas que segue o formato do grupo (um "L",
 * por exemplo), em vez de um retângulo em volta de tudo — assim uma mesa que
 * não é do grupo, mas fica no canto, não parece estar junto.
 *
 * Cada mesa vira um retângulo com folga; mesas vizinhas ganham uma "ponte"
 * entre elas (o banco do meio); o contorno é a borda da união disso.
 */
import type { Bounds } from "./geometry";

type Pt = { x: number; y: number };

const EPS = 1e-6;

function gapBetween(a: Bounds, b: Bounds): number {
  const dx = Math.max(0, a.minX - b.maxX, b.minX - a.maxX);
  const dy = Math.max(0, a.minY - b.maxY, b.minY - a.maxY);
  return Math.hypot(dx, dy);
}

/** Ponte entre duas mesas: a faixa em comum (de lado ou de cima), ou as duas inteiras se ficam na diagonal. */
function bridge(a: Bounds, b: Bounds): Bounds {
  const ox0 = Math.max(a.minX, b.minX);
  const ox1 = Math.min(a.maxX, b.maxX);
  const oy0 = Math.max(a.minY, b.minY);
  const oy1 = Math.min(a.maxY, b.maxY);
  if (ox1 - ox0 > EPS) return { minX: ox0, maxX: ox1, minY: Math.min(a.maxY, b.maxY), maxY: Math.max(a.minY, b.minY) };
  if (oy1 - oy0 > EPS) return { minX: Math.min(a.maxX, b.maxX), maxX: Math.max(a.minX, b.minX), minY: oy0, maxY: oy1 };
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
}

/** Liga as mesas pelo caminho mais curto (árvore geradora mínima pela distância entre elas). */
function links(boxes: Bounds[]): [number, number][] {
  const n = boxes.length;
  if (n < 2) return [];
  const inTree = new Set([0]);
  const out: [number, number][] = [];
  while (inTree.size < n) {
    let best: [number, number, number] | null = null;
    for (const i of inTree)
      for (let j = 0; j < n; j++) {
        if (inTree.has(j)) continue;
        const d = gapBetween(boxes[i], boxes[j]);
        if (!best || d < best[2]) best = [i, j, d];
      }
    if (!best) break;
    inTree.add(best[1]);
    out.push([best[0], best[1]]);
  }
  return out;
}

/** União de retângulos alinhados → contornos fechados (um ou mais), em sentido horário. */
export function unionOutline(rects: Bounds[]): Pt[][] {
  const valid = rects.filter((r) => r.maxX - r.minX > EPS && r.maxY - r.minY > EPS);
  if (!valid.length) return [];
  const uniq = (v: number[]) => [...new Set(v.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b);
  const xs = uniq(valid.flatMap((r) => [r.minX, r.maxX]));
  const ys = uniq(valid.flatMap((r) => [r.minY, r.maxY]));
  const W = xs.length - 1;
  const H = ys.length - 1;
  const filled = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= W || j >= H) return false;
    const cx = (xs[i] + xs[i + 1]) / 2;
    const cy = (ys[j] + ys[j + 1]) / 2;
    return valid.some((r) => cx > r.minX && cx < r.maxX && cy > r.minY && cy < r.maxY);
  };
  const grid: boolean[][] = Array.from({ length: W }, (_, i) => Array.from({ length: H }, (_, j) => filled(i, j)));
  // Buracos (vão cercado por todos os lados) contam como dentro: só a borda de fora
  const outside = Array.from({ length: W }, () => Array<boolean>(H).fill(false));
  const stack: [number, number][] = [];
  for (let i = 0; i < W; i++) for (const j of [0, H - 1]) if (!grid[i][j]) stack.push([i, j]);
  for (let j = 0; j < H; j++) for (const i of [0, W - 1]) if (!grid[i][j]) stack.push([i, j]);
  while (stack.length) {
    const [i, j] = stack.pop()!;
    if (i < 0 || j < 0 || i >= W || j >= H || grid[i][j] || outside[i][j]) continue;
    outside[i][j] = true;
    stack.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
  }
  for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) if (!grid[i][j] && !outside[i][j]) grid[i][j] = true;
  const on = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < H && grid[i][j];

  // Arestas da borda, orientadas (horário com y para baixo), ligadas pelo ponto de início
  const key = (p: Pt) => `${p.x},${p.y}`;
  const edges = new Map<string, Pt[]>();
  const add = (a: Pt, b: Pt) => edges.set(key(a), [...(edges.get(key(a)) ?? []), b]);
  for (let i = 0; i < W; i++)
    for (let j = 0; j < H; j++) {
      if (!grid[i][j]) continue;
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const y0 = ys[j];
      const y1 = ys[j + 1];
      if (!on(i, j - 1)) add({ x: x0, y: y0 }, { x: x1, y: y0 });
      if (!on(i + 1, j)) add({ x: x1, y: y0 }, { x: x1, y: y1 });
      if (!on(i, j + 1)) add({ x: x1, y: y1 }, { x: x0, y: y1 });
      if (!on(i - 1, j)) add({ x: x0, y: y1 }, { x: x0, y: y0 });
    }

  const loops: Pt[][] = [];
  for (;;) {
    const startKey = [...edges.keys()].find((k) => edges.get(k)!.length);
    if (!startKey) break;
    const [sx, sy] = startKey.split(",").map(Number);
    const loop: Pt[] = [{ x: sx, y: sy }];
    let cur = startKey;
    for (let guard = 0; guard < 10000; guard++) {
      const nexts = edges.get(cur)!;
      const next = nexts.shift()!;
      if (!nexts.length) edges.delete(cur);
      if (key(next) === startKey) break;
      loop.push(next);
      cur = key(next);
      if (!edges.get(cur)?.length) break;
    }
    // Tira os pontos no meio de uma reta
    const simple = loop.filter((p, i) => {
      const a = loop[(i - 1 + loop.length) % loop.length];
      const b = loop[(i + 1) % loop.length];
      return !((Math.abs(a.x - p.x) < EPS && Math.abs(p.x - b.x) < EPS) || (Math.abs(a.y - p.y) < EPS && Math.abs(p.y - b.y) < EPS));
    });
    if (simple.length >= 4) loops.push(simple);
  }
  return loops;
}

/** Contorno do grupo: mesas com folga + pontes entre vizinhas. */
export function groupOutline(tables: Bounds[], pad: number): Pt[][] {
  const boxes = tables.map((b) => ({ minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad }));
  const tree = links(boxes);
  // Além do caminho mais curto, liga as vizinhas lado a lado tão perto quanto (fecha um quadrado de 4)
  const reach = Math.max(0, ...tree.map(([i, j]) => gapBetween(boxes[i], boxes[j]))) + 0.05;
  const pairs = new Set(tree.map(([i, j]) => `${Math.min(i, j)}-${Math.max(i, j)}`));
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const sideBySide = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > EPS || Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > EPS;
      if (sideBySide && gapBetween(a, b) <= reach) pairs.add(`${i}-${j}`);
    }
  const bridges = [...pairs].map((p) => {
    const [i, j] = p.split("-").map(Number);
    return bridge(boxes[i], boxes[j]);
  });
  return unionOutline([...boxes, ...bridges]);
}

/** Caminho SVG (com cantos arredondados) de contornos em metros, na escala `scale`. */
export function outlinePath(loops: Pt[][], scale: number, radius: number): string {
  return loops
    .map((loop) => {
      const n = loop.length;
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const p = loop[i];
        const a = loop[(i - 1 + n) % n];
        const b = loop[(i + 1) % n];
        const la = Math.hypot(p.x - a.x, p.y - a.y) * scale;
        const lb = Math.hypot(b.x - p.x, b.y - p.y) * scale;
        const r = Math.min(radius, la / 2, lb / 2);
        const ux = (a.x - p.x) / (la / scale || 1);
        const uy = (a.y - p.y) / (la / scale || 1);
        const vx = (b.x - p.x) / (lb / scale || 1);
        const vy = (b.y - p.y) / (lb / scale || 1);
        const s = { x: p.x * scale + ux * r, y: p.y * scale + uy * r };
        const e = { x: p.x * scale + vx * r, y: p.y * scale + vy * r };
        parts.push(`${i ? "L" : "M"} ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${(p.x * scale).toFixed(1)} ${(p.y * scale).toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`);
      }
      return `${parts.join(" ")} Z`;
    })
    .join(" ");
}
