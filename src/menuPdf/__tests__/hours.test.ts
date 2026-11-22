import { describe, expect, it } from "vitest";
import { hoursLines } from "../hours";

const h = { open: "18:00", close: "00:00" };
const late = { open: "18:00", close: "02:00" };
// domingo (0) a sábado (6)
const hours = [{ open: "16:00", close: "22:30" }, null, h, h, h, late, late];

describe("horário no verso do PDF", () => {
  it("agrupa dias seguidos com o mesmo horário, começando na segunda; meia-noite = 00h", () => {
    expect(hoursLines(hours)).toEqual([
      { days: "Segunda", time: "Fechado" },
      { days: "Terça a quinta", time: "18h às 00h" },
      { days: "Sexta e sábado", time: "18h às 2h" },
      { days: "Domingo", time: "16h às 22h30" },
    ]);
  });

  it("dias fechados no fim, como no verso", () => {
    const days = hoursLines(hours, { closedLast: true }).map((l) => l.days);
    expect(days).toEqual(["Terça a quinta", "Sexta e sábado", "Domingo", "Segunda"]);
  });

  it("sem horário cadastrado não mostra nada", () => {
    expect(hoursLines([null, null, null, null, null, null, null])).toEqual([]);
    expect(hoursLines([])).toEqual([]);
  });
});
