import { describe, expect, it } from "vitest";
import type { RentalBooking, RentalOrderPayment, RentalOrderType } from "@/types";
import { decideApproval, type ApprovalContext, type ApprovalRental } from "../payments";
import { unit } from "./fixtures";

const NOW = 1_000_000;
const TODAY = "2026-11-05";

function pay(over: Partial<RentalOrderPayment> = {}): RentalOrderPayment {
  return {
    status: "pending", provider: "mercadopago", checkoutUrl: "u", providerCheckoutId: "c",
    holdUntil: NOW + 60_000, refunds: [], refundedTotal: 0, ...over,
  };
}

function order(over: Partial<RentalOrderType> = {}): RentalOrderType {
  return {
    code: "X", customerUid: "c", customer: { name: "n", email: "e", phone: "p" },
    rentalIds: ["r1"], gameIds: ["g1"], items: [], total: 4500, startDate: TODAY,
    paymentMode: "online", payment: pay(), ...over,
  };
}

function rental(over: Partial<ApprovalRental> = {}): ApprovalRental {
  return {
    id: "r1", gameId: "g1", unitId: "u1", startDate: TODAY, dueDate: "2026-11-12",
    status: "awaiting_payment", ...over,
  };
}

function booking(over: Partial<RentalBooking> = {}): RentalBooking {
  return {
    rentalId: "r1", unitId: "u1", startDate: TODAY, dueDate: "2026-11-12",
    status: "held", holdUntil: NOW + 60_000, ...over,
  };
}

function ctx(over: Partial<ApprovalContext> = {}): ApprovalContext {
  return {
    paymentId: "p1",
    today: TODAY,
    rentals: [rental()],
    games: { g1: { units: [unit("u1"), unit("u2")], bookings: [booking()] } },
    ...over,
  };
}

const reserved = (over: Partial<RentalBooking> = {}): RentalBooking => {
  const b = { ...booking(over), status: "reserved" as const };
  delete b.holdUntil;
  return b;
};

