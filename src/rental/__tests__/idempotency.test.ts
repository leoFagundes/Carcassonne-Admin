import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { idempotencyHeader } from "@/services/server/payments/idempotency";

describe("idempotencyHeader", () => {
  it("32 hex do sha256 da chave lógica", () => {
    const key = "abcdefghijklmnopqrst:review:r1,r2,r3,r4,r5";
    expect(idempotencyHeader(key)).toBe(createHash("sha256").update(key).digest("hex").slice(0, 32));
    expect(idempotencyHeader(key)).toMatch(/^[0-9a-f]{32}$/);
  });
  it("estável e distinto por chave", () => {
    expect(idempotencyHeader("o:r1:cancel")).toBe(idempotencyHeader("o:r1:cancel"));
    expect(idempotencyHeader("o:r1:cancel")).not.toBe(idempotencyHeader("o:r2:cancel"));
  });
  it("tamanho fixo mesmo com chave longa", () => {
    expect(idempotencyHeader("x".repeat(500))).toHaveLength(32);
  });
});
