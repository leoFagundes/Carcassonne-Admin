import { describe, expect, it } from "vitest";
import { buildOrderRecords, planOrder } from "../orders";
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
