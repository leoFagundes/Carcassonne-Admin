import { describe, expect, it } from "vitest";
import type { RentalOrderPayment, RentalOrderType, RentalType } from "@/types";
import {
  UNPAID_ORDER_GRACE_MS,
  customerDeletionBlock,
  orderDeletionBlock,
  paymentsAllowDeletion,
  rentalDeletionBlock,
  rentalEndedAt,
} from "@/rental/deletion";

const NOW = Date.UTC(2026, 10, 10, 15, 0, 0);

function order(over: Partial<RentalOrderType> = {}, payment?: Partial<RentalOrderPayment>): RentalOrderType {
  return {
    code: "AB12",
    customerUid: "u1",
    customer: { name: "Ana", email: "a@a.com", phone: "11999999999" },
    rentalIds: ["r1"],
    gameIds: ["g1"],
    items: [{ rentalId: "r1", gameId: "g1", gameName: "Catan", price: 1000 }],
    total: 1000,
    startDate: "2026-11-01",
    paymentMode: payment ? "online" : "counter",
    ...(payment
      ? {
          payment: {
            status: "approved",
            provider: "mercadopago",
            checkoutUrl: "https://x",
            providerCheckoutId: "c1",
            holdUntil: NOW - 60_000,
            refunds: [],
            refundedTotal: 0,
            ...payment,
          },
        }
      : {}),
    ...over,
  };
}

describe("rentalDeletionBlock", () => {
  it("devolvido ou cancelado de pedido no balcão pode ser excluído", () => {
    expect(rentalDeletionBlock({ status: "returned" }, order(), NOW)).toBeNull();
    expect(rentalDeletionBlock({ status: "canceled" }, order(), NOW)).toBeNull();
    expect(rentalDeletionBlock({ status: "returned" }, undefined, NOW)).toBeNull();
  });

  it("em andamento nunca pode", () => {
    for (const status of ["awaiting_payment", "reserved", "picked_up"] as const) {
      expect(rentalDeletionBlock({ status }, order(), NOW)).toMatch(/devolvidos ou cancelados/);
    }
  });

  it("pago online e resolvido (aprovado ou reembolsado) pode", () => {
    expect(rentalDeletionBlock({ status: "returned" }, order({}, { status: "approved" }), NOW)).toBeNull();
    expect(rentalDeletionBlock({ status: "canceled" }, order({}, { status: "refunded" }), NOW)).toBeNull();
  });

  it("reembolso em andamento, com falha, tardio ou duplicado pendente bloqueia", () => {
    const pending = { key: "k", amount: 100, at: NOW, by: "a" };
    expect(rentalDeletionBlock({ status: "canceled" }, order({}, { pendingRefunds: [pending] }), NOW)).toMatch(
      /reembolso ou análise pendente/,
    );
    expect(
      rentalDeletionBlock({ status: "canceled" }, order({}, { pendingRefunds: [{ ...pending, failed: true }] }), NOW),
    ).not.toBeNull();
    expect(
      rentalDeletionBlock({ status: "canceled" }, order({}, { status: "expired", lateApprovalRefundPending: true }), NOW + UNPAID_ORDER_GRACE_MS * 2),
    ).not.toBeNull();
    expect(
      rentalDeletionBlock(
        { status: "returned" },
        order({}, { duplicatePayments: [{ paymentId: "p2", amount: 1000, at: NOW }] }),
        NOW,
      ),
    ).not.toBeNull();
    expect(
      rentalDeletionBlock(
        { status: "returned" },
        order({}, { duplicatePayments: [{ paymentId: "p2", amount: 1000, at: NOW, providerRefundId: "rf" }] }),
        NOW,
      ),
    ).toBeNull();
  });

  it("análise de cancelamento pendente bloqueia; decidida não", () => {
    const review = { status: "pending" as const, requestedAt: NOW, rentalIds: ["r1"] };
    expect(rentalDeletionBlock({ status: "canceled" }, order({ cancellationReview: review }, {}), NOW)).not.toBeNull();
    expect(
      rentalDeletionBlock({ status: "canceled" }, order({ cancellationReview: { ...review, status: "denied" } }, {}), NOW),
    ).toBeNull();
  });

  it("pedido online não pago fica 7 dias depois do fim do prazo para pagar", () => {
    for (const status of ["pending", "rejected", "expired"] as const) {
      const o = order({}, { status, holdUntil: NOW });
      expect(rentalDeletionBlock({ status: "canceled" }, o, NOW + UNPAID_ORDER_GRACE_MS - 1)).toMatch(
        /liberada a partir de \d{2}\/\d{2}/,
      );
      expect(rentalDeletionBlock({ status: "canceled" }, o, NOW + UNPAID_ORDER_GRACE_MS)).toBeNull();
    }
  });
});

