/**
 * As duas logos que dá para usar como padrão (Configurações → Geral → Logo):
 * a original (vetor, em public/images/original-logo.svg) e a variante (com as
 * canecas). A padrão aparece no menu do admin, no linktree, na página de
 * reserva, na impressão das reservas e é a que o PDF do cardápio usa de início.
 *
 * O valor salvo da variante continua "current" (era a "atual").
 */
export type SiteLogo = "original" | "current";

/** Na ordem em que aparecem nas telas (a original à esquerda). */
export const SITE_LOGO_ORDER: SiteLogo[] = ["original", "current"];

export const SITE_LOGOS: Record<SiteLogo, { src: string; label: string; hint: string }> = {
  original: { src: "/images/original-logo.svg", label: "Original", hint: "A clássica, em vetor" },
  current: { src: "/images/[oficial]-logo.png", label: "Variante", hint: "Com as canecas e os dados" },
};

/** Cor do dourado gravada no SVG da original (o PDF troca pela cor do tema). */
export const ORIGINAL_LOGO_FILL = "#E6C56B";

/** Valor salvo → logo (o que não for "original" é a variante, como sempre foi). */
export function siteLogo(value: unknown): SiteLogo {
  return value === "original" ? "original" : "current";
}
