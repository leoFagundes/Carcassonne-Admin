import { describe, expect, it } from "vitest";
import type { InfoType, TypeOrderType } from "@/types";
import {
  countItems,
  infosChanged,
  infosToSave,
  missingSubtypes,
  missingTypes,
  nameError,
  normalizeInfos,
  normalizeTypes,
  sortInfos,
  stableKey,
  subtypeKey,
  subtypeKeys,
  typesChanged,
  typesToSave,
} from "./menuOrganizer";

const entry = (id: string | undefined, name: string, order: number, subs: string[] = [], extra = {}): TypeOrderType => ({
  id,
  type: { name, order, subtypes: subs.map((s, i) => ({ name: s, order: i })), ...extra },
});

describe("normalizeTypes", () => {
  it("renumera categorias e subcategorias pela posição", () => {
    const list = [entry("b", "Bebidas", 5, ["Vinhos", "Cervejas"]), entry("p", "Pizzas", 0)];
    list[0].type.subtypes[0].order = 9;
    const out = normalizeTypes(list);
    expect(out.map((e) => e.type.order)).toEqual([0, 1]);
    expect(out[0].type.subtypes.map((s) => s.order)).toEqual([0, 1]);
    // não altera a lista original
    expect(list[0].type.order).toBe(5);
  });
});

describe("stableKey", () => {
  it("ignora a ordem das chaves", () => {
    expect(stableKey({ a: 1, b: { c: 2, d: 3 } })).toBe(stableKey({ b: { d: 3, c: 2 }, a: 1 }));
    expect(stableKey([1, 2])).not.toBe(stableKey([2, 1]));
  });
});

describe("typesChanged", () => {
  const base = [entry("a", "Bebidas", 0, ["Vinhos"]), entry("b", "Pizzas", 1)];

  it("não acusa mudança só por a ordem salva estar desatualizada", () => {
    const stale = [entry("a", "Bebidas", 0, ["Vinhos"]), entry("b", "Pizzas", 0)];
    expect(typesChanged(stale, stale)).toBe(false);
  });

  it("acusa troca de posição, subcategoria e ilustração", () => {
    expect(typesChanged([base[1], base[0]], base)).toBe(true);
    expect(typesChanged([entry("a", "Bebidas", 0, ["Vinhos", "Sucos"]), base[1]], base)).toBe(true);
    expect(typesChanged([entry("a", "Bebidas", 0, ["Vinhos"], { illustration: "chope" }), base[1]], base)).toBe(true);
  });
});

describe("typesToSave", () => {
  it("grava só o que mudou, já normalizado", () => {
    const saved = [entry("a", "Bebidas", 0), entry("b", "Pizzas", 1), entry("c", "Porções", 2)];
    const current = [saved[0], saved[2], saved[1]];
    expect(typesToSave(current, saved)).toEqual([
      { id: "c", type: { name: "Porções", order: 1, subtypes: [] } },
      { id: "b", type: { name: "Pizzas", order: 2, subtypes: [] } },
    ]);
  });

  it("corrige ordens repetidas do banco ao salvar", () => {
    const saved = [entry("a", "Bebidas", 0), entry("b", "Pizzas", 0)];
    expect(typesToSave(saved, saved).map((s) => s.id)).toEqual(["b"]);
  });

  it("nada a gravar quando está igual, e ignora quem não tem id", () => {
    const saved = [entry("a", "Bebidas", 0)];
    expect(typesToSave(saved, saved)).toEqual([]);
    expect(typesToSave([...saved, entry(undefined, "Novo", 1)], saved)).toEqual([]);
  });

  it("tirar a ilustração conta como mudança", () => {
    const saved = [entry("a", "Bebidas", 0, [], { illustration: "chope" })];
    expect(typesToSave([entry("a", "Bebidas", 0)], saved)).toEqual([
      { id: "a", type: { name: "Bebidas", order: 0, subtypes: [] } },
    ]);
  });
});

const info = (id: string, orderPriority?: number): InfoType => ({ id, name: id, description: "", values: [], orderPriority }) as InfoType;

describe("avisos", () => {
  it("ordena como o site (sem prioridade conta como 0)", () => {
    expect(sortInfos([info("b", 1), info("a"), info("c", 2)]).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("normaliza, detecta e grava só as prioridades que mudaram", () => {
    const saved = [info("a", 0), info("b", 1), info("c", 2)];
    const moved = normalizeInfos([saved[2], saved[0], saved[1]]);
    expect(moved.map((i) => i.orderPriority)).toEqual([0, 1, 2]);
    expect(infosChanged(moved, saved)).toBe(true);
    expect(infosChanged(saved, saved)).toBe(false);
    expect(infosToSave(moved, saved)).toEqual([
      { id: "c", orderPriority: 0 },
      { id: "a", orderPriority: 1 },
      { id: "b", orderPriority: 2 },
    ]);
    expect(infosToSave(saved, saved)).toEqual([]);
  });
});

describe("nameError", () => {
  it("recusa vazio e repetido (sem diferenciar acento e maiúscula)", () => {
    expect(nameError("  ", ["Bebidas"], "categoria")).toBe("Escreva o nome da categoria.");
    expect(nameError("porcoes", ["Porções"], "categoria")).toBe('Já existe "Porções" na lista (só muda acento ou maiúscula).');
    expect(nameError(" Porções ", ["Porções"], "categoria")).toBe('"Porções" já está na lista.');
    expect(nameError("Pizzas", ["Porções"], "categoria")).toBeNull();
  });
});

describe("sugestões", () => {
  const items = [
    { type: "Bebidas", subtype: "Vinhos" },
    { type: "Bebidas", subtype: "Sucos" },
    { type: "bebidas", subtype: "Sucos" },
    { type: "Pizzas", subtype: "Doces" },
    { type: "Porções" },
    { type: "Sobremesas" },
    { type: "" },
  ];

  it("lista categorias dos itens que faltam na ordenação, sem repetir e com o nome exato (como o site)", () => {
    expect(missingTypes(items, [entry("a", "Bebidas", 0), entry("b", "Pizzas", 1)])).toEqual([
      "bebidas",
      "Porções",
      "Sobremesas",
    ]);
  });

  it("lista subcategorias da própria categoria que faltam", () => {
    expect(missingSubtypes(items, entry("a", "Bebidas", 0, ["Vinhos"]))).toEqual(["Sucos"]);
    expect(missingSubtypes(items, entry("b", "Pizzas", 1, ["Doces"]))).toEqual([]);
  });
});

describe("countItems", () => {
  it("conta por categoria e por subcategoria", () => {
    const { byType, bySubtype } = countItems([
      { type: "Bebidas", subtype: "Vinhos" },
      { type: "Bebidas" },
      { type: "Pizzas", subtype: "Doces" },
    ]);
    expect(byType.get("Bebidas")).toBe(2);
    expect(bySubtype.get(subtypeKey("Bebidas", "Vinhos"))).toBe(1);
    expect(bySubtype.get(subtypeKey("Pizzas", "Vinhos"))).toBeUndefined();
  });
});

describe("subtypeKeys", () => {
  it("diferencia nomes repetidos", () => {
    expect(subtypeKeys([{ name: "A" }, { name: "B" }, { name: "A" }])).toEqual(["A#0", "B#0", "A#1"]);
  });
});
