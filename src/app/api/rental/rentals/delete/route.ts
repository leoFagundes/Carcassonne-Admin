import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { MAX_RENTALS_PER_DELETE, deleteRentals } from "@/services/server/deletionService";

/** Admin: exclui de vez aluguéis encerrados (um ou vários). Os que não podem sair voltam em `skipped`. */
export const POST = withApi(async (req) => {
  await requireAdmin(req);
  const body = (await readJson<unknown>(req)) as { ids?: unknown; force?: unknown } | null;
  const ids = body?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_RENTALS_PER_DELETE ||
    !ids.every(isDocId)
  ) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  return deleteRentals([...new Set(ids)], { force: body?.force === true });
});
