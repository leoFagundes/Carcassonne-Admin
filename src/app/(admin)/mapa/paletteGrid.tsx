"use client";

import React, { useMemo, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { CATEGORY_LABEL, CATEGORY_ORDER, KINDS, type KindCategory } from "@/floorplan/catalog";
import { boundsOf } from "@/floorplan/geometry";
import { PALETTE, searchPalette, type PaletteItem } from "@/floorplan/palette";
import type { PlanElement } from "@/floorplan/types";
import { PlanDefs, Shape2D, tableFill, U } from "./shapes2d";

/** Miniatura do objeto, desenhada com o mesmo traço da planta. */
export function PaletteThumb({ item, size = 56 }: { item: PaletteItem; size?: number }) {
  const el: PlanElement = useMemo(
    () => ({
      id: `thumb-${item.id}`,
      level: "thumb",
      kind: item.kind,
      x: 0,
      y: 0,
      w: item.w,
      d: item.d,
      rot: 0,
      variant: item.variant,
      shape: item.shape,
      count: item.count,
      label: item.kind === "table" ? "12" : undefined,
    }),
    [item],
  );
  const linear = KINDS[item.kind].linear;
  const b = boundsOf([el])!;
  // Objetos finos (parede, quadro) ganham "espessura" para aparecer
  const minSide = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.18;
  const halfH = Math.max((b.maxY - b.minY) / 2, minSide);
  const halfW = (b.maxX - b.minX) / 2 + (linear ? el.d / 2 : 0);
  const pad = Math.max(halfW, halfH) * 0.12 + 4 / U;
  const vb = [(-halfW - pad) * U, (-halfH - pad) * U, (halfW + pad) * 2 * U, (halfH + pad) * 2 * U].join(" ");
  return (
    <svg viewBox={vb} width={size} height={size * 0.72} preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="block">
      <PlanDefs />
      {item.kind === "stair" || item.kind === "room" || item.kind === "block" || item.kind === "stage" ? null : (
        <rect x={(-halfW - pad) * U} y={(-halfH - pad) * U} width={(halfW + pad) * 2 * U} height={(halfH + pad) * 2 * U} fill="#3a2a1e" opacity={0.55} />
      )}
      <Shape2D el={el} />
      {item.kind === "table" && (
        <text textAnchor="middle" dominantBaseline="central" fontSize={Math.min(el.w, el.d) * U * 0.4} fontWeight={800} fill={tableFill(undefined, el).ink}>
          12
        </text>
      )}
      {item.kind === "text" && (
        <text textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} fill="#e6c56b">
          Texto
        </text>
      )}
    </svg>
  );
}

/** Lista "Adicionar": miniaturas por categoria, com busca. */
export default function PaletteGrid({ onAdd }: { onAdd: (item: PaletteItem) => void }) {
  const [cat, setCat] = useState<KindCategory>("lugares");
  const [q, setQ] = useState("");
  const items = q.trim() ? searchPalette(q) : PALETTE.filter((p) => p.category === cat);
  return (
    <div className="flex flex-col gap-2.5">
      <label className="relative flex items-center">
        <LuSearch size={14} className="pointer-events-none absolute left-2.5 text-primary-gold/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar: mesa redonda, TV, coluna…"
          aria-label="Buscar objeto"
          className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 py-1.5 pl-8 pr-8 text-sm text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/60"
        />
        {q && (
          <button type="button" aria-label="Limpar busca" onClick={() => setQ("")} className="absolute right-2 text-primary-gold/50 hover:text-primary-gold">
            <LuX size={14} />
          </button>
        )}
      </label>
      {!q.trim() && (
        <div role="tablist" aria-label="Categorias" className="flex flex-wrap gap-1">
          {CATEGORY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                cat === c ? "bg-primary-gold text-primary-black" : "border border-primary-gold/20 text-primary-gold/65 hover:text-primary-gold"
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-primary-gold/50">Nada com esse nome. Tente outra palavra.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onAdd(it)}
                title={`Adicionar ${it.label.toLowerCase()}`}
                className="group flex h-full w-full flex-col items-center gap-1 rounded-xl border border-primary-gold/15 bg-primary-black/40 p-1.5 text-center transition-colors hover:border-primary-gold/50 hover:bg-primary-gold/[0.06]"
              >
                <span className="flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-[#14110e]">
                  <PaletteThumb item={it} />
                </span>
                <span className="text-[10.5px] font-semibold leading-tight text-primary-gold/80 group-hover:text-primary-gold">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
