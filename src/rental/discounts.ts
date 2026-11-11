import type { RentalDiscount, RentalGameType, RentalPromotion, RentalSettingsType } from "@/types";
import { isRealDate } from "./bookings";
import { formatBRL } from "./money";

/**
 * Promoções do aluguel: desconto em um jogo ou em todos (percentual ou valor),
 * com data final opcional, e a mensagem no topo do catálogo. Descontos não se
 * somam: vale o que deixa o jogo mais barato. O preço nunca fica abaixo de
 * R$ 1,00 (o Mercado Pago não cobra R$ 0).
 */

/** Menor preço com desconto, em centavos. */
export const MIN_DISCOUNTED_PRICE = 100;
export const MAX_DISCOUNT_PERCENT = 90;
export const MAX_PROMO_MESSAGE = 200;

/** Lê um desconto salvo (ou digitado); inválido → null. */
export function sanitizeDiscount(raw: unknown): RentalDiscount | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<RentalDiscount>;
  const value = typeof d.value === "number" && Number.isFinite(d.value) ? Math.round(d.value) : NaN;
  if (d.kind === "percent" && !(value >= 1 && value <= MAX_DISCOUNT_PERCENT)) return null;
  if (d.kind === "amount" && !(value >= 1)) return null;
  if (d.kind !== "percent" && d.kind !== "amount") return null;
  return {
    kind: d.kind,
    value,
    ...(isRealDate(d.until) ? { until: d.until } : {}),
  };
}

/** Promoção das configurações, limpa (sem nada útil → null). */
export function sanitizePromotion(raw: unknown): RentalPromotion | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<RentalPromotion>;
  const message = typeof p.message === "string" ? p.message.trim().slice(0, MAX_PROMO_MESSAGE) : "";
  const allGames = sanitizeDiscount(p.allGames);
  const until = isRealDate(p.until) ? p.until : undefined;
  if (!message && !allGames) return null;
  return {
    ...(message ? { message } : {}),
    ...(allGames ? { allGames: { kind: allGames.kind, value: allGames.value } } : {}),
    ...(until ? { until } : {}),
  };
}

/** Vale hoje? (sem data final, vale até ser desligado) */
export function isActiveUntil(until: string | undefined, today: string): boolean {
  return !until || today <= until;
}

/** Preço depois do desconto (nunca abaixo de R$ 1,00, nem acima do cheio). */
export function applyDiscount(price: number, discount: Pick<RentalDiscount, "kind" | "value">): number {
  const off = discount.kind === "percent" ? Math.round((price * discount.value) / 100) : discount.value;
  const floor = Math.min(price, MIN_DISCOUNTED_PRICE);
  return Math.max(floor, price - off);
}

export type GamePricing = {
  /** O que o cliente paga. */
  price: number;
  /** Preço cheio, só quando há desconto. */
  listPrice?: number;
  /** De onde veio o desconto. */
  source?: "game" | "all";
  /** Ex.: "-20%" ou "-R$ 10,00". */
  label?: string;
  /** Último dia da promoção aplicada, se tiver. */
  until?: string;
};

export function discountLabel(discount: Pick<RentalDiscount, "kind" | "value">): string {
  return discount.kind === "percent" ? `-${discount.value}%` : `-${formatBRL(discount.value)}`;
}

/** Preço do jogo hoje, com a melhor promoção que valer (do jogo ou de todos). */
export function gamePricing(
  game: Pick<RentalGameType, "price" | "discount">,
  settings: Pick<RentalSettingsType, "promotion"> | null | undefined,
  today: string,
): GamePricing {
  const candidates: { discount: RentalDiscount; source: "game" | "all"; until?: string }[] = [];
  const own = sanitizeDiscount(game.discount);
  if (own && isActiveUntil(own.until, today)) candidates.push({ discount: own, source: "game", until: own.until });
  const promo = sanitizePromotion(settings?.promotion);
  if (promo?.allGames && isActiveUntil(promo.until, today)) {
    candidates.push({ discount: promo.allGames, source: "all", until: promo.until });
  }

  let best: GamePricing = { price: game.price };
  for (const c of candidates) {
    const price = applyDiscount(game.price, c.discount);
    if (price < best.price) {
      best = {
        price,
        listPrice: game.price,
        source: c.source,
        label: discountLabel(c.discount),
        ...(c.until ? { until: c.until } : {}),
      };
    }
  }
  return best;
}

