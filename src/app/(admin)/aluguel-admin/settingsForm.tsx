"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  LuArrowDown,
  LuArrowLeftRight,
  LuMousePointerClick,
  LuBadgePercent,
  LuCalendarDays,
  LuGauge,
  LuPower,
  LuTriangleAlert,
  LuUserCheck,
} from "react-icons/lu";
import type { RentalSettingsType } from "@/types";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { DEFAULT_RENTAL_SETTINGS } from "@/rental/defaults";
import { queueModeOf, type QueueMode } from "@/rental/availability";
import { weekdaysText } from "@/rental/settingsText";
import { pendingCheckMode } from "@/rental/returns";
import {
  MAX_PROMO_MESSAGE,
  discountFromDraft,
  discountLabel,
  draftFromDiscount,
  isActiveUntil,
  sanitizePromotion,
  type DiscountDraft,
} from "@/rental/discounts";
import { formatDateBR, todaySP } from "@/rental/dates";
import DiscountEditor from "./discountEditor";
import OnlinePaymentSection from "./onlinePaymentSettings";
import { FieldNote, PillChoice, SettingsSection, ToggleRow } from "./settingsBlocks";

const QUEUE_MODE_OPTIONS: { value: QueueMode; label: string; text: string }[] = [
  {
    value: "both",
    label: "Antes e depois",
    text: "Padrão. Ex.: Ana reservou de 10 a 17. Outro cliente pode pegar antes (devolvendo até o dia 9, com a folga) ou reservar a partir do dia 18.",
  },
  {
    value: "before",
    label: "Só antes",
    text: "Ex.: Ana reservou de 10 a 17. Outro cliente só pode pegar antes, devolvendo até o dia 9 (com a folga). Para depois dela, só quando a cópia voltar. Funciona igual a deixar esta opção desligada.",
  },
  {
    value: "after",
    label: "Só depois",
    text: "Ex.: Ana reservou de 10 a 17. Outro cliente só pode reservar a partir do dia 18 (com a folga). Ninguém pega a cópia no meio do caminho antes da reserva dela.",
  },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Promoção como o admin edita: mensagem, desconto em todos os jogos e data final. */
type PromoDraft = { message: string; all: DiscountDraft; until: string };

type Draft = Omit<RentalSettingsType, "staffEmail" | "promotion"> & { staffEmail: string; promo: PromoDraft };

function toDraft(s: RentalSettingsType): Draft {
  const { promotion, staffEmail, ...rest } = s;
  const p = sanitizePromotion(promotion);
  return {
    ...rest,
    staffEmail: staffEmail ?? "",
    promo: { message: p?.message ?? "", all: draftFromDiscount(p?.allGames), until: p?.until ?? "" },
  };
}

/** Resumo da promoção para o cartão do topo. */
function promoSummary(promo: PromoDraft, today: string): string {
  const all = discountFromDraft(promo.all, today, { withUntil: false });
  const parts: string[] = [];
  if (all.ok && all.discount) parts.push(`${discountLabel(all.discount)} em todos`);
  if (promo.message.trim()) parts.push("mensagem no topo");
  if (parts.length === 0) return "Sem promoção geral";
  if (promo.until && !isActiveUntil(promo.until, today)) return "Promoção vencida";
  return parts.join(" · ") + (promo.until ? ` · até ${formatDateBR(promo.until)}` : "");
}

const POLICY_SHORT = { full: "reembolso integral", fee: "reembolso com taxa", manual: "análise manual" } as const;

/** Resumo do serviço numa linha: cada item leva à sua seção. */
function Summary({ local }: { local: Draft }) {
  const queue =
    local.allowQueue === false
      ? "sem fila"
      : QUEUE_MODE_OPTIONS.find((o) => o.value === queueModeOf(local.queueMode))?.label.toLowerCase();
  const gap = local.queueGapDays ?? 1;
  const pay = local.onlinePayment;
  const items: { href: string; label: string; value: string; tone?: "on" | "off" }[] = [
    {
      href: "#cfg-servico",
      label: "Serviço",
      value: local.isEnabled ? "Ligado" : "Desligado",
      tone: local.isEnabled ? "on" : "off",
    },
    {
      href: "#cfg-retirada",
      label: "Retirada",
      value: `${weekdaysText(local.pickupWeekdays)} · até ${local.maxAdvanceDays} ${local.maxAdvanceDays === 1 ? "dia" : "dias"} antes`,
    },
    { href: "#cfg-fila", label: "Fila", value: `${queue} · folga de ${gap} ${gap === 1 ? "dia" : "dias"}` },
    {
      href: "#cfg-limites",
      label: "Limites",
      value: `${local.maxGamesPerOrder} por pedido · ${local.maxActiveGamesPerCustomer} por cliente`,
    },
    { href: "#cfg-promocao", label: "Promoção", value: promoSummary(local.promo, todaySP()) },
    {
      href: "#cfg-pagamento",
      label: "Pagamento",
      value: pay.enabled
        ? `Online${pay.pixDirect !== false ? " (Pix na tela ou cartão)" : ""} · ${POLICY_SHORT[pay.cancellationPolicy]}`
        : "No balcão, na retirada",
    },
  ];
  return (
    <nav aria-label="Resumo das configurações (atalhos para cada seção)" className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] text-primary-gold/50">
        <LuMousePointerClick size={13} className="shrink-0 text-primary-gold/40" />
        Resumo: toque num cartão para ir direto à seção.
      </span>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            title={`${it.label}: ${it.value}. Ir para a seção`}
            onClick={(e) => {
              e.preventDefault();
              document.querySelector(it.href)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="group flex min-w-0 items-center gap-2 rounded-xl border border-primary-gold/15 bg-primary-black/30 px-3 py-2 transition-colors hover:border-primary-gold/40 hover:bg-primary-gold/[0.04]"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/45">{it.label}</span>
              <span
                className={`truncate text-xs font-medium first-letter:uppercase ${
                  it.tone === "on" ? "text-emerald-300" : it.tone === "off" ? "text-invalid-color" : "text-primary-gold/85"
                }`}
              >
                {it.value}
              </span>
            </span>
            <LuArrowDown
              size={14}
              aria-hidden="true"
              className="shrink-0 text-primary-gold/30 transition-all group-hover:translate-y-0.5 group-hover:text-primary-gold"
            />
          </a>
        ))}
      </div>
    </nav>
  );
}

