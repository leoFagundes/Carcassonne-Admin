import { describe, expect, it } from "vitest";
import {
  activeAt,
  syncEnabledOn,
  withSyncChange,
  applyDay,
  autoGroupKey,
  computeDayStatus,
  emptyDay,
  formatMinutes,
  minutesOf,
  overlaps,
  suggestTables,
} from "../day";
import {
  boundsOf,
  containsPoint,
  insertVertex,
  moveVertex,
  normalizePolygon,
  rectPoints,
  removeVertex,
  resizeTo,
} from "../geometry";
import { createFromPalette, PALETTE, searchPalette } from "../palette";
import { planForStorage, sanitizePlan, sanitizeSettings, sanitizeTemplate } from "../sanitize";
import { suggestedSeats } from "../catalog";
import { SEED_PLAN } from "../seed";
import type { FloorPlan, MapReserve, PlanElement } from "../types";

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
let rid = 0;
const reserve = (p: Partial<MapReserve>): MapReserve => ({
  id: `r${++rid}`,
  name: "Ana",
  time: "19:00",
  adults: 2,
  childs: 0,
  status: "confirmed",
  ...p,
});

// 8 e 9 vizinhas; 10 longe; salas com 24 e 42
const PLAN: FloorPlan = {
  levelHeight: 3,
  levels: [{ id: "a", name: "A", order: 0 }],
  elements: [
    el({ id: "t8", x: 2, y: 2, label: "8", seats: 6 }),
    el({ id: "t9", x: 4.2, y: 2, label: "9", seats: 6 }),
    el({ id: "t10", x: 9, y: 2, label: "10", seats: 6 }),
    el({ id: "t2", x: 2, y: 5, label: "2", seats: 4, w: 1.2 }),
    el({ id: "salas", kind: "room", x: 20, y: 5, w: 4, d: 4, label: "Salas" }),
    el({ id: "t42", x: 19, y: 5, label: "42", seats: 8 }),
    el({ id: "t24", x: 21, y: 5, label: "24", seats: 8 }),
  ],
};
const status = (reserves: MapReserve[], opts = {}, patch?: (d: ReturnType<typeof emptyDay>) => void) => {
  const day = emptyDay("2026-11-12");
  patch?.(day);
  const layout = applyDay(PLAN, day);
  return { s: computeDayStatus(PLAN, day, layout, reserves, opts), layout };
};

describe("horário", () => {
  it("lê e escreve hora", () => {
    expect(minutesOf("19:30")).toBe(1170);
    expect(minutesOf("7:5")).toBe(425);
    expect(minutesOf("25:00")).toBeNull();
    expect(minutesOf("x")).toBeNull();
    expect(formatMinutes(1170)).toBe("19:30");
    expect(formatMinutes(1500)).toBe("01:00");
  });
  it("reserva ativa e sobreposição", () => {
    expect(activeAt({ time: "19:00" }, 19 * 60, 180)).toBe(true);
    expect(activeAt({ time: "19:00" }, 22 * 60, 180)).toBe(false);
    expect(activeAt({ time: "19:00" }, 18 * 60 + 59, 180)).toBe(false);
    expect(activeAt({ time: "" }, 0, 180)).toBe(true);
    expect(overlaps({ time: "17:00" }, { time: "19:30" }, 180)).toBe(true);
    expect(overlaps({ time: "17:00" }, { time: "20:00" }, 180)).toBe(false);
  });
});

