"use client";

import "./siteTheme.css";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { SiteThemeId } from "@/types";
import { SceneLeavingContext, type SceneVariant } from "./sceneKit";

type SceneProps = { variant: SceneVariant };

// Cada cena é um pedaço separado do código: o site só baixa a do tema ativo
// (e quem está no tema padrão não baixa nenhuma).
const SCENES: Record<Exclude<SiteThemeId, "default">, ComponentType<SceneProps>> = {
  carnaval: dynamic(() => import("./scenes/CarnavalScene"), { ssr: false }),
  stpatricks: dynamic(() => import("./scenes/StPatricksScene"), { ssr: false }),
  pascoa: dynamic(() => import("./scenes/PascoaScene"), { ssr: false }),
  aniversario: dynamic(() => import("./scenes/AniversarioScene"), { ssr: false }),
  namorados: dynamic(() => import("./scenes/NamoradosScene"), { ssr: false }),
  junina: dynamic(() => import("./scenes/JuninaScene"), { ssr: false }),
  oktoberfest: dynamic(() => import("./scenes/OktoberfestScene"), { ssr: false }),
  halloween: dynamic(() => import("./scenes/HalloweenScene"), { ssr: false }),
  natal: dynamic(() => import("./scenes/NatalScene"), { ssr: false }),
  reveillon: dynamic(() => import("./scenes/ReveillonScene"), { ssr: false }),
  torneio: dynamic(() => import("./scenes/TorneioScene"), { ssr: false }),
};

export default function ThemeScene({
  theme,
  variant = "site",
  leaving = false,
}: {
  theme: SiteThemeId;
  variant?: SceneVariant;
  /** Tema que acabou de ser trocado: as camadas somem suavemente. */
  leaving?: boolean;
}) {
  if (theme === "default") return null;
  const Scene = SCENES[theme];
  return (
    <SceneLeavingContext.Provider value={leaving}>
      <Scene variant={variant} />
    </SceneLeavingContext.Provider>
  );
}
