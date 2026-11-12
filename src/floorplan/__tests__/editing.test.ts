import { describe, expect, it } from "vitest";
import {
  alignElements,
  attachTo,
  createElement,
  deleteElements,
  detach,
  duplicateElements,
  nextTableName,
  planProblems,
  planSummary,
  updateElement,
} from "../editing";
import type { FloorPlan, PlanElement } from "../types";

const el = (p: Partial<PlanElement> & Pick<PlanElement, "id">): PlanElement => ({
  level: "a",
  kind: "table",
  x: 0,
  y: 0,
  w: 2,
  d: 0.8,
  rot: 0,
  ...p,
});

const PLAN: FloorPlan = {
  levelHeight: 3,
  levels: [
    { id: "a", name: "A", order: 0 },
    { id: "b", name: "B", order: 1 },
  ],
  elements: [
    el({ id: "t1", x: 2, y: 2, label: "1", seats: 6 }),
    el({ id: "b1", kind: "bench", x: 2, y: 1.4, w: 2, d: 0.33, parent: "t1" }),
    el({ id: "t2", x: 6, y: 3, label: "02", seats: 6 }),
    el({ id: "s1", kind: "sofa", x: 9, y: 9, w: 2, d: 0.5 }),
  ],
};

describe("editar a planta", () => {
  it("próximo nome de mesa", () => {
    expect(nextTableName(PLAN.elements)).toBe("3");
    expect(nextTableName([])).toBe("1");
  });
  it("cria mesa com nome e lugares", () => {
    const t = createElement("table", "a", { x: 1.234, y: 5 }, PLAN.elements);
    expect(t).toMatchObject({ kind: "table", label: "3", seats: 6, x: 1.23, variant: "wood" });
    expect(createElement("room", "a", { x: 0, y: 0 }, []).label).toBe("Novo ambiente");
  });
  it("mudar posição leva o banco; mudar nome não", () => {
    const p = updateElement(PLAN, "t1", { x: 3 });
    expect(p.elements.find((e) => e.id === "b1")!.x).toBe(3);
    const q = updateElement(PLAN, "t1", { label: "Varanda" });
    expect(q.elements.find((e) => e.id === "t1")!.label).toBe("Varanda");
    expect(q.elements.find((e) => e.id === "b1")!.x).toBe(2);
  });
  it("apaga campo com undefined e troca de andar com o que está preso", () => {
    const p = updateElement(PLAN, "b1", { parent: undefined });
    expect("parent" in p.elements.find((e) => e.id === "b1")!).toBe(false);
    const q = updateElement(PLAN, "t1", { level: "b" });
    expect(q.elements.filter((e) => e.level === "b").map((e) => e.id).sort()).toEqual(["b1", "t1"]);
  });
  it("excluir leva o que está preso", () => {
    expect(deleteElements(PLAN, ["t1"]).elements.map((e) => e.id)).toEqual(["t2", "s1"]);
  });
  it("duplicar copia o que está preso e dá nome novo à mesa", () => {
    const { plan, ids } = duplicateElements(PLAN, ["t1"]);
    expect(plan.elements).toHaveLength(6);
    const copy = plan.elements.find((e) => e.id === ids[0])!;
    expect(copy.label).toBe("3");
    expect(copy.x).toBe(2.3);
    const bench = plan.elements.find((e) => e.kind === "bench" && e.id !== "b1")!;
    expect(bench.parent).toBe(copy.id);
  });
  it("alinha à esquerda sem mover duas vezes o que está preso", () => {
    const p = alignElements(PLAN, ["t1", "t2", "b1"], "left");
    expect(p.elements.find((e) => e.id === "t2")!.x).toBe(2);
    expect(p.elements.find((e) => e.id === "b1")!.x).toBe(2);
    const q = alignElements(PLAN, ["t1", "t2"], "top");
    expect(q.elements.find((e) => e.id === "t2")!.y).toBe(2);
  });
  it("prender e soltar sem criar laço", () => {
    const p = attachTo(PLAN, ["s1", "t1"], "b1"); // t1 → b1 seria laço
    expect(p.elements.find((e) => e.id === "s1")!.parent).toBe("b1");
    expect(p.elements.find((e) => e.id === "t1")!.parent).toBeUndefined();
    expect(detach(p, ["s1"]).elements.find((e) => e.id === "s1")!.parent).toBeUndefined();
  });
  it("problemas: sem nome e repetido", () => {
    const bad: FloorPlan = {
      ...PLAN,
      elements: [...PLAN.elements, el({ id: "t3", label: "2" }), el({ id: "t4", label: " " })],
    };
    const probs = planProblems(bad);
    expect(probs).toHaveLength(2);
    expect(probs[1].ids.sort()).toEqual(["t2", "t3"]);
    expect(planProblems(PLAN)).toHaveLength(0);
  });
  it("resumo por andar", () => {
    expect(planSummary(PLAN)).toEqual([
      { level: "a", tables: 2, seats: 12 },
      { level: "b", tables: 0, seats: 0 },
    ]);
  });
});
