import type { RentalOrderType, RentalType } from "@/types";

/**
 * Estatísticas do aluguel (aba Configurações → Estatísticas → Aluguel).
 * Funções puras; datas "YYYY-MM-DD" no fuso de São Paulo, dinheiro em centavos.
 * O período é pela data de retirada (`startDate`) do aluguel.
 */

export type RentalStatsPeriod = "30d" | "3m" | "6m" | "1y" | "all";

type Stamp = { toMillis: () => number } | undefined;

const PERIOD_DAYS: Record<Exclude<RentalStatsPeriod, "all">, number> = {
  "30d": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

/** Data SP ("YYYY-MM-DD") de um instante em ms. */
export function spDate(ms: number): string {
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function stampDate(stamp: Stamp): string | null {
  return stamp && typeof stamp.toMillis === "function" ? spDate(stamp.toMillis()) : null;
}

/** Primeiro dia do período (inclusive), ou null para "desde o início". */
export function periodStart(period: RentalStatsPeriod, today: string): string | null {
  if (period === "all") return null;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - PERIOD_DAYS[period]);
  return d.toISOString().slice(0, 10);
}

/** Aluguéis com retirada a partir de `start` (reservas futuras entram). */
export function rentalsFrom<T extends Pick<RentalType, "startDate">>(rentals: T[], start: string | null): T[] {
  return start ? rentals.filter((r) => r.startDate >= start) : rentals;
}

const isCanceled = (r: Pick<RentalType, "status">) => r.status === "canceled";

export interface RentalSummary {
  /** Aluguéis não cancelados. */
  rentals: number;
  canceled: number;
  /** Soma do preço dos aluguéis não cancelados. */
  revenue: number;
  /** Devolvido aos clientes (reembolsos concluídos no período). */
  refunded: number;
  returned: number;
  /** Devolvidos depois do prazo. */
  lateReturns: number;
  /** % dos devolvidos que voltaram atrasados (0–100, inteiro). */
  lateRate: number;
  /** Clientes diferentes com aluguel não cancelado. */
  customers: number;
}

export function rentalSummary(
  rentals: Pick<RentalType, "status" | "price" | "dueDate" | "returnedAt" | "customerUid">[],
  orders: Pick<RentalOrderType, "payment">[],
  start: string | null,
): RentalSummary {
  const active = rentals.filter((r) => !isCanceled(r));
  const returned = rentals.filter((r) => r.status === "returned");
  const lateReturns = returned.filter((r) => {
    const back = stampDate(r.returnedAt as Stamp);
    return back !== null && back > r.dueDate;
  }).length;
  const refunded = orders
    .flatMap((o) => o.payment?.refunds ?? [])
    .filter((f) => !start || spDate(f.at) >= start)
    .reduce((sum, f) => sum + f.amount, 0);
  return {
    rentals: active.length,
    canceled: rentals.length - active.length,
    revenue: active.reduce((sum, r) => sum + (r.price || 0), 0),
    refunded,
    returned: returned.length,
    lateReturns,
    lateRate: returned.length ? Math.round((lateReturns / returned.length) * 100) : 0,
    customers: new Set(active.map((r) => r.customerUid)).size,
  };
}

/** Jogos mais alugados (não cancelados), do mais para o menos. */
export function topGames(
  rentals: Pick<RentalType, "status" | "gameId" | "gameName">[],
  limit = 10,
): { name: string; aluguéis: number }[] {
  const count = new Map<string, { name: string; n: number }>();
  for (const r of rentals) {
    if (isCanceled(r)) continue;
    const entry = count.get(r.gameId) ?? { name: r.gameName, n: 0 };
    entry.n++;
    count.set(r.gameId, entry);
  }
  return [...count.values()]
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name, n }) => ({ name, aluguéis: n }));
}

