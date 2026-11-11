import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { checkRental } from "@/services/server/rentalService";
import { parseCheck } from "@/rental/returnBody";

/** Conclui a conferência de um aluguel devolvido (estado do jogo, observação, tirar a cópia). */
export const POST = withApi(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const check = parseCheck(await readJson<unknown>(req));
  if (!isDocId(id) || !check) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  await checkRental(id, admin.uid, check);
});
