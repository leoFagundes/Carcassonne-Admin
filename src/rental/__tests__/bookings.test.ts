import { describe, expect, it } from "vitest";
import {
  canPickUp,
  isRealDate,
  markUnitUnavailable,
  removeBooking,
  updateBooking,
} from "../bookings";
import { bk, unit } from "./fixtures";

describe("updateBooking", () => {
  const list = [bk("u1", "2026-01-01", "2026-01-05", "reserved", "a"), bk("u1", "2026-01-10", "2026-01-12", "reserved", "b")];
  it("altera só o booking do aluguel", () => {
    const out = updateBooking(list, "a", { status: "picked_up" });
    expect(out[0].status).toBe("picked_up");
    expect(out[1]).toBe(list[1]);
    expect(list[0].status).toBe("reserved");
  });
  it("altera o prazo", () => {
    expect(updateBooking(list, "b", { dueDate: "2026-01-20" })[1].dueDate).toBe("2026-01-20");
  });
});

describe("removeBooking", () => {
  it("remove pelo rentalId", () => {
    const list = [bk("u1", "2026-01-01", "2026-01-05", "reserved", "a"), bk("u1", "2026-01-10", "2026-01-12", "reserved", "b")];
    expect(removeBooking(list, "a").map((b) => b.rentalId)).toEqual(["b"]);
  });
});

describe("markUnitUnavailable", () => {
  it("marca a unidade com a observação", () => {
    const units = [unit("u1"), unit("u2")];
    const out = markUnitUnavailable(units, "u2", "quebrou");
    expect(out[1]).toEqual({ id: "u2", label: "u2", status: "unavailable", note: "quebrou" });
    expect(out[0]).toBe(units[0]);
  });
});

describe("isRealDate", () => {
  it("valida datas reais", () => {
    expect(isRealDate("2026-02-28")).toBe(true);
    expect(isRealDate("2026-02-30")).toBe(false);
    expect(isRealDate("2026-2-3")).toBe(false);
    expect(isRealDate("abc")).toBe(false);
  });
});

describe("canPickUp", () => {
  const today = "2026-11-05";
  it("reservado para hoje", () => {
    expect(canPickUp({ status: "reserved", startDate: "2026-11-05" }, today)).toBe(true);
  });
  it("reservado para ontem (atrasado)", () => {
    expect(canPickUp({ status: "reserved", startDate: "2026-11-04" }, today)).toBe(true);
  });
  it("reservado para amanhã", () => {
    expect(canPickUp({ status: "reserved", startDate: "2026-11-06" }, today)).toBe(false);
  });
  it("já retirado", () => {
    expect(canPickUp({ status: "picked_up", startDate: "2026-11-05" }, today)).toBe(false);
  });
});
