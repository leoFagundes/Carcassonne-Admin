import { describe, expect, it } from "vitest";
import {
  adminOrderWarnings,
  canPickupNow,
  checkGuest,
  counterHoldMinutes,
  counterPaymentFor,
  counterPaymentText,
  guestMatches,
  payerEmailFor,
  planAdminOrder,
  type AdminOrderInput,
} from "../adminOrders";
import { bk, makeCtx, makeGame, withBooking, withSettings } from "./fixtures";

const ctx = makeCtx(); // hoje = 2026-11-05 (quinta)
const input = (gameIds: string[], startDate = "2026-11-05", overrides: AdminOrderInput["overrides"] = []) => ({
  gameIds,
  startDate,
  overrides,
});

describe("planAdminOrder", () => {
  it("planeja como o pedido do site, sem exigir e-mail verificado nem aceite online", () => {
    const r = planAdminOrder(input(["g1", "g2"]), ctx);
    expect(r).toMatchObject({ ok: true, overridden: [] });
    if (r.ok) expect(r.items.map((i) => i.dueDate)).toEqual(["2026-11-12", "2026-11-12"]);
  });

  it("pede confirmação para cada limite e só segue com todos confirmados", () => {
    const sunday = withSettings(ctx, { pickupWeekdays: [1, 2, 3, 4, 5, 6] });
    expect(planAdminOrder(input(["g1"], "2026-11-08"), sunday)).toEqual({
      ok: false,
      code: "override_required",
      overrides: ["weekday_not_allowed"],
    });
    expect(planAdminOrder(input(["g1"], "2026-11-08", ["weekday_not_allowed"]), sunday)).toMatchObject({
      ok: true,
      overridden: ["weekday_not_allowed"],
    });

    const busy = { ...ctx, activeGamesCount: 3 };
    expect(planAdminOrder(input(["g1"], "2026-12-20"), busy)).toEqual({
      ok: false,
      code: "override_required",
      overrides: ["advance_limit", "active_limit"],
    });
    // Confirmar só um não basta.
    expect(planAdminOrder(input(["g1"], "2026-12-20", ["advance_limit"]), busy)).toMatchObject({
      code: "override_required",
    });
    expect(planAdminOrder(input(["g1"], "2026-12-20", ["advance_limit", "active_limit"]), busy)).toMatchObject({
      ok: true,
    });
  });

  it("mais jogos que o limite por pedido também é liberável", () => {
    const many = { ...ctx, games: { ...ctx.games, g3: makeGame("g3"), g4: makeGame("g4") } };
    expect(planAdminOrder(input(["g1", "g2", "g3", "g4"]), many)).toEqual({
      ok: false,
      code: "override_required",
      overrides: ["too_many_games", "active_limit"],
    });
  });

  it("nunca libera a cópia ocupada, data no passado ou cliente bloqueado", () => {
    const taken = withBooking(ctx, "g1", bk("u1", "2026-11-05", "2026-11-12", "reserved"));
    expect(planAdminOrder(input(["g1"], "2026-11-05", ["active_limit"]), taken)).toMatchObject({
      code: "game_unavailable",
      gameId: "g1",
    });
    expect(planAdminOrder(input(["g1"], "2026-11-04"), ctx)).toMatchObject({ code: "date_out_of_range" });
    expect(planAdminOrder(input(["g1"], "2026-02-30"), ctx)).toMatchObject({ code: "date_out_of_range" });
    const blocked = { ...ctx, customer: { ...ctx.customer!, isBlocked: true } };
    expect(planAdminOrder(input(["g1"]), blocked)).toMatchObject({ code: "customer_blocked" });
    expect(planAdminOrder(input(["g1", "g1"]), ctx)).toMatchObject({ code: "duplicate_game" });
    expect(planAdminOrder(input([]), ctx)).toMatchObject({ code: "empty_order" });
  });

  it("ignora o serviço desligado no site (o balcão continua funcionando)", () => {
    expect(planAdminOrder(input(["g1"]), withSettings(ctx, { isEnabled: false }))).toMatchObject({ ok: true });
  });
});

describe("adminOrderWarnings", () => {
  it("lista os limites na ordem fixa", () => {
    expect(adminOrderWarnings(1, "2026-11-05", ctx)).toEqual([]);
    expect(adminOrderWarnings(4, "2026-12-30", { ...ctx, activeGamesCount: 1 })).toEqual([
      "too_many_games",
      "advance_limit",
      "active_limit",
    ]);
  });
});