describe("decideApproval", () => {
  it("hold válido → confirma (held vira reserved sem holdUntil)", () => {
    const other = booking({ rentalId: "x", unitId: "u2", status: "reserved", holdUntil: undefined });
    delete other.holdUntil;
    const d = decideApproval(order(), ctx({ games: { g1: { units: [unit("u1"), unit("u2")], bookings: [booking(), other] } } }), NOW);
    expect(d).toEqual({ kind: "confirm", rentalIds: ["r1"], bookingsByGame: { g1: [reserved(), other] } });
  });

  it("hold vencido ainda gravado e cópia livre → confirma (recria o booking)", () => {
    const d = decideApproval(
      order({ payment: pay({ holdUntil: NOW - 1 }) }),
      ctx({ games: { g1: { units: [unit("u1")], bookings: [booking({ holdUntil: NOW - 1 })] } } }),
      NOW,
    );
    expect(d).toEqual({ kind: "confirm", rentalIds: ["r1"], bookingsByGame: { g1: [reserved()] } });
  });

  it("pedido expirado (rentals cancelados, bookings limpos) e cópia livre → confirma e reativa", () => {
    const d = decideApproval(
      order({ payment: pay({ status: "expired", closedBy: "system", holdUntil: NOW - 1 }) }),
      ctx({ rentals: [rental({ status: "canceled" })], games: { g1: { units: [unit("u1")], bookings: [] } } }),
      NOW,
    );
    expect(d).toEqual({ kind: "confirm", rentalIds: ["r1"], bookingsByGame: { g1: [reserved()] } });
  });

  it("hold vencido e cópia ocupada por outro → late_refund", () => {
    const taken = booking({ rentalId: "other", status: "reserved", startDate: "2026-11-10", dueDate: "2026-11-17" });
    delete taken.holdUntil;
    const d = decideApproval(
      order({ payment: pay({ status: "expired", holdUntil: NOW - 1 }) }),
      ctx({ rentals: [rental({ status: "canceled" })], games: { g1: { units: [unit("u1")], bookings: [taken] } } }),
      NOW,
    );
    expect(d).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("pedido expirado: reativa só se sobrar a folga das regras até a próxima reserva", () => {
    // Este aluguel vai até 12/11; o próximo retira em 14/11 (um dia livre no meio).
    const next = booking({ rentalId: "other", status: "reserved", startDate: "2026-11-14", dueDate: "2026-11-20" });
    delete next.holdUntil;
    const base = {
      rentals: [rental({ status: "canceled" as const })],
      games: { g1: { units: [unit("u1")], bookings: [next] } },
    };
    const expired = order({ payment: pay({ status: "expired", closedBy: "system", holdUntil: NOW - 1 }) });
    expect(decideApproval(expired, ctx({ ...base, gapDays: 2 }), NOW).kind).toBe("confirm");
    expect(decideApproval(expired, ctx({ ...base, gapDays: 3 }), NOW)).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("cópia ocupada por hold válido de outro pedido → late_refund", () => {
    const d = decideApproval(
      order({ payment: pay({ holdUntil: NOW - 1 }) }),
      ctx({ games: { g1: { units: [unit("u1")], bookings: [booking({ rentalId: "other", holdUntil: NOW + 5 })] } } }),
      NOW,
    );
    expect(d).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("cópia que saiu de circulação → late_refund", () => {
    const d = decideApproval(
      order({ payment: pay({ status: "expired", holdUntil: NOW - 1 }) }),
      ctx({ rentals: [rental({ status: "canceled" })], games: { g1: { units: [unit("u1", "unavailable")], bookings: [] } } }),
      NOW,
    );
    expect(d).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("jogo apagado → late_refund", () => {
    const d = decideApproval(
      order({ payment: pay({ status: "expired", holdUntil: NOW - 1 }) }),
      ctx({ rentals: [rental({ status: "canceled" })], games: {} }),
      NOW,
    );
    expect(d).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("tudo ou nada: um jogo livre e outro ocupado → late_refund", () => {
    const taken = booking({ rentalId: "other", unitId: "u9", status: "reserved" });
    delete taken.holdUntil;
    const d = decideApproval(
      order({ rentalIds: ["r1", "r2"], gameIds: ["g1", "g2"], payment: pay({ status: "expired", holdUntil: NOW - 1 }) }),
      ctx({
        rentals: [rental({ status: "canceled" }), rental({ id: "r2", gameId: "g2", unitId: "u9", status: "canceled" })],
        games: { g1: { units: [unit("u1")], bookings: [] }, g2: { units: [unit("u9")], bookings: [taken] } },
      }),
      NOW,
    );
    expect(d).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("dois aluguéis do mesmo jogo em cópias diferentes → confirma os dois", () => {
    const d = decideApproval(
      order({ rentalIds: ["r1", "r2"], payment: pay({ status: "expired", holdUntil: NOW - 1 }) }),
      ctx({
        rentals: [rental({ status: "canceled" }), rental({ id: "r2", unitId: "u2", status: "canceled" })],
        games: { g1: { units: [unit("u1"), unit("u2")], bookings: [] } },
      }),
      NOW,
    );
    expect(d).toEqual({
      kind: "confirm",
      rentalIds: ["r1", "r2"],
      bookingsByGame: { g1: [reserved(), reserved({ rentalId: "r2", unitId: "u2" })] },
    });
  });

  it("já aprovado com o mesmo pagamento → already", () => {
    expect(decideApproval(order({ payment: pay({ status: "approved", providerPaymentId: "p1" }) }), ctx(), NOW)).toEqual({ kind: "already" });
    expect(decideApproval(order({ payment: pay({ status: "refunded", providerPaymentId: "p1" }) }), ctx(), NOW)).toEqual({ kind: "already" });
  });

  it("já aprovado com outro pagamento (pagou duas vezes) → duplicate", () => {
    expect(decideApproval(order({ payment: pay({ status: "approved", providerPaymentId: "p0" }) }), ctx(), NOW)).toEqual({ kind: "duplicate" });
    expect(decideApproval(order({ payment: pay({ status: "approved" }) }), ctx(), NOW)).toEqual({ kind: "duplicate" });
  });

  it("reembolso tardio pendente do mesmo pagamento → retry; já reembolsado → already", () => {
    const pending = pay({ status: "expired", providerPaymentId: "p1", lateApprovalRefundPending: true, holdUntil: NOW - 1 });
    expect(decideApproval(order({ payment: pending }), ctx(), NOW)).toEqual({ kind: "retry_late_refund" });
    const done = pay({ status: "refunded", providerPaymentId: "p1", lateApprovalRefunded: true, holdUntil: NOW - 1 });
    expect(decideApproval(order({ payment: done }), ctx(), NOW)).toEqual({ kind: "already" });
  });

  it("pedido cancelado pelo cliente → late_refund (canceled), mesmo com a cópia livre", () => {
    const d = decideApproval(
      order({ payment: pay({ status: "expired", closedBy: "customer" }) }),
      ctx({ rentals: [rental({ status: "canceled" })], games: { g1: { units: [unit("u1")], bookings: [] } } }),
      NOW,
    );
    expect(d).toEqual({ kind: "late_refund", reason: "canceled" });
  });

  it("nenhum aluguel do pedido para confirmar (apagados) → late_refund", () => {
    expect(decideApproval(order(), ctx({ rentals: [] }), NOW)).toEqual({ kind: "late_refund", reason: "expired" });
  });

  it("pedido no balcão → ignored", () => {
    expect(decideApproval(order({ paymentMode: "counter", payment: undefined }), ctx(), NOW)).toEqual({ kind: "ignored" });
  });
});
