import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  formatDateBR,
  todaySP,
  weekdayOf,
} from "@/rental/dates";

describe("dates", () => {
  it("todaySP usa o fuso de Brasília", () => {
    expect(todaySP(new Date("2026-11-06T01:30:00Z"))).toBe("2026-11-05");
    expect(todaySP(new Date("2026-11-06T03:30:00Z"))).toBe("2026-11-06");
  });

  it("addDays atravessa mês e ano", () => {
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("diffDays", () => {
    expect(diffDays("2026-11-05", "2026-11-08")).toBe(3);
    expect(diffDays("2026-11-08", "2026-11-05")).toBe(-3);
  });

  it("weekdayOf", () => {
    expect(weekdayOf("2026-11-08")).toBe(0);
  });

  it("formatDateBR", () => {
    expect(formatDateBR("2026-11-12")).toBe("12/11");
    expect(formatDateBR("2026-11-12", true)).toBe("12/11/2026");
  });
});
