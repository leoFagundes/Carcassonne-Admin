import { describe, expect, it } from "vitest";
import { dateKeyOf, monthlyVisitors, reservedPeopleByDay } from "@/utils/attendance";

const r = (day: number, month: number, adults: number, childs = 0, status: "confirmed" | "canceled" = "confirmed") => ({
  bookingDate: { day: String(day), month: String(month), year: "2026" },
  status,
  adults,
  childs,
});

describe("attendance", () => {
  it("chave do dia com zeros", () => {
    expect(dateKeyOf({ day: "5", month: "3", year: "2026" })).toBe("2026-03-05");
  });

  it("soma só reservas confirmadas", () => {
    expect(reservedPeopleByDay([r(5, 3, 2, 1), r(5, 3, 4), r(5, 3, 9, 0, "canceled")]).get("2026-03-05")).toBe(7);
  });

  it("dia anotado vale mais que as reservas; sem anotação, conta as reservas", () => {
    const months = monthlyVisitors(
      [r(5, 3, 2, 1), r(6, 3, 4)],
      [
        { date: "2026-03-05", people: 40 }, // veio muita gente sem reserva
        { date: "2026-03-20", people: 25 }, // dia sem reserva nenhuma
        { date: "2025-03-20", people: 99 }, // outro ano
      ],
      2026,
    );
    expect(months[2]).toEqual({ name: "Mar", pessoas: 40 + 4 + 25, anotado: 65, diasAnotados: 2 });
    expect(months[3].pessoas).toBe(0);
  });
});
