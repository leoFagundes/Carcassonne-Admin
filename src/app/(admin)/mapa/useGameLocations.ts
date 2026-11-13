"use client";

import { useEffect, useMemo, useState } from "react";
import FloorPlanRepository from "@/services/repositories/FloorPlanRepository";
import ShelfRepository from "@/services/repositories/ShelfRepository";
import { SEED_PLAN } from "@/floorplan/seed";
import { locateGames, type GameLocation, type ShelfContent } from "@/floorplan/shelves";
import type { FloorPlan } from "@/floorplan/types";

/** Onde fica cada jogo da Coleção nos armários do mapa (ao vivo). */
export function useGameLocations(): Map<string, GameLocation[]> {
  const [plan, setPlan] = useState<FloorPlan>(SEED_PLAN);
  const [contents, setContents] = useState<Map<string, ShelfContent>>(new Map());
  useEffect(() => FloorPlanRepository.subscribePlan((p) => setPlan(p ?? SEED_PLAN), () => {}), []);
  useEffect(() => ShelfRepository.subscribeAll(setContents), []);
  return useMemo(() => locateGames(plan, contents), [plan, contents]);
}
