"use client";

import { useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";
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

/**
 * Escolha da ilustração de uma categoria do cardápio: um botão com a atual e,
 * aberto, as opções em miniatura. Não deixa o toque virar arraste da lista.
 */
export default function IllustrationPicker({
  value,
  onChange,
  name,
  inherited,
}: {
  value?: string;
  onChange: (id: string | undefined) => void;
  /** Nome da categoria (para a leitura de tela). */
  name: string;
  /** O que vale sem escolha própria (ex.: a da categoria, numa subcategoria). */
  inherited?: { src: string; label: string };
}) {
  const [open, setOpen] = useState(false);
  const current = isMenuIllustration(value) ? MENU_ILLUSTRATIONS.find((o) => o.id === value) : undefined;
  const fallback = inherited ?? { src: MENU_PLACEHOLDER, label: "Imagem geral" };
  const currentSrc = current ? illustrationSrc(current.id) : fallback.src;

  const pick = (id: string | undefined) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Ilustração de ${name}: ${current?.label ?? fallback.label}. Trocar`}
        title="Imagem dos itens sem foto"
        className="flex items-center gap-2 self-start rounded-lg border border-primary-gold/25 bg-secondary-black/60 py-1 pl-1 pr-2 text-[11px] text-primary-gold/75 hover:border-primary-gold/50 transition-colors cursor-pointer"
      >
        <img src={currentSrc} alt="" className="h-7 w-7 rounded-md bg-[#191714] object-cover" />
        <span className="max-w-[120px] truncate">{current ? current.label : `Padrão · ${fallback.label}`}</span>
        <LuChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="radiogroup" aria-label={`Ilustração de ${name}`} className="flex flex-wrap gap-1.5">
          <Option label={`Padrão (${fallback.label})`} src={fallback.src} active={!current} onClick={() => pick(undefined)} />
          {MENU_ILLUSTRATIONS.map((option) => (
            <Option
              key={option.id}
              label={option.label}
              src={illustrationSrc(option.id)}
              active={current?.id === option.id}
              onClick={() => pick(option.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Option({
  label,
  src,
  active,
  onClick,
}: {
  label: string;
  src: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`relative h-11 w-11 rounded-lg border bg-[#191714] p-0.5 transition-colors cursor-pointer ${
        active ? "border-primary-gold" : "border-primary-gold/15 hover:border-primary-gold/50"
      }`}
    >
      <img src={src} alt="" className="h-full w-full rounded-md object-cover" />
      {active && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-gold text-primary-black">
          <LuCheck size={10} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