describe("sincronizar com o campo mesa", () => {
  it('"8, 9" junta a 8 e a 9', () => {
    const { s } = status([reserve({ table: "8, 9" })], { autoSync: true });
    const u = s.unitOfTable.get("t8")!;
    expect(u.isAuto).toBe(true);
    expect(u.tableIds.sort()).toEqual(["t8", "t9"]);
    expect(u.key).toBe(autoGroupKey(["t9", "t8"]));
    expect(u.name).toBe("8, 9");
    expect(u.seats).toBe(12);
    expect(u.state).toBe("reserved");
    expect(s.unitOfTable.get("t9")).toBe(u);
  });
  it('"salas" junta as mesas do ambiente e leva o nome dele', () => {
    const { s } = status([reserve({ table: "salas" })], { autoSync: true });
    const u = s.unitOfTable.get("t24")!;
    expect(u.isAuto).toBe(true);
    expect(u.tableIds.sort()).toEqual(["t24", "t42"]);
    expect(u.name).toBe("Salas");
    expect(u.reserveName).toBe("24, 42");
  });
  it("desligado: cada mesa fica separada", () => {
    const { s } = status([reserve({ table: "8, 9" })], { autoSync: false });
    expect(s.unitOfTable.get("t8")!.isGroup).toBe(false);
    expect(s.unitOfTable.get("t9")!.state).toBe("reserved");
  });
  it("grupo manual vence o automático", () => {
    const { s } = status([reserve({ table: "8, 9" })], { autoSync: true }, (d) => {
      d.groups.g = { tables: ["t9", "t10"] };
    });
    expect(s.unitOfTable.get("t9")!.key).toBe("g");
    expect(s.unitOfTable.get("t8")!.isGroup).toBe(false);
    expect(s.unitOfTable.get("t8")!.state).toBe("reserved");
    expect(s.unitByKey.get("g")!.state).toBe("reserved");
  });
  it("mesa em duas reservas: a primeira do horário forma o grupo", () => {
    const { s } = status([reserve({ table: "9, 10", time: "20:00" }), reserve({ table: "8, 9", time: "17:00" })], { autoSync: true });
    expect(s.unitOfTable.get("t8")!.tableIds.sort()).toEqual(["t8", "t9"]);
    expect(s.unitOfTable.get("t10")!.isGroup).toBe(false);
    expect(s.unitOfTable.get("t10")!.state).toBe("reserved");
  });
  it("no horário escolhido, só junta o que está na mesa naquela hora", () => {
    const rs = [reserve({ table: "8, 9", time: "17:00" }), reserve({ table: "9, 10", time: "20:30" })];
    const { s } = status(rs, { autoSync: true, at: 21 * 60, stayMinutes: 180 });
    expect(s.unitOfTable.get("t9")!.tableIds.sort()).toEqual(["t10", "t9"]);
    expect(s.unitOfTable.get("t8")!.state).toBe("free");
  });
});

describe("por horário", () => {
  it("estado e próximas reservas", () => {
    const rs = [reserve({ table: "2", time: "17:00", isArrived: true }), reserve({ table: "2", time: "21:00" }), reserve({ table: "10", time: "19:30" })];
    const { s } = status(rs, { at: 18 * 60, stayMinutes: 120 });
    const t2 = s.unitByKey.get("t2")!;
    expect(t2.state).toBe("occupied");
    expect(t2.upcoming.map((r) => r.time)).toEqual(["21:00"]);
    expect(t2.dayReservations).toHaveLength(2);
    expect(s.unitByKey.get("t10")!.state).toBe("free");
    expect(s.unitByKey.get("t10")!.upcoming).toHaveLength(1);
    const later = status(rs, { at: 19 * 60 + 30, stayMinutes: 120 }).s;
    expect(later.unitByKey.get("t2")!.state).toBe("free"); // a de 17h já saiu
    expect(later.unitByKey.get("t10")!.state).toBe("reserved");
  });
  it("dia todo continua contando tudo", () => {
    const { s } = status([reserve({ table: "2", time: "17:00" }), reserve({ table: "2", time: "21:00" })]);
    expect(s.unitByKey.get("t2")!.reservations).toHaveLength(2);
  });
});

describe("conflitos", () => {
  it("duas reservas na mesma mesa no mesmo horário", () => {
    const { s } = status([reserve({ table: "2", time: "19:00" }), reserve({ table: "2, 10", time: "20:00" }), reserve({ table: "8", time: "19:00" })], { stayMinutes: 180 });
    expect(s.conflicts).toHaveLength(1);
    expect(s.conflicts[0].tableId).toBe("t2");
  });
  it("sem conflito quando uma sai antes da outra chegar", () => {
    const { s } = status([reserve({ table: "2", time: "17:00" }), reserve({ table: "2", time: "21:00" })], { stayMinutes: 180 });
    expect(s.conflicts).toHaveLength(0);
  });
});

describe("sugestão de mesa", () => {
  it("menor mesa livre que cabe o grupo", () => {
    const r = reserve({ table: "", adults: 4 });
    const { s, layout } = status([r, reserve({ table: "10", time: "19:00" })]);
    const sug = suggestTables(s, layout, r, 180);
    expect(sug[0].reserveName).toBe("2");
    expect(sug.some((x) => x.reserveName === "10")).toBe(false); // ocupada no horário
  });
  it("junta vizinhas quando nenhuma sozinha cabe", () => {
    const r = reserve({ table: "", adults: 11 });
    const { s, layout } = status([r]);
    const sug = suggestTables(s, layout, r, 180);
    expect(sug.find((x) => x.join)?.reserveName).toBe("8, 9");
    expect(sug.some((x) => x.join && x.reserveName.includes("10"))).toBe(false); // longe
  });
  it("ignora mesa indisponível e reserva que já saiu", () => {
    const r = reserve({ table: "", adults: 4, time: "21:00" });
    const { s, layout } = status([r, reserve({ table: "2", time: "17:00" })], {}, (d) => {
      d.manual.t8 = { state: "blocked", at: 1 };
    });
    const names = suggestTables(s, layout, r, 180).map((x) => x.reserveName);
    expect(names[0]).toBe("2");
    expect(names).not.toContain("8");
  });
});

