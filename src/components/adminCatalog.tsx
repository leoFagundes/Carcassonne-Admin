"use client";

import "@/components/showcase/showcase.css";
import { ReactNode, useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuChevronDown, LuLayoutGrid, LuList, LuSearch, LuX } from "react-icons/lu";
import Tooltip from "@/components/Tooltip";

// Peças das páginas de catálogo do admin (acervo e cardápio): busca,
// filtros em pílulas, grade/lista, botões rápidos e esqueleto. Práticas e
// rápidas — sem animação além do necessário.

export type CatalogView = "grid" | "list";

/** Grade ou lista, lembrando a última escolha neste aparelho. */
export function useCatalogView(storageKey: string): [CatalogView, (view: CatalogView) => void] {
  const [view, setView] = useState<CatalogView>("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // sem armazenamento: começa na grade
    }
  }, [storageKey]);

  const change = (next: CatalogView) => {
    setView(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // segue sem guardar
    }
  };

  return [view, change];
}

/** Campo de busca. A tecla "/" foca o campo de qualquer lugar; Esc limpa. */
export function CatalogSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <label className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-xl bg-primary-black/50 border border-primary-gold/20 focus-within:border-primary-gold/55 transition-colors">
      <LuSearch size={16} className="text-primary-gold/50 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("");
        }}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm text-primary-gold placeholder:text-primary-gold/35"
      />
      {value ? (
        <button
          type="button"
          aria-label="Limpar a busca"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="text-primary-gold/45 hover:text-primary-gold transition-colors cursor-pointer"
        >
          <LuX size={15} />
        </button>
      ) : (
        <kbd
          title="Aperte / para buscar"
          className="hidden sm:flex items-center justify-center w-5 h-5 rounded border border-primary-gold/20 text-[10px] text-primary-gold/40 font-sans"
        >
          /
        </kbd>
      )}
    </label>
  );
}

