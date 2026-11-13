import { tableTitle } from "@/floorplan/catalog";
import type { SeatUnit } from "@/floorplan/day";
import type { MapReserve } from "@/floorplan/types";

/** "Mesa 12", "Mesas 2, 3" ou "Festa (mesas 2, 3)". */
export function unitTitle(u: SeatUnit): string {
  if (u.isGroup) return u.name === u.reserveName ? `Mesas ${u.reserveName}` : `${u.name} (mesas ${u.reserveName})`;
  return tableTitle(u.name);
}

/** Pessoas da reserva (adultos + crianças). */
export function people(r: MapReserve): number {
  return (r.adults || 0) + (r.childs || 0);
}
