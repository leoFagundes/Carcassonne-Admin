"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  LuBell,
  LuBellOff,
  LuBellRing,
  LuBookOpen,
  LuCalendarDays,
  LuCheck,
  LuDices,
  LuExternalLink,
  LuEye,
  LuFeather,
  LuLayers,
  LuPalette,
  LuRepeat,
  LuSparkles,
  LuToggleLeft,
  LuToggleRight,
  LuTrash2,
  LuTriangleAlert,
  LuTrophy,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import {
  GiBeerStein,
  GiCampfire,
  GiCarnivalMask,
  GiCastle,
  GiFireworkRocket,
  GiHeartWings,
  GiMeepleKing,
  GiPolarStar,
  GiPumpkinLantern,
  GiRabbit,
  GiShamrock,
  GiTrophyCup,
} from "react-icons/gi";
import { useAlert } from "@/contexts/alertProvider";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import type { SiteThemeId, SiteThemeReminder, SiteThemeStyle } from "@/types";
import {
  SITE_THEMES,
  SITE_THEME_IDS,
  SITE_THEME_STYLE_LABELS,
  daysUntilReminder,
  describeReminderPeriod,
  formatReminderDate,
  isYearlyReminder,
  reminderStatus,
} from "@/utils/siteThemes";
import ThemeLogoAccessory from "@/components/siteTheme/ThemeLogoAccessory";
import ThemeThumbnail from "@/components/siteTheme/ThemeThumbnail";
import {
  useSiteTheme,
  useSiteThemeReminders,
  useSiteThemeStyle,
} from "@/components/siteTheme/siteThemeContext";
import { Ink } from "@/components/siteTheme/ink";

// Mesmo componente das páginas do cliente, só que preso à caixa do celular
const ThemeScene = dynamic(() => import("@/components/siteTheme/ThemeScene"), {
  ssr: false,
});

// Ícone em gravura de cada tema, ao lado do nome
const THEME_ICONS: Record<SiteThemeId, IconType> = {
  default: GiCastle,
  carnaval: GiCarnivalMask,
  stpatricks: GiShamrock,
  pascoa: GiRabbit,
  aniversario: GiMeepleKing,
  namorados: GiHeartWings,
  junina: GiCampfire,
  oktoberfest: GiBeerStein,
  halloween: GiPumpkinLantern,
  natal: GiPolarStar,
  reveillon: GiFireworkRocket,
  torneio: GiTrophyCup,
};

const PREVIEW_LINKS = [
  { name: "Cardápio", description: "Drinks, petiscos e combos", Icon: LuBookOpen },
  { name: "Reserve uma mesa", description: "Garanta seu lugar na partida", Icon: LuCalendarDays },
  { name: "Ludoteca", description: "+200 jogos disponíveis", Icon: LuDices },
  { name: "Eventos", description: "Campeonatos e noites temáticas", Icon: LuTrophy },
];

