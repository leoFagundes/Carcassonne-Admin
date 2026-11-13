"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
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

const PalettePreview3D = dynamic(() => import("./palettePreview3d"), { ssr: false });

const PREVIEW_W = 190;
const PREVIEW_H = 168;

/**
 * Prévia 3D ao passar o mouse: uma janelinha perto do ponteiro com o objeto
 * girando. Só em computador (mouse); no toque, a miniatura já basta.
 */
function useHoverPreview() {
  const [item, setItem] = useState<PaletteItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pos = useRef({ x: 0, y: 0 });

  const place = useCallback(() => {
    const node = boxRef.current;
    if (!node) return;
    const { x, y } = pos.current;
    const left = x + 18 + PREVIEW_W > window.innerWidth - 8 ? x - 18 - PREVIEW_W : x + 18;
    const top = Math.min(Math.max(8, y + 14), window.innerHeight - PREVIEW_H - 8);
    node.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    if (visible) place();
  }, [visible, place]);

  const bind = (it: PaletteItem) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      pos.current = { x: e.clientX, y: e.clientY };
      setItem(it);
      setMounted(true);
      if (timer.current) clearTimeout(timer.current);
      // Pequena espera para não piscar ao só atravessar a lista
      timer.current = setTimeout(() => setVisible(true), visible ? 0 : 220);
    },
    onPointerMove: (e: React.PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      place();
    },
    onPointerLeave: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setVisible(false), 60);
    },
    onPointerDown: () => {
      if (timer.current) clearTimeout(timer.current);
      setVisible(false);
    },
  });

  const node =
    mounted && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={boxRef}
            aria-hidden="true"
            className={`pointer-events-none fixed left-0 top-0 z-[80] overflow-hidden rounded-xl border border-primary-gold/35 bg-[radial-gradient(circle_at_50%_40%,#3a2c20_0%,#14110e_75%)] shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-opacity duration-150 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
          >
            <div className="h-[140px] w-full">
              <PalettePreview3D item={item} active={visible} />
            </div>
            <p className="truncate px-2 text-center text-[11px] font-semibold text-primary-gold/85">{item?.label}</p>
          </div>,
          document.body,
        )
      : null;

  return { bind, node };
}

type Tab = KindCategory | "armarios";
/** Nomes curtos nas abas (o nome completo fica na dica). */
const SHORT: Record<Tab, string> = { armarios: "Jogos", lugares: "Lugares", moveis: "Móveis", estrutura: "Estrutura", detalhes: "Detalhes" };
const TABS: { id: Tab; label: string; title: string }[] = [
  { id: "armarios", label: SHORT.armarios, title: "Onde guardar jogos: armários, baús e pufes que abrem" },
  ...CATEGORY_ORDER.map((c) => ({ id: c as Tab, label: SHORT[c], title: CATEGORY_LABEL[c] })),
];

/** Lista "Adicionar": miniaturas por categoria (armários de jogos primeiro), com busca. */
export default function PaletteGrid({ onAdd }: { onAdd: (item: PaletteItem) => void }) {
  const [cat, setCat] = useState<Tab>("lugares");
  const [q, setQ] = useState("");
  const preview = useHoverPreview();
  const items = q.trim()
    ? searchPalette(q)
    : cat === "armarios"
      ? PALETTE.filter((p) => p.kind === "gameshelf")
      : // Os pufes-baú também aparecem em Lugares (são assentos)
        PALETTE.filter((p) => p.category === cat && (p.kind !== "gameshelf" || cat === "lugares"));
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
        <div role="tablist" aria-label="Categorias" className="grid grid-cols-5 gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={cat === t.id}
              title={t.title}
              onClick={() => setCat(t.id)}
              className={`min-w-0 truncate rounded-full px-1 py-1 text-center text-[10.5px] font-semibold transition-colors ${
                cat === t.id
                  ? "bg-primary-gold text-primary-black"
                  : t.id === "armarios"
                    ? "border border-emerald-400/40 text-emerald-200/90 hover:text-emerald-100"
                    : "border border-primary-gold/20 text-primary-gold/65 hover:text-primary-gold"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-primary-gold/50">Nada com esse nome. Tente outra palavra.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onAdd(it)}
                {...preview.bind(it)}
                aria-label={`Adicionar ${it.label.toLowerCase()}`}
                className="group flex h-full w-full flex-col items-center gap-1 rounded-xl border border-primary-gold/15 bg-primary-black/40 p-1.5 text-center transition-colors hover:border-primary-gold/50 hover:bg-primary-gold/[0.06]"
              >
                <span className="flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-[#14110e]">
                  <PaletteThumb item={it} />
                </span>
                <span className="line-clamp-2 text-[10.5px] font-semibold leading-tight text-primary-gold/80 group-hover:text-primary-gold">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview.node}
    </div>
  );
}
