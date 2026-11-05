import { describe, expect, it } from "vitest";
import { formatCpf, isValidCpf, normalizeCpf } from "@/rental/cpf";

describe("cpf", () => {
  it("isValidCpf", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("1234567890")).toBe(false);
  });

  it("normalizeCpf e formatCpf", () => {
    expect(normalizeCpf(" 529.982.247-25 ")).toBe("52998224725");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });
});
