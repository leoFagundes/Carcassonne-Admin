import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES, fillTemplate, gamesPhrase, isEmailTemplateId, mergeTemplate } from "./emailTemplates";

describe("emailTemplates", () => {
  it("cai no padrão quando falta campo, o tipo é errado ou o obrigatório está vazio", () => {
    const merged = mergeTemplate("account-reset", { heading: "Nova senha", subject: "   ", buttonLabel: 3, extra: "x" });
    expect(merged.heading).toBe("Nova senha");
    expect(merged.subject).toBe(EMAIL_TEMPLATES["account-reset"].defaults.subject);
    expect(merged.buttonLabel).toBe(EMAIL_TEMPLATES["account-reset"].defaults.buttonLabel);
    expect(merged).not.toHaveProperty("extra");
    expect(mergeTemplate("rental-order", null)).toEqual(EMAIL_TEMPLATES["rental-order"].defaults);
  });

  it("todo campo tem padrão", () => {
    for (const def of Object.values(EMAIL_TEMPLATES)) {
      for (const field of def.fields) expect(typeof def.defaults[field.key]).toBe("string");
    }
  });

  it("preenche as variáveis e deixa as desconhecidas", () => {
    expect(fillTemplate("Olá, {nome}! Pedido {codigo} {xyz}", { nome: "Ana", codigo: "AB12" })).toBe(
      "Olá, Ana! Pedido AB12 {xyz}",
    );
    expect(gamesPhrase(1)).toBe("o jogo");
    expect(gamesPhrase(3)).toBe("os 3 jogos");
    expect(isEmailTemplateId("rental-order")).toBe(true);
    expect(isEmailTemplateId("client-reservation")).toBe(false);
  });
});
