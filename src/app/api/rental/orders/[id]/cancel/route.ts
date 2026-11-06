import { ApiError, isDocId, requireUser, withApi } from "@/services/server/apiHelpers";
import { cancelPendingOrder } from "@/services/server/rentalOrderService";

export const POST = withApi(async (req, ctx) => {
  const token = await requireUser(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  await cancelPendingOrder(id, token.uid);
});
