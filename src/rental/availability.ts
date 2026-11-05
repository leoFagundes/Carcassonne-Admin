import { addDays, diffDays } from "./dates";
import type { RentalBooking, RentalGameType } from "@/types";

export type GameLike = Pick<RentalGameType, "units" | "bookings" | "rentalDays">;

export type GameAvailability =
  | { state: "available" }
  | { state: "from"; start: string; returnDate?: string; daysUntilReturn?: number }
  | { state: "overdue" }
  | { state: "unavailable" };

/** Último dia em que a reserva ocupa a unidade (retirado e vencido conta até hoje). */
export function bookingEnd(b: RentalBooking, today: string): string {
  return b.status === "picked_up" && b.dueDate < today ? today : b.dueDate;
}

/** Intervalos fechados: livre se nenhum booking da unidade compartilha data com [start, end]. */
export function isUnitFree(
  unitId: string,
  bookings: RentalBooking[],
  start: string,
  end: string,
  today: string
): boolean {
  return !bookings.some(
    (b) => b.unitId === unitId && b.startDate <= end && bookingEnd(b, today) >= start
  );
}

/** Menor início ≥ `lowerBound` (padrão: hoje) cuja janela [c, c+rentalDays] está livre. */
export function earliestStartForUnit(
  unitId: string,
  bookings: RentalBooking[],
  rentalDays: number,
  today: string,
  lowerBound: string = today
): { start: string; blocking: RentalBooking | null } {
  const min = lowerBound < today ? today : lowerBound;
  const candidates: { start: string; blocking: RentalBooking | null }[] = [
    { start: min, blocking: null },
  ];
  for (const b of bookings) {
    if (b.unitId !== unitId) continue;
    const c = addDays(bookingEnd(b, today), 1);
    if (c >= min) candidates.push({ start: c, blocking: b });
  }
  candidates.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  for (const c of candidates) {
    if (isUnitFree(unitId, bookings, c.start, addDays(c.start, rentalDays), today)) return c;
  }
  // Inalcançável: o dia após o fim da última reserva sempre está livre.
  return candidates[candidates.length - 1];
}

export function gameAvailability(game: GameLike, today: string): GameAvailability {
  const active = game.units.filter((u) => u.status === "active");
  if (active.length === 0) return { state: "unavailable" };

  let best: { start: string; blocking: RentalBooking | null } | null = null;
  for (const u of active) {
    const e = earliestStartForUnit(u.id, game.bookings, game.rentalDays, today);
    if (e.start === today) return { state: "available" };
    if (!best || e.start < best.start) best = e;
  }
  const b = best!.blocking;
  if (b && b.status === "picked_up") {
    if (b.dueDate < today) return { state: "overdue" };
    return {
      state: "from",
      start: best!.start,
      returnDate: b.dueDate,
      daysUntilReturn: diffDays(today, b.dueDate),
    };
  }
  return { state: "from", start: best!.start };
}

export function availabilityFor(
  game: GameLike,
  start: string,
  today: string
): { ok: true } | { ok: false; nextStart: string | null } {
  const end = addDays(start, game.rentalDays);
  const active = game.units.filter((u) => u.status === "active");
  if (active.some((u) => isUnitFree(u.id, game.bookings, start, end, today))) return { ok: true };
  let next: string | null = null;
  for (const u of active) {
    const e = earliestStartForUnit(u.id, game.bookings, game.rentalDays, today, start);
    if (next === null || e.start < next) next = e.start;
  }
  return { ok: false, nextStart: next };
}

/** Unidade ativa e livre com o encaixe mais justo antes de `start`; empate → ordem de `units`. */
export function pickUnit(game: GameLike, start: string, today: string): string | null {
  const end = addDays(start, game.rentalDays);
  let bestId: string | null = null;
  let bestGap = Infinity;
  for (const u of game.units) {
    if (u.status !== "active") continue;
    if (!isUnitFree(u.id, game.bookings, start, end, today)) continue;
    let prev: string | null = null;
    for (const b of game.bookings) {
      if (b.unitId !== u.id) continue;
      const e = bookingEnd(b, today);
      if (e < start && (prev === null || e > prev)) prev = e;
    }
    const gap = prev === null ? Infinity : diffDays(prev, start);
    if (bestId === null || gap < bestGap) {
      bestId = u.id;
      bestGap = gap;
    }
  }
  return bestId;
}
