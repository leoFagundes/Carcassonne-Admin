import type { RentalType } from "@/types";
import { diffDays, formatDateBR } from "./dates";
import type { OrderPaymentView } from "./payments";

/**
 * Minha conta (aluguel): o que o cliente precisa fazer agora em cada pedido.
 * Datas "YYYY-MM-DD" (São Paulo).
 */

export type OrderStage = "pay" | "late" | "with_you" | "pickup" | "done";

export interface OrderHeadline {
  stage: OrderStage;
  title: string;
  detail: string;
}

type R = Pick<RentalType, "status" | "startDate" | "dueDate">;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Prioridade para ordenar "Em andamento": o mais urgente primeiro. */
export const STAGE_ORDER: Record<OrderStage, number> = { pay: 0, late: 1, with_you: 2, pickup: 3, done: 4 };

export function orderHeadline(rentals: R[], payment: OrderPaymentView["state"] | null, today: string): OrderHeadline {
  const awaiting = rentals.some((r) => r.status === "awaiting_payment");
  if (awaiting && (payment === "awaiting" || payment === "rejected")) {
    return {
      stage: "pay",
      title: payment === "rejected" ? "Pagamento não aprovado" : "Falta pagar",
      detail:
        payment === "rejected"
          ? "Tente de novo antes que o tempo acabe — depois disso as cópias são liberadas."
          : "As cópias ficam guardadas para você até o tempo acabar.",
    };
  }

  const picked = rentals.filter((r) => r.status === "picked_up").sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  if (picked.length) {
    const due = picked[0].dueDate;
    const left = diffDays(today, due);
    if (left < 0) {
      return {
        stage: "late",
        title: "Devolução atrasada",
        detail: `Era para devolver em ${formatDateBR(due)} (${plural(-left, "dia", "dias")} de atraso). Traga o quanto antes.`,
      };
    }
    return {
      stage: "with_you",
      title: "Com você",
      detail: left === 0 ? `Devolva hoje, ${formatDateBR(due)}.` : `Devolva até ${formatDateBR(due)} · faltam ${plural(left, "dia", "dias")}.`,
    };
  }

  const reserved = rentals.filter((r) => r.status === "reserved").sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  if (reserved.length) {
    const start = reserved[0].startDate;
    if (start === today) return { stage: "pickup", title: "Retire hoje", detail: "Seu jogo já está separado no Carcassonne." };
    if (start < today) {
      return { stage: "pickup", title: "Pronto para retirar", detail: `Disponível desde ${formatDateBR(start)}. Passe no Carcassonne.` };
    }
    return { stage: "pickup", title: "Reservado", detail: `Retire a partir de ${formatDateBR(start)}.` };
  }

  return { stage: "done", title: finishedLabel(rentals, payment), detail: "" };
}

/** Resumo de um pedido encerrado, para o histórico. */
export function finishedLabel(rentals: Pick<RentalType, "status">[], payment: OrderPaymentView["state"] | null): string {
  if (payment === "expired" && rentals.every((r) => r.status === "awaiting_payment" || r.status === "canceled")) {
    return "Pagamento não concluído";
  }
  if (rentals.every((r) => r.status === "returned")) return "Devolvido";
  if (rentals.every((r) => r.status === "canceled" || r.status === "awaiting_payment")) return "Cancelado";
  return "Encerrado";
}
