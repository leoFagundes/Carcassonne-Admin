"use client";

import { useSiteTheme } from "./siteThemeContext";
import { THEME_BANDS } from "./kitLoaders";
import type { BandVariant } from "./bandFrame";

/**
 * Decoração do tema dentro de barras fixas e opacas — o cabeçalho do cardápio
 * e o menu lateral do admin — que cobririam as decorações da página. Vai como
 * primeiro filho da barra (que precisa criar contexto de empilhamento, ex:
 * `fixed`/`relative` com z-index): fica atrás do conteúdo da barra.
 */
export default function ThemeBand({ variant }: { variant: BandVariant }) {
  const theme = useSiteTheme();
  if (theme === "default") return null;
  const Band = THEME_BANDS[theme];
  return <Band key={theme} variant={variant} />;
}
