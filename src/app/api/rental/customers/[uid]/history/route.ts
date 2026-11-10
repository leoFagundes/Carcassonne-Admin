import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { deleteCustomerHistory } from "@/services/server/deletionService";

/** Admin: apaga o histórico de aluguéis do cliente (a conta continua). `force` inclui os em andamento. */
export const POST = withApi(async (req, ctx) => {
  await requireAdmin(req);
  const { uid } = await ctx.params;
  if (!isDocId(uid)) throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  const body = (await readJson<unknown>(req)) as { force?: unknown } | null;
  return deleteCustomerHistory(uid, { force: body?.force === true });
});
