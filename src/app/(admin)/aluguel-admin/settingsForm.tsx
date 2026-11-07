"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LuTriangleAlert } from "react-icons/lu";
import type { RentalSettingsType } from "@/types";
import Input from "@/components/input";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { DEFAULT_RENTAL_SETTINGS } from "@/rental/defaults";
import OnlinePaymentSection from "./onlinePaymentSettings";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Draft = Omit<RentalSettingsType, "staffEmail"> & { staffEmail: string };

/** Bloco do formulário: título, explicação curta e os campos. */
function Group({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary-gold/15 bg-primary-black/25 p-3.5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-gold/75">{title}</h3>
        {hint && <p className="text-[11px] text-primary-gold/45 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SettingsForm({ onOpenRules }: { onOpenRules: VoidFunction }) {
  const { addAlert } = useAlert();
  const [local, setLocal] = useState<Draft>({ ...DEFAULT_RENTAL_SETTINGS, staffEmail: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  // Último estado salvo: para avisar de alterações pendentes.
  const [saved, setSaved] = useState<Draft | null>(null);

  useEffect(() => {
    let first = true;
    const unsub = RentalConfigRepository.subscribeSettings((s) => {
      if (!first) return;
      first = false;
      setLocal({ ...s, staffEmail: s.staffEmail ?? "" });
      setSaved({ ...s, staffEmail: s.staffEmail ?? "" });
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: number) =>
    set(
      "pickupWeekdays",
      local.pickupWeekdays.includes(day)
        ? local.pickupWeekdays.filter((d) => d !== day)
        : [...local.pickupWeekdays, day].sort((a, b) => a - b),
    );

  const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

  const save = async () => {
    const email = local.staffEmail.trim();
    if (local.pickupWeekdays.length === 0) {
      addAlert("Escolha pelo menos um dia de retirada.");
      return;
    }
    if (!intIn(local.maxAdvanceDays, 0, 90)) {
      addAlert("A antecedência máxima deve ser de 0 a 90 dias.");
      return;
    }
    if (!intIn(local.maxGamesPerOrder, 1, 10) || !intIn(local.maxActiveGamesPerCustomer, 1, 10)) {
      addAlert("Os limites de jogos devem ser números inteiros de 1 a 10.");
      return;
    }
    const gap = local.queueGapDays ?? 1;
    if (!intIn(gap, 1, 14)) {
      addAlert("A folga entre aluguéis deve ser de 1 a 14 dias.");
      return;
    }
    const pay = local.onlinePayment;
    if (!intIn(pay.holdMinutes, 15, 60)) {
      addAlert("O tempo para pagar deve ser de 15 a 60 minutos.");
      return;
    }
    if (!intIn(pay.feePercent, 0, 50)) {
      addAlert("A taxa de cancelamento deve ser de 0 a 50%.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addAlert("Informe um e-mail da equipe válido.");
      return;
    }

    // Firestore recusa `undefined`: staffEmail só entra quando preenchido
    const payload: RentalSettingsType = {
      isEnabled: local.isEnabled,
      pickupWeekdays: local.pickupWeekdays,
      maxAdvanceDays: local.maxAdvanceDays,
      maxGamesPerOrder: local.maxGamesPerOrder,
      maxActiveGamesPerCustomer: local.maxActiveGamesPerCustomer,
      requireCpf: local.requireCpf,
      onlinePayment: local.onlinePayment,
      allowQueue: local.allowQueue !== false,
      queueGapDays: local.queueGapDays ?? 1,
      ...(email ? { staffEmail: email } : {}),
    };

    setSaving(true);
    try {
      const ok = await RentalConfigRepository.saveSettings(payload);
      if (ok) setSaved(local);
      addAlert(ok ? "Configurações salvas!" : "Não foi possível salvar as configurações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const dirty = loaded && !!saved && JSON.stringify(saved) !== JSON.stringify(local);

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <h2 className="text-lg font-semibold text-primary-gold">Configurações do serviço</h2>

      <Group
        title="Serviço"
        hint="Desligado, o cliente vê “Aluguel de jogos em breve”. Você (admin logado) continua vendo o catálogo para testar."
      >
        <Checkbox
          checked={local.isEnabled}
          setChecked={() => set("isEnabled", !local.isEnabled)}
          variant
          label={local.isEnabled ? "Aluguel ligado para os clientes" : "Aluguel desligado"}
        />
      </Group>

      <Group
        title="Retirada"
        hint={
          <>
            Os dias em que o pub atende para retirada e devolução, e com quanta antecedência o cliente pode marcar. Se o
            prazo do jogo terminar num dia sem atendimento, a devolução passa sozinha para o próximo dia marcado (ex.: prazo
            terminando na segunda, com segunda e terça desmarcadas, a devolução fica para quarta). O tempo que o cliente fica
            com o jogo é definido em cada jogo (campo “Prazo”), na aba{" "}
            <Link href="/aluguel-admin?tab=jogos" className="underline underline-offset-2">
              Jogos
            </Link>
            .
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((name, day) => (
            <Checkbox
              key={day}
              checked={local.pickupWeekdays.includes(day)}
              setChecked={() => toggleDay(day)}
              variant
              label={name}
              width="!min-w-0 !w-auto"
            />
          ))}
        </div>
        <Input
          labelSpace
          label="Antecedência máxima (dias)"
          type="number"
          placeholder="Antecedência máxima (0 a 90 dias)"
          value={String(local.maxAdvanceDays)}
          setValue={(e) => set("maxAdvanceDays", Number(e.target.value))}
          variant
          width="!w-full sm:!w-[250px] !min-w-0"
        />
        <Checkbox
          checked={local.allowQueue !== false}
          setChecked={() => set("allowQueue", local.allowQueue === false)}
          variant
          width="!max-w-none"
          label="Permitir reservar um jogo que está com outro cliente"
        />
        <p className="-mt-1 text-[11px] text-primary-gold/45 leading-relaxed">
          {local.allowQueue !== false
            ? "Ligado: o cliente pode reservar para depois da devolução de quem está com o jogo (se essa pessoa atrasar, a retirada atrasa junto)."
            : "Desligado: com todas as cópias fora, o jogo aparece como “Alugado” e só pode ser alugado depois que uma cópia voltar. Ninguém fica na fila atrás de outro cliente."}
        </p>
        <Input
          labelSpace
          label="Folga entre aluguéis da mesma cópia (dias)"
          type="number"
          placeholder="Folga entre aluguéis da mesma cópia (1 a 14 dias)"
          value={String(local.queueGapDays ?? 1)}
          setValue={(e) => set("queueGapDays", Number(e.target.value))}
          variant
          width="!w-full sm:!w-[320px] !min-w-0"
        />
        <p className="-mt-1 text-[11px] text-primary-gold/45 leading-relaxed">
          Margem de segurança caso alguém atrase. Ex.: se a cópia volta dia 23, o próximo cliente pode retirar a partir do
          dia {23 + Math.min(14, Math.max(1, Math.round(local.queueGapDays ?? 1) || 1))}
          {(local.queueGapDays ?? 1) <= 1 ? " (dia seguinte, sem margem extra)" : ""}. Vale também para quem pega a cópia
          antes de uma reserva já marcada: precisa devolver com essa folga.
        </p>
      </Group>

      <Group title="Limites" hint="Evitam que um cliente leve jogos demais de uma vez: quantos jogos cabem num pedido e quantos o mesmo cliente pode ter ao mesmo tempo (pedidos ainda não pagos também contam).">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Input
            labelSpace
            label="Máx. de jogos por pedido"
            type="number"
            placeholder="Máx. de jogos por pedido (1 a 10)"
            value={String(local.maxGamesPerOrder)}
            setValue={(e) => set("maxGamesPerOrder", Number(e.target.value))}
            variant
            width="!w-full sm:!w-[250px] !min-w-0"
          />
          <Input
            labelSpace
            label="Máx. de jogos por cliente"
            type="number"
            placeholder="Máx. de jogos ativos por cliente (1 a 10)"
            value={String(local.maxActiveGamesPerCustomer)}
            setValue={(e) => set("maxActiveGamesPerCustomer", Number(e.target.value))}
            variant
            width="!w-full sm:!w-[250px] !min-w-0"
          />
        </div>
      </Group>

      <Group
        title="Cadastro e avisos"
        hint="Com o e-mail da equipe preenchido, cada confirmação de aluguel também chega nele (cópia oculta)."
      >
        <Checkbox
          checked={local.requireCpf}
          setChecked={() => set("requireCpf", !local.requireCpf)}
          variant
          label="Exigir CPF no cadastro"
        />
        <Input
          labelSpace
          label="E-mail da equipe (opcional)"
          type="email"
          placeholder="E-mail da equipe (opcional)"
          value={local.staffEmail}
          setValue={(e) => set("staffEmail", e.target.value)}
          variant
          width="!w-full sm:!w-[320px] !min-w-0"
        />
      </Group>

      <OnlinePaymentSection
        value={local.onlinePayment}
        onChange={(next) => set("onlinePayment", next)}
        onOpenRules={onOpenRules}
      />

      {/* Salvar sempre à mão, com aviso de alterações pendentes */}
      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-gold/25 bg-primary-black/90 backdrop-blur px-3 py-2.5">
        {dirty ? (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400/90">
            <LuTriangleAlert size={13} className="shrink-0" />
            Você tem alterações não salvas
          </span>
        ) : (
          <span className="text-xs text-primary-gold/40">{loaded ? "Tudo salvo" : "Carregando..."}</span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || !loaded}
          className="text-sm px-5 py-2 rounded-xl bg-primary-gold text-primary-black font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
