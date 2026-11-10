import { ApiError, isDocId, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { adminAbortUnpaidOrder } from "@/services/server/rentalOrderService";

/** Admin: cancela um pedido ainda não pago (ex.: Pix do balcão que o cliente desistiu). */
export const POST = withApi(async (req, ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  await adminAbortUnpaidOrder(id);
});
