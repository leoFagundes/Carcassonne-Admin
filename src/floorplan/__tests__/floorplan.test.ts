import { describe, expect, it } from "vitest";
import {
  applyDay,
  computeDayStatus,
  emptyDay,
  joinTableNames,
  normalizeTableName,
  parseTableField,
} from "../day";
import {
  boundsOf,
  containsPoint,
  placeWithChildren,
  resizeTo,
  rotateAround,
  rotationToward,
  toLocal,
  toWorld,
  translate,
  withDescendants,
  wouldCycle,
} from "../geometry";
import { commitHistory, initHistory, previewHistory, pushHistory, redoHistory, undoHistory } from "../history";
import { planForStorage, sanitizeDay, sanitizePlan } from "../sanitize";
import { SEED_PLAN } from "../seed";
import { suggestedSeats, tableTitle } from "../catalog";
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

const reserve = (p: Partial<MapReserve>): MapReserve => ({
  id: Math.random().toString(36).slice(2),
  name: "Ana",
  time: "19:00",
  adults: 2,
  childs: 0,
  status: "confirmed",
  ...p,
});

const PLAN: FloorPlan = {
  levelHeight: 3,
  levels: [{ id: "a", name: "A", order: 0 }],
  elements: [
    el({ id: "room", kind: "room", x: 5, y: 5, w: 10, d: 10, label: "Salão" }),
    el({ id: "salas", kind: "room", x: 20, y: 5, w: 4, d: 4, label: "Salas" }),
    el({ id: "t1", x: 2, y: 2, label: "1", seats: 6 }),
    el({ id: "b1", kind: "bench", x: 2, y: 1.4, w: 2, d: 0.33, parent: "t1" }),
    el({ id: "t2", x: 5, y: 2, label: "2", seats: 6 }),
    el({ id: "t3", x: 8, y: 2, label: "03", seats: 4 }),
    el({ id: "t42", x: 19.5, y: 5, label: "42", seats: 8 }),
    el({ id: "t24", x: 21, y: 5, label: "24", seats: 8 }),
  ],
};

describe("nomes de mesa", () => {
  it("normaliza", () => {
    expect(normalizeTableName("Mesa 01")).toBe("1");
    expect(normalizeTableName("  Salas ")).toBe("salas");
    expect(normalizeTableName("Área VIP")).toBe("area vip");
    expect(normalizeTableName("mesa 7A")).toBe("7a");
  });
  it("lê o campo livre da reserva", () => {
    expect(parseTableField("3/8")).toEqual(["3", "8"]);
    expect(parseTableField("2, 7,12")).toEqual(["2", "7", "12"]);
    expect(parseTableField("1 e 6")).toEqual(["1", "6"]);
    expect(parseTableField("salas/12")).toEqual(["salas", "12"]);
    expect(parseTableField("Mesa 05 + 10")).toEqual(["5", "10"]);
    expect(parseTableField("")).toEqual([]);
    expect(parseTableField(undefined)).toEqual([]);
    expect(parseTableField("3/3")).toEqual(["3"]);
  });
  it("junta no formato da equipe", () => {
    expect(joinTableNames(["12", "2", "7"])).toBe("2/7/12");
  });
  it("título e lugares", () => {
    expect(tableTitle("12")).toBe("Mesa 12");
    expect(tableTitle("Varanda")).toBe("Varanda");
    expect(suggestedSeats(2, 0.8)).toBe(6);
    expect(suggestedSeats(1.6, 0.75)).toBe(4);
    expect(suggestedSeats(2.06, 1.95)).toBe(8);
  });
});

