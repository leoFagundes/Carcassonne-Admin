import { describe, expect, it } from "vitest";
import {
  earliestReturnDay,
  isCheckPending,
  pendingCheckMode,
  pendingCheckOnUnit,
  returnDayError,
  returnDayOf,
  returnedLate,
} from "../returns";

// 10/11/2026 15:00 em Brasília (18:00 UTC)
const stamp = (iso: string) => ({ toMillis: () => Date.parse(iso) });

describe("returnDayOf", () => {
  it("usa o dia informado quando existe", () => {
    expect(returnDayOf({ returnedOn: "2026-11-09", returnedAt: stamp("2026-11-11T18:00:00Z") as never })).toBe(
      "2026-11-09",
    );
  });

  it("aluguéis antigos: o dia do registro, no fuso de Brasília", () => {
    // 01:30 UTC do dia 11 ainda é dia 10 em Brasília
    expect(returnDayOf({ returnedAt: stamp("2026-11-11T01:30:00Z") as never })).toBe("2026-11-10");
    expect(returnDayOf({})).toBeNull();
    expect(returnDayOf({ returnedOn: "2026-02-30" })).toBeNull();
  });
});

describe("returnedLate", () => {
  const base = { status: "returned" as const, dueDate: "2026-11-10" };

  it("mede pelo dia em que o cliente devolveu, não pelo registro", () => {
    expect(returnedLate({ ...base, returnedOn: "2026-11-10", returnedAt: stamp("2026-11-12T18:00:00Z") as never })).toBe(
      false,
    );
    expect(returnedLate({ ...base, returnedOn: "2026-11-11" })).toBe(true);
  });

  it("só vale para devolvidos", () => {
    expect(returnedLate({ ...base, status: "picked_up", returnedOn: "2026-11-20" })).toBe(false);
  });
});

describe("conferência pendente", () => {
  it("só devolvido com a marca conta", () => {
    expect(isCheckPending({ status: "returned", checkPending: true })).toBe(true);
    expect(isCheckPending({ status: "returned" })).toBe(false);
    expect(isCheckPending({ status: "picked_up", checkPending: true })).toBe(false);
  });

  it("acha a pendência da mesma cópia, ignorando o próprio aluguel", () => {
    const rentals = [
      { id: "a", gameId: "g1", unitId: "u1", status: "returned" as const, checkPending: true },
      { id: "b", gameId: "g1", unitId: "u2", status: "returned" as const, checkPending: true },
      { id: "c", gameId: "g2", unitId: "u1", status: "returned" as const, checkPending: true },
      { id: "d", gameId: "g1", unitId: "u1", status: "returned" as const, checkPending: false },
    ];
    expect(pendingCheckOnUnit(rentals, { id: "x", gameId: "g1", unitId: "u1" })?.id).toBe("a");
    expect(pendingCheckOnUnit(rentals, { id: "a", gameId: "g1", unitId: "u1" })).toBeUndefined();
    expect(pendingCheckOnUnit(rentals, { id: "x", gameId: "g2", unitId: "u2" })).toBeUndefined();
  });

  it("padrão é bloquear", () => {
    expect(pendingCheckMode(undefined)).toBe("block");
    expect(pendingCheckMode({})).toBe("block");
    expect(pendingCheckMode({ pendingCheckPickup: "warn" })).toBe("warn");
  });
});

describe("data da devolução", () => {
  const rental = { startDate: "2026-11-05", pickedUpAt: stamp("2026-11-06T15:00:00Z") as never };

  it("aceita do dia da retirada até hoje", () => {
    expect(earliestReturnDay(rental)).toBe("2026-11-06");
    expect(returnDayError("2026-11-06", rental, "2026-11-11")).toBeNull();
    expect(returnDayError("2026-11-11", rental, "2026-11-11")).toBeNull();
  });

  it("recusa futuro, antes da retirada e data inválida", () => {
    expect(returnDayError("2026-11-12", rental, "2026-11-11")).toBe("A devolução não pode ser numa data futura.");
    expect(returnDayError("2026-11-05", rental, "2026-11-11")).toBe("A devolução não pode ser antes da retirada.");
    expect(returnDayError("11/11/2026", rental, "2026-11-11")).toBe("Informe a data em que o cliente devolveu.");
  });

  it("sem data de retirada, vale o início do aluguel", () => {
    expect(earliestReturnDay({ startDate: "2026-11-05" })).toBe("2026-11-05");
  });
});
