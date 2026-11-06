import { ApiError, isDocId, requireUser, withApi } from "@/services/server/apiHelpers";
import { verifyOrderPayment } from "@/services/server/rentalOrderService";

/** Consulta o pagamento no Mercado Pago e aplica o resultado (dono ou admin). */
export const POST = withApi(async (req, ctx) => {
  const token = await requireUser(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) throw new ApiError(404, "not_found", "Pedido não encontrado.");
  return verifyOrderPayment(id, token.uid);
});
