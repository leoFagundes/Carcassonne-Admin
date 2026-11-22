"use client";

import LoaderFullscreen from "@/components/loaderFullscreen";
import Loader from "@/components/loader";
import { useAlert } from "@/contexts/alertProvider";
import { usePubInfo } from "@/contexts/siteConfigProvider";
import ComboRepository from "@/services/repositories/ComboRepository";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import { buildMenuModel, type MenuModel } from "@/menuPdf/model";
import { browserLabel, generateMenuPdf, type GenerateStep } from "@/menuPdf/generate";
import {
  applyOptions,
  DEFAULT_OPTIONS,
  isEmpty,
  OPTIONS_STORAGE_KEY,
  sanitizeOptions,
  type PdfOptions,
} from "@/menuPdf/options";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiSkipBack } from "react-icons/fi";
import {
  LuCheck,
  LuDownload,
  LuExternalLink,
  LuFileText,
  LuRefreshCw,
  LuRotateCcw,
  LuTriangleAlert,
} from "react-icons/lu";

type Status =
  | { kind: "idle" }
  | { kind: "working"; step: GenerateStep | null }
  | { kind: "ready"; url: string; pages: number; size: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

const FILE_NAME = "cardapio-carcassonne.pdf";

type Flag = Exclude<keyof PdfOptions, "theme" | "hidden">;

const PARTS: { key: Flag; label: string; hint: string }[] = [
  { key: "cover", label: "Capa", hint: "Página de abertura com o logo" },
  { key: "toc", label: "Sumário", hint: "Lista das seções com a página (clicável)" },
  { key: "legend", label: "Legenda", hint: "O que é Destaque e Vegano, moeda e data" },
  { key: "pageChrome", label: "Cabeçalho e rodapé", hint: "Nome, contatos e “Página X de Y”" },
  { key: "infos", label: "Avisos", hint: "Passaporte, promoções da semana…" },
  { key: "combos", label: "Combos", hint: "" },
];

const ITEM_PARTS: { key: Flag; label: string; hint: string }[] = [
  { key: "photos", label: "Fotos", hint: "Sem fotos o PDF fica menor e mais rápido" },
  { key: "descriptions", label: "Descrições", hint: "" },
  { key: "extras", label: "Acompanhamentos e observações", hint: "" },
  { key: "badges", label: "Selos Destaque e Vegano", hint: "" },
  { key: "subtitles", label: "Frase de cada categoria", hint: "Ex.: “Life is too short for bad snacks”" },
];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">{label}</span>
      <div className="flex items-center gap-1 rounded-lg border border-primary-gold/20 bg-primary-black/30 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all disabled:cursor-default ${
              value === o.value ? "bg-primary-gold/20 text-primary-gold" : "text-primary-gold/50 hover:text-primary-gold/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
        disabled ? "cursor-default opacity-40" : "cursor-pointer hover:bg-primary-gold/5"
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-primary-gold/50 ${
          checked ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/35 bg-primary-black/40"
        }`}
      >
        {checked && <LuCheck size={11} strokeWidth={3.5} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={`text-[13px] leading-tight ${checked ? "text-primary-gold" : "text-primary-gold/55"}`}>{label}</span>
        {hint ? <span className="mt-0.5 text-[11px] leading-snug text-primary-gold/35">{hint}</span> : null}
      </span>
    </label>
  );
}

function Group({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">{title}</span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function PDFPage() {
  const [model, setModel] = useState<MenuModel | null>(null);
  const [opts, setOpts] = useState<PdfOptions>(DEFAULT_OPTIONS);
  const [optsLoaded, setOptsLoaded] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);
  const run = useRef(0);
  const urlRef = useRef<string | null>(null);

  const pub = usePubInfo();
  const { addAlert } = useAlert();
  const router = useRouter();

  // Personalização salva neste navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (raw) setOpts(sanitizeOptions(JSON.parse(raw)));
    } catch {
      // sem acesso ao armazenamento: fica o padrão
    }
    setOptsLoaded(true);
  }, []);
  useEffect(() => {
    if (!optsLoaded) return;
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(opts));
    } catch {
      // ignora
    }
  }, [opts, optsLoaded]);

  const set = <K extends keyof PdfOptions>(key: K, value: PdfOptions[K]) => setOpts((o) => ({ ...o, [key]: value }));

  useEffect(() => {
    (async () => {
      try {
        const [typesOrder, items, combos, infos, descriptions] = await Promise.all([
          TypesOrderRepository.getAll(),
          MenuItemRepository.getAll(),
          ComboRepository.getAll(),
          InfoRepository.getAll(),
          DescriptionRepository.getAll(),
        ]);
        setModel(buildMenuModel({ items, combos, infos, descriptions, typesOrder }));
      } catch (error) {
        addAlert(`Erro ao carregar o cardápio: ${error}`);
        setStatus({ kind: "error", message: `Não carregou o cardápio (${error instanceof Error ? error.message : String(error)}).` });
      }
    })();
  }, []);

  const filtered = useMemo(() => (model ? applyOptions(model, opts) : null), [model, opts]);

  // Gera de novo quando muda qualquer opção (com uma pausa curta, para vários cliques seguidos)
  useEffect(() => {
    if (!filtered || !optsLoaded) return;
    const me = ++run.current;
    if (isEmpty(filtered)) {
      setStatus({ kind: "empty" });
      return;
    }
    setStatus({ kind: "working", step: null });
    const timer = setTimeout(() => {
      generateMenuPdf({
        model: filtered,
        opts,
        pub,
        onStep: (step) => run.current === me && setStatus({ kind: "working", step }),
      })
        .then(({ blob, pages }) => {
          if (run.current !== me) return;
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setStatus({ kind: "ready", url, pages, size: blob.size });
        })
        .catch((err) => {
          if (run.current !== me) return;
          console.error("[cardápio PDF]", err);
          const detail = err instanceof Error ? err.message : String(err);
          setStatus({ kind: "error", message: detail || "erro desconhecido" });
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [filtered, opts, pub, optsLoaded, attempt]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const working = status.kind === "working" || (status.kind === "idle" && !model);
  const ready = status.kind === "ready" ? status : null;
  const isDefault = JSON.stringify(opts) === JSON.stringify(DEFAULT_OPTIONS);

  const stepText = useMemo(() => {
    if (status.kind !== "working" || !status.step) return "Preparando…";
    if (status.step.phase === "fotos")
      return status.step.total ? `Preparando as fotos (${status.step.done} de ${status.step.total})…` : "Preparando as fotos…";
    return "Montando as páginas…";
  }, [status]);

  const sizeText = ready
    ? ready.size > 1024 * 1024
      ? `${(ready.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
      : `${Math.round(ready.size / 1024)} KB`
    : "";

  const hidden = new Set(opts.hidden);
  const toggleCategory = (title: string, on: boolean) =>
    set("hidden", on ? opts.hidden.filter((h) => h !== title) : [...opts.hidden, title]);

  return (
    <div className="flex min-h-full flex-col items-center text-primary-gold">
      {!model && status.kind !== "error" && <LoaderFullscreen />}

      <div className="flex w-full max-w-[1280px] flex-col gap-4 py-2 sm:py-4">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.back()}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-primary-gold/20 px-2.5 py-1.5 text-sm text-primary-gold/60 transition-all hover:border-primary-gold/50 hover:text-primary-gold"
          >
            <FiSkipBack size={14} /> Voltar
          </button>
          <LuFileText size={20} className="shrink-0 text-primary-gold/70" />
          <h1 className="text-lg font-semibold sm:text-xl">Cardápio em PDF</h1>
          {model && filtered && (
            <span className="text-xs whitespace-nowrap text-primary-gold/40">
              {filtered.itemCount === model.itemCount
                ? `${model.itemCount} itens visíveis`
                : `${filtered.itemCount} de ${model.itemCount} itens`}
            </span>
          )}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Opções */}
          <aside className="flex flex-col gap-5 rounded-xl border border-primary-gold/15 bg-secondary-black/60 p-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            {/* Ações */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={ready?.url}
                  download={FILE_NAME}
                  aria-disabled={!ready}
                  onClick={(e) => !ready && e.preventDefault()}
                  className={`flex flex-[2] items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#f0d382] to-primary-gold px-4 py-2 text-sm font-semibold text-primary-black shadow-[0_8px_20px_-8px_rgba(230,197,107,0.6)] transition-all ${
                    ready ? "cursor-pointer hover:brightness-105" : "pointer-events-none opacity-50"
                  }`}
                >
                  {working ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-black/25 border-t-primary-black" />
                  ) : (
                    <LuDownload size={15} />
                  )}
                  Baixar PDF
                </a>
                <a
                  href={ready?.url}
                  target="_blank"
                  rel="noopener"
                  aria-disabled={!ready}
                  onClick={(e) => !ready && e.preventDefault()}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary-gold/20 px-3 py-2 text-sm text-primary-gold/70 transition-all ${
                    ready ? "cursor-pointer hover:border-primary-gold/50 hover:text-primary-gold" : "pointer-events-none opacity-40"
                  }`}
                  title="Abre o PDF numa aba nova (dali dá para imprimir)"
                >
                  <LuExternalLink size={15} /> Abrir
                </a>
              </div>
              <div className="flex min-h-5 items-center gap-2 text-xs text-primary-gold/55" aria-live="polite">
                {working && (
                  <>
                    <Loader />
                    <span>{stepText}</span>
                  </>
                )}
                {ready && (
                  <span>
                    Pronto · {ready.pages} {ready.pages === 1 ? "página" : "páginas"} · {sizeText}
                  </span>
                )}
                {status.kind === "empty" && <span>Nada para mostrar: marque pelo menos uma parte ou categoria.</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Segmented
                label="Fundo"
                value={opts.theme}
                onChange={(v) => set("theme", v)}
                disabled={!model}
                options={[
                  { value: "black", label: "Preto" },
                  { value: "white", label: "Branco (menos tinta)" },
                ]}
              />
              <Segmented
                label="Seções"
                value={opts.sectionPerPage ? "page" : "flow"}
                onChange={(v) => set("sectionPerPage", v === "page")}
                disabled={!model}
                options={[
                  { value: "flow", label: "Seguidas" },
                  { value: "page", label: "Uma por página" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Group title="Partes do PDF">
                <div className="-mx-2 flex flex-col">
                  {PARTS.map((o) => (
                    <Check
                      key={o.key}
                      label={o.label}
                      hint={o.key === "toc" && !opts.cover && opts.toc ? "Sem capa, vai no começo da 1ª página" : o.hint}
                      checked={opts[o.key]}
                      onChange={(v) => set(o.key, v)}
                      disabled={!model || (o.key === "infos" && !model.infos.length) || (o.key === "combos" && !model.combos.length)}
                    />
                  ))}
                </div>
              </Group>

              <Group title="Nos itens">
                <div className="-mx-2 flex flex-col">
                  {ITEM_PARTS.map((o) => (
                    <Check
                      key={o.key}
                      label={o.label}
                      hint={o.hint}
                      checked={opts[o.key]}
                      onChange={(v) => set(o.key, v)}
                      disabled={!model}
                    />
                  ))}
                </div>
              </Group>
            </div>

            {model && model.sections.length > 0 && (
              <Group
                title="Categorias"
                aside={
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => set("hidden", [])}
                      className="cursor-pointer text-primary-gold/50 hover:text-primary-gold"
                    >
                      Todas
                    </button>
                    <span className="text-primary-gold/20">·</span>
                    <button
                      type="button"
                      onClick={() => set("hidden", model.sections.map((s) => s.title))}
                      className="cursor-pointer text-primary-gold/50 hover:text-primary-gold"
                    >
                      Nenhuma
                    </button>
                  </div>
                }
              >
                <div className="flex flex-wrap gap-1.5">
                  {model.sections.map((s) => {
                    const on = !hidden.has(s.title);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleCategory(s.title, !on)}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                          on
                            ? "border-primary-gold/50 bg-primary-gold/15 text-primary-gold"
                            : "border-primary-gold/15 text-primary-gold/40 line-through decoration-primary-gold/30 hover:border-primary-gold/35 hover:text-primary-gold/70"
                        }`}
                      >
                        {on && <LuCheck size={11} strokeWidth={3} />}
                        {s.title}
                        <span className={on ? "text-primary-gold/55" : "text-primary-gold/30"}>{s.count}</span>
                      </button>
                    );
                  })}
                </div>
              </Group>
            )}

            <button
              type="button"
              disabled={isDefault}
              onClick={() => setOpts({ ...DEFAULT_OPTIONS, hidden: [] })}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-primary-gold/50 transition-colors hover:text-primary-gold disabled:cursor-default disabled:opacity-30 disabled:hover:text-primary-gold/50"
            >
              <LuRotateCcw size={12} /> Voltar ao padrão
            </button>
          </aside>

          {/* Pré-visualização e erro */}
          <div className="flex min-w-0 flex-col gap-4">
            {status.kind === "error" && (
              <div className="flex flex-col gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                <div className="flex items-center gap-2 font-semibold">
                  <LuTriangleAlert size={16} /> Não deu para gerar o PDF
                </div>
                <p className="text-xs leading-relaxed text-red-200/80">
                  Se acontecer de novo, mande um print desta mensagem:
                  <br />
                  <code className="break-all text-red-100">{status.message}</code>
                  <br />
                  <span className="text-red-200/60">{typeof navigator !== "undefined" ? browserLabel() : ""}</span>
                </p>
                <button
                  onClick={() => setAttempt((n) => n + 1)}
                  className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-red-300/30 px-3 py-1.5 text-xs hover:bg-red-500/10"
                >
                  <LuRefreshCw size={13} /> Tentar de novo
                </button>
              </div>
            )}

            {/* O próprio PDF (só no computador; celular não mostra PDF dentro da página) */}
            <div className="relative hidden h-[calc(100dvh-7rem)] min-h-[520px] overflow-hidden rounded-xl border border-primary-gold/15 bg-[#2a2826] lg:block">
              {ready ? (
                <iframe
                  key={ready.url}
                  src={`${ready.url}#view=FitH`}
                  title="Pré-visualização do cardápio em PDF"
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-primary-gold/45">
                  {status.kind === "error" ? (
                    "Sem pré-visualização"
                  ) : status.kind === "empty" ? (
                    "Nada marcado para entrar no PDF"
                  ) : (
                    <>
                      <Loader />
                      {stepText}
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs leading-relaxed text-primary-gold/45 lg:hidden">
              No celular, toque em <strong className="text-primary-gold/70">Abrir</strong> para ver o PDF ou em{" "}
              <strong className="text-primary-gold/70">Baixar PDF</strong> para salvar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
