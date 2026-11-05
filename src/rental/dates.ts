export const RENTAL_TZ = "America/Sao_Paulo";

const DAY_MS = 86_400_000;

// Datas são strings "YYYY-MM-DD"; a aritmética usa UTC para ignorar fuso/DST.
function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Data de hoje ("YYYY-MM-DD") em Brasília. */
export function todaySP(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: RENTAL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** `to − from` em dias. */
export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** 0 = domingo. */
export function weekdayOf(date: string): number {
  return new Date(toUtc(date)).getUTCDay();
}

export function formatDateBR(date: string, withYear = false): string {
  const [y, m, d] = date.split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}
