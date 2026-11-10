import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { refundOrder } from "@/services/server/rentalOrderService";

/**
 * Reembolso pelo admin: `{ amount (centavos), requestId, reason? }`. O
 * `requestId` é gerado no navegador (um por pedido de reembolso) e torna a
 * repetição segura.
 */
export const POST = withApi(async (req, ctx) => {
  const token = await requireAdmin(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) throw new ApiError(404, "not_found", "Pedido não encontrado.");
  const body = (await readJson<unknown>(req)) as
    | { amount?: unknown; requestId?: unknown; reason?: unknown; cancelRentals?: unknown }
    | null;
  return refundOrder(id, token.uid, body?.amount, body?.requestId, body?.reason, body?.cancelRentals);
});
