"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LuArrowRight, LuPlus, LuTrash2, LuUndo2, LuX } from "react-icons/lu";
import ReferencePhoto from "./refPhoto";
import {
  CHEST,
  CUBES,
  HUTCH,
  labelInfo,
  layoutBoxes,
  LOWCAB,
  POUF,
  UNDERSTAIR,
  understairDoor,
  understairLevels,
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
  if (m.id === "pouf1" || m.id === "pouf3" || m.id === "chest") {
    // Baú aberto: o tampo levantado para trás, e a caixa vista por dentro
    // Pufe de 1 lugar: tecido branquinho de bolinhas; de 3 lugares: couro preto, um baú só
    const chest = m.id === "chest";
    const dotted = m.id === "pouf1";
    const seats = m.id === "pouf3" ? 3 : 1;
    const lid = (chest ? CHEST.lid : POUF.lid) * U;
    const wall = (chest ? CHEST.wall : POUF.wall) * U;
    const floor = (chest ? CHEST.floor : POUF.floor) * U;
    const outer = chest ? "#7a4f2c" : dotted ? "url(#fp-dots)" : "#1d1d20";
    const inner = chest ? "#4a2f1a" : "#2b2622";
    const up = 20; // altura do tampo em pé (cm, na vista)
    return (
      <g>
        <defs>
          <pattern id="fp-dots" width={4} height={4} patternUnits="userSpaceOnUse">
            <rect width={4} height={4} fill="#e9dccb" />
            <circle cx={1} cy={1} r={0.55} fill="#c0504d" />
            <circle cx={3} cy={3} r={0.55} fill="#4f81bd" />
            <circle cx={3} cy={1} r={0.45} fill="#9bbb59" />
          </pattern>
        </defs>
        {/* Tampo em pé, atrás (um só) */}
        <polygon
          points={`3,${lid} ${w - 3},${lid} ${w - 7},${lid - up} 7,${lid - up}`}
          fill={chest ? "#6e4526" : dotted ? "url(#fp-dots)" : "#26262a"}
          stroke={chest ? "#3a2412" : "#0c0c0e"}
          strokeWidth={1}
        />
        {/* Couro: costura dos assentos e botões do capitonê */}
        {!chest && !dotted && (
          <g>
            {Array.from({ length: seats - 1 }, (_, i) => (
              <line key={i} x1={(w * (i + 1)) / seats} y1={lid - 1} x2={(w * (i + 1)) / seats} y2={lid - up + 1} stroke="#0c0c0e" strokeWidth={1} />
            ))}
            {Array.from({ length: seats }, (_, i) =>
              [0.3, 0.7].map((f) => <circle key={`${i}${f}`} cx={(w * (i + f)) / seats} cy={lid - up * 0.5} r={1.6} fill="#0c0c0e" />),
            )}
          </g>
        )}
        {/* Caixa: bordas e o fundo de dentro */}
        <rect x={0} y={lid} width={w} height={H - lid} rx={chest ? 1.5 : 3} fill={outer} stroke="#0c0c0e" strokeWidth={1.2} />
        <rect x={wall} y={lid + 1} width={w - wall * 2} height={H - lid - floor - 1} fill={inner} />
        <rect x={wall} y={H - floor - 2} width={w - wall * 2} height={2} fill={chest ? "#7a4f2c" : "#3a3430"} />
        {chest && [0.18, 0.82].map((f) => <rect key={f} x={w * f - 2} y={lid} width={4} height={H - lid} fill="#2a2a2c" opacity={0.85} />)}
      </g>
    );
  }
  if (m.id === "understair") {
    // Parede reta; a porta de correr (aberta) fica empurrada para a esquerda, por cima da parede
    const S = UNDERSTAIR;
    const door = understairDoor(el.w);
    const levels = understairLevels(el.w);
    const dx = door.x0 * U;
    const dw = door.w * U;
    const top = H - door.h * U;
    const open = Math.max(0, dx - dw * 0.92); // onde fica a folha aberta
    return (
      <g>
        <rect x={0} y={0} width={w} height={H} fill="#b7ae9f" stroke="#5a5048" strokeWidth={1.2} />
        <rect x={0} y={0} width={w} height={5} fill="#8f8678" />
        <rect x={0} y={H - S.base * U} width={w} height={S.base * U} fill="#5e3d22" />
        {/* Vão da porta, com as 3 prateleiras grandes */}
        <rect x={dx} y={top} width={dw} height={H - top} fill="#4a2f1a" />
        {levels.slice(1).map((l) => (
          <rect key={l.bottom} x={dx} y={H - l.bottom * U} width={dw} height={S.board * U} fill="#a87444" />
        ))}
        <rect x={dx - 4} y={top} width={4} height={H - top} fill="#5e3d22" />
        <rect x={dx + dw} y={top} width={4} height={H - top} fill="#5e3d22" />
        {/* Trilho e a folha aberta */}
        <rect x={open - 2} y={top - 4} width={dx + dw - open + 4} height={3.5} fill="#2a2a2c" />
        <g opacity={0.92}>
          <rect x={open} y={top} width={dw} height={H - top - 1} fill="#9a6a3c" stroke="#5e3d22" strokeWidth={1} />
          {[1, 2, 3].map((k) => (
            <line key={k} x1={open + (dw * k) / 4} y1={top + 3} x2={open + (dw * k) / 4} y2={H - 4} stroke="#6e4727" strokeWidth={0.8} />
          ))}
          <rect x={open + dw - 9} y={H - 100 - 16} width={2.4} height={32} rx={1} fill="#1c1c1e" />
        </g>
      </g>
    );
  }
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

/**
 * Plaquinha do espaço: de latão (com a cor da categoria num esmalte) quando
 * tem etiqueta, de madeira com o nome do espaço quando não tem. Nas
 * prateleiras ela fica pendurada na tábua de cima por duas correntinhas.
 */
function ShelfSign({ text, color, count, hang }: { text: string; color?: string; count: number; hang: boolean }) {
  const brass = !!color;
  const plate = (
    <span
      className={`relative flex max-w-full items-center gap-1 rounded-[3px] border px-[7px] py-[2px] text-[9.5px] font-extrabold uppercase leading-none tracking-[0.08em] shadow-[0_2px_3px_rgba(0,0,0,0.45)] ${
        brass
          ? "border-[#6b4f1f] bg-[linear-gradient(180deg,#f3dda0_0%,#d4ad5c_45%,#a8843f_100%)] text-[#3a2410] [text-shadow:0_1px_0_rgba(255,240,200,0.55)]"
          : "border-[#1e130a] bg-[linear-gradient(180deg,#5c3f28_0%,#3d2817_100%)] text-primary-gold/75"
      }`}
    >
      {/* Parafusos */}
      <span className={`absolute left-[2px] top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full ${brass ? "bg-[#6b4f1f]" : "bg-[#1e130a]"}`} />
      <span className={`absolute right-[2px] top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full ${brass ? "bg-[#6b4f1f]" : "bg-[#1e130a]"}`} />
      {brass && <span className="h-[7px] w-[7px] shrink-0 rounded-full border border-[#3a2410]/60" style={{ background: color }} />}
      <span className="min-w-0 truncate">{text}</span>
      {count > 0 && <span className={`shrink-0 rounded-sm px-[3px] py-px text-[8.5px] tracking-normal ${brass ? "bg-[#3a2410]/15" : "bg-black/30"}`}>{count}</span>}
    </span>
  );
  if (!hang) return <span className="pointer-events-none absolute left-1 top-1 z-10 flex max-w-[calc(100%-8px)]">{plate}</span>;
  return (
    <span className="pointer-events-none absolute left-1/2 top-0 z-10 flex max-w-[calc(100%-12px)] -translate-x-1/2 flex-col items-center">
      {/* Correntinhas presas na tábua de cima */}
      <span className="flex w-[70%] justify-between">
        <span className={`h-[5px] w-px ${brass ? "bg-[#c9a253]" : "bg-[#8a6a4a]"}`} />
        <span className={`h-[5px] w-px ${brass ? "bg-[#c9a253]" : "bg-[#8a6a4a]"}`} />
      </span>
      {plate}
    </span>
  );
}

function GameTile({
  g,
  cat,
  size,
  overlap,
  slotId,
  highlight,
  selected,
  onSelect,
  onRemove,
}: {
  g: ShelfGame;
  cat?: CatalogGame;
  size: number;
  /** Quanto a caixa entra por cima da anterior (px), quando há muitas. */
  overlap: number;
  slotId: string;
  highlight: boolean;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const initials = g.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`group/tile relative shrink-0 transition-transform duration-150 hover:z-20 hover:-translate-y-1 focus-within:z-20 ${selected || highlight ? "z-10 -translate-y-1" : ""}`}
      style={{ marginLeft: overlap ? -overlap : 0 }}
    >
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
      aria-label={g.name}
      className={`relative block shrink-0 overflow-hidden rounded-[3px] shadow-[2px_3px_5px_rgba(0,0,0,0.55),-1px_0_0_rgba(0,0,0,0.35)] outline-none ${
        highlight ? "ring-2 ring-white" : selected ? "ring-2 ring-primary-gold" : "focus-visible:ring-2 focus-visible:ring-primary-gold"
      }`}
      style={{ width: size * 0.78, height: size }}
    >
      {cat?.image ? (
        <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5a3d27] to-[#2a1b10] px-0.5 text-center text-[10px] font-extrabold leading-tight text-primary-gold/85">
          {size >= 44 ? g.name : initials}
        </span>
      )}
      {/* Volume da caixa: lombada escura à esquerda e brilho no alto */}
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0)_9%,rgba(255,255,255,0)_70%,rgba(255,255,255,0.10)_100%)]" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[18%] bg-gradient-to-b from-white/15 to-transparent" />
    </button>
    {/* Nome do jogo (ao passar o mouse ou com o jogo escolhido) */}
    <span
      className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 max-w-[160px] -translate-x-1/2 truncate whitespace-nowrap rounded-md border border-primary-gold/30 bg-[#14110e]/95 px-1.5 py-0.5 text-[10px] font-bold text-primary-gold shadow-card ${
        selected ? "block" : "hidden group-hover/tile:block"
      }`}
    >
      {g.name}
    </span>
    {/* Tirar com um clique (aparece ao passar o mouse) */}
    {size >= 28 && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title={`Tirar ${g.name} daqui`}
        aria-label={`Tirar ${g.name} daqui`}
        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-[#14110e] bg-invalid-color text-white shadow group-hover/tile:flex [@media(hover:none)]:hidden"
      >
        <LuX size={11} />
      </button>
    )}
    </span>
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
  onRemove,
  onMove,
  undo,
  onShelfPhoto,
  onSlotPhoto,
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
  onRemove: (slotId: string, key: string) => void;
  onMove: (slotId: string, key: string, toSlot: string) => void;
  /** Última retirada, para desfazer. */
  undo?: { text: string; run: () => void } | null;
  /** Fotos de referência (o ícone só aparece onde já tem foto). */
  onShelfPhoto?: (file: File | null) => Promise<void>;
  onSlotPhoto?: (slotId: string, file: File | null) => Promise<void>;
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
        {onShelfPhoto && (
          <ReferencePhoto
            variant="icon"
            photo={content?.photo}
            what="do armário"
            onSave={(file) => onShelfPhoto(file)}
            onRemove={() => onShelfPhoto(null)}
            className="h-9 w-9 shrink-0 rounded-lg"
          />
        )}
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
              const hang = s.kind !== "top" && s.kind !== "drawer";
              // A plaquinha pendurada ocupa o alto do espaço; as caixas ficam de pé embaixo
              const sign = hang ? Math.min(24, Math.max(15, hPx * 0.2)) : 0;
              const tile = Math.max(18, Math.min(110, (hPx - sign - 8) * (s.kind === "top" ? 0.8 : 0.9)));
              const lay = layoutBoxes(games.length, tile * 0.78, s.w * scale - 10);
              const shown = games.slice(0, lay.shown);
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
                  <ShelfSign text={info?.text ?? s.label} color={info?.color} count={games.length} hang={hang} />
                  {onSlotPhoto && slot?.photo && (
                    <ReferencePhoto
                      variant="icon"
                      photo={slot.photo}
                      what={`de "${s.label}"`}
                      onSave={(file) => onSlotPhoto(s.id, file)}
                      onRemove={() => onSlotPhoto(s.id, null)}
                      className="absolute right-1 top-1 z-20 h-6 w-6"
                    />
                  )}
                  <div className="flex items-end px-[5px] pb-[3px] pt-2">
                    {shown.map((g, i) => (
                      <GameTile
                        key={g.key}
                        g={g}
                        cat={g.gameId ? catalogById.get(g.gameId) : undefined}
                        size={tile}
                        overlap={i ? lay.overlap : 0}
                        slotId={s.id}
                        highlight={!!highlightGame && g.gameId === highlightGame}
                        selected={selectedGame === g.key}
                        onSelect={() => onSelectGame(s.id, g.key)}
                        onRemove={() => onRemove(s.id, g.key)}
                      />
                    ))}
                    {extra > 0 && (
                      <span
                        className="relative z-10 ml-1 flex shrink-0 items-center justify-center rounded-[3px] border border-primary-gold/30 bg-[#14110e]/85 text-[11px] font-extrabold text-primary-gold"
                        style={{ width: Math.max(26, tile * 0.5), height: tile * 0.6 }}
                        title={`Mais ${extra}: veja a lista no painel`}
                      >
                        +{extra}
                      </span>
                    )}
                    {games.length === 0 && s.kind !== "drawer" && hPx > 30 && (
                      <span className="pointer-events-none mb-1 flex w-full items-center justify-center gap-1 text-[10px] text-primary-gold/35">
                        <LuPlus size={11} /> {sel ? "guarde pelo painel" : "toque para guardar"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {(() => {
        const sl = selectedSlot ? content?.slots[selectedSlot] : undefined;
        const game = selectedGame ? sl?.games.find((x) => x.key === selectedGame) : undefined;
        if (!game || !selectedSlot) return null;
        const cat = game.gameId ? catalogById.get(game.gameId) : undefined;
        return (
          <div className="mx-3 mb-2 flex flex-col gap-2 rounded-xl border border-primary-gold/30 bg-primary-black/95 p-2 shadow-card sm:flex-row sm:items-center">
            <span className="flex min-w-0 items-center gap-2">
              {cat?.image ? <img src={cat.image} alt="" className="h-9 w-7 shrink-0 rounded-[3px] object-cover" /> : <span className="h-9 w-7 shrink-0 rounded-[3px] bg-[#3a2a1e]" />}
              <span className="min-w-0 truncate text-xs font-bold text-primary-gold">{game.name}</span>
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <LuArrowRight size={13} className="shrink-0 text-primary-gold/50" />
              {slots
                .filter((x) => x.id !== selectedSlot)
                .map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => onMove(selectedSlot, game.key, x.id)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-primary-gold/25 px-2 py-0.5 text-[11px] font-semibold text-primary-gold/80 transition-colors hover:border-primary-gold/60 hover:text-primary-gold"
                  >
                    {x.label}
                  </button>
                ))}
            </span>
            <span className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => onRemove(selectedSlot, game.key)}
                className="flex items-center gap-1 rounded-lg border border-invalid-color/40 bg-invalid-color/10 px-2 py-1 text-[11px] font-semibold text-invalid-color hover:border-invalid-color/70"
              >
                <LuTrash2 size={13} /> Tirar
              </button>
              <button
                type="button"
                onClick={() => onSelectGame(selectedSlot, "")}
                aria-label="Fechar"
                className="flex items-center rounded-lg border border-primary-gold/20 px-2 py-1 text-primary-gold/60 hover:text-primary-gold"
              >
                <LuX size={13} />
              </button>
            </span>
          </div>
        );
      })()}
      {undo && (
        <div role="status" className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl border border-primary-gold/25 bg-primary-black/95 px-3 py-2 text-xs text-primary-gold/80 shadow-card">
          <span className="min-w-0 truncate">{undo.text}</span>
          <button type="button" onClick={undo.run} className="flex shrink-0 items-center gap-1 font-bold text-primary-gold hover:underline">
            <LuUndo2 size={13} /> Desfazer
          </button>
        </div>
      )}
      <p className="px-4 pb-3 text-center text-[11px] text-primary-gold/45">
        Toque num espaço para guardar · toque num jogo para mover ou tirar · arraste no computador · Esc fecha
      </p>
    </div>
  );
}
