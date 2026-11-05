import { ApiError, isDocId, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { pickupRental } from "@/services/server/rentalService";

export const POST = withApi(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  if (!isDocId(id)) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  await pickupRental(id, admin.uid);
});
