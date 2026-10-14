"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

// Selos da versão minimalista dos temas: desenhos próprios em gravura —
// contorno dourado firme, sombra em hachura na cor do tema e uma luz pontual
// (rosto da abóbora, velas, chama). Caixa de 48×48; feitos para ~30–50px.

export const EMBLEM_LINE = "#e6c56b";
const EMBLEM_FILL = "#16120d";

const EmblemIdContext = createContext("");
const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "");

/** Moldura SVG do desenho: define a hachura (na cor do tema) e o brilho das luzes. */
export function EmblemArt({ hatch, children }: { hatch: string; children: ReactNode }) {
  const id = `st-emblem-${cleanId(useId())}`;
  return (
    <svg viewBox="0 0 48 48" className="st-emblem-svg" aria-hidden="true">
      <defs>
        <pattern
          id={`${id}-hatch`}
          width="2.6"
          height="2.6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(40)"
        >
          <line x1="0" y1="0" x2="0" y2="2.6" stroke={hatch} strokeWidth="0.95" />
        </pattern>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <EmblemIdContext.Provider value={id}>{children}</EmblemIdContext.Provider>
    </svg>
  );
}

/**
 * Uma peça do desenho: preenchimento escuro (esconde o que está atrás),
 * hachura só dentro de `shade` (o lado da sombra), detalhes recortados pela
 * forma e o contorno dourado por cima.
 */
export function Part({
  d,
  shade,
  line = 1.7,
  children,
}: {
  d: string;
  shade?: string;
  line?: number;
  children?: ReactNode;
}) {
  const id = useContext(EmblemIdContext);
  const clip = `${id}-${cleanId(useId())}`;
  return (
    <>
      <path d={d} fill={EMBLEM_FILL} />
      {(shade || children) && (
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
      )}
      {shade && <path d={shade} fill={`url(#${id}-hatch)`} clipPath={`url(#${clip})`} />}
      {children && <g clipPath={`url(#${clip})`}>{children}</g>}
      <path
        d={d}
        fill="none"
        stroke={EMBLEM_LINE}
        strokeWidth={line}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  );
}

/** Traço dourado (talos, nervuras, faixas...). */
export function Line({ d, width = 1.2, opacity }: { d: string; width?: number; opacity?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={EMBLEM_LINE}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

/** Luz acesa (vela, chama, rosto da abóbora): cor própria com brilho; `flicker` tremula. */
export function Light({ d, color, flicker = false }: { d: string; color: string; flicker?: boolean }) {
  const id = useContext(EmblemIdContext);
  return (
    <path
      d={d}
      fill={color}
      filter={`url(#${id}-glow)`}
      className={flicker ? "st-emblem-flicker" : undefined}
    />
  );
}

export function Dots({ points, r, color }: { points: [number, number][]; r: number; color: string }) {
  return (
    <>
      {points.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
      ))}
    </>
  );
}

// ── Geometria ────────────────────────────────────────────────────────────────

const round = (n: number) => +n.toFixed(2);

export function rotatePoint(x: number, y: number, degrees: number): [number, number] {
  const a = (degrees * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

/**
 * Leva um path desenhado em volta da origem (só M L C Z absolutos) para o
 * lugar certo, girado — assim a hachura de peças giradas continua caindo do
 * mesmo lado (a luz vem sempre da esquerda).
 */
export function place(d: string, tx: number, ty: number, degrees = 0) {
  return d.replace(/([MLCZ])([^MLCZ]*)/g, (_, command: string, args: string) => {
    const numbers = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const points: number[] = [];
    for (let i = 0; i < numbers.length; i += 2) {
      const [x, y] = rotatePoint(numbers[i], numbers[i + 1], degrees);
      points.push(round(x + tx), round(y + ty));
    }
    return command + points.join(" ");
  });
}

/** Estrela de `points` pontas (fechada, em path). */
export function star(cx: number, cy: number, r: number, points = 5, inner = 0.45) {
  const vertices = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 ? r * inner : r;
    const angle = ((-90 + (i * 180) / points) * Math.PI) / 180;
    return `${round(cx + radius * Math.cos(angle))} ${round(cy + radius * Math.sin(angle))}`;
  });
  return `M${vertices.join("L")}Z`;
}
