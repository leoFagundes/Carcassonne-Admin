import { KINDS, suggestedSeats, type KindCategory } from "./catalog";
import { cm } from "./geometry";
import { newId } from "./day";
import { nextTableName } from "./editing";
import type { ElementKind, PlanElement, TableShape } from "./types";

/** Um item da lista "Adicionar" (tipo + variação + tamanho prontos). */
export interface PaletteItem {
  id: string;
  label: string;
  category: KindCategory;
  kind: ElementKind;
  variant?: string;
  shape?: TableShape;
  w: number;
  d: number;
  count?: number;
  /** Palavras extras para a busca. */
  tags?: string;
}

const P = (
  id: string,
  label: string,
  category: KindCategory,
  kind: ElementKind,
  w: number,
  d: number,
  extra: Partial<PaletteItem> = {},
): PaletteItem => ({ id, label, category, kind, w, d, ...extra });

export const PALETTE: PaletteItem[] = [
  // Mesas e lugares
  P("table-rect", "Mesa retangular", "lugares", "table", 2, 0.8, { variant: "wood" }),
  P("table-square", "Mesa quadrada", "lugares", "table", 0.9, 0.9, { variant: "wood" }),
  P("table-round", "Mesa redonda", "lugares", "table", 1, 1, { variant: "wood", shape: "round" }),
  P("table-oval", "Mesa oval", "lugares", "table", 1.8, 1, { variant: "wood", shape: "round" }),
  P("table-black", "Mesa preta", "lugares", "table", 1.5, 0.75, { variant: "black" }),
  P("table-high", "Mesa alta (bistrô)", "lugares", "table", 0.7, 0.7, { variant: "high", shape: "round", tags: "bistro bar" }),
  P("bench-back", "Banco com encosto", "lugares", "bench", 2, 0.33, { variant: "back" }),
  P("bench-plain", "Banco sem encosto", "lugares", "bench", 2, 0.33, { variant: "plain" }),
  P("sofa", "Sofá", "lugares", "sofa", 1.9, 0.55),
  P("pouf", "Pufes", "lugares", "pouf", 1.2, 0.38, { count: 3 }),
  P("chair", "Cadeira", "lugares", "chair", 0.45, 0.45, { variant: "chair" }),
  P("stool", "Banqueta", "lugares", "chair", 0.38, 0.38, { variant: "stool" }),
  P("armchair", "Poltrona", "lugares", "chair", 0.8, 0.8, { variant: "armchair" }),

  // Móveis e equipamentos
  P("gs-hutch-open", "Armário de jogos alto", "moveis", "gameshelf", 0.85, 0.45, { variant: "hutch-open", tags: "estante jogos prateleira gaveta" }),
  P("gs-hutch-doors", "Armário de jogos alto (portas)", "moveis", "gameshelf", 0.85, 0.45, { variant: "hutch-doors", tags: "estante jogos portas" }),
  P("gs-cubes", "Torre de nichos de jogos", "moveis", "gameshelf", 0.45, 0.35, { variant: "cubes", tags: "estante jogos cubos" }),
  P("gs-lowcab", "Armário baixo de jogos", "moveis", "gameshelf", 1, 0.5, { variant: "lowcab", tags: "jogos portas gaveta" }),
  P("shelf-games", "Estante (decoração)", "moveis", "shelf", 1.8, 0.45, { variant: "bookcase", tags: "jogos" }),
  P("shelf-doors", "Armário com portas", "moveis", "shelf", 1.2, 0.5, { variant: "doors" }),
  P("shelf-cubes", "Nichos", "moveis", "shelf", 0.8, 0.4, { variant: "cubes" }),
  P("shelf-black", "Estante preta", "moveis", "shelf", 0.6, 0.4, { variant: "black" }),
  P("cabinet", "Armário baixo", "moveis", "cabinet", 1.1, 0.4, { variant: "low" }),
  P("boxes", "Pilha de caixas", "moveis", "cabinet", 0.6, 0.4, { variant: "stack" }),
  P("counter", "Balcão", "moveis", "counter", 3, 0.55, { variant: "wood" }),
  P("bar-shelf", "Prateleira de bebidas", "moveis", "counter", 3, 0.4, { variant: "bar" }),
  P("register", "Caixa (pagamento)", "moveis", "counter", 1.2, 0.6, { variant: "register", tags: "pdv maquininha" }),
  P("steel", "Bancada inox", "moveis", "steel", 2, 0.7, { variant: "plain" }),
  P("steel-sink", "Pia inox", "moveis", "steel", 1.2, 0.6, { variant: "sink" }),
  P("tap", "Chopeira", "moveis", "steel", 1.2, 0.6, { variant: "tap", tags: "chope" }),
  P("fridge", "Geladeira", "moveis", "fridge", 0.8, 0.7, { variant: "white" }),
  P("fridge-steel", "Geladeira inox", "moveis", "fridge", 0.8, 0.75, { variant: "steel" }),
  P("freezer", "Freezer horizontal", "moveis", "freezer", 1.6, 0.75),
  P("sink", "Lavatório", "moveis", "sink", 0.45, 0.4),
  P("toilet", "Vaso sanitário", "moveis", "toilet", 0.4, 0.6),
  P("elevator", "Elevador", "moveis", "elevator", 1.1, 1.7),

  // Estrutura
  P("room-wood", "Ambiente (madeira)", "estrutura", "room", 4, 3, { variant: "wood", tags: "sala piso" }),
  P("room-tile", "Ambiente (piso frio)", "estrutura", "room", 3, 2.5, { variant: "tile", tags: "cozinha banheiro" }),
  P("room-out", "Área externa", "estrutura", "room", 5, 3, { variant: "granite", tags: "varanda calçada" }),
  P("wall", "Parede", "estrutura", "wall", 3, 0.15, { variant: "solid" }),
  P("wall-low", "Mureta", "estrutura", "wall", 2, 0.15, { variant: "low" }),
  P("door", "Porta", "estrutura", "door", 0.9, 0.15, { variant: "single" }),
  P("door-double", "Porta dupla", "estrutura", "door", 1.6, 0.15, { variant: "double" }),
  P("door-sliding", "Porta de correr", "estrutura", "door", 1.2, 0.15, { variant: "sliding" }),
  P("arch", "Arco / passagem", "estrutura", "arch", 1.6, 0.15),
  P("window", "Janela / vitrine", "estrutura", "window", 2, 0.15),
  P("curtain", "Cortina", "estrutura", "curtain", 1.5, 0.1),
  P("stair", "Escada", "estrutura", "stair", 1.1, 4.6, { variant: "up", count: 16 }),
  P("pillar", "Coluna quadrada", "estrutura", "pillar", 0.4, 0.4, { variant: "square", tags: "pilar" }),
  P("pillar-round", "Coluna redonda", "estrutura", "pillar", 0.4, 0.4, { variant: "round", tags: "pilar" }),
  P("stage", "Palco / tablado", "estrutura", "stage", 3, 2, { tags: "show" }),
  P("block", "Área fechada", "estrutura", "block", 1, 1),

  // Detalhes
  P("tv", "TV / telão", "detalhes", "deco", 1.4, 0.08, { variant: "tv", tags: "televisão" }),
  P("speaker", "Caixa de som", "detalhes", "deco", 0.35, 0.3, { variant: "speaker", tags: "som" }),
  P("darts", "Alvo de dardos", "detalhes", "deco", 0.5, 0.06, { variant: "darts" }),
  P("ac", "Ar-condicionado", "detalhes", "deco", 0.9, 0.25, { variant: "ac" }),
  P("fan", "Ventilador de teto", "detalhes", "deco", 1.2, 1.2, { variant: "fan" }),
  P("pendant", "Luminária pendente", "detalhes", "deco", 0.3, 0.3, { variant: "pendant", tags: "luz" }),
  P("sconce", "Arandela", "detalhes", "deco", 0.2, 0.08, { variant: "sconce", tags: "luz" }),
  P("glass-blue", "Vitral azul", "detalhes", "deco", 0.6, 0.08, { variant: "glass-blue" }),
  P("glass-green", "Vitral verde", "detalhes", "deco", 0.55, 0.08, { variant: "glass-green" }),
  P("logo", "Painel Carcassonne", "detalhes", "deco", 0.6, 0.08, { variant: "logo" }),
  P("frame", "Quadro", "detalhes", "deco", 0.8, 0.06, { variant: "frame" }),
  P("map", "Mapa", "detalhes", "deco", 1.2, 0.06, { variant: "map" }),
  P("board", "Lousa", "detalhes", "deco", 0.6, 0.06, { variant: "board", tags: "cardápio" }),
  P("mirror", "Espelho", "detalhes", "deco", 0.8, 0.04, { variant: "mirror" }),
  P("banner", "Estandartes", "detalhes", "deco", 3, 0.08, { variant: "banner" }),
  P("shield", "Escudo", "detalhes", "deco", 0.4, 0.06, { variant: "shield" }),
  P("plant", "Planta", "detalhes", "plant", 0.6, 0.6),
  P("barrel", "Barril", "detalhes", "barrel", 0.6, 0.6),
  P("keg", "Barril de chope", "detalhes", "keg", 0.42, 0.42),
  P("bin", "Lixeira", "detalhes", "deco", 0.35, 0.35, { variant: "bin" }),
  P("coatrack", "Cabideiro", "detalhes", "deco", 0.45, 0.45, { variant: "coatrack" }),
  P("extinguisher", "Extintor", "detalhes", "deco", 0.22, 0.22, { variant: "extinguisher" }),
  P("text", "Texto", "detalhes", "text", 1.6, 0.4, { tags: "nome rótulo" }),
];

