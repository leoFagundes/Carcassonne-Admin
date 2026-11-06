"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LuImagePlus } from "react-icons/lu";
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

const INFO = {
  pub: (
    <>
      <p>
        <strong>O que é:</strong> os dados de contato e o horário do Carcassonne num lugar só. Mudou o telefone? Muda
        aqui e vale em todo lugar.
      </p>
      <p>
        <strong>Onde aparece:</strong> o endereço na página de reserva, no regulamento, no PDF do cardápio e no e-mail
        de confirmação do aluguel; WhatsApp, Instagram, Facebook e mapa nos contatos do regulamento e no botão de
        WhatsApp das áreas desligadas; Instagram e site no rodapé do PDF do cardápio.
      </p>
      <p>
        <strong>Horário de funcionamento:</strong> serve só para o selo &quot;Aberto agora / Fechado&quot; (linktree e
        página de reserva). Não muda os horários que o cliente pode reservar — esses ficam em{" "}
        <Link href="/carcassonne?tab=configuracoes&section=reservas" className="underline underline-offset-2">Configurações → Reservas</Link>.
      </p>
      <p>
        Campo vazio volta ao valor padrão. O e-mail de confirmação de <em>reserva</em> tem o endereço próprio, editável
        em Configurações → E-mails.
      </p>
    </>
  ),
  notice: (
    <>
      <p>
        <strong>O que é:</strong> uma faixa no topo de todas as páginas do site do cliente — cardápio, ludoteca,
        reservas, linktree, eventos e aluguel. Não aparece no admin.
      </p>
      <p>
        <strong>Quando aparece:</strong> com &quot;Mostrar o aviso&quot; marcado, com texto e dentro do período. Sem
        datas, fica no ar até você desmarcar.
      </p>
      <p>
        <strong>Para o cliente:</strong> ele pode fechar a faixa no X; ela volta numa nova visita ou quando o texto
        mudar.
      </p>
      <p>Exemplos: &quot;Hoje fechado para evento privado&quot;, &quot;Feriado: abrimos às 18h&quot;, &quot;Noite de Halloween no sábado — reserve já!&quot;.</p>
    </>
  ),
  areas: (
    <>
      <p>
        <strong>O que é:</strong> tira uma parte do site do ar sem apagar nada. Ao religar, tudo volta como estava.
      </p>
      <p>
        <strong>O que o cliente vê:</strong> no lugar da página, um cartão &quot;[Área] indisponível&quot; com a
        mensagem abaixo e botões para o linktree e o WhatsApp.
      </p>
      <p>
        <strong>Páginas:</strong> Reservas (fazer e cancelar reserva), Ludoteca (coleção e jogos à venda), Cardápio e
        Eventos. &quot;Recomendação de música&quot; desliga a página e o botão flutuante de música.
      </p>
      <p>O aluguel tem a própria chave, em <Link href="/carcassonne?tab=configuracoes&section=aluguel" className="underline underline-offset-2">Configurações → Aluguel</Link>.</p>
    </>
  ),
  share: (
    <>
      <p>
        <strong>O que é:</strong> o cartão que aparece quando alguém manda o link do site no WhatsApp, Instagram,
        Facebook ou Telegram — imagem, título e descrição.
      </p>
      <p>
        <strong>Onde aparece:</strong> só nessas prévias e no nome da aba do navegador. Não muda nada dentro do site.
      </p>
      <p>
        A mudança leva até 5 minutos. O WhatsApp guarda a prévia de um link por um tempo; para testar, mande o link com
        algo no final, ex.: carcassonnepub.com.br/?v=2.
      </p>
    </>
  ),
  session: (
    <>
      <p>
        <strong>O que é:</strong> por quanto tempo o login do admin continua valendo sem uso. Cada clique ou tecla no
        admin renova o prazo; passado o tempo parado, é preciso entrar de novo.
      </p>
      <p>
        Vale para todos os administradores, em todos os aparelhos. Prazo curto é mais seguro em computador
        compartilhado; prazo longo evita ficar entrando toda hora.
      </p>
    </>
  ),
  effects: (
    <>
      <p>
        <strong>O que é:</strong> enfeites do mouse nas telas do admin — faíscas ao clicar, um brilho que segue o cursor
        e um rastro. O cliente não vê.
      </p>
      <p>
        <strong>Celular e &quot;reduzir movimento&quot;:</strong> por padrão os efeitos ficam desligados em telas de
        toque e para quem ativou &quot;reduzir movimento&quot; nas configurações de acessibilidade do aparelho.
      </p>
    </>
  ),
  staff: (
    <>
      <p>
        <strong>O que é:</strong> quem da equipe recebe o e-mail &quot;Nova reserva recebida&quot; a cada reserva feita
        no site.
      </p>
      <p>
        Um e-mail por linha (ou separados por vírgula). Vazio = vai para o e-mail de contato do pub. Quem decide o
        destino é o servidor, então ninguém de fora consegue mudar.
      </p>
      <p>O aviso de novo aluguel usa o e-mail definido em <Link href="/carcassonne?tab=configuracoes&section=aluguel" className="underline underline-offset-2">Configurações → Aluguel</Link>.</p>
    </>
  ),
};

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
    <SettingsPanel title="Informações do pub" info={INFO.pub} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
        <p className="text-[11px] text-primary-gold/45 -mt-1 leading-relaxed">
          Usado só pelo selo <strong className="text-primary-gold/70">&quot;Aberto agora / Fechado&quot;</strong>, que
          aparece no linktree e na página de reserva (ligue embaixo). Não muda os horários em que o cliente pode reservar.
          Se fechar depois da meia-noite, use o horário da madrugada (ex.: 18:00 às 02:00).
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
        {preview.state === "unknown" ? (
          <p className="text-[11px] text-primary-gold/40">Marque pelo menos um dia como aberto para o selo aparecer.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-primary-gold/45">
            <span>Prévia do selo agora:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold bg-primary-black/80 ${
                preview.state === "open" ? "border-emerald-400/50 text-emerald-300" : "border-primary-gold/30 text-primary-gold/70"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${preview.state === "open" ? "bg-emerald-400" : "bg-primary-gold/50"}`} />
              {preview.text}
            </span>
            {!s.configs.showOpenNow && <span>(desligado: o cliente não vê)</span>}
          </div>
        )}
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
    <SettingsPanel title="Aviso no site" info={INFO.notice} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-gold/55">
          Prévia — como o cliente vê
        </span>
        <div
          className={`overflow-hidden rounded-lg border border-primary-gold/15 bg-primary-black transition-opacity ${
            noticeActive(notice, todaySP()) ? "" : "opacity-60"
          }`}
        >
          <div className="flex items-center gap-1.5 border-b border-primary-gold/10 bg-secondary-black/70 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-primary-gold/25" />
            <span className="h-2 w-2 rounded-full bg-primary-gold/25" />
            <span className="h-2 w-2 rounded-full bg-primary-gold/25" />
            <span className="ml-2 text-[10px] text-primary-gold/35">carcassonnepub.com.br</span>
          </div>
          <NoticeBarView
            notice={{ ...notice, text: notice.text.trim() || "Escreva o texto do aviso acima" }}
            onClose={() => {}}
          />
          <div aria-hidden="true" className="flex flex-col items-center gap-2 px-4 py-5">
            <span className="h-3 w-28 rounded bg-primary-gold/15" />
            <span className="h-2 w-44 rounded bg-primary-gold/10" />
            <span className="h-2 w-36 rounded bg-primary-gold/10" />
          </div>
        </div>
        <span
          className={`text-[11px] ${noticeActive(notice, todaySP()) ? "text-emerald-300" : "text-primary-gold/50"}`}
        >
          {noticeStatus(notice, todaySP())}
          {!noticeActive(notice, todaySP()) && notice.text.trim() && " — o cliente não vê agora"}
        </span>
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
    <SettingsPanel title="Áreas do site" info={INFO.areas} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
    <SettingsPanel title="Prévia ao compartilhar" info={INFO.share} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
    <SettingsPanel title="Sessão do admin" info={INFO.session} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
    <SettingsPanel title="Efeitos de mouse" info={INFO.effects} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
    <SettingsPanel title="E-mails da equipe" info={INFO.staff} dirty={s.dirty} saving={s.saving} saved={s.saved} onSave={s.save}>
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
