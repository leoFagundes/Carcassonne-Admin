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
import { buildMenuModel } from "@/menuPdf/model";
import {
  browserLabel,
  generateMenuPdf,
  type GenerateStep,
} from "@/menuPdf/generate";
import {
  applyOptions,
  DEFAULT_OPTIONS,
  defaultQrUrl,
  isEmpty,
  isQrUrl,
  OPTIONS_STORAGE_KEY,
  loadSavedOptions,
  optionsToSave,
  FRAME_STYLES,
  type FramePage,
  type FrameStyle,
  type PdfFontSize,
  type PdfOptions,
} from "@/menuPdf/options";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiSkipBack } from "react-icons/fi";
import {
  LuCheck,
  LuChevronDown,
  LuMinus,
  LuSearch,
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
const AUTO_STORAGE_KEY = "cardapio-pdf-atualizar-sozinho";

type Flag = {
  [K in keyof PdfOptions]: PdfOptions[K] extends boolean ? K : never;
}[keyof PdfOptions];
type Raw = Omit<
  Parameters<typeof buildMenuModel>[0],
  "includeHidden" | "skipHidden"
>;

const PARTS: { key: Flag; label: string; hint: string }[] = [
  { key: "cover", label: "Capa", hint: "Página de abertura com o logo" },
  {
    key: "masthead",
    label: "Abertura",
    hint: "Logo, nome e endereço no topo da 1ª página",
  },
  {
    key: "toc",
    label: "Sumário",
    hint: "Lista das seções com a página (clicável)",
  },
  {
    key: "legend",
    label: "Legenda",
    hint: "O que é Destaque e Vegano, moeda e data",
  },
  {
    key: "pageChrome",
    label: "Cabeçalho e rodapé",
    hint: "Nome, contatos e “Página X de Y”",
  },
  {
    key: "qr",
    label: "QR code",
    hint: "Leva ao cardápio online; vai na capa, na abertura ou no fim",
  },
  { key: "infos", label: "Avisos", hint: "Passaporte, promoções da semana…" },
  { key: "combos", label: "Combos", hint: "" },
  {
    key: "rules",
    label: "Regulamento",
    hint: "Contato, avisos legais e pagamento (o mesmo do site)",
  },
  {
    key: "backPage",
    label: "Verso",
    hint: "Última página simples: logo, horário e contatos",
  },
];

const ITEM_PARTS: { key: Flag; label: string; hint: string }[] = [
  { key: "showHidden", label: "Itens ocultos", hint: "" },
  {
    key: "photos",
    label: "Fotos",
    hint: "Sem fotos o PDF fica menor e mais rápido",
  },
  { key: "descriptions", label: "Descrições", hint: "" },
  { key: "extras", label: "Acompanhamentos e observações", hint: "" },
  { key: "badges", label: "Selos Destaque e Vegano", hint: "" },
  {
    key: "subtitles",
    label: "Frase de cada categoria",
    hint: "Ex.: “Life is too short for bad snacks”",
  },
];

const FONT_SIZES: { value: PdfFontSize; label: string; px: number }[] = [
  { value: "S", label: "Pequena", px: 11 },
  { value: "M", label: "Normal", px: 13 },
  { value: "L", label: "Grande", px: 15.5 },
  { value: "XL", label: "Muito grande", px: 18 },
];

const same = (a: PdfOptions | null, b: PdfOptions | null) =>
  JSON.stringify(a) === JSON.stringify(b);

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">
        {label}
      </span>
      <div className="flex items-center gap-1 rounded-lg border border-primary-gold/20 bg-primary-black/30 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            title={o.title}
            aria-label={o.title}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`flex h-8 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap transition-all disabled:cursor-default ${
              value === o.value
                ? "bg-primary-gold/20 text-primary-gold"
                : "text-primary-gold/50 hover:text-primary-gold/80"
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
  small,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <label
      className={`group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
        disabled
          ? "cursor-default opacity-40"
          : "cursor-pointer hover:bg-primary-gold/5"
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
          checked
            ? "border-primary-gold bg-primary-gold text-primary-black"
            : "border-primary-gold/35 bg-primary-black/40"
        }`}
      >
        {checked && <LuCheck size={11} strokeWidth={3.5} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={`${small ? "text-xs" : "text-[13px]"} leading-tight ${checked ? "text-primary-gold" : "text-primary-gold/55"}`}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 text-[11px] leading-snug text-primary-gold/35">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Link do QR: vazio usa o cardápio online; só salva quando o link é válido. */
function QrLinkField({
  value,
  fallback,
  onChange,
}: {
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = !draft.trim() || isQrUrl(draft);
  const commit = () => {
    if (valid && draft.trim() !== value) onChange(draft.trim());
  };
  return (
    <div className="mb-1 ml-8 mr-2 flex flex-col gap-1">
      <input
        type="url"
        inputMode="url"
        value={draft}
        placeholder={fallback}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        aria-label="Link do QR code"
        aria-invalid={!valid}
        className={`w-full rounded-md border bg-primary-black/40 px-2 py-1.5 text-xs text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/60 ${
          valid ? "border-primary-gold/20" : "border-red-400/60"
        }`}
      />
      <span
        className={`text-[11px] leading-snug ${valid ? "text-primary-gold/35" : "text-red-300/80"}`}
      >
        {valid ? (
          <>
            Vazio = cardápio online.{" "}
            <a
              href={draft.trim() || fallback}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-primary-gold hover:underline"
            >
              Testar o link
            </a>
          </>
        ) : (
          "Link inválido: comece com https:// e não use espaços"
        )}
      </span>
    </div>
  );
}

const FRAME_LABEL: Record<FrameStyle, string> = {
  none: "Sem",
  double: "Dupla",
  ticket: "Ingresso",
};

/** Desenho pequeno de cada borda, para reconhecer de olho. */
function FrameIcon({ style }: { style: FrameStyle }) {
  return (
    <svg
      width="14"
      height="18"
      viewBox="0 0 14 18"
      aria-hidden="true"
      className="shrink-0"
    >
      {style === "none" ? (
        <rect
          x="1"
          y="1"
          width="12"
          height="16"
          rx="1"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeDasharray="2 2"
        />
      ) : style === "double" ? (
        <>
          <rect
            x="1"
            y="1"
            width="12"
            height="16"
            rx="1.5"
            fill="none"
            stroke="currentColor"
          />
          <rect
            x="3"
            y="3"
            width="8"
            height="12"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.55"
          />
        </>
      ) : (
        <path
          d="M4 1 H10 A3 3 0 0 0 13 4 V14 A3 3 0 0 0 10 17 H4 A3 3 0 0 0 1 14 V4 A3 3 0 0 0 4 1 Z"
          fill="none"
          stroke="currentColor"
        />
      )}
    </svg>
  );
}

function FrameRow({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: FrameStyle;
  onChange: (v: FrameStyle) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 ${disabled ? "opacity-40" : ""}`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] leading-tight text-primary-gold/80">
          {label}
        </span>
        {hint ? (
          <span className="text-[11px] leading-snug text-primary-gold/35">
            {hint}
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-primary-gold/20 bg-primary-black/30 p-0.5">
        {FRAME_STYLES.map((st) => (
          <button
            key={st}
            type="button"
            disabled={disabled}
            onClick={() => onChange(st)}
            aria-pressed={value === st}
            aria-label={`${label}: ${FRAME_LABEL[st]}`}
            title={FRAME_LABEL[st]}
            className={`flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[11px] font-medium transition-all disabled:cursor-default ${
              value === st
                ? "bg-primary-gold/20 text-primary-gold"
                : "text-primary-gold/45 hover:text-primary-gold/80"
            }`}
          >
            <FrameIcon style={st} />
            {FRAME_LABEL[st]}
          </button>
        ))}
      </div>
    </div>
  );
}