/** Clientes que mais alugaram (não cancelados). */
export function topCustomers(
  rentals: Pick<RentalType, "status" | "customerUid" | "customer">[],
  limit = 5,
): { uid: string; name: string; count: number }[] {
  const count = new Map<string, { name: string; count: number }>();
  for (const r of rentals) {
    if (isCanceled(r)) continue;
    const entry = count.get(r.customerUid) ?? { name: r.customer.name, count: 0 };
    entry.count++;
    count.set(r.customerUid, entry);
  }
  return [...count.entries()]
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Aluguéis não cancelados por mês de retirada, no ano. */
export function monthlyRentals(
  rentals: Pick<RentalType, "status" | "startDate">[],
  year: number,
): { name: string; aluguéis: number }[] {
  const counts = Array(12).fill(0) as number[];
  for (const r of rentals) {
    if (isCanceled(r) || Number(r.startDate.slice(0, 4)) !== year) continue;
    counts[Number(r.startDate.slice(5, 7)) - 1]++;
  }
  return MONTHS.map((name, i) => ({ name, aluguéis: counts[i] }));
}

/** Situação: devolvidos, em andamento (aguardando/reservado/retirado) e cancelados. */
export function statusBreakdown(rentals: Pick<RentalType, "status">[]): {
  returned: number;
  ongoing: number;
  canceled: number;
} {
  let returned = 0;
  let canceled = 0;
  for (const r of rentals) {
    if (r.status === "returned") returned++;
    else if (r.status === "canceled") canceled++;
  }
  return { returned, ongoing: rentals.length - returned - canceled, canceled };
}

/** Quem cancelou: cliente, admin ou o sistema (prazo de pagamento esgotado). */
export function cancelBreakdown(rentals: Pick<RentalType, "status" | "canceledBy">[]): {
  customer: number;
  admin: number;
  system: number;
} {
  const out = { customer: 0, admin: 0, system: 0 };
  for (const r of rentals) {
    if (r.status !== "canceled") continue;
    out[r.canceledBy ?? "admin"]++;
  }
  return out;
}

/**
 * Como os pedidos foram pagos: balcão, Pix, cartão ou saldo do Mercado Pago.
 * Pedidos online que nunca foram pagos não entram.
 */
export function paymentBreakdown(orders: Pick<RentalOrderType, "paymentMode" | "payment">[]): {
  counter: number;
  pix: number;
  card: number;
  other: number;
} {
  const out = { counter: 0, pix: 0, card: 0, other: 0 };
  for (const o of orders) {
    if (o.paymentMode !== "online") {
      out.counter++;
      continue;
    }
    const p = o.payment;
    if (!p?.providerPaymentId || !p.paidAt) continue;
    out[p.method ?? "other"]++;
  }
  return out;
}

/** Pedidos com retirada a partir de `start`. */
export function ordersFrom<T extends Pick<RentalOrderType, "startDate">>(orders: T[], start: string | null): T[] {
  return start ? orders.filter((o) => o.startDate >= start) : orders;
}

/**
 * Tarifas do Mercado Pago nos pedidos pagos online: bruto pago, tarifa e
 * líquido que caiu na conta. `missing` = pagos sem a tarifa guardada (pedidos
 * antigos; o detalhe do pedido tem "Consultar no Mercado Pago" para completar).
 */
export function paymentFees(orders: Pick<RentalOrderType, "paymentMode" | "payment" | "total">[]): {
  paidOnline: number;
  gross: number;
  fees: number;
  net: number;
  missing: number;
  /** Bruto só dos pedidos com a tarifa guardada (base da porcentagem). */
  grossKnown: number;
} {
  const out = { paidOnline: 0, gross: 0, fees: 0, net: 0, missing: 0, grossKnown: 0 };
  for (const o of orders) {
    const p = o.payment;
    if (o.paymentMode !== "online" || !p?.providerPaymentId || !p.paidAt) continue;
    out.paidOnline++;
    out.gross += o.total;
    if (p.fee === undefined) {
      out.missing++;
      continue;
    }
    out.fees += p.fee;
    out.grossKnown += o.total;
    out.net += p.netAmount ?? o.total - p.fee;
  }
  return out;
}
