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
});