/** Mensagem de promoção para o topo do catálogo (vazia ou vencida → null). */
export function promotionMessage(
  settings: Pick<RentalSettingsType, "promotion"> | null | undefined,
  today: string,
): string | null {
  const promo = sanitizePromotion(settings?.promotion);
  if (!promo?.message || !isActiveUntil(promo.until, today)) return null;
  return promo.message;
}

/** O que o admin digitou num desconto (antes de validar). */
export type DiscountDraft = { on: boolean; kind: "percent" | "amount"; text: string; until: string };

export function draftFromDiscount(discount: Partial<RentalDiscount> | null | undefined): DiscountDraft {
  const d = sanitizeDiscount(discount);
  if (!d) return { on: false, kind: "percent", text: "", until: "" };
  return {
    on: true,
    kind: d.kind,
    text: d.kind === "percent" ? String(d.value) : centsText(d.value),
    until: d.until ?? "",
  };
}

function centsText(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Lê "10,50", "R$ 10", "10.5" em centavos; inválido → null. */
function parseMoney(text: string): number | null {
  const clean = text.replace(/R\$/gi, "").replace(/\s/g, "").replace(/\./g, (m, i, s: string) => (s.includes(",") ? "" : m));
  const normalized = clean.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/**
 * Converte o rascunho em desconto. Desligado → null. `price` (opcional) confere
 * que o desconto em valor não zera o jogo.
 */
export function discountFromDraft(
  draft: DiscountDraft,
  today: string,
  opts: { price?: number; withUntil?: boolean } = {},
): { ok: true; discount: RentalDiscount | null } | { ok: false; error: string } {
  if (!draft.on) return { ok: true, discount: null };
  let value: number | null;
  if (draft.kind === "percent") {
    value = /^\d+$/.test(draft.text.trim()) ? Number(draft.text.trim()) : null;
    if (value === null || value < 1 || value > MAX_DISCOUNT_PERCENT) {
      return { ok: false, error: `O desconto em porcentagem deve ser de 1% a ${MAX_DISCOUNT_PERCENT}%.` };
    }
  } else {
    value = parseMoney(draft.text);
    if (value === null || value < 1) return { ok: false, error: "Informe o valor do desconto (ex.: 10,00)." };
    if (opts.price !== undefined && value >= opts.price) {
      return { ok: false, error: "O desconto em valor precisa ser menor que o preço do jogo." };
    }
  }
  // Com o mínimo de R$ 1,00, um desconto pode não mudar nada (ex.: jogo de R$ 1,00)
  if (opts.price !== undefined && applyDiscount(opts.price, { kind: draft.kind, value }) >= opts.price) {
    return {
      ok: false,
      error:
        opts.price <= MIN_DISCOUNTED_PRICE
          ? `Este jogo custa ${formatBRL(opts.price)}, o preço mínimo com desconto: não dá para dar desconto nele.`
          : `Esse desconto não muda o preço (o mínimo com desconto é ${formatBRL(MIN_DISCOUNTED_PRICE)}).`,
    };
  }
  const until = opts.withUntil === false ? "" : draft.until.trim();
  if (until && !isRealDate(until)) return { ok: false, error: "Data final da promoção inválida." };
  if (until && until < today) return { ok: false, error: "A data final da promoção já passou." };
  return { ok: true, discount: { kind: draft.kind, value, ...(until ? { until } : {}) } };
}
