import { describe, expect, it } from "vitest";
import { formatBRL, parseBRL } from "@/rental/money";

describe("money", () => {
  it("formatBRL", () => {
    expect(formatBRL(4500).replace(/ /g, " ")).toBe("R$ 45,00");
  });

  it("parseBRL aceita formatos comuns", () => {
    expect(parseBRL("45")).toBe(4500);
    expect(parseBRL("45,5")).toBe(4550);
    expect(parseBRL("R$ 45,50")).toBe(4550);
    expect(parseBRL("1.234,56")).toBe(123456);
  });

  it("parseBRL rejeita vazio, inválido e negativo", () => {
    expect(parseBRL("")).toBeNull();
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("-10")).toBeNull();
  });
});
