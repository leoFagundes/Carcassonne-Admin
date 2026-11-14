/**
 * Armários de jogos: os modelos (fiéis às estantes do pub), os espaços de cada
 * um (prateleiras, gaveta, nichos, atrás das portas, em cima) e o que está
 * guardado em cada espaço (/gameShelves/{id do armário}).
 */
import { containsPoint } from "./geometry";
import type { FloorPlan, PlanElement } from "./types";

export type ShelfModelId = "hutch-open" | "hutch-doors" | "cubes" | "lowcab" | "pouf1" | "pouf3" | "understair" | "chest";

export type SlotKind = "top" | "open" | "drawer" | "doors" | "inside";

/** Espaço do armário, na vista de frente: metros a partir do canto de cima à esquerda do móvel. */
export interface ShelfSlotDef {
  id: string;
  label: string;
  kind: SlotKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShelfModelDef {
  id: ShelfModelId;
  label: string;
  /** Altura do móvel (m). O tampo ("em cima") fica acima disso. */
  height: number;
  /** Largura e profundidade ao adicionar. */
  w: number;
  d: number;
  slots: (w: number) => ShelfSlotDef[];
  /** É um assento (pufe): na planta conta como lugar para sentar, e abre levantando o tampo. */
  seat?: boolean;
}

/** Altura da área "em cima" na vista de frente. */
export const TOP_ZONE = 0.32;

const top = (w: number): ShelfSlotDef => ({ id: "top", label: "Em cima", kind: "top", x: 0.02, y: -TOP_ZONE, w: w - 0.04, h: TOP_ZONE - 0.02 });

/**
 * Estante alta (fotos 1, 4 e 5): cornija, 3 prateleiras abertas, tampo,
 * gaveta com dois puxadores e a parte de baixo (2 prateleiras, aberta ou com portas).
 * Medidas em metros, de cima para baixo.
 */
export const HUTCH = {
  height: 2.05,
  cornice: 0.06,
  upperInset: 0.04,
  side: 0.03,
  upper: [
    [0.08, 0.4],
    [0.425, 0.745],
    [0.77, 1.09],
  ] as [number, number][],
  ledge: [1.09, 1.15] as [number, number],
  drawer: [1.15, 1.33] as [number, number],
  lower: [
    [1.36, 1.625],
    [1.65, 1.915],
  ] as [number, number][],
  base: [1.915, 1.97] as [number, number],
};

/** Torre de nichos (foto 2): 4 cubos de 40 cm empilhados. */
export const CUBES = { height: 1.6, cube: 0.4, wall: 0.018 };

/** Armário baixo (foto 3): tampo, gaveta, 2 portas com 2 prateleiras dentro e pés. */
export const LOWCAB = {
  height: 0.9,
  ledge: [0, 0.05] as [number, number],
  drawer: [0.05, 0.22] as [number, number],
  inner: [
    [0.25, 0.52],
    [0.545, 0.82],
  ] as [number, number][],
  base: [0.82, 0.86] as [number, number],
};

/**
 * Pufes-baú das salas (vídeo): o de 1 lugar é um cubo preto de couro com
 * botões no tampo; o de 3 lugares tem base preta e três almofadas de tecido
 * claro com bolinhas, e cada lugar abre separado. O tampo levanta para trás.
 */
export const POUF = { height: 0.45, lid: 0.07, wall: 0.03, floor: 0.04 };

/** Baú de jogos: caixa de madeira com tampa que abre para trás. */
export const CHEST = { height: 0.5, lid: 0.06, wall: 0.03, floor: 0.04 };

/**
 * Armário embaixo da escada: o teto acompanha a escada, baixo de um lado
 * (`low`) e alto do outro (`height`). A frente é uma parede com uma porta de
 * correr (no lado alto) e, dentro, três prateleiras grandes de ponta a ponta:
 * a de baixo é a mais comprida, e as de cima encurtam com a escada. A parte
 * baixa fica à esquerda na vista de frente.
 */
export const UNDERSTAIR = {
  height: 2.1,
  low: 0.75,
  frame: 0.04,
  base: 0.08,
  /** Espessura das prateleiras. */
  board: 0.03,
  /** Altura (do chão) em que começa cada prateleira, de baixo para cima. */
  levels: [0.08, 0.72, 1.38],
  /** Altura livre mínima da prateleira de cima, embaixo da escada. */
  minTop: 0.32,
  /** Largura máxima da porta de correr. */
  door: 0.85,
};

/** As três prateleiras: x (m, da esquerda) onde cabem, e alturas de baixo e de cima. */
export function understairLevels(w: number): { x0: number; bottom: number; top: number }[] {
  const U = UNDERSTAIR;
  const slope = (U.height - U.low) / Math.max(0.01, w);
  // Onde o teto (escada) chega a uma altura
  const xAt = (h: number) => Math.max(0, Math.min(w, (h - U.low) / slope));
  return U.levels.map((bottom, k) => {
    const last = k === U.levels.length - 1;
    const x = last ? xAt(bottom + U.minTop + U.frame) : xAt(U.levels[k + 1] + U.frame);
    const x0 = Math.min(x + U.frame, w - U.frame - 0.15);
    // A prateleira de cima de cada vão vai de levels[k+1] a levels[k+1] + board
    const top = last ? understairTop(w, x0) - U.frame : U.levels[k + 1];
    return { x0, bottom: bottom + (k ? U.board : 0), top };
  });
}

/** A porta de correr (no lado alto): x da esquerda, largura e altura (m). */
export function understairDoor(w: number): { x0: number; w: number; h: number } {
  const dw = Math.min(UNDERSTAIR.door, w * 0.4);
  const x0 = w - 0.12 - dw;
  return { x0, w: dw, h: understairTop(w, x0) - 0.14 };
}

/** Altura do teto do armário embaixo da escada no ponto x (m, da esquerda). */
export function understairTop(w: number, x: number): number {
  const f = Math.max(0, Math.min(1, x / Math.max(0.01, w)));
  return UNDERSTAIR.low + (UNDERSTAIR.height - UNDERSTAIR.low) * f;
}

/** Pufe-baú: um baú só por dentro (o de 3 lugares também não tem divisão). */
function poufSlots(w: number, label: string): ShelfSlotDef[] {
  return [
    {
      id: "in",
      label,
      kind: "inside",
      x: POUF.wall,
      y: POUF.lid,
      w: w - POUF.wall * 2,
      h: POUF.height - POUF.lid - POUF.floor,
    },
  ];
}

function understairSlots(w: number): ShelfSlotDef[] {
  const U = UNDERSTAIR;
  const names = ["Prateleira de baixo", "Prateleira do meio", "Prateleira de cima"];
  // Na vista de frente, de cima para baixo: p1 (de cima), p2, p3 (de baixo)
  return understairLevels(w)
    .map((l, k) => ({
      id: `p${3 - k}`,
      label: names[k],
      kind: "doors" as SlotKind,
      x: l.x0,
      y: U.height - l.top,
      w: w - U.frame - l.x0,
      h: l.top - l.bottom,
    }))
    .reverse();
}

function hutchSlots(w: number, doors: boolean): ShelfSlotDef[] {
  const ix = HUTCH.upperInset + HUTCH.side;
  const lx = 0.02 + HUTCH.side;
  const out: ShelfSlotDef[] = [top(w)];
  HUTCH.upper.forEach(([y0, y1], i) =>
    out.push({ id: `u${i + 1}`, label: `Prateleira ${i + 1}`, kind: "open", x: ix, y: y0, w: w - ix * 2, h: y1 - y0 }),
  );
  out.push({ id: "drawer", label: "Gaveta", kind: "drawer", x: lx, y: HUTCH.drawer[0], w: w - lx * 2, h: HUTCH.drawer[1] - HUTCH.drawer[0] });
  HUTCH.lower.forEach(([y0, y1], i) =>
    out.push({
      id: `l${i + 1}`,
      label: doors ? `Atrás das portas ${i === 0 ? "(em cima)" : "(embaixo)"}` : `Embaixo ${i + 1}`,
      kind: doors ? "doors" : "open",
      x: lx,
      y: y0,
      w: w - lx * 2,
      h: y1 - y0,
    }),
  );
  return out;
}

export const SHELF_MODELS: Record<ShelfModelId, ShelfModelDef> = {
  "hutch-open": { id: "hutch-open", label: "Estante alta (embaixo aberta)", height: HUTCH.height, w: 0.85, d: 0.45, slots: (w) => hutchSlots(w, false) },
  "hutch-doors": { id: "hutch-doors", label: "Estante alta (embaixo com portas)", height: HUTCH.height, w: 0.85, d: 0.45, slots: (w) => hutchSlots(w, true) },
  cubes: {
    id: "cubes",
    label: "Torre de nichos",
    height: CUBES.height,
    w: 0.45,
    d: 0.35,
    slots: (w) => [
      top(w),
      ...[0, 1, 2, 3].map((i) => ({
        id: `c${i + 1}`,
        label: `Nicho ${i + 1}${i === 0 ? " (de cima)" : i === 3 ? " (de baixo)" : ""}`,
        kind: "open" as SlotKind,
        x: CUBES.wall,
        y: i * CUBES.cube + CUBES.wall,
        w: w - CUBES.wall * 2,
        h: CUBES.cube - CUBES.wall * 2,
      })),
    ],
  },
  lowcab: {
    id: "lowcab",
    label: "Armário baixo com portas",
    height: LOWCAB.height,
    w: 1.0,
    d: 0.5,
    slots: (w) => [
      { ...top(w), label: "Em cima (tampo)" },
      { id: "drawer", label: "Gaveta", kind: "drawer", x: 0.05, y: LOWCAB.drawer[0], w: w - 0.1, h: LOWCAB.drawer[1] - LOWCAB.drawer[0] },
      ...LOWCAB.inner.map(([y0, y1], i) => ({
        id: `d${i + 1}`,
        label: `Atrás das portas ${i === 0 ? "(em cima)" : "(embaixo)"}`,
        kind: "doors" as SlotKind,
        x: 0.05,
        y: y0,
        w: w - 0.1,
        h: y1 - y0,
      })),
    ],
  },

  pouf1: { id: "pouf1", label: "Pufe baú (1 lugar)", height: POUF.height, w: 0.5, d: 0.5, seat: true, slots: (w) => poufSlots(w, "Dentro do pufe") },
  pouf3: { id: "pouf3", label: "Pufe baú (3 lugares)", height: POUF.height, w: 1.5, d: 0.5, seat: true, slots: (w) => poufSlots(w, "Dentro do baú") },
  chest: {
    id: "chest",
    label: "Baú de jogos",
    height: CHEST.height,
    w: 0.9,
    d: 0.5,
    slots: (w) => [{ id: "in", label: "Dentro do baú", kind: "inside", x: CHEST.wall, y: CHEST.lid, w: w - CHEST.wall * 2, h: CHEST.height - CHEST.lid - CHEST.floor }],
  },
  understair: { id: "understair", label: "Armário embaixo da escada", height: UNDERSTAIR.height, w: 2.4, d: 0.6, slots: understairSlots },
};

export function shelfModel(el: Pick<PlanElement, "variant">): ShelfModelDef {
  return SHELF_MODELS[(el.variant as ShelfModelId) in SHELF_MODELS ? (el.variant as ShelfModelId) : "hutch-open"];
}

export function shelfSlots(el: Pick<PlanElement, "variant" | "w">): ShelfSlotDef[] {
  return shelfModel(el).slots(el.w);
}

// ───────────────────────── o que está guardado ─────────────────────────

/** Um jogo num espaço: da Coleção (gameId) ou avulso (só o nome). */
export interface ShelfGame {
  key: string;
  gameId?: string;
  name: string;
}

/** Etiqueta do espaço: uma categoria da Coleção ou uma criada pelo gerente. */
export type SlotLabel = { kind: "type"; name: string } | { kind: "custom"; id: string };

export interface ShelfSlot {
  label?: SlotLabel;
  games: ShelfGame[];
}

export interface ShelfContent {
  /** Id do armário na planta. */
  id: string;
  slots: Record<string, ShelfSlot>;
}

/** Categoria criada pelo gerente (vale por cima das da Coleção): /floorPlan/shelfCategories. */
export interface ShelfCategory {
  id: string;
  name: string;
  color: string;
  /** Regra opcional: quais jogos da Coleção combinam com a plaquinha. */
  rule?: CategoryRule;
}

/**
 * Regra de uma categoria criada pelo gerente (ex.: "Jogos para 2" = dá para
 * jogar com 2). Todas as partes preenchidas precisam valer ao mesmo tempo;
 * dentro de uma lista (categorias, dificuldades), basta uma.
 */
export interface CategoryRule {
  /** Dá para jogar com esse número de pessoas (mínimo ≤ N ≤ máximo). */
  players?: number;
  /** Só os feitos exatamente para esse número (mínimo = máximo = N). */
  exact?: boolean;
  /** Duração de até tantos minutos. */
  maxTime?: number;
  /** Uma destas dificuldades. */
  difficulty?: string[];
  /** Uma destas categorias da Coleção. */
  types?: string[];
}

export function hasRule(rule: CategoryRule | undefined): rule is CategoryRule {
  return !!rule && (!!rule.players || !!rule.maxTime || !!rule.difficulty?.length || !!rule.types?.length);
}

/** O jogo combina com a regra? (sem regra, combina; dado que falta no jogo, não combina) */
export function matchesRule(g: CatalogGame, rule: CategoryRule | undefined): boolean {
  if (!hasRule(rule)) return true;
  if (rule.players) {
    const min = g.minPlayers ?? 0;
    const max = g.maxPlayers ?? 0;
    if (!min || !max) return false;
    if (rule.exact ? !(min === rule.players && max === rule.players) : !(min <= rule.players && rule.players <= max)) return false;
  }
  if (rule.maxTime && !(g.playTime && g.playTime <= rule.maxTime)) return false;
  if (rule.difficulty?.length && !(g.difficulty && rule.difficulty.includes(g.difficulty))) return false;
  if (rule.types?.length && !rule.types.some((t) => g.types.includes(t))) return false;
  return true;
}

/** "Para 2 jogadores · até 30 min · Leve · Party Game ou Blefe". */
export function ruleSummary(rule: CategoryRule | undefined): string {
  if (!hasRule(rule)) return "";
  const parts: string[] = [];
  if (rule.players) parts.push(rule.exact ? `só para ${rule.players}` : `dá para jogar com ${rule.players}`);
  if (rule.maxTime) parts.push(`até ${rule.maxTime} min`);
  const or = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} ou ${l[l.length - 1]}` : l[0]);
  if (rule.difficulty?.length) parts.push(or(rule.difficulty));
  if (rule.types?.length) parts.push(or(rule.types));
  return parts.join(" · ");
}

/** Quem combina com a etiqueta: categoria da Coleção, ou a regra da sua categoria. Sem critério: null. */
export function labelMatcher(label: SlotLabel | undefined, customs: ShelfCategory[]): ((g: CatalogGame) => boolean) | null {
  if (!label) return null;
  if (label.kind === "type") return (g) => g.types.includes(label.name);
  const rule = customs.find((c) => c.id === label.id)?.rule;
  return hasRule(rule) ? (g) => matchesRule(g, rule) : null;
}

function sanitizeRule(raw: unknown): CategoryRule | undefined {
  if (!isObj(raw)) return undefined;
  const int = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= max ? Math.round(v) : undefined);
  const list = (v: unknown) =>
    Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.slice(0, 60)))].slice(0, 40) : [];
  const rule: CategoryRule = {};
  const players = int(raw.players, 99);
  if (players) {
    rule.players = players;
    if (raw.exact === true) rule.exact = true;
  }
  const maxTime = int(raw.maxTime, 600);
  if (maxTime) rule.maxTime = maxTime;
  const difficulty = list(raw.difficulty);
  if (difficulty.length) rule.difficulty = difficulty;
  const types = list(raw.types);
  if (types.length) rule.types = types;
  return hasRule(rule) ? rule : undefined;
}

/** A categoria como vai para o banco (sem campos vazios: o Firestore recusa undefined). */
export function categoryForStorage(c: ShelfCategory): Record<string, unknown> {
  const rule = sanitizeRule(c.rule);
  return rule ? { id: c.id, name: c.name, color: c.color, rule } : { id: c.id, name: c.name, color: c.color };
}

/** O que o armário precisa saber de cada jogo da Coleção. */
export interface CatalogGame {
  id: string;
  name: string;
  image?: string;
  types: string[];
  minPlayers?: number;
  maxPlayers?: number;
  /** Duração (min). */
  playTime?: number;
  difficulty?: string;
}

export const CATEGORY_COLORS = ["#e6c56b", "#34d399", "#60a5fa", "#f472b6", "#f59e0b", "#a78bfa", "#f87171", "#2dd4bf", "#a3e635", "#fb923c"];

/** Cor estável para uma categoria da Coleção (pelo nome). */
export function typeColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CATEGORY_COLORS[h % CATEGORY_COLORS.length];
}

export function labelInfo(label: SlotLabel | undefined, customs: ShelfCategory[]): { text: string; color: string; custom: boolean } | null {
  if (!label) return null;
  if (label.kind === "type") return { text: label.name, color: typeColor(label.name), custom: false };
  const c = customs.find((x) => x.id === label.id);
  return c ? { text: c.name, color: c.color, custom: true } : null;
}

export function sameLabel(a: SlotLabel | undefined, b: SlotLabel | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.kind === b.kind && (a.kind === "type" ? a.name === (b as { name: string }).name : a.id === (b as { id: string }).id);
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export function searchGames<T extends { name: string }>(list: T[], q: string, limit = 30): T[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return list.slice(0, limit);
  return list.filter((g) => words.every((w) => norm(g.name).includes(w))).slice(0, limit);
}

/** Categoria que mais aparece no espaço (sugestão de etiqueta): 2+ jogos e metade deles ou mais. */
export function suggestSlotLabel(slot: ShelfSlot | undefined, byId: Map<string, CatalogGame>): string | null {
  if (!slot || slot.games.length < 2) return null;
  const count = new Map<string, number>();
  for (const g of slot.games) for (const t of (g.gameId && byId.get(g.gameId)?.types) || []) count.set(t, (count.get(t) ?? 0) + 1);
  let best: [string, number] | null = null;
  for (const e of count) if (!best || e[1] > best[1] || (e[1] === best[1] && e[0] < best[0])) best = e;
  return best && best[1] * 2 >= slot.games.length ? best[0] : null;
}

/** Jogos da Coleção no espaço que não combinam com a etiqueta (categoria da Coleção ou regra da sua categoria). */
export function outOfLabel(slot: ShelfSlot | undefined, byId: Map<string, CatalogGame>, customs: ShelfCategory[] = []): ShelfGame[] {
  const ok = labelMatcher(slot?.label, customs);
  if (!slot || !ok) return [];
  return slot.games.filter((g) => {
    const cat = g.gameId ? byId.get(g.gameId) : undefined;
    return cat && !ok(cat);
  });
}

export interface GameLocation {
  shelfId: string;
  slotId: string;
  shelfName: string;
  slotName: string;
  roomName: string;
  level: string;
}

/** Os armários de jogos da planta, em ordem, com o nome que aparece ("Armário 2" se não tiver nome). */
export function gameShelves(plan: FloorPlan): { el: PlanElement; name: string; room: string }[] {
  const rooms = plan.elements.filter((e) => e.kind === "room" && e.label);
  const levelName = (id: string) => plan.levels.find((l) => l.id === id)?.name ?? "";
  const seq = { seat: 0, shelf: 0 };
  return plan.elements
    .filter((e) => e.kind === "gameshelf")
    .map((el) => {
      const seat = !!shelfModel(el).seat;
      const i = seat ? seq.seat++ : seq.shelf++;
      // Ambiente que contém o armário (o menor, se estiver em dois)
      const room = rooms
        .filter((r) => r.level === el.level && containsPoint(r, el))
        .sort((a, b) => a.w * a.d - b.w * b.d)[0];
      return { el, name: el.label?.trim() || `${seat ? "Pufe" : "Armário"} ${i + 1}`, room: room?.label ?? levelName(el.level) };
    });
}

/** Onde está cada jogo (por gameId, ou "nome:..." para avulsos). */
export function locateGames(plan: FloorPlan, contents: Map<string, ShelfContent>): Map<string, GameLocation[]> {
  const out = new Map<string, GameLocation[]>();
  for (const { el, name, room } of gameShelves(plan)) {
    const content = contents.get(el.id);
    if (!content) continue;
    for (const slot of shelfSlots(el)) {
      for (const g of content.slots[slot.id]?.games ?? []) {
        const k = g.gameId ?? `nome:${norm(g.name)}`;
        const loc: GameLocation = { shelfId: el.id, slotId: slot.id, shelfName: name, slotName: slot.label, roomName: room, level: el.level };
        out.set(k, [...(out.get(k) ?? []), loc]);
      }
    }
  }
  return out;
}

export function formatLocation(l: GameLocation): string {
  return [l.roomName, l.shelfName, l.slotName].filter(Boolean).join(" · ");
}

/** Jogos da Coleção que não estão em nenhum armário. */
export function unplacedGames(games: CatalogGame[], located: Map<string, GameLocation[]>): CatalogGame[] {
  return games.filter((g) => !located.has(g.id));
}

/**
 * Caixas de pé numa prateleira (vista de frente): lado a lado se cabem; senão,
 * uma por cima da outra (como lombadas), deixando ao menos 36% de cada capa à
 * mostra; se nem assim cabem, mostra as que dá e um "+N" no fim.
 * `overlap` é quanto cada caixa entra na anterior (negativo = espaço entre elas).
 */
export function layoutBoxes(n: number, boxW: number, avail: number, gap = 3): { shown: number; overlap: number } {
  if (n <= 1 || n * boxW + (n - 1) * gap <= avail) return { shown: n, overlap: -gap };
  const minStep = boxW * 0.36;
  const step = (avail - boxW) / (n - 1);
  if (step >= minStep) return { shown: n, overlap: boxW - step };
  const badge = Math.max(26, boxW * 0.64) + 4;
  const shown = Math.max(1, Math.floor((avail - badge - boxW) / minStep) + 1);
  return { shown: Math.min(n, shown), overlap: boxW - minStep };
}

/** Total de jogos guardados num armário. */
export function shelfCount(content: ShelfContent | undefined): number {
  if (!content) return 0;
  return Object.values(content.slots).reduce((s, sl) => s + sl.games.length, 0);
}

/** Cores das etiquetas do armário (para pintar no mapa). */
export function shelfColors(content: ShelfContent | undefined, customs: ShelfCategory[]): string[] {
  if (!content) return [];
  const out: string[] = [];
  for (const sl of Object.values(content.slots)) {
    const info = labelInfo(sl.label, customs);
    if (info && !out.includes(info.color)) out.push(info.color);
  }
  return out;
}

/** O armário tem algum espaço com a categoria? (etiqueta ou jogos dela) */
export function shelfHasCategory(content: ShelfContent | undefined, category: SlotLabel, byId: Map<string, CatalogGame>): boolean {
  if (!content) return false;
  return Object.values(content.slots).some(
    (sl) =>
      sameLabel(sl.label, category) ||
      (category.kind === "type" && sl.games.some((g) => g.gameId && byId.get(g.gameId)?.types.includes(category.name))),
  );
}

// ───────────────────────── dados do banco ─────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

export function sanitizeShelf(id: string, raw: unknown): ShelfContent {
  const out: ShelfContent = { id, slots: {} };
  if (!isObj(raw) || !isObj(raw.slots)) return out;
  for (const [slotId, v] of Object.entries(raw.slots)) {
    if (!/^[a-z0-9-]{1,20}$/.test(slotId) || !isObj(v)) continue;
    const slot: ShelfSlot = { games: [] };
    if (isObj(v.label)) {
      if (v.label.kind === "type" && str(v.label.name)) slot.label = { kind: "type", name: str(v.label.name)! };
      if (v.label.kind === "custom" && str(v.label.id)) slot.label = { kind: "custom", id: str(v.label.id)! };
    }
    if (Array.isArray(v.games)) {
      const seen = new Set<string>();
      for (const g of v.games.slice(0, 300)) {
        if (!isObj(g)) continue;
        const key = str(g.key, 40);
        const name = str(g.name, 120);
        if (!key || !name || seen.has(key)) continue;
        seen.add(key);
        const game: ShelfGame = { key, name };
        const gameId = str(g.gameId, 80);
        if (gameId) game.gameId = gameId;
        slot.games.push(game);
      }
    }
    out.slots[slotId] = slot;
  }
  return out;
}

export function slotForStorage(slot: ShelfSlot): ShelfSlot {
  const out: ShelfSlot = { games: slot.games.map((g) => (g.gameId ? { key: g.key, gameId: g.gameId, name: g.name } : { key: g.key, name: g.name })) };
  if (slot.label) out.label = slot.label.kind === "type" ? { kind: "type", name: slot.label.name } : { kind: "custom", id: slot.label.id };
  return out;
}

export function sanitizeCategories(raw: unknown): ShelfCategory[] {
  if (!isObj(raw) || !Array.isArray(raw.list)) return [];
  const out: ShelfCategory[] = [];
  for (const c of raw.list.slice(0, 100)) {
    if (!isObj(c)) continue;
    const id = str(c.id, 40);
    const name = str(c.name, 40);
    const color = typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : CATEGORY_COLORS[0];
    const rule = sanitizeRule(c.rule);
    if (id && name && !out.some((x) => x.id === id)) out.push(rule ? { id, name, color, rule } : { id, name, color });
  }
  return out;
}

// ───────────────────────── mudanças num espaço ─────────────────────────

export function newGameKey(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function addGameToSlot(slot: ShelfSlot | undefined, game: Omit<ShelfGame, "key">): ShelfSlot {
  const base = slot ?? { games: [] };
  if (game.gameId && base.games.some((g) => g.gameId === game.gameId)) return base;
  return { ...base, games: [...base.games, { key: newGameKey(), ...game }] };
}

export function removeGameFromSlot(slot: ShelfSlot | undefined, key: string): ShelfSlot {
  const base = slot ?? { games: [] };
  return { ...base, games: base.games.filter((g) => g.key !== key) };
}
