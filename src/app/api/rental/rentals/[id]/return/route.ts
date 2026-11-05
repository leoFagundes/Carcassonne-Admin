import type { RentalReturnCondition } from "@/types";
import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { returnRental } from "@/services/server/rentalService";

const CONDITIONS: RentalReturnCondition[] = ["ok", "damaged", "missing_parts"];

export const POST = withApi(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const body = (await readJson<unknown>(req)) as {
    condition?: unknown;
    note?: unknown;
    markUnitUnavailable?: unknown;
  } | null;
  const bad = () => new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  if (!isDocId(id) || !body) throw bad();
  if (!CONDITIONS.includes(body.condition as RentalReturnCondition)) throw bad();
  if (typeof body.markUnitUnavailable !== "boolean") throw bad();
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 500)) {
    throw bad();
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  await returnRental(id, admin.uid, {
    condition: body.condition as RentalReturnCondition,
    ...(note ? { note } : {}),
    markUnitUnavailable: body.markUnitUnavailable,
  });
});
