"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";
import {
  CUBES,
  HUTCH,
  labelInfo,
  LOWCAB,
  shelfCount,
  shelfModel,
  shelfSlots,
  TOP_ZONE,
  type CatalogGame,
  type ShelfCategory,
  type ShelfContent,
  type ShelfGame,
} from "@/floorplan/shelves";
import type { PlanElement } from "@/floorplan/types";

const U = 100; // desenho em cm

export type DragPayload = { key: string; from: string } | { gameId: string };

export const DRAG_MIME = "application/x-carcassonne-game";

/** Frente do móvel, em cm: madeira, prateleiras, gaveta aberta e portas abertas. */
function FrontDrawing({ el }: { el: PlanElement }) {
  const m = shelfModel(el);
  const w = el.w * U;
  const H = m.height * U;
  if (m.id === "cubes") {
    const c = CUBES.cube * U;
    const t = CUBES.wall * U;
    return (
      <g>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x={0} y={i * c} width={w} height={c} fill="#b07f4c" stroke="#5e3d22" strokeWidth={1.2} />
            <rect x={t} y={i * c + t} width={w - t * 2} height={c - t * 2} fill="#7d5532" />
            <rect x={t} y={i * c + c - t - 2} width={w - t * 2} height={2} fill="#c79562" />
          </g>
        ))}
      </g>
    );
  }
  if (m.id === "lowcab") {
    const y = (v: number) => v * U;
    const doorTop = y(LOWCAB.inner[0][0]) - 2;
    const doorH = y(LOWCAB.base[0]) - doorTop;
    return (
      <g>
        {[0.08, 0.92].map((fx) => (
          <ellipse key={fx} cx={w * fx} cy={H - 3} rx={4.5} ry={3.5} fill="#5e3d22" />
        ))}
        <rect x={-2} y={0} width={w + 4} height={y(LOWCAB.ledge[1])} rx={1.5} fill="#6e4526" />
        <rect x={2} y={y(LOWCAB.ledge[1])} width={w - 4} height={y(LOWCAB.base[1]) - y(LOWCAB.ledge[1])} fill="#5e3d22" />
        <DrawerOpen x={4} y={y(LOWCAB.drawer[0])} w={w - 8} h={y(LOWCAB.drawer[1]) - y(LOWCAB.drawer[0])} />
        <rect x={5} y={y(LOWCAB.inner[0][0])} width={w - 10} height={y(LOWCAB.inner[1][1]) - y(LOWCAB.inner[0][0])} fill="#4a2f1a" />
        <rect x={5} y={y(LOWCAB.inner[0][1])} width={w - 10} height={2.5} fill="#7a4f2c" />
        <OpenDoor x={-w * 0.2} y={doorTop} w={w * 0.2} h={doorH} side="left" />
        <OpenDoor x={w} y={doorTop} w={w * 0.2} h={doorH} side="right" />
      </g>
    );
  }
  // Estante alta
  const y = (v: number) => v * U;
  const ix = HUTCH.upperInset * U;
  const t = HUTCH.side * U;
  const doors = m.id === "hutch-doors";
  const lowTop = y(HUTCH.lower[0][0]) - 2;
  const lowH = y(HUTCH.lower[1][1]) - lowTop + 2;
  return (
    <g>
      {[0.07, 0.93].map((fx) => (
        <ellipse key={fx} cx={w * fx} cy={H - 3.5} rx={5} ry={4} fill="#5e3d22" />
      ))}
      {/* Cornija e estante de cima */}
      <rect x={ix - 2.5} y={0} width={w - ix * 2 + 5} height={y(HUTCH.cornice)} rx={1.5} fill="#8a5a32" />
      <rect x={ix} y={y(HUTCH.cornice)} width={w - ix * 2} height={y(HUTCH.ledge[0]) - y(HUTCH.cornice)} fill="#9a6a3c" stroke="#5e3d22" strokeWidth={1} />
      <rect x={ix + t} y={y(HUTCH.upper[0][0])} width={w - (ix + t) * 2} height={y(HUTCH.upper[2][1]) - y(HUTCH.upper[0][0])} fill="#6e4526" />
      {[1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={ix + t + ((w - (ix + t) * 2) * i) / 6} y1={y(HUTCH.upper[0][0])} x2={ix + t + ((w - (ix + t) * 2) * i) / 6} y2={y(HUTCH.upper[2][1])} stroke="#5a381f" strokeWidth={0.8} />
      ))}
      {HUTCH.upper.slice(0, 2).map(([, y1], i) => (
        <rect key={i} x={ix + t} y={y(y1)} width={w - (ix + t) * 2} height={2.5} fill="#a87444" />
      ))}
      {/* Aba, gaveta e parte de baixo */}
      <rect x={-1} y={y(HUTCH.ledge[0])} width={w + 2} height={y(HUTCH.ledge[1]) - y(HUTCH.ledge[0])} rx={1} fill="#8a5a32" />
      <rect x={0} y={y(HUTCH.ledge[1])} width={w} height={y(HUTCH.base[1]) - y(HUTCH.ledge[1])} fill="#9a6a3c" stroke="#5e3d22" strokeWidth={1} />
      <DrawerOpen x={3} y={y(HUTCH.drawer[0])} w={w - 6} h={y(HUTCH.drawer[1]) - y(HUTCH.drawer[0])} />
      <rect x={t + 2} y={y(HUTCH.lower[0][0])} width={w - (t + 2) * 2} height={y(HUTCH.lower[1][1]) - y(HUTCH.lower[0][0])} fill="#6e4526" />
      <rect x={t + 2} y={y(HUTCH.lower[0][1])} width={w - (t + 2) * 2} height={2.5} fill="#a87444" />
      <rect x={0} y={y(HUTCH.base[0])} width={w} height={y(HUTCH.base[1]) - y(HUTCH.base[0])} fill="#8a5a32" />
      {doors && (
        <>
          <OpenDoor x={-w * 0.2} y={lowTop} w={w * 0.2} h={lowH} side="left" />
          <OpenDoor x={w} y={lowTop} w={w * 0.2} h={lowH} side="right" />
        </>
      )}
    </g>
  );
}

