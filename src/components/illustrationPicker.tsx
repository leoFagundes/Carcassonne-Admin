"use client";

import { LuCheck } from "react-icons/lu";
import {
  MENU_ILLUSTRATIONS,
  MENU_PLACEHOLDER,
  illustrationSrc,
  isMenuIllustration,
} from "@/utils/menuIllustrations";

/** Tira o campo quando volta ao padrão (o Firestore não aceita `undefined`). */
export function withIllustration<T extends { illustration?: string }>(target: T, id: string | undefined): T {
  const { illustration: _previous, ...rest } = target;
  void _previous;
  return (id ? { ...rest, illustration: id } : rest) as T;
}

/** O que vale sem escolha própria: a imagem geral ou a herdada da categoria. */
export type IllustrationFallback = { src: string; label: string };

export const GENERAL_FALLBACK: IllustrationFallback = { src: MENU_PLACEHOLDER, label: "Imagem geral" };

/** Fallback que uma subcategoria herda da categoria (se ela tiver ilustração). */
export function fallbackFrom(categoryIllustration?: string): IllustrationFallback {
  if (!isMenuIllustration(categoryIllustration)) return GENERAL_FALLBACK;
  const option = MENU_ILLUSTRATIONS.find((o) => o.id === categoryIllustration);
  return { src: illustrationSrc(categoryIllustration), label: `Da categoria (${option?.short ?? ""})` };
}

function describe(value: string | undefined, fallback: IllustrationFallback) {
  const option = isMenuIllustration(value) ? MENU_ILLUSTRATIONS.find((o) => o.id === value) : undefined;
  return option
    ? { src: illustrationSrc(option.id), label: option.label, own: true }
    : { src: fallback.src, label: fallback.label, own: false };
}

/** Miniatura da ilustração atual; tocar abre as opções. */
export function IllustrationThumb({
  value,
  fallback,
  name,
  open,
  onToggle,
  size = "md",
}: {
  value?: string;
  fallback: IllustrationFallback;
  name: string;
  open: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const current = describe(value, fallback);
  const box = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`Imagem dos itens sem foto em ${name}: ${current.label}. Trocar`}
      title={`Itens sem foto: ${current.label}`}
      className={`relative ${box} shrink-0 overflow-hidden rounded-lg border bg-[#191714] transition-colors cursor-pointer ${
        open
          ? "border-primary-gold ring-2 ring-primary-gold/20"
          : current.own
            ? "border-primary-gold/35 hover:border-primary-gold/70"
            : "border-dashed border-primary-gold/25 hover:border-primary-gold/60"
      }`}
    >
      <img src={current.src} alt="" className={`h-full w-full object-cover ${current.own ? "" : "opacity-45"}`} />
    </button>
  );
}

/** Opções de ilustração (Padrão + as oito), em grade. */
export function IllustrationOptions({
  value,
  fallback,
  name,
  onPick,
}: {
  value?: string;
  fallback: IllustrationFallback;
  name: string;
  onPick: (id: string | undefined) => void;
}) {
  const current = isMenuIllustration(value) ? value : undefined;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/15 bg-secondary-black/70 p-3">
      <span className="text-[11px] text-primary-gold/55">
        Imagem dos itens <strong className="font-semibold text-primary-gold/80">sem foto</strong> em {name}
      </span>
      <div role="radiogroup" aria-label={`Imagem dos itens sem foto em ${name}`} className="grid grid-cols-3 gap-2 sm:grid-cols-9">
        <Option label="Padrão" title={`Padrão: ${fallback.label}`} src={fallback.src} faded active={!current} onClick={() => onPick(undefined)} />
        {MENU_ILLUSTRATIONS.map((option) => (
          <Option
            key={option.id}
            label={option.short}
            title={option.label}
            src={illustrationSrc(option.id)}
            active={current === option.id}
            onClick={() => onPick(option.id)}
          />
        ))}
      </div>
    </div>
  );
}

function Option({
  label,
  title,
  src,
  active,
  faded = false,
  onClick,
}: {
  label: string;
  title: string;
  src: string;
  active: boolean;
  faded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      title={title}
      onClick={onClick}
      className="group flex min-w-0 flex-col items-center gap-1 cursor-pointer"
    >
      <span
        className={`relative block aspect-square w-full max-w-[64px] overflow-hidden rounded-lg border bg-[#191714] transition-colors ${
          active ? "border-primary-gold ring-2 ring-primary-gold/25" : "border-primary-gold/15 group-hover:border-primary-gold/50"
        }`}
      >
        <img src={src} alt="" className={`h-full w-full object-cover ${faded ? "opacity-45" : ""}`} />
        {active && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-gold text-primary-black">
            <LuCheck size={10} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={`w-full truncate text-center text-[10px] ${active ? "text-primary-gold" : "text-primary-gold/55"}`}>
        {label}
      </span>
    </button>
  );
}
