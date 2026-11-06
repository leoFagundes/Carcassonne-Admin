import { describe, expect, it } from "vitest";
import {
  PENDING_ORDER_TTL_MS,
  clearPendingOrder,
  clearPendingOrderIf,
  rememberPendingOrder,
  takePendingOrder,
} from "./pendingOrder";

function memory() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("pendingOrder", () => {
  it("devolve uma vez e apaga", () => {
    const s = memory();
    rememberPendingOrder("o1", 1000, s);
    expect(takePendingOrder(2000, s)).toBe("o1");
    expect(takePendingOrder(2000, s)).toBeNull();
  });
  it("ignora vencido", () => {
    const s = memory();
    rememberPendingOrder("o1", 0, s);
    expect(takePendingOrder(PENDING_ORDER_TTL_MS + 1, s)).toBeNull();
  });
  it("clearPendingOrderIf só apaga o mesmo pedido", () => {
    const s = memory();
    rememberPendingOrder("o1", 0, s);
    clearPendingOrderIf("o2", s);
    expect(takePendingOrder(1, s)).toBe("o1");
    rememberPendingOrder("o1", 0, s);
    clearPendingOrderIf("o1", s);
    expect(takePendingOrder(1, s)).toBeNull();
  });
  it("clearPendingOrder apaga", () => {
    const s = memory();
    rememberPendingOrder("o1", 0, s);
    clearPendingOrder(s);
    expect(takePendingOrder(1, s)).toBeNull();
  });
});
