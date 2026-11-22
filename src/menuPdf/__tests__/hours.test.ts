import { describe, expect, it } from "vitest";
import { hoursLines } from "../hours";

describe("horário no verso do PDF", () => {
  it("agrupa dias seguidos com o mesmo horário, começando na segunda", () => {
    const h = { open: "18:00", close: "00:00" };
    const late = { open: "18:00", close: "02:00" };
    // domingo (0) a sábado (6)
    const hours = [{ open: "16:00", close: "22:30" }, null, h, h, h, late, late];
    expect(hoursLines(hours)).toEqual([
      { days: "Segunda", time: "fechado" },
      { days: "Terça a quinta", time: "18h às 0h" },
      { days: "Sexta e sábado", time: "18h às 2h" },
      { days: "Domingo", time: "16h às 22h30" },
    ]);
  });

  it("sem horário cadastrado não mostra nada", () => {
    expect(hoursLines([null, null, null, null, null, null, null])).toEqual([]);
    expect(hoursLines([])).toEqual([]);
  });
});
