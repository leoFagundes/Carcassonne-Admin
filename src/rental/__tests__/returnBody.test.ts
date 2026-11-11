import { describe, expect, it } from "vitest";
import { parseCheck, parseReturnBody } from "../returnBody";

const TODAY = "2026-11-11";

describe("parseCheck", () => {
  it("lê estado, observação aparada e tirar a cópia", () => {
    expect(parseCheck({ condition: "missing_parts", note: "  faltou um dado ", markUnitUnavailable: true })).toEqual({
      condition: "missing_parts",
      note: "faltou um dado",
      markUnitUnavailable: true,
    });
    expect(parseCheck({ condition: "ok", note: "   ", markUnitUnavailable: false })).toEqual({
      condition: "ok",
      markUnitUnavailable: false,
    });
  });

  it("recusa estado desconhecido, flag ausente e observação longa", () => {
    expect(parseCheck({ condition: "lost", markUnitUnavailable: false })).toBeNull();
    expect(parseCheck({ condition: "ok" })).toBeNull();
    expect(parseCheck({ condition: "ok", markUnitUnavailable: false, note: "x".repeat(501) })).toBeNull();
    expect(parseCheck(null)).toBeNull();
  });
});

describe("parseReturnBody", () => {
  it("conferir depois: check null", () => {
    expect(parseReturnBody({ returnedOn: "2026-11-09", check: null }, TODAY)).toEqual({
      returnedOn: "2026-11-09",
      check: null,
    });
  });

  it("conferir agora: check junto", () => {
    expect(
      parseReturnBody({ returnedOn: "2026-11-11", check: { condition: "ok", markUnitUnavailable: false } }, TODAY),
    ).toEqual({ returnedOn: "2026-11-11", check: { condition: "ok", markUnitUnavailable: false } });
  });

  it("formato antigo (tela aberta antes da atualização) vale como hoje e conferido", () => {
    expect(parseReturnBody({ condition: "damaged", note: "caixa rasgada", markUnitUnavailable: true }, TODAY)).toEqual({
      returnedOn: TODAY,
      check: { condition: "damaged", note: "caixa rasgada", markUnitUnavailable: true },
    });
  });

  it("recusa corpo sem data ou com conferência inválida", () => {
    expect(parseReturnBody({}, TODAY)).toBeNull();
    expect(parseReturnBody({ returnedOn: 20261111, check: null }, TODAY)).toBeNull();
    expect(parseReturnBody({ returnedOn: "2026-11-11", check: { condition: "x" } }, TODAY)).toBeNull();
    expect(parseReturnBody({ returnedOn: "2026-11-11" }, TODAY)).toBeNull();
  });
});
