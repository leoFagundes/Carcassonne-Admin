import type { ElementKind, PlanElement } from "./types";

export type KindCategory = "lugares" | "moveis" | "estrutura" | "detalhes";

export interface KindInfo {
  label: string;
  category: KindCategory;
  /** Tamanho ao adicionar (m). */
  size: { w: number; d: number };
  variants?: { id: string; label: string }[];
  /** Parede, porta e afins: segmento fino, redimensiona só no comprimento. */
  linear?: boolean;
  /** Estrutura: fica embaixo dos móveis e não pega o toque no modo dia. */
  structural?: boolean;
  /** Pode ser preso a uma mesa (acompanha quando ela move). */
  attachable?: boolean;
  /** Mostra o nome no mapa. */
  showsLabel?: boolean;
  /** Redondo no desenho. */
  round?: boolean;
  /** Ordem de desenho (menor fica embaixo). */
  layer: number;
}

export const KINDS: Record<ElementKind, KindInfo> = {
  room: {
    label: "Ambiente",
    category: "estrutura",
    size: { w: 4, d: 3 },
    variants: [
      { id: "wood", label: "Piso de madeira" },
      { id: "tile", label: "Piso frio" },
      { id: "granite", label: "Área externa" },
    ],
    structural: true,
    showsLabel: true,
    layer: 0,
  },
  block: { label: "Área fechada", category: "estrutura", size: { w: 1, d: 1 }, structural: true, layer: 1 },
  stair: {
    label: "Escada",
    category: "estrutura",
    size: { w: 1.1, d: 4.6 },
    variants: [
      { id: "up", label: "Sobe" },
      { id: "down", label: "Desce" },
    ],
    structural: true,
    layer: 1,
  },
  wall: {
    label: "Parede",
    category: "estrutura",
    size: { w: 3, d: 0.15 },
    variants: [
      { id: "solid", label: "Parede" },
      { id: "dark", label: "Parede escura" },
      { id: "low", label: "Mureta" },
    ],
    linear: true,
    structural: true,
    layer: 8,
  },
  door: { label: "Porta", category: "estrutura", size: { w: 0.9, d: 0.15 }, linear: true, structural: true, layer: 8 },
  arch: { label: "Arco / passagem", category: "estrutura", size: { w: 1.6, d: 0.15 }, linear: true, structural: true, layer: 8 },
  window: { label: "Janela / vitrine", category: "estrutura", size: { w: 2, d: 0.15 }, linear: true, structural: true, layer: 8 },
  curtain: { label: "Cortina", category: "estrutura", size: { w: 1.5, d: 0.1 }, linear: true, structural: true, layer: 8 },

  table: {
    label: "Mesa",
    category: "lugares",
    size: { w: 2, d: 0.8 },
    variants: [
      { id: "wood", label: "Madeira" },
      { id: "black", label: "Preta" },
    ],
    showsLabel: true,
    layer: 5,
  },
  bench: {
    label: "Banco",
    category: "lugares",
    size: { w: 2, d: 0.33 },
    variants: [
      { id: "back", label: "Com encosto" },
      { id: "plain", label: "Sem encosto" },
    ],
    attachable: true,
    layer: 4,
  },
  sofa: { label: "Sofá", category: "lugares", size: { w: 1.9, d: 0.55 }, attachable: true, layer: 4 },
  pouf: { label: "Pufes", category: "lugares", size: { w: 1.2, d: 0.38 }, attachable: true, layer: 4 },

  shelf: {
    label: "Estante / armário",
    category: "moveis",
    size: { w: 1.8, d: 0.5 },
    variants: [
      { id: "bookcase", label: "Estante de jogos" },
      { id: "doors", label: "Armário com portas" },
      { id: "cubes", label: "Nichos" },
      { id: "black", label: "Estante preta" },
    ],
    showsLabel: true,
    layer: 3,
  },
  cabinet: {
    label: "Armário baixo",
    category: "moveis",
    size: { w: 1.1, d: 0.4 },
    variants: [
      { id: "low", label: "Armário baixo" },
      { id: "stack", label: "Pilha de caixas" },
    ],
    layer: 3,
  },
  counter: {
    label: "Balcão",
    category: "moveis",
    size: { w: 3, d: 0.55 },
    variants: [
      { id: "wood", label: "Balcão" },
      { id: "bar", label: "Prateleira de bebidas" },
    ],
    showsLabel: true,
    layer: 3,
  },
  steel: {
    label: "Bancada inox",
    category: "moveis",
    size: { w: 2, d: 0.7 },
    variants: [
      { id: "plain", label: "Bancada" },
      { id: "sink", label: "Pia" },
      { id: "tap", label: "Pia e chopeira" },
    ],
    showsLabel: true,
    layer: 3,
  },
  fridge: {
    label: "Geladeira",
    category: "moveis",
    size: { w: 0.8, d: 0.7 },
    variants: [
      { id: "white", label: "Branca" },
      { id: "steel", label: "Inox" },
    ],
    showsLabel: true,
    layer: 3,
  },
  freezer: { label: "Freezer horizontal", category: "moveis", size: { w: 1.6, d: 0.75 }, showsLabel: true, layer: 3 },
  sink: { label: "Lavatório", category: "moveis", size: { w: 0.45, d: 0.4 }, layer: 3 },
  toilet: { label: "Vaso sanitário", category: "moveis", size: { w: 0.4, d: 0.6 }, layer: 3 },
  elevator: { label: "Elevador", category: "moveis", size: { w: 1.1, d: 1.7 }, showsLabel: true, layer: 3 },
  barrel: { label: "Barril", category: "detalhes", size: { w: 0.6, d: 0.6 }, round: true, layer: 3 },
  keg: { label: "Barril de chope", category: "detalhes", size: { w: 0.42, d: 0.42 }, round: true, layer: 3 },
  plant: { label: "Planta", category: "detalhes", size: { w: 0.6, d: 0.6 }, round: true, layer: 3 },
  deco: {
    label: "Decoração",
    category: "detalhes",
    size: { w: 0.6, d: 0.08 },
    variants: [
      { id: "glass-blue", label: "Vitral azul" },
      { id: "glass-green", label: "Vitral verde" },
      { id: "logo", label: "Painel Carcassonne" },
      { id: "logo-dark", label: "Painel Carcassonne (fundo preto)" },
      { id: "frame", label: "Quadro" },
      { id: "map", label: "Mapa" },
      { id: "board", label: "Lousa" },
      { id: "mirror", label: "Espelho" },
      { id: "banner", label: "Estandartes" },
      { id: "shield", label: "Escudo" },
      { id: "weapons", label: "Armas na parede" },
      { id: "arches", label: "Arcos pintados" },
      { id: "sconce", label: "Arandela" },
      { id: "pendant", label: "Luminária pendente" },
      { id: "projector", label: "Projetor" },
      { id: "lattice", label: "Treliça" },
      { id: "rail", label: "Corrimão" },
      { id: "extinguisher", label: "Extintor" },
      { id: "wallcab", label: "Armário de parede" },
      { id: "hood", label: "Coifa" },
    ],
    layer: 6,
  },
  text: { label: "Texto", category: "detalhes", size: { w: 1.6, d: 0.4 }, showsLabel: true, layer: 9 },
};

