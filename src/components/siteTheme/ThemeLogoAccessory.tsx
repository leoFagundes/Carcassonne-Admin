"use client";

import type { SiteThemeId } from "@/types";
import { useSiteTheme } from "./siteThemeContext";
import { THEME_ACCESSORIES } from "./kitLoaders";
import type { AccessoryPlacement } from "./accessorySlot";

/**
 * Enfeite do tema em cima do logo, em gravura (chapéu, coroa, orelhas...).
 * Vai dentro do container do logo, que precisa ser `relative` (e de
 * preferência `isolate`, para as orelhas ficarem atrás). Sem `theme`, usa o
 * tema ativo do site. `placement="corner"`: versão menor, no canto — para
 * logos com pouco espaço acima (ex: o do menu lateral do admin).
 */
export default function ThemeLogoAccessory({
  theme,
  placement = "top",
}: {
  theme?: SiteThemeId;
  placement?: AccessoryPlacement;
}) {
  const activeTheme = useSiteTheme();
  const current = theme ?? activeTheme;
  if (current === "default") return null;
  const Accessory = THEME_ACCESSORIES[current];
  return <Accessory key={current} placement={placement} />;
}
