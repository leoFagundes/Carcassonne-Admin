"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LuBraces,
  LuEye,
  LuImageOff,
  LuInbox,
  LuMail,
  LuMonitor,
  LuPencil,
  LuRefreshCw,
  LuRotateCcw,
  LuSend,
  LuSmartphone,
  LuToggleLeft,
  LuToggleRight,
  LuTriangleAlert,
  LuWifiOff,
  LuX,
} from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import Tooltip from "./Tooltip";
import ReservationEmailRepository from "@/services/repositories/ReservationEmailRepository";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
  uploadImageToFirebase,
} from "@/services/repositories/FirebaseImageUtils";
import { ReservationEmailConfigType } from "@/types";
import {
  DEFAULT_RESERVATION_EMAIL,
  RESERVATION_EMAIL_VARIABLES,
  buildSampleReservationData,
  fillEmailTokens,
} from "@/utils/reservationEmail";

type TextKey = {
  [K in keyof ReservationEmailConfigType]: ReservationEmailConfigType[K] extends string
    ? K
    : never;
}[keyof ReservationEmailConfigType];
type ImageKey = "bannerUrl" | "footerImageUrl";
type FieldElement = HTMLInputElement | HTMLTextAreaElement;

// Imagens enviadas pelo editor ficam nessa pasta — só elas podem ser apagadas
// do Storage por aqui (as antigas, enviadas à mão, nunca são tocadas).
const EMAIL_IMAGE_FOLDER = "email";
const SUBJECT_SOFT_LIMIT = 70;
const BOLD_HINT = "Use **texto** para negrito. Enter quebra a linha.";

const labelClass =
  "text-[11px] text-primary-gold/50 uppercase tracking-wider font-semibold";
const inputClass =
  "w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2.5 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all disabled:opacity-40";

function isEditorUpload(url: string) {
  return (
    !!url && getPathFromFirebaseUrl(url).startsWith(`${EMAIL_IMAGE_FOLDER}/`)
  );
}

async function deleteStorageImage(url: string) {
  const path = getPathFromFirebaseUrl(url);
  if (path) await deleteImageFromFirebase(path);
}

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Peças do formulário (fora do componente principal pra não perder o foco
// dos campos a cada tecla) ──────────────────────────────────────────────────

// Spinner pequeno para botões e cabeçalhos (o Loader padrão é grande demais)
function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-primary-gold/25 border-t-primary-gold rounded-full animate-spin" />
  );
}

function EditorSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-primary-gold/90">{title}</h3>
          {description && (
            <p className="text-[11px] text-primary-gold/40 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  onFocus,
  multiline = false,
  rows = 3,
  counter,
  disabled = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: (e: React.FocusEvent<FieldElement>) => void;
  multiline?: boolean;
  rows?: number;
  counter?: number;
  disabled?: boolean;
}) {
  const overLimit = counter !== undefined && value.length > counter;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className={labelClass}>{label}</label>
        {counter !== undefined && (
          <span
            className={`text-[10px] font-mono ${overLimit ? "text-yellow-500" : "text-primary-gold/30"}`}
          >
            {value.length}/{counter}
          </span>
        )}
      </div>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className={`${inputClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className={inputClass}
        />
      )}
      {hint && (
        <span className="text-[10px] text-primary-gold/35 leading-relaxed">
          {hint}
        </span>
      )}
    </div>
  );
}

function VisibilityToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex items-center gap-1.5 text-[11px] text-primary-gold/50 hover:text-primary-gold transition-colors cursor-pointer shrink-0"
    >
      {checked ? "Visível" : "Oculto"}
      {checked ? (
        <LuToggleRight size={24} className="text-green-500" />
      ) : (
        <LuToggleLeft size={24} className="text-primary-gold/30" />
      )}
    </button>
  );
}

function ImageField({
  label,
  url,
  uploading,
  disabled,
  onPick,
  onRemove,
}: {
  label: string;
  url: string;
  uploading: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-primary-gold/15 bg-primary-black/30">
        <div className="w-28 h-16 rounded-md overflow-hidden border border-primary-gold/10 bg-primary-black/50 flex items-center justify-center shrink-0">
          {uploading ? (
            <Loader />
          ) : url ? (
            <img src={url} alt={label} className="w-full h-full object-cover" />
          ) : (
            <LuImageOff size={18} className="text-primary-gold/25" />
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <span className="text-[11px] text-primary-gold/40">
            {uploading
              ? "Enviando imagem..."
              : url
                ? "Aparece no e-mail"
                : "Sem imagem — essa parte não aparece"}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="px-2.5 py-1.5 rounded-md border border-primary-gold/25 text-primary-gold/70 hover:text-primary-gold hover:border-primary-gold/50 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {url ? "Trocar imagem" : "Escolher imagem"}
            </button>
            {url && (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="px-2.5 py-1.5 rounded-md border border-primary-gold/15 text-primary-gold/40 hover:text-invalid-color hover:border-invalid-color/40 text-[11px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Remover
              </button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
      </div>
    </div>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

interface ReservationEmailFormsProps {
  closeForms: VoidFunction;
}

export default function ReservationEmailForms({
  closeForms,
}: ReservationEmailFormsProps) {
  const { addAlert } = useAlert();

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [config, setConfig] = useState<ReservationEmailConfigType>(
    DEFAULT_RESERVATION_EMAIL,
  );
  const [savedConfig, setSavedConfig] = useState<ReservationEmailConfigType>(
    DEFAULT_RESERVATION_EMAIL,
  );
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<ImageKey | null>(null);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [iframeHeight, setIframeHeight] = useState(640);

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "discard" | "reset" | null
  >(null);

  const lastFocusedRef = useRef<{ key: TextKey; element: FieldElement } | null>(
    null,
  );
  // Imagens enviadas nesta sessão do editor e ainda não salvas — se o admin
  // descartar, elas são apagadas do Storage pra não virar lixo.
  const pendingUploadsRef = useRef<Set<string>>(new Set());
  const previewRequestRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sampleData = useMemo(() => buildSampleReservationData(), []);
  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );
  const inboxSubject = fillEmailTokens(config.subject, sampleData);
  const inboxPreview = fillEmailTokens(config.previewText, sampleData);

  // ── Carregamento ──

  const loadConfig = useCallback(async () => {
    setLoadState("loading");
    try {
      const { config: loaded, updatedAt: loadedAt } =
        await ReservationEmailRepository.get();
      setConfig(loaded);
      setSavedConfig(loaded);
      setUpdatedAt(loadedAt);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ── Pré-visualização (renderizada no servidor, igual ao envio real) ──

  useEffect(() => {
    if (loadState !== "ready") return;
    const requestId = ++previewRequestRef.current;
    setPreviewLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/email-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, data: sampleData }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { html } = await res.json();
        if (requestId !== previewRequestRef.current) return;
        setPreviewHtml(html);
        setPreviewError(false);
      } catch (error) {
        console.error(error);
        if (requestId !== previewRequestRef.current) return;
        setPreviewError(true);
      } finally {
        if (requestId === previewRequestRef.current) setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [config, loadState, sampleData]);

  // O iframe cresce até a altura do e-mail — quem rola é o painel, não ele.
  // offsetHeight do <html> é a altura do conteúdo (scrollHeight nunca
  // diminuiria, porque considera a altura atual do iframe).
  const measureIframe = useCallback(() => {
    const iframe = iframeRef.current;
    const html = iframe?.contentDocument?.documentElement;
    // Aba escondida no celular (display: none) não tem largura pra medir
    if (!iframe || !html || iframe.clientWidth === 0) return;
    setIframeHeight(Math.max(html.offsetHeight, 200));
  }, []);

  // Mudou a largura (computador/celular, janela, aba do celular): o texto
  // quebra diferente e a altura muda junto.
  const hasPreview = previewHtml !== "";
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!hasPreview || !iframe) return;
    const observer = new ResizeObserver(() => measureIframe());
    observer.observe(iframe);
    return () => observer.disconnect();
  }, [hasPreview, measureIframe]);

  // ── Edição ──

  const updateField = <K extends keyof ReservationEmailConfigType>(
    key: K,
    value: ReservationEmailConfigType[K],
  ) => setConfig((prev) => ({ ...prev, [key]: value }));

  const trackFocus =
    (key: TextKey) => (e: React.FocusEvent<FieldElement>) => {
      lastFocusedRef.current = { key, element: e.currentTarget };
    };

  const textProps = (key: TextKey) => ({
    value: config[key],
    onChange: (value: string) => updateField(key, value),
    onFocus: trackFocus(key),
  });

  const insertVariable = (token: string) => {
    const target = lastFocusedRef.current;
    if (!target) {
      addAlert(
        "Clique em um campo de texto e depois na variável para inseri-la.",
      );
      return;
    }
    const { key, element } = target;
    const current = config[key];
    const start = element.selectionStart ?? current.length;
    const end = element.selectionEnd ?? current.length;
    updateField(key, current.slice(0, start) + token + current.slice(end));
    requestAnimationFrame(() => {
      element.focus();
      const cursor = start + token.length;
      element.setSelectionRange(cursor, cursor);
    });
  };

  // ── Imagens ──

  const discardPendingUpload = async (url: string) => {
    if (!pendingUploadsRef.current.has(url)) return;
    pendingUploadsRef.current.delete(url);
    await deleteStorageImage(url);
  };

  const discardAllPendingUploads = () => {
    const pending = Array.from(pendingUploadsRef.current);
    pendingUploadsRef.current.clear();
    return Promise.all(pending.map(deleteStorageImage));
  };

  // Saiu sem salvar (Cancelar, X ou trocou de página pelo menu): apaga as
  // imagens que foram enviadas mas não chegaram a ser salvas.
  const closedRef = useRef(false);
  useEffect(() => {
    closedRef.current = false;
    const pending = pendingUploadsRef.current;
    return () => {
      closedRef.current = true;
      const urls = Array.from(pending);
      pending.clear();
      urls.forEach(deleteStorageImage);
    };
  }, []);

  const handlePickImage = async (field: ImageKey, file: File) => {
    const previous = config[field];
    setUploadingField(field);
    try {
      const { url } = await uploadImageToFirebase(file, EMAIL_IMAGE_FOLDER);
      if (closedRef.current) {
        // O editor foi fechado enquanto a imagem subia
        await deleteStorageImage(url);
        return;
      }
      pendingUploadsRef.current.add(url);
      updateField(field, url);
      // Trocou de novo uma imagem que nem chegou a ser salva: a anterior sobra
      await discardPendingUpload(previous);
    } catch (error) {
      addAlert(
        error instanceof Error ? error.message : "Erro ao enviar a imagem.",
      );
    } finally {
      setUploadingField(null);
    }
  };

  const handleRemoveImage = async (field: ImageKey) => {
    const previous = config[field];
    updateField(field, "");
    await discardPendingUpload(previous);
  };

  // ── Salvar / descartar / restaurar ──

  const handleSave = async () => {
    if (!isDirty || saving || uploadingField) return;
    if (!config.subject.trim()) {
      addAlert("O assunto do e-mail não pode ficar vazio.");
      return;
    }
    if (!config.cancelButtonLabel.trim()) {
      addAlert("O texto do botão de cancelamento não pode ficar vazio.");
      return;
    }
    setSaving(true);
    try {
      await ReservationEmailRepository.save(config);
      // Imagens enviadas pelo editor que saíram nesta versão
      const stillUsed = [config.bannerUrl, config.footerImageUrl];
      const removed = [savedConfig.bannerUrl, savedConfig.footerImageUrl].filter(
        (url) => !stillUsed.includes(url) && isEditorUpload(url),
      );
      await Promise.all(removed.map(deleteStorageImage));
      pendingUploadsRef.current.clear();
      setSavedConfig(config);
      setUpdatedAt(new Date());
      addAlert("E-mail atualizado! As próximas reservas já recebem esta versão.");
    } catch (error) {
      console.error(error);
      addAlert(
        "Não foi possível salvar o e-mail. Confira a conexão e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd + S salva sem tirar a mão do teclado
  const saveShortcutRef = useRef(handleSave);
  useEffect(() => {
    saveShortcutRef.current = handleSave;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveShortcutRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Fechar/recarregar a aba com alterações pendentes pede confirmação
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const requestClose = () => {
    if (isDirty) setConfirmAction("discard");
    else closeForms();
  };

  const resetToDefault = async () => {
    setConfig(DEFAULT_RESERVATION_EMAIL);
    setConfirmAction(null);
    addAlert("Conteúdo padrão restaurado. Salve para aplicar.");
    await discardAllPendingUploads();
  };

  // ── Teste ──

  const handleSendTest = async () => {
    if (isDirty) {
      addAlert("Salve as alterações antes — o teste usa a versão salva.");
      return;
    }
    const to = testEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      addAlert("Digite um e-mail válido para o teste.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, template: "client", props: sampleData }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      addAlert(
        `Teste enviado para ${to}! Se não aparecer, confira o spam e a aba Promoções.`,
      );
    } catch (error) {
      console.error(error);
      addAlert("Não foi possível enviar o teste agora.");
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="relative bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[96vw] h-full sm:h-[92vh] max-h-full max-w-none sm:max-w-[1200px] flex flex-col overflow-hidden shadow-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-primary-gold/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center shrink-0 text-primary-gold">
            <LuMail size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-primary-gold truncate">
                E-mail de reserva
              </span>
              {isDirty && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-700/40 bg-yellow-900/20 text-yellow-500">
                  Não salvo
                </span>
              )}
            </div>
            <span className="text-[11px] text-primary-gold/40 truncate">
              {updatedAt
                ? `Última alteração em ${formatDateTime(updatedAt)}`
                : "O que o cliente recebe ao fazer uma reserva"}
            </span>
          </div>
        </div>
        <button
          onClick={requestClose}
          className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer shrink-0"
        >
          <LuX size={16} />
        </button>
      </div>

      {loadState !== "ready" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {loadState === "loading" ? (
            <>
              <Loader />
              <span className="text-sm text-primary-gold/50">
                Carregando o e-mail...
              </span>
            </>
          ) : (
            <>
              <LuWifiOff size={28} className="text-invalid-color" />
              <span className="text-sm text-primary-gold/70">
                Não foi possível carregar o conteúdo do e-mail.
              </span>
              <span className="text-xs text-primary-gold/40 max-w-[320px]">
                Confira a conexão. Nada foi alterado — os clientes continuam
                recebendo a última versão salva.
              </span>
              <button
                onClick={loadConfig}
                className="flex items-center gap-1.5 mt-1 px-3.5 py-2 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 text-xs font-medium transition-all cursor-pointer"
              >
                <LuRefreshCw size={13} /> Tentar novamente
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* ── Abas (só no celular) ── */}
          <div className="flex lg:hidden border-b border-primary-gold/10 shrink-0">
            {(["edit", "preview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-all cursor-pointer ${
                  mobileTab === tab
                    ? "text-primary-gold border-b-2 border-primary-gold"
                    : "text-primary-gold/40 hover:text-primary-gold/70"
                }`}
              >
                {tab === "edit" ? <LuPencil size={14} /> : <LuEye size={14} />}
                {tab === "edit" ? "Editar" : "Visualizar"}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* ── Formulário ── */}
            <div
              className={`${mobileTab === "preview" ? "hidden lg:flex" : "flex"} flex-col min-h-0 lg:border-r border-primary-gold/10`}
            >
              <div className="flex flex-col gap-2 px-5 py-3 border-b border-primary-gold/10 bg-primary-black/20 shrink-0">
                <span className="flex items-center gap-1.5 text-[11px] text-primary-gold/50">
                  <LuBraces size={12} /> Variáveis — clique em um campo e
                  depois na variável para inserir
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RESERVATION_EMAIL_VARIABLES.map((variable) => (
                    <Tooltip
                      key={variable.token}
                      content={variable.description}
                      direction="bottom"
                    >
                      <button
                        type="button"
                        // Não tira o foco do campo — assim a variável entra
                        // exatamente onde o cursor estava.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(variable.token)}
                        className="px-2 py-1 rounded-md border border-primary-gold/20 bg-primary-gold/5 hover:bg-primary-gold/15 hover:border-primary-gold/40 text-[11px] font-mono text-primary-gold/80 transition-all cursor-pointer"
                      >
                        {variable.token}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
                <EditorSection
                  title="Caixa de entrada"
                  description="O que o cliente vê antes de abrir o e-mail."
                >
                  <TextField
                    label="Assunto"
                    counter={SUBJECT_SOFT_LIMIT}
                    hint="Acima de ~70 caracteres o celular corta o assunto."
                    {...textProps("subject")}
                  />
                  <TextField
                    label="Texto de prévia"
                    hint="Aparece ao lado do assunto, na lista de e-mails."
                    {...textProps("previewText")}
                  />
                </EditorSection>

                <EditorSection title="Topo">
                  <ImageField
                    label="Imagem do topo"
                    url={config.bannerUrl}
                    uploading={uploadingField === "bannerUrl"}
                    disabled={uploadingField !== null || saving}
                    onPick={(file) => handlePickImage("bannerUrl", file)}
                    onRemove={() => handleRemoveImage("bannerUrl")}
                  />
                  <TextField label="Título" {...textProps("heading")} />
                  <TextField
                    label="Mensagem de abertura"
                    multiline
                    rows={4}
                    hint={BOLD_HINT}
                    {...textProps("intro")}
                  />
                </EditorSection>

                <EditorSection
                  title="Código da reserva"
                  description="O código em si sempre aparece — é com ele que o cliente cancela."
                >
                  <TextField label="Rótulo" {...textProps("codeLabel")} />
                  <TextField
                    label="Dica abaixo do código"
                    multiline
                    rows={2}
                    hint={BOLD_HINT}
                    {...textProps("codeHint")}
                  />
                </EditorSection>

                <EditorSection
                  title="Aviso"
                  description="Faixa vermelha de destaque (ex: tolerância de horário)."
                  action={
                    <VisibilityToggle
                      checked={config.showWarning}
                      onChange={(value) => updateField("showWarning", value)}
                    />
                  }
                >
                  <TextField
                    label="Texto do aviso"
                    multiline
                    rows={3}
                    hint={BOLD_HINT}
                    disabled={!config.showWarning}
                    {...textProps("warningText")}
                  />
                </EditorSection>

                <EditorSection
                  title="Endereço"
                  action={
                    <VisibilityToggle
                      checked={config.showAddress}
                      onChange={(value) => updateField("showAddress", value)}
                    />
                  }
                >
                  <TextField
                    label="Texto do endereço"
                    multiline
                    rows={2}
                    hint={BOLD_HINT}
                    disabled={!config.showAddress}
                    {...textProps("addressText")}
                  />
                </EditorSection>

                <EditorSection
                  title="Cancelamento"
                  description="O botão sempre leva para a página de cancelamento."
                >
                  <TextField label="Título" {...textProps("cancelTitle")} />
                  <TextField
                    label="Texto"
                    multiline
                    rows={2}
                    hint={BOLD_HINT}
                    {...textProps("cancelText")}
                  />
                  <TextField
                    label="Texto do botão"
                    {...textProps("cancelButtonLabel")}
                  />
                </EditorSection>

                <EditorSection title="Encerramento">
                  <TextField
                    label="Assinatura"
                    multiline
                    rows={3}
                    hint={BOLD_HINT}
                    {...textProps("signOff")}
                  />
                  <ImageField
                    label="Imagem do rodapé"
                    url={config.footerImageUrl}
                    uploading={uploadingField === "footerImageUrl"}
                    disabled={uploadingField !== null || saving}
                    onPick={(file) => handlePickImage("footerImageUrl", file)}
                    onRemove={() => handleRemoveImage("footerImageUrl")}
                  />
                </EditorSection>
              </div>
            </div>

            {/* ── Pré-visualização ── */}
            <div
              className={`${mobileTab === "edit" ? "hidden lg:flex" : "flex"} flex-col min-h-0 bg-primary-black/30`}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-primary-gold/10 shrink-0">
                <span className="flex items-center gap-2 text-[11px] text-primary-gold/50 uppercase tracking-wider font-semibold">
                  Pré-visualização
                  {previewLoading && previewHtml && <Spinner />}
                </span>
                <div className="flex rounded-lg border border-primary-gold/15 overflow-hidden">
                  {(["desktop", "mobile"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setDevice(option)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] transition-all cursor-pointer ${
                        device === option
                          ? "bg-primary-gold/15 text-primary-gold"
                          : "text-primary-gold/40 hover:text-primary-gold/70"
                      }`}
                    >
                      {option === "desktop" ? (
                        <LuMonitor size={13} />
                      ) : (
                        <LuSmartphone size={13} />
                      )}
                      {option === "desktop" ? "Computador" : "Celular"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
                {/* Como aparece na lista de e-mails */}
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] text-primary-gold/40">
                    <LuInbox size={12} /> Na caixa de entrada
                  </span>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-black/10">
                    <div className="w-9 h-9 rounded-full bg-[#8a6a14] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      C
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#1f1d1a] truncate">
                          Carcassonne Reservas
                        </span>
                        <span className="text-[11px] text-[#6f6a60] shrink-0">
                          agora
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#1f1d1a] truncate">
                        {inboxSubject || "(sem assunto)"}
                      </span>
                      <span className="text-[12px] text-[#6f6a60] truncate">
                        {inboxPreview}
                      </span>
                    </div>
                  </div>
                </div>

                {/* O e-mail em si */}
                {!previewHtml ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-xl border border-primary-gold/10 text-center">
                    {previewError ? (
                      <>
                        <LuTriangleAlert size={22} className="text-yellow-500" />
                        <span className="text-sm text-primary-gold/60">
                          Não foi possível gerar a pré-visualização.
                        </span>
                      </>
                    ) : (
                      <>
                        <Loader />
                        <span className="text-xs text-primary-gold/40">
                          Montando o e-mail...
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <iframe
                      ref={iframeRef}
                      title="Pré-visualização do e-mail"
                      srcDoc={previewHtml}
                      // Sem scripts; e sem cliques, pra não navegar pelos links
                      sandbox="allow-same-origin"
                      onLoad={measureIframe}
                      style={{ height: iframeHeight }}
                      className={`bg-white rounded-xl border border-primary-gold/15 pointer-events-none transition-[width] duration-300 ${
                        device === "mobile" ? "w-[375px] max-w-full" : "w-full"
                      }`}
                    />
                    {previewError && (
                      <span className="flex items-center gap-1 text-[11px] text-yellow-500">
                        <LuTriangleAlert size={12} /> Não foi possível
                        atualizar — mostrando a última versão gerada.
                      </span>
                    )}
                  </div>
                )}

                {/* Envio de teste */}
                <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-gold/90">
                      <LuSend size={14} /> Enviar um teste
                    </span>
                    <span className="text-[11px] text-primary-gold/40">
                      {isDirty
                        ? "Salve as alterações antes — o teste usa a versão salva."
                        : "Receba o e-mail de verdade, com uma reserva de exemplo."}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputClass}
                    />
                    <button
                      onClick={handleSendTest}
                      disabled={sendingTest || isDirty}
                      className="flex items-center justify-center gap-1.5 px-4 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {sendingTest ? <Spinner /> : "Enviar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-t border-primary-gold/10 shrink-0">
            <button
              onClick={() => setConfirmAction("reset")}
              disabled={saving || uploadingField !== null}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
            >
              <LuRotateCcw size={13} />
              <span className="hidden sm:inline">Restaurar padrão</span>
            </button>
            <div className="flex-1" />
            <span className="hidden md:inline text-[10px] text-primary-gold/25 mr-1">
              Ctrl + S para salvar
            </span>
            <button
              onClick={requestClose}
              disabled={saving}
              className="px-3.5 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty || uploadingField !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving && <Spinner />}
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </>
      )}

      {/* ── Confirmação (descartar / restaurar) ── */}
      {confirmAction && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="bg-secondary-black border border-primary-gold/20 rounded-2xl w-full max-w-[380px] shadow-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-primary-gold">
                {confirmAction === "discard"
                  ? "Descartar alterações?"
                  : "Restaurar o conteúdo padrão?"}
              </span>
              <p className="text-sm text-primary-gold/60">
                {confirmAction === "discard"
                  ? "Você tem alterações não salvas. Se sair agora, elas serão perdidas."
                  : "Textos e imagens voltam ao padrão. Nada muda nos e-mails até você salvar."}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-1.5 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold hover:border-primary-gold/40 transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={
                  // Descartar só fecha: as imagens não salvas são apagadas
                  // quando o editor desmonta.
                  confirmAction === "discard" ? closeForms : resetToDefault
                }
                className="px-4 py-1.5 text-sm rounded-lg border border-invalid-color/40 text-invalid-color bg-invalid-color/10 hover:bg-invalid-color/20 transition-all cursor-pointer"
              >
                {confirmAction === "discard" ? "Descartar" : "Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
