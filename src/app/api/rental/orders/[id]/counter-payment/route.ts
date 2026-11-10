import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { setCounterPayment } from "@/services/server/adminOrderService";
import type { CounterPaymentMethod } from "@/types";

const METHODS: CounterPaymentMethod[] = ["cash", "card", "pix"];

/** Admin: registra (ou desfaz) o pagamento recebido no balcão de um pedido "paga na retirada". */
export const POST = withApi(async (req, ctx) => {
  const token = await requireAdmin(req);
  const { id } = await ctx.params;
  const body = ((await readJson<unknown>(req)) ?? {}) as { kind?: unknown; method?: unknown };
  if (!isDocId(id)) throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  if (body.kind === "clear") return setCounterPayment(token, id, { kind: "clear" });
  if (body.kind === "paid" && METHODS.includes(body.method as CounterPaymentMethod)) {
    return setCounterPayment(token, id, { kind: "paid", method: body.method as CounterPaymentMethod });
  }
  throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
});