describe("counterPaymentFor", () => {
  const actor = { uid: "a1", name: "Leo" };
  it("pago no balcão guarda forma e valor; cortesia guarda o que deixou de receber", () => {
    expect(counterPaymentFor({ kind: "paid", method: "cash" }, 9000, actor, 5)).toEqual({
      kind: "paid",
      method: "cash",
      amount: 9000,
      at: 5,
      by: "a1",
      byName: "Leo",
    });
    expect(counterPaymentFor({ kind: "courtesy", reason: "  aniversário " }, 9000, actor, 5)).toMatchObject({
      kind: "courtesy",
      amount: 0,
      waived: 9000,
      reason: "aniversário",
    });
    expect(counterPaymentFor({ kind: "later" }, 9000, actor, 5)).toBeNull();
    expect(counterPaymentFor({ kind: "pix" }, 9000, actor, 5)).toBeNull();
  });
});

describe("counterPaymentText", () => {
  it("descreve o pagamento do balcão", () => {
    const base = { amount: 0, at: 1, by: "a", byName: "Leo" };
    expect(counterPaymentText({})).toBeNull();
    expect(counterPaymentText({ counterPayment: { ...base, kind: "paid", method: "card" } })).toBe(
      "Pago no balcão (cartão)",
    );
    expect(counterPaymentText({ counterPayment: { ...base, kind: "courtesy", waived: 100 } })).toBe(
      "Cortesia do Carcassonne Pub",
    );
  });
});

describe("canPickupNow", () => {
  it("só hoje e já pago no balcão ou cortesia", () => {
    expect(canPickupNow({ kind: "paid", method: "card" }, "2026-11-05", "2026-11-05")).toBe(true);
    expect(canPickupNow({ kind: "courtesy", reason: "x" }, "2026-11-05", "2026-11-05")).toBe(true);
    expect(canPickupNow({ kind: "later" }, "2026-11-05", "2026-11-05")).toBe(false);
    expect(canPickupNow({ kind: "paid", method: "card" }, "2026-11-06", "2026-11-05")).toBe(false);
    expect(canPickupNow({ kind: "pix" }, "2026-11-05", "2026-11-05")).toBe(false);
    expect(canPickupNow({ kind: "link" }, "2026-11-05", "2026-11-05")).toBe(false);
  });
});

describe("checkGuest", () => {
  it("normaliza e valida o cadastro rápido", () => {
    expect(checkGuest({ name: "  Ana   Lima ", phone: "(61) 99999-8888", cpf: "529.982.247-25", email: "" }, true)).toEqual({
      ok: true,
      guest: { name: "Ana Lima", phone: "61999998888", cpf: "52998224725", email: "" },
    });
    expect(checkGuest({ name: "Al", phone: "61999998888", cpf: "52998224725" }, true)).toMatchObject({ ok: false });
    expect(checkGuest({ name: "Ana Lima", phone: "9999", cpf: "52998224725" }, true)).toMatchObject({ ok: false });
    expect(checkGuest({ name: "Ana Lima", phone: "61999998888", cpf: "" }, true)).toMatchObject({ ok: false });
    expect(checkGuest({ name: "Ana Lima", phone: "61999998888", cpf: "" }, false)).toMatchObject({ ok: true });
    expect(checkGuest({ name: "Ana Lima", phone: "61999998888", cpf: "11111111111" }, false)).toMatchObject({ ok: false });
    expect(checkGuest({ name: "Ana Lima", phone: "61999998888", cpf: "", email: "ana@" }, false)).toMatchObject({
      ok: false,
    });
  });
});

describe("guestMatches / payerEmailFor / counterHoldMinutes", () => {
  it("junta o histórico só com o mesmo WhatsApp", () => {
    expect(guestMatches({ phone: "61999998888" }, "(61) 99999-8888")).toBe(true);
    expect(guestMatches({ phone: "61999998888" }, "61999997777")).toBe(false);
    expect(guestMatches({ phone: "" }, "")).toBe(false);
  });

  it("e-mail do pagador cai num endereço do pub quando o cliente não tem", () => {
    expect(payerEmailFor("ana@x.com", "ABC123")).toBe("ana@x.com");
    expect(payerEmailFor("", "ABC123")).toBe("pagamentos+abc123@carcassonnepub.com.br");
  });

  it("dá pelo menos 31 minutos para pagar no balcão (mínimo do Pix + folga)", () => {
    expect(counterHoldMinutes(15)).toBe(31);
    expect(counterHoldMinutes(45)).toBe(45);
  });
});
