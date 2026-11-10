import { ApiError, isDocId, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { deleteAccount } from "@/services/server/deletionService";

/** Admin: exclui de vez a conta (login, cadastro, acesso de admin e histórico de aluguéis). */
export const POST = withApi(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { uid } = await ctx.params;
  if (!isDocId(uid)) throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  // Corpo opcional: { force: true } apaga também os aluguéis em andamento (libera as cópias).
  let force = false;
  try {
    force = ((await req.json()) as { force?: unknown } | null)?.force === true;
  } catch {
    // sem corpo: exclusão normal
  }
  return deleteAccount(uid, admin.uid, { force });
});
