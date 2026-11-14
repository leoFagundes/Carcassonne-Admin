/**
 * Lista de camadas da planta (como no Figma): tudo o que está desenhado num
 * andar, de quem fica por cima para quem fica por baixo, com nome, tipo,
 * ambiente e o que está preso a quê.
 */
import { KINDS, tableTitle, variantLabel } from "./catalog";
import { containsPoint } from "./geometry";
import type { ElementKind, PlanElement } from "./types";

/** Ordem de desenho na planta 2D: pela camada do tipo e, no mesmo tipo, pela ordem na lista. */
export function drawOrder<T extends Pick<PlanElement, "kind">>(els: T[]): T[] {
  return els
    .map((el, i) => ({ el, i }))
    .sort((a, b) => KINDS[a.el.kind].layer - KINDS[b.el.kind].layer || a.i - b.i)
    .map((x) => x.el);
}

/** Nome do item na lista: o que foi digitado, senão o tipo (e a variação). */
export function layerName(el: PlanElement): string {
  const label = el.label?.trim();
  if (el.kind === "table") return label ? tableTitle(label) : "Mesa sem nome";
  if (label) return label;
  const v = variantLabel(el);
  const k = KINDS[el.kind].label;
  if (!v || v === k) return k;
  // "Com encosto" → "Banco com encosto"
  return /^(com|sem)\s/i.test(v) ? `${k} ${v[0].toLowerCase()}${v.slice(1)}` : v;
}

/** Ambiente (com nome) onde fica o centro do objeto: o menor, se estiver em dois. */
export function roomOf(el: PlanElement, rooms: PlanElement[]): PlanElement | undefined {
  if (el.kind === "room") return undefined;
  return rooms.filter((r) => r.level === el.level && r.id !== el.id && containsPoint(r, el)).sort((a, b) => a.w * a.d - b.w * b.d)[0];
}

export type LayerGroupBy = "none" | "room" | "kind";

export interface LayerItem {
  el: PlanElement;
  name: string;
  /** Preso a outro item da lista (aparece embaixo dele, recuado). */
  depth: number;
}

export interface LayerGroup {
  key: string;
  title: string;
  items: LayerItem[];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Monta a lista de um andar: de cima para baixo, agrupada (por ambiente, por
 * tipo ou sem grupo), com a busca (nome ou tipo) e o filtro de tipo. Quem está
 * preso a outro (banco preso à mesa) vem logo embaixo dele, recuado.
 */
export function buildLayers(
  elements: PlanElement[],
  level: string,
  opts: { groupBy?: LayerGroupBy; q?: string; kind?: ElementKind | null } = {},
): LayerGroup[] {
  const { groupBy = "room", q = "", kind = null } = opts;
  const onLevel = elements.filter((e) => e.level === level);
  const topFirst = drawOrder(onLevel).reverse();
  const nq = norm(q.trim());
  const keep = (el: PlanElement) =>
    (!kind || el.kind === kind) && (!nq || norm(layerName(el)).includes(nq) || norm(KINDS[el.kind].label).includes(nq));
  const shown = topFirst.filter(keep);
  const shownIds = new Set(shown.map((e) => e.id));

  // Filhos logo embaixo do pai (quando o pai também aparece)
  const childrenOf = new Map<string, PlanElement[]>();
  for (const el of shown) if (el.parent && shownIds.has(el.parent)) childrenOf.set(el.parent, [...(childrenOf.get(el.parent) ?? []), el]);
  const flatten = (list: PlanElement[]): LayerItem[] => {
    const out: LayerItem[] = [];
    const seen = new Set<string>();
    const walk = (el: PlanElement, depth: number) => {
      if (seen.has(el.id)) return;
      seen.add(el.id);
      out.push({ el, name: layerName(el), depth });
      for (const c of childrenOf.get(el.id) ?? []) walk(c, depth + 1);
    };
    for (const el of list) if (!(el.parent && shownIds.has(el.parent))) walk(el, 0);
    // Filhos cujo pai ficou em outro grupo
    for (const el of list) if (!seen.has(el.id)) walk(el, 0);
    return out;
  };

  if (groupBy === "none") return shown.length ? [{ key: "all", title: "Tudo", items: flatten(shown) }] : [];

  if (groupBy === "kind") {
    const byKind = new Map<ElementKind, PlanElement[]>();
    for (const el of shown) byKind.set(el.kind, [...(byKind.get(el.kind) ?? []), el]);
    // Na ordem de camada (de cima para baixo)
    return [...byKind]
      .sort((a, b) => KINDS[b[0]].layer - KINDS[a[0]].layer)
      .map(([k, list]) => ({ key: `kind:${k}`, title: KINDS[k].label, items: list.map((el) => ({ el, name: layerName(el), depth: 0 })) }));
  }

  // Por ambiente: cada objeto no ambiente onde está; os ambientes num grupo próprio
  const rooms = onLevel.filter((e) => e.kind === "room" && e.label?.trim());
  const groups = new Map<string, { title: string; list: PlanElement[] }>();
  const add = (key: string, title: string, el: PlanElement) => {
    const g = groups.get(key) ?? { title, list: [] };
    g.list.push(el);
    groups.set(key, g);
  };
  for (const el of shown) {
    if (el.kind === "room") {
      add("rooms", "Ambientes e pisos", el);
      continue;
    }
    // Quem está preso a outro vai para o grupo do pai
    const anchor = el.parent ? onLevel.find((p) => p.id === el.parent) ?? el : el;
    const r = roomOf(anchor, rooms);
    if (r) add(`room:${r.id}`, r.label!.trim(), el);
    else add("loose", "Fora dos ambientes", el);
  }
  const order = (key: string) => (key === "rooms" ? 2 : key === "loose" ? 1 : 0);
  return [...groups]
    .sort((a, b) => order(a[0]) - order(b[0]) || a[1].title.localeCompare(b[1].title, "pt-BR"))
    .map(([key, g]) => ({ key, title: g.title, items: flatten(g.list) }));
}

/** Tipos que aparecem no andar (para o filtro), com quantos de cada. */
export function kindsOnLevel(elements: PlanElement[], level: string): { kind: ElementKind; label: string; count: number }[] {
  const m = new Map<ElementKind, number>();
  for (const el of elements) if (el.level === level) m.set(el.kind, (m.get(el.kind) ?? 0) + 1);
  return [...m].map(([kind, count]) => ({ kind, label: KINDS[kind].label, count })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