export const CATEGORY_LABEL: Record<KindCategory, string> = {
  lugares: "Mesas e lugares",
  moveis: "Móveis e equipamentos",
  estrutura: "Estrutura",
  detalhes: "Detalhes",
};

export const CATEGORY_ORDER: KindCategory[] = ["lugares", "moveis", "estrutura", "detalhes"];

export function kindInfo(kind: ElementKind): KindInfo {
  return KINDS[kind];
}

export function variantOf(el: Pick<PlanElement, "kind" | "variant">): string | undefined {
  const variants = KINDS[el.kind].variants;
  if (!variants) return undefined;
  return variants.some((v) => v.id === el.variant) ? el.variant : variants[0].id;
}

export function variantLabel(el: Pick<PlanElement, "kind" | "variant">): string | undefined {
  const v = variantOf(el);
  return KINDS[el.kind].variants?.find((x) => x.id === v)?.label;
}

/** Nome para mostrar: "Mesa 12", "Salas", "Banco". */
export function elementTitle(el: Pick<PlanElement, "kind" | "label" | "variant">): string {
  if (el.kind === "table") return el.label ? tableTitle(el.label) : "Mesa sem nome";
  if (el.label) return el.label;
  const v = variantLabel(el);
  if (!v || el.kind === "deco") return v ?? KINDS[el.kind].label;
  // "Banco com encosto", "Estante / armário (Nichos)"
  const base = KINDS[el.kind].label;
  return v.toLowerCase().startsWith(base.toLowerCase()) ? v : `${base} (${v.toLowerCase()})`;
}

/** "12" → "Mesa 12"; nomes que não são número ficam como estão ("Varanda"). */
export function tableTitle(name: string): string {
  const n = name.trim();
  return /^\d+[a-z]?$/i.test(n) ? `Mesa ${n}` : n;
}

/** Lugares sugeridos pelo tamanho da mesa. */
export function suggestedSeats(w: number, d: number): number {
  const long = Math.max(w, d);
  const short = Math.min(w, d);
  const perSide = Math.max(1, Math.floor(long / 0.6));
  return short >= 1.4 ? perSide * 2 + 2 : perSide * 2;
}
