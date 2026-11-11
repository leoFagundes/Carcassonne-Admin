import { describe, expect, it } from "vitest";
import {
  applyDiscount,
  gamePricing,
  promotionMessage,
  sanitizeDiscount,
  sanitizePromotion,
} from "../discounts";
import { formatBRL } from "../money";

const TODAY = "2026-11-11";

describe("applyDiscount", () => {
  it("percentual arredonda para o centavo", () => {
    expect(applyDiscount(5000, { kind: "percent", value: 20 })).toBe(4000);
    expect(applyDiscount(3333, { kind: "percent", value: 15 })).toBe(2833); // 499,95 → 500
  });

  it("valor fixo, sem ficar abaixo de R$ 1,00", () => {
    expect(applyDiscount(5000, { kind: "amount", value: 1000 })).toBe(4000);
    expect(applyDiscount(5000, { kind: "amount", value: 9999 })).toBe(100);
  });

  it("jogo mais barato que R$ 1,00 não fica mais caro", () => {
    expect(applyDiscount(80, { kind: "amount", value: 50 })).toBe(80);
  });
});

describe("sanitizeDiscount", () => {
  it("aceita percentual de 1 a 90 e valor positivo", () => {
    expect(sanitizeDiscount({ kind: "percent", value: 20 })).toEqual({ kind: "percent", value: 20 });
    expect(sanitizeDiscount({ kind: "amount", value: 1000, until: "2026-11-30" })).toEqual({
      kind: "amount",
      value: 1000,
      until: "2026-11-30",
    });
  });

  it("recusa fora da faixa, tipo errado e data inválida some", () => {
    expect(sanitizeDiscount({ kind: "percent", value: 0 })).toBeNull();
    expect(sanitizeDiscount({ kind: "percent", value: 95 })).toBeNull();
    expect(sanitizeDiscount({ kind: "amount", value: 0 })).toBeNull();
    expect(sanitizeDiscount({ kind: "x", value: 10 })).toBeNull();
    expect(sanitizeDiscount(null)).toBeNull();
    expect(sanitizeDiscount({ kind: "percent", value: 10, until: "30/11" })).toEqual({ kind: "percent", value: 10 });
  });
});

describe("gamePricing", () => {
  const game = { price: 5000 };

  it("sem promoção, preço cheio", () => {
    expect(gamePricing(game, null, TODAY)).toEqual({ price: 5000 });
  });

  it("desconto do jogo", () => {
    expect(gamePricing({ ...game, discount: { kind: "percent", value: 20 } }, null, TODAY)).toEqual({
      price: 4000,
      listPrice: 5000,
      source: "game",
      label: "-20%",
    });
  });

  it("desconto em todos os jogos", () => {
    expect(gamePricing(game, { promotion: { allGames: { kind: "amount", value: 500 } } }, TODAY)).toMatchObject({
      price: 4500,
      listPrice: 5000,
      source: "all",
      label: `-${formatBRL(500)}`,
    });
  });

  it("não soma: vale o que deixa mais barato", () => {
    const settings = { promotion: { allGames: { kind: "percent" as const, value: 10 } } };
    expect(gamePricing({ ...game, discount: { kind: "percent", value: 30 } }, settings, TODAY)).toMatchObject({
      price: 3500,
      source: "game",
    });
    expect(gamePricing({ ...game, discount: { kind: "amount", value: 100 } }, settings, TODAY)).toMatchObject({
      price: 4500,
      source: "all",
    });
  });

  it("promoção vencida não vale (o último dia ainda vale)", () => {
    expect(gamePricing({ ...game, discount: { kind: "percent", value: 20, until: "2026-11-10" } }, null, TODAY)).toEqual({
      price: 5000,
    });
    expect(
      gamePricing({ ...game, discount: { kind: "percent", value: 20, until: "2026-11-11" } }, null, TODAY).price,
    ).toBe(4000);
    expect(
      gamePricing(game, { promotion: { allGames: { kind: "percent", value: 10 }, until: "2026-11-10" } }, TODAY).price,
    ).toBe(5000);
  });

  it("desconto inválido salvo à mão é ignorado", () => {
    expect(gamePricing({ ...game, discount: { kind: "percent", value: 500 } }, null, TODAY)).toEqual({ price: 5000 });
  });
});

describe("mensagem de promoção", () => {
  it("aparece aparada e some quando vence ou está vazia", () => {
    expect(promotionMessage({ promotion: { message: "  Black Friday: 20% em tudo  " } }, TODAY)).toBe(
      "Black Friday: 20% em tudo",
    );
    expect(promotionMessage({ promotion: { message: "x", until: "2026-11-10" } }, TODAY)).toBeNull();
    expect(promotionMessage({ promotion: { message: "   " } }, TODAY)).toBeNull();
    expect(promotionMessage({}, TODAY)).toBeNull();
  });

  it("promoção sem mensagem nem desconto vira null", () => {
    expect(sanitizePromotion({ message: " ", until: "2026-11-30" })).toBeNull();
    expect(sanitizePromotion({ allGames: { kind: "percent", value: 10 }, extra: 1 })).toEqual({
      allGames: { kind: "percent", value: 10 },
    });
  });
});

