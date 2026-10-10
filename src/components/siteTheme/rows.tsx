import { useId, type CSSProperties, type ReactNode } from "react";
import { HollySprig, RoseGlyph, ShamrockGlyph, CoinGlyph } from "./glyphs";
import { evergreenNeedles, leaves, pointsToPath, sampleQuad, type Pt } from "./ornaments";

// Fileiras que atravessam o topo da tela: varais de flâmulas, guirlandas e
// objetos pendurados. Desenhadas na largura exata da camada (1px = 1 unidade).

const f = (n: number) => n.toFixed(1);

function useSvgId() {
  return "st" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

export interface Swag {
  p0: Pt;
  c: Pt;
  p2: Pt;
  /** Ponto mais baixo do gomo. */
  low: Pt;
}

/** Gomos (curvas que "pesam") de ponta a ponta da largura. */
export function swagGeometry(
  width: number,
  {
    spacing = 190,
    top = 4,
    depthRatio = 0.16,
    minDepth = 14,
    maxDepth = 30,
  }: { spacing?: number; top?: number; depthRatio?: number; minDepth?: number; maxDepth?: number } = {},
) {
  const count = Math.max(2, Math.round(width / spacing));
  const seg = width / count;
  const depth = Math.min(maxDepth, Math.max(minDepth, seg * depthRatio));
  const swags: Swag[] = Array.from({ length: count }, (_, i) => {
    const x0 = i * seg;
    return {
      p0: { x: x0, y: top },
      // o meio de uma curva quadrática desce metade do controle
      c: { x: x0 + seg / 2, y: top + depth * 2 },
      p2: { x: x0 + seg, y: top },
      low: { x: x0 + seg / 2, y: top + depth },
    };
  });
  const string = swags
    .map((s) => `M${f(s.p0.x)} ${f(s.p0.y)} Q${f(s.c.x)} ${f(s.c.y)} ${f(s.p2.x)} ${f(s.p2.y)}`)
    .join(" ");
  const junctions: Pt[] = [...swags.map((s) => s.p0), swags[swags.length - 1].p2];
  return { swags, string, junctions, depth, top };
}

/** Geometria da guirlanda de pinheiro do Natal (também das lanternas). */
export function garlandGeometry(width: number) {
  const geometry = swagGeometry(width, {
    spacing: 170,
    top: 6,
    depthRatio: 0.2,
    minDepth: 18,
    maxDepth: 34,
  });
  return { ...geometry, height: geometry.top + geometry.depth + 16 };
}

// ── Flâmulas ─────────────────────────────────────────────────────────────────

export const PENNANT_COLORS = ["#c4a7ff", "#ffb3d1", "#9be7c4", "#ffe08a", "#e6c56b"];

export type PennantShape = "triangle" | "swallowtail" | "diamond";
export type PennantPattern = "plain" | "dots" | "lozenge" | "stripes";

const PENNANT_SHAPES: Record<PennantShape, string> = {
  triangle: "M0 0 L14 0 L7 18 Z",
  swallowtail: "M0 0 L14 0 L14 17 L7 12 L0 17 Z",
  diamond: "M7 0 L14 9 L7 18 L0 9 Z",
};

/** Flâmula com borda dourada e estampa riscada (chita, losangos ou listras). */
export function PennantArt({
  color,
  shape = "triangle",
  pattern = "plain",
}: {
  color: string;
  shape?: PennantShape;
  pattern?: PennantPattern;
}) {
  const id = useSvgId();
  const d = PENNANT_SHAPES[shape];
  return (
    <svg viewBox="-1 -1 16 20" className="block w-full h-auto">
      <defs>
        <clipPath id={`${id}c`}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={color} fillOpacity="0.88" />
      <g clipPath={`url(#${id}c)`}>
        {pattern === "dots" && (
          // Chita: florzinhas e bolinhas
          <g fill="#fff8e1" fillOpacity="0.75">
            <circle cx="3" cy="3" r="1.1" />
            <circle cx="10.5" cy="4" r="1.3" />
            <circle cx="6.5" cy="9" r="1.1" />
            <circle cx="2.5" cy="13" r="0.9" />
            <circle cx="11" cy="13" r="1" />
            <circle cx="7" cy="16" r="0.8" />
          </g>
        )}
        {pattern === "lozenge" && (
          // Baviera: losangos em grade diagonal
          <g fill="#2f6db5" fillOpacity="0.85">
            {[0, 7, 14].flatMap((x) =>
              [0, 7, 14].map((y) => (
                <path key={`${x}-${y}`} d={`M${x} ${y - 3} L${x + 3.5} ${y + 0.5} L${x} ${y + 4} L${x - 3.5} ${y + 0.5} Z`} />
              )),
            )}
          </g>
        )}
        {pattern === "stripes" && (
          <path d="M0 4 L14 4 M0 8 L14 8 M0 12 L14 12" stroke="#fff8e1" strokeOpacity="0.6" strokeWidth="1.2" />
        )}
        <path d="M3 3 L11 3 M4.5 6.5 L9.5 6.5" stroke="#5b4630" strokeOpacity="0.3" strokeWidth="0.7" />
      </g>
      <path d={d} fill="none" stroke="#e6c56b" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Varal de flâmulas de ponta a ponta. Cada flâmula balança sozinha a partir do
 * barbante. `top` desloca o varal inteiro (para cruzar dois varais).
 */
export function BuntingRow({
  width,
  colors = PENNANT_COLORS,
  shapes = ["triangle"],
  pattern = "plain",
  spacing = 190,
  every = 26,
  top = 4,
  style,
  flagWidth,
}: {
  width: number;
  colors?: string[];
  shapes?: PennantShape[];
  pattern?: PennantPattern | ((index: number) => PennantPattern);
  spacing?: number;
  /** Distância entre flâmulas no barbante. */
  every?: number;
  top?: number;
  style?: CSSProperties;
  /** Largura de cada flâmula (CSS). */
  flagWidth?: string;
}) {
  if (width <= 0) return null;
  const geometry = swagGeometry(width, { spacing, top });
  const pennants = geometry.swags.flatMap((s) => sampleQuad(s.p0, s.c, s.p2, every).slice(1, -1));
  const height = top + geometry.depth + 26;
  return (
    <div className="st-bunting" style={style}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto">
        <path d={geometry.string} fill="none" stroke="#e6c56b" strokeOpacity="0.6" strokeWidth="1" />
      </svg>
      {pennants.map((p, i) => (
        <div
          key={i}
          className="st-pennant"
          style={{
            left: p.x,
            top: p.y,
            rotate: `${((p.angle * 180) / Math.PI).toFixed(1)}deg`,
            ...(flagWidth && { width: flagWidth }),
          }}
        >
          <div className="st-pennant-swing" style={{ animationDelay: `${-((i * 0.37) % 2.4)}s` }}>
            <PennantArt
              color={colors[i % colors.length]}
              shape={shapes[i % shapes.length]}
              pattern={typeof pattern === "function" ? pattern(i) : pattern}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Guirlandas ───────────────────────────────────────────────────────────────

export type GarlandKind = "evergreen" | "roses" | "clover";

/**
 * Guirlanda riscada de ponta a ponta: pinheiro com azevinho (Natal), rosas
 * (Namorados) ou trevos com moedas (St. Patrick's).
 */
export function GarlandRow({ width, kind }: { width: number; kind: GarlandKind }) {
  if (width <= 0) return null;
  const { swags, junctions, height } = garlandGeometry(width);
  const points = swags.flatMap((s) => sampleQuad(s.p0, s.c, s.p2, 4.5));

  if (kind === "evergreen") {
    const needles = evergreenNeedles(points, 17, 11);
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto">
        <g fill="none" strokeLinecap="round">
          <path d={needles.dark} stroke="#2f5a3c" strokeWidth="1.3" />
          <path d={needles.mid} stroke="#5f9a6c" strokeWidth="1.1" />
          <path d={needles.gold} stroke="#e6c56b" strokeOpacity="0.85" strokeWidth="0.9" />
        </g>
        {junctions.map((p, i) => (
          <g key={i} transform={`translate(${f(p.x)} ${p.y + 3})`}>
            <HollySprig />
          </g>
        ))}
      </svg>
    );
  }

  // Rosas e trevos: ramo com folhas e a flor/trevo a cada tantas folhas
  const foliage = leaves(points, 11, 7.5, kind === "roses" ? 21 : 33);
  return (
    <svg viewBox={`0 0 ${width} ${height + 6}`} className="block w-full h-auto">
      <path
        d={pointsToPath(points)}
        fill="none"
        stroke={kind === "roses" ? "#6b8a4e" : "#3f8a5c"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d={foliage.d} fill="url(#st-hatch-pine-f)" stroke="#9cc7a4" strokeWidth="0.7" />
      <path d={foliage.veins} fill="none" stroke="#9cc7a4" strokeOpacity="0.55" strokeWidth="0.5" />
      {foliage.spots
        .filter((_, i) => i % 3 === 1)
        .map((spot, i) => (
          <g key={i} transform={`translate(${f(spot.x)} ${f(spot.y)})`}>
            {kind === "roses" ? <RoseGlyph r={4.6} /> : <ShamrockGlyph r={4} />}
          </g>
        ))}
      {junctions.map((p, i) => (
        <g key={`j${i}`} transform={`translate(${f(p.x)} ${p.y + 4})`}>
          {kind === "roses" ? (
            <>
              <g transform="translate(-5 1)">
                <RoseGlyph r={4.4} />
              </g>
              <g transform="translate(5 1)">
                <RoseGlyph r={4.4} />
              </g>
              <g transform="translate(0 -3)">
                <RoseGlyph r={5.4} />
              </g>
            </>
          ) : (
            <>
              <ShamrockGlyph r={6} />
              <g transform="translate(6 5)">
                <CoinGlyph r={3.2} />
              </g>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Guirlanda de pinheiro (nome antigo, usado nas miniaturas). */
export function EvergreenGarland({ width }: { width: number }) {
  return <GarlandRow width={width} kind="evergreen" />;
}

// ── Objetos pendurados ───────────────────────────────────────────────────────

/**
 * Objetos pendurados por uma corrente em pontos da tela (estandartes,
 * estrelas, sinos...), cada um balançando no seu ritmo.
 */
export function HangingRow({
  points,
  render,
  chain = (i) => 10 + (i % 3) * 9,
  itemWidth,
}: {
  points: Pt[];
  render: (index: number) => ReactNode;
  chain?: (index: number) => number;
  /** Largura de cada objeto (CSS, ex: "clamp(24px, 6cqmin, 50px)"). */
  itemWidth: string;
}) {
  return (
    <>
      {points.map((p, i) => (
        <div
          key={i}
          className="st-hang"
          style={{
            left: p.x,
            top: p.y,
            width: itemWidth,
            animationDuration: `${3.2 + (i % 3) * 0.5}s`,
            animationDelay: `${-i * 0.7}s`,
          }}
        >
          <div className="st-hang-chain" style={{ height: chain(i) }} />
          <div className="st-hang-body">{render(i)}</div>
        </div>
      ))}
    </>
  );
}
