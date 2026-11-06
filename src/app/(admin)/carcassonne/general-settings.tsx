"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LuImagePlus, LuInfo } from "react-icons/lu";
import Checkbox from "@/components/checkbox";
import { NoticeBarView } from "@/components/siteNoticeBar";
import { useAlert } from "@/contexts/alertProvider";
import { usePubInfo } from "@/contexts/siteConfigProvider";
import { uploadImageToFirebase } from "@/services/repositories/FirebaseImageUtils";
import { todaySP } from "@/rental/dates";
import type {
  EffectsIntensity,
  GeneralConfigsType,
  OpeningHours,
  PubInfo,
  SiteNotice,
  SiteNoticeTone,
} from "@/types";
import {
  AREAS,
  DEFAULT_AREA_MESSAGE,
  DEFAULT_NOTICE,
  DEFAULT_PUB_INFO,
  DEFAULT_SHARE_META,
  SESSION_HOUR_OPTIONS,
  WEEKDAYS,
  formatPhoneBR,
  mergeEffectsPrefs,
  mergePubInfo,
  mergeShareMeta,
  noticeActive,
  openStatus,
  parseEmails,
  sessionHours,
} from "@/utils/generalSettings";
import { SettingsPanel, useGeneralConfigSection } from "./settings-ui";

// Painéis de Configurações → Geral. Cada um carrega e salva só os próprios campos.

const fieldClass =
  "w-full rounded-lg border border-primary-gold/20 bg-primary-black/50 px-3 py-2 text-sm text-primary-gold placeholder:text-primary-gold/30 outline-none focus:border-primary-gold/50 transition-colors";

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-gold/55">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-primary-gold/40">{hint}</span>}
    </label>
  );
}

