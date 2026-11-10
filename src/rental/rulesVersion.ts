/**
 * Versão das regras do aluguel com uma casa decimal: sobe de 0.1 em 0.1
 * (2.8 → 2.9 → 3.0). Guardada como número; as contas usam décimos inteiros
 * para não sofrer com arredondamento (0.1 + 0.2).
 */

const toTenths = (v: number) => Math.round(v * 10);

export const MAX_RULES_VERSION = 999.9;

/** Próxima versão: +0.1. */
export function nextRulesVersion(current: number): number {
  return (toTenths(current) + 1) / 10;
}

/** "3.0", "2.1" (sempre uma casa). */
export function formatRulesVersion(version: number): string {
  return (toTenths(version) / 10).toFixed(1);
}

/** Mesma versão, ignorando lixo de ponto flutuante. */
export function sameRulesVersion(a: number, b: number): boolean {
  return toTenths(a) === toTenths(b);
}

/** Texto digitado ("3", "3.1", "3,1") → versão; inválido (0, negativo, 2 casas, texto) → null. */
export function parseRulesVersion(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d)?$/.test(t)) return null;
  const v = Number(t);
  return v > 0 && v <= MAX_RULES_VERSION ? toTenths(v) / 10 : null;
}

/** Versão válida para guardar/aceitar: positiva e com no máximo uma casa. */
export function isValidRulesVersion(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= MAX_RULES_VERSION && Math.abs(v * 10 - toTenths(v)) < 1e-6;
}