describe("formato livre", () => {
  const poly = (pts: { x: number; y: number }[]) => el({ id: "p", kind: "room", x: 10, y: 10, w: 4, d: 4, points: pts });
  it("contém ponto e limites pelo contorno (L)", () => {
    const L = poly([
      { x: -2, y: -2 },
      { x: 0, y: -2 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: -2, y: 2 },
    ]);
    expect(containsPoint(L, { x: 9, y: 9 })).toBe(true);
    expect(containsPoint(L, { x: 11, y: 9 })).toBe(false); // o recorte do L
    expect(containsPoint(L, { x: 11, y: 11 })).toBe(true);
    expect(boundsOf([L])).toEqual({ minX: 8, minY: 8, maxX: 12, maxY: 12 });
  });
  it("mover, criar e apagar pontos recentraliza", () => {
    let r = poly(rectPoints(4, 4));
    r = moveVertex(r, 1, { x: 14, y: 8 }, 0.05); // canto NE vai 2 m para a direita
    expect(r.w).toBe(6);
    expect(r.x).toBe(11);
    expect(boundsOf([r])!.maxX).toBe(14);
    const more = insertVertex(r, 0);
    expect(more.points).toHaveLength(5);
    const less = removeVertex(more, 1);
    expect(less.points).toHaveLength(4);
    const tri = removeVertex(poly(rectPoints(1, 1)), 0);
    expect(tri.points).toHaveLength(3);
    expect(removeVertex(tri, 0).points).toHaveLength(3); // não fica com menos de 3
  });
  it("normaliza e redimensiona esticando os pontos", () => {
    const off = el({ id: "p", kind: "room", x: 0, y: 0, w: 1, d: 1, points: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }] });
    const n = normalizePolygon(off);
    expect([n.x, n.y, n.w, n.d]).toEqual([2, 1.5, 2, 1]);
    const big = resizeTo(n, "e", { x: 5, y: 1.5 }, 0.05);
    expect(big.w).toBe(4);
    expect(boundsOf([big])!.minX).toBeCloseTo(1);
  });
});

describe("dados novos no banco", () => {
  it("guarda formato, pontos e fundo", () => {
    const p = sanitizePlan({
      levelHeight: 3,
      version: 1,
      levels: [
        { id: "a", name: "A", order: 0, bg: { url: "https://x/y.jpg", path: "floor-plan/y.jpg", x: 0, y: 0, w: 12, h: 8, opacity: 2 } },
        { id: "b", name: "B", order: 1, bg: { url: "javascript:alert(1)", x: 0, y: 0, w: 1, h: 1 } },
      ],
      elements: [
        { id: "t", level: "a", kind: "table", x: 0, y: 0, w: 1, d: 1, rot: 0, shape: "round" },
        { id: "r", level: "a", kind: "room", x: 0, y: 0, w: 1, d: 1, rot: 0, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] },
        { id: "w", level: "a", kind: "wall", x: 0, y: 0, w: 1, d: 1, rot: 0, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], shape: "round" },
        { id: "q", level: "a", kind: "room", x: 0, y: 0, w: 1, d: 1, rot: 0, points: [{ x: 0, y: 0 }, { x: 1, y: "0" }] },
      ],
    })!;
    expect(p.levels[0].bg).toMatchObject({ url: "https://x/y.jpg", opacity: 1, path: "floor-plan/y.jpg" });
    expect(p.levels[1].bg).toBeUndefined();
    expect(p.elements.find((e) => e.id === "t")!.shape).toBe("round");
    expect(p.elements.find((e) => e.id === "r")!.points).toHaveLength(3);
    expect(p.elements.find((e) => e.id === "w")!.points).toBeUndefined();
    expect(p.elements.find((e) => e.id === "w")!.shape).toBeUndefined();
    expect(p.elements.find((e) => e.id === "q")!.points).toBeUndefined();
    const out = planForStorage(p);
    expect(JSON.stringify(out)).not.toContain("undefined");
    expect(out.levels[0].bg!.path).toBe("floor-plan/y.jpg");
    expect(sanitizePlan({ ...out, version: 2 })!.elements.find((e) => e.id === "r")!.points).toHaveLength(3);
  });
  it("configurações e modelos", () => {
    expect(sanitizeSettings(null)).toEqual({ syncHistory: [], stayMinutes: 180 });
    // O antigo "autoSync" sem data é ignorado (vale o padrão: ligada)
    expect(sanitizeSettings({ autoSync: false, stayMinutes: 5 })).toEqual({ syncHistory: [], stayMinutes: 30 });
    expect(
      sanitizeSettings({
        syncHistory: [
          { from: "2026-12-01", on: true },
          { from: "2026-11-12", on: false },
          { from: "ontem", on: true },
          { from: "2026-11-20", on: "sim" },
        ],
      }).syncHistory,
    ).toEqual([
      { from: "2026-11-12", on: false },
      { from: "2026-12-01", on: true },
    ]);
    expect(sanitizeTemplate("x", { name: "" })).toBeNull();
    const t = sanitizeTemplate("x", { name: "Evento", moves: { a: { x: 1, y: 2, rot: 0 } }, manual: { a: { state: "free" } }, createdAt: 5 })!;
    expect(t).toMatchObject({ id: "x", name: "Evento", createdAt: 5 });
    expect(Object.keys(t.moves)).toEqual(["a"]);
    expect("manual" in t).toBe(false);
  });
});

