import type { ReserveType } from "@/types";

/**
 * Clientes por dia/mês: o número anotado pela equipe no dia (quem veio, com e
 * sem reserva) vale mais que a soma das reservas; sem anotação, conta as
 * pessoas das reservas confirmadas.
 */

export const dateKeyOf = (d: { year: string | number; month: string | number; day: string | number }) =>
  `${String(d.year).padStart(4, "0")}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

/** Pessoas das reservas confirmadas, por dia "YYYY-MM-DD". */
export function reservedPeopleByDay(reserves: Pick<ReserveType, "bookingDate" | "status" | "adults" | "childs">[]) {
  const out = new Map<string, number>();
  for (const r of reserves) {
    if (r.status !== "confirmed") continue;
    const key = dateKeyOf(r.bookingDate);
    out.set(key, (out.get(key) ?? 0) + (r.adults || 0) + (r.childs || 0));
  }
  return out;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface MonthVisitors {
  name: string;
  /** Total do mês (anotado quando houver, senão reservas). */
  pessoas: number;
  /** Parte que veio de dias com público anotado. */
  anotado: number;
  /** Dias do mês com público anotado. */
  diasAnotados: number;
}

export function monthlyVisitors(
  reserves: Pick<ReserveType, "bookingDate" | "status" | "adults" | "childs">[],
  attendance: { date: string; people: number }[],
  year: number,
): MonthVisitors[] {
  const months: MonthVisitors[] = MONTHS.map((name) => ({ name, pessoas: 0, anotado: 0, diasAnotados: 0 }));
  const annotated = new Map(attendance.map((a) => [a.date, a.people]));
  const days = new Set<string>([...reservedPeopleByDay(reserves).keys(), ...annotated.keys()]);
  const reserved = reservedPeopleByDay(reserves);
  for (const day of days) {
    if (Number(day.slice(0, 4)) !== year) continue;
    const m = months[Number(day.slice(5, 7)) - 1];
    if (!m) continue;
    const noted = annotated.get(day);
    if (noted !== undefined) {
      m.pessoas += noted;
      m.anotado += noted;
      m.diasAnotados++;
    } else {
      m.pessoas += reserved.get(day) ?? 0;
    }
  }
  return months;
}
