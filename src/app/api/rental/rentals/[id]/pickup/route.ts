import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { pickupRental } from "@/services/server/rentalService";

export const POST = withApi(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  // Com "só avisar" nas regras: o admin já viu o aviso da cópia sem conferir e confirmou.
  const body = (await readJson<unknown>(req)) as { ignorePendingCheck?: unknown } | null;
  await pickupRental(id, admin.uid, { ignorePendingCheck: body?.ignorePendingCheck === true });
});
