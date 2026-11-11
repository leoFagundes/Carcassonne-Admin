"use client";

import type { ReactNode } from "react";
import { InfoToggle } from "../carcassonne/settings-ui";

// Peças das configurações do aluguel: cartão de seção, liga/desliga, escolha
// em pílulas e uma linha de explicação. Mesmo visual em todas as seções.

/** Cartão de uma seção: ícone, título, uma frase do que faz e o "i" com a explicação longa. */
export function SettingsSection({
  id,
  icon,
  title,
  summary,
  info,
  aside,
  children,
}: {
  id?: string;
  /** Posição da seção na página (não aparece mais na tela). */
  n?: number;
  icon: ReactNode;
  title: string;
  /** Uma frase: o que esta seção decide. */
  summary: string;
  /** Explicação completa (abre no "i"). */
  info?: ReactNode;
  /** À direita do título (ex.: situação da integração). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-4 flex flex-col gap-4 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-4 sm:p-5 min-w-0"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-gold/25 bg-gradient-to-br from-primary-gold/15 to-primary-gold/[0.03] text-primary-gold">
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-primary-gold">{title}</h3>
            {info && <InfoToggle title={title}>{info}</InfoToggle>}
            {aside && <span className="ml-auto">{aside}</span>}
          </div>
          <p className="text-xs leading-relaxed text-primary-gold/50">{summary}</p>
        </div>
      </header>
      <div className="flex flex-col gap-4 min-w-0">{children}</div>
    </section>
  );
}

/** Liga/desliga de linha inteira: título, situação explicada e a chave. */
export function ToggleRow({
  checked,
  onChange,
  title,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-primary-gold/45 bg-primary-gold/[0.07]"
          : "border-primary-gold/15 hover:border-primary-gold/35"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary-gold" : "bg-primary-gold/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-primary-black transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`text-sm font-medium ${checked ? "text-primary-gold" : "text-primary-gold/80"}`}>{title}</span>
        {description && <span className="text-xs leading-relaxed text-primary-gold/50">{description}</span>}
      </span>
    </button>
  );
}

/** Escolha única em pílulas (ex.: antes / depois / os dois). */
export function PillChoice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  multi,
}: {
  label?: string;
  options: { value: T; label: string }[];
  value: T | T[];
  onChange: (value: T) => void;
  /** Várias ao mesmo tempo (ex.: dias da semana). */
  multi?: boolean;
}) {
  const isOn = (v: T) => (multi && Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className="flex flex-col gap-1.5">
      {label && <SubLabel>{label}</SubLabel>}
      <div className="flex flex-wrap gap-1.5" role={multi ? "group" : "radiogroup"} aria-label={label}>
        {options.map((o) => {
          const on = isOn(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`min-w-[44px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                on
                  ? "border-primary-gold bg-primary-gold text-primary-black"
                  : "border-primary-gold/20 text-primary-gold/60 hover:border-primary-gold/50 hover:text-primary-gold"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SubLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/65">{children}</span>
  );
}

/** Frase curta abaixo de um campo (o exemplo ou o efeito da escolha). */
export function FieldNote({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "box" }) {
  return tone === "box" ? (
    <p className="rounded-xl bg-primary-gold/[0.05] px-3 py-2 text-xs leading-relaxed text-primary-gold/75">{children}</p>
  ) : (
    <p className="-mt-2 text-[11px] leading-relaxed text-primary-gold/45">{children}</p>
  );
}

/** Divisória com título dentro de uma seção. */
export function SubBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-primary-gold/10 pt-4">
      <SubLabel>{title}</SubLabel>
      {children}
    </div>
  );
}
