import { describe, expect, it } from "vitest";
import {
  formatRulesVersion,
  isValidRulesVersion,
  nextRulesVersion,
  parseRulesVersion,
  sameRulesVersion,
} from "../rulesVersion";

describe("versão das regras", () => {
  it("sobe de 0.1 em 0.1 e vira no .9", () => {
    expect(nextRulesVersion(2.8)).toBe(2.9);
    expect(nextRulesVersion(2.9)).toBe(3);
    expect(nextRulesVersion(3)).toBe(3.1);
    // versões antigas inteiras continuam
    expect(nextRulesVersion(2)).toBe(2.1);
    // sem lixo de ponto flutuante depois de várias subidas
    let v = 1;
    for (let i = 0; i < 25; i++) v = nextRulesVersion(v);
    expect(v).toBe(3.5);
  });

  it("mostra sempre uma casa", () => {
    expect(formatRulesVersion(3)).toBe("3.0");
    expect(formatRulesVersion(2.1)).toBe("2.1");
    expect(formatRulesVersion(0.1 + 0.2)).toBe("0.3");
  });

  it("compara sem arredondamento", () => {
    expect(sameRulesVersion(0.1 + 0.2, 0.3)).toBe(true);
    expect(sameRulesVersion(2.1, 2.2)).toBe(false);
  });

  it("lê o que o admin digita", () => {
    expect(parseRulesVersion("3")).toBe(3);
    expect(parseRulesVersion("3.1")).toBe(3.1);
    expect(parseRulesVersion(" 3,1 ")).toBe(3.1);
    expect(parseRulesVersion("0")).toBeNull();
    expect(parseRulesVersion("3.15")).toBeNull();
    expect(parseRulesVersion("-1")).toBeNull();
    expect(parseRulesVersion("abc")).toBeNull();
  });

  it("valida o número recebido", () => {
    expect(isValidRulesVersion(2.1)).toBe(true);
    expect(isValidRulesVersion(3)).toBe(true);
    expect(isValidRulesVersion(2.15)).toBe(false);
    expect(isValidRulesVersion(0)).toBe(false);
    expect(isValidRulesVersion("2.1")).toBe(false);
  });
});
