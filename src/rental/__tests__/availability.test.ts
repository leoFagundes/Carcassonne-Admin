import { describe, expect, it } from "vitest";
import { availabilityFor, gameAvailability, pickUnit } from "../availability";
import { bk, unit } from "./fixtures";

const today = "2026-11-05";

describe("availability", () => {
  it("sem reservas", () => {
    expect(gameAvailability({ units: [unit("u1")], bookings: [], rentalDays: 7 }, today)).toEqual({ state: "available" });
  });

  const out = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };
  const late = { units: [unit("u1")], bookings: [bk("u1", "2026-10-28", "2026-11-04", "picked_up")], rentalDays: 7 };
  const future = { units: [unit("u1")], bookings: [bk("u1", "2026-11-10", "2026-11-17", "reserved")], rentalDays: 7 };

  it("retirado: volta em 3 dias", () => {
    expect(gameAvailability(out, today)).toEqual({ state: "from", start: "2026-11-09", returnDate: "2026-11-08", daysUntilReturn: 3 });
  });

  it("atrasado", () => {
    expect(gameAvailability(late, today)).toEqual({ state: "overdue" });
    expect(availabilityFor(late, today, today)).toEqual({ ok: false, nextStart: "2026-11-06" });
  });

  it("reserva futura curta impede começar hoje", () => {
    expect(gameAvailability(future, today)).toEqual({ state: "from", start: "2026-11-18" });
  });

  it("a outra unidade livre resolve", () => {
    expect(gameAvailability({ ...future, units: [unit("u1"), unit("u2")] }, today)).toEqual({ state: "available" });
  });

  it("unidade indisponível não conta", () => {
    expect(gameAvailability({ units: [unit("u1", "unavailable")], bookings: [], rentalDays: 7 }, today)).toEqual({ state: "unavailable" });
  });

  it("folga de devolução", () => {
    expect(availabilityFor(out, "2026-11-08", today)).toEqual({ ok: false, nextStart: "2026-11-09" });
    expect(availabilityFor(out, "2026-11-09", today)).toEqual({ ok: true });
  });

  it("pickUnit escolhe o encaixe mais justo", () => {
    const two = { units: [unit("u1"), unit("u2")], bookings: [bk("u2", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };
    expect(pickUnit(two, "2026-11-09", today)).toBe("u2");
    expect(pickUnit(two, today, today)).toBe("u1");
    expect(pickUnit(late, today, today)).toBeNull();
  });

  describe("regressões", () => {
    it("(a) bookings fora de ordem na mesma unidade", () => {
      const g = {
        units: [unit("u1")],
        bookings: [
          bk("u1", "2026-11-20", "2026-11-27", "reserved", "y"),
          bk("u1", "2026-11-01", "2026-11-08", "picked_up", "x"),
          bk("u1", "2026-11-10", "2026-11-14", "reserved", "z"),
        ],
        rentalDays: 7,
      };
      expect(gameAvailability(g, today)).toEqual({ state: "from", start: "2026-11-28" });
    });

    it("(b) vão menor que rentalDays não serve", () => {
      const g = {
        units: [unit("u1")],
        bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up", "x"), bk("u1", "2026-11-12", "2026-11-19", "reserved", "y")],
        rentalDays: 7,
      };
      const r = gameAvailability(g, today);
      expect(r).toEqual({ state: "from", start: "2026-11-20" });
      expect(r).not.toHaveProperty("returnDate");
    });

    it("(c) reservada com início passado e vencimento futuro ainda bloqueia", () => {
      const g = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "reserved")], rentalDays: 7 };
      expect(gameAvailability(g, today)).toEqual({ state: "from", start: "2026-11-09" });
      expect(availabilityFor(g, today, today)).toEqual({ ok: false, nextStart: "2026-11-09" });
    });

    it("(d) todas as unidades indisponíveis", () => {
      const g = { units: [unit("u1", "unavailable"), unit("u2", "unavailable")], bookings: [], rentalDays: 7 };
      expect(availabilityFor(g, today, today)).toEqual({ ok: false, nextStart: null });
    });

    it("(e) pickUnit ignora indisponível e desempata pela ordem de units", () => {
      const skip = { units: [unit("u1", "unavailable"), unit("u2")], bookings: [], rentalDays: 7 };
      expect(pickUnit(skip, today, today)).toBe("u2");
      const tie = {
        units: [unit("u1"), unit("u2")],
        bookings: [bk("u2", "2026-11-01", "2026-11-08", "picked_up", "a"), bk("u1", "2026-11-01", "2026-11-08", "picked_up", "b")],
        rentalDays: 7,
      };
      expect(pickUnit(tie, "2026-11-10", today)).toBe("u1");
    });

    it("(f) availabilityFor com início futuro", () => {
      const one = {
        units: [unit("u1"), unit("u2")],
        bookings: [bk("u1", "2026-11-18", "2026-11-25", "reserved", "a"), bk("u2", "2026-11-01", "2026-11-08", "picked_up", "b")],
        rentalDays: 7,
      };
      expect(availabilityFor(one, "2026-11-20", today)).toEqual({ ok: true });
      const both = {
        units: [unit("u1"), unit("u2")],
        bookings: [bk("u1", "2026-11-18", "2026-11-25", "reserved", "a"), bk("u2", "2026-11-22", "2026-11-29", "reserved", "b")],
        rentalDays: 7,
      };
      expect(availabilityFor(both, "2026-11-20", today)).toEqual({ ok: false, nextStart: "2026-11-26" });
    });
  });
});

