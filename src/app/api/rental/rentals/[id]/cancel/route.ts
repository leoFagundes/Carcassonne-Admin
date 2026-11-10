import {
  ApiError,
  isAdminUid,
  isDocId,
  readJson,
  requireUser,
  withApi,
} from "@/services/server/apiHelpers";
import { cancelRental } from "@/services/server/rentalService";

/**
 * Cancela um aluguel (dono ou admin) aplicando a política do pagamento online.
 * Admin, em pedido pago: `refundAmount` em centavos (0 = sem reembolso).
 * `as: "customer"`: a tela do cliente (Minha conta) — mesmo uma conta de
 * admin cancela o próprio aluguel como cliente, com a política de reembolso.
 */
export const POST = withApi(async (req, ctx) => {
  const token = await requireUser(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  const body = (await readJson<unknown>(req)) as
    | { reason?: unknown; refundAmount?: unknown; as?: unknown }
    | null;
  const reason = typeof body?.reason === "string" ? body.reason : undefined;
  const isAdmin = body?.as !== "customer" && (await isAdminUid(token.uid));
  return cancelRental(id, { uid: token.uid, isAdmin }, reason, isAdmin ? body?.refundAmount : undefined);
});
