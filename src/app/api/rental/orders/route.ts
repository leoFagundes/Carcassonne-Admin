import { ApiError, isDocId, readJson, requireUser, withApi } from "@/services/server/apiHelpers";
import { createOrder } from "@/services/server/rentalService";
import type { OrderInput } from "@/rental/orders";

const MAX_GAME_IDS = 20;

function parseOrderInput(body: unknown): OrderInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const { gameIds, startDate, rulesVersion } = b;
  if (
    !Array.isArray(gameIds) ||
    gameIds.length === 0 ||
    gameIds.length > MAX_GAME_IDS ||
    !gameIds.every(isDocId) ||
    typeof startDate !== "string" ||
    typeof rulesVersion !== "number" ||
    !Number.isInteger(rulesVersion)
  ) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  return { gameIds, startDate, rulesVersion };
}

export const POST = withApi(async (req) => {
  const token = await requireUser(req);
  const input = parseOrderInput(await readJson<unknown>(req));
  return createOrder(token, input);
});
