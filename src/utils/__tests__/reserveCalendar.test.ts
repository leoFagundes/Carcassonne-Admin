import { describe, expect, it } from "vitest";
import { buildReserveEvent, googleCalendarUrl, icsFile, outlookCalendarUrl } from "../reserveCalendar";

const base = { code: "AB12CD", bookingDate: { day: "5", month: "06", year: "2026" }, time: "19:30", people: 4, address: "SCLN 214, Brasília - DF" };

describe("evento da reserva", () => {
  it("usa o horário de Brasília (UTC−3) e dura 3 h sem horário de fechar", () => {
    const e = buildReserveEvent(base)!;
    expect(e.start.toISOString()).toBe("2026-06-05T22:30:00.000Z");
    expect(e.end.toISOString()).toBe("2026-06-06T01:30:00.000Z");
    expect(e.description).toContain("AB12CD");
    expect(e.description).toContain("4 pessoas");
    expect(e.location).toBe("SCLN 214, Brasília - DF");
  });
  it("vai até a hora de fechar, inclusive depois da meia-noite", () => {
    expect(buildReserveEvent({ ...base, closeTime: "23:00" })!.end.toISOString()).toBe("2026-06-06T02:00:00.000Z");
    expect(buildReserveEvent({ ...base, closeTime: "01:00" })!.end.toISOString()).toBe("2026-06-06T04:00:00.000Z");
    // Fechar menos de 1 h depois: fica com as 3 h
    expect(buildReserveEvent({ ...base, closeTime: "20:00" })!.end.toISOString()).toBe("2026-06-06T01:30:00.000Z");
  });
  it("hora ou data inválida não gera evento", () => {
    expect(buildReserveEvent({ ...base, time: "25:00" })).toBeNull();
    expect(buildReserveEvent({ ...base, bookingDate: { day: "", month: "6", year: "2026" } })).toBeNull();
  });
  it("links do Google e do Outlook", () => {
    const e = buildReserveEvent(base)!;
    const g = new URL(googleCalendarUrl(e));
    expect(g.searchParams.get("dates")).toBe("20260605T223000Z/20260606T013000Z");
    expect(g.searchParams.get("text")).toBe("Reserva no Carcassonne Pub");
    expect(new URL(outlookCalendarUrl(e)).searchParams.get("startdt")).toBe("2026-06-05T22:30:00.000Z");
  });
  it("arquivo .ics válido, com escape e lembrete", () => {
    const ics = icsFile(buildReserveEvent(base)!, "AB12CD", new Date("2026-06-01T12:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20260605T223000Z");
    expect(ics).toContain("UID:reserva-AB12CD@carcassonnepub.com.br");
    expect(ics).toContain("LOCATION:SCLN 214\\, Brasília - DF");
    expect(ics).toContain("TRIGGER:-PT2H");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});