describe("pedido com promoção", () => {
  it("o aluguel e o total do pedido saem com o preço com desconto (e guardam o cheio)", async () => {
    const { planItems, buildOrderRecords, buildRentalOrderDoc } = await import("../orders");
    const { DEFAULT_RENTAL_SETTINGS } = await import("../defaults");
    const base = {
      name: "Catan", description: "", image: "", difficulty: "", minPlayers: 1, maxPlayers: 4, playTime: 60,
      types: [], rentalDays: 3, isActive: true, bookings: [], units: [{ id: "u1", label: "Cópia 1", status: "active" as const }],
    };
    const games = {
      g1: { ...base, id: "g1", price: 5000, discount: { kind: "percent" as const, value: 20 } },
      g2: { ...base, id: "g2", name: "Azul", price: 3000 },
    };
    const settings = { ...DEFAULT_RENTAL_SETTINGS, promotion: { allGames: { kind: "amount" as const, value: 500 } } };
    const plan = planItems(["g1", "g2"], TODAY, { today: TODAY, settings, games });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.items.map((i) => [i.price, i.listPrice])).toEqual([
      [4000, 5000], // -20% do jogo é melhor que -R$ 5,00
      [2500, 3000], // só o desconto geral
    ]);
    const records = buildOrderRecords(plan.items, {
      orderId: "o1", code: "ABC123", rentalIds: ["r1", "r2"], customerUid: "c1",
      customer: { name: "Ana", email: "", phone: "" }, gameNames: { g1: "Catan", g2: "Azul" }, rulesVersion: 1,
    });
    expect(records.rentals.map((r) => [r.price, r.listPrice])).toEqual([[4000, 5000], [2500, 3000]]);
    const order = buildRentalOrderDoc(records.rentals, { code: "ABC123", customerUid: "c1", customer: { name: "Ana", email: "", phone: "" }, rentalIds: ["r1", "r2"] });
    expect(order.total).toBe(6500);
  });
});

describe("rascunho do desconto (formulário)", () => {
  it("ida e volta", async () => {
    const { draftFromDiscount, discountFromDraft } = await import("../discounts");
    const d = draftFromDiscount({ kind: "amount", value: 1050, until: "2026-11-30" });
    expect(d).toEqual({ on: true, kind: "amount", text: "10,50", until: "2026-11-30" });
    expect(discountFromDraft(d, TODAY)).toEqual({ ok: true, discount: { kind: "amount", value: 1050, until: "2026-11-30" } });
    expect(draftFromDiscount(null)).toEqual({ on: false, kind: "percent", text: "", until: "" });
  });

  it("valida porcentagem, valor, preço e data", async () => {
    const { discountFromDraft } = await import("../discounts");
    const base = { on: true, until: "" };
    expect(discountFromDraft({ ...base, kind: "percent", text: "20" }, TODAY)).toEqual({ ok: true, discount: { kind: "percent", value: 20 } });
    expect(discountFromDraft({ ...base, kind: "percent", text: "0" }, TODAY).ok).toBe(false);
    expect(discountFromDraft({ ...base, kind: "percent", text: "12,5" }, TODAY).ok).toBe(false);
    expect(discountFromDraft({ ...base, kind: "amount", text: "R$ 5" }, TODAY)).toEqual({ ok: true, discount: { kind: "amount", value: 500 } });
    expect(discountFromDraft({ ...base, kind: "amount", text: "1.250,00" }, TODAY)).toEqual({ ok: true, discount: { kind: "amount", value: 125000 } });
    expect(discountFromDraft({ ...base, kind: "amount", text: "abc" }, TODAY).ok).toBe(false);
    expect(discountFromDraft({ ...base, kind: "amount", text: "50,00" }, TODAY, { price: 5000 }).ok).toBe(false);
    expect(discountFromDraft({ on: true, kind: "percent", text: "10", until: "2026-11-10" }, TODAY)).toEqual({
      ok: false,
      error: "A data final da promoção já passou.",
    });
    expect(discountFromDraft({ on: true, kind: "percent", text: "10", until: "2026-11-10" }, TODAY, { withUntil: false })).toEqual({
      ok: true,
      discount: { kind: "percent", value: 10 },
    });
    expect(discountFromDraft({ on: false, kind: "percent", text: "x", until: "" }, TODAY)).toEqual({ ok: true, discount: null });
  });
});
