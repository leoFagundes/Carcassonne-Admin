import { describe, expect, it } from "vitest";
import { buildMenuModel, rows, slug, tocEntries } from "../model";
import type { MenuItemType, TypeOrderType } from "@/types";

const item = (p: Partial<MenuItemType>): MenuItemType => ({
  name: "X",
  description: "",
  value: "R$ 10",
  type: "Drinks",
  isVegan: false,
  isFocus: false,
  isVisible: true,
  ...p,
});

const order: TypeOrderType[] = [
  { type: { name: "Drinks", order: 2, subtypes: [{ name: "Clássicos", order: 2 }, { name: "Autorais", order: 1 }] } },
  { type: { name: "Pizzas", order: 1, illustration: "pizza", subtypes: [] } },
];

describe("modelo do PDF do cardápio", () => {
  const model = buildMenuModel({
    items: [
      item({ id: "a", name: "Zeta", type: "Drinks", subtype: "Clássicos" }),
      item({ id: "b", name: "Alfa", type: "Drinks", subtype: "Autorais" }),
      item({ id: "c", name: "Beta", type: "Drinks", subtype: "Clássicos", isFocus: true }),
      item({ id: "d", name: "Água", type: "Drinks" }),
      item({ id: "e", name: "Margherita", type: "Pizzas", image: "" }),
      item({ id: "f", name: "Escondida", type: "Pizzas", isVisible: false }),
      item({ id: "g", name: "Sem ordem", type: "Ação & Cia" }),
    ],
    combos: [],
    infos: [
      { name: "B", description: "", values: [], orderPriority: 2 },
      { name: "A", description: "", values: [], orderPriority: 1 },
    ],
    descriptions: [{ type: "Pizzas", description: "  Massa fina  " }],
    typesOrder: order,
  });

  it("categorias pela ordenação; as sem ordem vão para o fim", () => {
    expect(model.sections.map((s) => s.title)).toEqual(["Pizzas", "Drinks", "Ação & Cia"]);
    expect(model.itemCount).toBe(6);
  });

  it("itens soltos primeiro, depois os subtipos pela ordem deles; destaque antes, depois por nome", () => {
    const drinks = model.sections[1];
    expect(drinks.groups.map((g) => g.name)).toEqual([undefined, "Autorais", "Clássicos"]);
    expect(drinks.groups[2].items.map((i) => i.name)).toEqual(["Beta", "Zeta"]);
    expect(drinks.count).toBe(4);
  });

  it("sem foto usa a ilustração da categoria; esconde os invisíveis; descrição sem espaços", () => {
    const pizzas = model.sections[0];
    expect(pizzas.groups[0].items).toHaveLength(1);
    expect(pizzas.groups[0].items[0].image).toBe("/images/ilustracoes/png/pizza.png");
    expect(pizzas.subtitle).toBe("Massa fina");
  });

  it("avisos pela prioridade; âncoras únicas e sem acento", () => {
    expect(model.infos.map((i) => i.name)).toEqual(["A", "B"]);
    expect(model.sections[2].id).toBe("acao-cia");
    const used = new Set<string>(["avisos"]);
    expect(slug("Avisos", used)).toBe("avisos-2");
    expect(slug("!!!", used)).toBe("secao");
  });

  it("sumário inclui avisos só quando há; linhas de dois", () => {
    expect(tocEntries(model).map((e) => e.id)).toEqual(["avisos", "pizzas", "drinks", "acao-cia"]);
    expect(rows([1, 2, 3])).toEqual([[1, 2], [3]]);
  });
});

describe("texto do PDF", () => {
  it("tira emojis e espaços repetidos", async () => {
    const { clean } = await import("../model");
    expect(clean("  Chope 🍺 gelado  ")).toBe("Chope gelado");
    expect(clean("Vegano 🌱️")).toBe("Vegano");
    expect(clean("Ação – R$ 10,00")).toBe("Ação – R$ 10,00");
    expect(clean(undefined)).toBe("");
  });
});

describe("itens ocultos", () => {
  it("só entram quando pedido", () => {
    const items = [item({ id: "a", name: "Visível" }), item({ id: "b", name: "Oculto", isVisible: false })];
    const base = { items, combos: [], infos: [], descriptions: [], typesOrder: [] };
    expect(buildMenuModel(base).itemCount).toBe(1);
    const all = buildMenuModel({ ...base, includeHidden: true });
    expect(all.itemCount).toBe(2);
    expect(all.sections[0].groups[0].items.map((i) => i.name)).toEqual(["Oculto", "Visível"]);
  });
});

describe("escolher quais ocultos entram", () => {
  it("com os ocultos ligados, os da lista de fora não entram; os visíveis sempre entram", () => {
    const items = [
      item({ id: "v", name: "Visível" }),
      item({ id: "o1", name: "Oculto 1", isVisible: false }),
      item({ id: "o2", name: "Oculto 2", isVisible: false }),
    ];
    const base = { items, combos: [], infos: [], descriptions: [], typesOrder: [] };
    const names = (m: ReturnType<typeof buildMenuModel>) => m.sections.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.name)));
    expect(names(buildMenuModel({ ...base, includeHidden: true, skipHidden: new Set(["o2", "v"]) }))).toEqual(["Oculto 1", "Visível"]);
    expect(names(buildMenuModel({ ...base, includeHidden: false, skipHidden: new Set() }))).toEqual(["Visível"]);
  });
});
