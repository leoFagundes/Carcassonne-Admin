import { describe, expect, it } from "vitest";
import {
  addGameToSlot,
  formatLocation,
  gameShelves,
  labelInfo,
  locateGames,
  outOfLabel,
  removeGameFromSlot,
  sanitizeCategories,
  sanitizeShelf,
  searchGames,
  shelfColors,
  shelfCount,
  shelfHasCategory,
  shelfSlots,
  SHELF_MODELS,
  slotForStorage,
  suggestSlotLabel,
  typeColor,
  unplacedGames,
  type CatalogGame,
  type ShelfContent,
} from "../shelves";
import type { FloorPlan, PlanElement } from "../types";

const el = (p: Partial<PlanElement> & Pick<PlanElement, "id">): PlanElement => ({ level: "a", kind: "gameshelf", x: 0, y: 0, w: 0.85, d: 0.45, rot: 0, ...p });

const PLAN: FloorPlan = {
  levelHeight: 3,
  levels: [{ id: "a", name: "Subsolo", order: 0 }],
  elements: [
    el({ id: "salao", kind: "room", x: 5, y: 5, w: 10, d: 10, label: "Salão" }),
    el({ id: "e1", x: 2, y: 2, variant: "hutch-open" }),
    el({ id: "e2", x: 30, y: 2, variant: "cubes", w: 0.45, label: "Torre do corredor" }),
  ],
};

const GAMES: CatalogGame[] = [
  { id: "catan", name: "Catan", types: ["Estratégia", "Negociação"] },
  { id: "azul", name: "Azul", types: ["Estratégia", "Família"] },
  { id: "dixit", name: "Dixit", types: ["Party Game"] },
  { id: "wonders", name: "7 Wonders", types: ["Estratégia"] },
];
const byId = new Map(GAMES.map((g) => [g.id, g]));

describe("modelos", () => {
  it("espaços de cada modelo, de cima para baixo e dentro do móvel", () => {
    for (const m of Object.values(SHELF_MODELS)) {
      const slots = m.slots(m.w);
      expect(slots[0].id).toBe("top");
      expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
      for (const s of slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(m.w + 1e-9);
        if (s.kind !== "top") expect(s.y + s.h).toBeLessThanOrEqual(m.height);
      }
      for (let i = 2; i < slots.length; i++) expect(slots[i].y).toBeGreaterThan(slots[i - 1].y);
    }
  });
  it("estante alta: 3 prateleiras, gaveta e 2 embaixo; com portas, embaixo fica atrás das portas", () => {
    const open = shelfSlots({ variant: "hutch-open", w: 0.85 }).map((s) => s.id);
    expect(open).toEqual(["top", "u1", "u2", "u3", "drawer", "l1", "l2"]);
    expect(shelfSlots({ variant: "hutch-doors", w: 0.85 }).filter((s) => s.kind === "doors")).toHaveLength(2);
    expect(shelfSlots({ variant: "cubes", w: 0.45 }).map((s) => s.id)).toEqual(["top", "c1", "c2", "c3", "c4"]);
    expect(shelfSlots({ variant: "lowcab", w: 1 }).map((s) => s.id)).toEqual(["top", "drawer", "d1", "d2"]);
    expect(shelfSlots({ variant: "inventado", w: 0.85 })[1].id).toBe("u1");
  });
});

describe("onde está cada jogo", () => {
  const contents = new Map<string, ShelfContent>([
    ["e1", { id: "e1", slots: { u1: { games: [{ key: "k1", gameId: "catan", name: "Catan" }, { key: "k2", name: "Jogo do vizinho" }] } } }],
    ["e2", { id: "e2", slots: { c2: { games: [{ key: "k3", gameId: "catan", name: "Catan" }] } } }],
    ["sumiu", { id: "sumiu", slots: { u1: { games: [{ key: "k4", gameId: "azul", name: "Azul" }] } } }],
  ]);
  it("nomes dos armários e ambiente", () => {
    expect(gameShelves(PLAN).map((s) => [s.name, s.room])).toEqual([
      ["Armário 1", "Salão"],
      ["Torre do corredor", "Subsolo"],
    ]);
  });
  it("localiza da Coleção e avulsos, ignora armário que não existe mais", () => {
    const loc = locateGames(PLAN, contents);
    expect(loc.get("catan")!.map(formatLocation)).toEqual(["Salão · Armário 1 · Prateleira 1", "Subsolo · Torre do corredor · Nicho 2"]);
    expect(loc.get("nome:jogo do vizinho")).toHaveLength(1);
    expect(loc.has("azul")).toBe(false);
    expect(unplacedGames(GAMES, loc).map((g) => g.id)).toEqual(["azul", "dixit", "wonders"]);
    expect(shelfCount(contents.get("e1"))).toBe(2);
  });
});