type HiddenItem = { id: string; name: string; type: string; value: string };

const plain = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * "Itens ocultos": a caixa liga/desliga todos; a setinha abre a lista para
 * escolher quais entram. Guarda os que ficam de fora (os escondidos depois
 * entram marcados).
 */
function HiddenItemsPicker({
  items,
  typeOrder,
  show,
  skip,
  onChange,
  disabled,
}: {
  items: HiddenItem[];
  typeOrder: (type: string) => number;
  show: boolean;
  skip: string[];
  onChange: (show: boolean, skip: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const skipSet = new Set(skip);
  const ids = items.map((i) => i.id);
  const picked = show ? ids.filter((id) => !skipSet.has(id)).length : 0;
  const all = items.length > 0 && picked === items.length;
  const some = picked > 0 && !all;

  const setAll = (on: boolean) => onChange(on, []);
  const toggle = (id: string) => {
    if (!show)
      return onChange(
        true,
        ids.filter((x) => x !== id),
      );
    const next = skipSet.has(id) ? skip.filter((x) => x !== id) : [...skip, id];
    // Todos desmarcados: desliga de vez
    if (ids.every((x) => next.includes(x))) return onChange(false, []);
    onChange(true, next);
  };

  const term = plain(q.trim());
  const shown = term
    ? items.filter(
        (i) => plain(i.name).includes(term) || plain(i.type).includes(term),
      )
    : items;
  const groups = [...new Set(shown.map((i) => i.type))]
    .sort((a, b) => typeOrder(a) - typeOrder(b) || a.localeCompare(b, "pt-BR"))
    .map((type) => ({
      type,
      items: shown
        .filter((i) => i.type === type)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }));

  const box = (state: "on" | "off" | "some") => (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
        state === "off"
          ? "border-primary-gold/35 bg-primary-black/40"
          : "border-primary-gold bg-primary-gold text-primary-black"
      }`}
    >
      {state === "on" && <LuCheck size={11} strokeWidth={3.5} />}
      {state === "some" && <LuMinus size={11} strokeWidth={3.5} />}
    </span>
  );

  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={some ? "mixed" : all}
          disabled={disabled}
          onClick={() => setAll(!(all || some))}
          className="flex flex-1 cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary-gold/5 disabled:cursor-default"
        >
          {box(all ? "on" : some ? "some" : "off")}
          <span className="flex min-w-0 flex-col">
            <span
              className={`text-[13px] leading-tight ${picked ? "text-primary-gold" : "text-primary-gold/55"}`}
            >
              Itens ocultos
            </span>
            <span className="mt-0.5 text-[11px] leading-snug text-primary-gold/35">
              {items.length
                ? `${items.length} ${items.length === 1 ? "item escondido" : "itens escondidos"} no site`
                : "Nenhum item escondido no site agora"}
            </span>
          </span>
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            disabled={disabled}
            aria-expanded={open}
            className="mt-1 flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-primary-gold/20 px-2 py-1 text-[11px] text-primary-gold/60 transition-colors hover:border-primary-gold/45 hover:text-primary-gold disabled:cursor-default"
            title="Escolher quais itens ocultos entram no PDF"
          >
            {picked} de {items.length}
            <LuChevronDown
              size={13}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <div className="mx-2 mb-2 mt-1 flex flex-col gap-2 rounded-lg border border-primary-gold/15 bg-primary-black/40 p-2">
          <div className="flex items-center gap-2">
            {items.length > 8 && (
              <label className="flex flex-1 items-center gap-1.5 rounded-md border border-primary-gold/15 bg-primary-black/40 px-2 py-1">
                <LuSearch size={12} className="shrink-0 text-primary-gold/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar"
                  aria-label="Buscar item oculto"
                  className="w-full bg-transparent text-xs text-primary-gold outline-none placeholder:text-primary-gold/30"
                />
              </label>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setAll(true)}
                className="cursor-pointer text-primary-gold/50 hover:text-primary-gold"
              >
                Todos
              </button>
              <span className="text-primary-gold/20">·</span>
              <button
                type="button"
                onClick={() => setAll(false)}
                className="cursor-pointer text-primary-gold/50 hover:text-primary-gold"
              >
                Nenhum
              </button>
            </div>
          </div>
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {groups.length === 0 && (
              <span className="px-1 py-2 text-xs text-primary-gold/40">
                Nada encontrado.
              </span>
            )}
            {groups.map((g) => (
              <div key={g.type} className="flex flex-col">
                <span className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-gold/40">
                  {g.type}
                </span>
                {g.items.map((it) => {
                  const on = show && !skipSet.has(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(it.id)}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-primary-gold/5"
                    >
                      {box(on ? "on" : "off")}
                      {/* Preço numa linha pequena embaixo (os longos, tipo "Broto … / Grande …", não cabem do lado) */}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={`text-xs leading-snug ${on ? "text-primary-gold" : "text-primary-gold/50"}`}>{it.name}</span>
                        {it.value && (
                          <span className="truncate text-[11px] leading-snug text-primary-gold/35" title={it.value}>
                            {it.value}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Group({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">
          {title}
        </span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function PDFPage() {
  const [raw, setRaw] = useState<Raw | null>(null);
  /** O que está marcado na tela. */
  const [opts, setOpts] = useState<PdfOptions>(DEFAULT_OPTIONS);
  /** O que está no PDF gerado (null até ler o salvo). */
  const [applied, setApplied] = useState<PdfOptions | null>(null);
  const [auto, setAuto] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);
  const run = useRef(0);
  const urlRef = useRef<string | null>(null);

  const pub = usePubInfo();
  const { addAlert } = useAlert();
  const router = useRouter();

  // Personalização salva neste navegador; o 1º PDF já sai com ela
  useEffect(() => {
    let saved = DEFAULT_OPTIONS;
    try {
      const rawOpts = localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (rawOpts) saved = loadSavedOptions(JSON.parse(rawOpts));
      setAuto(localStorage.getItem(AUTO_STORAGE_KEY) === "1");
    } catch {
      // sem acesso ao armazenamento: fica o padrão
    }
    setOpts(saved);
    setApplied(saved);
  }, []);
  useEffect(() => {
    if (!applied) return;
    try {
      localStorage.setItem(
        OPTIONS_STORAGE_KEY,
        JSON.stringify(optionsToSave(opts)),
      );
      localStorage.setItem(AUTO_STORAGE_KEY, auto ? "1" : "0");
    } catch {
      // ignora
    }
  }, [opts, auto, applied]);

  const set = <K extends keyof PdfOptions>(key: K, value: PdfOptions[K]) =>
    setOpts((o) => ({ ...o, [key]: value }));
  const dirty = !!applied && !same(opts, applied);
  const apply = () => setApplied(opts);

  // "Atualizar sozinho": aplica depois de uma pausa curta (vários cliques seguidos viram uma geração só)
  useEffect(() => {
    if (!auto || !dirty) return;
    const timer = setTimeout(() => setApplied(opts), 450);
    return () => clearTimeout(timer);
  }, [auto, dirty, opts]);

  useEffect(() => {
    (async () => {
      try {
        const [typesOrder, items, combos, infos, descriptions] =
          await Promise.all([
            TypesOrderRepository.getAll(),
            MenuItemRepository.getAll(),
            ComboRepository.getAll(),
            InfoRepository.getAll(),
            DescriptionRepository.getAll(),
          ]);
        setRaw({ items, combos, infos, descriptions, typesOrder });
      } catch (error) {
        addAlert(`Erro ao carregar o cardápio: ${error}`);
        setStatus({
          kind: "error",
          message: `Não carregou o cardápio (${error instanceof Error ? error.message : String(error)}).`,
        });
      }
    })();
  }, []);

  // O que aparece na tela (do que está marcado)
  const model = useMemo(
    () =>
      raw
        ? buildMenuModel({
            ...raw,
            includeHidden: opts.showHidden,
            skipHidden: new Set(opts.hiddenSkip),
          })
        : null,
    [raw, opts.showHidden, opts.hiddenSkip],
  );
  const filtered = useMemo(
    () => (model ? applyOptions(model, opts) : null),
    [model, opts],
  );
  const hiddenItems = useMemo<HiddenItem[]>(
    () =>
      (raw?.items ?? [])
        .filter((i) => !i.isVisible && i.id && i.name?.trim())
        .map((i) => ({
          id: i.id!,
          name: i.name.trim(),
          type: i.type || "Sem categoria",
          value: i.value?.trim() ?? "",
        })),
    [raw],
  );
  const typeOrder = (type: string) =>
    raw?.typesOrder.find((t) => t.type.name === type)?.type.order ?? 999;
  const nothingMarked =
    !!filtered && isEmpty(filtered) && !opts.rules && !opts.backPage;

  // O que vai para o PDF (do que foi aplicado)
  const pdfModel = useMemo(
    () =>
      raw && applied
        ? applyOptions(
            buildMenuModel({
              ...raw,
              includeHidden: applied.showHidden,
              skipHidden: new Set(applied.hiddenSkip),
            }),
            applied,
          )
        : null,
    [raw, applied],
  );

  useEffect(() => {
    if (!pdfModel || !applied) return;
    const me = ++run.current;
    if (isEmpty(pdfModel) && !applied.rules && !applied.backPage) {
      setStatus({ kind: "empty" });
      return;
    }
    setStatus({ kind: "working", step: null });
    generateMenuPdf({
      model: pdfModel,
      opts: applied,
      pub,
      onStep: (step) =>
        run.current === me && setStatus({ kind: "working", step }),
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
  }, [pdfModel, applied, pub, attempt]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const working = status.kind === "working" || (status.kind === "idle" && !raw);
  const ready = status.kind === "ready" ? status : null;
  const canDownload = !!ready && !dirty;
  const isDefault = same(opts, DEFAULT_OPTIONS);

  const stepText = useMemo(() => {
    if (status.kind !== "working" || !status.step) return "Preparando…";
    if (status.step.phase === "fotos")
      return status.step.total
        ? `Preparando as fotos (${status.step.done} de ${status.step.total})…`
        : "Preparando as fotos…";
    return "Montando as páginas…";
  }, [status]);

  const sizeText = ready
    ? ready.size > 1024 * 1024
      ? `${(ready.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
      : `${Math.round(ready.size / 1024)} KB`
    : "";

  const hidden = new Set(opts.hidden);
  const toggleCategory = (title: string, on: boolean) =>
    set(
      "hidden",
      on ? opts.hidden.filter((h) => h !== title) : [...opts.hidden, title],
    );
  const list = opts.style === "list";

  const disabledLink = "pointer-events-none opacity-40";

  return (
    <div className="flex min-h-full flex-col items-center text-primary-gold">
      {!raw && status.kind !== "error" && <LoaderFullscreen />}

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
                ? `${model.itemCount} ${opts.showHidden ? "itens (com os ocultos)" : "itens visíveis"}`
                : `${filtered.itemCount} de ${model.itemCount} itens`}
            </span>
          )}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Opções */}
          <aside className="flex flex-col gap-5 rounded-xl border border-primary-gold/15 bg-secondary-black/60 p-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
            {/* Ações */}
            <div className="flex flex-col gap-2">
              {dirty ? (
                <button
                  type="button"
                  onClick={apply}
                  disabled={nothingMarked}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#f0d382] to-primary-gold px-4 py-2 text-sm font-semibold text-primary-black shadow-[0_8px_20px_-8px_rgba(230,197,107,0.6)] transition-all hover:brightness-105 disabled:cursor-default disabled:opacity-50"
                >
                  <LuRefreshCw size={15} /> Atualizar o PDF
                </button>
              ) : null}
              <div className="flex items-center gap-2">
                <a
                  href={canDownload ? ready?.url : undefined}
                  download={FILE_NAME}
                  aria-disabled={!canDownload}
                  onClick={(e) => !canDownload && e.preventDefault()}
                  title={
                    dirty
                      ? "Atualize o PDF para baixar com as mudanças"
                      : undefined
                  }
                  className={`flex flex-[2] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    dirty
                      ? "border border-primary-gold/30 text-primary-gold/70"
                      : "bg-gradient-to-b from-[#f0d382] to-primary-gold text-primary-black shadow-[0_8px_20px_-8px_rgba(230,197,107,0.6)]"
                  } ${canDownload ? "cursor-pointer hover:brightness-105" : disabledLink}`}
                >
                  {working && !dirty ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-black/25 border-t-primary-black" />
                  ) : (
                    <LuDownload size={15} />
                  )}
                  Baixar PDF
                </a>
                <a
                  href={canDownload ? ready?.url : undefined}
                  target="_blank"
                  rel="noopener"
                  aria-disabled={!canDownload}
                  onClick={(e) => !canDownload && e.preventDefault()}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary-gold/20 px-3 py-2 text-sm text-primary-gold/70 transition-all ${
                    canDownload
                      ? "cursor-pointer hover:border-primary-gold/50 hover:text-primary-gold"
                      : disabledLink
                  }`}
                  title="Abre o PDF numa aba nova (dali dá para imprimir)"
                >
                  <LuExternalLink size={15} /> Abrir
                </a>
              </div>
              <div
                className="flex min-h-5 items-center gap-2 text-xs text-primary-gold/55"
                aria-live="polite"
              >
                {nothingMarked ? (
                  <span>
                    Nada para mostrar: marque pelo menos uma parte ou categoria.
                  </span>
                ) : dirty ? (
                  <span className="text-primary-gold/75">
                    Há mudanças ainda não aplicadas no PDF.
                  </span>
                ) : working ? (
                  <>
                    <Loader />
                    <span>{stepText}</span>
                  </>
                ) : ready ? (
                  <span>
                    Pronto · {ready.pages}{" "}
                    {ready.pages === 1 ? "página" : "páginas"} · {sizeText}
                  </span>
                ) : null}
              </div>
              <div className="-mx-2">
                <Check
                  small
                  checked={auto}
                  onChange={setAuto}
                  label="Atualizar sozinho a cada mudança"
                />
              </div>
            </div>

            {/* Aparência */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Segmented
                label="Estilo"
                value={opts.style}
                onChange={(v) => set("style", v)}
                disabled={!raw}
                options={[
                  { value: "cards", label: "Cards com foto" },
                  { value: "list", label: "Lista clássica" },
                ]}
              />
              <Segmented
                label="Tamanho da letra"
                value={opts.fontSize}
                onChange={(v) => set("fontSize", v)}
                disabled={!raw}
                options={FONT_SIZES.map((f) => ({
                  value: f.value,
                  title: f.label,
                  label: (
                    <span
                      className="font-serif leading-none"
                      style={{ fontSize: f.px }}
                    >
                      A
                    </span>
                  ),
                }))}
              />
              <Segmented
                label="Fundo"
                value={opts.theme}
                onChange={(v) => set("theme", v)}
                disabled={!raw}
                options={[
                  { value: "black", label: "Preto" },
                  { value: "white", label: "Branco (menos tinta)" },
                ]}
              />
              <Segmented
                label="Papel"
                value={opts.paper}
                onChange={(v) => set("paper", v)}
                disabled={!raw}
                options={[
                  { value: "A4", label: "A4" },
                  { value: "A5", label: "A5 (meia folha)" },
                ]}
              />
              <Segmented
                label="Seções"
                value={opts.sectionPerPage ? "page" : "flow"}
                onChange={(v) => set("sectionPerPage", v === "page")}
                disabled={!raw}
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
                    <React.Fragment key={o.key}>
                      <Check
                        label={o.label}
                        hint={
                          o.key === "toc" && !opts.cover && opts.toc
                            ? "Sem capa, vai no começo da 1ª página"
                            : o.key === "masthead" && opts.cover
                              ? "Só aparece quando está sem capa"
                              : o.hint
                        }
                        checked={
                          o.key === "masthead"
                            ? opts.masthead && !opts.cover
                            : opts[o.key]
                        }
                        onChange={(v) => set(o.key, v)}
                        disabled={
                          !model ||
                          (o.key === "masthead" && opts.cover) ||
                          (o.key === "infos" && !model.infos.length) ||
                          (o.key === "combos" && !model.combos.length)
                        }
                      />
                      {o.key === "qr" && opts.qr && (
                        <QrLinkField
                          value={opts.qrUrl}
                          fallback={defaultQrUrl(pub.website)}
                          onChange={(v) => set("qrUrl", v)}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </Group>

              <Group title="Nos itens">
                <div className="-mx-2 flex flex-col">
                  {ITEM_PARTS.map((o) =>
                    o.key === "showHidden" ? (
                      <HiddenItemsPicker
                        key={o.key}
                        items={hiddenItems}
                        typeOrder={typeOrder}
                        show={opts.showHidden}
                        skip={opts.hiddenSkip}
                        onChange={(show, skip) =>
                          setOpts((cur) => ({
                            ...cur,
                            showHidden: show,
                            hiddenSkip: skip,
                          }))
                        }
                        disabled={!model}
                      />
                    ) : (
                      <Check
                        key={o.key}
                        label={o.label}
                        hint={o.key === "photos" && list ? "A lista clássica não usa fotos" : o.hint}
                        checked={
                          o.key === "photos"
                            ? opts.photos && !list
                            : opts[o.key]
                        }
                        onChange={(v) => set(o.key, v)}
                        disabled={!model || (o.key === "photos" && list)}
                      />
                    ),
                  )}
                </div>
              </Group>
            </div>

            <Group
              title="Bordas"
              aside={
                <div className="flex items-center gap-1.5 text-[11px] text-primary-gold/40">
                  Todas:
                  {FRAME_STYLES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        set("frames", {
                          cover: st,
                          content: st,
                          rules: st,
                          back: st,
                        })
                      }
                      className="cursor-pointer text-primary-gold/50 hover:text-primary-gold"
                    >
                      {FRAME_LABEL[st]}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="flex flex-col gap-2">
                {(
                  [
                    {
                      page: "cover",
                      label: "Capa",
                      off: !opts.cover,
                      offHint: "A capa está desligada",
                    },
                    {
                      page: "content",
                      label: "Páginas dos itens",
                      off: false,
                      offHint: "",
                    },
                    {
                      page: "rules",
                      label: "Regulamento",
                      off: !opts.rules,
                      offHint: "O regulamento está desligado",
                    },
                    {
                      page: "back",
                      label: "Verso",
                      off: !opts.backPage,
                      offHint: "O verso está desligado",
                    },
                  ] as {
                    page: FramePage;
                    label: string;
                    off: boolean;
                    offHint: string;
                  }[]
                ).map((row) => (
                  <FrameRow
                    key={row.page}
                    label={row.label}
                    value={opts.frames[row.page]}
                    onChange={(v) =>
                      set("frames", { ...opts.frames, [row.page]: v })
                    }
                    disabled={!raw || row.off}
                    hint={row.off ? row.offHint : undefined}
                  />
                ))}
              </div>
            </Group>

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
                      onClick={() =>
                        set(
                          "hidden",
                          model.sections.map((s) => s.title),
                        )
                      }
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
                        <span
                          className={
                            on ? "text-primary-gold/55" : "text-primary-gold/30"
                          }
                        >
                          {s.count}
                        </span>
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
                  <code className="break-all text-red-100">
                    {status.message}
                  </code>
                  <br />
                  <span className="text-red-200/60">
                    {typeof navigator !== "undefined" ? browserLabel() : ""}
                  </span>
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
                  className={`h-full w-full transition-opacity ${dirty || working ? "opacity-40" : ""}`}
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
              {/* Aviso de mudanças pendentes, por cima da pré-visualização */}
              {(dirty || (ready && working)) && (
                <div className="absolute inset-x-0 top-0 flex items-center justify-center p-4">
                  <div className="flex items-center gap-3 rounded-xl border border-primary-gold/30 bg-primary-black/90 px-4 py-2.5 text-sm shadow-xl backdrop-blur">
                    {dirty ? (
                      <>
                        <span className="text-primary-gold/80">
                          {auto
                            ? "Atualizando…"
                            : "Esta pré-visualização está desatualizada"}
                        </span>
                        {!auto && (
                          <button
                            type="button"
                            onClick={apply}
                            disabled={nothingMarked}
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary-gold px-3 py-1.5 text-xs font-semibold text-primary-black hover:brightness-105 disabled:opacity-50"
                          >
                            <LuRefreshCw size={13} /> Atualizar o PDF
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <Loader />
                        <span className="text-primary-gold/80">{stepText}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs leading-relaxed text-primary-gold/45 lg:hidden">
              No celular, toque em{" "}
              <strong className="text-primary-gold/70">Abrir</strong> para ver o
              PDF ou em{" "}
              <strong className="text-primary-gold/70">Baixar PDF</strong> para
              salvar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
