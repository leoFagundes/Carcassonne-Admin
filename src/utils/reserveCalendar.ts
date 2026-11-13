/**
 * Evento de calendário da reserva: link do Google Agenda, do Outlook e o
 * arquivo .ics (iPhone, Mac e qualquer outro calendário).
 * Horário de Brasília (UTC−3, sem horário de verão desde 2019).
 */

export interface ReserveEventInput {
  code: string;
  /** dia, mês e ano como na reserva ("5" ou "05"). */
  bookingDate: { day: string; month: string; year: string };
  /** "19:30" */
  time: string;
  people: number;
  address?: string;
  /** Hora de fechar no dia ("23:00"); sem ela, a reserva dura 3 h. */
  closeTime?: string;
}

export interface ReserveEvent {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}

const OFFSET_HOURS = 3; // Brasília = UTC−3
export const CANCEL_URL = "https://www.carcassonnepub.com.br/cancelreserve";

function hm(t: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? [h, min] : null;
}

/** Data e hora de Brasília → instante (UTC). */
function spDate(y: number, mo: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, mo - 1, d, h + OFFSET_HOURS, min));
}

export function buildReserveEvent(r: ReserveEventInput): ReserveEvent | null {
  const y = Number(r.bookingDate.year);
  const mo = Number(r.bookingDate.month);
  const d = Number(r.bookingDate.day);
  const t = hm(r.time);
  if (!y || !mo || !d || !t) return null;
  const start = spDate(y, mo, d, t[0], t[1]);
  let end = new Date(start.getTime() + 3 * 3600_000);
  const close = r.closeTime ? hm(r.closeTime) : null;
  if (close) {
    // Fecha depois da meia-noite (ex.: 01:00) conta como o dia seguinte
    const c = spDate(y, mo, d, close[0], close[1]);
    const closeAt = c.getTime() <= start.getTime() ? new Date(c.getTime() + 24 * 3600_000) : c;
    if (closeAt.getTime() - start.getTime() >= 3600_000) end = closeAt;
  }
  const people = `${r.people} ${r.people === 1 ? "pessoa" : "pessoas"}`;
  return {
    title: "Reserva no Carcassonne Pub",
    description: `Reserva para ${people} às ${r.time}.\nCódigo da reserva: ${r.code}\nPara cancelar: ${CANCEL_URL}`,
    location: r.address?.trim() || "Carcassonne Pub",
    start,
    end,
  };
}

/** 2026-11-12T22:30:00Z → 20261112T223000Z */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(e: ReserveEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(e.end)}`,
    details: e.description,
    location: e.location,
    ctz: "America/Sao_Paulo",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function outlookCalendarUrl(e: ReserveEvent): string {
  const p = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
    body: e.description,
    location: e.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${p.toString()}`;
}

/** Texto do .ics (RFC 5545): escapa vírgula, ponto e vírgula e quebras de linha. */
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Linhas do .ics com no máximo 75 caracteres (dobra com espaço). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function icsFile(e: ReserveEvent, code: string, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carcassonne Pub//Reservas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:reserva-${code}@carcassonnepub.com.br`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    `LOCATION:${icsText(e.location)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT2H",
    `DESCRIPTION:${icsText(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
