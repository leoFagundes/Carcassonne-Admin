"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Tooltip from "@/components/Tooltip";

export interface HeaderMenuOption {
  label: string;
  description?: string;
  icon: ReactNode;
  onSelect: () => void;
}

/**
 * Botão do cabeçalho que abre uma lista curta de ações (ex.: "Adicionar" →
 * Item, Combo, Aviso). Fecha ao escolher, clicando fora ou com Esc.
 */
export default function HeaderMenu({
  tooltip,
  icon,
  options,
}: {
  tooltip: string;
  icon: ReactNode;
  options: HeaderMenuOption[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Tooltip direction="bottom" content={tooltip}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={`p-2 cursor-pointer rounded-lg border transition-all ${
            open
              ? "border-primary-gold/50 text-primary-gold"
              : "border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold"
          }`}
        >
          {icon}
        </button>
      </Tooltip>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-40 w-64 flex flex-col gap-0.5 rounded-xl border border-primary-gold/20 bg-secondary-black p-1.5 shadow-card"
        >
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                option.onSelect();
              }}
              className="flex items-start gap-2.5 w-full rounded-lg px-2.5 py-2 text-left text-primary-gold/80 hover:text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer"
            >
              <span className="mt-0.5 shrink-0 text-primary-gold/60">{option.icon}</span>
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-[11px] text-primary-gold/45 leading-snug">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
