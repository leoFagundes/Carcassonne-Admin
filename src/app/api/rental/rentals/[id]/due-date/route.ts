import { isRealDate } from "@/rental/bookings";
import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { changeDueDate } from "@/services/server/rentalService";

export const POST = withApi(async (req, ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const body = (await readJson<unknown>(req)) as { dueDate?: unknown } | null;
  if (!isDocId(id) || !isRealDate(body?.dueDate)) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  await changeDueDate(id, body.dueDate);
});
