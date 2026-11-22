/**
 * As duas logos que dá para usar como padrão (Configurações → Geral → Logo):
 * a atual (com as canecas) e a original (vetor, em public/images/original-logo.svg).
 * A padrão aparece no menu do admin e é a que o PDF do cardápio usa de início.
 */
export type SiteLogo = "current" | "original";

export const SITE_LOGOS: Record<SiteLogo, { src: string; label: string; hint: string }> = {
  current: { src: "/images/[oficial]-logo.png", label: "Atual", hint: "Com as canecas e os dados" },
  original: { src: "/images/original-logo.svg", label: "Original", hint: "A clássica, em vetor" },
};

/** Cor do dourado gravada no SVG da original (o PDF troca pela cor do tema). */
export const ORIGINAL_LOGO_FILL = "#E6C56B";

/** Valor salvo → logo (o que não for "original" é a atual). */
export function siteLogo(value: unknown): SiteLogo {
  return value === "original" ? "original" : "current";
}
