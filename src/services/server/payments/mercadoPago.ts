import "server-only";
import { randomUUID } from "node:crypto";
import type {
  CreateCheckoutInput,
  PaymentProvider,
  ProviderPayment,
} from "./provider";

const BASE_URL = "https://api.mercadopago.com";

const STATUSES: ProviderPayment["status"][] = [
  "approved",
  "pending",
  "in_process",
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
];

/** ISO 8601 com offset -03:00 (America/Sao_Paulo, sem horário de verão). */
function toSaoPauloIso(ms: number): string {
  const shifted = new Date(ms - 3 * 60 * 60 * 1000);
  return shifted.toISOString().replace("Z", "-03:00");
}

const toReais = (cents: number) => Math.round(cents) / 100;
const toCents = (reais: number) => Math.round(reais * 100);

type MpPayment = {
  id: number | string;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string | null;
  payment_type_id?: string;
  payment_method_id?: string;
  date_approved?: string | null;
};

function mapPayment(p: MpPayment): ProviderPayment {
  const status = STATUSES.includes(p.status as ProviderPayment["status"])
    ? (p.status as ProviderPayment["status"])
    : "pending";
  let method: ProviderPayment["method"] = "other";
  if (p.payment_method_id === "pix" || p.payment_type_id === "bank_transfer") {
    method = "pix";
  } else if (
    p.payment_type_id === "credit_card" ||
    p.payment_type_id === "debit_card"
  ) {
    method = "card";
  }
  const approvedMs = p.date_approved ? Date.parse(p.date_approved) : NaN;
  return {
    id: String(p.id),
    status,
    amount: toCents(p.transaction_amount ?? 0),
    currency: p.currency_id ?? "BRL",
    externalReference: p.external_reference ?? null,
    method,
    ...(Number.isFinite(approvedMs) ? { approvedAt: approvedMs } : {}),
  };
}

export function createMercadoPagoProvider(token: string): PaymentProvider {
  const sandbox = token.startsWith("TEST-");

  async function call<T>(
    path: string,
    init: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `Mercado Pago ${init.method ?? "GET"} ${path} falhou (${res.status}):`,
        text,
      );
      throw new Error(`Falha no provedor de pagamento (HTTP ${res.status}).`);
    }
    return (await res.json()) as T;
  }

  return {
    async createCheckout(input: CreateCheckoutInput) {
      const secure = input.returnUrl.startsWith("https://");
      const expires = toSaoPauloIso(input.expiresAt);
      const body = {
        items: input.items.map((i) => ({
          id: i.id,
          title: i.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: toReais(i.unitPrice),
        })),
        external_reference: input.orderId,
        payer: { email: input.payerEmail },
        back_urls: {
          success: input.returnUrl,
          failure: input.returnUrl,
          pending: input.returnUrl,
        },
        ...(secure ? { auto_return: "approved" } : {}),
        notification_url: input.notificationUrl,
        expires: true,
        expiration_date_from: toSaoPauloIso(Date.now()),
        expiration_date_to: expires,
        date_of_expiration: expires,
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }],
          installments: 1,
        },
        statement_descriptor: "CARCASSONNE",
      };
      const pref = await call<{
        id: string;
        init_point?: string;
        sandbox_init_point?: string;
      }>("/checkout/preferences", { method: "POST", body });
      const checkoutUrl = sandbox
        ? (pref.sandbox_init_point ?? pref.init_point)
        : pref.init_point;
      if (!checkoutUrl) {
        console.error("Mercado Pago: preferência sem link de checkout", pref);
        throw new Error("Resposta inválida do provedor de pagamento.");
      }
      return { checkoutUrl, providerCheckoutId: pref.id };
    },

    async getPayment(paymentId: string) {
      const p = await call<MpPayment>(
        `/v1/payments/${encodeURIComponent(paymentId)}`,
      );
      return mapPayment(p);
    },

    async findPaymentsByReference(orderId: string) {
      const r = await call<{ results?: MpPayment[] }>(
        `/v1/payments/search?external_reference=${encodeURIComponent(orderId)}`,
      );
      return (r.results ?? []).map(mapPayment);
    },

    async refund(paymentId: string, amount?: number) {
      const r = await call<{ id: number | string; amount?: number }>(
        `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
        {
          method: "POST",
          headers: { "X-Idempotency-Key": randomUUID() },
          body: amount === undefined ? {} : { amount: toReais(amount) },
        },
      );
      return {
        refundId: String(r.id),
        amount: r.amount === undefined ? (amount ?? 0) : toCents(r.amount),
      };
    },
  };
}
