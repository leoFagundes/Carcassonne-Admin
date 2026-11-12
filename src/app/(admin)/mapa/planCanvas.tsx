"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LuMaximize, LuMinus, LuPlus } from "react-icons/lu";
import { KINDS, tableTitle } from "@/floorplan/catalog";
import { boundsOf, formatMeters, handleLocal, HANDLES, toWorld, type Handle, type Pt } from "@/floorplan/geometry";
import type { PlanElement, TableState } from "@/floorplan/types";
import { STATE_META } from "@/floorplan/day";
import { PlanDefs, Shape2D, tableFill, U } from "./shapes2d";

export type HandleId = Handle | "rot";

export interface GroupOutline {
  key: string;
  tableIds: string[];
  label: string;
  state?: TableState;
}

export interface PlanCanvasProps {
  elements: PlanElement[];
  level: string;
  mode: "edit" | "day";
  selected: ReadonlySet<string>;
  /** Mesas em destaque (escolhendo mesas para juntar ou para a reserva). */
  picking?: ReadonlySet<string>;
  tableStates?: ReadonlyMap<string, TableState>;
  /** Quantas reservas cada mesa tem no dia. */
  tableBadges?: ReadonlyMap<string, number>;
  groups?: GroupOutline[];
  /** Recebe toque (os outros deixam passar para o fundo). */
  isInteractive: (el: PlanElement) => boolean;
  /** Mostra as alças de tamanho e giro (um elemento selecionado no modo planta). */
  handlesFor?: PlanElement | null;
  showGrid?: boolean;
  /** Mudou → reenquadra a planta. */
  fitKey: string;
  onTap: (id: string | null, opts: { additive: boolean }) => void;
  /** true = arrasta o elemento; false = arrasta a planta. */
  onMoveStart: (id: string, opts: { additive: boolean }) => boolean;
  onMove: (dx: number, dy: number, opts: { free: boolean }) => void;
  onMoveEnd: (cancel: boolean) => void;
  onHandleStart?: (h: HandleId) => void;
  onHandle?: (h: HandleId, p: Pt, opts: { free: boolean }) => void;
  onHandleEnd?: (cancel: boolean) => void;
  /** Texto pequeno no canto (ex.: dica do modo). */
  hint?: React.ReactNode;
  /** Recebe o centro da tela (em metros), para adicionar peças ali. */
  centerRef?: React.MutableRefObject<Pt>;
}

interface View {
  cx: number;
  cy: number;
  /** Pixels por metro. */
  s: number;
}

type Gesture =
  | { kind: "none" }
  | { kind: "pending"; id: string | null; x: number; y: number; additive: boolean; pan: View }
  | { kind: "pan"; x: number; y: number; view: View }
  | { kind: "move"; x: number; y: number; wx: number; wy: number }
  | { kind: "handle"; h: HandleId }
  | { kind: "pinch"; d: number; mid: Pt; view: View; world: Pt };

const TAP_PX = 5;
const MIN_S = 8;
const MAX_S = 400;

function niceStep(meters: number): number {
  const steps = [0.25, 0.5, 1, 2, 5, 10, 20];
  return steps.find((s) => s >= meters) ?? 50;
}