describe("etiquetas", () => {
  it("sugere a categoria que mais aparece", () => {
    const slot = { games: [{ key: "1", gameId: "catan", name: "Catan" }, { key: "2", gameId: "azul", name: "Azul" }, { key: "3", gameId: "dixit", name: "Dixit" }] };
    expect(suggestSlotLabel(slot, byId)).toBe("Estratégia");
    expect(suggestSlotLabel({ games: [slot.games[0]] }, byId)).toBeNull();
    expect(suggestSlotLabel({ games: [{ key: "x", name: "Avulso" }, { key: "y", name: "Outro" }] }, byId)).toBeNull();
  });
  it("avisa o que está fora da categoria (só categoria da Coleção)", () => {
    const games = [{ key: "1", gameId: "catan", name: "Catan" }, { key: "3", gameId: "dixit", name: "Dixit" }, { key: "4", name: "Avulso" }];
    expect(outOfLabel({ label: { kind: "type", name: "Estratégia" }, games }, byId).map((g) => g.name)).toEqual(["Dixit"]);
    expect(outOfLabel({ label: { kind: "custom", id: "c" }, games }, byId)).toEqual([]);
  });
  it("categoria criada pelo gerente tem nome e cor próprios", () => {
    const customs = [{ id: "c1", name: "Para crianças", color: "#f472b6" }];
    expect(labelInfo({ kind: "custom", id: "c1" }, customs)).toEqual({ text: "Para crianças", color: "#f472b6", custom: true });
    expect(labelInfo({ kind: "custom", id: "apagada" }, customs)).toBeNull();
    expect(labelInfo({ kind: "type", name: "Estratégia" }, customs)!.color).toBe(typeColor("Estratégia"));
    const content: ShelfContent = { id: "e", slots: { u1: { label: { kind: "custom", id: "c1" }, games: [] }, u2: { label: { kind: "type", name: "Party Game" }, games: [{ key: "a", gameId: "azul", name: "Azul" }] } } };
    expect(shelfColors(content, customs)).toEqual(["#f472b6", typeColor("Party Game")]);
    expect(shelfHasCategory(content, { kind: "custom", id: "c1" }, byId)).toBe(true);
    expect(shelfHasCategory(content, { kind: "type", name: "Família" }, byId)).toBe(true); // Azul é Família
    expect(shelfHasCategory(content, { kind: "type", name: "Blefe" }, byId)).toBe(false);
  });
});

describe("mudanças e banco", () => {
  it("adiciona sem repetir jogo da Coleção e remove", () => {
    let s = addGameToSlot(undefined, { gameId: "catan", name: "Catan" });
    s = addGameToSlot(s, { gameId: "catan", name: "Catan" });
    s = addGameToSlot(s, { name: "Avulso" });
    expect(s.games.map((g) => g.name)).toEqual(["Catan", "Avulso"]);
    expect(removeGameFromSlot(s, s.games[0].key).games.map((g) => g.name)).toEqual(["Avulso"]);
  });
  it("limpa o que vem do banco", () => {
    const c = sanitizeShelf("e1", {
      slots: {
        u1: { label: { kind: "type", name: "Estratégia" }, games: [{ key: "a", gameId: "catan", name: "Catan" }, { key: "a", name: "dup" }, { name: "sem chave" }] },
        "x y": { games: [] },
        u2: { label: { kind: "outro" }, games: "não" },
      },
    });
    expect(Object.keys(c.slots)).toEqual(["u1", "u2"]);
    expect(c.slots.u1.games).toEqual([{ key: "a", gameId: "catan", name: "Catan" }]);
    expect(c.slots.u2).toEqual({ games: [] });
    expect(JSON.stringify(slotForStorage({ games: [{ key: "a", name: "x" }] }))).not.toContain("undefined");
    expect(sanitizeCategories({ list: [{ id: "a", name: "Kids", color: "#ABCDEF" }, { id: "a", name: "dup" }, { id: "b", name: "", color: "x" }, { id: "c", name: "Ok", color: "red" }] })).toEqual([
      { id: "a", name: "Kids", color: "#ABCDEF" },
      { id: "c", name: "Ok", color: "#e6c56b" },
    ]);
  });
  it("busca sem acento", () => {
    expect(searchGames(GAMES, "catan").map((g) => g.id)).toEqual(["catan"]);
    expect(searchGames([{ name: "Pânico em Wall Street" }], "panico wall")).toHaveLength(1);
  });
});