/** "01/06 – 30/06" (todo ano) ou com o ano, quando o período é de um ano só. */
function shortPeriod(reminder: SiteThemeReminder) {
  if (isYearlyReminder(reminder)) {
    return `${formatReminderDate(reminder.start)} – ${formatReminderDate(reminder.end)}`;
  }
  const [sy, sm, sd] = reminder.start.split("-");
  const [ey, em, ed] = reminder.end.split("-");
  return sy === ey
    ? `${sd}/${sm} – ${ed}/${em}/${ey.slice(2)}`
    : `${sd}/${sm}/${sy.slice(2)} – ${ed}/${em}/${ey.slice(2)}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const STYLE_OPTIONS: { style: SiteThemeStyle; Icon: IconType; description: string }[] = [
  { style: "full", Icon: LuSparkles, description: "Todas as decorações e animações" },
  {
    style: "minimal",
    Icon: LuFeather,
    description: "Só a decoração do topo, poucas partículas e o enfeite do logo",
  },
];

export default function SiteThemeSettings() {
  const { addAlert } = useAlert();
  // Tema no ar e avisos, em tempo real (os mesmos que o site inteiro usa)
  const savedTheme = useSiteTheme();
  const { reminders, pending, today } = useSiteThemeReminders();
  // Versão (completa/minimalista) de cada tema, também em tempo real
  const { styles } = useSiteThemeStyle();
  const [selected, setSelected] = useState<SiteThemeId>(savedTheme);
  const [applying, setApplying] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const previousSaved = useRef(savedTheme);
  const previewRef = useRef<HTMLDivElement>(null);

  // Acompanha o tema no ar (carregou, foi aplicado aqui ou em outro
  // aparelho) sem atropelar uma escolha que ainda não foi aplicada.
  useEffect(() => {
    setSelected((current) =>
      current === previousSaved.current ? savedTheme : current,
    );
    previousSaved.current = savedTheme;
  }, [savedTheme]);

  const isDirty = selected !== savedTheme;
  const selectedInfo = SITE_THEMES[selected];
  const savedInfo = SITE_THEMES[savedTheme];
  const selectedStyle: SiteThemeStyle = styles[selected] ?? "full";
  const selectedHighlights =
    selectedStyle === "minimal" ? selectedInfo.minimal : selectedInfo.highlights;

  // A versão fica salva por tema: no tema no ar, muda o site na hora
  const changeStyle = async (style: SiteThemeStyle) => {
    if (style === selectedStyle || savingStyle) return;
    setSavingStyle(true);
    const ok = await GeneralConfigsRepository.setSiteThemeStyle(selected, style);
    setSavingStyle(false);
    if (!ok) {
      addAlert("Não foi possível salvar a versão do tema. Confira a conexão e tente novamente.");
      return;
    }
    const label = SITE_THEME_STYLE_LABELS[style].toLowerCase();
    addAlert(
      selected === savedTheme
        ? `${selectedInfo.name}: versão ${label} já no ar!`
        : `${selectedInfo.name}: versão ${label} salva para quando o tema for aplicado.`,
    );
  };

  const applyTheme = async (theme: SiteThemeId = selected) => {
    if (theme === savedTheme || applying) return;
    setApplying(true);
    // Só o campo do tema — não leva junto alterações não salvas das outras abas
    const ok = await GeneralConfigsRepository.update({ siteTheme: theme });
    setApplying(false);
    if (!ok) {
      addAlert("Não foi possível aplicar o tema. Confira a conexão e tente novamente.");
      return;
    }
    // O tema chega a todas as páginas abertas pelo listener do banco
    setSelected(theme);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
    addAlert(
      theme === "default"
        ? "Visual padrão de volta ao site!"
        : `Tema ${SITE_THEMES[theme].name} aplicado no site!`,
    );
  };

  const silence = async (theme: SiteThemeId) => {
    const reminder = reminders[theme];
    if (!reminder) return;
    const ok = await GeneralConfigsRepository.setSiteThemeReminder(theme, {
      ...reminder,
      enabled: false,
    });
    addAlert(
      ok
        ? `Aviso do tema ${SITE_THEMES[theme].name} silenciado.`
        : "Não foi possível silenciar o aviso. Tente novamente.",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Avisos valendo agora ── */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#ff9a3c]/30 bg-[#ff9a3c]/[0.06] p-4">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#ffb36b]">
            <LuBellRing size={13} className="animate-pulse" />
            {pending.length === 1 ? "Tema para ativar" : `${pending.length} temas para ativar`}
          </span>
          {pending.map(({ theme, reminder }) => (
            <div
              key={theme}
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-primary-black/40 border border-[#ff9a3c]/20"
            >
              <span className="w-8 shrink-0">
                <Ink icon={THEME_ICONS[theme]} coarse />
              </span>
              <div className="flex flex-col flex-1 min-w-[180px]">
                <span className="text-sm font-semibold text-primary-gold">
                  {SITE_THEMES[theme].name}
                </span>
                <span className="text-[11px] text-primary-gold/50">
                  {capitalize(describeReminderPeriod(reminder))} — o tema
                  ainda não está no ar.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelected(theme);
                    // No celular a prévia fica lá embaixo: leva até ela
                    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/20 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/50 text-xs transition-all cursor-pointer"
                >
                  <LuEye size={13} /> Ver prévia
                </button>
                <button
                  onClick={() => applyTheme(theme)}
                  disabled={applying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff9a3c]/50 bg-[#ff9a3c]/10 text-[#ffb36b] hover:bg-[#ff9a3c]/20 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  <LuCheck size={13} /> Aplicar agora
                </button>
                <button
                  onClick={() => silence(theme)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold/80 hover:border-primary-gold/40 text-xs transition-all cursor-pointer"
                >
                  <LuBellOff size={13} /> Silenciar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ── Escolha do tema ── */}
        <div className="flex flex-col rounded-xl border border-primary-gold/15 bg-secondary-black/40 flex-1 w-full min-w-0">
          <div className="flex flex-col gap-5 p-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[14px] font-semibold uppercase tracking-widest text-primary-gold/45">
                <LuPalette size={15} />
                Tema do site
              </span>
              <p className="text-xs text-primary-gold/40 leading-relaxed">
                Muda o visual de todas as páginas — o site dos clientes (links,
                cardápio, reservas, ludoteca, eventos, músicas) e este painel. O
                preto e o dourado do Carcassonne continuam; o tema soma
                decorações animadas em estilo de gravura medieval e uma cor de
                destaque. A troca aparece na hora para quem estiver com o site
                aberto.
              </p>
            </div>

            {/* Tema selecionado: o que traz e o aviso de ativação */}
            <div className="flex flex-col gap-3 p-3 rounded-lg border border-primary-gold/15 bg-primary-black/30">
              <div className="flex items-center gap-3">
                <span className="w-9 shrink-0">
                  <Ink icon={THEME_ICONS[selected]} coarse />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-primary-gold">
                    {selectedInfo.name}
                  </span>
                  <span className="text-[11px] text-primary-gold/45">
                    {selectedInfo.tagline}
                  </span>
                </div>
              </div>
              {/* Versão do tema: completa (tudo) ou minimalista (menos coisas) */}
              {selected !== "default" && (
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                    <LuLayers size={13} />
                    Versão do tema
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Versão do tema"
                    className="grid grid-cols-2 gap-1 p-1 rounded-lg border border-primary-gold/15 bg-primary-black/40"
                  >
                    {STYLE_OPTIONS.map(({ style, Icon, description }) => {
                      const active = selectedStyle === style;
                      return (
                        <button
                          key={style}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => changeStyle(style)}
                          disabled={savingStyle}
                          className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-md border text-left transition-all cursor-pointer disabled:cursor-wait ${
                            active
                              ? "border-primary-gold/40 bg-primary-gold/[0.12] text-primary-gold"
                              : "border-transparent text-primary-gold/50 hover:text-primary-gold/80 hover:bg-primary-gold/5"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-xs font-semibold">
                            <Icon size={13} />
                            {SITE_THEME_STYLE_LABELS[style]}
                          </span>
                          <span
                            className={`text-[10px] leading-snug ${
                              active ? "text-primary-gold/55" : "text-primary-gold/35"
                            }`}
                          >
                            {description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-primary-gold/35">
                    {selected === savedTheme
                      ? "O tema está no ar: a troca aparece na hora no site."
                      : "Fica salva neste tema e vale quando ele for aplicado."}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                  <LuSparkles size={13} />
                  {selected === "default"
                    ? "Visual padrão"
                    : selectedStyle === "minimal"
                      ? "O que aparece no site (minimalista)"
                      : "O que aparece no site"}
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {selectedHighlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2 text-xs text-primary-gold/60">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: selectedInfo.swatches[1] }}
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
              {/* A key recria o editor ao trocar de tema ou quando o período
                  salvo muda (inclusive vindo de outro aparelho) */}
              <ReminderEditor
                key={`${selected}:${reminders[selected]?.start ?? ""}:${reminders[selected]?.end ?? ""}`}
                theme={selected}
                reminder={reminders[selected]}
                isLive={selected === savedTheme}
                today={today}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {SITE_THEME_IDS.map((id) => {
                const info = SITE_THEMES[id];
                const isSelected = selected === id;
                const isLive = savedTheme === id;
                const reminder = reminders[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelected(id)}
                    aria-pressed={isSelected}
                    className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-primary-gold/70 shadow-[0_0_0_1px_rgba(230,197,107,0.35),0_8px_24px_rgba(0,0,0,0.35)]"
                        : "border-primary-gold/15 hover:border-primary-gold/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="relative h-24 w-full overflow-hidden">
                      <ThemeThumbnail theme={id} />
                      {reminder && (
                        <ReminderChip reminder={reminder} isLive={isLive} today={today} />
                      )}
                    </div>

                    {isLive && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-green-500/30 text-[10px] font-medium text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        No ar
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-primary-gold text-primary-black shadow-card">
                        <LuCheck size={12} strokeWidth={3} />
                      </span>
                    )}

                    <div className="flex flex-col gap-1.5 p-3 bg-primary-black/40 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-primary-gold">
                        <span className="w-5 shrink-0">
                          <Ink icon={THEME_ICONS[id]} coarse />
                        </span>
                        {info.name}
                      </span>
                      <span className="text-[11px] text-primary-gold/45 leading-snug">
                        {info.tagline}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {info.swatches.map((color) => (
                          <span
                            key={color}
                            className="w-3.5 h-3.5 rounded-full border border-white/15"
                            style={{ background: color }}
                          />
                        ))}
                        {styles[id] === "minimal" && (
                          <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-primary-gold/25 text-[9px] font-semibold uppercase tracking-wider text-primary-gold/60">
                            <LuFeather size={9} />
                            Minimalista
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-primary-gold/35 leading-relaxed">
              As decorações ficam atrás do conteúdo ou passam rapidinho pela tela
              — nada impede o cliente de ler ou clicar. Quem usa &quot;reduzir
              movimento&quot; no celular vê o tema sem animação.
            </p>
          </div>

          {/* Rodapé fixo: o botão de aplicar fica sempre à mão enquanto rola */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-4 py-3 border-t border-primary-gold/10 bg-secondary-black/95 backdrop-blur-sm rounded-b-xl">
            {isDirty && !applying ? (
              <span className="flex items-center gap-1.5 text-xs text-yellow-400/90">
                <LuTriangleAlert size={13} className="shrink-0" />
                Ainda não aplicado · no ar: {savedInfo.name}
              </span>
            ) : (
              <span className="text-xs text-primary-gold/35">No ar: {savedInfo.name}</span>
            )}
            <button
              onClick={() => applyTheme()}
              disabled={!isDirty || applying}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shrink-0 ${
                justSaved
                  ? "border-green-600/50 text-green-500 bg-green-600/10"
                  : "border-primary-gold/30 text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold hover:bg-primary-gold/5 disabled:opacity-40"
              }`}
            >
              {applying ? (
                <span className="animate-pulse">Aplicando...</span>
              ) : justSaved ? (
                <>
                  <LuCheck size={14} />
                  Aplicado
                </>
              ) : (
                "Aplicar no site"
              )}
            </button>
          </div>
        </div>

        {/* ── Pré-visualização ── */}
        <div
          ref={previewRef}
          className="flex flex-col items-center gap-3 rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 w-full lg:w-auto lg:shrink-0 lg:sticky lg:top-0"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
            Pré-visualização
          </span>
          <PhonePreview theme={selected} minimal={selectedStyle === "minimal"} />
          <a
            href="/linktree"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary-gold/50 hover:text-primary-gold transition-colors"
          >
            Abrir o site <LuExternalLink size={12} />
          </a>
          {/* Crédito exigido pela licença CC BY 3.0 dos desenhos-base */}
          <span className="text-[10px] text-primary-gold/25">
            Ilustrações base: game-icons.net (CC BY 3.0)
          </span>
        </div>
      </div>
    </div>
  );
}

