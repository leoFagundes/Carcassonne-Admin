import { LuBadgePercent } from "react-icons/lu";
import { formatBRL } from "@/rental/money";
import { formatDateBR } from "@/rental/dates";
import type { GamePricing } from "@/rental/discounts";

/**
 * Preço do jogo para o cliente. Em promoção: o cheio riscado, o novo em
 * destaque e o selo com o desconto.
 */
export function PriceTag({
  pricing,
  variant,
}: {
  pricing: GamePricing;
  /** chip: sobre a foto do cartão · inline: lista e pedido · large: detalhe. */
  variant: "chip" | "inline" | "large";
}) {
  const promo = pricing.listPrice !== undefined;
  if (variant === "chip") {
    return (
      <span
        className={`flex rounded-lg bg-primary-gold px-2 py-0.5 text-xs font-bold text-primary-black shadow-card ${
          promo ? "flex-col items-end leading-tight" : "items-baseline"
        }`}
      >
        {promo && <span className="text-[10px] font-semibold line-through opacity-55">{formatBRL(pricing.listPrice!)}</span>}
        {formatBRL(pricing.price)}
      </span>
    );
  }
  if (variant === "inline") {
    return (
      <span className="flex flex-col items-end leading-tight shrink-0">
        {promo && <span className="text-[10px] text-primary-gold/45 line-through">{formatBRL(pricing.listPrice!)}</span>}
        <span className={`text-sm font-bold ${promo ? "text-emerald-300" : "text-primary-gold"}`}>
          {formatBRL(pricing.price)}
        </span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {promo && <span className="text-sm text-primary-gold/45 line-through">{formatBRL(pricing.listPrice!)}</span>}
      <span className={`text-base font-bold ${promo ? "text-emerald-300" : "text-primary-gold"}`}>{formatBRL(pricing.price)}</span>
      {promo && pricing.until && (
        <span className="text-[11px] text-primary-gold/50">promoção até {formatDateBR(pricing.until)}</span>
      )}
    </span>
  );
}

/** Selo "Promoção -20%". */
export function PromoBadge({ pricing, className = "" }: { pricing: GamePricing; className?: string }) {
  if (pricing.listPrice === undefined) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-black shadow-card ${className}`}
    >
      <LuBadgePercent size={11} /> {pricing.label}
    </span>
  );
}

/** Aviso de promoção no topo do catálogo. */
export function PromoBanner({ message }: { message: string }) {
  return (
    <div
      role="note"
      className="flex w-full max-w-6xl items-start gap-3 rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/[0.12] via-emerald-500/[0.06] to-transparent px-4 py-3"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        <LuBadgePercent size={17} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">Promoção</span>
        <p className="text-sm leading-relaxed text-primary-gold/90 break-words">{message}</p>
      </div>
    </div>
  );
}
