import type { ReactNode } from "react";
import { CoinGlyph, HopConeGlyph, RoseGlyph, ShamrockGlyph, StarGlyph } from "./glyphs";
import {
  evergreenNeedles,
  leafPairs,
  leaves,
  pointsToPath,
  sampleQuad,
  sampleWave,
  seededRandom,
  thorns,
  transpose,
  trochoid,
  type PathPoint,
  type Pt,
} from "./ornaments";
import { PENNANT_COLORS } from "./rows";

// Faixas decorativas riscadas ao longo de uma borda — o cabeçalho do cardápio
// e o menu lateral do admin. Horizontais ou verticais.

export type StripKind =
  | "thorns"
  | "evergreen"
  | "vine"
  | "bunting"
  | "hops"
  | "laurel"
  | "roses"
  | "clover"
  | "stars"
  | "serpentine"
  | "celtic";

const f = (n: number) => n.toFixed(1);
const deg = (radians: number) => ((radians * 180) / Math.PI).toFixed(1);
const FLOWER_PETALS = ["#c4a7ff", "#ffb3d1", "#ffe08a", "#fff3f8"];

export function OrnamentStrip({
  kind,
  length,
  thickness,
  vertical = false,
  colors,
}: {
  kind: StripKind;
  length: number;
  thickness: number;
  vertical?: boolean;
  /** Cores das flâmulas ou da serpentina. */
  colors?: string[];
}) {
  if (length <= 0) return null;
  const w = vertical ? thickness : length;
  const h = vertical ? length : thickness;
  const orient = (points: PathPoint[]) => (vertical ? transpose(points) : points);
  const orientPts = (points: Pt[]) =>
    vertical ? points.map((p) => ({ x: p.y, y: p.x })) : points;

  let content: ReactNode;
  switch (kind) {
    case "bunting": {
      // Na vertical, as flâmulas apontam para dentro (para a esquerda)
      const palette = colors ?? PENNANT_COLORS;
      const count = Math.max(1, Math.round(length / 120));
      const seg = length / count;
      const depth = thickness * 0.22;
      let string = "";
      const flags: (PathPoint & { color: string })[] = [];
      for (let i = 0; i < count; i++) {
        const p0 = { x: i * seg, y: 2 };
        const c = { x: i * seg + seg / 2, y: 2 + depth * 2 };
        const p2 = { x: (i + 1) * seg, y: 2 };
        const place = (p: Pt) => (vertical ? { x: thickness - p.y, y: p.x } : p);
        const a = place(p0);
        const b = place(c);
        const e = place(p2);
        string += `M${f(a.x)} ${f(a.y)} Q${f(b.x)} ${f(b.y)} ${f(e.x)} ${f(e.y)} `;
        sampleQuad(p0, c, p2, 16)
          .slice(1, -1)
          .forEach((p) => {
            const at = place(p);
            flags.push({
              ...at,
              angle: vertical ? Math.PI / 2 + p.angle : p.angle,
              color: palette[flags.length % palette.length],
            });
          });
      }
      const size = thickness * 0.55;
      content = (
        <>
          <path d={string} fill="none" stroke="#e6c56b" strokeOpacity="0.6" strokeWidth="0.8" />
          {flags.map((p, i) => (
            <path
              key={i}
              transform={`translate(${f(p.x)} ${f(p.y)}) rotate(${deg(p.angle)})`}
              d={`M${-size / 2} 0 L${size / 2} 0 L0 ${size * 1.15} Z`}
              fill={p.color}
              fillOpacity="0.85"
              stroke="#e6c56b"
              strokeWidth="0.6"
            />
          ))}
        </>
      );
      break;
    }

    case "evergreen": {
      const points = orient(sampleWave(length, thickness / 2, thickness * 0.08, 140, 4, 0.4));
      const needles = evergreenNeedles(points, thickness * 0.95, 5);
      const rand = seededRandom(9);
      const berries = points.filter((_, i) => i > 0 && i % 18 === 0);
      content = (
        <>
          <g fill="none" strokeLinecap="round">
            <path d={needles.dark} stroke="#2f5a3c" strokeWidth="1.2" />
            <path d={needles.mid} stroke="#5f9a6c" strokeWidth="1" />
            <path d={needles.gold} stroke="#e6c56b" strokeOpacity="0.85" strokeWidth="0.8" />
          </g>
          {berries.map((p, i) => (
            <g key={i} fill="#c0392b" stroke="#e6c56b" strokeOpacity="0.6" strokeWidth="0.4">
              <circle cx={p.x - 1.8} cy={p.y + 1} r="1.8" />
              <circle cx={p.x + 1.8} cy={p.y + 1} r="1.8" />
              <circle cx={p.x + (rand() - 0.5)} cy={p.y - 1.6} r="1.8" />
            </g>
          ))}
        </>
      );
      break;
    }

    case "thorns": {
      const points = orient(sampleWave(length, thickness / 2, thickness * 0.16, 70, 3, 1.1));
      content = (
        <>
          <path d={pointsToPath(points)} fill="none" stroke="#6b4a2a" strokeWidth="1.8" strokeLinecap="round" />
          <path d={pointsToPath(points)} fill="none" stroke="#e6c56b" strokeOpacity="0.55" strokeWidth="0.6" />
          <path d={thorns(points, 11, thickness * 0.32, 3)} fill="#e6c56b" fillOpacity="0.8" />
        </>
      );
      break;
    }

    case "laurel": {
      const points = orient(sampleWave(length, thickness / 2, thickness * 0.05, 160, 3, 0));
      const pairs = leafPairs(points, 8, thickness * 0.42);
      content = (
        <>
          <path d={pointsToPath(points)} fill="none" stroke="#a8822a" strokeWidth="1" />
          <path d={pairs.d} fill="url(#st-hatch-gold-f)" stroke="#e6c56b" strokeWidth="0.6" />
          <path d={pairs.veins} fill="none" stroke="#e6c56b" strokeOpacity="0.5" strokeWidth="0.4" />
        </>
      );
      break;
    }

    case "hops": {
      const points = orient(sampleWave(length, thickness / 2, thickness * 0.14, 90, 3, 0.7));
      const foliage = leaves(points, 16, thickness * 0.42, 17);
      content = (
        <>
          <path d={pointsToPath(points)} fill="none" stroke="#7f9a5a" strokeWidth="1.3" strokeLinecap="round" />
          <path d={foliage.d} fill="url(#st-hatch-pine-f)" stroke="#9cc7a4" strokeWidth="0.6" />
          {foliage.spots
            .filter((_, i) => i % 2 === 0)
            .map((spot, i) => (
              <g
                key={i}
                transform={`translate(${f(spot.x - Math.sin(spot.angle) * spot.side * thickness * 0.18)} ${f(
                  spot.y + Math.cos(spot.angle) * spot.side * thickness * 0.18,
                )})`}
              >
                <HopConeGlyph r={thickness * 0.2} />
              </g>
            ))}
        </>
      );
      break;
    }

    case "roses":
    case "clover":
    case "vine": {
      const points = orient(sampleWave(length, thickness / 2, thickness * 0.14, 80, 3, 0.2));
      const foliage = leaves(points, 15, thickness * 0.5, 4);
      content = (
        <>
          <path
            d={pointsToPath(points)}
            fill="none"
            stroke={kind === "clover" ? "#3f8a5c" : "#7f9a5a"}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path d={foliage.d} fill="url(#st-hatch-pine-f)" stroke="#9cc7a4" strokeWidth="0.7" />
          <path d={foliage.veins} fill="none" stroke="#9cc7a4" strokeOpacity="0.6" strokeWidth="0.5" />
          {foliage.spots
            .filter((_, i) => i % (kind === "vine" ? 4 : 3) === 1)
            .map((spot, i) => (
              <g key={i} transform={`translate(${f(spot.x)} ${f(spot.y)})`}>
                {kind === "roses" ? (
                  <RoseGlyph r={thickness * 0.24} />
                ) : kind === "clover" ? (
                  i % 4 === 3 ? (
                    <CoinGlyph r={thickness * 0.16} />
                  ) : (
                    <ShamrockGlyph r={thickness * 0.2} />
                  )
                ) : (
                  <>
                    {[0, 72, 144, 216, 288].map((angle) => {
                      const a = (angle * Math.PI) / 180;
                      return (
                        <circle
                          key={angle}
                          cx={Math.cos(a) * 2.6}
                          cy={Math.sin(a) * 2.6}
                          r="2.1"
                          fill={FLOWER_PETALS[i % FLOWER_PETALS.length]}
                          fillOpacity="0.9"
                          stroke="#e6c56b"
                          strokeOpacity="0.5"
                          strokeWidth="0.4"
                        />
                      );
                    })}
                    <circle r="1.4" fill="#e6c56b" />
                  </>
                )}
              </g>
            ))}
        </>
      );
      break;
    }

    case "stars": {
      const points = orient(sampleWave(length, thickness * 0.25, thickness * 0.06, 120, 3, 0));
      const hangs = points.filter((_, i) => i > 0 && i % 10 === 5);
      content = (
        <>
          <path d={pointsToPath(points)} fill="none" stroke="#e6c56b" strokeOpacity="0.55" strokeWidth="0.7" />
          {hangs.map((p, i) => {
            const drop = thickness * (0.3 + (i % 3) * 0.12);
            const end = vertical ? { x: p.x - drop, y: p.y } : { x: p.x, y: p.y + drop };
            return (
              <g key={i}>
                <path d={`M${f(p.x)} ${f(p.y)} L${f(end.x)} ${f(end.y)}`} stroke="#e6c56b" strokeOpacity="0.4" strokeWidth="0.5" />
                <g transform={`translate(${f(end.x)} ${f(end.y)})`}>
                  <StarGlyph r={thickness * 0.2} points={i % 2 ? 4 : 5} />
                </g>
              </g>
            );
          })}
        </>
      );
      break;
    }

    case "serpentine": {
      const palette = colors ?? ["#ff3ea5", "#19c3b2", "#ffd23f"];
      const radius = thickness * 0.3;
      content = (
        <>
          {palette.slice(0, 2).map((color, i) => {
            const points = orientPts(trochoid(length, thickness / 2, radius, 24, i * Math.PI, 2));
            return (
              <g key={color}>
                <path d={pointsToPath(points)} fill="none" stroke={color} strokeOpacity="0.8" strokeWidth="1.6" />
                <path d={pointsToPath(points)} fill="none" stroke="#e6c56b" strokeOpacity="0.45" strokeWidth="0.4" />
              </g>
            );
          })}
        </>
      );
      break;
    }

    case "celtic": {
      // Duas fitas que se cruzam, alternando por cima e por baixo
      const wavelength = 36;
      const a = orient(sampleWave(length, thickness / 2, thickness * 0.28, wavelength, 1.5, 0));
      const b = orient(sampleWave(length, thickness / 2, thickness * 0.28, wavelength, 1.5, Math.PI));
      const ribbon = (points: Pt[], key: string) => (
        <g key={key}>
          <path d={pointsToPath(points)} fill="none" stroke="#e6c56b" strokeWidth="2.6" strokeLinecap="round" />
          <path d={pointsToPath(points)} fill="none" stroke="#1a140c" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      );
      // Cruzamentos a cada meio comprimento de onda; em um sim, outro não, a
      // fita A volta por cima
      const overs: Pt[][] = [];
      for (let x = wavelength / 2; x < length; x += wavelength) {
        const segment = (vertical ? a.filter((p) => Math.abs(p.y - x) < 5) : a.filter((p) => Math.abs(p.x - x) < 5));
        if (segment.length > 1) overs.push(segment);
      }
      content = (
        <>
          {ribbon(a, "a")}
          {ribbon(b, "b")}
          {overs.map((segment, i) => ribbon(segment, `o${i}`))}
        </>
      );
      break;
    }
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block overflow-visible">
      {content}
    </svg>
  );
}
