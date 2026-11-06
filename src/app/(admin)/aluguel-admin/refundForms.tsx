"use client";

import { useRef, useState } from "react";
import type { RentalOrderType } from "@/types";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi, type ApiResult } from "@/services/rentalApi";
import { formatBRL, parseBRL } from "@/rental/money";
import { refundableLeft, reviewRefundCap } from "@/rental/payments";

type Order = RentalOrderType & { id: string };

/** Centavos -> "45,00" (texto editável). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const primaryButton =
  "h-9 px-4 rounded-lg bg-primary-gold text-primary-black text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const dangerButton =
  "h-9 px-4 rounded-lg border border-invalid-color/40 text-invalid-color text-xs font-semibold cursor-pointer hover:bg-invalid-color/10 disabled:opacity-40 disabled:cursor-not-allowed";

/** Campo de valor em reais; devolve centavos pelo `parseBRL` de quem usa. */
export function AmountField({
  label,
  value,
  onChange,
  cap,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  cap: number;
}) {
  const cents = parseBRL(value);
  const invalid = cents === null || cents > cap;
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Input
        label={label}
        placeholder={label}
        inputMode="decimal"
        value={value}
        setValue={(e) => onChange(e.target.value)}
        variant
        width="!w-full !min-w-0"
      />
      <span className={`text-[11px] ${invalid ? "text-invalid-color/80" : "text-primary-gold/50"}`}>
        {invalid
          ? `Informe um valor de R$ 0,00 até ${formatBRL(cap)}.`
          : `Máximo: ${formatBRL(cap)}.`}
      </span>
    </div>
  );
}

/**
 * Reembolso avulso pelo admin. O `requestId` nasce com o formulário e só muda
 * quando o valor muda (ou depois de um sucesso): repetir depois de um erro
 * reaproveita o mesmo, e o servidor não devolve duas vezes.
 */
export function RefundForm({ order }: { order: Order }) {
  const { addAlert } = useAlert();
  const left = refundableLeft(order);
  const [text, setText] = useState(centsToInput(left));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());

  const cents = parseBRL(text);
  const valid = cents !== null && cents > 0 && cents <= left;

  const changeAmount = (next: string) => {
    setText(next);
    setError("");
    requestId.current = crypto.randomUUID();
  };

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError("");
    const result = await rentalApi.refundOrder(order.id, {
      amount: cents,
      requestId: requestId.current,
      reason: reason.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      addAlert(result.message);
      return;
    }
    addAlert(`Reembolso de ${formatBRL(result.data.amount)} feito.`);
    requestId.current = crypto.randomUUID();
    setReason("");
    setText(centsToInput(Math.max(0, left - result.data.amount)));
  };

  if (left <= 0) {
    return <p className="text-xs text-primary-gold/55">Nada mais a devolver neste pedido.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      <AmountField label="Valor a devolver" value={text} onChange={changeAmount} cap={left} />
      <Input
        label="Motivo (opcional)"
        placeholder="Motivo (opcional)"
        value={reason}
        setValue={(e) => setReason(e.target.value)}
        variant
        width="!w-full !min-w-0"
      />
      {error && <p className="text-xs text-invalid-color">{error}</p>}
      <button type="button" className={`${primaryButton} self-start`} disabled={!valid || loading} onClick={submit}>
        {loading ? "Reembolsando..." : error ? "Tentar de novo" : "Reembolsar"}
      </button>
    </div>
  );
}

/** Decisão sobre um cancelamento em análise: aprovar com valor ou recusar com motivo. */
export function ReviewForm({ order }: { order: Order }) {
  const { addAlert } = useAlert();
  const review = order.cancellationReview;
  const rentalIds = review?.rentalIds ?? [];
  const cap = reviewRefundCap(order, rentalIds);
  const [text, setText] = useState(centsToInput(cap));
  const [denyReason, setDenyReason] = useState("");
  const [mode, setMode] = useState<"approve" | "deny">("approve");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (review?.status !== "pending") return null;

  const cents = parseBRL(text);
  const approveValid = cents !== null && cents <= cap;

  const run = async (request: () => Promise<ApiResult<unknown>>, success: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await request();
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      addAlert(result.message);
      return;
    }
    addAlert(success);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div role="radiogroup" aria-label="Decisão" className="flex flex-wrap gap-1.5">
        {(
          [
            ["approve", "Aprovar reembolso"],
            ["deny", "Recusar reembolso"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`h-8 px-3 rounded-full border text-xs transition-colors cursor-pointer ${
              mode === value
                ? "border-primary-gold/60 bg-primary-gold/15 text-primary-gold font-semibold"
                : "border-primary-gold/15 text-primary-gold/60 hover:border-primary-gold/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "approve" ? (
        <>
          <AmountField label="Valor a devolver" value={text} onChange={setText} cap={cap} />
          <p className="text-[11px] text-primary-gold/50">
            0,00 encerra a análise sem devolver nada. O jogo já foi cancelado e a cópia liberada.
          </p>
          {error && <p className="text-xs text-invalid-color">{error}</p>}
          <button
            type="button"
            className={`${primaryButton} self-start`}
            disabled={!approveValid || loading}
            onClick={() =>
              run(
                () => rentalApi.reviewCancellation(order.id, { decision: "approve", amount: cents! }),
                cents === 0 ? "Análise encerrada sem reembolso." : "Reembolso aprovado.",
              )
            }
          >
            {loading ? "Enviando..." : error ? "Tentar de novo" : "Aprovar reembolso"}
          </button>
        </>
      ) : (
        <>
          <Input
            label="Motivo da recusa"
            placeholder="Motivo da recusa (obrigatório)"
            value={denyReason}
            setValue={(e) => setDenyReason(e.target.value)}
            variant
            multiline
            rows={3}
            width="!w-full !min-w-0"
          />
          <p className="text-[11px] text-primary-gold/50">
            O cancelamento segue, mas nada é devolvido ao cliente.
          </p>
          {error && <p className="text-xs text-invalid-color">{error}</p>}
          <button
            type="button"
            className={`${dangerButton} self-start`}
            disabled={!denyReason.trim() || loading}
            onClick={() =>
              run(
                () => rentalApi.reviewCancellation(order.id, { decision: "deny", reason: denyReason.trim() }),
                "Reembolso recusado.",
              )
            }
          >
            {loading ? "Enviando..." : "Recusar reembolso"}
          </button>
        </>
      )}
    </div>
  );
}