describe("paleta", () => {
  it("ids únicos e todos os tipos válidos", () => {
    const ids = PALETTE.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of PALETTE) {
      const e = createFromPalette(it, "a", { x: 1, y: 1 }, []);
      const p = sanitizePlan({ levels: [{ id: "a", name: "A" }], levelHeight: 3, elements: [e] })!;
      expect(p.elements[0].variant).toBe(e.variant);
    }
  });
  it("mesa redonda nasce com nome e lugares pelo formato", () => {
    const item = PALETTE.find((p) => p.id === "table-round")!;
    const t = createFromPalette(item, "a", { x: 0, y: 0 }, SEED_PLAN.elements);
    expect(t.shape).toBe("round");
    expect(t.label).toBe("106");
    expect(t.seats).toBe(5);
  });
  it("busca sem acento", () => {
    expect(searchPalette("televisao").map((p) => p.id)).toEqual(["tv"]);
    expect(searchPalette("mesa redonda").map((p) => p.id)).toEqual(["table-round"]);
    expect(searchPalette("").length).toBe(PALETTE.length);
  });
  it("lugares de mesa redonda e quadrada", () => {
    expect(suggestedSeats(1, 1, "round")).toBe(5);
    expect(suggestedSeats(1.8, 1, "round")).toBe(7);
    expect(suggestedSeats(0.9, 0.9)).toBe(4);
  });
});

describe("sincronização a partir do dia da mudança", () => {
  it("ligada por padrão, em qualquer dia", () => {
    expect(syncEnabledOn([], "2020-01-01")).toBe(true);
    expect(syncEnabledOn([], "2030-01-01")).toBe(true);
  });
  it("desligar hoje não mexe nos dias anteriores", () => {
    const h = withSyncChange([], "2026-11-12", false);
    expect(h).toEqual([{ from: "2026-11-12", on: false }]);
    expect(syncEnabledOn(h, "2026-11-11")).toBe(true);
    expect(syncEnabledOn(h, "2026-11-12")).toBe(false);
    expect(syncEnabledOn(h, "2026-12-25")).toBe(false);
  });
  it("religar depois mantém o período desligado", () => {
    let h = withSyncChange([], "2026-11-12", false);
    h = withSyncChange(h, "2026-11-20", true);
    expect(syncEnabledOn(h, "2026-11-11")).toBe(true);
    expect(syncEnabledOn(h, "2026-11-15")).toBe(false);
    expect(syncEnabledOn(h, "2026-11-20")).toBe(true);
  });
  it("mudar de novo no mesmo dia troca a mudança do dia (e some se voltar ao que era)", () => {
    let h = withSyncChange([], "2026-11-12", false);
    h = withSyncChange(h, "2026-11-12", true);
    expect(h).toEqual([]);
    h = withSyncChange(h, "2026-11-12", false);
    expect(h).toEqual([{ from: "2026-11-12", on: false }]);
  });
  it("mudança marcada para depois de hoje é substituída", () => {
    const h = withSyncChange([{ from: "2026-12-01", on: false }], "2026-11-12", false);
    expect(h).toEqual([{ from: "2026-11-12", on: false }]);
  });
});
