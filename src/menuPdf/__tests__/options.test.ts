import { describe, expect, it } from "vitest";
import { applyOptions, DEFAULT_OPTIONS, isEmpty, sanitizeOptions } from "../options";
import type { MenuModel } from "../model";

const model: MenuModel = {
  infos: [{ name: "Passaporte", description: "", values: [] }],
  combos: [{ name: "Carcapromo", description: "", value: "R$ 72" }],
  sections: [
    { id: "pizzas", title: "Pizzas", groups: [], count: 12 },
    { id: "drinks", title: "Drinks", groups: [], count: 20 },
  ],
  itemCount: 32,
};

describe("opções do PDF do cardápio", () => {
  it("lê o salvo no navegador e ignora o que não presta", () => {
    expect(sanitizeOptions(null)).toEqual(DEFAULT_OPTIONS);
    expect(sanitizeOptions("lixo")).toEqual(DEFAULT_OPTIONS);
    const o = sanitizeOptions({ theme: "white", cover: false, photos: "não", hidden: ["Drinks", 3, "", "Drinks"], extra: 1 });
    expect(o.theme).toBe("white");
    expect(o.cover).toBe(false);
    expect(o.photos).toBe(true);
    expect(o.hidden).toEqual(["Drinks"]);
    expect(o).not.toHaveProperty("extra");
    expect(sanitizeOptions({ theme: "azul" }).theme).toBe("black");
  });

  it("tira avisos, combos e as categorias escondidas; recalcula os itens", () => {
    const m = applyOptions(model, { ...DEFAULT_OPTIONS, infos: false, hidden: ["Drinks"] });
    expect(m.infos).toEqual([]);
    expect(m.combos).toHaveLength(1);
    expect(m.sections.map((s) => s.title)).toEqual(["Pizzas"]);
    expect(m.itemCount).toBe(12);
    expect(isEmpty(m)).toBe(false);
  });

  it("vazio quando não sobra nada", () => {
    const m = applyOptions(model, { ...DEFAULT_OPTIONS, infos: false, combos: false, hidden: ["Pizzas", "Drinks"] });
    expect(isEmpty(m)).toBe(true);
    expect(m.itemCount).toBe(0);
  });
});

describe("abertura e itens ocultos", () => {
  it("padrão: com abertura, sem ocultos; lê o salvo", () => {
    expect(DEFAULT_OPTIONS.masthead).toBe(true);
    expect(DEFAULT_OPTIONS.showHidden).toBe(false);
    const o = sanitizeOptions({ masthead: false, showHidden: true });
    expect(o.masthead).toBe(false);
    expect(o.showHidden).toBe(true);
  });
});
