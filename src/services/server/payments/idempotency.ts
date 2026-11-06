import { createHash } from "node:crypto";

/**
 * Valor do cabeçalho `X-Idempotency-Key`: 32 hex do sha256 da chave lógica
 * (tamanho fixo, qualquer que seja a chave; a chave lógica fica no Firestore).
 */
export function idempotencyHeader(logicalKey: string): string {
  return createHash("sha256").update(logicalKey).digest("hex").slice(0, 32);
}
