import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { reviewCancellation } from "@/services/server/rentalOrderService";

/**
 * Decide um cancelamento em análise: `{ decision: "approve", amount }` (centavos)
 * ou `{ decision: "deny", reason }`.
 */
export const POST = withApi(async (req, ctx) => {
  const token = await requireAdmin(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) throw new ApiError(404, "not_found", "Pedido não encontrado.");
  const body = (await readJson<unknown>(req)) as
    | { decision?: unknown; amount?: unknown; reason?: unknown }
    | null;
  return reviewCancellation(id, token.uid, body?.decision, body?.amount, body?.reason);
});
