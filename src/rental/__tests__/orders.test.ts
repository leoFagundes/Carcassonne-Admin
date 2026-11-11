import { describe, expect, it } from "vitest";
import { DEFAULT_RENTAL_RULES, DEFAULT_RENTAL_SETTINGS } from "../defaults";
import {
  ORDER_ERROR_MESSAGES,
  canChangeDueDate,
  dueDateBlocker,
  generateOrderCode,
  isProfileComplete,
  planOrder,
} from "../orders";
import { bk, makeCtx, unit, withBooking, withSettings } from "./fixtures";

const ctx = makeCtx();
const customer = ctx.customer!;
const today = ctx.today;
const input = (gameIds: string[], startDate = "2026-11-05", rulesVersion = 1) => ({ gameIds, startDate, rulesVersion });

describe("planOrder", () => {
  it("planeja todos os jogos", () => {
    expect(planOrder(input(["g1", "g2"]), ctx)).toEqual({
      ok: true,
      items: [
        expect.objectContaining({ gameId: "g1", unitId: "u1", unitLabel: "u1", startDate: "2026-11-05", dueDate: "2026-11-12", price: 4500, rentalDays: 7 }),
        expect.objectContaining({ gameId: "g2" }),
      ],
    });
  });

  it("tudo ou nada", () => {
    const busy = withBooking(ctx, "g2", bk("u1", "2026-11-03", "2026-11-10", "reserved"));
    expect(planOrder(input(["g1", "g2"]), busy)).toEqual({ ok: false, code: "game_unavailable", gameId: "g2" });
  });

  it("concorrência", () => {
    const taken = withBooking(ctx, "g1", bk("u1", "2026-11-05", "2026-11-12", "reserved"));
    expect(planOrder(input(["g1"]), taken)).toMatchObject({ ok: false, code: "game_unavailable" });
  });

  it("não muta o contexto", () => {
    const before = JSON.stringify(ctx);
    withBooking(ctx, "g1", bk("u1", "2026-11-05", "2026-11-12", "reserved"));
    withSettings(ctx, { isEnabled: false });
    planOrder(input(["g1"]), ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });

  it("datas manipuladas", () => {
    expect(planOrder(input(["g1"], "2026-11-04"), ctx)).toMatchObject({ code: "date_out_of_range" });
    expect(planOrder(input(["g1"], "2026-12-06"), ctx)).toMatchObject({ code: "date_out_of_range" });
    expect(planOrder(input(["g1"], "2026-12-05"), ctx)).toMatchObject({ ok: true });
    expect(planOrder(input(["g1"], "2026-11-31"), ctx)).toMatchObject({ code: "date_out_of_range" });
    expect(planOrder(input(["g1"], "2026-11-00"), ctx)).toMatchObject({ code: "date_out_of_range" });
    expect(planOrder(input(["g1"], "2026-11-08"), withSettings(ctx, { pickupWeekdays: [1, 2, 3, 4, 5, 6] }))).toMatchObject({ code: "weekday_not_allowed" });
  });

  it("limites e estado do cliente", () => {
    expect(planOrder(input(["g1", "g1"]), ctx)).toMatchObject({ code: "duplicate_game" });
    expect(planOrder(input(["g1"]), { ...ctx, activeGamesCount: 3 })).toMatchObject({ code: "active_limit" });
    expect(planOrder(input(["g1"]), { ...ctx, activeGamesCount: 2 })).toMatchObject({ ok: true });
    expect(planOrder(input(["g1", "g2"]), { ...ctx, activeGamesCount: 2 })).toMatchObject({ code: "active_limit" });
    expect(planOrder(input(["g1"], "2026-11-05", 0), ctx)).toMatchObject({ code: "rules_outdated" });
    expect(planOrder(input(["g1"]), { ...ctx, emailVerified: false })).toMatchObject({ code: "email_not_verified" });
    expect(planOrder(input(["g1"]), withSettings(ctx, { isEnabled: false }))).toMatchObject({ code: "service_disabled" });
    expect(planOrder(input([]), ctx)).toMatchObject({ code: "empty_order" });
    expect(planOrder(input(["g1", "g2"]), withSettings(ctx, { maxGamesPerOrder: 1 }))).toMatchObject({ code: "too_many_games" });
    expect(planOrder(input(["g1"]), { ...ctx, customer: { ...customer, isBlocked: true } })).toMatchObject({ code: "customer_blocked" });
    expect(planOrder(input(["g1"]), { ...ctx, customer: { ...customer, name: "Al" } })).toMatchObject({ code: "profile_incomplete" });
    expect(planOrder(input(["g1"]), { ...ctx, customer: null })).toMatchObject({ code: "profile_incomplete" });
  });

  it("jogos inexistentes e inativos", () => {
    expect(planOrder(input(["zz"]), ctx)).toEqual({ ok: false, code: "game_not_found", gameId: "zz" });
    const inactive = { ...ctx, games: { ...ctx.games, g1: { ...ctx.games.g1, isActive: false } } };
    expect(planOrder(input(["g1"]), inactive)).toEqual({ ok: false, code: "game_inactive", gameId: "g1" });
  });

  it("ordem das checagens segue OrderErrorCode", () => {
    const bad = { ...withSettings(ctx, { isEnabled: false }), emailVerified: false };
    expect(planOrder(input([]), bad)).toMatchObject({ code: "service_disabled" });
    expect(planOrder(input([]), { ...ctx, emailVerified: false })).toMatchObject({ code: "email_not_verified" });
    expect(planOrder(input([], "2020-01-01", 0), ctx)).toMatchObject({ code: "rules_outdated" });
    expect(planOrder(input([], "2020-01-01"), ctx)).toMatchObject({ code: "empty_order" });
  });

  it("CPF opcional por configuração", () => {
    expect(isProfileComplete({ ...customer, cpf: "" }, false)).toBe(true);
    expect(isProfileComplete({ ...customer, cpf: "" }, true)).toBe(false);
    expect(isProfileComplete({ ...customer, cpf: "11111111111" }, true)).toBe(false);
    expect(isProfileComplete({ ...customer, phone: "119876" }, false)).toBe(false);
    expect(isProfileComplete(customer, true)).toBe(true);
    expect(isProfileComplete(null, false)).toBe(false);
  });
});

describe("canChangeDueDate", () => {
  const g = {
    units: [unit("u1")],
    bookings: [bk("u1", "2026-11-01", "2026-11-08", "picked_up", "r1"), bk("u1", "2026-11-12", "2026-11-19", "reserved", "r2")],
    rentalDays: 7,
  };
  it("respeita o próximo booking", () => {
    expect(canChangeDueDate(g, "r1", "2026-11-11", today)).toBe(true);
    expect(canChangeDueDate(g, "r1", "2026-11-12", today)).toBe(false);
    expect(canChangeDueDate(g, "r1", "2026-10-31", today)).toBe(false);
    expect(canChangeDueDate(g, "r1", "2026-11-01", today)).toBe(true);
    expect(canChangeDueDate(g, "nope", "2026-11-11", today)).toBe(false);
  });

  it("respeita a folga entre aluguéis das regras", () => {
    // Próximo retira em 12/11. Folga de 2 dias: a devolução precisa ser até 10/11.
    expect(canChangeDueDate(g, "r1", "2026-11-10", today, 2)).toBe(true);
    expect(canChangeDueDate(g, "r1", "2026-11-11", today, 2)).toBe(false);
    expect(dueDateBlocker(g, "r1", "2026-11-11", today, 2)?.rentalId).toBe("r2");
    expect(dueDateBlocker(g, "r1", "2026-11-10", today, 2)).toBeNull();
  });
});

describe("generateOrderCode", () => {
  it("gera 6 caracteres do alfabeto", () => {
    expect(generateOrderCode(() => 0)).toBe("AAAAAA");
    expect(generateOrderCode(() => 0.999999)).toBe("999999");
    expect(generateOrderCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
});

describe("defaults", () => {
  it("configurações e regras", () => {
    expect(DEFAULT_RENTAL_SETTINGS).toEqual({
      isEnabled: false, pickupWeekdays: [0, 1, 2, 3, 4, 5, 6], maxAdvanceDays: 30,
      maxGamesPerOrder: 3, maxActiveGamesPerCustomer: 3, requireCpf: true,
      onlinePayment: { enabled: false, holdMinutes: 30, cancellationPolicy: "full", feePercent: 10 },
    });
    expect(DEFAULT_RENTAL_RULES.version).toBe(1);
    expect(DEFAULT_RENTAL_RULES.sections).toHaveLength(8);
    expect(new Set(DEFAULT_RENTAL_RULES.sections.map((s) => s.id)).size).toBe(8);
  });
  it("mensagens para todos os códigos", () => {
    expect(ORDER_ERROR_MESSAGES.game_unavailable).toBe("Este jogo não está mais disponível para a data escolhida.");
    for (const m of Object.values(ORDER_ERROR_MESSAGES)) expect(m.length).toBeGreaterThan(10);
  });
});

describe("planOrder sem fila", () => {
  it("recusa reservar depois de quem está com a cópia; permite com a fila ligada", () => {
    // makeGame tem 1 cópia; prazo do jogo de exemplo
    const rented = withBooking(makeCtx(), "g1", bk(makeCtx().games.g1.units[0].id, "2026-11-01", "2026-11-08", "picked_up"));
    const later = input(["g1"], "2026-11-20");
    expect(planOrder(later, rented)).toMatchObject({ ok: true });
    expect(planOrder(later, withSettings(rented, { allowQueue: false }))).toMatchObject({
      ok: false,
      code: "game_unavailable",
      gameId: "g1",
    });
  });
});

describe("planOrder: devolução em dia fechado", () => {
  it("prazo terminando na segunda, com segunda e terça fechadas → quarta", () => {
    const base = withSettings(makeCtx(), { pickupWeekdays: [0, 3, 4, 5, 6], maxAdvanceDays: 30 });
    const ctxDays = { ...base, games: { ...base.games, g1: { ...base.games.g1, rentalDays: 8 } } };
    // retira domingo 15/11 + 8 dias = segunda 23/11 → quarta 25/11
    const plan = planOrder(input(["g1"], "2026-11-15"), ctxDays);
    expect(plan).toMatchObject({ ok: true });
    if (plan.ok) expect(plan.items[0].dueDate).toBe("2026-11-25");
  });
});

describe("planOrder: versão das regras com decimal", () => {
  it("aceita a versão 2.1 quando é a atual e recusa a antiga", () => {
    const ctx21 = { ...makeCtx(), rulesVersion: 2.1 };
    expect(planOrder(input(["g1"], "2026-11-05", 2.1), ctx21)).toMatchObject({ ok: true });
    expect(planOrder(input(["g1"], "2026-11-05", 2), ctx21)).toMatchObject({ ok: false, code: "rules_outdated" });
    // 0.1 + 2.0 calculado no navegador vale como 2.1
    expect(planOrder(input(["g1"], "2026-11-05", 2 + 0.1), ctx21)).toMatchObject({ ok: true });
  });
});
