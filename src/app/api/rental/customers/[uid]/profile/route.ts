import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { updateCustomerByAdmin } from "@/services/server/rentalService";

/** Admin: corrige nome, WhatsApp, CPF (e o e-mail do cliente sem conta). */
export const POST = withApi(async (req, ctx) => {
  await requireAdmin(req);
  const { uid } = await ctx.params;
  if (!isDocId(uid)) throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  const body = ((await readJson<unknown>(req)) ?? {}) as Record<string, unknown>;
  return updateCustomerByAdmin(uid, body);
});