describe("sem fila (allowQueue: false)", () => {
  const today = "2026-11-05";
  const NQ = { allowQueue: false };
  const out = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };
  const late = { units: [unit("u1")], bookings: [bk("u1", "2026-10-28", "2026-11-04", "picked_up")], rentalDays: 7 };
  const future = { units: [unit("u1")], bookings: [bk("u1", "2026-11-20", "2026-11-27", "reserved")], rentalDays: 7 };

  it("cópia com alguém: 'alugado' com a previsão, sem data para reservar", () => {
    expect(gameAvailability(out, today, NQ)).toEqual({ state: "rented", returnDate: "2026-11-08", daysUntilReturn: 3 });
    expect(availabilityFor(out, "2026-11-09", today, NQ)).toEqual({ ok: false, nextStart: null });
    expect(pickUnit(out, "2026-11-09", today, NQ)).toBeNull();
  });

  it("devolução atrasada continua 'atrasado'", () => {
    expect(gameAvailability(late, today, NQ)).toEqual({ state: "overdue" });
  });

  it("dá para pegar antes de quem reservou, nunca depois", () => {
    expect(gameAvailability(future, today, NQ)).toEqual({ state: "available" });
    expect(availabilityFor(future, today, today, NQ)).toEqual({ ok: true });
    expect(availabilityFor(future, "2026-11-28", today, NQ)).toEqual({ ok: false, nextStart: today });
    expect(pickUnit(future, "2026-11-28", today, NQ)).toBeNull();
    // ligado (padrão), depois da reserva pode
    expect(pickUnit(future, "2026-11-28", today)).toBe("u1");
  });

  it("outra cópia livre resolve", () => {
    expect(gameAvailability({ ...out, units: [unit("u1"), unit("u2")] }, today, NQ)).toEqual({ state: "available" });
    expect(pickUnit({ ...out, units: [unit("u1"), unit("u2")] }, "2026-11-09", today, NQ)).toBe("u2");
  });

  it("allowQueue ausente ou true mantém o comportamento de sempre", () => {
    expect(gameAvailability(out, today, { allowQueue: true })).toEqual(gameAvailability(out, today));
  });
});

describe("folga entre aluguéis (gapDays)", () => {
  const today = "2026-11-05";
  // cópia volta dia 23
  const back23 = { units: [unit("u1")], bookings: [bk("u1", "2026-11-16", "2026-11-23", "reserved")], rentalDays: 7 };
  const G2 = { gapDays: 2 };

  it("sem folga extra (padrão): retira no dia seguinte", () => {
    expect(availabilityFor(back23, "2026-11-24", today)).toEqual({ ok: true });
  });

  it("folga de 2 dias: volta dia 23, próximo só a partir do 25", () => {
    expect(availabilityFor(back23, "2026-11-24", today, G2)).toEqual({ ok: false, nextStart: "2026-11-25" });
    expect(availabilityFor(back23, "2026-11-25", today, G2)).toEqual({ ok: true });
    expect(pickUnit(back23, "2026-11-24", today, G2)).toBeNull();
    expect(pickUnit(back23, "2026-11-25", today, G2)).toBe("u1");
  });

  it("vale também antes de uma reserva marcada (precisa devolver com folga)", () => {
    // reserva de outro cliente começa dia 16; quem pega dia 7 devolve dia 14 (+7)
    expect(availabilityFor(back23, "2026-11-07", today)).toEqual({ ok: true }); // 14 < 16
    expect(availabilityFor(back23, "2026-11-08", today, G2)).toMatchObject({ ok: false }); // 15 + 2 > 16
    expect(availabilityFor(back23, "2026-11-07", today, G2)).toEqual({ ok: true }); // 14 + 2 = 16
  });

  it("selo do catálogo usa a folga", () => {
    const out = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };
    expect(gameAvailability(out, today, { gapDays: 3 })).toMatchObject({ state: "from", start: "2026-11-11" });
  });

  it("folga inválida vira 1", () => {
    expect(availabilityFor(back23, "2026-11-24", today, { gapDays: 0 })).toEqual({ ok: true });
    expect(availabilityFor(back23, "2026-11-24", today, { gapDays: 99 })).toEqual({ ok: true });
  });
});
