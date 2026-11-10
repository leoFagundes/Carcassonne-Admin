"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  LuBold,
  LuCircleHelp,
  LuHeading2,
  LuHighlighter,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuQuote,
  LuStrikethrough,
  LuUnderline,
} from "react-icons/lu";
import RichText from "./richText";

/**
 * Campo de texto com barra de formatação (negrito, itálico, sublinhado,
 * riscado, destaque, link, subtítulo, listas e aviso). As marcações podem ser
 * combinadas: selecione um trecho já formatado e aplique outra.
 * Atalhos: Ctrl+B, Ctrl+I, Ctrl+U e Ctrl+K (link).
 */
export default function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  rows = 6,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  id?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [help, setHelp] = useState(false);
  const [preview, setPreview] = useState(true);

  /** Troca o trecho [start, end] e seleciona [selStart, selEnd] depois. */
  const apply = (next: string, selStart: number, selEnd: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  const wrap = (open: string, close = open, fallback = "texto") => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e);
    // Já está envolvido por esse marcador? Tira (liga/desliga).
    if (selected && value.slice(s - open.length, s) === open && value.slice(e, e + close.length) === close) {
      const next = value.slice(0, s - open.length) + selected + value.slice(e + close.length);
      apply(next, s - open.length, e - open.length);
      return;
    }
    const inner = selected || fallback;
    const next = value.slice(0, s) + open + inner + close + value.slice(e);
    apply(next, s + open.length, s + open.length + inner.length);
  };

  const link = () => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const text = value.slice(s, e) || "texto do link";
    const url = "https://";
    const piece = `[${text}](${url})`;
    const next = value.slice(0, s) + piece + value.slice(e);
    // Seleciona o endereço para já digitar por cima
    const urlStart = s + text.length + 3;
    apply(next, urlStart, urlStart + url.length);
  };

  /** Prefixo em cada linha selecionada (liga/desliga). `numbered` numera 1., 2., … */
  const linePrefix = (prefix: string, numbered = false) => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const nl = value.indexOf("\n", e);
    const lineEnd = nl === -1 ? value.length : nl;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const re = numbered ? /^\d+[.)]\s+/ : new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    const allHave = lines.every((l) => re.test(l));
    const changed = lines
      .map((l, i) => (allHave ? l.replace(re, "") : `${numbered ? `${i + 1}. ` : prefix}${l.replace(/^(\d+[.)]|[-•>]|#{1,3})\s+/, "")}`))
      .join("\n");
    const next = value.slice(0, lineStart) + changed + value.slice(lineEnd);
    apply(next, lineStart, lineStart + changed.length);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    const action = { b: () => wrap("**"), i: () => wrap("*"), u: () => wrap("__"), k: link }[key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const tools: { label: string; icon: ReactNode; run: () => void; sep?: boolean }[] = [
    { label: "Negrito (Ctrl+B)", icon: <LuBold size={15} />, run: () => wrap("**") },
    { label: "Itálico (Ctrl+I)", icon: <LuItalic size={15} />, run: () => wrap("*") },
    { label: "Sublinhado (Ctrl+U)", icon: <LuUnderline size={15} />, run: () => wrap("__") },
    { label: "Riscado", icon: <LuStrikethrough size={15} />, run: () => wrap("~~") },
    { label: "Destaque (marca-texto)", icon: <LuHighlighter size={15} />, run: () => wrap("==") },
    { label: "Link (Ctrl+K)", icon: <LuLink size={15} />, run: link, sep: true },
    { label: "Subtítulo", icon: <LuHeading2 size={15} />, run: () => linePrefix("## "), sep: true },
    { label: "Lista", icon: <LuList size={15} />, run: () => linePrefix("- ") },
    { label: "Lista numerada", icon: <LuListOrdered size={15} />, run: () => linePrefix("", true) },
    { label: "Aviso em destaque", icon: <LuQuote size={15} />, run: () => linePrefix("> ") },
  ];

  const btn =
    "flex items-center justify-center w-8 h-8 rounded-lg text-primary-gold/70 hover:text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer";

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="text-[11px] text-primary-gold/55 hover:text-primary-gold underline-offset-2 hover:underline cursor-pointer"
          >
            {preview ? "Esconder prévia" : "Mostrar prévia"}
          </button>
          <button
            type="button"
            onClick={() => setHelp((v) => !v)}
            aria-expanded={help}
            title="Como formatar"
            className={`${btn} !w-7 !h-7`}
          >
            <LuCircleHelp size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-primary-gold/20 bg-primary-black/55 focus-within:border-primary-gold/60 transition-colors overflow-hidden">
        <div role="toolbar" aria-label="Formatação" className="flex flex-wrap items-center gap-0.5 border-b border-primary-gold/10 px-1.5 py-1">
          {tools.map((t) => (
            <span key={t.label} className="flex items-center">
              {t.sep && <span aria-hidden="true" className="mx-1 h-5 w-px bg-primary-gold/15" />}
              <button
                type="button"
                title={t.label}
                aria-label={t.label}
                // Não tira o foco do texto (mantém a seleção)
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.run}
                className={btn}
              >
                {t.icon}
              </button>
            </span>
          ))}
        </div>
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full resize-y bg-transparent px-3 py-2.5 text-sm text-primary-gold placeholder:text-primary-gold/30 outline-none leading-relaxed"
        />
      </div>

      {help && (
        <div className="rounded-lg border border-primary-gold/15 bg-primary-black/40 p-3 text-[11px] leading-relaxed text-primary-gold/70">
          <p className="mb-1 font-semibold text-primary-gold/85">
            Selecione o texto e clique num botão. Dá para combinar (ex.: negrito + destaque).
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
            <li>**negrito**</li>
            <li>*itálico*</li>
            <li>__sublinhado__</li>
            <li>~~riscado~~</li>
            <li>==destaque==</li>
            <li>[texto](https://site.com)</li>
            <li>## Subtítulo</li>
            <li>- item de lista</li>
            <li>1. item numerado</li>
            <li>&gt; aviso em destaque</li>
          </ul>
          <p className="mt-1">Linha em branco separa parágrafos. Links aceitam https://, páginas do site (/aluguel), e-mail e telefone.</p>
        </div>
      )}

      {preview && value.trim() && (
        <div className="rounded-lg bg-secondary-black/60 border border-primary-gold/10 p-3 text-sm text-primary-white/90">
          <span className="block text-[10px] uppercase tracking-widest text-primary-gold/50 mb-1.5">Prévia</span>
          <RichText text={value} className="leading-relaxed" />
        </div>
      )}
    </div>
  );
}