/** Selo do aviso no card: período e situação (valendo, em breve, silenciado...). */
function ReminderChip({
  reminder,
  isLive,
  today,
}: {
  reminder: SiteThemeReminder;
  isLive: boolean;
  today: string;
}) {
  const status = reminderStatus(reminder, today);
  const pendingNow = status === "active" && reminder.enabled && !isLive;
  const tone = !reminder.enabled
    ? "text-primary-gold/35 border-primary-gold/15"
    : pendingNow
      ? "text-[#ffb36b] border-[#ff9a3c]/50"
      : status === "active"
        ? "text-green-400 border-green-500/30"
        : status === "upcoming"
          ? "text-primary-gold/70 border-primary-gold/25"
          : "text-primary-gold/30 border-primary-gold/10";
  const Icon = !reminder.enabled ? LuBellOff : pendingNow ? LuBellRing : LuBell;
  const label = !reminder.enabled
    ? "silenciado"
    : pendingNow
      ? "avisando para ativar"
      : status === "active"
        ? "no período"
        : status === "upcoming"
          ? "agendado"
          : "encerrado";
  return (
    <span
      title={`Aviso ${describeReminderPeriod(reminder)} · ${label}`}
      className={`absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/65 backdrop-blur-sm border text-[10px] font-medium ${tone}`}
    >
      <Icon size={11} className={pendingNow ? "animate-pulse" : ""} />
      {shortPeriod(reminder)}
      {isYearlyReminder(reminder) && <LuRepeat size={9} className="opacity-70" />}
    </span>
  );
}

