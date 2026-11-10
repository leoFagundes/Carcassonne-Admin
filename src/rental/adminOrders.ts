import { isValidCpf, normalizeCpf } from "./cpf";
import { addDays, weekdayOf } from "./dates";
import { isProfileComplete, isRealDate, planItems, type OrderContext, type OrderErrorCode, type PlannedItem } from "./orders";
import type { CounterPaymentMethod, RentalCounterPayment, RentalCustomerType } from "@/types";

/**
 * Aluguel criado pelo admin no balcão. O admin pode passar por cima de alguns
 * limites (com confirmação): os que existem para o cliente sozinho no site. A
 * disponibilidade da cópia nunca: isso alugaria a mesma cópia duas vezes.
 */

/** Limites que o admin pode liberar, um por um, depois de ver o aviso. */
export type AdminOverride = "too_many_games" | "advance_limit" | "weekday_not_allowed" | "active_limit";

export const ADMIN_OVERRIDES: AdminOverride[] = ["too_many_games", "advance_limit", "weekday_not_allowed", "active_limit"];

export const OVERRIDE_TEXT: Record<AdminOverride, string> = {
  too_many_games: "O pedido tem mais jogos do que o limite por pedido.",
  advance_limit: "A retirada está além da antecedência máxima.",
  weekday_not_allowed: "A retirada cai num dia em que o pub não faz retiradas.",
  active_limit: "O cliente vai passar do limite de jogos ao mesmo tempo.",
};

/** Mensagens para o admin (as do site falam com o cliente). */
export const ADMIN_ORDER_MESSAGES: Partial<Record<OrderErrorCode, string>> = {
  profile_incomplete: "O cadastro deste cliente está incompleto (nome, WhatsApp e CPF).",
  customer_blocked: "Este cliente está bloqueado. Desbloqueie na aba Clientes para alugar.",
  date_out_of_range: "Escolha uma data de retirada de hoje em diante.",
  game_unavailable: "Este jogo não tem cópia livre a partir da data escolhida.",
  game_inactive: "Este jogo está inativo. Ative na aba Jogos para alugar.",
};

export type AdminPaymentChoice =
  | { kind: "paid"; method: CounterPaymentMethod }
  | { kind: "courtesy"; reason: string }
  | { kind: "later" }
  | { kind: "link" }
  | { kind: "pix" };

export const COUNTER_METHOD_LABEL: Record<CounterPaymentMethod, string> = {
  cash: "dinheiro",
  card: "cartão",
  pix: "Pix",
};

/** Pagamento pelo Mercado Pago (link ou Pix direto): o pedido fica aguardando. */
export const isProviderChoice = (choice: AdminPaymentChoice): boolean =>
  choice.kind === "link" || choice.kind === "pix";

/** "Já está levando agora": só começando hoje e já pago (no balcão) ou cortesia. */
export const canPickupNow = (choice: AdminPaymentChoice, startDate: string, today: string): boolean =>
  startDate === today && (choice.kind === "paid" || choice.kind === "courtesy");

export type AdminOrderInput = { gameIds: string[]; startDate: string; overrides: AdminOverride[] };

export type AdminOrderContext = Pick<OrderContext, "today" | "settings" | "customer" | "activeGamesCount" | "games">;

export type AdminPlanResult =
  | { ok: true; items: PlannedItem[]; overridden: AdminOverride[] }
  | { ok: false; code: OrderErrorCode; gameId?: string }
  | { ok: false; code: "override_required"; overrides: AdminOverride[] };

/** Limites do site que este pedido passaria (na ordem de ADMIN_OVERRIDES). */
export function adminOrderWarnings(
  gameCount: number,
  startDate: string,
  ctx: Pick<AdminOrderContext, "today" | "settings" | "activeGamesCount">,
): AdminOverride[] {
  const { settings, today } = ctx;
  const out: AdminOverride[] = [];
  if (gameCount > settings.maxGamesPerOrder) out.push("too_many_games");
  if (isRealDate(startDate) && startDate > addDays(today, settings.maxAdvanceDays)) out.push("advance_limit");
  if (isRealDate(startDate) && !settings.pickupWeekdays.includes(weekdayOf(startDate))) out.push("weekday_not_allowed");
  if (ctx.activeGamesCount + gameCount > settings.maxActiveGamesPerCustomer) out.push("active_limit");
  return out;
}

/**
 * Valida e planeja o pedido do balcão. Erros que não se liberam: cadastro
 * incompleto, cliente bloqueado, pedido vazio/repetido, data inválida ou no
 * passado, jogo inexistente/inativo/ocupado. Os limites liberáveis voltam em
 * `override_required` até o admin confirmar todos eles.
 */
