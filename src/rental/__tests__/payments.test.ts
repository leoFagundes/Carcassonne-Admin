import { describe, expect, it } from "vitest";
import type { RentalBooking, RentalOrderPayment, RentalOrderType, RentalPendingRefund, RentalRefund } from "@/types";
import {
  archiveDecidedReview,
  beginRefund,
  cancelPreview,
  clampFeePercent,
  closeCancellationReview,
  conflictingPendingRefund,
  decideRefundedRedelivery,
  dropPendingRefund,
  finishRefund,
  formatCountdown,
  hasPendingReviewRefund,
  hasRecentRefundFor,
  isPaidOnline,
  markPendingRefundFailed,
  isValidRefundAmount,
  liveBookings,
  openCancellationReview,
  orderPaymentView,
  refundFor,
  refundForRental,
  refundableLeft,
  reviewRefundCap,
  reviewRefundKey,
  withLiveBookings,
} from "../payments";
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
  it("taxa limitada a 0–50%; NaN → sem taxa", () => {
    expect(refundFor("fee", 80, 4500)).toBe(2250);
    expect(refundFor("fee", -20, 4500)).toBe(4500);
    expect(refundFor("fee", NaN, 4500)).toBe(4500);
    expect(refundFor("fee", Infinity, 4500)).toBe(2250);
  });
});

