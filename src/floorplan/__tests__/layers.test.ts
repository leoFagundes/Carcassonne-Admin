import { describe, expect, it } from "vitest";
import { buildLayers, drawOrder, kindsOnLevel, layerName } from "../layers";
import { planForStorage, sanitizePlan } from "../sanitize";
import type { PlanElement } from "../types";

const el = (p: Partial<PlanElement> & Pick<PlanElement, "id" | "kind">): PlanElement => ({ level: "a", x: 0, y: 0, w: 1, d: 1, rot: 0, ...p });

const salao = el({ id: "salao", kind: "room", label: "Salão", x: 0, y: 0, w: 10, d: 10 });
const varanda = el({ id: "varanda", kind: "room", label: "Varanda", x: 20, y: 0, w: 6, d: 6 });
const mesa = el({ id: "m1", kind: "table", label: "12", x: 1, y: 1 });
const banco = el({ id: "b1", kind: "bench", x: 1, y: 2, parent: "m1" });
const parede = el({ id: "p1", kind: "wall", x: 3, y: 3, w: 4, d: 0.15 });
const vaso = el({ id: "v1", kind: "plant", x: 20, y: 1 });
const longe = el({ id: "t2", kind: "table", label: "Festa", x: 50, y: 50 });
const outroAndar = el({ id: "z", kind: "table", label: "1", level: "b" });
const all = [salao, varanda, mesa, banco, parede, vaso, longe, outroAndar];

describe("lista de camadas", () => {
  it("ordem de desenho: pela camada do tipo e, no mesmo tipo, pela ordem", () => {
    const order = drawOrder(all.filter((e) => e.level === "a")).map((e) => e.id);
    expect(order.indexOf("salao")).toBeLessThan(order.indexOf("m1"));
    expect(order.indexOf("salao")).toBeLessThan(order.indexOf("varanda"));
  });

  it("nomes: mesa vira 'Mesa 12'; sem nome, o tipo", () => {
    expect(layerName(mesa)).toBe("Mesa 12");
    expect(layerName(longe)).toBe("Festa");
    expect(layerName(el({ id: "x", kind: "table" }))).toBe("Mesa sem nome");
    expect(layerName(parede)).toBe("Parede");
    expect(layerName(el({ id: "bb", kind: "bench", variant: "back" }))).toBe("Banco com encosto");
  });

  it("por ambiente: cada um no seu, preso logo embaixo do pai, ambientes e soltos no fim", () => {
    const groups = buildLayers(all, "a", { groupBy: "room" });
    expect(groups.map((g) => g.title)).toEqual(["Salão", "Varanda", "Fora dos ambientes", "Ambientes e pisos"]);
    const salaoItems = groups[0].items;
    const iMesa = salaoItems.findIndex((i) => i.el.id === "m1");
    expect(salaoItems[iMesa + 1]).toMatchObject({ el: { id: "b1" }, depth: 1 });
    expect(groups[2].items.map((i) => i.el.id)).toEqual(["t2"]);
    // Só o andar escolhido
    expect(groups.flatMap((g) => g.items).some((i) => i.el.id === "z")).toBe(false);
  });

  it("de cima para baixo: quem é desenhado por último vem primeiro", () => {
    const [g] = buildLayers(all, "a", { groupBy: "none" });
    const ids = g.items.map((i) => i.el.id);
    expect(ids.indexOf("m1")).toBeLessThan(ids.indexOf("salao"));
  });

  it("busca por nome ou tipo (sem acento) e filtro de tipo", () => {
    expect(buildLayers(all, "a", { groupBy: "none", q: "salao" })[0].items.map((i) => i.el.id)).toEqual(["salao"]);
    expect(buildLayers(all, "a", { groupBy: "none", q: "mesa" })[0].items.map((i) => i.el.id).sort()).toEqual(["m1", "t2"]);
    expect(buildLayers(all, "a", { groupBy: "kind", kind: "wall" }).map((g) => g.title)).toEqual(["Parede"]);
    expect(buildLayers(all, "a", { q: "nada disso" })).toEqual([]);
    expect(kindsOnLevel(all, "a").find((k) => k.kind === "table")?.count).toBe(2);
  });

  it("escondido e travado são guardados e lidos de volta", () => {
    const plan = { levels: [{ id: "a", name: "A", order: 0 }], levelHeight: 3, elements: [{ ...mesa, hidden: true, locked: true }, parede] };
    const stored = planForStorage(plan);
    expect(stored.elements[0]).toMatchObject({ hidden: true, locked: true });
    expect(stored.elements[1].hidden).toBeUndefined();
    const back = sanitizePlan({ ...stored, version: 1 });
    expect(back?.elements.find((e) => e.id === "m1")).toMatchObject({ hidden: true, locked: true });
    expect(back?.elements.find((e) => e.id === "p1")?.locked).toBeUndefined();
  });
});
