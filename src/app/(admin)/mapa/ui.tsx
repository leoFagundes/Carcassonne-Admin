"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";

/** Botões lado a lado (um escolhido). */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { id: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-primary-gold/20 bg-primary-black/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-[10px] font-semibold transition-colors ${
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          } ${value === o.id ? "bg-primary-gold text-primary-black" : "text-primary-gold/65 hover:text-primary-gold"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Botão compacto do painel. */
export function Btn({
  children,
  onClick,
  tone = "default",
  disabled,
  title,
  active,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
  title?: string;
  active?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const tones = {
    default: "border-primary-gold/25 bg-primary-gold/[0.06] text-primary-gold/85 hover:border-primary-gold/55 hover:text-primary-gold",
    primary: "border-primary-gold bg-primary-gold text-primary-black hover:bg-primary-gold/90",
    danger: "border-invalid-color/40 bg-invalid-color/10 text-invalid-color hover:border-invalid-color/70",
    ghost: "border-transparent text-primary-gold/65 hover:text-primary-gold hover:bg-primary-gold/[0.06]",
  };
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        active ? "border-primary-gold bg-primary-gold/20 text-primary-gold" : tones[tone]
      } ${className}`}
    >
      {children}
    </button>
  );
}

const fieldCls =
  "w-full min-w-0 rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-sm text-primary-gold outline-none transition-colors placeholder:text-primary-gold/30 focus:border-primary-gold/60";

/** Número que só vale ao sair do campo ou apertar Enter (um passo de desfazer por mudança). */
export function NumberField({
  label,
  value,
  onCommit,
  step = 0.05,
  min,
  max,
  suffix,
  decimals = 2,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  decimals?: number;
}) {
  const fmt = (v: number) => (decimals ? v.toFixed(decimals).replace(".", ",") : String(Math.round(v)));
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);
  const commit = () => {
    const n = Number(text.replace(",", ".").trim());
    if (!Number.isFinite(n)) {
      setText(fmt(value));
      return;
    }
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    v = decimals ? Math.round(v * 10 ** decimals) / 10 ** decimals : Math.round(v);
    setText(fmt(v));
    if (v !== value) onCommit(v);
  };
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">{label}</span>
      <span className="relative flex items-center">
        <input
          inputMode="decimal"
          className={`${fieldCls} ${suffix ? "pr-7" : ""}`}
          value={text}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setText(fmt(value));
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const n = Number(text.replace(",", ".")) || 0;
              const next = n + (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1);
              setText(fmt(next));
            }
          }}
        />
        {suffix && <span className="pointer-events-none absolute right-2 text-[11px] text-primary-gold/40">{suffix}</span>}
      </span>
    </label>
  );
}

/** Texto que só vale ao sair do campo ou apertar Enter. */
export function TextField({
  label,
  value,
  onCommit,
  placeholder,
  maxLength = 60,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  const commit = () => {
    const v = text.trim();
    if (v !== value) onCommit(v);
  };
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">{label}</span>
      <input
        className={fieldCls}
        value={text}
        maxLength={maxLength}
        placeholder={placeholder}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setText(value);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">{label}</span>
      <select className={fieldCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-primary-black">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Bloco do painel. Com `collapse`, o título abre e fecha o bloco e o mapa
 * lembra como você deixou (neste aparelho).
 */
export function Section({
  title,
  children,
  aside,
  collapse,
  summary,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  collapse?: { id: string; defaultOpen?: boolean };
  /** Resumo mostrado quando o bloco está fechado. */
  summary?: ReactNode;
}) {
  const key = collapse ? `fp-section-${collapse.id}` : "";
  const [open, setOpen] = useState(collapse ? collapse.defaultOpen ?? true : true);
  useEffect(() => {
    if (!key) return;
    try {
      const v = localStorage.getItem(key);
      if (v !== null) setOpen(v === "1");
    } catch {
      /* sem armazenamento */
    }
  }, [key]);
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(key, o ? "0" : "1");
      } catch {
        /* sem armazenamento */
      }
      return !o;
    });
  };
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 p-3">
      <header className="flex items-center justify-between gap-2">
        {collapse ? (
          <button type="button" onClick={toggle} aria-expanded={open} className="group flex min-w-0 flex-1 items-center gap-1.5 text-left">
            <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden="true" className={`shrink-0 text-primary-gold/50 transition-transform ${open ? "rotate-90" : ""}`}>
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-gold/70 group-hover:text-primary-gold">{title}</h3>
            {!open && summary && <span className="ml-1 min-w-0 truncate text-[11px] font-normal text-primary-gold/45">{summary}</span>}
          </button>
        ) : (
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-gold/70">{title}</h3>
        )}
        {aside}
      </header>
      {open && children}
    </section>
  );
}

/** Confirmação dentro da página (o navegador do admin pode bloquear confirm()). */
export function ConfirmDialog({
  open,
  title,
  children,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  actions: { label: string; tone?: "default" | "primary" | "danger"; onClick: () => void }[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-primary-gold/25 bg-primary-black p-5 shadow-card"
      >
        <h2 className="text-base font-bold text-primary-gold">{title}</h2>
        <div className="text-sm leading-relaxed text-primary-gold/75">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          {actions.map((a) => (
            <Btn key={a.label} tone={a.tone ?? "default"} onClick={a.onClick}>
              {a.label}
            </Btn>
          ))}
        </div>
      </div>
    </div>
  );
}
