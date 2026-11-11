import type { TypeOrderType } from "@/types";

/**
 * Ilustrações padrão para itens sem foto. As do cardápio são escolhidas por
 * categoria (e subcategoria) em Cardápio → Ordenação do cardápio; os jogos
 * usam sempre a mesma.
 */
export const MENU_ILLUSTRATIONS = [
  { id: "chope", label: "Chope e cerveja", short: "Chope" },
  { id: "drink", label: "Drinks", short: "Drinks" },
  { id: "vinho", label: "Vinhos", short: "Vinhos" },
  { id: "sem-alcool", label: "Sem álcool", short: "Sem álcool" },
  { id: "pizza", label: "Pizzas", short: "Pizzas" },
  { id: "porcao", label: "Porções", short: "Porções" },
  { id: "lanche", label: "Lanches", short: "Lanches" },
  { id: "sobremesa", label: "Sobremesas", short: "Sobremesas" },
] as const;

export type MenuIllustrationId = (typeof MENU_ILLUSTRATIONS)[number]["id"];

/** Imagem de um item do cardápio cuja categoria não tem ilustração escolhida. */
export const MENU_PLACEHOLDER = "/images/[oficial]-pattern-menu-image.png";

/** Imagem padrão de um jogo sem foto. */
export const BOARDGAME_PLACEHOLDER = "/images/ilustracoes/jogo.svg";

export function isMenuIllustration(value: unknown): value is MenuIllustrationId {
  return MENU_ILLUSTRATIONS.some((option) => option.id === value);
}

/**
 * SVG para as telas; PNG para o PDF do cardápio (desenhado num canvas, que não
 * lida bem com SVG sem tamanho próprio).
 */
export type IllustrationFormat = "svg" | "png";

export function illustrationSrc(id: MenuIllustrationId, format: IllustrationFormat = "svg"): string {
  return format === "png" ? `/images/ilustracoes/png/${id}.png` : `/images/ilustracoes/${id}.svg`;
}

/**
 * Imagem padrão de um item sem foto: a ilustração da subcategoria, senão a da
 * categoria, senão a imagem geral do cardápio.
 */
export function menuPlaceholderFor(
  item: { type?: string; subtype?: string },
  typesOrder: readonly TypeOrderType[],
  format: IllustrationFormat = "svg",
): string {
  const entry = typesOrder.find((t) => t.type.name === item.type);
  const sub = item.subtype ? entry?.type.subtypes.find((s) => s.name === item.subtype) : undefined;
  const chosen = [sub?.illustration, entry?.type.illustration].find(isMenuIllustration);
  return chosen ? illustrationSrc(chosen, format) : MENU_PLACEHOLDER;
}
