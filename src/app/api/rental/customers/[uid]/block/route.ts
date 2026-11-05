import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { setCustomerBlocked } from "@/services/server/rentalService";

export const POST = withApi(async (req, ctx) => {
  await requireAdmin(req);
  const { uid } = await ctx.params;
  const body = (await readJson<unknown>(req)) as { blocked?: unknown; reason?: unknown } | null;
  const bad = () => new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  if (!isDocId(uid) || !body || typeof body.blocked !== "boolean") throw bad();
  if (body.reason !== undefined && (typeof body.reason !== "string" || body.reason.length > 500)) {
    throw bad();
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (body.blocked && !reason) {
    throw new ApiError(400, "invalid_body", "Informe o motivo do bloqueio.");
  }
  await setCustomerBlocked(uid, body.blocked, body.blocked ? reason : undefined);
});
