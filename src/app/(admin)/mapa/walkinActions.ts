"use client";

import { newId, type SeatUnit } from "@/floorplan/day";
import type { ManualState, Walkin } from "@/floorplan/types";
import FloorPlanRepository from "@/services/repositories/FloorPlanRepository";

/** Para gravar: sem `id` e sem `undefined`. */
function clean(w: Walkin): Walkin {
  const out: Walkin = { tables: w.tables, people: w.people, at: w.at };
  if (w.name?.trim()) out.name = w.name.trim().slice(0, 60);
  if (w.leftAt !== undefined) out.leftAt = w.leftAt;
  return out;
}

/** Cliente sem reserva senta na mesa: ela fica ocupada (a marcação à mão sai). */
export function seatWalkin(date: string, unit: SeatUnit, name: string, people: number) {
  const w: Walkin = { tables: unit.tableIds, people, at: Date.now() };
  if (name) w.name = name;
  return FloorPlanRepository.patchDay(date, { walkins: { [newId("w")]: clean(w) }, manual: { [unit.key]: null } });
}

/**
 * Libera a mesa: quem estava sem reserva foi embora (o registro fica no dia).
 * Se ainda tem reserva marcada como chegou, marca Livre à mão.
 */
export function releaseUnit(date: string, unit: SeatUnit) {
  const now = Date.now();
  const walkins = Object.fromEntries(unit.walkins.map((w) => [w.id, clean({ ...w, leftAt: now })]));
  const stillArrived = unit.reservations.some((r) => r.isArrived);
  return FloorPlanRepository.patchDay(date, {
    walkins,
    manual: { [unit.key]: stillArrived ? { state: "free", at: now } : null },
  });
}

/** Troca o estado; "Livre" também registra a saída de quem estava sem reserva. */
export function setUnitState(date: string, unit: SeatUnit, state: ManualState | null) {
  const now = Date.now();
  if (state === "free" && unit.walkins.length) {
    const walkins = Object.fromEntries(unit.walkins.map((w) => [w.id, clean({ ...w, leftAt: now })]));
    return FloorPlanRepository.patchDay(date, { walkins, manual: { [unit.key]: { state: "free", at: now } } });
  }
  return FloorPlanRepository.setManual(date, unit.key, state ? { state, at: now } : null);
}
