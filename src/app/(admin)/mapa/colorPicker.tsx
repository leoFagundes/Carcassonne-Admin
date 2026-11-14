"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuPipette } from "react-icons/lu";
import { CATEGORY_COLORS } from "@/floorplan/shelves";

/** Cores prontas para as plaquinhas (as da Coleção primeiro, depois mais tons). */
export const PLAQUE_COLORS = [
  ...CATEGORY_COLORS,
  "#ef4444",
  "#b91c1c",
  "#ea580c",
  "#facc15",
  "#84cc16",
  "#16a34a",
  "#0d9488",
  "#06b6d4",
  "#0ea5e9",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#9a6a3c",
  "#78716c",
  "#e5e7eb",
  "#1f2937",
];

const uniq = [...new Set(PLAQUE_COLORS.map((c) => c.toLowerCase()))];

/**
 * Escolha de cor: as prontas e uma livre (abre o seletor de cor do aparelho).
 * A livre mostra a cor escolhida quando ela não está entre as prontas.
 */
export default function ColorPicker({ value, onChange, size = 24 }: { value: string; onChange: (c: string) => void; size?: number }) {
  // Enquanto arrasta no seletor, só mostra; grava quando fecha (evita salvar a cada movimento)
  const [live, setLive] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commit = useRef(onChange);
  commit.current = onChange;
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const done = () => {
      commit.current(node.value);
      setLive(null);
    };
    node.addEventListener("change", done);
    return () => node.removeEventListener("change", done);
  }, []);
  const shown = live ?? value;
  const v = shown.toLowerCase();
  const free = !uniq.includes(v);
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Cor">
      {uniq.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={v === c}
          aria-label={`Cor ${c}`}
          onClick={() => onChange(c)}
          className={`shrink-0 rounded-full border border-black/30 transition-transform ${v === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#14110e]" : "hover:scale-110"}`}
          style={{ background: c, width: size, height: size }}
        />
      ))}
      {/* Cor livre */}
      <label
        title="Escolher qualquer cor"
        className={`relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-black/30 transition-transform hover:scale-110 ${
          free ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#14110e]" : ""
        }`}
        style={{
          width: size,
          height: size,
          background: free ? shown : "conic-gradient(#ef4444, #facc15, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
        }}
      >
        <LuPipette size={Math.round(size * 0.5)} className={free ? "text-white mix-blend-difference" : "text-white drop-shadow"} aria-hidden="true" />
        <input
          ref={inputRef}
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(shown) ? shown : "#e6c56b"}
          onChange={(e) => setLive(e.target.value)}
          aria-label="Escolher qualquer cor"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
