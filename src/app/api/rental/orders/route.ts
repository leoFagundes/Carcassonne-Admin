import { ApiError, isDocId, readJson, requireUser, withApi } from "@/services/server/apiHelpers";
import { createOrder } from "@/services/server/rentalService";
import type { OrderInput } from "@/rental/orders";
import { isValidRulesVersion } from "@/rental/rulesVersion";

const MAX_GAME_IDS = 20;

function parseOrderInput(body: unknown): OrderInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const { gameIds, startDate, rulesVersion, paymentChannel } = b;
  if (
    !Array.isArray(gameIds) ||
    gameIds.length === 0 ||
    gameIds.length > MAX_GAME_IDS ||
    !gameIds.every(isDocId) ||
    typeof startDate !== "string" ||
    // Versão com uma casa decimal (ex.: 2.1)
    !isValidRulesVersion(rulesVersion) ||
    (paymentChannel !== undefined && paymentChannel !== "checkout" && paymentChannel !== "pix")
  ) {
    throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
  }
  return { gameIds, startDate, rulesVersion, ...(paymentChannel ? { paymentChannel } : {}) };
}

export const POST = withApi(async (req) => {
  const token = await requireUser(req);
  const input = parseOrderInput(await readJson<unknown>(req));
  return createOrder(token, input);
});