/** Gaveta puxada para fora (vê-se o fundo dela). */
function DrawerOpen({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#4a2f1a" />
      <rect x={x - 2} y={y + h - 5} width={w + 4} height={6} rx={1.5} fill="#8f6236" stroke="#5e3d22" strokeWidth={0.8} />
      {[0.2, 0.8].map((fx) => (
        <circle key={fx} cx={x + w * fx} cy={y + h - 2} r={2.4} fill="#c49a6c" />
      ))}
    </g>
  );
}

/** Porta aberta, vista em perspectiva ao lado do móvel. */
function OpenDoor({ x, y, w, h, side }: { x: number; y: number; w: number; h: number; side: "left" | "right" }) {
  const skew = h * 0.06;
  const pts =
    side === "left"
      ? `${x + w},${y} ${x},${y + skew} ${x},${y + h - skew} ${x + w},${y + h}`
      : `${x},${y} ${x + w},${y + skew} ${x + w},${y + h - skew} ${x},${y + h}`;
  const ins = side === "left" ? `${x + w * 0.82},${y + h * 0.12} ${x + w * 0.18},${y + h * 0.16} ${x + w * 0.18},${y + h * 0.84} ${x + w * 0.82},${y + h * 0.88}` : `${x + w * 0.18},${y + h * 0.12} ${x + w * 0.82},${y + h * 0.16} ${x + w * 0.82},${y + h * 0.84} ${x + w * 0.18},${y + h * 0.88}`;
  return (
    <g>
      <polygon points={pts} fill="#8f6236" stroke="#5e3d22" strokeWidth={1} />
      <polygon points={ins} fill="none" stroke="#5e3d22" strokeWidth={0.8} strokeOpacity={0.7} />
    </g>
  );
}

function GameTile({
  g,
  cat,
  size,
  slotId,
  highlight,
  selected,
  onSelect,
}: {
  g: ShelfGame;
  cat?: CatalogGame;
  size: number;
  slotId: string;
  highlight: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = g.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ key: g.key, from: slotId } satisfies DragPayload));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={g.name}
      aria-label={g.name}
      className={`relative shrink-0 overflow-hidden rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 ${
        highlight ? "ring-2 ring-white" : selected ? "ring-2 ring-primary-gold" : ""
      }`}
      style={{ width: size * 0.78, height: size }}
    >
      {cat?.image ? (
        <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5a3d27] to-[#2a1b10] text-[10px] font-extrabold text-primary-gold/85">
          {initials}
        </span>
      )}
    </button>
  );
}

