import { describe, expect, it } from "vitest";
import { availabilityFor, blockReason, dueDateFor, gameAvailability, pickUnit } from "../availability";
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

describe("blockReason", () => {
  const today = "2026-11-05";
  const reserved = { units: [unit("u1")], bookings: [bk("u1", "2026-11-16", "2026-11-23", "reserved")], rentalDays: 7 };
  const out = { units: [unit("u1")], bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up")], rentalDays: 7 };

  it("livre: sem motivo", () => {
    expect(blockReason(reserved, "2026-11-05", today)).toBeNull();
  });

  it("reservado por outro cliente no período", () => {
    expect(blockReason(reserved, "2026-11-18", today)).toEqual({
      kind: "reserved",
      from: "2026-11-16",
      to: "2026-11-23",
      copies: 1,
    });
    // a janela de 7 dias a partir de 10/11 encosta na reserva
    expect(blockReason(reserved, "2026-11-10", today)).toMatchObject({ kind: "reserved" });
  });

  it("com outro cliente", () => {
    expect(blockReason(out, "2026-11-07", today)).toEqual({ kind: "with_customer", until: "2026-11-08", copies: 1 });
  });

  it("sem fila: depois de uma reserva é 'behind'", () => {
    expect(blockReason(reserved, "2026-11-28", today, { allowQueue: false })).toEqual({
      kind: "behind",
      from: "2026-11-16",
      to: "2026-11-23",
      copies: 1,
    });
    expect(blockReason(out, "2026-11-20", today, { allowQueue: false })).toMatchObject({ kind: "with_customer" });
  });

  it("sem cópias ativas", () => {
    expect(blockReason({ units: [], bookings: [], rentalDays: 7 }, today, today)).toEqual({ kind: "no_copies" });
  });
});

describe("devolução em dia fechado (openWeekdays)", () => {
  // 2026-11-23 é segunda; pub fechado segunda (1) e terça (2)
  const OPEN = { openWeekdays: [0, 3, 4, 5, 6] };

  it("segunda fechada → quarta", () => {
    expect(dueDateFor("2026-11-16", 7, OPEN)).toBe("2026-11-25");
  });

  it("dia aberto ou sem dias informados: fica o prazo", () => {
    expect(dueDateFor("2026-11-15", 7, OPEN)).toBe("2026-11-22");
    expect(dueDateFor("2026-11-16", 7)).toBe("2026-11-23");
    expect(dueDateFor("2026-11-16", 7, { openWeekdays: [] })).toBe("2026-11-23");
  });

  it("a disponibilidade usa a devolução já empurrada", () => {
    const today = "2026-11-05";
    // reserva começa dia 24 (terça); quem retira dia 16 devolveria 23 (seg) → 25 (qua): conflita
    const game = { units: [unit("u1")], bookings: [bk("u1", "2026-11-24", "2026-12-01", "reserved")], rentalDays: 7 };
    expect(availabilityFor(game, "2026-11-16", today).ok).toBe(true);
    expect(availabilityFor(game, "2026-11-16", today, OPEN).ok).toBe(false);
  });
});

describe("fila ligada: antes, depois ou os dois", () => {
  // Hoje 05/11, cópia única reservada por outro cliente de 20/11 a 27/11; prazo 7 dias.
  const reserved = { units: [unit("u1")], bookings: [bk("u1", "2026-11-20", "2026-11-27", "reserved")], rentalDays: 7 };
  const both = { allowQueue: true, queueMode: "both" as const };
  const before = { allowQueue: true, queueMode: "before" as const };
  const after = { allowQueue: true, queueMode: "after" as const };

  it("os dois (padrão): pega antes e reserva depois", () => {
    expect(pickUnit(reserved, "2026-11-05", today, both)).toBe("u1");
    expect(pickUnit(reserved, "2026-11-28", today, both)).toBe("u1");
    expect(pickUnit(reserved, "2026-11-05", today, { allowQueue: true })).toBe("u1");
  });

  it("só antes: igual à fila desligada", () => {
    expect(pickUnit(reserved, "2026-11-05", today, before)).toBe("u1");
    expect(pickUnit(reserved, "2026-11-28", today, before)).toBeNull();
    expect(blockReason(reserved, "2026-11-28", today, before)).toMatchObject({ kind: "behind" });
  });

  it("só depois: ninguém pega antes de uma reserva marcada", () => {
    expect(pickUnit(reserved, "2026-11-05", today, after)).toBeNull();
    expect(pickUnit(reserved, "2026-11-28", today, after)).toBe("u1");
    expect(blockReason(reserved, "2026-11-05", today, after)).toEqual({
      kind: "ahead",
      from: "2026-11-20",
      to: "2026-11-27",
      copies: 1,
    });
    expect(gameAvailability(reserved, today, after)).toEqual({ state: "from", start: "2026-11-28" });
    expect(availabilityFor(reserved, "2026-11-05", today, after)).toEqual({ ok: false, nextStart: "2026-11-28" });
  });

  it("só depois com a cópia livre e sem reservas: disponível", () => {
    expect(gameAvailability({ units: [unit("u1")], bookings: [], rentalDays: 7 }, today, after)).toEqual({
      state: "available",
    });
  });
});
