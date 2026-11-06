import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida o cabeçalho `x-signature` dos webhooks do Mercado Pago.
 * Manifest: `id:{data.id};request-id:{x-request-id};ts:{ts};` (HMAC-SHA256).
 * Partes ausentes (id / request-id) são omitidas do manifest.
 */
export function verifyMercadoPagoSignature(args: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = args;
  if (!xSignature || !secret) return false;

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = Buffer.from(
    createHmac("sha256", secret).update(manifest).digest("hex"),
  );
  const received = Buffer.from(v1);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
