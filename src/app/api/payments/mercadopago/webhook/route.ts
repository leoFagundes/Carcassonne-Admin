import { isDocId } from "@/services/server/apiHelpers";
import { getPaymentProvider, paymentsStatus } from "@/services/server/payments";
import { ProviderError } from "@/services/server/payments/mercadoPago";
import { verifyMercadoPagoSignature } from "@/services/server/payments/signature";
import { applyPayment } from "@/services/server/rentalOrderService";

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });

const asString = (value: unknown): string | null =>
  typeof value === "string" && value ? value : typeof value === "number" ? String(value) : null;

/**
 * Aviso de pagamento do Mercado Pago. Aceita `?type=payment&data.id=…`,
 * `?topic=payment&id=…` e o corpo `{ type, data: { id } }`. Só confia no
 * pagamento depois de consultá-lo na API (applyPayment confere pedido, valor e
 * moeda). 200 = processado ou ignorado de propósito; 500 = tentar de novo.
 */
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(await req.text());
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    // Corpo vazio ou inválido: vale o que vier na query.
  }
  const bodyData =
    body.data && typeof body.data === "object" ? (body.data as Record<string, unknown>) : {};

  const topic =
    url.searchParams.get("type") ??
    url.searchParams.get("topic") ??
    asString(body.type) ??
    asString(body.topic);
  if (topic !== "payment") return json({ ok: true, ignored: true });

  // O manifest da assinatura usa o data.id da query (é o que o Mercado Pago assina).
  const dataId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? asString(bodyData.id);
  const requestId = req.headers.get("x-request-id");
  // Só ids para o log (limpos, vêm de fora): nunca a assinatura nem o segredo.
  const forLog = (value: string | null, missing: string) =>
    value ? value.replace(/[^\w.-]/g, "?").slice(0, 64) : missing;
  const ids = `pagamento ${forLog(dataId, "(sem id)")}, x-request-id ${forLog(requestId, "(ausente)")}`;
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      `ATENÇÃO: aviso do Mercado Pago recusado (${ids}): MERCADOPAGO_WEBHOOK_SECRET não configurado. ` +
        "Pagamentos só serão confirmados pela varredura ou pela consulta manual.",
    );
    return json({ ok: false, code: "not_configured" }, 503);
  }
  const signed = verifyMercadoPagoSignature({
    xSignature: req.headers.get("x-signature"),
    xRequestId: requestId,
    dataId,
    secret,
  });
  if (!signed) {
    console.error(
      `ATENÇÃO: aviso do Mercado Pago recusado por assinatura inválida (${ids}). ` +
        "Confira se MERCADOPAGO_WEBHOOK_SECRET é a assinatura secreta do webhook (teste × produção).",
    );
    return json({ ok: false, code: "invalid_signature" }, 401);
  }
  if (!dataId) return json({ ok: false, code: "invalid_body" }, 400);

  if (!paymentsStatus().configured) {
    console.error("Webhook do Mercado Pago recebido sem MERCADOPAGO_ACCESS_TOKEN configurado.");
    return json({ ok: false, code: "not_configured" }, 503);
  }

  try {
    let payment;
    try {
      payment = await getPaymentProvider().getPayment(dataId);
    } catch (error) {
      if (error instanceof ProviderError && error.status === 404) {
        console.error(`Webhook: pagamento ${dataId} não encontrado no Mercado Pago; ignorado.`);
        return json({ ok: true, ignored: true });
      }
      throw error;
    }
    const orderId = payment.externalReference;
    if (!isDocId(orderId)) {
      console.error(`Webhook: pagamento ${payment.id} sem pedido válido (${orderId}); ignorado.`);
      return json({ ok: true, ignored: true });
    }
    const result = await applyPayment(orderId, payment);
    return json({ ok: true, result });
  } catch (error) {
    console.error(`Webhook: erro ao processar o pagamento ${dataId}:`, error);
    return json({ ok: false, code: "internal" }, 500);
  }
}
