import { describe, expect, it } from "vitest";
import { buildOrderRecords, buildRentalOrderDoc, planOrder } from "../orders";
import { makeCtx } from "./fixtures";

const ctx = makeCtx();
const meta = {
  orderId: "order1",
  code: "ABC234",
  rentalIds: ["r1", "r2"],
  customerUid: "uid1",
  customer: { name: "Maria Silva", email: "maria@example.com", phone: "11987654321" },
  gameNames: { g1: "Jogo g1", g2: "Jogo g2" },
  rulesVersion: 1,
};

function plannedItems() {
  const games = { ...ctx.games, g2: { ...ctx.games.g2, price: 3000, rentalDays: 3 } };
  const plan = planOrder({ gameIds: ["g1", "g2"], startDate: "2026-11-06", rulesVersion: 1 }, { ...ctx, games });
  if (!plan.ok) throw new Error(plan.code);
  return plan.items;
}

describe("buildOrderRecords", () => {
  it("monta um rental por item com o mesmo orderId e code", () => {
    const { rentals } = buildOrderRecords(plannedItems(), meta);
    expect(rentals).toEqual([
      {
        orderId: "order1",
        code: "ABC234",
        customerUid: "uid1",
        customer: meta.customer,
        gameId: "g1",
        gameName: "Jogo g1",
        unitId: "u1",
        unitLabel: "u1",
        price: 4500,
        rentalDays: 7,
        startDate: "2026-11-06",
        dueDate: "2026-11-13",
        status: "reserved",
        rulesVersion: 1,
      },
      {
        orderId: "order1",
        code: "ABC234",
        customerUid: "uid1",
        customer: meta.customer,
        gameId: "g2",
        gameName: "Jogo g2",
        unitId: "u1",
        unitLabel: "u1",
        price: 3000,
        rentalDays: 3,
        startDate: "2026-11-06",
        dueDate: "2026-11-09",
        status: "reserved",
        rulesVersion: 1,
      },
    ]);
  });

  it("gera bookings reserved por jogo apontando para o rental", () => {
    const { bookingsByGame } = buildOrderRecords(plannedItems(), meta);
    expect(bookingsByGame).toEqual({
      g1: [{ rentalId: "r1", unitId: "u1", startDate: "2026-11-06", dueDate: "2026-11-13", status: "reserved" }],
      g2: [{ rentalId: "r2", unitId: "u1", startDate: "2026-11-06", dueDate: "2026-11-09", status: "reserved" }],
    });
  });

  it("usa o id do jogo quando o nome não vem", () => {
    const { rentals } = buildOrderRecords(plannedItems(), { ...meta, gameNames: { g1: "Jogo g1" } });
    expect(rentals[1].gameName).toBe("g2");
  });

  it("recusa quantidade de ids diferente da de itens", () => {
    expect(() => buildOrderRecords(plannedItems(), { ...meta, rentalIds: ["r1"] })).toThrow("rentalIds");
  });
});

describe("buildOrderRecords no modo online", () => {
  const HOLD = 1_800_000;

  it("sem initialStatus continua reserved e sem holdUntil (balcão)", () => {
    const counter = buildOrderRecords(plannedItems(), { ...meta, initialStatus: "reserved" });
    expect(counter).toEqual(buildOrderRecords(plannedItems(), meta));
    expect(Object.keys(counter.bookingsByGame.g1[0])).not.toContain("holdUntil");
  });

  it("awaiting_payment gera rentals awaiting_payment e bookings held com holdUntil", () => {
    const { rentals, bookingsByGame } = buildOrderRecords(plannedItems(), {
      ...meta,
      initialStatus: "awaiting_payment",
      holdUntil: HOLD,
    });
    expect(rentals.map((r) => r.status)).toEqual(["awaiting_payment", "awaiting_payment"]);
    expect(bookingsByGame).toEqual({
      g1: [{ rentalId: "r1", unitId: "u1", startDate: "2026-11-06", dueDate: "2026-11-13", status: "held", holdUntil: HOLD }],
      g2: [{ rentalId: "r2", unitId: "u1", startDate: "2026-11-06", dueDate: "2026-11-09", status: "held", holdUntil: HOLD }],
    });
  });

  it("awaiting_payment sem holdUntil é erro", () => {
    expect(() => buildOrderRecords(plannedItems(), { ...meta, initialStatus: "awaiting_payment" })).toThrow("holdUntil");
  });
});

describe("buildRentalOrderDoc", () => {
  const docMeta = { code: meta.code, customerUid: meta.customerUid, customer: meta.customer, rentalIds: meta.rentalIds };

  it("balcão: itens, total em centavos e sem payment", () => {
    const { rentals } = buildOrderRecords(plannedItems(), meta);
    const doc = buildRentalOrderDoc(rentals, docMeta);
    expect(doc).toEqual({
      code: "ABC234",
      customerUid: "uid1",
      customer: meta.customer,
      rentalIds: ["r1", "r2"],
      gameIds: ["g1", "g2"],
      items: [
        { rentalId: "r1", gameId: "g1", gameName: "Jogo g1", price: 4500 },
        { rentalId: "r2", gameId: "g2", gameName: "Jogo g2", price: 3000 },
      ],
      total: 7500,
      startDate: "2026-11-06",
      paymentMode: "counter",
    });
    expect(Object.keys(doc)).not.toContain("payment");
  });

  it("online: payment pending com holdUntil e checkout ainda vazio", () => {
    const { rentals } = buildOrderRecords(plannedItems(), { ...meta, initialStatus: "awaiting_payment", holdUntil: 99 });
    const doc = buildRentalOrderDoc(rentals, docMeta, { holdUntil: 99 });
    expect(doc.paymentMode).toBe("online");
    expect(doc.payment).toEqual({
      status: "pending",
      provider: "mercadopago",
      checkoutUrl: "",
      providerCheckoutId: "",
      holdUntil: 99,
      refunds: [],
      refundedTotal: 0,
    });
  });

  it("recusa quantidade de ids diferente da de rentals", () => {
    const { rentals } = buildOrderRecords(plannedItems(), meta);
    expect(() => buildRentalOrderDoc(rentals, { ...docMeta, rentalIds: ["r1"] })).toThrow("rentalIds");
  });
});
