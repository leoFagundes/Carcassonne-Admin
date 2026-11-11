"use client";

import { LuBadgePercent } from "react-icons/lu";
import Input from "@/components/input";
import { formatBRL } from "@/rental/money";
import { formatDateBR } from "@/rental/dates";
import { applyDiscount, discountFromDraft, type DiscountDraft } from "@/rental/discounts";

const pill = (on: boolean) =>
  `h-8 min-w-[52px] px-3 rounded-full border text-xs transition-colors cursor-pointer ${
    on
      ? "border-primary-gold/60 bg-primary-gold/15 text-primary-gold font-semibold"
      : "border-primary-gold/15 text-primary-gold/60 hover:border-primary-gold/40"
  }`;

/**
 * Desconto editável: liga/desliga, porcentagem ou valor, data final opcional e
 * a prévia do preço. Usado no jogo e na promoção de todos os jogos.
 */
export default function DiscountEditor({
  draft,
  onChange,
  today,
  title,
  description,
  price,
  withUntil = true,
}: {
  draft: DiscountDraft;
  onChange: (next: DiscountDraft) => void;
  today: string;
  title: string;
  description: string;
  /** Preço do jogo, para a prévia "de/por" (ausente: prévia com R$ 50,00 de exemplo). */
  price?: number | null;
  /** Mostra o campo "Vale até" (a promoção geral usa uma data só, fora daqui). */
  withUntil?: boolean;
}) {
  const set = (patch: Partial<DiscountDraft>) => onChange({ ...draft, ...patch });
  const result = discountFromDraft(draft, today, {
    price: price && price > 0 ? price : undefined,
    withUntil,
  });
  const base = price && price > 0 ? price : 5000;
  const empty = draft.text.trim() === "";
  const preview = result.ok && result.discount ? applyDiscount(base, result.discount) : null;

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors ${draft.on ? "border-emerald-400/30 bg-emerald-400/[0.04]" : "border-primary-gold/15"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={draft.on}
        onClick={() => set({ on: !draft.on })}
        className="flex w-full items-start gap-3 text-left cursor-pointer"
      >
        <LuBadgePercent size={18} className={`mt-0.5 shrink-0 ${draft.on ? "text-emerald-300" : "text-primary-gold/45"}`} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-primary-gold">{title}</span>
          <span className="text-xs leading-relaxed text-primary-gold/50">{description}</span>
        </span>
        <span
          aria-hidden="true"
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${draft.on ? "bg-emerald-400/80" : "bg-primary-gold/20"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary-black transition-all ${draft.on ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </button>

      {draft.on && (
        <>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div role="radiogroup" aria-label="Tipo de desconto" className="flex gap-1.5">
              <button type="button" role="radio" aria-checked={draft.kind === "percent"} onClick={() => set({ kind: "percent", text: "" })} className={pill(draft.kind === "percent")}>
                %
              </button>
              <button type="button" role="radio" aria-checked={draft.kind === "amount"} onClick={() => set({ kind: "amount", text: "" })} className={pill(draft.kind === "amount")}>
                R$
              </button>
            </div>
            <Input
              labelSpace
              label={draft.kind === "percent" ? "Desconto (%)" : "Desconto (R$)"}
              placeholder={draft.kind === "percent" ? "Ex.: 20" : "Ex.: 10,00"}
              value={draft.text}
              setValue={(e) => set({ text: e.target.value })}
              inputMode={draft.kind === "percent" ? "numeric" : "decimal"}
              variant
              width="!w-[150px] !min-w-0"
            />
            {withUntil && (
              <Input
                labelSpace
                type="date"
                label="Vale até (opcional)"
                placeholder="Vale até"
                min={today}
                value={draft.until}
                setValue={(e) => set({ until: e.target.value })}
                variant
                width="!w-[180px] !min-w-0"
              />
            )}
          </div>
          <p className={`text-[11px] leading-relaxed ${result.ok || empty ? "text-primary-gold/60" : "text-invalid-color"}`}>
            {empty
              ? draft.kind === "percent"
                ? "Digite a porcentagem de desconto (de 1 a 90)."
                : "Digite quanto sai do preço (ex.: 10,00)."
              : !result.ok
              ? result.error
              : preview !== null && (
                  <>
                    {price && price > 0 ? "Fica" : "Ex.: um jogo de R$ 50,00 fica"} de{" "}
                    <span className="line-through">{formatBRL(base)}</span> por{" "}
                    <strong className="text-emerald-300">{formatBRL(preview)}</strong>
                    {withUntil && draft.until ? ` até ${formatDateBR(draft.until)}` : withUntil ? ", sem data para acabar" : ""}.
                  </>
                )}
          </p>
        </>
      )}
    </div>
  );
}
