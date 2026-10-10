"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { SiteThemeId } from "@/types";
import type { BandVariant } from "./bandFrame";
import type { AccessoryPlacement } from "./accessorySlot";

// Cada tema tem um "kit" (decoração das barras fixas, enfeite do logo e
// miniatura do admin) num pedaço separado do código: só é baixado quando o
// tema está ativo ou aparece no admin. Os imports ficam escritos por extenso
// para o Next conseguir separar os pedaços.

export type ThemedId = Exclude<SiteThemeId, "default">;

type BandProps = { variant: BandVariant };
type AccessoryProps = { placement: AccessoryPlacement };

export const THEME_BANDS: Record<ThemedId, ComponentType<BandProps>> = {
  carnaval: dynamic(() => import("./kits/carnaval").then((m) => m.Band), { ssr: false }),
  stpatricks: dynamic(() => import("./kits/stpatricks").then((m) => m.Band), { ssr: false }),
  pascoa: dynamic(() => import("./kits/pascoa").then((m) => m.Band), { ssr: false }),
  aniversario: dynamic(() => import("./kits/aniversario").then((m) => m.Band), { ssr: false }),
  namorados: dynamic(() => import("./kits/namorados").then((m) => m.Band), { ssr: false }),
  junina: dynamic(() => import("./kits/junina").then((m) => m.Band), { ssr: false }),
  oktoberfest: dynamic(() => import("./kits/oktoberfest").then((m) => m.Band), { ssr: false }),
  halloween: dynamic(() => import("./kits/halloween").then((m) => m.Band), { ssr: false }),
  natal: dynamic(() => import("./kits/natal").then((m) => m.Band), { ssr: false }),
  reveillon: dynamic(() => import("./kits/reveillon").then((m) => m.Band), { ssr: false }),
  torneio: dynamic(() => import("./kits/torneio").then((m) => m.Band), { ssr: false }),
};

export const THEME_ACCESSORIES: Record<ThemedId, ComponentType<AccessoryProps>> = {
  carnaval: dynamic(() => import("./kits/carnaval").then((m) => m.Accessory), { ssr: false }),
  stpatricks: dynamic(() => import("./kits/stpatricks").then((m) => m.Accessory), { ssr: false }),
  pascoa: dynamic(() => import("./kits/pascoa").then((m) => m.Accessory), { ssr: false }),
  aniversario: dynamic(() => import("./kits/aniversario").then((m) => m.Accessory), { ssr: false }),
  namorados: dynamic(() => import("./kits/namorados").then((m) => m.Accessory), { ssr: false }),
  junina: dynamic(() => import("./kits/junina").then((m) => m.Accessory), { ssr: false }),
  oktoberfest: dynamic(() => import("./kits/oktoberfest").then((m) => m.Accessory), { ssr: false }),
  halloween: dynamic(() => import("./kits/halloween").then((m) => m.Accessory), { ssr: false }),
  natal: dynamic(() => import("./kits/natal").then((m) => m.Accessory), { ssr: false }),
  reveillon: dynamic(() => import("./kits/reveillon").then((m) => m.Accessory), { ssr: false }),
  torneio: dynamic(() => import("./kits/torneio").then((m) => m.Accessory), { ssr: false }),
};

export const THEME_THUMBNAILS: Record<ThemedId, ComponentType> = {
  carnaval: dynamic(() => import("./kits/carnaval").then((m) => m.Thumbnail), { ssr: false }),
  stpatricks: dynamic(() => import("./kits/stpatricks").then((m) => m.Thumbnail), { ssr: false }),
  pascoa: dynamic(() => import("./kits/pascoa").then((m) => m.Thumbnail), { ssr: false }),
  aniversario: dynamic(() => import("./kits/aniversario").then((m) => m.Thumbnail), { ssr: false }),
  namorados: dynamic(() => import("./kits/namorados").then((m) => m.Thumbnail), { ssr: false }),
  junina: dynamic(() => import("./kits/junina").then((m) => m.Thumbnail), { ssr: false }),
  oktoberfest: dynamic(() => import("./kits/oktoberfest").then((m) => m.Thumbnail), { ssr: false }),
  halloween: dynamic(() => import("./kits/halloween").then((m) => m.Thumbnail), { ssr: false }),
  natal: dynamic(() => import("./kits/natal").then((m) => m.Thumbnail), { ssr: false }),
  reveillon: dynamic(() => import("./kits/reveillon").then((m) => m.Thumbnail), { ssr: false }),
  torneio: dynamic(() => import("./kits/torneio").then((m) => m.Thumbnail), { ssr: false }),
};
