import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { returnRental } from "@/services/server/rentalService";
import { parseReturnBody } from "@/rental/returnBody";
import { todaySP } from "@/rental/dates";

export const POST = withApi(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const body = parseReturnBody(await readJson<unknown>(req), todaySP());
  if (!isDocId(id) || !body) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  await returnRental(id, admin.uid, body);
});