/** Elemento novo a partir de um item da paleta, centrado em `at`. */
export function createFromPalette(item: PaletteItem, level: string, at: { x: number; y: number }, els: PlanElement[]): PlanElement {
  const el: PlanElement = {
    id: newId(item.kind),
    level,
    kind: item.kind,
    x: cm(at.x),
    y: cm(at.y),
    w: item.w,
    d: item.d,
    rot: 0,
  };
  const variants = KINDS[item.kind].variants;
  if (item.variant) el.variant = item.variant;
  else if (variants) el.variant = variants[0].id;
  if (item.shape === "round") el.shape = "round";
  if (item.count) el.count = item.count;
  if (item.kind === "table") {
    el.label = nextTableName(els);
    el.seats = suggestedSeats(el.w, el.d, el.shape);
  }
  if (item.kind === "room") el.label = "Novo ambiente";
  if (item.kind === "text") el.label = "Texto";
  if (item.kind === "stage") el.label = "Palco";
  if (item.kind === "gameshelf") {
    const n = els.filter((e) => e.kind === "gameshelf").length + 1;
    el.label = `Armário ${n}`;
  }
  return el;
}

/** Busca na paleta sem ligar para acento e maiúscula. */
export function searchPalette(q: string): PaletteItem[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return PALETTE;
  return PALETTE.filter((it) => {
    const hay = norm(`${it.label} ${KINDS[it.kind].label} ${it.tags ?? ""}`);
    return words.every((w) => hay.includes(w));
  });
}
