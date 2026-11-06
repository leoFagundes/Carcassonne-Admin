import { describe, expect, it } from "vitest";
import type { RentalBooking, RentalOrderPayment, RentalOrderType } from "@/types";
import { formatCountdown, liveBookings, orderPaymentView, refundFor, refundableLeft, withLiveBookings } from "../payments";
import { DEFAULT_RENTAL_SETTINGS, mergeRentalSettings } from "../defaults";

const NOW = 1_000_000;

function b(status: RentalBooking["status"], holdUntil?: number, rentalId = "r"): RentalBooking {
  return { rentalId, unitId: "u", startDate: "2026-11-05", dueDate: "2026-11-12", status, ...(holdUntil !== undefined ? { holdUntil } : {}) };
}

function pay(over: Partial<RentalOrderPayment> = {}): RentalOrderPayment {
  return {
    status: "pending", provider: "mercadopago", checkoutUrl: "u", providerCheckoutId: "c",
    holdUntil: NOW + 60_000, refunds: [], refundedTotal: 0, ...over,
  };
}

function order(over: Partial<RentalOrderType> = {}): RentalOrderType {
  return {
    code: "X", customerUid: "c", customer: { name: "n", email: "e", phone: "p" },
    rentalIds: [], gameIds: [], items: [], total: 4500, startDate: "2026-11-05",
    paymentMode: "online", payment: pay(), ...over,
  };
}

describe("liveBookings", () => {
  it("remove só held vencido (inclusive == agora)", () => {
    const list = [b("held", NOW - 1, "a"), b("held", NOW, "b"), b("held", NOW + 1, "c"), b("reserved", NOW - 5, "d"), b("picked_up", undefined, "e")];
    expect(liveBookings(list, NOW).map((x) => x.rentalId)).toEqual(["c", "d", "e"]);
  });
  it("withLiveBookings preserva o resto do objeto", () => {
    const g = { id: "g", bookings: [b("held", NOW - 1)] };
    expect(withLiveBookings(g, NOW)).toEqual({ id: "g", bookings: [] });
  });
});

describe("refundFor", () => {
  it("políticas", () => {
    expect(refundFor("full", 10, 4500)).toBe(4500);
    expect(refundFor("fee", 10, 4500)).toBe(4050);
    expect(refundFor("fee", 10, 999)).toBe(899);
    expect(refundFor("manual", 10, 4500)).toBeNull();
  });
});

describe("refundableLeft", () => {
  it("total menos reembolsado, nunca negativo", () => {
    expect(refundableLeft({ total: 4500 })).toBe(4500);
    expect(refundableLeft({ total: 4500, payment: { refundedTotal: 1000 } })).toBe(3500);
    expect(refundableLeft({ total: 4500, payment: { refundedTotal: 9000 } })).toBe(0);
  });
});

describe("orderPaymentView", () => {
  it("counter", () => expect(orderPaymentView(order({ paymentMode: "counter", payment: undefined }), NOW)).toEqual({ state: "counter" }));
  it("review", () =>
    expect(orderPaymentView(order({ cancellationReview: { status: "pending", requestedAt: 1, rentalIds: [] }, payment: pay({ status: "approved" }) }), NOW)).toEqual({ state: "review" }));
  it("paid", () => expect(orderPaymentView(order({ payment: pay({ status: "approved", method: "pix" }) }), NOW)).toEqual({ state: "paid", method: "pix" }));
  it("refunded", () => expect(orderPaymentView(order({ payment: pay({ status: "refunded", refundedTotal: 4500 }) }), NOW)).toEqual({ state: "refunded", amount: 4500 }));
  it("partially_refunded", () => expect(orderPaymentView(order({ payment: pay({ status: "partially_refunded", refundedTotal: 1000 }) }), NOW)).toEqual({ state: "partially_refunded", amount: 1000 }));
  it("awaiting", () => expect(orderPaymentView(order(), NOW)).toEqual({ state: "awaiting", msLeft: 60_000 }));
  it("expired (pending e rejected vencidos)", () => {
    expect(orderPaymentView(order({ payment: pay({ holdUntil: NOW }) }), NOW)).toEqual({ state: "expired" });
    expect(orderPaymentView(order({ payment: pay({ status: "rejected", holdUntil: NOW - 1 }) }), NOW)).toEqual({ state: "expired" });
    expect(orderPaymentView(order({ payment: pay({ status: "expired" }) }), NOW)).toEqual({ state: "expired" });
  });
  it("rejected", () => expect(orderPaymentView(order({ payment: pay({ status: "rejected" }) }), NOW)).toEqual({ state: "rejected", msLeft: 60_000 }));
});

describe("formatCountdown", () => {
  it("formata", () => {
    expect(formatCountdown(65000)).toBe("01:05");
    expect(formatCountdown(24 * 60_000 + 5000)).toBe("24:05");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});

describe("mergeRentalSettings", () => {
  it("doc antigo sem onlinePayment e parcial usam os padrões", () => {
    expect(mergeRentalSettings({ maxAdvanceDays: 10 }).onlinePayment).toEqual(DEFAULT_RENTAL_SETTINGS.onlinePayment);
    expect(mergeRentalSettings({ onlinePayment: { enabled: true } as never }).onlinePayment).toEqual({
      ...DEFAULT_RENTAL_SETTINGS.onlinePayment, enabled: true,
    });
  });
});
