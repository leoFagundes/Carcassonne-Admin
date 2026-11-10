"use client";

import { useEffect, useState } from "react";
import { LuCreditCard, LuTriangleAlert } from "react-icons/lu";
import type { CancellationPolicy, OnlinePaymentSettings } from "@/types";
import Input from "@/components/input";
import { rentalApi } from "@/services/rentalApi";
import { formatBRL } from "@/rental/money";
import { refundFor } from "@/rental/payments";

type Integration =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; configured: boolean; mode: "test" | "production" | null };

const POLICIES: { value: CancellationPolicy; title: string; text: string }[] = [
  {
    value: "full",
    title: "Reembolso integral automático",
    text: "O cliente recebe tudo de volta na hora.",
  },
  {
    value: "fee",
    title: "Reembolso com taxa",
    text: "O cliente recebe o valor menos a taxa.",
  },
  {
    value: "manual",
    title: "Análise manual",
    text: "O cancelamento fica pendente até você decidir quanto devolver.",
  },
];

/** Frase que traduz a política escolhida num exemplo de R$ 100,00. */
export function policyPreview(
  policy: CancellationPolicy,
  feePercent: number,
): string {
  const example = 10000;
  const back = refundFor(policy, feePercent, example);
  if (back === null) {
    return `Ex.: num pedido de ${formatBRL(example)}, o cancelamento fica pendente até você decidir quanto devolver.`;
  }
  return `Ex.: num pedido de ${formatBRL(example)}, quem cancelar recebe ${formatBRL(back)}.`;
}

function IntegrationStatus({ status }: { status: Integration }) {
  const info =
    status.state === "loading"
      ? {
          text: "Verificando...",
          cls: "border-primary-gold/20 text-primary-gold/60",
        }
      : status.state === "error"
        ? {
            text: "Não foi possível verificar",
            cls: "border-invalid-color/40 text-invalid-color",
          }
        : !status.configured
          ? {
              text: "Não configurado",
              cls: "border-invalid-color/40 text-invalid-color",
            }
          : status.mode === "test"
            ? {
                text: "Modo de teste",
                cls: "border-orange-400/50 text-orange-300",
              }
            : {
                text: "Produção / Funcionando",
                cls: "border-emerald-400/50 text-emerald-300",
              };
  return (
    <span
      className={`self-start text-xs px-2.5 py-1 rounded-full border font-semibold ${info.cls}`}
    >
      {info.text}
    </span>
  );
}

