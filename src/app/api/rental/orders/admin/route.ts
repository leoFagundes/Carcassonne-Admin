import { ApiError, isDocId, readJson, requireAdmin, withApi } from "@/services/server/apiHelpers";
import { createAdminOrder, type AdminOrderBody } from "@/services/server/adminOrderService";
import { ADMIN_OVERRIDES, checkGuest, type AdminOverride, type AdminPaymentChoice } from "@/rental/adminOrders";
import { getAdminDb } from "@/services/server/firebaseAdmin";
import { mergeRentalSettings } from "@/rental/defaults";
import type { CounterPaymentMethod, RentalSettingsType } from "@/types";

const MAX_GAME_IDS = 20;
const METHODS: CounterPaymentMethod[] = ["cash", "card", "pix"];
const bad = () => new ApiError(400, "invalid_body", "Corpo da requisição inválido.");

function parsePayment(raw: unknown): AdminPaymentChoice {
  const p = (raw ?? {}) as Record<string, unknown>;
  switch (p.kind) {
    case "paid":
      if (!METHODS.includes(p.method as CounterPaymentMethod)) throw bad();
      return { kind: "paid", method: p.method as CounterPaymentMethod };
    case "courtesy": {
      const reason = typeof p.reason === "string" ? p.reason.trim().slice(0, 300) : "";
      if (reason.length < 3) throw new ApiError(400, "reason_required", "Diga o motivo da cortesia.");
      return { kind: "courtesy", reason };
    }
    case "later":
    case "link":
    case "pix":
      return { kind: p.kind };
    default:
      throw bad();
  }
}

/** Admin: aluguel criado no balcão (cliente escolhido ou cadastrado na hora). */
export const POST = withApi(async (req) => {
  const token = await requireAdmin(req);
  const b = ((await readJson<unknown>(req)) ?? {}) as Record<string, unknown>;

  const { gameIds, startDate, overrides, acceptedRules } = b;
  if (
    !Array.isArray(gameIds) ||
    gameIds.length === 0 ||
    gameIds.length > MAX_GAME_IDS ||
    !gameIds.every(isDocId) ||
    typeof startDate !== "string" ||
    (overrides !== undefined &&
      (!Array.isArray(overrides) || !overrides.every((o) => ADMIN_OVERRIDES.includes(o as AdminOverride))))
  ) {
    throw bad();
  }
  if (acceptedRules !== true) {
    throw new ApiError(400, "rules_required", "Confirme que o cliente leu e aceitou as regras do aluguel.");
  }

  const c = (b.customer ?? {}) as Record<string, unknown>;
  let customer: AdminOrderBody["customer"];
  if (c.kind === "existing" && isDocId(c.uid)) {
    customer = { kind: "existing", uid: c.uid };
  } else if (c.kind === "new") {
    const snap = await getAdminDb().collection("rental-config").doc("settings").get();
    const settings = mergeRentalSettings(snap.exists ? (snap.data() as Partial<RentalSettingsType>) : undefined);
    const check = checkGuest((c.guest ?? {}) as Record<string, string>, settings.requireCpf);
    if (!check.ok) throw new ApiError(400, "invalid_customer", check.message);
    customer = { kind: "new", guest: check.guest };
  } else {
    throw bad();
  }

  return createAdminOrder(token, {
    customer,
    gameIds,
    startDate,
    overrides: (overrides as AdminOverride[] | undefined) ?? [],
    payment: parsePayment(b.payment),
    pickupNow: b.pickupNow === true,
  });
});
