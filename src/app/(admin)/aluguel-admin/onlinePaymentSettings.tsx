"use client";

import { useEffect, useState } from "react";
import { LuCreditCard, LuTriangleAlert } from "react-icons/lu";
import type { CancellationPolicy, OnlinePaymentSettings } from "@/types";
import Input from "@/components/input";
import { rentalApi } from "@/services/rentalApi";
import { formatBRL } from "@/rental/money";
import { refundFor } from "@/rental/payments";
import { FieldNote, SettingsSection, SubBlock, ToggleRow } from "./settingsBlocks";

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
export function policyPreview(policy: CancellationPolicy, feePercent: number): string {
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
      ? { text: "Verificando...", cls: "border-primary-gold/20 text-primary-gold/60" }
      : status.state === "error"
        ? { text: "Não foi possível verificar", cls: "border-invalid-color/40 text-invalid-color" }
        : !status.configured
          ? { text: "Mercado Pago não configurado", cls: "border-invalid-color/40 text-invalid-color" }
          : status.mode === "test"
            ? { text: "Mercado Pago em teste", cls: "border-orange-400/50 text-orange-300" }
            : { text: "Mercado Pago funcionando", cls: "border-emerald-400/50 text-emerald-300" };
  return (
    <span
      title="Situação ao vivo da integração"
      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${info.cls}`}
    >
      {info.text}
    </span>
  );
}

export default function OnlinePaymentSection({
  n,
  id,
  value,
  onChange,
  onOpenRules,
}: {
  n: number;
  id?: string;
  value: OnlinePaymentSettings;
  onChange: (next: OnlinePaymentSettings) => void;
  onOpenRules: VoidFunction;
}) {
  const [integration, setIntegration] = useState<Integration>({ state: "loading" });
  const [justEnabled, setJustEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    rentalApi.paymentsStatus().then((result) => {
      if (!alive) return;
      setIntegration(
        result.ok
          ? { state: "ready", configured: result.data.configured, mode: result.data.mode }
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
  const set = (patch: Partial<OnlinePaymentSettings>) => onChange({ ...value, ...patch });

  const toggle = (next: boolean) => {
    set({ enabled: next });
    setJustEnabled(next);
  };

  return (
    <SettingsSection
      id={id}
      n={n}
      icon={<LuCreditCard size={18} />}
      title="Pagamento online"
      summary="Se o cliente paga pelo site (Pix ou cartão) e o que acontece quando ele cancela um aluguel pago."
      aside={<IntegrationStatus status={integration} />}
      info={
        <>
          <p>
            <strong>Ligado:</strong> o pedido só é confirmado depois do pagamento aprovado. Enquanto o cliente paga, as
            cópias ficam reservadas pelo tempo escolhido; se ele não pagar, voltam a ficar livres.
          </p>
          <p>
            <strong>Desligado:</strong> os pedidos são reservados na hora e o pagamento é feito no balcão, na retirada.
          </p>
          <p>
            A situação ao lado do título é a da integração com o Mercado Pago no servidor: em teste, os pagamentos não são
            reais.
          </p>
        </>
      }
    >
      {integration.state === "ready" && !integration.configured && (
        <FieldNote tone="box">
          Configure as credenciais do Mercado Pago no servidor para poder ligar o pagamento online.
        </FieldNote>
      )}
      {integration.state === "ready" && integration.mode === "test" && (
        <p className="rounded-xl border border-orange-400/30 bg-orange-400/[0.05] px-3 py-2 text-xs text-orange-200/90">
          Em modo de teste os pagamentos não são reais. Troque pela credencial de produção antes de abrir ao público.
        </p>
      )}

      <ToggleRow
        checked={value.enabled}
        onChange={toggle}
        disabled={!canToggle}
        title="Cobrar online nos pedidos"
        description={
          !canToggle
            ? integration.state === "error"
              ? "Não foi possível verificar a integração agora. Recarregue a página para tentar de novo."
              : "Indisponível enquanto o Mercado Pago não estiver configurado no servidor."
            : value.enabled
              ? "Ligado: o cliente paga pelo site e o aluguel é confirmado quando o pagamento é aprovado."
              : "Desligado: os pedidos são reservados na hora e pagos no balcão. Pedidos que já aguardam pagamento seguem até expirar."
        }
      />

      {justEnabled && value.enabled && (
        <div className="flex gap-2 rounded-xl border border-orange-400/40 bg-orange-400/5 p-3 text-xs text-orange-200">
          <LuTriangleAlert size={16} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <span>
              Ao ligar, os clientes passam a pagar online (Pix ou cartão, à vista). Revise a regra de &quot;Formas de
              pagamento&quot; e as de cancelamento para ficarem de acordo.
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

      {value.enabled && (
        <>
          <SubBlock title="Como o cliente paga">
            <ToggleRow
              checked={value.pixDirect !== false}
              onChange={(v) => set({ pixDirect: v })}
              title="Oferecer “Pix aqui na tela” no pedido"
              description={
                value.pixDirect !== false
                  ? "O cliente escolhe entre o Pix gerado na hora (QR e copia e cola na página do pedido, que confirma sozinha) e “Cartão ou Pix” (página do Mercado Pago). Se o Pix não puder ser gerado, segue para o Mercado Pago."
                  : "O pagamento abre sempre a página do Mercado Pago (Pix ou cartão)."
              }
            />
          </SubBlock>

          <SubBlock title="Tempo para pagar">
            <Input
              labelSpace
              label="Tempo para pagar (minutos)"
              type="number"
              placeholder="Tempo para pagar (15 a 60 minutos)"
              value={String(value.holdMinutes)}
              setValue={(e) => set({ holdMinutes: Number(e.target.value) })}
              variant
              width="!w-full sm:!w-[260px] !min-w-0"
            />
            <FieldNote>
              Enquanto o cliente paga, o jogo fica reservado por esse tempo (de 15 a 60 minutos). Com o Pix aqui na tela,
              são pelo menos 31 minutos (mínimo do Mercado Pago).
            </FieldNote>
          </SubBlock>

          <SubBlock title="Quando o cliente cancelar um aluguel pago">
            <div role="radiogroup" aria-label="Política de cancelamento" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                    <span className={`text-sm font-semibold ${active ? "text-primary-gold" : "text-primary-gold/80"}`}>
                      {p.title}
                    </span>
                    <span className="text-xs text-primary-gold/60">{p.text}</span>
                  </button>
                );
              })}
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
                width="!w-full sm:!w-[260px] !min-w-0"
              />
            )}
            <FieldNote tone="box">{policyPreview(value.cancellationPolicy, value.feePercent)}</FieldNote>
            <p className="text-[11px] leading-relaxed text-primary-gold/45">
              Vale quando o próprio cliente cancela. Quando você cancela pela aba Aluguéis, escolhe quanto devolver.
            </p>
          </SubBlock>
        </>
      )}
    </SettingsSection>
  );
}