export default function OnlinePaymentSection({
  value,
  onChange,
  onOpenRules,
}: {
  value: OnlinePaymentSettings;
  onChange: (next: OnlinePaymentSettings) => void;
  onOpenRules: VoidFunction;
}) {
  const [integration, setIntegration] = useState<Integration>({
    state: "loading",
  });
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    rentalApi.paymentsStatus().then((result) => {
      if (!alive) return;
      setIntegration(
        result.ok
          ? {
              state: "ready",
              configured: result.data.configured,
              mode: result.data.mode,
            }
          : { state: "error", message: result.message },
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const configured = integration.state === "ready" && integration.configured;
  // Ligado e sem credenciais (ou sem saber): ainda dá para desligar.
  const canToggle = configured || value.enabled;
  const set = (patch: Partial<OnlinePaymentSettings>) =>
    onChange({ ...value, ...patch });

  const toggle = () => {
    const next = !value.enabled;
    set({ enabled: next });
    setJustEnabled(next);
  };

  return (
    <div className="flex flex-col gap-4 min-w-0 rounded-2xl border border-primary-gold/15 bg-primary-black/30 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <LuCreditCard size={18} className="text-primary-gold/70 shrink-0" />
        <h3 className="text-base font-semibold text-primary-gold">
          Pagamento online
        </h3>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
          Situação ao vivo da integração (Mercado Pago)
        </span>
        <IntegrationStatus status={integration} />
        {integration.state === "ready" && !integration.configured && (
          <p className="text-xs text-primary-gold/60">
            Configure as credenciais do Mercado Pago no servidor para poder
            ligar o pagamento online.
          </p>
        )}
        {integration.state === "error" && (
          <p className="text-xs text-invalid-color/80">
            Não foi possível verificar a integração agora.
          </p>
        )}
        {integration.state === "ready" && integration.mode === "test" && (
          <p className="text-xs text-orange-300/80">
            Em modo de teste os pagamentos não são reais. Troque pela credencial
            de produção antes de abrir ao público.
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value.enabled}
        disabled={!canToggle}
        onClick={toggle}
        className={`flex items-center gap-3 w-full max-w-[420px] rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          value.enabled
            ? "border-primary-gold/50 bg-primary-gold/[0.07] text-primary-gold"
            : "border-primary-gold/20 text-primary-gold/80 hover:border-primary-gold/40"
        }`}
      >
        <span
          aria-hidden="true"
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            value.enabled ? "bg-primary-gold" : "bg-primary-gold/25"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary-black transition-all ${
              value.enabled ? "left-[18px]" : "left-0.5"
            }`}
          />
        </span>
        <span className="min-w-0">Exigir pagamento online nos pedidos</span>
      </button>
      {!canToggle && integration.state === "error" && (
        <p className="-mt-2 text-xs text-primary-gold/55">
          Não foi possível verificar a integração agora. Recarregue a página
          para tentar de novo.
        </p>
      )}
      {!canToggle && integration.state === "ready" && (
        <p className="-mt-2 text-xs text-primary-gold/55">
          Indisponível enquanto o Mercado Pago não estiver configurado no
          servidor.
        </p>
      )}

      {justEnabled && value.enabled && (
        <div className="flex gap-2 rounded-xl border border-orange-400/40 bg-orange-400/5 p-3 text-xs text-orange-200">
          <LuTriangleAlert size={16} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <span>
              Ao ligar, os clientes passam a pagar online (Pix ou cartão, à
              vista). Revise a regra de &quot;Formas de pagamento&quot; e as de
              cancelamento para ficarem de acordo.
            </span>
            <button
              type="button"
              onClick={onOpenRules}
              className="self-start underline underline-offset-2 font-semibold hover:text-orange-100 cursor-pointer"
            >
              Ir para as regras
            </button>
          </div>
        </div>
      )}
      {!value.enabled && (
        <p className="text-xs text-primary-gold/50">
          Desligado: os pedidos são reservados na hora e o pagamento é feito no
          balcão. Pedidos que já estão aguardando pagamento seguem até expirar.
        </p>
      )}

      <Input
        labelSpace
        label="Tempo para pagar (minutos)"
        type="number"
        placeholder="Tempo para pagar (15 a 60 minutos)"
        value={String(value.holdMinutes)}
        setValue={(e) => set({ holdMinutes: Number(e.target.value) })}
        variant
        width="!w-full sm:!w-[250px] !min-w-0"
      />
      <p className="-mt-2 text-xs text-primary-gold/55">
        Enquanto o cliente paga, o jogo fica reservado por esse tempo (de 15 a
        60 minutos).
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
          Quando o cliente cancelar um aluguel pago
        </span>
        <div
          role="radiogroup"
          aria-label="Política de cancelamento"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          {POLICIES.map((p) => {
            const active = value.cancellationPolicy === p.value;
            return (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set({ cancellationPolicy: p.value })}
                className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors cursor-pointer min-w-0 ${
                  active
                    ? "border-primary-gold/60 bg-primary-gold/10"
                    : "border-primary-gold/15 hover:border-primary-gold/40"
                }`}
              >
                <span
                  className={`text-sm font-semibold ${active ? "text-primary-gold" : "text-primary-gold/80"}`}
                >
                  {p.title}
                </span>
                <span className="text-xs text-primary-gold/60">{p.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {value.cancellationPolicy === "fee" && (
        <Input
          labelSpace
          label="Taxa de cancelamento (%)"
          type="number"
          placeholder="Taxa de cancelamento (0 a 50%)"
          value={String(value.feePercent)}
          setValue={(e) => set({ feePercent: Number(e.target.value) })}
          variant
          width="!w-full sm:!w-[250px] !min-w-0"
        />
      )}

      <p className="text-sm text-primary-gold/80 rounded-xl bg-primary-gold/[0.05] px-3 py-2">
        {policyPreview(value.cancellationPolicy, value.feePercent)}
      </p>
    </div>
  );
}
