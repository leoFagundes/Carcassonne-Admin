import { auth } from "@/services/firebaseConfig";
import type { OrderPaymentStatus, RentalReturnCondition } from "@/types";
import type { OrderInput } from "@/rental/orders";
import type { CancelOutcome } from "@/rental/payments";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; gameId?: string };

const INTERNAL_ERROR = "Erro inesperado. Tente novamente.";

async function call<T>(
  path: string,
  body: unknown = {},
  options: { auth?: boolean; method?: "GET" | "POST" } = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (options.auth !== false) {
    const user = auth.currentUser;
    if (!user) {
      return { ok: false, code: "unauthenticated", message: "Faça login para continuar." };
    }
    try {
      headers.Authorization = `Bearer ${await user.getIdToken()}`;
    } catch (error) {
      console.error("Erro ao obter token de acesso: ", error);
      return { ok: false, code: "unauthenticated", message: "Faça login para continuar." };
    }
  }

  let response: Response;
  try {
    const method = options.method ?? "POST";
    response = await fetch(path, method === "GET" ? { method, headers } : { method, headers, body: JSON.stringify(body) });
  } catch (error) {
    console.error("Erro de rede ao chamar a API: ", error);
    return { ok: false, code: "network", message: "Sem conexão. Tente novamente." };
  }

  try {
    const json = await response.json();
    if (json && typeof json === "object" && typeof json.ok === "boolean") {
      return json as ApiResult<T>;
    }
  } catch {
    // resposta não-JSON: cai no erro genérico abaixo
  }
  return { ok: false, code: "internal", message: INTERNAL_ERROR };
}

const rentalPath = (id: string, action: string) =>
  `/api/rental/rentals/${encodeURIComponent(id)}/${action}`;

const orderPath = (id: string, action: string) =>
  `/api/rental/orders/${encodeURIComponent(id)}/${action}`;

export const rentalApi = {
  createOrder: (input: OrderInput) =>
    call<{ orderId: string; code: string; checkoutUrl?: string }>("/api/rental/orders", input),

  reopenCheckout: (id: string) => call<{ checkoutUrl: string }>(orderPath(id, "checkout"), {}),

  verifyOrder: (id: string) => call<unknown>(orderPath(id, "verify"), {}),

  cancelPendingOrder: (id: string) => call<null>(orderPath(id, "cancel"), {}),

  /** Admin, em pedido pago online: `refundAmount` em centavos (0 = sem reembolso). */
  cancel: (id: string, reason?: string, refundAmount?: number) =>
    call<CancelOutcome>(rentalPath(id, "cancel"), { reason, refundAmount }),

  /** Admin. `requestId`: um por pedido de reembolso (repetir o mesmo não reembolsa duas vezes). */
  refundOrder: (id: string, body: { amount: number; requestId: string; reason?: string }) =>
    call<{ amount: number; status: OrderPaymentStatus }>(orderPath(id, "refund"), body),

  /** Admin: decide um cancelamento em análise. */
  reviewCancellation: (
    id: string,
    body: { decision: "approve"; amount: number; reason?: string } | { decision: "deny"; reason: string }
  ) =>
    call<{ kind: "approved"; amount: number } | { kind: "denied" }>(orderPath(id, "review"), body),

  /** Admin: situação da integração com o Mercado Pago (vem das variáveis do servidor). */
  paymentsStatus: () =>
    call<{ configured: boolean; mode: "test" | "production" | null }>("/api/rental/payments/status", undefined, {
      method: "GET",
    }),

  pickup: (id: string) => call<null>(rentalPath(id, "pickup"), {}),

  returnRental: (
    id: string,
    body: { condition: RentalReturnCondition; note?: string; markUnitUnavailable: boolean }
  ) => call<null>(rentalPath(id, "return"), body),

  changeDueDate: (id: string, dueDate: string) =>
    call<null>(rentalPath(id, "due-date"), { dueDate }),

  saveProfile: (body: { name: string; phone: string; cpf: string; acceptTerms: boolean }) =>
    call<null>("/api/rental/profile", body),

  setBlocked: (uid: string, blocked: boolean, reason?: string) =>
    call<null>(`/api/rental/customers/${encodeURIComponent(uid)}/block`, { blocked, reason }),

  /** Admin: expira de vez os pedidos online cujo prazo para pagar acabou (mesma rotina do cron). */
  sweepExpired: () => call<{ expired: number; paid: number; skipped: number }>("/api/rental/payments/sweep", {}),

  /** Admin: exclui de vez aluguéis encerrados (até 200 por chamada). */
  deleteRentals: (ids: string[]) =>
    call<{ deleted: number; skipped: { id: string; message: string }[] }>("/api/rental/rentals/delete", {
      ids,
    }),
};

export const adminApi = {
  /** Exclui de vez a conta (login, cadastro, acesso de admin e histórico de aluguéis). */
  deleteAccount: (uid: string) =>
    call<{ rentals: number }>(`/api/accounts/${encodeURIComponent(uid)}/delete`, {}),
};

export const accountApi = {
  sendVerification: (from: "admin" | "aluguel") =>
    call<null>("/api/auth/send-verification", { from }),

  sendPasswordReset: (email: string, from: "admin" | "aluguel") =>
    call<null>("/api/auth/send-password-reset", { email, from }, { auth: false }),
};