export default function PlanCanvas(props: PlanCanvasProps) {
  const {
    elements,
    level,
    mode,
    selected,
    picking,
    tableStates,
    tableBadges,
    groups,
    isInteractive,
    handlesFor,
    showGrid,
    fitKey,
    hint,
    centerRef,
  } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ cx: 6, cy: 5, s: 50 });
  const viewRef = useRef(view);
  viewRef.current = view;
  if (centerRef) centerRef.current = { x: view.cx, y: view.cy };
  const gesture = useRef<Gesture>({ kind: "none" });
  const pointers = useRef(new Map<number, Pt>());
  const cb = useRef(props);
  cb.current = props;

  const levelEls = useMemo(
    () =>
      elements
        .map((el, i) => ({ el, i }))
        .filter(({ el }) => el.level === level)
        .sort((a, b) => KINDS[a.el.kind].layer - KINDS[b.el.kind].layer || a.i - b.i)
        .map(({ el }) => el),
    [elements, level],
  );

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    const b = boundsOf(levelEls);
    if (!b || !size.w || !size.h) return;
    const pad = 28;
    const s = Math.min((size.w - pad * 2) / Math.max(1, b.maxX - b.minX), (size.h - pad * 2) / Math.max(1, b.maxY - b.minY));
    setView({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, s: Math.min(MAX_S, Math.max(MIN_S, s)) });
  }, [levelEls, size.w, size.h]);

  // Reenquadra ao trocar de andar/modo e quando o tamanho aparece
  const fitted = useRef("");
  useEffect(() => {
    const key = `${fitKey}|${size.w > 0}`;
    if (!size.w || fitted.current === key) return;
    fitted.current = key;
    fit();
  }, [fitKey, size.w, fit]);

  const toWorldPt = useCallback(
    (clientX: number, clientY: number, v: View = viewRef.current): Pt => {
      const r = wrapRef.current!.getBoundingClientRect();
      return { x: (clientX - r.left - r.width / 2) / v.s + v.cx, y: (clientY - r.top - r.height / 2) / v.s + v.cy };
    },
    [],
  );

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    setView((v) => {
      const s = Math.min(MAX_S, Math.max(MIN_S, v.s * factor));
      if (clientX === undefined || clientY === undefined || !wrapRef.current) return { ...v, s };
      const r = wrapRef.current.getBoundingClientRect();
      const px = clientX - r.left - r.width / 2;
      const py = clientY - r.top - r.height / 2;
      const wx = px / v.s + v.cx;
      const wy = py / v.s + v.cy;
      return { s, cx: wx - px / s, cy: wy - py / s };
    });
  }, []);

  // Roda do mouse (passive: false para não rolar a página)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const cancelGesture = useCallback(() => {
    const g = gesture.current;
    if (g.kind === "move") cb.current.onMoveEnd(true);
    if (g.kind === "handle") cb.current.onHandleEnd?.(true);
    gesture.current = { kind: "none" };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse" && e.button !== 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      cancelGesture();
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture.current = {
        kind: "pinch",
        d: Math.hypot(a.x - b.x, a.y - b.y),
        mid,
        view: viewRef.current,
        world: toWorldPt(mid.x, mid.y),
      };
      return;
    }
    if (pointers.current.size > 2) return;
    const target = e.target as Element;
    const handle = target.closest("[data-handle]")?.getAttribute("data-handle") as HandleId | null;
    if (handle && cb.current.onHandleStart) {
      cb.current.onHandleStart(handle);
      gesture.current = { kind: "handle", h: handle };
      return;
    }
    const id = target.closest("[data-id]")?.getAttribute("data-id") ?? null;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    // Botão do meio sempre arrasta a planta
    gesture.current = {
      kind: "pending",
      id: e.button === 1 ? null : id,
      x: e.clientX,
      y: e.clientY,
      additive,
      pan: viewRef.current,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.min(MAX_S, Math.max(MIN_S, g.view.s * (d / Math.max(1, g.d))));
      const r = wrapRef.current!.getBoundingClientRect();
      const px = mid.x - r.left - r.width / 2;
      const py = mid.y - r.top - r.height / 2;
      setView({ s, cx: g.world.x - px / s, cy: g.world.y - py / s });
      return;
    }
    if (g.kind === "pending") {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < TAP_PX) return;
      if (g.id && cb.current.onMoveStart(g.id, { additive: g.additive })) {
        const w0 = toWorldPt(g.x, g.y);
        gesture.current = { kind: "move", x: g.x, y: g.y, wx: w0.x, wy: w0.y };
      } else {
        gesture.current = { kind: "pan", x: g.x, y: g.y, view: g.pan };
      }
    }
    const g2 = gesture.current;
    if (g2.kind === "pan") {
      setView({ ...g2.view, cx: g2.view.cx - (e.clientX - g2.x) / g2.view.s, cy: g2.view.cy - (e.clientY - g2.y) / g2.view.s });
    } else if (g2.kind === "move") {
      const w = toWorldPt(e.clientX, e.clientY);
      cb.current.onMove(w.x - g2.wx, w.y - g2.wy, { free: e.altKey });
    } else if (g2.kind === "handle") {
      cb.current.onHandle?.(g2.h, toWorldPt(e.clientX, e.clientY), { free: e.altKey || e.shiftKey });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g.kind === "pinch") {
      // Sobrou um dedo: segue arrastando a planta
      const rest = [...pointers.current.values()][0];
      gesture.current = rest ? { kind: "pan", x: rest.x, y: rest.y, view: viewRef.current } : { kind: "none" };
      return;
    }
    if (pointers.current.size > 0) return;
    if (g.kind === "pending") cb.current.onTap(g.id, { additive: g.additive });
    if (g.kind === "move") cb.current.onMoveEnd(e.type === "pointercancel");
    if (g.kind === "handle") cb.current.onHandleEnd?.(e.type === "pointercancel");
    gesture.current = { kind: "none" };
  };

  // Escala: px por cm dentro do grupo da planta
  const k = view.s / U;
  const px = (n: number) => n / k; // n pixels de tela em unidades da planta
  const transform = `translate(${size.w / 2} ${size.h / 2}) scale(${k}) translate(${-view.cx * U} ${-view.cy * U})`;
  const b = useMemo(() => boundsOf(levelEls), [levelEls]);

  const labelEls = levelEls.filter(
    (el) =>
      (el.kind === "room" && el.label && !el.hideLabel) ||
      (el.kind === "table" && el.label) ||
      (el.kind === "text" && el.label) ||
      (el.kind !== "room" && el.kind !== "table" && el.kind !== "text" && KINDS[el.kind].showsLabel && el.label && mode === "edit"),
  );

  // Barra de escala
  const barM = niceStep(90 / view.s);
  const groupOfTable = new Map<string, GroupOutline>();
  for (const g of groups ?? []) for (const t of g.tableIds) groupOfTable.set(t, g);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full select-none overflow-hidden rounded-2xl border border-primary-gold/15 bg-[#14110e]"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {size.w > 0 && (
        <svg width={size.w} height={size.h} className="block" role="img" aria-label="Planta do andar">
          <PlanDefs />
          <g transform={transform}>
            {showGrid && b && (
              <rect
                x={(Math.floor(b.minX) - 3) * U}
                y={(Math.floor(b.minY) - 3) * U}
                width={(Math.ceil(b.maxX - b.minX) + 6) * U}
                height={(Math.ceil(b.maxY - b.minY) + 6) * U}
                fill="url(#fp-grid)"
                pointerEvents="none"
              />
            )}
            {levelEls.map((el) => {
              const interactive = isInteractive(el);
              const state = mode === "day" && el.kind === "table" ? tableStates?.get(el.id) : undefined;
              const dim = mode === "day" && el.kind !== "table" && el.kind !== "room" && !KINDS[el.kind].structural;
              return (
                <g
                  key={el.id}
                  data-id={interactive ? el.id : undefined}
                  transform={`translate(${el.x * U} ${el.y * U}) rotate(${el.rot})`}
                  style={{ cursor: interactive ? (mode === "day" ? "pointer" : "move") : undefined }}
                  pointerEvents={interactive ? "visiblePainted" : "none"}
                >
                  <Shape2D el={el} state={state} dim={dim} />
                </g>
              );
            })}

            {/* Grupos de mesas juntadas */}
            {groups?.map((g) => {
              const els = levelEls.filter((e) => g.tableIds.includes(e.id));
              const gb = boundsOf(els);
              if (!gb) return null;
              const pad = 12;
              const color = g.state ? STATE_META[g.state].color : "#e6c56b";
              return (
                <rect
                  key={g.key}
                  x={gb.minX * U - pad}
                  y={gb.minY * U - pad}
                  width={(gb.maxX - gb.minX) * U + pad * 2}
                  height={(gb.maxY - gb.minY) * U + pad * 2}
                  rx={10}
                  fill="none"
                  stroke={color}
                  strokeWidth={px(2)}
                  strokeDasharray={`${px(7)} ${px(4)}`}
                  pointerEvents="none"
                />
              );
            })}

            {/* Seleção */}
            {levelEls
              .filter((el) => selected.has(el.id) || picking?.has(el.id))
              .map((el) => {
                const pad = px(3);
                const linear = KINDS[el.kind].linear;
                const w = el.w * U + (linear ? el.d * U : 0);
                return (
                  <g key={`sel-${el.id}`} transform={`translate(${el.x * U} ${el.y * U}) rotate(${el.rot})`} pointerEvents="none">
                    <rect
                      x={-w / 2 - pad}
                      y={(-el.d * U) / 2 - pad}
                      width={w + pad * 2}
                      height={el.d * U + pad * 2}
                      rx={px(4)}
                      fill={picking?.has(el.id) ? "rgba(230,197,107,0.18)" : "none"}
                      stroke={picking?.has(el.id) ? "#e6c56b" : "#ffffff"}
                      strokeWidth={px(2)}
                      strokeDasharray={picking?.has(el.id) ? `${px(5)} ${px(3)}` : undefined}
                    />
                  </g>
                );
              })}

            {/* Nomes (sempre de pé, sem girar com o elemento) */}
            <g pointerEvents="none">
              {labelEls.map((el) => {
                if (el.kind === "room") {
                  const p = toWorld(el, el.lx ?? 0, el.ly ?? 0);
                  return (
                    <text
                      key={`l-${el.id}`}
                      x={p.x * U}
                      y={p.y * U}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={Math.min(34, Math.max(16, Math.min(el.w, el.d) * U * 0.12))}
                      fontWeight={700}
                      letterSpacing={4}
                      fill="#e6c56b"
                      fillOpacity={0.32}
                    >
                      {el.label!.toUpperCase()}
                    </text>
                  );
                }
                if (el.kind === "table") {
                  const state = mode === "day" ? tableStates?.get(el.id) : undefined;
                  const { ink } = tableFill(state, el);
                  const fs = Math.max(14, Math.min(40, Math.min(el.w, el.d) * U * 0.42));
                  const badge = tableBadges?.get(el.id) ?? 0;
                  const big = Math.min(el.w, el.d) >= 0.7;
                  const inGroup = groupOfTable.has(el.id);
                  return (
                    <g key={`l-${el.id}`}>
                      <text
                        x={el.x * U}
                        y={el.y * U - (big && mode === "day" && el.seats ? fs * 0.25 : 0)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fs}
                        fontWeight={800}
                        fill={ink}
                      >
                        {el.label}
                      </text>
                      {big && mode === "day" && !!el.seats && (
                        <text x={el.x * U} y={el.y * U + fs * 0.62} textAnchor="middle" dominantBaseline="central" fontSize={fs * 0.42} fontWeight={600} fill={ink} fillOpacity={0.75}>
                          {el.seats} lug.
                        </text>
                      )}
                      {badge > 0 && !inGroup && (
                        <g transform={`translate(${el.x * U + (el.w * U) / 2 - 2} ${el.y * U - (el.d * U) / 2 + 2})`}>
                          <circle r={px(9)} fill="#14110e" stroke={ink} strokeWidth={px(1.2)} />
                          <text textAnchor="middle" dominantBaseline="central" fontSize={px(11)} fontWeight={800} fill="#e6c56b">
                            {badge}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }
                const small = el.kind !== "text" || el.variant === "small";
                return (
                  <text
                    key={`l-${el.id}`}
                    x={el.x * U}
                    y={el.y * U}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={el.kind === "text" ? (small ? 16 : 26) : 12}
                    fontWeight={el.kind === "text" ? 700 : 600}
                    fill={el.kind === "text" ? "#e6c56b" : "#f3ead8"}
                    fillOpacity={el.kind === "text" ? 0.55 : 0.9}
                    stroke={el.kind === "text" ? undefined : "#14110e"}
                    strokeWidth={el.kind === "text" ? undefined : 3}
                    paintOrder="stroke"
                  >
                    {el.label}
                  </text>
                );
              })}

              {/* Rótulo do grupo */}
              {groups?.map((g) => {
                const els = levelEls.filter((e) => g.tableIds.includes(e.id));
                const gb = boundsOf(els);
                if (!gb) return null;
                const color = g.state ? STATE_META[g.state].color : "#e6c56b";
                const text = g.label;
                const fs = px(12);
                const w = text.length * fs * 0.62 + px(14);
                const x = ((gb.minX + gb.maxX) / 2) * U;
                const y = gb.minY * U - 12 - px(12);
                return (
                  <g key={`gl-${g.key}`} transform={`translate(${x} ${y})`}>
                    <rect x={-w / 2} y={-px(10)} width={w} height={px(20)} rx={px(10)} fill={color} />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={800} fill="#14110e">
                      {text}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Alças do elemento selecionado */}
            {handlesFor && handlesFor.level === level && (
              <SelectionHandles el={handlesFor} px={px} />
            )}
          </g>
        </svg>
      )}

      {/* Controles de zoom */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        {[
          { icon: <LuPlus size={16} />, label: "Aproximar", on: () => zoomAt(1.25) },
          { icon: <LuMinus size={16} />, label: "Afastar", on: () => zoomAt(0.8) },
          { icon: <LuMaximize size={15} />, label: "Enquadrar a planta", on: fit },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.label}
            aria-label={b.label}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={b.on}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-gold/20 bg-primary-black/85 text-primary-gold/80 transition-colors hover:border-primary-gold/50 hover:text-primary-gold"
          >
            {b.icon}
          </button>
        ))}
      </div>

      {/* Escala */}
      <div className="pointer-events-none absolute bottom-2 left-3 flex flex-col gap-0.5 text-[10px] text-primary-gold/60">
        <span className="block h-1.5 border-x border-b border-primary-gold/60" style={{ width: barM * view.s }} />
        <span>{formatMeters(barM)}</span>
      </div>
      {hint && (
        <div className="pointer-events-none absolute bottom-2 right-3 max-w-[60%] text-right text-[11px] text-primary-gold/55">{hint}</div>
      )}
    </div>
  );
}

function SelectionHandles({ el, px }: { el: PlanElement; px: (n: number) => number }) {
  const linear = KINDS[el.kind].linear;
  const r = px(7);
  const handles = HANDLES.filter((h) => !linear || h === "e" || h === "w");
  const topY = (-el.d * U) / 2;
  const knobY = topY - px(30);
  const below = boundsOf([el])!.maxY * U;
  const dims =
    el.kind === "table" && el.label ? `${tableTitle(el.label)} · ${formatMeters(el.w)} × ${formatMeters(el.d)}` : `${formatMeters(el.w)} × ${formatMeters(el.d)}`;
  return (
    <g>
      <g transform={`translate(${el.x * U} ${el.y * U}) rotate(${el.rot})`}>
        <line x1={0} y1={topY} x2={0} y2={knobY} stroke="#ffffff" strokeWidth={px(1.5)} pointerEvents="none" />
        <g data-handle="rot" style={{ cursor: "grab" }}>
          <circle cx={0} cy={knobY} r={px(16)} fill="transparent" />
          <circle cx={0} cy={knobY} r={r} fill="#e6c56b" stroke="#14110e" strokeWidth={px(2)} />
        </g>
        {handles.map((h) => {
          const p = handleLocal(el, h);
          const lp = p;
          return (
            <g key={h} data-handle={h} style={{ cursor: "pointer" }}>
              <circle cx={lp.x * U} cy={lp.y * U} r={px(14)} fill="transparent" />
              <rect x={lp.x * U - r} y={lp.y * U - r} width={r * 2} height={r * 2} rx={px(2)} fill="#ffffff" stroke="#14110e" strokeWidth={px(2)} />
            </g>
          );
        })}
      </g>
      <text
        x={el.x * U}
        y={below + px(18)}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={px(12)}
        fontWeight={700}
        fill="#ffffff"
        stroke="#14110e"
        strokeWidth={px(3)}
        paintOrder="stroke"
        pointerEvents="none"
      >
        {dims}
      </text>
    </g>
  );
}
