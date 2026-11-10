import { describe, expect, it } from "vitest";
import { parseInline, parseRich, plainText, safeHref } from "@/utils/richMarkup";

const t = (text: string) => ({ type: "text", text });

describe("parseInline", () => {
  it("texto puro", () => {
    expect(parseInline("olá mundo")).toEqual([t("olá mundo")]);
  });

  it("cada formatação", () => {
    expect(parseInline("**a**")).toEqual([{ type: "bold", children: [t("a")] }]);
    expect(parseInline("*a*")).toEqual([{ type: "italic", children: [t("a")] }]);
    expect(parseInline("__a__")).toEqual([{ type: "underline", children: [t("a")] }]);
    expect(parseInline("~~a~~")).toEqual([{ type: "strike", children: [t("a")] }]);
    expect(parseInline("==a==")).toEqual([{ type: "mark", children: [t("a")] }]);
  });

  it("formatações combinadas (aninhadas)", () => {
    expect(parseInline("**negrito *e itálico***")).toEqual([
      { type: "bold", children: [t("negrito "), { type: "italic", children: [t("e itálico")] }] },
    ]);
    expect(parseInline("==__x__==")).toEqual([{ type: "mark", children: [{ type: "underline", children: [t("x")] }] }]);
  });

  it("link com texto formatado", () => {
    expect(parseInline("veja [as **regras**](https://x.com/r) aqui")).toEqual([
      t("veja "),
      { type: "link", href: "https://x.com/r", children: [t("as "), { type: "bold", children: [t("regras")] }] },
      t(" aqui"),
    ]);
  });

  it("link perigoso vira texto", () => {
    expect(parseInline("[clique](javascript:alert(1))")).toEqual([t("[clique](javascript:alert(1))")]);
  });

  it("marcador sem par ou com espaço fica literal", () => {
    expect(parseInline("2 * 3 * 4")).toEqual([t("2 * 3 * 4")]);
    expect(parseInline("**sem fim")).toEqual([t("**sem fim")]);
  });

  it("barra invertida escapa", () => {
    expect(parseInline("\\*literal\\*")).toEqual([t("*literal*")]);
  });

  it("compatível com o antigo **negrito**", () => {
    expect(plainText(parseInline("um **dois** três"))).toBe("um dois três");
  });
});

describe("safeHref", () => {
  it("aceita http(s), página do site, e-mail, telefone e www", () => {
    expect(safeHref("https://a.com")).toBe("https://a.com");
    expect(safeHref("/aluguel")).toBe("/aluguel");
    expect(safeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeHref("tel:+55 61 99999-0000")).toBe("tel:+55 61 99999-0000");
    expect(safeHref("www.carcassonnepub.com.br")).toBe("https://www.carcassonnepub.com.br");
  });

  it("recusa o resto", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.com")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
  });
});

describe("parseRich", () => {
  it("parágrafos com quebra de linha e linha em branco", () => {
    expect(parseRich("a\nb\n\nc")).toEqual([
      { type: "paragraph", lines: [[t("a")], [t("b")]] },
      { type: "paragraph", lines: [[t("c")]] },
    ]);
  });

  it("subtítulo, listas e aviso", () => {
    expect(parseRich("## Prazo\n- um\n- dois\n1. a\n2. b\n> atenção")).toEqual([
      { type: "heading", children: [t("Prazo")] },
      { type: "list", ordered: false, items: [[t("um")], [t("dois")]] },
      { type: "list", ordered: true, items: [[t("a")], [t("b")]] },
      { type: "quote", lines: [[t("atenção")]] },
    ]);
  });

  it("formatação dentro de lista", () => {
    expect(parseRich("- **multa** de R$ 10")).toEqual([
      { type: "list", ordered: false, items: [[{ type: "bold", children: [t("multa")] }, t(" de R$ 10")]] },
    ]);
  });
});

describe("negrito e itálico juntos", () => {
  it("***texto*** vira negrito com itálico", () => {
    expect(parseInline("***x***")).toEqual([{ type: "bold", children: [{ type: "italic", children: [t("x")] }] }]);
  });
});
