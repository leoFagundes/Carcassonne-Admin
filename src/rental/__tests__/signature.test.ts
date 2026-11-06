import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "@/services/server/payments/signature";

const SECRET = "segredo-de-teste";
const TS = "1700000000";

function sign(dataId: string | null, requestId: string | null, ts = TS) {
  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return createHmac("sha256", SECRET).update(manifest).digest("hex");
}

describe("verifyMercadoPagoSignature", () => {
  it("aceita assinatura válida", () => {
    const v1 = sign("12345", "req-1");
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=${v1}`,
        xRequestId: "req-1",
        dataId: "12345",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("tolera espaços no cabeçalho", () => {
    const v1 = sign("12345", "req-1");
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS}, v1=${v1}`,
        xRequestId: "req-1",
        dataId: "12345",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejeita v1 errado", () => {
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=${"0".repeat(64)}`,
        xRequestId: "req-1",
        dataId: "12345",
        secret: SECRET,
      }),
    ).toBe(false);
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=abc`,
        xRequestId: "req-1",
        dataId: "12345",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejeita segredo diferente", () => {
    const v1 = sign("12345", "req-1");
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=${v1}`,
        xRequestId: "req-1",
        dataId: "12345",
        secret: "outro",
      }),
    ).toBe(false);
  });

  it("rejeita cabeçalho ausente ou malformado", () => {
    const base = { xRequestId: "req-1", dataId: "12345", secret: SECRET };
    expect(verifyMercadoPagoSignature({ ...base, xSignature: null })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, xSignature: "" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, xSignature: "lixo" })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, xSignature: `ts=${TS}` })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, xSignature: "v1=abcd" })).toBe(false);
  });

  it("normaliza dataId em maiúsculas para minúsculas", () => {
    const v1 = sign("ABC123", "req-1");
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=${v1}`,
        xRequestId: "req-1",
        dataId: "ABC123",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("omite request-id do manifest quando ausente", () => {
    const v1 = sign("12345", null);
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=${v1}`,
        xRequestId: null,
        dataId: "12345",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("omite id do manifest quando dataId ausente", () => {
    const v1 = sign(null, "req-1");
    expect(
      verifyMercadoPagoSignature({
        xSignature: `ts=${TS},v1=${v1}`,
        xRequestId: "req-1",
        dataId: null,
        secret: SECRET,
      }),
    ).toBe(true);
  });
});
