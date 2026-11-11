"use client";

import { gamePricing } from "@/rental/discounts";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LuBanknote,
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuGift,
  LuLink,
  LuPlus,
  LuQrCode,
  LuSearch,
  LuUserPlus,
} from "react-icons/lu";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import Checkbox from "@/components/checkbox";
import type { CounterPaymentMethod, RentalCustomerType, RentalGameType, RentalSettingsType, RentalType } from "@/types";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import RentalRepository from "@/services/repositories/RentalRepository";
import { rentalApi } from "@/services/rentalApi";
import { foldText, searchWords } from "@/components/showcase/search";
import { availabilityOptions, dueDateFor, gameAvailability, pickUnit } from "@/rental/availability";
import { formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { formatCpf } from "@/rental/cpf";
import { formatRulesVersion } from "@/rental/rulesVersion";
import { formatPhoneBR } from "@/utils/generalSettings";
import { availabilityLabel } from "@/app/(client)/aluguel/availabilityBadge";
import {
  OVERRIDE_TEXT,
  adminOrderWarnings,
  canPickupNow,
  counterHoldMinutes,
  isProviderChoice,
  type AdminOverride,
  type AdminPaymentChoice,
} from "@/rental/adminOrders";
import CounterPaymentPanel from "./counterPaymentPanel";
import { plural, useToday } from "./rentalShared";

type Customer = RentalCustomerType & { id: string };
type Game = RentalGameType & { id: string };
type PayKind = AdminPaymentChoice["kind"];

type Created = {
  orderId: string;
  code: string;
  customerName: string;
  online: boolean;
  pickedUp: boolean;
  startDate: string;
  total: number;
  kind: PayKind;
};

const PAY_OPTIONS: { kind: PayKind; title: string; text: string; icon: ReactNode; provider?: boolean }[] = [
  { kind: "paid", title: "Pago no balcão", text: "Dinheiro, maquininha ou Pix na chave do pub.", icon: <LuBanknote size={16} /> },
  {
    kind: "pix",
    title: "Pix QR Code",
    text: "O Mercado Pago gera o QR e o cliente paga no app do banco.",
    icon: <LuQrCode size={16} />,
    provider: true,
  },
  {
    kind: "link",
    title: "Link de pagamento",
    text: "QR ou link do Mercado Pago: Pix ou cartão no celular do cliente.",
    icon: <LuLink size={16} />,
    provider: true,
  },
  { kind: "later", title: "Paga na retirada", text: "Reserva agora e o cliente paga quando vier buscar.", icon: <LuClock size={16} /> },
  { kind: "courtesy", title: "Cortesia", text: "Sai de graça. Diga o motivo.", icon: <LuGift size={16} /> },
];

const METHODS: { value: CounterPaymentMethod; label: string }[] = [
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
  { value: "pix", label: "Pix (chave do pub)" },
];

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary-gold/15 bg-primary-black/25 p-3.5 sm:p-4">
      <header className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary-gold/40 text-[11px] font-bold text-primary-gold">
          {n}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-primary-gold">{title}</h3>
          {hint && <p className="text-[11px] text-primary-gold/45">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

const pill = (active: boolean) =>
  `rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
    active
      ? "border-primary-gold bg-primary-gold text-primary-black"
      : "border-primary-gold/20 text-primary-gold/60 hover:border-primary-gold/50 hover:text-primary-gold"
  }`;

/**
 * Aluguel criado no balcão: cliente (da lista ou cadastrado na hora, sem
 * conta), jogos e data, e como paga. Link e Pix mostram o QR na hora e
 * atualizam sozinhos quando o pagamento cai.
 */
export default function NewRentalForm({ onClose, onAgain }: { onClose: () => void; onAgain: () => void }) {
  const today = useToday();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [rentals, setRentals] = useState<(RentalType & { id: string })[]>([]);
  const [settings, setSettings] = useState<RentalSettingsType | null>(null);
  const [rulesVersion, setRulesVersion] = useState<number | null>(null);
  const [providerReady, setProviderReady] = useState<boolean | null>(null);

  useEffect(() => RentalCustomerRepository.subscribeToAll(setCustomers), []);
  useEffect(() => RentalGameRepository.subscribeToAll(setGames), []);
  useEffect(() => RentalRepository.subscribeToAll(setRentals), []);
  useEffect(() => RentalConfigRepository.subscribeSettings(setSettings), []);
  useEffect(() => RentalConfigRepository.subscribeRules((r) => setRulesVersion(r.version)), []);
  useEffect(() => {
    rentalApi.paymentsStatus().then((r) => setProviderReady(r.ok && r.data.configured));
  }, []);

  // 1) Cliente
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [customerUid, setCustomerUid] = useState<string | null>(null);
  const [guest, setGuest] = useState({ name: "", phone: "", cpf: "", email: "" });

  // 2) Jogos e data
  const [startDate, setStartDate] = useState(today);
  const [gameQuery, setGameQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  // 3) Pagamento
  const [kind, setKind] = useState<PayKind>("paid");
  const [method, setMethod] = useState<CounterPaymentMethod>("cash");
  const [reason, setReason] = useState("");
  const [pickupNow, setPickupNow] = useState(true);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [ack, setAck] = useState(false);
  const [serverWarnings, setServerWarnings] = useState<AdminOverride[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const opts = availabilityOptions(settings);
  const selected = customers.find((c) => c.id === customerUid) ?? null;

  const matches = useMemo(() => {
    const words = searchWords(query);
    const digits = query.replace(/\D/g, "");
    if (!words.length) return [];
    return customers
      .filter((c) => {
        const hay = foldText(`${c.name} ${c.email ?? ""}`);
        const byText = words.every((w) => hay.includes(w));
        const byDigits = digits.length >= 3 && (c.phone?.includes(digits) || c.cpf?.includes(digits));
        return byText || byDigits;
      })
      .slice(0, 8);
  }, [customers, query]);

  const activeGames = useMemo(
    () =>
      games
        .filter((g) => g.isActive)
        .filter((g) => {
          const words = searchWords(gameQuery);
          return words.every((w) => foldText(g.name).includes(w));
        }),
    [games, gameQuery],
  );

  const pickedGames = games.filter((g) => picked.includes(g.id));
  // Mesmo preço do servidor: a promoção que valer hoje
  const fullTotal = pickedGames.reduce((sum, g) => sum + gamePricing(g, settings, today).price, 0);
  const choice: AdminPaymentChoice =
    kind === "paid" ? { kind, method } : kind === "courtesy" ? { kind, reason } : { kind };
  const pickupAllowed = canPickupNow(choice, startDate, today);
  const activeCount = customerUid
    ? rentals.filter((r) => r.customerUid === customerUid && (r.status === "reserved" || r.status === "picked_up")).length
    : 0;
  const warnings = useMemo(() => {
    if (!settings || !picked.length) return serverWarnings;
    const local = adminOrderWarnings(picked.length, startDate, { today, settings, activeGamesCount: activeCount });
    return [...new Set([...local, ...serverWarnings])];
  }, [settings, picked.length, startDate, today, activeCount, serverWarnings]);

  // Mudou o pedido: os avisos confirmados não valem mais.
  const warningsKey = warnings.join(",");
  useEffect(() => {
    setAck(false);
  }, [warningsKey]);

  const guestReady =
    guest.name.trim().length >= 3 &&
    guest.phone.replace(/\D/g, "").length >= 10 &&
    (!settings?.requireCpf || guest.cpf.replace(/\D/g, "").length === 11);
  const customerReady = mode === "existing" ? !!selected && !selected.isBlocked : guestReady;
  const paymentReady = kind !== "courtesy" || reason.trim().length >= 3;
  const ready =
    customerReady &&
    picked.length > 0 &&
    startDate >= today &&
    paymentReady &&
    acceptedRules &&
    (warnings.length === 0 || ack) &&
    !(isProviderChoice(choice) && providerReady === false);

  // Trocou a data: tira os jogos que ficaram sem cópia livre.
  useEffect(() => {
    setPicked((list) => {
      const keep = list.filter((id) => {
        const g = games.find((x) => x.id === id);
        return !!g && startDate >= today && pickUnit(g, startDate, today, availabilityOptions(settings)) !== null;
      });
      return keep.length === list.length ? list : keep;
    });
  }, [startDate, today, games, settings]);

  const toggleGame = (id: string) =>
    setPicked((list) => (list.includes(id) ? list.filter((g) => g !== id) : [...list, id]));

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const r = await rentalApi.createAdminOrder({
      customer: mode === "existing" ? { kind: "existing", uid: customerUid! } : { kind: "new", guest },
      gameIds: picked,
      startDate,
      overrides: ack ? warnings : [],
      payment: choice,
      pickupNow: pickupAllowed && pickupNow,
      acceptedRules,
    });
    setBusy(false);
    if (!r.ok) {
      const extra = r as unknown as { overrides?: AdminOverride[]; customerUid?: string };
      if (r.code === "override_required" && extra.overrides) {
        setServerWarnings(extra.overrides);
        setError("Confirme os avisos abaixo para criar mesmo assim.");
        return;
      }
      if (r.code === "customer_exists" && extra.customerUid) {
        setMode("existing");
        setCustomerUid(extra.customerUid);
        setError("Este CPF já tem cadastro. Selecionamos o cliente: confira e crie de novo.");
        return;
      }
      setError(r.message);
      return;
    }
    setCreated({
      orderId: r.data.orderId,
      code: r.data.code,
      customerName: mode === "existing" ? (selected?.name ?? "") : guest.name.trim(),
      online: isProviderChoice(choice),
      pickedUp: pickupAllowed && pickupNow,
      startDate,
      total: kind === "courtesy" ? 0 : fullTotal,
      kind,
    });
  };

  // ── Depois de criar ──
  if (created) {
    return (
      <FormCard
        title={`Pedido ${created.code}`}
        subtitle={created.customerName}
        icon={<LuCheck size={20} />}
        onClose={onClose}
        maxWidth="sm:max-w-[520px]"
        hideFooter
      >
        {created.online ? (
          <CounterPaymentPanel orderId={created.orderId} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] p-5 text-center">
            <LuCheck size={28} className="text-emerald-300" />
            <p className="text-sm font-semibold text-emerald-300">Aluguel criado</p>
            <p className="text-xs leading-relaxed text-primary-gold/65">
              {created.pickedUp
                ? "Retirada já registrada: os jogos estão com o cliente."
                : `Retirada em ${formatDateBR(created.startDate)}. Informe o código ${created.code} no balcão.`}
              <br />
              {created.kind === "courtesy"
                ? "Cortesia (R$ 0,00)."
                : created.kind === "later"
                  ? `O cliente paga ${formatBRL(created.total)} na retirada.`
                  : `Pago no balcão: ${formatBRL(created.total)}.`}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onAgain}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary-gold/25 text-xs font-medium text-primary-gold/80 transition-colors hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer"
          >
            <LuPlus size={14} /> Criar outro aluguel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-[#f0d382] to-primary-gold text-xs font-bold text-primary-black cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </FormCard>
    );
  }

  const holdMinutes = settings ? Math.min(60, counterHoldMinutes(settings.onlinePayment.holdMinutes)) : 30;

  return (
    <FormCard
      title="Novo aluguel no balcão"
      subtitle="Criado por você, em nome do cliente"
      icon={<LuPlus size={20} />}
      onClose={onClose}
      maxWidth="sm:max-w-[640px]"
      onSubmit={submit}
      submitLabel={isProviderChoice(choice) ? "Criar e gerar pagamento" : "Criar aluguel"}
      submitDisabled={!ready}
      loading={busy}
    >
      {/* 1) Cliente */}
      <Step n={1} title="Cliente" hint="Busque pelo nome, WhatsApp, CPF ou e-mail.">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={pill(mode === "existing")} onClick={() => setMode("existing")}>
            Cliente cadastrado
          </button>
          <button type="button" className={pill(mode === "new")} onClick={() => setMode("new")}>
            <span className="inline-flex items-center gap-1">
              <LuUserPlus size={12} /> Sem conta: cadastrar agora
            </span>
          </button>
        </div>

        {mode === "existing" ? (
          selected ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-gold/30 bg-primary-gold/[0.05] p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary-gold">{selected.name}</p>
                <p className="truncate text-[11px] text-primary-gold/50">
                  {formatPhoneBR(selected.phone)}
                  {selected.email ? ` · ${selected.email}` : ""}
                  {selected.guest ? " · sem conta" : ""}
                </p>
                {selected.isBlocked && (
                  <p className="mt-1 text-[11px] font-medium text-invalid-color">
                    Cliente bloqueado. Desbloqueie na aba Clientes para alugar.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCustomerUid(null)}
                className="shrink-0 text-[11px] text-primary-gold/55 underline underline-offset-2 hover:text-primary-gold cursor-pointer"
              >
                Trocar
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input
                value={query}
                setValue={(e) => setQuery(e.target.value)}
                placeholder="Buscar cliente"
                icon={<LuSearch size={14} />}
                width="!w-full !max-w-none !min-w-0"
              />
              {query && matches.length === 0 && (
                <p className="text-[11px] text-primary-gold/45">
                  Ninguém encontrado. Se o cliente não tem conta, use{" "}
                  <button type="button" onClick={() => setMode("new")} className="underline cursor-pointer">
                    cadastrar agora
                  </button>
                  .
                </p>
              )}
              {matches.length > 0 && (
                <ul className="flex flex-col divide-y divide-primary-gold/10 rounded-lg border border-primary-gold/15">
                  {matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setCustomerUid(c.id)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-primary-gold/5 cursor-pointer"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-primary-gold/90">{c.name}</span>
                          <span className="block truncate text-[11px] text-primary-gold/45">
                            {formatPhoneBR(c.phone)}
                            {c.cpf ? ` · CPF ${formatCpf(c.cpf)}` : ""}
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {c.guest && (
                            <span className="rounded-full border border-primary-gold/25 px-2 py-0.5 text-[10px] text-primary-gold/55">
                              sem conta
                            </span>
                          )}
                          {c.isBlocked && (
                            <span className="rounded-full border border-invalid-color/40 px-2 py-0.5 text-[10px] text-invalid-color">
                              bloqueado
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Input
              labelSpace
              label="Nome completo"
              placeholder="Ex.: Ana Souza"
              value={guest.name}
              setValue={(e) => setGuest({ ...guest, name: e.target.value })}
              width="!w-full !max-w-none !min-w-0"
            />
            <Input
              labelSpace
              label="WhatsApp com DDD"
              placeholder="(61) 99999-9999"
              inputMode="tel"
              value={guest.phone}
              setValue={(e) => setGuest({ ...guest, phone: e.target.value })}
              width="!w-full !max-w-none !min-w-0"
            />
            <Input
              labelSpace
              label={settings?.requireCpf ? "CPF" : "CPF (opcional)"}
              placeholder="000.000.000-00"
              inputMode="numeric"
              value={guest.cpf}
              setValue={(e) => setGuest({ ...guest, cpf: e.target.value })}
              width="!w-full !max-w-none !min-w-0"
            />
            <Input
              labelSpace
              label="E-mail (opcional)"
              placeholder="nome@email.com"
              type="email"
              value={guest.email}
              setValue={(e) => setGuest({ ...guest, email: e.target.value })}
              width="!w-full !max-w-none !min-w-0"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-primary-gold/45 sm:col-span-2">
              Fica salvo como cliente sem conta. Se depois a pessoa criar conta no site com o mesmo CPF e WhatsApp, o
              histórico passa para a conta dela. Com e-mail, ela recebe a confirmação.
            </p>
          </div>
        )}
      </Step>

      {/* 2) Jogos e data */}
      <Step
        n={2}
        title="Jogos e data"
        hint={picked.length ? `${plural(picked.length, "jogo escolhido", "jogos escolhidos")} · ${formatBRL(fullTotal)}` : undefined}
      >
        <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <Input
            labelSpace
            type="date"
            label="Retirada"
            placeholder="Retirada"
            min={today}
            value={startDate}
            setValue={(e) => setStartDate(e.target.value || today)}
            width="!w-full !max-w-none !min-w-0"
          />
          <Input
            labelSpace
            label="Buscar jogo"
            placeholder="Nome do jogo"
            icon={<LuSearch size={14} />}
            value={gameQuery}
            setValue={(e) => setGameQuery(e.target.value)}
            width="!w-full !max-w-none !min-w-0"
          />
        </div>
        <ul className="flex max-h-72 flex-col divide-y divide-primary-gold/10 overflow-y-auto rounded-lg border border-primary-gold/15">
          {activeGames.length === 0 && (
            <li className="px-3 py-4 text-center text-[11px] text-primary-gold/45">Nenhum jogo ativo com essa busca.</li>
          )}
          {activeGames.map((g) => {
            const free = startDate >= today && pickUnit(g, startDate, today, opts) !== null;
            const on = picked.includes(g.id);
            const due = dueDateFor(startDate, g.rentalDays, opts);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => (free || on) && toggleGame(g.id)}
                  disabled={!free && !on}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                    on ? "bg-primary-gold/[0.08]" : free ? "hover:bg-primary-gold/5 cursor-pointer" : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      on ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/30"
                    }`}
                  >
                    {on && <LuCheck size={11} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-primary-gold/90">{g.name}</span>
                    <span className="block truncate text-[11px] text-primary-gold/45">
                      {free
                        ? `Cópia livre · se sair em ${formatDateBR(startDate)}, volta até ${formatDateBR(due)} (${plural(g.rentalDays, "dia", "dias")})`
                        : `Ocupado nesta data · ${availabilityLabel(gameAvailability(g, today, opts))}`}
                    </span>
                  </span>
                  {(() => {
                    const p = gamePricing(g, settings, today);
                    return (
                      <span className="flex shrink-0 flex-col items-end leading-tight">
                        {p.listPrice !== undefined && (
                          <span className="text-[10px] text-primary-gold/40 line-through">{formatBRL(p.listPrice)}</span>
                        )}
                        <span className={`text-xs font-semibold ${p.listPrice !== undefined ? "text-emerald-300" : "text-primary-gold/80"}`}>
                          {formatBRL(p.price)}
                        </span>
                      </span>
                    );
                  })()}
                </button>
              </li>
            );
          })}
        </ul>
      </Step>

      {/* 3) Pagamento */}
      <Step n={3} title="Pagamento">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PAY_OPTIONS.map((o) => {
            const disabled = o.provider && providerReady === false;
            const on = kind === o.kind;
            return (
              <button
                key={o.kind}
                type="button"
                disabled={disabled}
                onClick={() => setKind(o.kind)}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                  on
                    ? "border-primary-gold/60 bg-primary-gold/[0.07]"
                    : "border-primary-gold/15 hover:border-primary-gold/40 cursor-pointer"
                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span className={`mt-0.5 shrink-0 ${on ? "text-primary-gold" : "text-primary-gold/50"}`}>{o.icon}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-primary-gold">{o.title}</span>
                  <span className="block text-[11px] leading-snug text-primary-gold/50">
                    {disabled ? "Mercado Pago não configurado no servidor." : o.text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {kind === "paid" && (
          <div className="flex flex-wrap gap-1.5">
            {METHODS.map((m) => (
              <button key={m.value} type="button" className={pill(method === m.value)} onClick={() => setMethod(m.value)}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        {kind === "courtesy" && (
          <Input
            labelSpace
            label="Motivo da cortesia"
            placeholder="Ex.: aniversário, parceria"
            value={reason}
            setValue={(e) => setReason(e.target.value)}
            width="!w-full !max-w-none !min-w-0"
            maxLength={300}
          />
        )}
        {isProviderChoice(choice) && (
          <p className="rounded-lg bg-primary-gold/5 px-3 py-2 text-[11px] leading-relaxed text-primary-gold/60">
            Ao criar, o QR Code aparece aqui mesmo. O cliente tem {holdMinutes} minutos para pagar; depois as cópias voltam a
            ficar livres. {kind === "pix" && "O Pix direto só funciona com a conta do Mercado Pago em produção e com chave Pix cadastrada."}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {pickupAllowed && (
            <Checkbox
              variant
              width="!w-full !max-w-none !min-w-0"
              checked={pickupNow}
              setChecked={(e) => setPickupNow(e.target.checked)}
              label="O cliente já está levando agora (registra a retirada)"
            />
          )}
          <Checkbox
            variant
            width="!w-full !max-w-none !min-w-0"
            checked={acceptedRules}
            setChecked={(e) => setAcceptedRules(e.target.checked)}
            label={`O cliente leu e aceitou as regras do aluguel${rulesVersion !== null ? ` (versão ${formatRulesVersion(rulesVersion)})` : ""}`}
          />
          <a href="/aluguel/regras" target="_blank" rel="noopener noreferrer" className="self-start text-[11px] text-primary-gold/50 underline underline-offset-2 hover:text-primary-gold">
            Abrir as regras para mostrar ao cliente
          </a>
        </div>
      </Step>

      {/* Avisos e resumo */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-orange-300/30 bg-orange-300/[0.06] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-orange-300">
            <LuCircleAlert size={14} /> Este aluguel passa dos limites do site
          </p>
          <ul className="list-disc pl-5 text-[11px] leading-relaxed text-orange-200/80">
            {warnings.map((w) => (
              <li key={w}>{OVERRIDE_TEXT[w]}</li>
            ))}
          </ul>
          <Checkbox
            width="!w-full !max-w-none !min-w-0"
            withoutBackground
            checked={ack}
            setChecked={(e) => setAck(e.target.checked)}
            label="Liberar para este aluguel"
          />
        </div>
      )}

      {picked.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-gold/15 px-3.5 py-2.5 text-xs">
          <span className="text-primary-gold/60">
            {plural(picked.length, "jogo", "jogos")} · retirada {startDate === today ? "hoje" : formatDateBR(startDate)}
          </span>
          <strong className="text-primary-gold">
            {kind === "courtesy" ? (
              <>
                <span className="mr-1.5 font-normal text-primary-gold/40 line-through">{formatBRL(fullTotal)}</span>
                R$ 0,00
              </>
            ) : (
              formatBRL(fullTotal)
            )}
          </strong>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-invalid-color/30 bg-invalid-color/5 px-3 py-2 text-xs text-invalid-color">
          {error}
        </p>
      )}
    </FormCard>
  );
}
