import type { RentalBooking, RentalType, RentalUnit } from "@/types";
import { addDays } from "./dates";

/** Lê a lista de bookings de um doc de jogo (campo ausente/inválido → []). */
export function asBookings(raw: unknown): RentalBooking[] {
  return Array.isArray(raw) ? (raw as RentalBooking[]) : [];
}

/** Lê a lista de unidades de um doc de jogo (campo ausente/inválido → []). */
export function asUnits(raw: unknown): RentalUnit[] {
  return Array.isArray(raw) ? (raw as RentalUnit[]) : [];
}

/** Aplica `patch` ao booking do aluguel, sem mutar a lista original. */
export function updateBooking(
  bookings: RentalBooking[],
  rentalId: string,
  patch: Partial<Pick<RentalBooking, "status" | "dueDate">>,
): RentalBooking[] {
  return bookings.map((b) => (b.rentalId === rentalId ? { ...b, ...patch } : b));
}

/** Remove o booking do aluguel. */
export function removeBooking(bookings: RentalBooking[], rentalId: string): RentalBooking[] {
  return bookings.filter((b) => b.rentalId !== rentalId);
}

/** Marca a unidade como indisponível, com a observação. */
export function markUnitUnavailable(
  units: RentalUnit[],
  unitId: string,
  note: string,
): RentalUnit[] {
  return units.map((u) => (u.id === unitId ? { ...u, status: "unavailable", note } : u));
}

/** "YYYY-MM-DD" que existe no calendário (rejeita 2026-02-30). */
export function isRealDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDays(value, 0) === value;
}

/** Retirada só é possível para reservas ativas cuja data de início já chegou. */
export function canPickUp(
  rental: Pick<RentalType, "status" | "startDate">,
  today: string,
): boolean {
  return rental.status === "reserved" && rental.startDate <= today;
}
