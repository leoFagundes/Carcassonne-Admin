import { describe, expect, it } from "vitest";
import type { RentalCancellationReview, RentalOrderType, RentalType } from "@/types";
import { orderFlags, rentalAttention } from "@/rental/attention";

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
      toCheck: 0,
      refundReviews: 0,
    });
  });

  it("conta devolvidos sem conferir (e só eles)", () => {
    const r = rentalAttention(
      [
        rental({ status: "returned", checkPending: true }),
        rental({ status: "returned", checkPending: false }),
        rental({ status: "returned" }),
      ],
      TODAY,
    );
    expect(r.toCheck).toBe(1);
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
    expect(r).toEqual({ pickupsToday: 0, returnsToday: 0, overdue: 0, notPickedUp: 0, toCheck: 0, refundReviews: 0 });
  });
});

function order(
  over: Partial<RentalOrderType> = {},
  payment: Partial<NonNullable<RentalOrderType["payment"]>> = {},
): RentalOrderType {
  return {
    code: "PED1",
    customerUid: "u1",
    customer: { name: "Ana", email: "a@a.com", phone: "11999999999" },
    rentalIds: ["r1"],
    gameIds: ["g1"],
    items: [{ rentalId: "r1", gameId: "g1", gameName: "Catan", price: 1000 }],
    total: 1000,
    startDate: TODAY,
    paymentMode: "online",
    payment: {
      status: "approved",
      provider: "mercadopago",
      checkoutUrl: "",
      providerCheckoutId: "c1",
      providerPaymentId: "p1",
      holdUntil: 0,
      refunds: [],
      refundedTotal: 0,
      ...payment,
    },
    ...over,
  };
}

const pendingReview: RentalCancellationReview = { status: "pending", requestedAt: 1, rentalIds: ["r1"] };

describe("rentalAttention - reembolsos a decidir", () => {
  it("sem pedidos, zero", () => {
    expect(rentalAttention([], TODAY, []).refundReviews).toBe(0);
    expect(rentalAttention([], TODAY).refundReviews).toBe(0);
  });

  it("conta pedidos com cancelamento em análise pendente", () => {
    const pending = order({ cancellationReview: pendingReview });
    const decided = order({ cancellationReview: { ...pendingReview, status: "denied" } });
    expect(rentalAttention([], TODAY, [pending, decided, order()]).refundReviews).toBe(1);
  });

  it("conta pedidos com reembolso que falhou (tardio, duplicado, em andamento)", () => {
    const late = order({}, { lateApprovalRefundFailed: true });
    const dup = order({}, { duplicatePayments: [{ paymentId: "p2", amount: 1000, at: 1, refundFailed: true }] });
    const stuck = order({}, { pendingRefunds: [{ key: "k", amount: 500, at: 1, by: "a", failed: true }] });
    const inFlight = order({}, { pendingRefunds: [{ key: "k", amount: 500, at: 1, by: "a" }] });
    expect(rentalAttention([], TODAY, [late, dup, stuck, inFlight]).refundReviews).toBe(3);
  });

  it("um pedido com vários motivos conta uma vez; reembolso tardio concluído não conta", () => {
    const both = order({ cancellationReview: pendingReview }, { lateApprovalRefundFailed: true });
    const healed = order({}, { lateApprovalRefundFailed: true, lateApprovalRefunded: true });
    expect(rentalAttention([], TODAY, [both, healed]).refundReviews).toBe(1);
  });

  it("orderFlags separa os motivos", () => {
    const f = orderFlags(
      order({}, { duplicatePayments: [{ paymentId: "p2", amount: 1, at: 1, refundFailed: true }] }),
    );
    expect(f).toMatchObject({ review: false, lateRefundFailed: false, duplicateFailed: 1 });
  });
});
