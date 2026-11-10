import { describe, expect, it } from "vitest";
import type { RentalOrderType, RentalType } from "@/types";
import {
  cancelBreakdown,
  monthlyRentals,
  originBreakdown,
  paymentBreakdown,
  paymentFees,
  periodStart,
  rentalSummary,
  rentalsFrom,
  spDate,
  statusBreakdown,
  topCustomers,
  topGames,
} from "@/rental/stats";

const ts = (iso: string) => ({ toMillis: () => Date.parse(iso) }) as unknown as RentalType["returnedAt"];

function rental(over: Partial<RentalType> = {}): RentalType {
  return {
    orderId: "o1",
    code: "AB12",
    customerUid: "u1",
    customer: { name: "Ana", email: "a@a.com", phone: "11999999999" },
    gameId: "g1",
    gameName: "Catan",
    unitId: "c1",
    unitLabel: "Cópia 1",
    price: 1000,
    rentalDays: 7,
    startDate: "2026-11-01",
    dueDate: "2026-11-08",
    status: "reserved",
    rulesVersion: 1,
    ...over,
  };
}

describe("periodStart / rentalsFrom", () => {
  it("conta os dias para trás a partir de hoje; 'all' não filtra", () => {
    expect(periodStart("30d", "2026-11-30")).toBe("2026-10-31");
    expect(periodStart("1y", "2026-11-30")).toBe("2025-11-30");
    expect(periodStart("all", "2026-11-30")).toBeNull();
  });

  it("filtra pela data de retirada, incluindo reservas futuras", () => {
    const list = [rental({ startDate: "2026-10-01" }), rental({ startDate: "2026-11-05" }), rental({ startDate: "2026-12-01" })];
    expect(rentalsFrom(list, "2026-11-01")).toHaveLength(2);
    expect(rentalsFrom(list, null)).toHaveLength(3);
  });

  it("spDate usa o fuso de São Paulo", () => {
    expect(spDate(Date.parse("2026-11-02T01:00:00Z"))).toBe("2026-11-01");
  });
});

describe("rentalSummary", () => {
  it("receita só dos não cancelados; atrasos sobre os devolvidos; clientes distintos", () => {
    const rentals = [
      rental({ status: "returned", returnedAt: ts("2026-11-08T20:00:00Z"), price: 1000 }), // no prazo
      rental({ status: "returned", returnedAt: ts("2026-11-10T15:00:00Z"), price: 2000, customerUid: "u2" }), // atrasado
      rental({ status: "picked_up", price: 500 }),
      rental({ status: "canceled", price: 9999, customerUid: "u3" }),
    ];
    const orders: Pick<RentalOrderType, "payment">[] = [
      {
        payment: {
          status: "partially_refunded",
          provider: "mercadopago",
          checkoutUrl: "",
          providerCheckoutId: "",
          holdUntil: 0,
          refundedTotal: 700,
          refunds: [
            { amount: 300, at: Date.parse("2026-11-05T15:00:00Z"), by: "a", providerRefundId: "1" },
            { amount: 400, at: Date.parse("2026-09-05T15:00:00Z"), by: "a", providerRefundId: "2" },
          ],
        },
      },
    ];
    expect(rentalSummary(rentals, orders, "2026-11-01")).toEqual({
      rentals: 3,
      canceled: 1,
      revenue: 3500,
      refunded: 300,
      returned: 2,
      lateReturns: 1,
      lateRate: 50,
      customers: 2,
    });
    expect(rentalSummary([], [], null)).toMatchObject({ rentals: 0, lateRate: 0, refunded: 0 });
  });
});