const FIELD_CLASS =
  "bg-primary-black border border-primary-gold/20 rounded-lg px-2.5 py-1.5 text-xs text-primary-gold outline-none focus:border-primary-gold/40 transition-colors";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const pad = (n: number) => String(n).padStart(2, "0");

/** Dia e mês, sem ano (avisos que se repetem). Devolve "MM-DD", ou "" incompleto. */
function MonthDayInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [month, setMonth] = useState(value.slice(0, 2));
  const [day, setDay] = useState(value.slice(3));

  const update = (nextMonth: string, nextDay: string) => {
    // Dia 31 num mês de 30 dias vira o último dia do mês
    const limit = nextMonth ? DAYS_IN_MONTH[Number(nextMonth) - 1] : 31;
    const fixedDay = nextDay && Number(nextDay) > limit ? pad(limit) : nextDay;
    setMonth(nextMonth);
    setDay(fixedDay);
    onChange(nextMonth && fixedDay ? `${nextMonth}-${fixedDay}` : "");
  };

  return (
    <div className="flex gap-1">
      <select
        aria-label={`${label}: dia`}
        value={day}
        onChange={(e) => update(month, e.target.value)}
        className={`${FIELD_CLASS} cursor-pointer`}
      >
        <option value="">dia</option>
        {Array.from({ length: month ? DAYS_IN_MONTH[Number(month) - 1] : 31 }, (_, i) => (
          <option key={i} value={pad(i + 1)}>
            {i + 1}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label}: mês`}
        value={month}
        onChange={(e) => update(e.target.value, day)}
        className={`${FIELD_CLASS} cursor-pointer`}
      >
        <option value="">mês</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={pad(i + 1)}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Aviso de ativação do tema: período (de/até) e notificações ligadas ou
 * silenciadas. Cada mudança é salva no banco e chega a todos os admins.
 */
function ReminderEditor({
  theme,
  reminder,
  isLive,
  today,
}: {
  theme: SiteThemeId;
  reminder: SiteThemeReminder | undefined;
  isLive: boolean;
  today: string;
}) {
  const { addAlert } = useAlert();
  // Por padrão o aviso se repete todo ano (só dia e mês)
  const [yearly, setYearly] = useState(reminder ? isYearlyReminder(reminder) : true);
  const [start, setStart] = useState(reminder?.start ?? "");
  const [end, setEnd] = useState(reminder?.end ?? "");
  const [busy, setBusy] = useState(false);
  const info = SITE_THEMES[theme];

  const isDirty = start !== (reminder?.start ?? "") || end !== (reminder?.end ?? "");
  // Todo ano o período pode atravessar a virada (26/12 a 02/01); com ano, não
  const isValid = !!start && !!end && (yearly || start <= end);
  const wrapsYear = yearly && !!start && !!end && end < start;

  // Troca entre "todo ano" e um ano específico aproveitando as datas escolhidas
  const toggleYearly = () => {
    if (yearly) {
      const year = Number(today.slice(0, 4));
      setStart(start && `${year}-${start}`);
      setEnd(end && `${wrapsYear ? year + 1 : year}-${end}`);
    } else {
      setStart(start.slice(5));
      setEnd(end.slice(5));
    }
    setYearly(!yearly);
  };

  const save = async (next: SiteThemeReminder | null, message: string) => {
    setBusy(true);
    const ok = await GeneralConfigsRepository.setSiteThemeReminder(theme, next);
    setBusy(false);
    addAlert(ok ? message : "Não foi possível salvar o aviso. Confira a conexão e tente novamente.");
  };

  const status = reminder ? reminderStatus(reminder, today) : null;
  const daysUntil = reminder ? daysUntilReminder(reminder, today) : 0;
  const statusText = !reminder
    ? "Sem aviso configurado."
    : !reminder.enabled
      ? "Notificações silenciadas — o período continua salvo."
      : status === "active"
        ? isLive
          ? "No período, e o tema já está no ar."
          : "No período — avisando no menu lateral para ativar."
        : status === "upcoming"
          ? `Começa a avisar em ${daysUntil} dia${daysUntil !== 1 ? "s" : ""}.`
          : "Período encerrado.";

  return (
    <div className="flex flex-col gap-2.5 pt-3 border-t border-primary-gold/10">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
          <LuBell size={13} />
          Aviso para ativar
        </span>
        {reminder && (
          <button
            onClick={() =>
              save(
                { ...reminder, enabled: !reminder.enabled },
                reminder.enabled
                  ? `Notificações do tema ${info.name} silenciadas.`
                  : `Notificações do tema ${info.name} ligadas.`,
              )
            }
            disabled={busy}
            className="flex items-center gap-1.5 text-[11px] text-primary-gold/55 hover:text-primary-gold transition-colors cursor-pointer disabled:opacity-40"
          >
            {reminder.enabled ? "Notificações ligadas" : "Notificações desligadas"}
            {reminder.enabled ? (
              <LuToggleRight size={22} className="text-green-500" />
            ) : (
              <LuToggleLeft size={22} className="text-primary-gold/30" />
            )}
          </button>
        )}
      </div>
      <p className="text-[11px] text-primary-gold/40 leading-relaxed">
        Entre as datas abaixo, se {theme === "default" ? "o visual padrão" : `o tema ${info.name}`}{" "}
        não estiver no ar, aparece um aviso no menu lateral do admin e aqui
        na aba Temas. Época do tema: {info.season}.
      </p>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={toggleYearly}
          className="flex items-center gap-1.5 w-fit text-[11px] text-primary-gold/60 hover:text-primary-gold transition-colors cursor-pointer"
        >
          <LuRepeat size={13} />
          Repetir todo ano
          {yearly ? (
            <LuToggleRight size={22} className="text-green-500" />
          ) : (
            <LuToggleLeft size={22} className="text-primary-gold/30" />
          )}
        </button>
        <span className="text-[10px] text-primary-gold/35">
          {yearly
            ? "Só dia e mês: o aviso volta sozinho todo ano."
            : "Com ano: vale só para esse período (bom para datas que mudam, como Carnaval e Páscoa)."}
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-primary-gold/40">De</span>
          {yearly ? (
            <MonthDayInput value={start} onChange={setStart} label="Início" />
          ) : (
            <input
              type="date"
              aria-label="Início"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={FIELD_CLASS}
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-primary-gold/40">Até</span>
          {yearly ? (
            <MonthDayInput value={end} onChange={setEnd} label="Fim" />
          ) : (
            <input
              type="date"
              aria-label="Fim"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              className={FIELD_CLASS}
            />
          )}
        </div>
        <button
          onClick={() => {
            const next = { start, end, enabled: reminder?.enabled ?? true };
            save(next, `Aviso do tema ${info.name}: ${describeReminderPeriod(next)}.`);
          }}
          disabled={!isDirty || !isValid || busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold hover:bg-primary-gold/5 text-xs font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LuCheck size={13} /> {reminder ? "Salvar período" : "Criar aviso"}
        </button>
        {reminder && (
          <button
            onClick={() => save(null, `Aviso do tema ${info.name} removido.`)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-invalid-color hover:border-invalid-color/40 text-xs transition-all cursor-pointer disabled:opacity-40"
          >
            <LuTrash2 size={13} /> Remover
          </button>
        )}
      </div>
      {!yearly && start && end && start > end && (
        <span className="text-[11px] text-yellow-400/90">A data final precisa ser depois da inicial.</span>
      )}
      {wrapsYear && (
        <span className="text-[11px] text-primary-gold/45">
          O período atravessa a virada do ano (termina no ano seguinte).
        </span>
      )}
      <span
        className={`text-[11px] ${
          reminder && reminder.enabled && status === "active" && !isLive
            ? "text-[#ffb36b]"
            : "text-primary-gold/45"
        }`}
      >
        {statusText}
      </span>
    </div>
  );
}

// A "tela" tem o tamanho de um celular de verdade e é reduzida com scale —
// assim as decorações aparecem na mesma proporção que o cliente vê.
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 760;
const SCREEN_SCALE = 258 / SCREEN_WIDTH; // 270px de aparelho menos as bordas

/** Celular com a página de links do site, já com o tema aplicado. */
function PhonePreview({ theme, minimal }: { theme: SiteThemeId; minimal: boolean }) {
  return (
    <div
      className="relative shrink-0 rounded-[30px] border-[6px] border-[#232020] bg-primary-black overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      style={{
        width: SCREEN_WIDTH * SCREEN_SCALE + 12,
        height: SCREEN_HEIGHT * SCREEN_SCALE + 12,
      }}
    >
      <div
        data-site-theme={theme}
        className="absolute top-0 left-0 isolate origin-top-left"
        style={{
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          transform: `scale(${SCREEN_SCALE})`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0a0a0a, #1a1a1a, #121111)" }}
        />
        {theme !== "default" && (
          <ThemeScene
            key={`${theme}:${minimal}`}
            theme={theme}
            variant="preview"
            minimal={minimal}
          />
        )}

        <div className="relative z-10 flex flex-col items-center justify-center gap-8 h-full px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative isolate">
              <div
                className="w-24 h-24 rounded-full p-[2px]"
                style={{
                  background:
                    "linear-gradient(135deg, #e6c56b 0%, #d4af37 50%, #8B6914 100%)",
                }}
              >
                <div className="w-full h-full rounded-full bg-primary-black overflow-hidden flex items-center justify-center">
                  <img src="/images/logo-gold-2.png" alt="" />
                </div>
              </div>
              <ThemeLogoAccessory key={theme} theme={theme} />
            </div>

            <div className="flex flex-col items-center">
              <span
                className="st-preview-title text-2xl font-semibold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-pirata-one)" }}
              >
                Carcassonne
              </span>
              <span className="text-xs tracking-[0.4em] uppercase text-primary-gold/50 mt-0.5">
                Pub &amp; Luderia
              </span>
            </div>
            <span className="text-primary-white/40 text-xs tracking-wide">
              Coma, jogue, repita
            </span>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-sm">
            {PREVIEW_LINKS.map(({ name, description, Icon }) => (
              <div
                key={name}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-xl border border-primary-gold/20 bg-secondary-black/60 backdrop-blur-sm"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-lg border border-primary-gold/20 bg-primary-black/50 text-primary-gold/60 shrink-0">
                  <Icon size={18} />
                </span>
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium tracking-wide text-primary-white">
                    {name}
                  </span>
                  <span className="text-xs text-primary-white/35 truncate">
                    {description}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <span className="text-primary-white/20 text-[10px] tracking-widest uppercase">
            © Carcassonne Pub
          </span>
        </div>
      </div>

      {/* Câmera do aparelho */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-[#232020] z-10" />
    </div>
  );
}
