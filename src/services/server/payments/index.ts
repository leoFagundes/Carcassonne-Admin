import "server-only";
import { createMercadoPagoProvider } from "./mercadoPago";
import type { PaymentProvider } from "./provider";

export function getPaymentProvider(): PaymentProvider {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");
  }
  return createMercadoPagoProvider(token);
}

export function paymentsStatus(): {
  configured: boolean;
  mode: "test" | "production" | null;
} {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { configured: false, mode: null };
  return {
    configured: true,
    mode: token.startsWith("TEST-") ? "test" : "production",
  };
}