const numberWidth = "!w-full sm:!w-[260px] !min-w-0";

export default function SettingsForm({ onOpenRules }: { onOpenRules: VoidFunction }) {
  const { addAlert } = useAlert();
  const [local, setLocal] = useState<Draft>(() => toDraft(DEFAULT_RENTAL_SETTINGS));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  // Último estado salvo: para avisar de alterações pendentes.
  const [saved, setSaved] = useState<Draft | null>(null);

  useEffect(() => {
    let first = true;
    const unsub = RentalConfigRepository.subscribeSettings((s) => {
      if (!first) return;
      first = false;
      setLocal(toDraft(s));
      setSaved(toDraft(s));
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
    // Promoção: desconto geral válido, data final que não passou
    const today = todaySP();
    const promoAll = discountFromDraft(local.promo.all, today, { withUntil: false });
    if (!promoAll.ok) {
      addAlert(promoAll.error);
      return;
    }
    const promoUntil = local.promo.until.trim();
    if (promoUntil && promoUntil < today) {
      addAlert("A data final da promoção já passou. Apague a data ou escolha outra.");
      return;
    }
    const promotion = sanitizePromotion({
      message: local.promo.message,
      ...(promoAll.discount ? { allGames: { kind: promoAll.discount.kind, value: promoAll.discount.value } } : {}),
      ...(promoUntil ? { until: promoUntil } : {}),
    });

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
      queueMode: queueModeOf(local.queueMode),
      queueGapDays: local.queueGapDays ?? 1,
      pendingCheckPickup: pendingCheckMode(local),
      ...(promotion ? { promotion } : {}),
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
  const gap = Math.min(14, Math.max(1, Math.round(local.queueGapDays ?? 1) || 1));
  const queueOn = local.allowQueue !== false;
  const mode = queueModeOf(local.queueMode);

  const jogosLink: ReactNode = (
    <Link href="/aluguel-admin?tab=jogos" className="underline underline-offset-2">
      Jogos
    </Link>
  );

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <Summary local={local} />

      {/* 1. Serviço */}
      <SettingsSection
        id="cfg-servico"
        n={1}
        icon={<LuPower size={18} />}
        title="Serviço"
        summary="Liga ou desliga o aluguel de jogos para os clientes."
        info={
          <p>
            Desligado, o cliente vê <strong>“Aluguel de jogos em breve”</strong> e não consegue fazer pedidos. Você, logado
            como admin, continua vendo o catálogo (com o aviso “Serviço desativado”) para testar. Os aluguéis que já
            existem continuam normalmente.
          </p>
        }
      >
        <ToggleRow
          checked={local.isEnabled}
          onChange={(v) => set("isEnabled", v)}
          title="Aluguel aberto para os clientes"
          description={
            local.isEnabled
              ? "Ligado: o catálogo aparece e os clientes podem fazer pedidos."
              : "Desligado: os clientes veem “Aluguel de jogos em breve”."
          }
        />
      </SettingsSection>

      {/* 2. Retirada */}
      <SettingsSection
        id="cfg-retirada"
        n={2}
        icon={<LuCalendarDays size={18} />}
        title="Retirada e devolução"
        summary="Em que dias o pub atende o aluguel e com quanta antecedência o cliente pode marcar."
        info={
          <>
            <p>
              Os dias marcados valem para <strong>retirar e para devolver</strong>. Se o prazo do jogo terminar num dia sem
              atendimento, a devolução passa sozinha para o próximo dia marcado (ex.: prazo terminando na segunda, com
              segunda e terça desmarcadas, a devolução fica para quarta). O cliente vê a data certa no pedido.
            </p>
            <p>
              Quantos dias o cliente fica com o jogo é definido em cada jogo (campo “Prazo”), na aba {jogosLink}.
            </p>
            <p>
              <strong>Conferência:</strong> ao registrar a devolução, dá para informar o dia em que o cliente devolveu e
              deixar a contagem das peças para depois. O aluguel fica em “Para conferir” no quadro Hoje até alguém
              concluir.
            </p>
          </>
        }
      >
        <PillChoice
          label="Dias de retirada e devolução"
          multi
          options={WEEKDAYS.map((label, value) => ({ value, label }))}
          value={local.pickupWeekdays}
          onChange={toggleDay}
        />
        <Input
          labelSpace
          label="Antecedência máxima (dias)"
          type="number"
          placeholder="0 a 90"
          value={String(local.maxAdvanceDays)}
          setValue={(e) => set("maxAdvanceDays", Number(e.target.value))}
          variant
          width={numberWidth}
        />
        <FieldNote>
          {local.maxAdvanceDays === 0
            ? "0: o cliente só pode marcar para retirar no mesmo dia."
            : `O cliente pode marcar a retirada de hoje até daqui a ${local.maxAdvanceDays} ${local.maxAdvanceDays === 1 ? "dia" : "dias"}.`}
        </FieldNote>

        <PillChoice
          label="Cópia devolvida e ainda não conferida"
          options={[
            { value: "block", label: "Bloquear a próxima retirada" },
            { value: "warn", label: "Só avisar" },
          ]}
          value={pendingCheckMode(local)}
          onChange={(v) => set("pendingCheckPickup", v)}
        />
        <FieldNote tone="box">
          {pendingCheckMode(local) === "block"
            ? "Quando uma devolução fica para conferir depois, a próxima retirada daquela cópia só é registrada depois que alguém conferir as peças. A tela da retirada mostra o botão “Conferir agora”. Evita entregar um jogo incompleto para o próximo cliente."
            : "Quando uma devolução fica para conferir depois, a próxima retirada daquela cópia mostra um aviso, mas dá para entregar mesmo assim. Use se a equipe confere na hora da entrega."}{" "}
          Em qualquer caso, o cliente que devolveu já vê o aluguel como devolvido, e o atraso conta pela data em que ele
          devolveu, não pela conferência.
        </FieldNote>
      </SettingsSection>

      {/* 3. Fila e folga */}
      <SettingsSection
        id="cfg-fila"
        n={3}
        icon={<LuArrowLeftRight size={18} />}
        title="Fila e folga entre aluguéis"
        summary="Se dá para reservar um jogo que já está com alguém (ou reservado) e a margem entre um cliente e o próximo."
        info={
          <>
            <p>
              <strong>Ligado:</strong> o cliente pode encaixar o aluguel em volta de outra reserva da mesma cópia, como
              você escolher abaixo. Reservando para depois de quem está com o jogo, se essa pessoa atrasar, a retirada
              atrasa junto.
            </p>
            <p>
              <strong>Desligado:</strong> ninguém fica na fila atrás de outro cliente. Com todas as cópias fora, o jogo
              aparece como “Alugado” e só pode ser alugado quando uma voltar. Ainda dá para pegar uma cópia livre agora que
              tem reserva mais para frente, desde que devolva antes (com a folga).
            </p>
            <p>
              <strong>Folga:</strong> margem de segurança caso alguém atrase. Vale também para quem pega a cópia antes de
              uma reserva já marcada: precisa devolver com essa folga.
            </p>
          </>
        }
      >
        <ToggleRow
          checked={queueOn}
          onChange={(v) => set("allowQueue", v)}
          title="Permitir reservar um jogo que está com outro cliente"
          description={
            queueOn
              ? "Ligado: o cliente pode reservar em volta de outra reserva, como escolhido abaixo."
              : "Desligado: só cópias sem ninguém na frente. O jogo fica “Alugado” até uma cópia voltar."
          }
        />
        {queueOn && (
          <>
            <PillChoice
              label="Em volta de uma reserva já marcada, o cliente pode alugar"
              options={QUEUE_MODE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              value={mode}
              onChange={(v) => set("queueMode", v)}
            />
            <FieldNote tone="box">{QUEUE_MODE_OPTIONS.find((o) => o.value === mode)?.text}</FieldNote>
          </>
        )}
        <Input
          labelSpace
          label="Folga entre aluguéis da mesma cópia (dias)"
          type="number"
          placeholder="1 a 14"
          value={String(local.queueGapDays ?? 1)}
          setValue={(e) => set("queueGapDays", Number(e.target.value))}
          variant
          width="!w-full sm:!w-[320px] !min-w-0"
        />
        <FieldNote>
          Ex.: se a cópia volta dia 23, o próximo cliente retira a partir do dia {23 + gap}
          {gap <= 1 ? " (dia seguinte, sem margem extra)" : ""}.
        </FieldNote>
      </SettingsSection>

      {/* 4. Limites */}
      <SettingsSection
        id="cfg-limites"
        n={4}
        icon={<LuGauge size={18} />}
        title="Limites"
        summary="Quantos jogos cabem num pedido e quantos o mesmo cliente pode ter ao mesmo tempo."
        info={
          <p>
            Evitam que um cliente leve jogos demais de uma vez. No limite por cliente contam os reservados, os retirados e
            os pedidos ainda aguardando pagamento. No balcão, o admin pode passar desses limites com confirmação.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <Input
            labelSpace
            label="Máx. de jogos por pedido"
            type="number"
            placeholder="1 a 10"
            value={String(local.maxGamesPerOrder)}
            setValue={(e) => set("maxGamesPerOrder", Number(e.target.value))}
            variant
            width="!w-full !max-w-none !min-w-0"
          />
          <Input
            labelSpace
            label="Máx. de jogos ao mesmo tempo por cliente"
            type="number"
            placeholder="1 a 10"
            value={String(local.maxActiveGamesPerCustomer)}
            setValue={(e) => set("maxActiveGamesPerCustomer", Number(e.target.value))}
            variant
            width="!w-full !max-w-none !min-w-0"
          />
        </div>
      </SettingsSection>

      {/* Promoção */}
      <SettingsSection
        id="cfg-promocao"
        icon={<LuBadgePercent size={18} />}
        title="Promoção"
        summary="Mensagem no topo da página de jogos e desconto em todos os jogos de uma vez."
        info={
          <>
            <p>
              A <strong>mensagem</strong> aparece num aviso no topo da página de jogos do cliente (ex.: “Semana do
              jogo de cartas: 20% em todos”).
            </p>
            <p>
              O <strong>desconto em todos os jogos</strong> vale para os pedidos feitos enquanto ele estiver ligado. Cada
              jogo também pode ter a própria promoção (no cadastro do jogo); quando as duas valem, o cliente paga a que
              deixar o jogo mais barato. Os descontos não se somam e nenhum jogo fica abaixo de R$ 1,00.
            </p>
            <p>
              Com <strong>Vale até</strong>, a mensagem e o desconto geral somem sozinhos depois desse dia. Aluguéis já
              feitos mantêm o preço que o cliente pagou.
            </p>
          </>
        }
      >
        <Input
          labelSpace
          label="Mensagem no topo da página de jogos"
          placeholder="Ex.: Semana do jogo de cartas: 20% de desconto em todos os jogos!"
          value={local.promo.message}
          setValue={(e) => set("promo", { ...local.promo, message: e.target.value.slice(0, MAX_PROMO_MESSAGE) })}
          multiline
          rows={2}
          variant
          width="!w-full !max-w-none !min-w-0"
        />
        <FieldNote>
          {local.promo.message.trim()
            ? `Aparece para o cliente no topo da página de jogos. ${local.promo.message.length}/${MAX_PROMO_MESSAGE} caracteres.`
            : "Vazio: nenhum aviso de promoção aparece para o cliente."}
        </FieldNote>
        <DiscountEditor
          draft={local.promo.all}
          onChange={(all) => set("promo", { ...local.promo, all })}
          today={todaySP()}
          withUntil={false}
          title="Desconto em todos os jogos"
          description="Vale para todos os jogos do catálogo. Jogo com promoção própria maior continua com a dele."
        />
        <Input
          labelSpace
          type="date"
          label="Vale até (opcional)"
          placeholder="Vale até"
          min={todaySP()}
          value={local.promo.until}
          setValue={(e) => set("promo", { ...local.promo, until: e.target.value })}
          variant
          width="!w-full sm:!w-[220px] !min-w-0"
        />
        <FieldNote>
          {local.promo.until
            ? `A mensagem e o desconto geral valem até ${formatDateBR(local.promo.until)} (inclusive) e depois somem sozinhos.`
            : "Sem data: valem até você desligar."}
        </FieldNote>
      </SettingsSection>

      {/* 5. Cadastro e avisos */}
      <SettingsSection
        id="cfg-cadastro"
        n={5}
        icon={<LuUserCheck size={18} />}
        title="Cadastro e avisos"
        summary="O que o cliente precisa informar para alugar e quem da equipe recebe cópia dos pedidos."
      >
        <ToggleRow
          checked={local.requireCpf}
          onChange={(v) => set("requireCpf", v)}
          title="Exigir CPF no cadastro"
          description={
            local.requireCpf
              ? "O cliente só aluga com CPF válido (também usado para juntar o histórico de quem foi cadastrado no balcão)."
              : "O CPF fica opcional no cadastro."
          }
        />
        <Input
          labelSpace
          label="E-mail da equipe (opcional)"
          type="email"
          placeholder="equipe@email.com"
          value={local.staffEmail}
          setValue={(e) => set("staffEmail", e.target.value)}
          variant
          width="!w-full sm:!w-[360px] !min-w-0"
        />
        <FieldNote>Preenchido, cada confirmação de aluguel também chega nele (cópia oculta).</FieldNote>
      </SettingsSection>

      {/* 6. Pagamento online */}
      <OnlinePaymentSection
        n={6}
        id="cfg-pagamento"
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