describe("rankings e distribuições", () => {
  const list = [
    rental({ gameId: "g1", gameName: "Catan" }),
    rental({ gameId: "g1", gameName: "Catan", customerUid: "u2", customer: { name: "Bia", email: "", phone: "" } }),
    rental({ gameId: "g2", gameName: "Azul", startDate: "2026-03-10" }),
    rental({ gameId: "g3", gameName: "Dixit", status: "canceled", canceledBy: "customer" }),
    rental({ status: "canceled", canceledBy: "system" }),
    rental({ status: "returned" }),
  ];

  it("jogos mais alugados ignoram cancelados", () => {
    expect(topGames(list)).toEqual([
      { name: "Catan", aluguéis: 3 },
      { name: "Azul", aluguéis: 1 },
    ]);
  });

  it("clientes que mais alugaram", () => {
    expect(topCustomers(list, 1)).toEqual([{ uid: "u1", name: "Ana", count: 3 }]);
  });

  it("por mês no ano escolhido", () => {
    const months = monthlyRentals(list, 2026);
    expect(months[2]).toEqual({ name: "Mar", aluguéis: 1 });
    expect(months[10]).toEqual({ name: "Nov", aluguéis: 3 });
    expect(monthlyRentals(list, 2025).every((m) => m.aluguéis === 0)).toBe(true);
  });

  it("situação e quem cancelou", () => {
    expect(statusBreakdown(list)).toEqual({ returned: 1, ongoing: 3, canceled: 2 });
    expect(cancelBreakdown(list)).toEqual({ customer: 1, admin: 0, system: 1 });
  });
});

describe("paymentBreakdown", () => {
  const online = (method?: "pix" | "card" | "other", paid = true) =>
    ({
      paymentMode: "online",
      payment: {
        status: paid ? "approved" : "expired",
        provider: "mercadopago",
        checkoutUrl: "",
        providerCheckoutId: "",
        holdUntil: 0,
        refunds: [],
        refundedTotal: 0,
        ...(paid ? { providerPaymentId: "p", paidAt: 1, method } : {}),
      },
    }) as Pick<RentalOrderType, "paymentMode" | "payment">;

  it("separa balcão, Pix, cartão e saldo; online não pago fica de fora", () => {
    expect(
      paymentBreakdown([{ paymentMode: "counter" }, online("pix"), online("pix"), online("card"), online(undefined), online("pix", false)]),
    ).toEqual({ counter: 1, pix: 2, card: 1, other: 1 });
  });
});

describe("paymentFees", () => {
  const paid = (total: number, fee?: number, netAmount?: number) =>
    ({
      paymentMode: "online",
      total,
      payment: {
        status: "approved",
        provider: "mercadopago",
        checkoutUrl: "",
        providerCheckoutId: "",
        holdUntil: 0,
        refunds: [],
        refundedTotal: 0,
        providerPaymentId: "p",
        paidAt: 1,
        ...(fee !== undefined ? { fee } : {}),
        ...(netAmount !== undefined ? { netAmount } : {}),
      },
    }) as Pick<RentalOrderType, "paymentMode" | "payment" | "total">;

  it("soma bruto, tarifa e líquido; conta os sem tarifa", () => {
    expect(
      paymentFees([paid(1000, 50, 950), paid(2000, 100), paid(500), { paymentMode: "counter", total: 9999 }]),
    ).toEqual({ paidOnline: 3, gross: 3500, fees: 150, net: 2850, missing: 1, grossKnown: 3000 });
  });
});

describe("originBreakdown", () => {
  it("separa site e balcão e soma as cortesias", () => {
    const courtesy = { kind: "courtesy" as const, amount: 0, waived: 4500, at: 1, by: "a", byName: "Leo" };
    const paid = { kind: "paid" as const, method: "cash" as const, amount: 4500, at: 1, by: "a", byName: "Leo" };
    expect(
      originBreakdown([
        {},
        { origin: "customer" },
        { origin: "admin", counterPayment: paid },
        { origin: "admin", counterPayment: courtesy },
        { origin: "admin", counterPayment: { ...courtesy, waived: 9000 } },
      ]),
    ).toEqual({ site: 2, admin: 3, courtesy: 2, waived: 13500 });
  });
});
