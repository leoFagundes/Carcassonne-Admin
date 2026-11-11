import type { RentalReturnCondition, RentalSettingsType, RentalType } from "@/types";
import { RENTAL_TZ } from "./dates";
import { isRealDate } from "./bookings";

/**
 * Devolução em dois passos: "recebido" (o cliente devolveu, com a data em que
 * devolveu) e "conferido" (a equipe contou as peças). O atraso vale pela data
 * em que o cliente devolveu, não pelo dia em que alguém registrou.
 */

type Stamp = { toMillis?: () => number; toDate?: () => Date } | undefined | null;

function stampDay(stamp: Stamp): string | null {
  const ms = stamp?.toMillis?.() ?? stamp?.toDate?.().getTime();
  if (ms === undefined || !Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: RENTAL_TZ });
}

/**
 * Dia em que o cliente devolveu ("YYYY-MM-DD"). Aluguéis antigos não têm
 * `returnedOn`: vale o dia em que a devolução foi registrada.
 */
export function returnDayOf(rental: Pick<RentalType, "returnedOn" | "returnedAt">): string | null {
  if (isRealDate(rental.returnedOn)) return rental.returnedOn;
  return stampDay(rental.returnedAt as Stamp);
}

/** Devolvido depois do prazo? */
export function returnedLate(
  rental: Pick<RentalType, "status" | "dueDate" | "returnedOn" | "returnedAt">,
): boolean {
  if (rental.status !== "returned") return false;
  const day = returnDayOf(rental);
  return day !== null && day > rental.dueDate;
}

/** Devolvido e ainda sem conferir as peças. */
export function isCheckPending(rental: Pick<RentalType, "status" | "checkPending">): boolean {
  return rental.status === "returned" && rental.checkPending === true;
}

/** Primeiro dia que pode ser informado como devolução: o da retirada (ou o início). */
export function earliestReturnDay(rental: Pick<RentalType, "startDate" | "pickedUpAt">): string {
  const picked = stampDay(rental.pickedUpAt as Stamp);
  return picked && picked > rental.startDate ? picked : rental.startDate;
}

/** Erro da data informada como devolução, ou null se vale. */
export function returnDayError(
  day: unknown,
  rental: Pick<RentalType, "startDate" | "pickedUpAt">,
  today: string,
): string | null {
  if (!isRealDate(day)) return "Informe a data em que o cliente devolveu.";
  if (day > today) return "A devolução não pode ser numa data futura.";
  if (day < earliestReturnDay(rental)) return "A devolução não pode ser antes da retirada.";
  return null;
}

export type PendingCheckPickup = NonNullable<RentalSettingsType["pendingCheckPickup"]>;

/** Ausente = bloquear: entregar um jogo sem conferir arrisca passar peça faltando adiante. */
export function pendingCheckMode(settings: Pick<RentalSettingsType, "pendingCheckPickup"> | undefined): PendingCheckPickup {
  return settings?.pendingCheckPickup === "warn" ? "warn" : "block";
}

/** Aluguel devolvido e sem conferir da mesma cópia (outro que não `exceptId`). */
export function pendingCheckOnUnit<T extends Pick<RentalType, "gameId" | "unitId" | "status" | "checkPending"> & { id?: string }>(
  rentals: readonly T[],
  target: Pick<RentalType, "gameId" | "unitId"> & { id?: string },
): T | undefined {
  return rentals.find(
    (r) => r.id !== target.id && r.gameId === target.gameId && r.unitId === target.unitId && isCheckPending(r),
  );
}

export const CONDITION_LABEL: Record<RentalReturnCondition, string> = {
  ok: "OK",
  damaged: "Com avaria",
  missing_parts: "Peça faltando",
};