describe("geometria", () => {
  it("ida e volta entre eixos", () => {
    const e = { x: 3, y: -1, rot: 37 };
    const w = toWorld(e, 0.7, -0.2);
    const l = toLocal(e, w.x, w.y);
    expect(l.x).toBeCloseTo(0.7);
    expect(l.y).toBeCloseTo(-0.2);
  });
  it("giro horário: o leste local aponta para o sul com 90°", () => {
    const p = toWorld({ x: 0, y: 0, rot: 90 }, 1, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
  it("contém ponto em elemento girado", () => {
    const e = el({ id: "x", w: 4, d: 1, rot: 90 });
    expect(containsPoint(e, { x: 0, y: 1.9 })).toBe(true);
    expect(containsPoint(e, { x: 1.9, y: 0 })).toBe(false);
  });
  it("redimensiona mantendo o lado oposto", () => {
    const e = el({ id: "x", x: 1, y: 0, w: 2, d: 1 });
    const r = resizeTo(e, "e", { x: 3, y: 0 }, 0.05);
    expect(r.w).toBeCloseTo(3);
    expect(r.x - r.w / 2).toBeCloseTo(0); // lado oeste parado
    const r2 = resizeTo(e, "w", { x: 1.9, y: 0 }, 0.05);
    expect(r2.x + r2.w / 2).toBeCloseTo(2); // lado leste parado
    expect(r2.w).toBeGreaterThan(0);
  });
  it("redimensiona elemento girado no próprio eixo", () => {
    const e = el({ id: "x", x: 0, y: 0, w: 2, d: 1, rot: 90 });
    const r = resizeTo(e, "e", { x: 0, y: 2 }, 0.05); // leste local = sul da planta
    expect(r.w).toBeCloseTo(3);
    expect(r.y).toBeCloseTo(0.5);
    expect(r.x).toBeCloseTo(0);
  });
  it("aponta o topo para o ponto", () => {
    expect(rotationToward({ x: 0, y: 0, rot: 0 }, { x: 1, y: 0 }, 15)).toBe(90);
    expect(rotationToward({ x: 0, y: 0, rot: 0 }, { x: 0, y: -1 }, 15)).toBe(0);
    expect(rotationToward({ x: 0, y: 0, rot: 0 }, { x: -1, y: 0 }, 15)).toBe(270);
  });
  it("move e gira levando o que está preso", () => {
    const moved = translate(PLAN.elements, ["t1"], 1, 0);
    expect(moved.find((e) => e.id === "b1")!.x).toBe(3);
    expect(moved.find((e) => e.id === "t2")!.x).toBe(5);
    const turned = placeWithChildren(PLAN.elements, "t1", { x: 2, y: 2, rot: 180 });
    const b = turned.find((e) => e.id === "b1")!;
    expect(b.y).toBeCloseTo(2.6); // banco do norte vai para o sul
    expect(b.rot).toBe(180);
    const r = rotateAround(PLAN.elements, ["t1"], 2, 2, 90);
    expect(r.find((e) => e.id === "b1")!.x).toBeCloseTo(2.6);
  });
  it("descendentes e ciclos", () => {
    expect([...withDescendants(PLAN.elements, ["t1"])].sort()).toEqual(["b1", "t1"]);
    expect(wouldCycle(PLAN.elements, "t1", "b1")).toBe(true);
    expect(wouldCycle(PLAN.elements, "b1", "t2")).toBe(false);
  });
  it("limites", () => {
    const b = boundsOf([el({ id: "x", w: 2, d: 1, rot: 90 })])!;
    expect(b.minX).toBeCloseTo(-0.5);
    expect(b.maxY).toBeCloseTo(1);
  });
});

describe("planta do dia", () => {
  it("mesa movida leva os bancos; retirada some com eles", () => {
    const day = emptyDay("2026-11-12");
    day.moves.t1 = { x: 2, y: 5, rot: 0 };
    day.hidden.t2 = true;
    day.names.t3 = "Aniversário";
    const lay = applyDay(PLAN, day);
    expect(lay.elements.find((e) => e.id === "b1")!.y).toBeCloseTo(4.4);
    expect(lay.elements.some((e) => e.id === "t2")).toBe(false);
    expect(lay.nameOf("t3")).toBe("Aniversário");
  });
  it("ignora mudanças de ids que não existem", () => {
    const day = emptyDay("2026-11-12");
    day.moves.nada = { x: 1, y: 1, rot: 0 };
    day.hidden.nada = true;
    expect(applyDay(PLAN, day).elements).toHaveLength(PLAN.elements.length);
  });
});

describe("estado das mesas", () => {
  const status = (dayPatch: (d: ReturnType<typeof emptyDay>) => void, reserves: MapReserve[]) => {
    const day = emptyDay("2026-11-12");
    dayPatch(day);
    return computeDayStatus(PLAN, day, applyDay(PLAN, day), reserves);
  };

  it("reserva marca a mesa; chegada vira ocupada", () => {
    const s = status(() => {}, [reserve({ table: "1" }), reserve({ table: "Mesa 2", isArrived: true })]);
    expect(s.unitByKey.get("t1")!.state).toBe("reserved");
    expect(s.unitByKey.get("t2")!.state).toBe("occupied");
    expect(s.unitByKey.get("t3")!.state).toBe("free");
    expect(s.counts).toMatchObject({ reserved: 1, occupied: 1, free: 3 });
  });
  it("reserva cancelada não conta; sem mesa vai para a lista", () => {
    const s = status(() => {}, [reserve({ table: "1", status: "canceled" }), reserve({ table: "" })]);
    expect(s.unitByKey.get("t1")!.state).toBe("free");
    expect(s.unassigned).toHaveLength(1);
  });
  it("nome com zero e várias mesas", () => {
    const s = status(() => {}, [reserve({ table: "1/3" })]);
    expect(s.unitByKey.get("t1")!.state).toBe("reserved");
    expect(s.unitByKey.get("t3")!.state).toBe("reserved"); // label "03"
  });
  it("ambiente reserva todas as mesas dentro dele", () => {
    const s = status(() => {}, [reserve({ table: "salas" })]);
    expect(s.unitByKey.get("t42")!.state).toBe("reserved");
    expect(s.unitByKey.get("t24")!.state).toBe("reserved");
    expect(s.unitByKey.get("t1")!.state).toBe("free");
  });
  it("mesa que não existe vai para os avisos", () => {
    const s = status(() => {}, [reserve({ table: "1/99" })]);
    expect(s.unmatched).toHaveLength(1);
    expect(s.unmatched[0].missing).toEqual(["99"]);
    expect(s.unitByKey.get("t1")!.state).toBe("reserved");
  });
  it("mesas juntadas viram uma só", () => {
    const s = status((d) => {
      d.groups.g = { tables: ["t1", "t2"] };
    }, [reserve({ table: "2" })]);
    const g = s.unitByKey.get("g")!;
    expect(g.isGroup).toBe(true);
    expect(g.name).toBe("1/2");
    expect(g.seats).toBe(12);
    expect(g.state).toBe("reserved");
    expect(s.unitOfTable.get("t1")).toBe(g);
    expect(s.units).toHaveLength(4);
  });
  it("grupo com nome próprio casa com a reserva", () => {
    const s = status((d) => {
      d.groups.g = { tables: ["t1", "t2"], name: "Festa" };
    }, [reserve({ table: "festa" })]);
    expect(s.unitByKey.get("g")!.state).toBe("reserved");
    expect(s.unitByKey.get("g")!.reserveName).toBe("1/2");
  });
  it("grupo inválido é ignorado e mesa não entra em dois grupos", () => {
    const s = status((d) => {
      d.groups.a = { tables: ["t1", "t2"] };
      d.groups.b = { tables: ["t2", "t3"] };
      d.groups.c = { tables: ["t3", "fantasma"] };
    }, []);
    expect(s.unitByKey.has("a")).toBe(true);
    expect(s.unitByKey.has("b")).toBe(false);
    expect(s.unitByKey.has("c")).toBe(false);
  });
  it("marcação manual vence o automático", () => {
    const s = status((d) => {
      d.manual.t1 = { state: "free", at: 1 };
      d.manual.t3 = { state: "blocked", at: 1 };
    }, [reserve({ table: "1", isArrived: true })]);
    expect(s.unitByKey.get("t1")!.auto).toBe("occupied");
    expect(s.unitByKey.get("t1")!.state).toBe("free");
    expect(s.unitByKey.get("t3")!.state).toBe("blocked");
  });
  it("mesa renomeada no dia ainda casa pelo nome da planta", () => {
    const s = status((d) => {
      d.names.t1 = "1A";
    }, [reserve({ table: "1" }), reserve({ table: "1a" })]);
    expect(s.unitByKey.get("t1")!.reservations).toHaveLength(2);
  });
  it("conta lugares livres", () => {
    const s = status(() => {}, [reserve({ table: "42" })]);
    expect(s.counts.seatsTotal).toBe(32);
    expect(s.counts.seatsFree).toBe(24);
  });
});

describe("dados do banco", () => {
  it("planta: descarta lixo e solta o que perdeu o pai", () => {
    const p = sanitizePlan({
      levels: [{ id: "a", name: "A", order: 0 }, { id: "a", name: "Dup" }],
      levelHeight: 3,
      version: 4,
      elements: [
        { id: "x", level: "a", kind: "table", x: 1, y: 2, w: 2, d: 1, rot: 450, seats: 6.4, parent: "sumiu" },
        { id: "x", level: "a", kind: "table", x: 1, y: 2, w: 2, d: 1, rot: 0 },
        { id: "y", level: "zz", kind: "table", x: 1, y: 2, w: 2, d: 1, rot: 0 },
        { id: "z", level: "a", kind: "nave", x: 1, y: 2, w: 2, d: 1, rot: 0 },
        { id: "w", level: "a", kind: "bench", x: "1", y: 2, w: 2, d: 1, rot: 0 },
        { id: "v", level: "a", kind: "bench", x: 1, y: 2, w: 0, d: 1, rot: 0, variant: "inventada" },
      ],
    })!;
    expect(p.levels).toHaveLength(1);
    expect(p.version).toBe(4);
    expect(p.elements.map((e) => e.id)).toEqual(["x", "v"]);
    expect(p.elements[0]).toMatchObject({ rot: 90, seats: 6 });
    expect(p.elements[0].parent).toBeUndefined();
    expect(p.elements[1].w).toBe(0.05);
    expect(p.elements[1].variant).toBeUndefined();
    expect(sanitizePlan({})).toBeNull();
  });
  it("planta para gravar não tem undefined", () => {
    const out = planForStorage({ ...PLAN, elements: [{ ...PLAN.elements[2], label: undefined, variant: undefined }] });
    expect(JSON.stringify(out)).not.toContain("undefined");
    expect(Object.values(out.elements[0]).every((v) => v !== undefined)).toBe(true);
  });
  it("dia: descarta valores inválidos", () => {
    const d = sanitizeDay("2026-11-12", {
      moves: { t1: { x: 1, y: 2, rot: 10 }, bad: { x: "1" } },
      names: { t1: "  Aniv  ", t2: "" },
      hidden: { t1: true, t2: "sim" },
      groups: { g: { tables: ["t1", "t1", "t2"], name: "" }, h: { tables: ["t1"] } },
      manual: { t1: { state: "occupied", at: 5 }, t2: { state: "reserved" } },
    });
    expect(Object.keys(d.moves)).toEqual(["t1"]);
    expect(d.names).toEqual({ t1: "Aniv" });
    expect(d.hidden).toEqual({ t1: true });
    expect(d.groups).toEqual({ g: { tables: ["t1", "t2"] } });
    expect(d.manual).toEqual({ t1: { state: "occupied", at: 5 } });
  });
});

describe("desfazer/refazer", () => {
  it("passos, arrasto e limites", () => {
    let h = initHistory(1);
    h = pushHistory(h, 2);
    h = pushHistory(h, 3);
    h = undoHistory(h);
    expect(h.present).toBe(2);
    h = redoHistory(h);
    expect(h.present).toBe(3);
    const base = h.present;
    h = previewHistory(h, 4);
    h = previewHistory(h, 5);
    h = commitHistory(h, base);
    expect(h.past).toEqual([1, 2, 3]);
    h = undoHistory(h);
    expect(h.present).toBe(3);
    expect(undoHistory(initHistory(0)).present).toBe(0);
  });
});

describe("planta inicial", () => {
  it("é válida e passa intacta pela validação", () => {
    const p = sanitizePlan({ ...SEED_PLAN, version: 0 })!;
    expect(p.elements).toHaveLength(SEED_PLAN.elements.length);
  });
  it("ids únicos, pais existentes e mesas com nome único", () => {
    const ids = SEED_PLAN.elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of SEED_PLAN.elements) if (e.parent) expect(ids).toContain(e.parent);
    const names = SEED_PLAN.elements.filter((e) => e.kind === "table").map((e) => normalizeTableName(e.label!));
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("9");
  });
  it("casa as mesas mais usadas nas reservas", () => {
    const day = emptyDay("2026-11-12");
    const s = computeDayStatus(SEED_PLAN, day, applyDay(SEED_PLAN, day), [
      reserve({ table: "2/3/7/8" }),
      reserve({ table: "salas" }),
      reserve({ table: "103/104" }),
    ]);
    expect(s.unmatched).toHaveLength(0);
    expect(s.counts.reserved).toBe(8);
  });
});