/** Vista de frente do armário aberto, por cima do mapa. */
export default function ShelfFront({
  el,
  name,
  subtitle,
  content,
  catalogById,
  customs,
  selectedSlot,
  selectedGame,
  highlightGame,
  onSelectSlot,
  onSelectGame,
  onDrop,
  onClose,
}: {
  el: PlanElement;
  name: string;
  subtitle: string;
  content?: ShelfContent;
  catalogById: Map<string, CatalogGame>;
  customs: ShelfCategory[];
  selectedSlot: string | null;
  selectedGame: string | null;
  highlightGame?: string | null;
  onSelectSlot: (id: string) => void;
  onSelectGame: (slotId: string, key: string) => void;
  onDrop: (payload: DragPayload, toSlot: string) => void;
  onClose: () => void;
}) {
  const m = shelfModel(el);
  const slots = shelfSlots(el);
  const doorsOut = m.id === "lowcab" || m.id === "hutch-doors" ? el.w * 0.22 : 0;
  const vbX = -0.06 - doorsOut;
  const vbY = -TOP_ZONE - 0.04;
  const vbW = el.w + 0.12 + doorsOut * 2;
  const vbH = m.height + TOP_ZONE + 0.06;
  const boxRef = useRef<HTMLDivElement>(null);
  const [px, setPx] = useState({ w: 0, h: 0 });
  const [over, setOver] = useState<string | null>(null);

  useLayoutEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([e]) => {
      const cw = e.contentRect.width;
      const ch = e.contentRect.height;
      const s = Math.min(cw / vbW, ch / vbH);
      setPx({ w: vbW * s, h: vbH * s });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [vbW, vbH]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "Escape" && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const scale = px.w / vbW; // px por metro
  const count = shelfCount(content);

  return (
    <div className="fp-shelf-in absolute inset-0 z-20 flex flex-col overflow-hidden rounded-2xl border border-primary-gold/25 bg-[#120f0c]/95 backdrop-blur-[2px]">
      <style>{`
        @keyframes fpShelfIn { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: none; } }
        .fp-shelf-in { animation: fpShelfIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) { .fp-shelf-in { animation: none; } }
      `}</style>
      <header className="flex items-start gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-primary-gold">{name}</h2>
          <p className="truncate text-[11px] text-primary-gold/55">
            {subtitle} · {count} {count === 1 ? "jogo" : "jogos"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar o armário"
          title="Fechar (Esc)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-gold/25 text-primary-gold/75 transition-colors hover:border-primary-gold/60 hover:text-primary-gold"
        >
          <LuX size={17} />
        </button>
      </header>
      <div ref={boxRef} className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        {px.w > 0 && (
          <div className="relative" style={{ width: px.w, height: px.h }}>
            <svg viewBox={`${vbX * U} ${vbY * U} ${vbW * U} ${vbH * U}`} width={px.w} height={px.h} className="absolute inset-0" aria-hidden="true">
              <FrontDrawing el={el} />
            </svg>
            {slots.map((s) => {
              const slot = content?.slots[s.id];
              const info = labelInfo(slot?.label, customs);
              const games = slot?.games ?? [];
              const hPx = s.h * scale;
              const tile = Math.max(18, Math.min(70, hPx * (s.kind === "top" ? 0.7 : 0.62)));
              const fit = Math.max(1, Math.floor((s.w * scale - 8) / (tile * 0.78 + 3)));
              const shown = games.length > fit ? games.slice(0, Math.max(0, fit - 1)) : games;
              const extra = games.length - shown.length;
              const sel = selectedSlot === s.id;
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.label}: ${games.length} jogos${info ? `, ${info.text}` : ""}`}
                  onClick={() => onSelectSlot(s.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectSlot(s.id)}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(DRAG_MIME)) {
                      e.preventDefault();
                      setOver(s.id);
                    }
                  }}
                  onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    try {
                      onDrop(JSON.parse(e.dataTransfer.getData(DRAG_MIME)) as DragPayload, s.id);
                    } catch {
                      /* arrasto de outra coisa */
                    }
                  }}
                  className={`absolute flex cursor-pointer flex-col justify-end rounded-[4px] outline-none transition-[box-shadow,background-color] duration-150 ${
                    sel ? "bg-primary-gold/[0.12] shadow-[0_0_0_2px_#e6c56b]" : over === s.id ? "bg-white/[0.08] shadow-[0_0_0_2px_#ffffff]" : "hover:bg-white/[0.05] focus-visible:shadow-[0_0_0_2px_#e6c56b]"
                  } ${s.kind === "top" ? "border border-dashed border-primary-gold/15" : ""}`}
                  style={{
                    left: (s.x - vbX) * scale,
                    top: (s.y - vbY) * scale,
                    width: s.w * scale,
                    height: hPx,
                  }}
                >
                  <span className="pointer-events-none absolute left-1 top-1 flex max-w-[calc(100%-8px)] items-center gap-1">
                    {info ? (
                      <span className="truncate rounded-full px-1.5 py-px text-[9px] font-extrabold uppercase tracking-wide text-[#14110e] shadow" style={{ background: info.color }}>
                        {info.text}
                      </span>
                    ) : (
                      <span className="truncate rounded-full bg-black/45 px-1.5 py-px text-[9px] font-semibold text-primary-gold/60">{s.label}</span>
                    )}
                  </span>
                  <div className="flex items-end gap-[3px] overflow-hidden px-1 pb-[3px]">
                    {shown.map((g) => (
                      <GameTile
                        key={g.key}
                        g={g}
                        cat={g.gameId ? catalogById.get(g.gameId) : undefined}
                        size={tile}
                        slotId={s.id}
                        highlight={!!highlightGame && g.gameId === highlightGame}
                        selected={selectedGame === g.key}
                        onSelect={() => onSelectGame(s.id, g.key)}
                      />
                    ))}
                    {extra > 0 && (
                      <span className="mb-1 shrink-0 rounded bg-black/60 px-1 py-0.5 text-[10px] font-bold text-primary-gold">+{extra}</span>
                    )}
                    {games.length === 0 && s.kind !== "top" && s.kind !== "drawer" && hPx > 30 && (
                      <span className="pointer-events-none mb-1 w-full text-center text-[10px] text-primary-gold/30">vazio</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="px-4 pb-3 text-center text-[11px] text-primary-gold/45">
        Toque num espaço para ver e guardar jogos · arraste um jogo para outro espaço · Esc fecha
      </p>
    </div>
  );
}