describe("clampFeePercent", () => {
  it("limita e trata inválidos como 0", () => {
    expect(clampFeePercent(10)).toBe(10);
    expect(clampFeePercent(50)).toBe(50);
    expect(clampFeePercent(51)).toBe(50);
    expect(clampFeePercent(-1)).toBe(0);
    expect(clampFeePercent(NaN)).toBe(0);
    expect(clampFeePercent("10")).toBe(0);
    expect(clampFeePercent(undefined)).toBe(0);
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
  it("limita taxa (0–50, NaN → 0) e tempo para pagar (10–120, NaN → 30)", () => {
    const merged = (onlinePayment: Record<string, unknown>) =>
      mergeRentalSettings({ onlinePayment: onlinePayment as never }).onlinePayment;
    expect(merged({ feePercent: 90, holdMinutes: 500 })).toMatchObject({ feePercent: 50, holdMinutes: 120 });
    expect(merged({ feePercent: -5, holdMinutes: 2 })).toMatchObject({ feePercent: 0, holdMinutes: 10 });
    expect(merged({ feePercent: NaN, holdMinutes: NaN })).toMatchObject({ feePercent: 0, holdMinutes: 30 });
    expect(merged({ feePercent: "15", holdMinutes: "45" })).toMatchObject({ feePercent: 0, holdMinutes: 30 });
    expect(merged({ feePercent: 25, holdMinutes: 45 })).toMatchObject({ feePercent: 25, holdMinutes: 45 });
  });
});

describe("cancelPreview com taxa fora do limite", () => {
  it("mostra a taxa já limitada", () => {
    const o = order({
      items: [{ rentalId: "r1", gameId: "g", gameName: "G", price: 4500 }],
      payment: pay({ status: "approved", providerPaymentId: "p1" }),
    });
    expect(cancelPreview(o, "r1", { cancellationPolicy: "fee", feePercent: 90 })).toEqual({
      kind: "refund", amount: 2250, feePercent: 50,
    });
  });
});

describe("orderPaymentView: cancelado pelo cliente", () => {
  it("expired + closedBy customer → canceled", () =>
    expect(orderPaymentView(order({ payment: pay({ status: "expired", closedBy: "customer" }) }), NOW)).toEqual({ state: "canceled" }));
  it("expired + closedBy system (ou ausente) → expired", () => {
    expect(orderPaymentView(order({ payment: pay({ status: "expired", closedBy: "system" }) }), NOW)).toEqual({ state: "expired" });
    expect(orderPaymentView(order({ payment: pay({ status: "expired" }) }), NOW)).toEqual({ state: "expired" });
  });
});

// ---------- Task 6: cancelamento com política e reembolsos ----------

/** Pedido online pago com dois jogos: r1 = R$ 45,00 e r2 = R$ 30,00. */
function paidOrder(over: Partial<RentalOrderPayment> = {}, orderOver: Partial<RentalOrderType> = {}): RentalOrderType {
  return order({
    rentalIds: ["r1", "r2"],
    gameIds: ["g1", "g2"],
    items: [
      { rentalId: "r1", gameId: "g1", gameName: "A", price: 4500 },
      { rentalId: "r2", gameId: "g2", gameName: "B", price: 3000 },
    ],
    total: 7500,
    payment: pay({ status: "approved", providerPaymentId: "p1", ...over }),
    ...orderOver,
  });
}

const refund = (amount: number, key: string, extra: Partial<RentalRefund> = {}): RentalRefund => ({
  amount, at: 1, by: "admin", providerRefundId: `rf-${key}`, key, ...extra,
});
const pending = (amount: number, key: string, extra: Partial<RentalPendingRefund> = {}): RentalPendingRefund => ({
  amount, at: 1, by: "customer", key, ...extra,
});

describe("refundableLeft com reembolsos em andamento", () => {
  it("desconta os pendentes", () => {
    expect(refundableLeft(paidOrder({ refundedTotal: 1000, pendingRefunds: [pending(2000, "k")] }))).toBe(4500);
  });
  it("exceptKey ignora o pendente da própria operação", () => {
    expect(refundableLeft(paidOrder({ pendingRefunds: [pending(2000, "k"), pending(500, "j")] }), "k")).toBe(7000);
  });
  it("nunca negativo", () => {
    expect(refundableLeft(paidOrder({ refundedTotal: 7000, pendingRefunds: [pending(2000, "k")] }))).toBe(0);
  });
});

describe("isPaidOnline", () => {
  it("online com pagamento aprovado (inclusive parcial/total reembolsado)", () => {
    expect(isPaidOnline(paidOrder())).toBe(true);
    expect(isPaidOnline(paidOrder({ status: "partially_refunded" }))).toBe(true);
    expect(isPaidOnline(paidOrder({ status: "refunded" }))).toBe(true);
  });
  it("balcão, não pago ou sem id do pagamento → false", () => {
    expect(isPaidOnline(paidOrder({}, { paymentMode: "counter", payment: undefined }))).toBe(false);
    expect(isPaidOnline(paidOrder({ status: "pending", providerPaymentId: undefined }))).toBe(false);
    expect(isPaidOnline(paidOrder({ status: "approved", providerPaymentId: undefined }))).toBe(false);
    // Aprovado tarde (pedido expirado e reembolsado): não há aluguel ativo pago.
    expect(isPaidOnline(paidOrder({ status: "expired" }))).toBe(false);
    expect(isPaidOnline(undefined)).toBe(false);
  });
});

describe("refundForRental (Review Focus #3)", () => {
  it("integral: só o preço daquele jogo", () => {
    expect(refundForRental(paidOrder(), "r1", "full", 10)).toBe(4500);
    expect(refundForRental(paidOrder(), "r2", "full", 10)).toBe(3000);
  });
  it("com taxa: preço do jogo menos a taxa", () => {
    expect(refundForRental(paidOrder(), "r1", "fee", 10)).toBe(4050);
    expect(refundForRental(paidOrder(), "r2", "fee", 15)).toBe(2550);
  });
  it("manual → null", () => expect(refundForRental(paidOrder(), "r1", "manual", 10)).toBeNull());
  it("nunca passa do que falta devolver", () => {
    expect(refundForRental(paidOrder({ refundedTotal: 4000 }), "r1", "full", 10)).toBe(3500);
    expect(refundForRental(paidOrder({ refundedTotal: 6000, pendingRefunds: [pending(1000, "x")] }), "r1", "full", 10)).toBe(500);
    expect(refundForRental(paidOrder({ refundedTotal: 7500 }), "r1", "full", 10)).toBe(0);
  });
  it("cancelar os dois jogos em sequência soma no máximo o total pago", () => {
    const first = refundForRental(paidOrder(), "r1", "full", 0)!;
    const after = paidOrder({ refundedTotal: first, status: "partially_refunded" });
    const second = refundForRental(after, "r2", "full", 0)!;
    expect(first + second).toBe(7500);
    // Depois de um reembolso manual de R$ 50,00, o segundo jogo só recebe o que sobrou.
    const afterAdmin = paidOrder({ refundedTotal: 5000, status: "partially_refunded" });
    expect(refundForRental(afterAdmin, "r2", "full", 0)).toBe(2500);
  });
  it("aluguel que não é do pedido → 0", () => expect(refundForRental(paidOrder(), "zz", "full", 10)).toBe(0));
  it("taxa acima de 50% vale 50% (nunca negativo)", () => expect(refundForRental(paidOrder(), "r1", "fee", 150)).toBe(2250));
});

describe("cancelPreview", () => {
  const op = (cancellationPolicy: "full" | "fee" | "manual", feePercent = 10) => ({ cancellationPolicy, feePercent });
  it("pedido no balcão / sem pedido → none", () => {
    expect(cancelPreview(undefined, "r1", op("full"))).toEqual({ kind: "none" });
    expect(cancelPreview(paidOrder({}, { paymentMode: "counter", payment: undefined }), "r1", op("full"))).toEqual({ kind: "none" });
  });
  it("integral", () => expect(cancelPreview(paidOrder(), "r1", op("full"))).toEqual({ kind: "refund", amount: 4500 }));
  it("com taxa informa o percentual", () =>
    expect(cancelPreview(paidOrder(), "r1", op("fee", 10))).toEqual({ kind: "refund", amount: 4050, feePercent: 10 }));
  it("taxa 0% é como integral", () => expect(cancelPreview(paidOrder(), "r1", op("fee", 0))).toEqual({ kind: "refund", amount: 4500 }));
  it("manual → review", () => expect(cancelPreview(paidOrder(), "r1", op("manual"))).toEqual({ kind: "review" }));
  it("nada mais a devolver: sem análise, reembolso 0", () => {
    const o = paidOrder({ status: "refunded", refundedTotal: 7500 });
    expect(cancelPreview(o, "r1", op("manual"))).toEqual({ kind: "refund", amount: 0 });
    expect(cancelPreview(o, "r1", op("full"))).toEqual({ kind: "refund", amount: 0 });
  });
});

describe("reviewRefundCap", () => {
  it("soma dos jogos em análise, limitada ao que falta devolver", () => {
    expect(reviewRefundCap(paidOrder(), ["r1"])).toBe(4500);
    expect(reviewRefundCap(paidOrder(), ["r1", "r2"])).toBe(7500);
    expect(reviewRefundCap(paidOrder({ refundedTotal: 5000 }), ["r1", "r2"])).toBe(2500);
  });
  it("exceptKey: o próprio pendente não reduz o limite", () => {
    expect(reviewRefundCap(paidOrder({ pendingRefunds: [pending(4500, "rv")] }), ["r1"], "rv")).toBe(4500);
  });
});

describe("isValidRefundAmount", () => {
  it("inteiro entre 0 e o limite", () => {
    expect(isValidRefundAmount(0, 100)).toBe(true);
    expect(isValidRefundAmount(100, 100)).toBe(true);
    expect(isValidRefundAmount(101, 100)).toBe(false);
    expect(isValidRefundAmount(-1, 100)).toBe(false);
    expect(isValidRefundAmount(10.5, 100)).toBe(false);
    expect(isValidRefundAmount("10" as unknown, 100)).toBe(false);
    expect(isValidRefundAmount(Number.NaN, 100)).toBe(false);
  });
});

describe("beginRefund", () => {
  const intent = (amount: number, key = "o:r1:cancel"): RentalPendingRefund => ({ key, amount, at: 5, by: "customer", rentalId: "r1" });
  it("start: grava a intenção", () => {
    expect(beginRefund(paidOrder(), intent(4500))).toEqual({ kind: "start", pendingRefunds: [intent(4500)] });
  });
  it("mantém os outros pendentes", () => {
    const o = paidOrder({ pendingRefunds: [pending(1000, "x")] });
    expect(beginRefund(o, intent(4500))).toEqual({ kind: "start", pendingRefunds: [pending(1000, "x"), intent(4500)] });
  });
  it("done: a mesma chave já foi concluída", () => {
    const o = paidOrder({ refunds: [refund(4500, "o:r1:cancel")], refundedTotal: 4500 });
    expect(beginRefund(o, intent(4500))).toEqual({ kind: "done", refund: refund(4500, "o:r1:cancel") });
  });
  it("resume: a mesma chave está em andamento (repetição)", () => {
    const o = paidOrder({ pendingRefunds: [pending(4500, "o:r1:cancel")] });
    expect(beginRefund(o, intent(4500))).toEqual({ kind: "resume", pending: pending(4500, "o:r1:cancel") });
  });
  it("exceeds: passaria do que falta devolver (contando pendentes de outras operações)", () => {
    const o = paidOrder({ refundedTotal: 3000, pendingRefunds: [pending(2000, "x")] });
    expect(beginRefund(o, intent(4500))).toEqual({ kind: "exceeds", left: 2500 });
  });
  it("invalid: valor não positivo ou não inteiro", () => {
    expect(beginRefund(paidOrder(), intent(0))).toEqual({ kind: "invalid" });
    expect(beginRefund(paidOrder(), intent(10.5))).toEqual({ kind: "invalid" });
  });
});

describe("reembolso com falha ambígua (fix round 1)", () => {
  const intent = (amount: number, key = "o:r1:cancel"): RentalPendingRefund => ({ key, amount, at: 5, by: "customer", rentalId: "r1" });
  it("markPendingRefundFailed marca só a chave pedida", () => {
    expect(markPendingRefundFailed({ pendingRefunds: [pending(1, "a"), pending(2, "b")] }, "a")).toEqual([
      pending(1, "a", { failed: true }),
      pending(2, "b"),
    ]);
  });
  it("intenção com falha continua contando no que falta devolver", () => {
    expect(refundableLeft(paidOrder({ pendingRefunds: [pending(4500, "k", { failed: true })] }))).toBe(3000);
  });
  it("repetir a mesma chave retoma a intenção com falha e limpa a marca", () => {
    const o = paidOrder({ pendingRefunds: [pending(100, "x"), pending(4500, "o:r1:cancel", { failed: true })] });
    expect(beginRefund(o, intent(4500))).toEqual({
      kind: "resume",
      pending: pending(4500, "o:r1:cancel"),
      pendingRefunds: [pending(100, "x"), pending(4500, "o:r1:cancel")],
    });
  });
  it("retomar intenção em andamento (sem falha) não regrava", () => {
    const o = paidOrder({ pendingRefunds: [pending(4500, "o:r1:cancel")] });
    expect(beginRefund(o, intent(4500))).toEqual({ kind: "resume", pending: pending(4500, "o:r1:cancel") });
  });
});

describe("hasRecentRefundFor", () => {
  const MIN = 60_000;
  it("intenção recente deste aluguel (direta ou numa análise) bloqueia", () => {
    expect(hasRecentRefundFor(paidOrder({ pendingRefunds: [pending(1, "k", { rentalId: "r1", at: NOW - 9 * MIN })] }), "r1", NOW)).toBe(true);
    expect(hasRecentRefundFor(paidOrder({ pendingRefunds: [pending(1, "k", { rentalIds: ["r2", "r1"], at: NOW })] }), "r1", NOW)).toBe(true);
    expect(hasRecentRefundFor(paidOrder({ pendingRefunds: [pending(1, "k", { rentalId: "r1", at: NOW, failed: true })] }), "r1", NOW)).toBe(true);
  });
  it("antiga (10 min ou mais), de outro aluguel ou sem pedido → não bloqueia", () => {
    expect(hasRecentRefundFor(paidOrder({ pendingRefunds: [pending(1, "k", { rentalId: "r1", at: NOW - 10 * MIN })] }), "r1", NOW)).toBe(false);
    expect(hasRecentRefundFor(paidOrder({ pendingRefunds: [pending(1, "k", { rentalId: "r2", at: NOW })] }), "r1", NOW)).toBe(false);
    expect(hasRecentRefundFor(paidOrder(), "r1", NOW)).toBe(false);
    expect(hasRecentRefundFor(undefined, "r1", NOW)).toBe(false);
  });
});

describe("hasPendingReviewRefund", () => {
  it("só intenções de aprovação de análise", () => {
    expect(hasPendingReviewRefund(paidOrder({ pendingRefunds: [pending(1, "o1:review:r1")] }), "o1")).toBe(true);
    expect(hasPendingReviewRefund(paidOrder({ pendingRefunds: [pending(1, "o1:review:r1", { failed: true })] }), "o1")).toBe(true);
    expect(hasPendingReviewRefund(paidOrder({ pendingRefunds: [pending(1, "o1:r1:cancel")] }), "o1")).toBe(false);
    expect(hasPendingReviewRefund(paidOrder(), "o1")).toBe(false);
  });
});

describe("conflictingPendingRefund", () => {
  const withFailed = paidOrder({ pendingRefunds: [pending(4500, "o1:r1:cancel", { failed: true })] });
  it("intenção da mesma chave com outro valor (inclusive 0) → conflito", () => {
    expect(conflictingPendingRefund(withFailed, "o1:r1:cancel", 0)).toMatchObject({ amount: 4500 });
    expect(conflictingPendingRefund(withFailed, "o1:r1:cancel", 1000)).toMatchObject({ amount: 4500 });
  });
  it("mesmo valor (retomar) → sem conflito", () => {
    expect(conflictingPendingRefund(withFailed, "o1:r1:cancel", 4500)).toBeNull();
  });
  it("sem intenção da chave → sem conflito", () => {
    expect(conflictingPendingRefund(withFailed, "o1:r2:cancel", 0)).toBeNull();
    expect(conflictingPendingRefund(paidOrder(), "o1:r1:cancel", 0)).toBeNull();
    expect(conflictingPendingRefund(undefined, "o1:r1:cancel", 0)).toBeNull();
  });
});

describe("reviewRefundKey", () => {
  const review = { status: "pending" as const, requestedAt: 3, rentalIds: ["r1"] };
  it("estável durante a análise, mesmo se outro aluguel entrar nela", () => {
    expect(reviewRefundKey(paidOrder({}, { cancellationReview: review }), "o1")).toBe("o1:review:3");
    const grown = { ...review, rentalIds: ["r1", "r2"] };
    expect(reviewRefundKey(paidOrder({}, { cancellationReview: grown }), "o1")).toBe("o1:review:3");
  });
  it("com reembolso da análise no meio → reaproveita a chave dele (inclusive formato antigo)", () => {
    const failed = paidOrder(
      { pendingRefunds: [pending(4500, "o1:review:r1", { failed: true }), pending(100, "o1:r2:cancel")] },
      { cancellationReview: { ...review, rentalIds: ["r1", "r2"] } },
    );
    expect(reviewRefundKey(failed, "o1")).toBe("o1:review:r1");
  });
  it("aprovação parcial já reembolsada na mesma análise → chave nova", () => {
    const done = (key: string): RentalRefund => ({ amount: 100, at: 1, by: "a", providerRefundId: "rf", key });
    const once = paidOrder({ refunds: [done("o1:review:3")] }, { cancellationReview: review });
    expect(reviewRefundKey(once, "o1")).toBe("o1:review:3:2");
    const twice = paidOrder({ refunds: [done("o1:review:3"), done("o1:review:3:2")] }, { cancellationReview: review });
    expect(reviewRefundKey(twice, "o1")).toBe("o1:review:3:3");
  });
  it("reembolsos de outra análise (ou de outra data) não contam", () => {
    const done = (key: string): RentalRefund => ({ amount: 100, at: 1, by: "a", providerRefundId: "rf", key });
    const other = paidOrder({ refunds: [done("o1:review:30"), done("o1:review:1")] }, { cancellationReview: review });
    expect(reviewRefundKey(other, "o1")).toBe("o1:review:3");
  });
});

describe("dropPendingRefund", () => {
  it("remove só a chave pedida", () => {
    expect(dropPendingRefund({ pendingRefunds: [pending(1, "a"), pending(2, "b")] }, "a")).toEqual([pending(2, "b")]);
    expect(dropPendingRefund({}, "a")).toEqual([]);
  });
});

describe("finishRefund", () => {
  const intent: RentalPendingRefund = { key: "o:r1:cancel", amount: 4500, at: 5, by: "customer", rentalId: "r1", reason: "Cancelado pelo cliente" };
  it("parcial: registra, soma e tira o pendente", () => {
    const o = paidOrder({ pendingRefunds: [intent, pending(100, "x")] });
    expect(finishRefund(o, intent, { refundId: "rf9", amount: 4500 }, 50)).toEqual({
      refunds: [{ amount: 4500, at: 50, by: "customer", providerRefundId: "rf9", key: "o:r1:cancel", rentalId: "r1", reason: "Cancelado pelo cliente" }],
      refundedTotal: 4500,
      status: "partially_refunded",
      pendingRefunds: [pending(100, "x")],
    });
  });
  it("tudo devolvido → refunded", () => {
    const o = paidOrder({ refunds: [refund(3000, "a")], refundedTotal: 3000, status: "partially_refunded" });
    expect(finishRefund(o, intent, { refundId: "rf9", amount: 4500 }, 50)?.status).toBe("refunded");
  });
  it("vale o valor que o provedor devolveu", () => {
    expect(finishRefund(paidOrder(), intent, { refundId: "rf9", amount: 4000 }, 50)?.refundedTotal).toBe(4000);
  });
  it("já concluído com a mesma chave → null (não soma duas vezes)", () => {
    const o = paidOrder({ refunds: [refund(4500, "o:r1:cancel")], refundedTotal: 4500 });
    expect(finishRefund(o, intent, { refundId: "rf9", amount: 4500 }, 50)).toBeNull();
  });
  it("revisão: guarda os aluguéis cobertos", () => {
    const rv: RentalPendingRefund = { key: "o:review:r1,r2", amount: 6000, at: 5, by: "adm", rentalIds: ["r1", "r2"] };
    expect(finishRefund(paidOrder(), rv, { refundId: "rf", amount: 6000 }, 9)?.refunds[0]).toEqual({
      amount: 6000, at: 9, by: "adm", providerRefundId: "rf", key: "o:review:r1,r2", rentalIds: ["r1", "r2"],
    });
  });
});

describe("openCancellationReview", () => {
  it("abre uma nova análise", () => {
    expect(openCancellationReview(undefined, "r1", 7)).toEqual({ status: "pending", requestedAt: 7, rentalIds: ["r1"] });
  });
  it("análise pendente: acrescenta sem repetir e mantém a data original", () => {
    const open = { status: "pending" as const, requestedAt: 3, rentalIds: ["r1"] };
    expect(openCancellationReview(open, "r2", 7)).toEqual({ status: "pending", requestedAt: 3, rentalIds: ["r1", "r2"] });
    expect(openCancellationReview(open, "r1", 7)).toEqual(open);
  });
  it("análise já decidida: começa outra", () => {
    const closed = { status: "denied" as const, requestedAt: 3, rentalIds: ["r1"], decidedBy: "a", reason: "x" };
    expect(openCancellationReview(closed, "r2", 7)).toEqual({ status: "pending", requestedAt: 7, rentalIds: ["r2"] });
  });
});

describe("archiveDecidedReview", () => {
  const denied = { status: "denied" as const, requestedAt: 3, rentalIds: ["r1"], decidedBy: "a", decidedAt: 5, reason: "fora do prazo" };
  it("análise decidida vai para o fim do histórico (com o motivo)", () => {
    expect(archiveDecidedReview(denied, undefined)).toEqual([denied]);
    const older = { status: "approved" as const, requestedAt: 1, rentalIds: ["r0"], amount: 100 };
    expect(archiveDecidedReview(denied, [older])).toEqual([older, denied]);
  });
  it("sem análise ou com análise aberta → nada a guardar", () => {
    expect(archiveDecidedReview(undefined, undefined)).toBeNull();
    expect(archiveDecidedReview({ status: "pending", requestedAt: 3, rentalIds: ["r1"] }, [denied])).toBeNull();
  });
  it("histórico inválido no documento é tratado como vazio", () => {
    expect(archiveDecidedReview(denied, "x" as never)).toEqual([denied]);
  });
});

describe("closeCancellationReview", () => {
  const review = { status: "pending" as const, requestedAt: 3, rentalIds: ["r1", "r2"] };
  it("decide todos → fecha com a decisão", () => {
    expect(closeCancellationReview(review, ["r1", "r2"], { status: "approved", decidedBy: "a", decidedAt: 9, amount: 100 })).toEqual({
      status: "approved", requestedAt: 3, rentalIds: ["r1", "r2"], decidedBy: "a", decidedAt: 9, amount: 100,
    });
  });
  it("chegou outro cancelamento no meio → continua pendente só com o novo", () => {
    const grown = { ...review, rentalIds: ["r1", "r2", "r3"] };
    expect(closeCancellationReview(grown, ["r1", "r2"], { status: "denied", decidedBy: "a", decidedAt: 9, reason: "x" })).toEqual({
      status: "pending", requestedAt: 3, rentalIds: ["r3"],
    });
  });
});

describe("decideRefundedRedelivery (M1)", () => {
  it("pagamento do pedido com reembolso tardio não registrado → late", () => {
    const o = paidOrder({ status: "expired", lateApprovalRefundPending: true });
    expect(decideRefundedRedelivery(o, "p1")).toBe("late");
  });
  it("reembolso tardio já registrado → ignored", () => {
    const o = paidOrder({ status: "refunded", lateApprovalRefunded: true });
    expect(decideRefundedRedelivery(o, "p1")).toBe("ignored");
  });
  it("pagamento a mais conhecido sem providerRefundId → duplicate", () => {
    const o = paidOrder({ duplicatePayments: [{ paymentId: "p2", amount: 7500, at: 1 }] });
    expect(decideRefundedRedelivery(o, "p2")).toBe("duplicate");
    const failed = paidOrder({ duplicatePayments: [{ paymentId: "p2", amount: 7500, at: 1, refundFailed: true }] });
    expect(decideRefundedRedelivery(failed, "p2")).toBe("duplicate");
  });
  it("pagamento a mais já devolvido / desconhecido / reembolso nosso → ignored", () => {
    const o = paidOrder({ duplicatePayments: [{ paymentId: "p2", amount: 7500, at: 1, providerRefundId: "rf" }] });
    expect(decideRefundedRedelivery(o, "p2")).toBe("ignored");
    expect(decideRefundedRedelivery(paidOrder(), "p9")).toBe("ignored");
    expect(decideRefundedRedelivery(paidOrder({ status: "refunded", refundedTotal: 7500 }), "p1")).toBe("ignored");
    expect(decideRefundedRedelivery(paidOrder({}, { paymentMode: "counter", payment: undefined }), "p1")).toBe("ignored");
  });
});
