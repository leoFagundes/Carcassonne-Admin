"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore";
import {
  LuBraces,
  LuEye,
  LuMail,
  LuMonitor,
  LuPencil,
  LuRefreshCw,
  LuRotateCcw,
  LuSend,
  LuSmartphone,
  LuWifiOff,
  LuX,
} from "react-icons/lu";
import { db } from "@/services/firebaseConfig";
import { adminApi } from "@/services/rentalApi";
import { useAlert } from "@/contexts/alertProvider";
import {
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_COLLECTION,
  mergeTemplate,
  type EmailTemplateId,
  type TemplateValues,
} from "@/utils/emailTemplates";

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

const fieldClass =
  "w-full rounded-xl border border-primary-gold/20 bg-primary-black/55 px-3 py-2 text-sm text-primary-gold placeholder:text-primary-gold/30 outline-none transition-colors hover:border-primary-gold/40 focus:border-primary-gold/70";

const formatDateTime = (date: Date) =>
  date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Editor dos textos de um e-mail automático (aluguel e conta): campos à
 * esquerda, prévia renderizada pelo servidor (igual ao envio) à direita,
 * variáveis, restaurar o padrão e enviar um teste.
 */
export default function TemplateEmailEditor({ id, onClose }: { id: EmailTemplateId; onClose: () => void }) {
  const def = EMAIL_TEMPLATES[id];
  const { addAlert } = useAlert();
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [values, setValues] = useState<TemplateValues>(def.defaults);
  const [saved, setSaved] = useState<TemplateValues>(def.defaults);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [confirm, setConfirm] = useState<"discard" | "reset" | null>(null);
  const [iframeHeight, setIframeHeight] = useState(600);
  const lastFocused = useRef<{ key: string; el: FieldElement } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const requestRef = useRef(0);

  const isDirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved]);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const snap = await getDoc(doc(db, EMAIL_TEMPLATE_COLLECTION, id));
      const data = snap.exists() ? snap.data() : null;
      const merged = mergeTemplate(id, data);
      setValues(merged);
      setSaved(merged);
      setUpdatedAt((data?.updatedAt as Timestamp | undefined)?.toDate?.() ?? null);
      setLoadState("ready");
    } catch (error) {
      console.error(error);
      setLoadState("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Prévia renderizada no servidor (o mesmo componente do envio).
  useEffect(() => {
    if (loadState !== "ready") return;
    const req = ++requestRef.current;
    const t = setTimeout(async () => {
      const r = await adminApi.emailTemplatePreview(id, values);
      if (req !== requestRef.current) return;
      if (r.ok) {
        setPreview(r.data);
        setPreviewError(false);
      } else {
        setPreviewError(true);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [id, values, loadState]);

  const measure = useCallback(() => {
    const html = iframeRef.current?.contentDocument?.documentElement;
    if (!html || !iframeRef.current?.clientWidth) return;
    setIframeHeight(Math.max(html.offsetHeight, 200));
  }, []);

  const insertVariable = (token: string) => {
    const target = lastFocused.current;
    if (!target) return addAlert("Clique em um campo de texto e depois na variável para inseri-la.");
    const current = values[target.key] ?? "";
    const start = target.el.selectionStart ?? current.length;
    const end = target.el.selectionEnd ?? current.length;
    setValues({ ...values, [target.key]: current.slice(0, start) + token + current.slice(end) });
    requestAnimationFrame(() => {
      target.el.focus();
      const cursor = start + token.length;
      target.el.setSelectionRange(cursor, cursor);
    });
  };

  const save = async () => {
    if (!isDirty || saving) return;
    const empty = def.fields.find((f) => f.required && !(values[f.key] ?? "").trim());
    if (empty) return addAlert(`"${empty.label}" não pode ficar vazio.`);
    setSaving(true);
    try {
      await setDoc(doc(db, EMAIL_TEMPLATE_COLLECTION, id), { ...values, updatedAt: serverTimestamp() });
      setSaved(values);
      setUpdatedAt(new Date());
      addAlert("E-mail atualizado! Os próximos envios já saem com esta versão (em até 1 minuto).");
    } catch (error) {
      console.error(error);
      addAlert("Não foi possível salvar o e-mail. Confira a conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd + S salva.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sendTest = async () => {
    if (isDirty) return addAlert("Salve as alterações antes: o teste usa a versão salva.");
    const to = testTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return addAlert("Digite um e-mail válido para o teste.");
    setSendingTest(true);
    const r = await adminApi.emailTemplateTest(id, to);
    setSendingTest(false);
    addAlert(r.ok ? `Teste enviado para ${to}! Se não aparecer, confira o spam.` : r.message);
  };

  const requestClose = () => (isDirty ? setConfirm("discard") : onClose());

  return (
    <div className="relative bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[96vw] h-full sm:h-[92vh] max-h-full max-w-none sm:max-w-[1200px] flex flex-col overflow-hidden shadow-2xl">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-primary-gold/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center shrink-0 text-primary-gold">
            <LuMail size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-primary-gold truncate">{def.title}</span>
              {isDirty && (
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-700/40 bg-yellow-900/20 text-yellow-500">
                  Não salvo
                </span>
              )}
            </div>
            <span className="text-[11px] text-primary-gold/40 truncate">
              {updatedAt ? `Última alteração em ${formatDateTime(updatedAt)}` : def.description}
            </span>
          </div>
        </div>
        <button
          onClick={requestClose}
          aria-label="Fechar"
          className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer shrink-0"
        >
          <LuX size={16} />
        </button>
      </div>

      {loadState !== "ready" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          {loadState === "loading" ? (
            <span className="text-sm text-primary-gold/50">Carregando o e-mail...</span>
          ) : (
            <>
              <LuWifiOff size={28} className="text-invalid-color" />
              <span className="text-sm text-primary-gold/70">Não foi possível carregar o conteúdo do e-mail.</span>
              <span className="text-xs text-primary-gold/40 max-w-[320px]">
                Nada foi alterado: os clientes continuam recebendo a última versão salva.
              </span>
              <button
                onClick={load}
                className="flex items-center gap-1.5 mt-1 px-3.5 py-2 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold text-xs font-medium cursor-pointer"
              >
                <LuRefreshCw size={13} /> Tentar novamente
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Abas (celular) */}
          <div className="flex lg:hidden border-b border-primary-gold/10 shrink-0">
            {(["edit", "preview"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium cursor-pointer ${
                  mobileTab === tab ? "text-primary-gold border-b-2 border-primary-gold" : "text-primary-gold/40"
                }`}
              >
                {tab === "edit" ? <LuPencil size={14} /> : <LuEye size={14} />}
                {tab === "edit" ? "Editar" : "Visualizar"}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* Formulário */}
            <div className={`${mobileTab === "preview" ? "hidden lg:flex" : "flex"} flex-col min-h-0 lg:border-r border-primary-gold/10`}>
              {def.variables.length > 0 && (
                <div className="flex flex-col gap-2 px-5 py-3 border-b border-primary-gold/10 bg-primary-black/20 shrink-0">
                  <span className="flex items-center gap-1.5 text-[11px] text-primary-gold/50">
                    <LuBraces size={12} /> Variáveis: clique em um campo e depois na variável para inserir
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {def.variables.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        title={v.description}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertVariable(v.token)}
                        className="rounded-md border border-primary-gold/20 bg-primary-gold/5 px-2 py-0.5 font-mono text-[11px] text-primary-gold/80 hover:border-primary-gold/50 cursor-pointer"
                      >
                        {v.token}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                {def.fields.map((f) => {
                  const common = {
                    value: values[f.key] ?? "",
                    onChange: (e: React.ChangeEvent<FieldElement>) => setValues({ ...values, [f.key]: e.target.value }),
                    onFocus: (e: React.FocusEvent<FieldElement>) => {
                      lastFocused.current = { key: f.key, el: e.currentTarget };
                    },
                    maxLength: 2000,
                    className: fieldClass,
                  };
                  return (
                    <label key={f.key} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
                        {f.label}
                        {f.required ? " *" : ""}
                      </span>
                      {f.multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
                      {f.hint && <span className="text-[11px] text-primary-gold/40">{f.hint}</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Prévia */}
            <div className={`${mobileTab === "edit" ? "hidden lg:flex" : "flex"} flex-col min-h-0 bg-primary-black/30`}>
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-primary-gold/10 shrink-0">
                <span className="min-w-0 truncate text-xs text-primary-gold/70">
                  <span className="text-primary-gold/40">Assunto: </span>
                  {preview?.subject ?? "..."}
                </span>
                <div className="hidden sm:flex shrink-0 gap-1">
                  {(["desktop", "mobile"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDevice(d)}
                      aria-label={d === "desktop" ? "Computador" : "Celular"}
                      className={`p-1.5 rounded-md border cursor-pointer ${
                        device === d ? "border-primary-gold/50 text-primary-gold" : "border-transparent text-primary-gold/40"
                      }`}
                    >
                      {d === "desktop" ? <LuMonitor size={14} /> : <LuSmartphone size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-4 flex justify-center">
                {previewError ? (
                  <p className="text-xs text-invalid-color self-center">Não foi possível gerar a prévia agora.</p>
                ) : preview ? (
                  <iframe
                    ref={iframeRef}
                    title="Prévia do e-mail"
                    srcDoc={preview.html}
                    onLoad={measure}
                    sandbox="allow-same-origin"
                    style={{ height: iframeHeight }}
                    className={`w-full rounded-lg bg-white transition-[max-width] ${device === "mobile" ? "max-w-[380px]" : "max-w-[640px]"}`}
                  />
                ) : (
                  <p className="text-xs text-primary-gold/40 self-center">Gerando a prévia...</p>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-primary-gold/10 bg-primary-black/30 shrink-0">
            <div className="flex items-center gap-2 min-w-0 sm:flex-1">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="E-mail para teste"
                className={`${fieldClass} h-9 py-0 sm:max-w-[240px]`}
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={sendingTest}
                className="flex shrink-0 items-center gap-1.5 h-9 px-3 rounded-xl border border-primary-gold/25 text-xs text-primary-gold/80 hover:border-primary-gold/60 cursor-pointer disabled:opacity-40"
              >
                <LuSend size={13} /> {sendingTest ? "Enviando..." : "Enviar teste"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirm("reset")}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-primary-gold/15 text-xs text-primary-gold/55 hover:text-primary-gold cursor-pointer"
              >
                <LuRotateCcw size={13} /> Restaurar padrão
              </button>
              <div className="flex-1 sm:hidden" />
              <button
                type="button"
                onClick={save}
                disabled={!isDirty || saving}
                className="h-9 px-5 rounded-xl bg-gradient-to-b from-[#f0d382] to-primary-gold text-primary-black text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmações */}
      {confirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary-black/70 p-4">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-primary-gold/25 bg-secondary-black p-4">
            <p className="text-sm text-primary-gold">
              {confirm === "discard"
                ? "Sair sem salvar? As alterações deste e-mail serão perdidas."
                : "Voltar todos os textos para o padrão? Você ainda precisa salvar para aplicar."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 h-9 rounded-xl border border-primary-gold/20 text-xs text-primary-gold/70 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm === "discard") onClose();
                  else {
                    setValues(def.defaults);
                    setConfirm(null);
                  }
                }}
                className="flex-1 h-9 rounded-xl bg-primary-gold text-xs font-semibold text-primary-black cursor-pointer"
              >
                {confirm === "discard" ? "Sair sem salvar" : "Restaurar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