/** Grade ou lista. */
export function ViewToggle({
  view,
  onChange,
}: {
  view: CatalogView;
  onChange: (view: CatalogView) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Visualização"
      className="relative flex h-10 p-1 shrink-0 rounded-xl border border-primary-gold/20 bg-primary-black/50"
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 w-8 rounded-lg border border-primary-gold/45 bg-primary-gold/15 transition-transform duration-200 ease-out"
        style={{ transform: view === "list" ? "translateX(2rem)" : "none" }}
      />
      {(
        [
          { value: "grid", label: "Grade", Icon: LuLayoutGrid },
          { value: "list", label: "Lista", Icon: LuList },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={`relative z-[1] flex items-center justify-center w-8 transition-colors cursor-pointer ${
            view === value ? "text-primary-gold" : "text-primary-gold/40 hover:text-primary-gold/75"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

export interface PillOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: IconType;
}

/** Opções em pílulas (uma escolhida por vez), com a contagem de cada uma. */
export function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
  scroll = false,
}: {
  label: string;
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Muitas opções: rolam de lado em vez de quebrar linha. */
  scroll?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
      <span className="sm:w-20 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-primary-gold/40">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className={`flex gap-1.5 min-w-0 ${
          scroll
            ? "overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,#000_92%,transparent)] pr-6"
            : "flex-wrap"
        }`}
      >
        {options.map(({ value: optionValue, label: optionLabel, count, icon: Icon }) => {
          const active = optionValue === value;
          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(optionValue)}
              className={`flex items-center gap-1.5 h-8 px-3 shrink-0 rounded-full border text-xs whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? "border-primary-gold/60 bg-primary-gold/15 text-primary-gold font-semibold"
                  : "border-primary-gold/15 text-primary-gold/60 hover:border-primary-gold/40 hover:text-primary-gold"
              }`}
            >
              {Icon && <Icon size={12} />}
              {optionLabel}
              {count !== undefined && (
                <span className={`tabular-nums ${active ? "text-primary-gold/70" : "text-primary-gold/35"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Botão rápido de liga/desliga (visível, destaque, vegano...). Não abre o item. */
export function QuickToggle({
  active,
  icon: Icon,
  activeIcon,
  label,
  onToggle,
}: {
  active: boolean;
  icon: IconType;
  /** Ícone quando ligado (se for diferente). */
  activeIcon?: IconType;
  /** O que o botão faz agora (ex: "Ocultar do site"). */
  label: string;
  onToggle: () => void;
}) {
  const Shown = active && activeIcon ? activeIcon : Icon;
  return (
    <Tooltip direction="top" content={label} portal>
      <button
        type="button"
        aria-pressed={active}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer ${
          active
            ? "border-primary-gold/45 bg-primary-gold/15 text-primary-gold"
            : "border-primary-gold/10 text-primary-gold/30 hover:text-primary-gold/75 hover:border-primary-gold/35"
        }`}
      >
        <Shown size={15} />
      </button>
    </Tooltip>
  );
}

/** Etiqueta pequena sobre a foto (Oculto, Destaque, À venda...). */
export function CatalogBadge({
  icon: Icon,
  children,
  tone = "dark",
}: {
  icon: IconType;
  children: ReactNode;
  tone?: "dark" | "gold";
}) {
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
        tone === "gold"
          ? "bg-primary-gold text-primary-black"
          : "bg-primary-black/80 text-primary-gold/85 border border-primary-gold/25 backdrop-blur-sm"
      }`}
    >
      <Icon size={10} />
      {children}
    </span>
  );
}

/** Título de seção que recolhe/abre (com a quantidade de itens). */
export function CatalogSection({
  title,
  count,
  icon: Icon,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  icon?: IconType;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group flex items-center gap-2.5 w-full text-left cursor-pointer"
      >
        {Icon && <Icon size={15} className="text-primary-gold/60 shrink-0" />}
        <span className="text-sm font-semibold uppercase tracking-wider text-primary-gold/85">
          {title}
        </span>
        <span className="px-1.5 rounded-md bg-primary-gold/10 text-[11px] tabular-nums text-primary-gold/60">
          {count}
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-primary-gold/25 to-transparent" />
        <LuChevronDown
          size={16}
          className={`shrink-0 text-primary-gold/40 group-hover:text-primary-gold transition-transform duration-200 ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>
      {!collapsed && children}
    </section>
  );
}

/** Container dos itens na visão escolhida. */
export function CatalogItems({ view, children }: { view: CatalogView; children: ReactNode }) {
  return (
    <div
      className={
        view === "grid"
          ? "grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3"
          : "flex flex-col gap-1.5"
      }
    >
      {children}
    </div>
  );
}

/** Nada encontrado (com atalho para limpar os filtros). */
export function CatalogEmpty({
  icon: Icon,
  title,
  onClear,
}: {
  icon: IconType;
  title: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span className="flex items-center justify-center w-12 h-12 rounded-full border border-primary-gold/20 bg-secondary-black/60 text-primary-gold/45">
        <Icon size={20} />
      </span>
      <span className="text-sm text-primary-gold/60">{title}</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 h-8 px-3 rounded-full border border-primary-gold/30 text-xs text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 transition-colors cursor-pointer"
        >
          Limpar busca e filtros
        </button>
      )}
    </div>
  );
}

/** Esqueleto enquanto os itens carregam. */
export function CatalogSkeleton({ view, count = 12 }: { view: CatalogView; count?: number }) {
  return (
    <CatalogItems view={view}>
      {Array.from({ length: count }, (_, index) =>
        view === "grid" ? (
          <div
            key={index}
            aria-hidden="true"
            className="flex flex-col rounded-xl border border-primary-gold/10 bg-secondary-black/40 overflow-hidden"
          >
            <span className="cm-skel w-full aspect-[4/3]" />
            <div className="flex flex-col gap-2 p-2.5">
              <span className="cm-skel h-3.5 w-4/5 rounded" />
              <span className="cm-skel h-3 w-1/2 rounded" />
              <span className="cm-skel h-7 w-2/3 rounded-lg mt-1" />
            </div>
          </div>
        ) : (
          <div
            key={index}
            aria-hidden="true"
            className="flex items-center gap-3 p-2 rounded-xl border border-primary-gold/10 bg-secondary-black/40"
          >
            <span className="cm-skel w-12 h-12 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <span className="cm-skel h-3.5 w-2/5 rounded" />
              <span className="cm-skel h-3 w-1/4 rounded" />
            </div>
            <span className="cm-skel h-8 w-24 rounded-lg" />
          </div>
        ),
      )}
    </CatalogItems>
  );
}
