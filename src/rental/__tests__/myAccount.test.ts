import { describe, expect, it } from "vitest";
import type { RentalType } from "@/types";
import { finishedLabel, orderHeadline } from "@/rental/myAccount";

const TODAY = "2026-11-10";
const r = (status: RentalType["status"], startDate = TODAY, dueDate = "2026-11-17") => ({ status, startDate, dueDate });

describe("orderHeadline", () => {
  it("pagamento pendente ou recusado vem antes de tudo", () => {
    expect(orderHeadline([r("awaiting_payment")], "awaiting", TODAY)).toMatchObject({ stage: "pay", title: "Falta pagar" });
    expect(orderHeadline([r("awaiting_payment")], "rejected", TODAY)).toMatchObject({
      stage: "pay",
      title: "Pagamento não aprovado",
    });
  });

  it("atrasado e com você usam a devolução mais próxima", () => {
    expect(orderHeadline([r("picked_up", "2026-11-01", "2026-11-08")], null, TODAY)).toMatchObject({
      stage: "late",
      detail: "Era para devolver em 08/11 (2 dias de atraso). Traga o quanto antes.",
    });
    expect(orderHeadline([r("picked_up", "2026-11-05", "2026-11-13"), r("picked_up", "2026-11-05", "2026-11-12")], null, TODAY))
      .toMatchObject({ stage: "with_you", detail: "Devolva até 12/11 · faltam 2 dias." });
    expect(orderHeadline([r("picked_up", "2026-11-05", TODAY)], null, TODAY)).toMatchObject({ detail: "Devolva hoje, 10/11." });
  });

  it("reservado: hoje, já disponível ou futuro", () => {
    expect(orderHeadline([r("reserved")], "counter", TODAY)).toMatchObject({ stage: "pickup", title: "Retire hoje" });
    expect(orderHeadline([r("reserved", "2026-11-08")], null, TODAY)).toMatchObject({ title: "Pronto para retirar" });
    expect(orderHeadline([r("reserved", "2026-11-12")], null, TODAY)).toMatchObject({
      title: "Reservado",
      detail: "Retire a partir de 12/11.",
    });
  });

  it("com um jogo retirado e outro cancelado, vale o retirado", () => {
    expect(orderHeadline([r("canceled"), r("picked_up", "2026-11-05", "2026-11-12")], null, TODAY).stage).toBe("with_you");
  });

  it("encerrado", () => {
    expect(orderHeadline([r("returned")], null, TODAY)).toEqual({ stage: "done", title: "Devolvido", detail: "" });
    expect(orderHeadline([r("awaiting_payment")], "expired", TODAY)).toMatchObject({
      stage: "done",
      title: "Pagamento não concluído",
    });
  });
});

describe("finishedLabel", () => {
  it("devolvido, cancelado ou misto", () => {
    expect(finishedLabel([{ status: "returned" }, { status: "returned" }], null)).toBe("Devolvido");
    expect(finishedLabel([{ status: "canceled" }], "refunded")).toBe("Cancelado");
    expect(finishedLabel([{ status: "returned" }, { status: "canceled" }], null)).toBe("Encerrado");
  });
});
