import { describe, expect, it } from "vitest";
import { groupOutline, outlinePath, unionOutline } from "../groupOutline";
import { pointInPolygon } from "../geometry";

// Mesas 1,2 × 0,8 (como na tela): 2 e 3 em cima, 7 e 8 embaixo, com bancos no meio
const box = (cx: number, cy: number) => ({ minX: cx - 0.6, maxX: cx + 0.6, minY: cy - 0.4, maxY: cy + 0.4 });
const m2 = box(0, 0);
const m3 = box(2, 0);
const m7 = box(0, 2);
const m8 = box(2, 2);
const inside = (loops: { x: number; y: number }[][], p: { x: number; y: number }) => loops.some((l) => pointInPolygon(l, p));

describe("contorno do grupo de mesas", () => {
  it("2, 3 e 7 juntas: o contorno é um L e a 8 fica de fora", () => {
    const loops = groupOutline([m2, m3, m7], 0.12);
    expect(loops).toHaveLength(1);
    expect(inside(loops, { x: 0, y: 0 })).toBe(true);
    expect(inside(loops, { x: 2, y: 0 })).toBe(true);
    expect(inside(loops, { x: 0, y: 2 })).toBe(true);
    // Os bancos entre as juntas ficam dentro
    expect(inside(loops, { x: 1, y: 0 })).toBe(true);
    expect(inside(loops, { x: 0, y: 1 })).toBe(true);
    // A 8 (e o banco entre a 3 e a 8) fica fora
    expect(inside(loops, { x: 2, y: 2 })).toBe(false);
    expect(inside(loops, { x: 2, y: 1.2 })).toBe(false);
    // Um L tem 6 cantos
    expect(loops[0]).toHaveLength(6);
  });

  it("quatro em quadrado: um retângulo só", () => {
    const loops = groupOutline([m2, m3, m7, m8], 0.1);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toHaveLength(4);
  });

  it("união de retângulos separados dá dois contornos; caminho SVG fechado", () => {
    const loops = unionOutline([
      { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      { minX: 3, minY: 0, maxX: 4, maxY: 1 },
    ]);
    expect(loops).toHaveLength(2);
    const d = outlinePath(loops, 100, 8);
    expect(d.match(/Z/g)).toHaveLength(2);
    expect(d.startsWith("M")).toBe(true);
  });
});