export function planAdminOrder(input: AdminOrderInput, ctx: AdminOrderContext): AdminPlanResult {
  const { gameIds, startDate } = input;
  if (!isProfileComplete(ctx.customer, ctx.settings.requireCpf)) return { ok: false, code: "profile_incomplete" };
  if (ctx.customer?.isBlocked === true) return { ok: false, code: "customer_blocked" };
  if (gameIds.length === 0) return { ok: false, code: "empty_order" };
  if (new Set(gameIds).size !== gameIds.length) return { ok: false, code: "duplicate_game" };
  if (!isRealDate(startDate) || startDate < ctx.today) return { ok: false, code: "date_out_of_range" };

  const warnings = adminOrderWarnings(gameIds.length, startDate, ctx);
  const allowed = new Set(input.overrides);
  if (warnings.some((w) => !allowed.has(w))) return { ok: false, code: "override_required", overrides: warnings };

  const plan = planItems(gameIds, startDate, ctx);
  if (!plan.ok) return plan;
  return { ok: true, items: plan.items, overridden: warnings };
}

/** Pagamento de balcão gravado no pedido (pago na hora ou cortesia); null = paga depois ou online. */
export function counterPaymentFor(
  choice: AdminPaymentChoice,
  total: number,
  actor: { uid: string; name: string },
  nowMs: number,
): RentalCounterPayment | null {
  const base = { at: nowMs, by: actor.uid, byName: actor.name };
  if (choice.kind === "paid") return { kind: "paid", method: choice.method, amount: total, ...base };
  if (choice.kind === "courtesy") {
    return { kind: "courtesy", amount: 0, waived: total, reason: choice.reason.trim(), ...base };
  }
  return null;
}

export type GuestInput = { name: string; phone: string; cpf: string; email: string };

export type GuestCheck = { ok: true; guest: GuestInput } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cadastro rápido do cliente sem conta (mesmas regras do cadastro do site; e-mail opcional). */
export function checkGuest(raw: Partial<GuestInput>, requireCpf: boolean): GuestCheck {
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 3 || name.length > 120) return { ok: false, message: "Informe o nome completo do cliente." };
  const phone = typeof raw.phone === "string" ? raw.phone.replace(/\D/g, "") : "";
  if (phone.length < 10 || phone.length > 11) return { ok: false, message: "Informe um WhatsApp válido com DDD." };
  const cpf = typeof raw.cpf === "string" ? normalizeCpf(raw.cpf) : "";
  if (requireCpf && !cpf) return { ok: false, message: "Informe o CPF do cliente." };
  if (cpf && !isValidCpf(cpf)) return { ok: false, message: "CPF inválido." };
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (email && (email.length > 200 || !EMAIL_RE.test(email))) return { ok: false, message: "E-mail inválido." };
  return { ok: true, guest: { name, phone, cpf, email } };
}

/** Cadastro do cliente sem conta, como gravado em rentalCustomers. */
export function guestCustomerDoc(guest: GuestInput, adminUid: string): RentalCustomerType {
  return { name: guest.name, phone: guest.phone, cpf: guest.cpf, email: guest.email, guest: true, createdBy: adminUid };
}

/**
 * O cadastro sem conta é desta pessoa? Mesmo CPF (garantido pelo índice) e
 * mesmo WhatsApp: só o CPF não basta para levar o histórico de alguém.
 */
export function guestMatches(guest: Pick<RentalCustomerType, "phone">, phone: string): boolean {
  const a = (guest.phone ?? "").replace(/\D/g, "");
  const b = phone.replace(/\D/g, "");
  return a.length >= 10 && a === b;
}

/**
 * E-mail do pagador no Mercado Pago (obrigatório lá). Cliente sem e-mail usa
 * um endereço do pub por pedido, que nunca recebe nada do site.
 */
export function payerEmailFor(email: string | undefined, code: string): string {
  const clean = (email ?? "").trim();
  return clean || `pagamentos+${code.toLowerCase()}@carcassonnepub.com.br`;
}

/** Como o pedido de balcão foi pago, para o cliente e para os cards; null = paga na retirada. */
export function counterPaymentText(order: { counterPayment?: RentalCounterPayment }): string | null {
  const c = order.counterPayment;
  if (!c) return null;
  if (c.kind === "courtesy") return "Cortesia do Carcassonne Pub";
  return `Pago no balcão${c.method ? ` (${COUNTER_METHOD_LABEL[c.method]})` : ""}`;
}

/**
 * Minutos para pagar no balcão: o Pix do Mercado Pago precisa vencer pelo menos
 * 30 minutos depois de criado (um a mais de folga, ele é criado logo depois).
 */
export const counterHoldMinutes = (holdMinutes: number): number =>
  Math.max(31, Number.isFinite(holdMinutes) ? holdMinutes : 31);