describe("orderDeletionBlock", () => {
  it("usa o sujeito informado na mensagem", () => {
    const o = order({}, { pendingRefunds: [{ key: "k", amount: 1, at: NOW, by: "a" }] });
    expect(orderDeletionBlock(o, NOW, "Um pedido deste cliente")).toMatch(/^Um pedido deste cliente tem/);
  });
});

describe("customerDeletionBlock", () => {
  it("sem aluguéis nem pedidos pode", () => {
    expect(customerDeletionBlock([], [], NOW)).toBeNull();
  });

  it("aluguel em andamento bloqueia, com a contagem", () => {
    expect(customerDeletionBlock([{ status: "reserved" }, { status: "returned" }], [], NOW)).toMatch(/1 aluguel em andamento/);
    expect(customerDeletionBlock([{ status: "reserved" }, { status: "picked_up" }], [], NOW)).toMatch(/2 aluguéis/);
  });

  it("pedido com dinheiro em aberto bloqueia", () => {
    const o = order({}, { pendingRefunds: [{ key: "k", amount: 1, at: NOW, by: "a" }] });
    expect(customerDeletionBlock([{ status: "canceled" }], [o], NOW)).toMatch(/^Um pedido deste cliente/);
  });

  it("tudo encerrado e resolvido pode", () => {
    expect(customerDeletionBlock([{ status: "returned" }], [order(), order({}, { status: "approved" })], NOW)).toBeNull();
  });
});

describe("rentalEndedAt", () => {
  const ts = (ms: number) => ({ toMillis: () => ms }) as unknown as RentalType["returnedAt"];
  it("usa devolução, depois cancelamento, depois a data de devolução", () => {
    expect(rentalEndedAt({ dueDate: "2026-11-01", returnedAt: ts(5) })).toBe(5);
    expect(rentalEndedAt({ dueDate: "2026-11-01", canceledAt: ts(7) })).toBe(7);
    expect(rentalEndedAt({ dueDate: "2026-11-01" })).toBe(Date.parse("2026-11-01T23:59:59-03:00"));
  });
});

describe("exclusão forçada (admin)", () => {
  const rentalOf = (status: RentalType["status"]) => ({ status });
  it("aluguel em andamento sai quando forçado", () => {
    expect(rentalDeletionBlock(rentalOf("picked_up"), order(), NOW)).not.toBeNull();
    expect(rentalDeletionBlock(rentalOf("picked_up"), order(), NOW, { force: true })).toBeNull();
    expect(rentalDeletionBlock(rentalOf("reserved"), order(), NOW, { force: true })).toBeNull();
  });

  it("pedido não pago no prazo só sai com o Mercado Pago confirmando que não há pagamento", () => {
    const unpaid = { ...order({}, { status: "expired", holdUntil: NOW - 60_000 }), id: "o1" };
    expect(orderDeletionBlock(unpaid, NOW)).not.toBeNull();
    expect(orderDeletionBlock(unpaid, NOW, "x", { force: true })).not.toBeNull();
    expect(orderDeletionBlock(unpaid, NOW, "x", { verifiedUnpaid: new Set(["o1"]) })).toBeNull();
    expect(orderDeletionBlock(unpaid, NOW, "x", { verifiedUnpaid: new Set(["outro"]) })).not.toBeNull();
  });

  it("pagamento aprovado ou em andamento no Mercado Pago segura; recusado/cancelado não", () => {
    expect(paymentsAllowDeletion([])).toBe(true);
    expect(paymentsAllowDeletion([{ status: "rejected" }, { status: "cancelled" }])).toBe(true);
    expect(paymentsAllowDeletion([{ status: "rejected" }, { status: "in_process" }])).toBe(false);
    expect(paymentsAllowDeletion([{ status: "pending" }])).toBe(false);
    expect(paymentsAllowDeletion([{ status: "approved" }])).toBe(false);
  });

  it("reembolso em andamento continua segurando, mesmo forçado", () => {
    const pending = order({}, { pendingRefunds: [{ key: "k", amount: 100, at: NOW, by: "a" }] });
    expect(rentalDeletionBlock(rentalOf("returned"), pending, NOW, { force: true })).toMatch(/reembolso/);
  });

  it("histórico do cliente com aluguel em andamento sai quando forçado", () => {
    expect(customerDeletionBlock([rentalOf("picked_up")], [], NOW)).not.toBeNull();
    expect(customerDeletionBlock([rentalOf("picked_up")], [], NOW, { force: true })).toBeNull();
  });
});
