import { describe, expect, it } from "vitest";
import type { RentalBooking, RentalOrderPayment, RentalOrderType } from "@/types";
import {
  checkoutItemsFor,
  countActiveGames,
  holdUntilFor,
  isAwaitingPayment,
  isOrderExpirable,
  releaseHeldBookings,
  withLiveBookings,
} from "../payments";
import { canChangeDueDate } from "../orders";

const NOW = 10_000_000;

function pay(over: Partial<RentalOrderPayment> = {}): RentalOrderPayment {
  return {
    status: "pending", provider: "mercadopago", checkoutUrl: "u", providerCheckoutId: "c",
    holdUntil: NOW + 60_000, refunds: [], refundedTotal: 0, ...over,
  };
}

function order(over: Partial<RentalOrderType> = {}): RentalOrderType {
  return {
    code: "X", customerUid: "c", customer: { name: "n", email: "e", phone: "p" },
    rentalIds: ["r1"], gameIds: ["g1"], items: [], total: 4500, startDate: "2026-11-05",
    paymentMode: "online", payment: pay(), ...over,
  };
}

function b(rentalId: string, status: RentalBooking["status"], holdUntil?: number): RentalBooking {
  return { rentalId, unitId: "u1", startDate: "2026-11-06", dueDate: "2026-11-13", status, ...(holdUntil !== undefined ? { holdUntil } : {}) };
}

describe("holdUntilFor", () => {
  it("agora + minutos", () => expect(holdUntilFor(NOW, 30)).toBe(NOW + 30 * 60_000));
  it("limita a 15–60 min e usa 30 se inválido", () => {
    expect(holdUntilFor(NOW, 5)).toBe(NOW + 15 * 60_000);
    expect(holdUntilFor(NOW, 600)).toBe(NOW + 60 * 60_000);
    expect(holdUntilFor(NOW, Number.NaN)).toBe(NOW + 30 * 60_000);
    expect(holdUntilFor(NOW, "45" as never)).toBe(NOW + 30 * 60_000);
  });
});

describe("isAwaitingPayment", () => {
  it("online pending ou rejected", () => {
    expect(isAwaitingPayment(order())).toBe(true);
    expect(isAwaitingPayment(order({ payment: pay({ status: "rejected" }) }))).toBe(true);
  });
  it("balcão, sem payment ou outro status → false", () => {
    expect(isAwaitingPayment(order({ paymentMode: "counter", payment: undefined }))).toBe(false);
    expect(isAwaitingPayment(order({ payment: undefined }))).toBe(false);
    for (const status of ["approved", "expired", "refunded", "partially_refunded"] as const) {
      expect(isAwaitingPayment(order({ payment: pay({ status }) }))).toBe(false);
    }
  });
});

describe("isOrderExpirable", () => {
  it("pending/rejected com hold vencido (inclusive == agora)", () => {
    expect(isOrderExpirable(order({ payment: pay({ holdUntil: NOW }) }), NOW)).toBe(true);
    expect(isOrderExpirable(order({ payment: pay({ status: "rejected", holdUntil: NOW - 1 }) }), NOW)).toBe(true);
  });
  it("hold ainda válido → false", () => {
    expect(isOrderExpirable(order(), NOW)).toBe(false);
    expect(isOrderExpirable(order({ payment: pay({ status: "rejected" }) }), NOW)).toBe(false);
  });
  it("já expirado, pago ou balcão → false (idempotente)", () => {
    expect(isOrderExpirable(order({ payment: pay({ status: "expired", holdUntil: 0 }) }), NOW)).toBe(false);
    expect(isOrderExpirable(order({ payment: pay({ status: "approved", holdUntil: 0 }) }), NOW)).toBe(false);
    expect(isOrderExpirable(order({ paymentMode: "counter", payment: undefined }), NOW)).toBe(false);
  });
});

describe("releaseHeldBookings", () => {
  it("remove só os held do pedido e limpa holds vencidos de outros", () => {
    const list = [
      b("r1", "held", NOW + 5000), // do pedido → sai
      b("r2", "reserved"), // do pedido mas já confirmado → fica
      b("x1", "held", NOW + 5000), // de outro, válido → fica
      b("x2", "held", NOW - 1), // de outro, vencido → sai
      b("x3", "picked_up"),
    ];
    expect(releaseHeldBookings(list, ["r1", "r2"], NOW).map((x) => x.rentalId)).toEqual(["r2", "x1", "x3"]);
  });
});

describe("checkoutItemsFor", () => {
  it("um item por jogo, em centavos", () => {
    expect(
      checkoutItemsFor([
        { rentalId: "r1", gameId: "g1", gameName: "Carcassonne", price: 4500 },
        { rentalId: "r2", gameId: "g2", gameName: "Azul", price: 3000 },
      ]),
    ).toEqual([
      { id: "r1", title: "Aluguel: Carcassonne", unitPrice: 4500 },
      { id: "r2", title: "Aluguel: Azul", unitPrice: 3000 },
    ]);
  });
});

describe("countActiveGames", () => {
  const live = order();
  const stale = order({ payment: pay({ holdUntil: NOW - 1 }) });
  it("reserved e picked_up contam; returned e canceled não", () => {
    const rentals = [
      { status: "reserved", orderId: "a" },
      { status: "picked_up", orderId: "a" },
      { status: "returned", orderId: "a" },
      { status: "canceled", orderId: "a" },
    ] as const;
    expect(countActiveGames([...rentals], {}, NOW)).toBe(2);
  });
  it("awaiting_payment conta só enquanto a reserva do pedido vale", () => {
    const rentals = [
      { status: "awaiting_payment", orderId: "live" },
      { status: "awaiting_payment", orderId: "stale" },
      { status: "awaiting_payment", orderId: "missing" },
    ] as const;
    expect(countActiveGames([...rentals], { live, stale }, NOW)).toBe(1);
  });
});

describe("canChangeDueDate com holds (regressão)", () => {
  const own = b("r1", "picked_up");
  const later = (holdUntil: number): RentalBooking => ({
    rentalId: "x1", unitId: "u1", startDate: "2026-11-15", dueDate: "2026-11-20", status: "held", holdUntil,
  });
  const game = (hold: RentalBooking) => ({ units: [{ id: "u1", label: "u1", status: "active" as const }], bookings: [own, hold], rentalDays: 7 });

  it("hold vencido na mesma cópia não bloqueia a nova devolução depois de liveBookings", () => {
    const g = game(later(NOW - 1));
    expect(canChangeDueDate(g, "r1", "2026-11-16", "2026-11-06")).toBe(false);
    expect(canChangeDueDate(withLiveBookings(g, NOW), "r1", "2026-11-16", "2026-11-06")).toBe(true);
  });

  it("hold válido continua bloqueando", () => {
    const g = withLiveBookings(game(later(NOW + 1)), NOW);
    expect(canChangeDueDate(g, "r1", "2026-11-16", "2026-11-06")).toBe(false);
  });
});
