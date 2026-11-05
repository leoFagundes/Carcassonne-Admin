import { describe, expect, it } from "vitest";
import type { RentalType } from "@/types";
import { rentalAttention } from "@/rental/attention";

const TODAY = "2026-11-10";

function rental(over: Partial<RentalType>): RentalType {
  return {
    orderId: "o1",
    code: "AB12",
    customerUid: "u1",
    customer: { name: "Ana", email: "a@a.com", phone: "11999999999" },
    gameId: "g1",
    gameName: "Catan",
    unitId: "u-1",
    unitLabel: "Cópia 1",
    price: 1000,
    rentalDays: 3,
    startDate: TODAY,
    dueDate: "2026-11-13",
    status: "reserved",
    rulesVersion: 1,
    ...over,
  };
}

describe("rentalAttention", () => {
  it("sem aluguéis, tudo zero", () => {
    expect(rentalAttention([], TODAY)).toEqual({
      pickupsToday: 0,
      returnsToday: 0,
      overdue: 0,
      notPickedUp: 0,
    });
  });

  it("conta retiradas de hoje (reserved com início hoje)", () => {
    const r = rentalAttention([rental({}), rental({ startDate: "2026-11-11" })], TODAY);
    expect(r.pickupsToday).toBe(1);
    expect(r.notPickedUp).toBe(0);
  });

  it("conta devoluções de hoje (picked_up com prazo hoje)", () => {
    const r = rentalAttention(
      [rental({ status: "picked_up", startDate: "2026-11-07", dueDate: TODAY })],
      TODAY,
    );
    expect(r).toMatchObject({ returnsToday: 1, overdue: 0 });
  });

  it("conta atrasados (picked_up com prazo anterior a hoje)", () => {
    const r = rentalAttention(
      [rental({ status: "picked_up", startDate: "2026-11-01", dueDate: "2026-11-09" })],
      TODAY,
    );
    expect(r).toMatchObject({ overdue: 1, returnsToday: 0 });
  });

  it("conta não retirados (reserved com início anterior a hoje)", () => {
    const r = rentalAttention([rental({ startDate: "2026-11-09" })], TODAY);
    expect(r).toMatchObject({ notPickedUp: 1, pickupsToday: 0 });
  });

  it("devolvidos e cancelados nunca contam", () => {
    const r = rentalAttention(
      [
        rental({ status: "returned", dueDate: "2026-11-01" }),
        rental({ status: "returned", dueDate: TODAY }),
        rental({ status: "canceled" }),
        rental({ status: "canceled", startDate: "2026-11-01" }),
      ],
      TODAY,
    );
    expect(r).toEqual({ pickupsToday: 0, returnsToday: 0, overdue: 0, notPickedUp: 0 });
  });
});