function Pills<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 px-3 rounded-full border text-xs transition-colors cursor-pointer ${
            value === o.value
              ? "border-primary-gold/60 bg-primary-gold/15 text-primary-gold font-semibold"
              : "border-primary-gold/15 text-primary-gold/60 hover:border-primary-gold/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-primary-gold/45 leading-relaxed -mt-3">
      <LuInfo size={12} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

const Loading = () => <p className="text-xs text-primary-gold/50 px-1">Carregando...</p>;

// ---------- Informações do pub ----------

const PUB_FIELDS = ["pubInfo", "showOpenNow"] as const satisfies readonly (keyof GeneralConfigsType)[];

function PubInfoSettings() {
  const s = useGeneralConfigSection(PUB_FIELDS);
  // O que está digitado (campo vazio continua vazio); ao usar, vazio cai no padrão.
  const raw: PubInfo = { ...DEFAULT_PUB_INFO, ...s.configs.pubInfo, hours: mergePubInfo(s.configs.pubInfo).hours };
  const setInfo = (patch: Partial<PubInfo>) => s.set({ pubInfo: { ...raw, ...patch } });
  const setDay = (day: number, value: OpeningHours | null) =>
    setInfo({ hours: raw.hours.map((h, i) => (i === day ? value : h)) });
  const preview = openStatus(raw.hours, Date.now());

  if (!s.loaded) return <Loading />;

  const text = (key: Exclude<keyof PubInfo, "hours">, label: string, placeholder: string, hint?: ReactNode) => (
    <Field label={label} hint={hint}>
      <input
        className={fieldClass}
        value={raw[key]}
        placeholder={placeholder}
        onChange={(e) => setInfo({ [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <SettingsPanel title="Informações do pub" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>
        Usadas no site (página de reserva, regulamento, linktree), no PDF do cardápio e nos e-mails do aluguel. Campo
        vazio volta ao valor padrão.
      </Note>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">{text("address", "Endereço", DEFAULT_PUB_INFO.address)}</div>
        <div className="sm:col-span-2">{text("mapsUrl", "Link do mapa", "https://maps.google.com/...")}</div>
        {text(
          "whatsapp",
          "WhatsApp (com DDD)",
          "5561999999999",
          raw.whatsapp.replace(/\D/g, "").length >= 10 ? `Aparece como ${formatPhoneBR(raw.whatsapp)}` : "Só números, com 55 e DDD",
        )}
        {text("email", "E-mail de contato", "contato@...")}
        {text("instagram", "Instagram", "carcassonnepub", "Sem o @")}
        {text("facebook", "Facebook", "CARCASSONNEPUB", "O final do link da página")}
        {text("website", "Site", "carcassonnepub.com.br")}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-primary-gold/10">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-gold/55">
          Horário de funcionamento
        </span>
        <p className="text-[11px] text-primary-gold/40 -mt-1">
          Se fechar depois da meia-noite, coloque o horário da madrugada (ex.: 18:00 às 02:00).
        </p>
        <div className="flex flex-col gap-1.5">
          {WEEKDAYS.map((name, day) => {
            const h = raw.hours[day];
            return (
              <div key={name} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-primary-black/30 px-3 py-2">
                <span className="w-20 text-sm capitalize text-primary-gold/80">{name}</span>
                <Checkbox
                  checked={!!h}
                  setChecked={(e) => setDay(day, e.target.checked ? { open: "18:00", close: "00:00" } : null)}
                  label={h ? "Aberto" : "Fechado"}
                  variant
                />
                {h && (
                  <span className="flex items-center gap-2 text-xs text-primary-gold/60">
                    <input
                      type="time"
                      value={h.open}
                      onChange={(e) => e.target.value && setDay(day, { ...h, open: e.target.value })}
                      className={`${fieldClass} !w-auto !py-1`}
                    />
                    às
                    <input
                      type="time"
                      value={h.close}
                      onChange={(e) => e.target.value && setDay(day, { ...h, close: e.target.value })}
                      className={`${fieldClass} !w-auto !py-1`}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <Checkbox
          checked={!!s.configs.showOpenNow}
          setChecked={(e) => s.set({ showOpenNow: e.target.checked })}
          label='Mostrar o selo "Aberto agora / Fechado" no site'
          variant
        />
        <p className="text-[11px] text-primary-gold/40">
          {preview.state === "unknown"
            ? "Preencha pelo menos um dia para o selo aparecer."
            : `Agora o selo diria: "${preview.text}". Aparece no linktree e na página de reserva.`}
        </p>
      </div>
    </SettingsPanel>
  );
}

// ---------- Aviso no site ----------

const NOTICE_FIELDS = ["siteNotice"] as const satisfies readonly (keyof GeneralConfigsType)[];

const TONES: { value: SiteNoticeTone; label: string }[] = [
  { value: "info", label: "Informação" },
  { value: "warning", label: "Atenção" },
  { value: "celebration", label: "Festa" },
];

function noticeStatus(notice: SiteNotice, today: string): string {
  if (!notice.enabled) return "Desligado";
  if (!notice.text.trim()) return "Sem texto: não aparece";
  if (noticeActive(notice, today)) return "No ar agora";
  if (notice.from && today < notice.from) return `Agendado: aparece a partir de ${notice.from.split("-").reverse().join("/")}`;
  return "Período encerrado: não aparece mais";
}

function SiteNoticeSettings() {
  const s = useGeneralConfigSection(NOTICE_FIELDS);
  const notice: SiteNotice = { ...DEFAULT_NOTICE, ...s.configs.siteNotice };
  const setNotice = (patch: Partial<SiteNotice>) => s.set({ siteNotice: { ...notice, ...patch } });

  if (!s.loaded) return <Loading />;

  return (
    <SettingsPanel title="Aviso no site" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>Uma faixa no topo de todas as páginas do site. O cliente pode fechar; um aviso novo aparece de novo.</Note>
      <Checkbox
        checked={notice.enabled}
        setChecked={(e) => setNotice({ enabled: e.target.checked })}
        label="Mostrar o aviso"
        variant
      />
      <Field label="Texto">
        <textarea
          rows={2}
          maxLength={240}
          className={fieldClass}
          value={notice.text}
          placeholder="Ex.: Hoje fechado para evento privado. Voltamos amanhã!"
          onChange={(e) => setNotice({ text: e.target.value })}
        />
      </Field>
      <Field label="Estilo">
        <Pills value={notice.tone} options={TONES} onChange={(tone) => setNotice({ tone })} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Aparece de" hint="Vazio = desde já">
          <input type="date" className={fieldClass} value={notice.from ?? ""} onChange={(e) => setNotice({ from: e.target.value })} />
        </Field>
        <Field label="Até" hint="Vazio = até desligar">
          <input type="date" className={fieldClass} value={notice.to ?? ""} onChange={(e) => setNotice({ to: e.target.value })} />
        </Field>
        <Field label="Link (opcional)">
          <input
            className={fieldClass}
            value={notice.linkUrl ?? ""}
            placeholder="https://... ou /reserve"
            onChange={(e) => setNotice({ linkUrl: e.target.value.trim() })}
          />
        </Field>
        <Field label="Texto do link">
          <input
            className={fieldClass}
            value={notice.linkLabel ?? ""}
            placeholder="Saiba mais"
            onChange={(e) => setNotice({ linkLabel: e.target.value })}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-primary-gold/50">{noticeStatus(notice, todaySP())}</span>
        {notice.text.trim() && (
          <div className="overflow-hidden rounded-lg border border-primary-gold/10">
            <NoticeBarView notice={notice} />
          </div>
        )}
      </div>
    </SettingsPanel>
  );
}

// ---------- Áreas do site ----------

const AREA_FIELDS = [
  "disabledAreas",
  "disabledAreaMessage",
  "isMusicRecommendationEnable",
] as const satisfies readonly (keyof GeneralConfigsType)[];

function AreasSettings() {
  const s = useGeneralConfigSection(AREA_FIELDS);
  const disabled = s.configs.disabledAreas ?? {};

  if (!s.loaded) return <Loading />;

  return (
    <SettingsPanel title="Áreas do site" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>
        Área desligada mostra a mensagem abaixo no lugar da página. O aluguel tem a própria chave, em{" "}
        <Link href="/carcassonne?tab=configuracoes&section=aluguel" className="underline underline-offset-2">
          Configurações → Aluguel
        </Link>
        .
      </Note>
      <div className="flex flex-col gap-1.5">
        {AREAS.map((area) => (
          <div key={area.key} className="flex items-center justify-between gap-3 rounded-lg bg-primary-black/30 px-3 py-2">
            <span className="text-sm text-primary-gold/80">{area.label}</span>
            <Checkbox
              checked={!disabled[area.key]}
              setChecked={(e) => s.set({ disabledAreas: { ...disabled, [area.key]: !e.target.checked } })}
              label={disabled[area.key] ? "Desligada" : "Ligada"}
              variant
            />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-primary-black/30 px-3 py-2">
          <span className="text-sm text-primary-gold/80">
            Recomendação de música <span className="text-[11px] text-primary-gold/40">(página e botão flutuante)</span>
          </span>
          <Checkbox
            checked={!!s.configs.isMusicRecommendationEnable}
            setChecked={(e) => s.set({ isMusicRecommendationEnable: e.target.checked })}
            label={s.configs.isMusicRecommendationEnable ? "Ligada" : "Desligada"}
            variant
          />
        </div>
      </div>
      <Field label="Mensagem para áreas desligadas">
        <textarea
          rows={2}
          maxLength={300}
          className={fieldClass}
          value={s.configs.disabledAreaMessage ?? ""}
          placeholder={DEFAULT_AREA_MESSAGE}
          onChange={(e) => s.set({ disabledAreaMessage: e.target.value })}
        />
      </Field>
    </SettingsPanel>
  );
}

// ---------- Prévia ao compartilhar ----------

const SHARE_FIELDS = ["shareMeta"] as const satisfies readonly (keyof GeneralConfigsType)[];

function ShareSettings() {
  const { addAlert } = useAlert();
  const s = useGeneralConfigSection(SHARE_FIELDS);
  const [uploading, setUploading] = useState(false);
  const meta = { ...DEFAULT_SHARE_META, ...s.configs.shareMeta };
  const shown = mergeShareMeta(s.configs.shareMeta);
  const setMeta = (patch: Partial<typeof meta>) => s.set({ shareMeta: { ...meta, ...patch } });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImageToFirebase(file, "share");
      setMeta({ image: url });
    } catch (error) {
      console.error(error);
      addAlert("Não foi possível enviar a imagem. Tente outra.");
    } finally {
      setUploading(false);
    }
  };

  if (!s.loaded) return <Loading />;

  return (
    <SettingsPanel title="Prévia ao compartilhar" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>
        O que aparece quando alguém manda o link do site no WhatsApp, Instagram ou Facebook. Pode levar alguns minutos
        para atualizar, e o WhatsApp guarda a prévia antiga por um tempo.
      </Note>
      <Field label="Título">
        <input className={fieldClass} maxLength={70} value={meta.title} onChange={(e) => setMeta({ title: e.target.value })} />
      </Field>
      <Field label="Descrição" hint={`${meta.description.length}/200`}>
        <textarea
          rows={3}
          maxLength={200}
          className={fieldClass}
          value={meta.description}
          onChange={(e) => setMeta({ description: e.target.value })}
        />
      </Field>
      <Field label="Imagem" hint="Ideal: 1200 × 630, horizontal">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-primary-gold/30 text-xs text-primary-gold/80 hover:border-primary-gold/60 cursor-pointer">
            <LuImagePlus size={14} /> {uploading ? "Enviando..." : "Escolher imagem"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          {meta.image && (
            <button
              type="button"
              onClick={() => setMeta({ image: "" })}
              className="text-xs text-primary-gold/50 underline underline-offset-2 hover:text-primary-gold cursor-pointer"
            >
              Remover imagem
            </button>
          )}
        </div>
      </Field>

      {/* Como fica (aproximação do cartão do WhatsApp) */}
      <div className="flex flex-col overflow-hidden rounded-lg border border-primary-gold/15 bg-[#1f2c33] max-w-sm">
        {shown.image ? (
          <img src={shown.image} alt="" className="aspect-[1200/630] w-full object-cover" />
        ) : (
          <div className="flex aspect-[1200/630] items-center justify-center text-[11px] text-white/40">Sem imagem</div>
        )}
        <div className="flex flex-col gap-0.5 px-3 py-2">
          <span className="text-sm font-semibold text-white/90 line-clamp-1">{shown.title}</span>
          <span className="text-xs text-white/60 line-clamp-2">{shown.description}</span>
          <span className="text-[10px] text-white/40">carcassonnepub.com.br</span>
        </div>
      </div>
    </SettingsPanel>
  );
}

// ---------- Sessão do admin ----------

const SESSION_FIELDS = ["adminSessionHours"] as const satisfies readonly (keyof GeneralConfigsType)[];

function SessionSettings() {
  const s = useGeneralConfigSection(SESSION_FIELDS);
  if (!s.loaded) return <Loading />;
  return (
    <SettingsPanel title="Sessão do admin" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>Depois desse tempo sem usar o admin, é preciso entrar de novo. Vale para todos os administradores.</Note>
      <Pills
        value={sessionHours(s.configs.adminSessionHours)}
        options={SESSION_HOUR_OPTIONS.map((o) => ({ value: o.hours, label: o.label }))}
        onChange={(hours) => s.set({ adminSessionHours: hours })}
      />
    </SettingsPanel>
  );
}

// ---------- Efeitos de mouse ----------

const EFFECTS_FIELDS = [
  "clickEffect",
  "followCursor",
  "canvasCursor",
  "effectsPrefs",
] as const satisfies readonly (keyof GeneralConfigsType)[];

const INTENSITIES: { value: EffectsIntensity; label: string }[] = [
  { value: "soft", label: "Suave" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Forte" },
];

function EffectsSettings() {
  const s = useGeneralConfigSection(EFFECTS_FIELDS);
  const prefs = mergeEffectsPrefs(s.configs.effectsPrefs);
  const setPrefs = (patch: Partial<typeof prefs>) => s.set({ effectsPrefs: { ...prefs, ...patch } });

  if (!s.loaded) return <Loading />;

  return (
    <SettingsPanel title="Efeitos de mouse" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>Efeitos visuais do mouse nas telas do admin.</Note>
      <div className="flex flex-col gap-2">
        <Checkbox checked={!!s.configs.clickEffect} setChecked={(e) => s.set({ clickEffect: e.target.checked })} label="Ativar efeito de clique" variant />
        <Checkbox checked={!!s.configs.followCursor} setChecked={(e) => s.set({ followCursor: e.target.checked })} label="Ativar destaque de cursor" variant />
        <Checkbox checked={!!s.configs.canvasCursor} setChecked={(e) => s.set({ canvasCursor: e.target.checked })} label="Ativar efeito de cursor" variant />
      </div>
      <Field label="Intensidade do clique">
        <Pills value={prefs.intensity} options={INTENSITIES} onChange={(intensity) => setPrefs({ intensity })} />
      </Field>
      <div className="flex flex-col gap-2 pt-2 border-t border-primary-gold/10">
        <Checkbox
          checked={prefs.disableOnTouch}
          setChecked={(e) => setPrefs({ disableOnTouch: e.target.checked })}
          label="Desligar no celular e no tablet"
          variant
        />
        <Checkbox
          checked={prefs.respectReducedMotion}
          setChecked={(e) => setPrefs({ respectReducedMotion: e.target.checked })}
          label='Desligar para quem pediu "reduzir movimento" no sistema'
          variant
        />
      </div>
    </SettingsPanel>
  );
}

// ---------- E-mails da equipe ----------

const STAFF_FIELDS = ["staffReserveEmails"] as const satisfies readonly (keyof GeneralConfigsType)[];

function StaffEmailsSettings() {
  const s = useGeneralConfigSection(STAFF_FIELDS);
  const [text, setText] = useState<string | null>(null);
  const pubEmail = usePubInfo().email;

  // Texto inicial = lista salva (uma por linha), assim que carregar.
  useEffect(() => {
    if (s.loaded && text === null) setText((s.configs.staffReserveEmails ?? []).join("\n"));
  }, [s.loaded, s.configs.staffReserveEmails, text]);

  if (!s.loaded || text === null) return <Loading />;
  const { valid, invalid } = parseEmails(text);

  return (
    <SettingsPanel title="E-mails da equipe" dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
      <Note>
        Quem recebe o aviso de nova reserva. O aviso de novo aluguel vai para o e-mail definido em{" "}
        <Link href="/carcassonne?tab=configuracoes&section=aluguel" className="underline underline-offset-2">
          Configurações → Aluguel
        </Link>
        .
      </Note>
      <Field
        label="Aviso de nova reserva"
        hint={valid.length ? `${valid.length === 1 ? "1 e-mail" : `${valid.length} e-mails`} vão receber.` : `Vazio: vai para o e-mail de contato do pub (${pubEmail}).`}
      >
        <textarea
          rows={3}
          className={fieldClass}
          value={text}
          placeholder={"gerente@exemplo.com\nequipe@exemplo.com"}
          onChange={(e) => {
            setText(e.target.value);
            s.set({ staffReserveEmails: parseEmails(e.target.value).valid });
          }}
        />
      </Field>
      {invalid.length > 0 && (
        <p className="text-[11px] text-orange-300 -mt-3">Ignorados (não parecem e-mails): {invalid.join(", ")}</p>
      )}
    </SettingsPanel>
  );
}

/** Configurações → Geral. */
export default function GeneralSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <div className="flex flex-col gap-4">
        <PubInfoSettings />
        <ShareSettings />
      </div>
      <div className="flex flex-col gap-4">
        <SiteNoticeSettings />
        <AreasSettings />
        <StaffEmailsSettings />
        <SessionSettings />
        <EffectsSettings />
      </div>
    </div>
  );
}
