import { describe, expect, it } from "vitest";
import type { TypeOrderType } from "@/types";
import { MENU_PLACEHOLDER, illustrationSrc, isMenuIllustration, menuPlaceholderFor } from "./menuIllustrations";

const order: TypeOrderType[] = [
  {
    type: {
      name: "Bebidas",
      order: 0,
      illustration: "chope",
      subtypes: [
        { name: "Vinhos", order: 0, illustration: "vinho" },
        { name: "Cervejas", order: 1 },
        { name: "Antigo", order: 2, illustration: "nao-existe" },
      ],
    },
  },
  { type: { name: "Pizzas", order: 1, subtypes: [{ name: "Doces", order: 0, illustration: "sobremesa" }] } },
  { type: { name: "Porções", order: 2, subtypes: [] } },
];

describe("menuPlaceholderFor", () => {
  it("usa a ilustração da subcategoria quando existe", () => {
    expect(menuPlaceholderFor({ type: "Bebidas", subtype: "Vinhos" }, order)).toBe(illustrationSrc("vinho"));
  });

  it("cai para a da categoria quando a subcategoria não tem", () => {
    expect(menuPlaceholderFor({ type: "Bebidas", subtype: "Cervejas" }, order)).toBe(illustrationSrc("chope"));
    expect(menuPlaceholderFor({ type: "Bebidas" }, order)).toBe(illustrationSrc("chope"));
  });

  it("ignora um valor que não é uma ilustração conhecida", () => {
    expect(menuPlaceholderFor({ type: "Bebidas", subtype: "Antigo" }, order)).toBe(illustrationSrc("chope"));
  });

  it("subcategoria com ilustração vale mesmo sem a da categoria", () => {
    expect(menuPlaceholderFor({ type: "Pizzas", subtype: "Doces" }, order)).toBe(illustrationSrc("sobremesa"));
  });

  it("sem nada escolhido (ou categoria fora da ordenação) usa a imagem geral", () => {
    expect(menuPlaceholderFor({ type: "Pizzas" }, order)).toBe(MENU_PLACEHOLDER);
    expect(menuPlaceholderFor({ type: "Porções", subtype: "Fritas" }, order)).toBe(MENU_PLACEHOLDER);
    expect(menuPlaceholderFor({ type: "Sobremesas" }, order)).toBe(MENU_PLACEHOLDER);
    expect(menuPlaceholderFor({ type: "Bebidas" }, [])).toBe(MENU_PLACEHOLDER);
  });
});

describe("formato PNG (PDF)", () => {
  it("aponta para a versão PNG e mantém a imagem geral", () => {
    expect(menuPlaceholderFor({ type: "Bebidas" }, order, "png")).toBe("/images/ilustracoes/png/chope.png");
    expect(menuPlaceholderFor({ type: "Pizzas" }, order, "png")).toBe(MENU_PLACEHOLDER);
  });
});

describe("isMenuIllustration", () => {
  it("aceita só os ids conhecidos", () => {
    expect(isMenuIllustration("pizza")).toBe(true);
    expect(isMenuIllustration("jogo")).toBe(false);
    expect(isMenuIllustration(undefined)).toBe(false);
  });
});
