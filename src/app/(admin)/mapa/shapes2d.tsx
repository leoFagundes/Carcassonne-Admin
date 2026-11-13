import React from "react";
import { variantOf } from "@/floorplan/catalog";
import type { PlanElement, TableState } from "@/floorplan/types";
import { STATE_META } from "@/floorplan/day";
import { understairDoor } from "@/floorplan/shelves";

/** A planta 2D é desenhada em centímetros (texto pequeno em metros some em alguns navegadores). */
export const U = 100;

export const FLOOR_2D: Record<string, string> = {
  wood: "#3a2a1e",
  tile: "#33302b",
  granite: "#2b2e32",
};

const WOOD = "#b98a5a";
const WOOD_DARK = "#7a5232";
const BENCH = "#d7b88d";
const SOFA = "#5b5f66";
const STEEL = "#9aa0a7";
const WALL = "#dccfb4";

const DECO_COLOR: Record<string, string> = {
  "glass-blue": "#3d74e0",
  "glass-green": "#b8cc45",
  logo: "#d6b268",
  "logo-dark": "#d6b268",
  mirror: "#a9c2cc",
  board: "#111111",
  map: "#cfc3a0",
  frame: "#8a6038",
  banner: "#7a4b2a",
  shield: "#c9842c",
  weapons: "#9a9ea3",
  arches: "#efe7d6",
  sconce: "#ffe3a1",
  pendant: "#ffe3a1",
  projector: "#e9e9e6",
  lattice: "#4a3a2c",
  rail: "#c79a2c",
  extinguisher: "#d33a2c",
  wallcab: "#d9d2c4",
  hood: "#8c9095",
  tv: "#0d0e12",
  speaker: "#1c1c20",
  ac: "#e8e8e4",
  darts: "#b8322c",
  bin: "#6f747a",
  coatrack: "#7a5232",
  fan: "#cfc8ba",
  clock: "#efe7d6",
  armor: "#a9adb2",
  chandelier: "#ffe3a1",
  easel: "#7a5232",
  dice: "#f2ead8",
  meeple: "#e6c56b",
};

/** Cores da estrutura no tema escuro (tela) e claro (impressão). */
const STRUCT = {
  dark: { floor: FLOOR_2D, floorStroke: "#e6c56b", floorStrokeOp: 0.08, wall: WALL, wallDark: "#7d776d", gap: "#1b1612", hatch: "url(#fp-hatch)", hatchStroke: "#0e0c0a" },
  paper: {
    floor: { wood: "#f4efe6", tile: "#eceae6", granite: "#e6e8ea" } as Record<string, string>,
    floorStroke: "#9a917f",
    floorStrokeOp: 0.6,
    wall: "#2a2522",
    wallDark: "#55504a",
    gap: "#ffffff",
    hatch: "url(#fp-hatch-paper)",
    hatchStroke: "#555",
  },
};

/** Contorno do polígono (em cm), ou null se for retângulo. */
function polyPoints(el: PlanElement): string | null {
  if (!el.points || el.points.length < 3) return null;
  return el.points.map((p) => `${p.x * U},${p.y * U}`).join(" ");
}

/** Cor da mesa no modo dia. */
export function tableFill(state: TableState | undefined, el: PlanElement): { fill: string; ink: string } {
  if (state) return { fill: STATE_META[state].color, ink: STATE_META[state].ink };
  return variantOf(el) === "black" ? { fill: "#26262a", ink: "#e6c56b" } : { fill: WOOD, ink: "#1d140c" };
}

/** Desenho de um elemento nos eixos dele (centro na origem, em cm). */
export function Shape2D({
  el,
  state,
  dim,
  paper,
  colors,
}: {
  el: PlanElement;
  /** Estado da mesa no modo dia. */
  state?: TableState;
  /** Fora do foco (outro andar, modo dia nos móveis). */
  dim?: boolean;
  /** Cores para papel (impressão). */
  paper?: boolean;
  /** Armário de jogos: cores das etiquetas das prateleiras. */
  colors?: string[];
}) {
  const S = paper ? STRUCT.paper : STRUCT.dark;
  const poly = polyPoints(el);
  const w = el.w * U;
  const d = el.d * U;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const v = variantOf(el);
  const op = dim ? 0.55 : 1;
  const sw = 1.5; // traço fino em cm

  switch (el.kind) {
    case "room": {
      const p = { fill: S.floor[v ?? "wood"], stroke: S.floorStroke, strokeOpacity: S.floorStrokeOp, strokeWidth: 2 };
      return poly ? <polygon points={poly} {...p} /> : <rect x={x0} y={y0} width={w} height={d} {...p} />;
    }
    case "block": {
      const p = { fill: S.hatch, stroke: S.hatchStroke, strokeWidth: 2, opacity: op };
      return poly ? <polygon points={poly} {...p} /> : <rect x={x0} y={y0} width={w} height={d} {...p} />;
    }
    case "stage": {
      const p = { fill: paper ? "#e9dcc6" : "#5a3d27", stroke: paper ? "#8a6a44" : "#2a1b10", strokeWidth: 2 };
      const planks = Array.from({ length: Math.max(1, Math.floor(d / 25)) }, (_, i) => (
        <line key={i} x1={x0} y1={y0 + (i + 1) * 25} x2={-x0} y2={y0 + (i + 1) * 25} stroke={paper ? "#b89a70" : "#3a2716"} strokeWidth={1.5} />
      ));
      if (poly)
        return (
          <g opacity={op}>
            <defs>
              <clipPath id={`clip-${el.id}`}>
                <polygon points={poly} />
              </clipPath>
            </defs>
            <polygon points={poly} {...p} />
            <g clipPath={`url(#clip-${el.id})`}>{planks}</g>
          </g>
        );
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} {...p} />
          {planks.filter((_, i) => (i + 1) * 25 < d)}
        </g>
      );
    }
    case "pillar":
      return v === "round" ? (
        <ellipse rx={w / 2} ry={d / 2} fill={paper ? "#9a958c" : "#6d6862"} stroke={paper ? "#333" : "#1b1816"} strokeWidth={2} />
      ) : (
        <rect x={x0} y={y0} width={w} height={d} fill={paper ? "#9a958c" : "#6d6862"} stroke={paper ? "#333" : "#1b1816"} strokeWidth={2} />
      );
    case "wall": {
      const fill = v === "dark" ? S.wallDark : S.wall;
      if (v === "low")
        return (
          <rect x={x0 - d / 2} y={y0} width={w + d} height={d} fill={S.wall} fillOpacity={0.35} stroke={S.wall} strokeWidth={2} strokeDasharray="8 5" />
        );
      return <rect x={x0 - d / 2} y={y0} width={w + d} height={d} fill={fill} />;
    }
    case "door": {
      const ink = S.wall;
      if (v === "sliding")
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={d} fill={S.gap} />
            <line x1={x0} y1={-d * 0.15} x2={w * 0.1} y2={-d * 0.15} stroke={ink} strokeWidth={3} />
            <line x1={-w * 0.1} y1={d * 0.15} x2={-x0} y2={d * 0.15} stroke={ink} strokeWidth={3} />
          </g>
        );
      if (v === "double") {
        const r = w / 2;
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={d} fill={S.gap} />
            <path d={`M 0 0 A ${r} ${r} 0 0 0 ${-w / 2} ${r}`} fill="none" stroke={ink} strokeWidth={2} strokeOpacity={0.6} />
            <path d={`M 0 0 A ${r} ${r} 0 0 1 ${w / 2} ${r}`} fill="none" stroke={ink} strokeWidth={2} strokeOpacity={0.6} />
            <line x1={-w / 2} y1={0} x2={-w / 2} y2={r} stroke={ink} strokeWidth={2.5} strokeOpacity={0.8} />
            <line x1={w / 2} y1={0} x2={w / 2} y2={r} stroke={ink} strokeWidth={2.5} strokeOpacity={0.8} />
          </g>
        );
      }
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill={S.gap} />
          <path d={`M ${w / 2} 0 A ${w} ${w} 0 0 1 ${-w / 2} ${w}`} fill="none" stroke={ink} strokeWidth={2} strokeOpacity={0.6} />
          <line x1={-w / 2} y1={0} x2={-w / 2} y2={w} stroke={ink} strokeWidth={2.5} strokeOpacity={0.8} />
        </g>
      );
    }
    case "arch":
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill={S.gap} fillOpacity={0.5} />
          <line x1={x0} y1={0} x2={-x0} y2={0} stroke="#efe7d6" strokeWidth={2.5} strokeDasharray="3 9" strokeLinecap="round" />
          <rect x={x0 - 6} y={y0} width={12} height={d} fill="#efe7d6" />
          <rect x={-x0 - 6} y={y0} width={12} height={d} fill="#efe7d6" />
        </g>
      );
    case "window":
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill="#1f3346" />
          <line x1={x0} y1={y0 + d * 0.3} x2={-x0} y2={y0 + d * 0.3} stroke="#8fb6d9" strokeWidth={2} />
          <line x1={x0} y1={y0 + d * 0.7} x2={-x0} y2={y0 + d * 0.7} stroke="#8fb6d9" strokeWidth={2} />
        </g>
      );
    case "curtain":
      return <line x1={x0} y1={0} x2={-x0} y2={0} stroke="#b8352f" strokeWidth={Math.max(6, d)} strokeDasharray="10 6" />;
    case "stair": {
      const n = Math.max(2, el.count ?? 12);
      const step = d / n;
      const up = v !== "down";
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill="#4a3424" stroke="#d8c39b" strokeOpacity={0.4} strokeWidth={2} />
          {Array.from({ length: n - 1 }, (_, i) => (
            <line key={i} x1={x0} y1={y0 + step * (i + 1)} x2={-x0} y2={y0 + step * (i + 1)} stroke="#d8c39b" strokeOpacity={0.35} strokeWidth={1.5} />
          ))}
          <line x1={0} y1={up ? d / 2 - 15 : -d / 2 + 15} x2={0} y2={up ? -d / 2 + 25 : d / 2 - 25} stroke="#e8746b" strokeWidth={3} />
          <path
            d={up ? `M -9 ${-d / 2 + 34} L 0 ${-d / 2 + 18} L 9 ${-d / 2 + 34}` : `M -9 ${d / 2 - 34} L 0 ${d / 2 - 18} L 9 ${d / 2 - 34}`}
            fill="none"
            stroke="#e8746b"
            strokeWidth={3}
          />
          <text
            x={0}
            y={up ? d / 2 - 30 : -d / 2 + 30}
            transform={`rotate(-90 0 ${up ? d / 2 - 30 : -d / 2 + 30})`}
            dx={up ? 0 : 0}
            textAnchor={up ? "start" : "end"}
            dominantBaseline="central"
            fontSize={Math.min(16, w * 0.16)}
            fontWeight={800}
            fill="#e8746b"
            stroke="#4a3424"
            strokeWidth={4}
            paintOrder="stroke"
          >
            {up ? "SOBE" : "DESCE"}
          </text>
        </g>
      );
    }
    case "table": {
      const { fill } = tableFill(state, el);
      const stroke = state ? "rgba(0,0,0,0.35)" : "#5e3f22";
      if (el.shape === "round")
        return (
          <g>
            <ellipse rx={w / 2} ry={d / 2} fill={fill} stroke={stroke} strokeWidth={2} />
            {v === "high" && !state && <ellipse rx={w * 0.16} ry={d * 0.16} fill="none" stroke="#5e3f22" strokeWidth={1.5} strokeOpacity={0.6} />}
          </g>
        );
      return (
        <rect
          x={x0}
          y={y0}
          width={w}
          height={d}
          rx={5}
          fill={fill}
          stroke={state ? "rgba(0,0,0,0.35)" : "#5e3f22"}
          strokeWidth={2}
        />
      );
    }
    case "bench": {
      const back = v === "back";
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} rx={3} fill={BENCH} stroke="#8a6a44" strokeWidth={sw} />
          {back && <rect x={x0} y={y0} width={w} height={Math.min(8, d * 0.3)} fill="#a8794c" />}
        </g>
      );
    }
    case "sofa": {
      const backH = Math.min(15, d * 0.3);
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} rx={6} fill={SOFA} stroke="#2e3035" strokeWidth={sw} />
          <rect x={x0} y={y0} width={w} height={backH} rx={4} fill="#43464c" />
        </g>
      );
    }
    case "chair": {
      if (v === "stool")
        return (
          <g opacity={op}>
            <ellipse rx={w / 2} ry={d / 2} fill="#8a6038" stroke="#3a2412" strokeWidth={sw} />
            <ellipse rx={w * 0.3} ry={d * 0.3} fill="#a8794c" />
          </g>
        );
      if (v === "armchair")
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={d} rx={10} fill="#6a3b33" stroke="#2e1714" strokeWidth={sw} />
            <rect x={x0} y={y0} width={w} height={d * 0.25} rx={8} fill="#55302a" />
            <rect x={x0} y={y0} width={w * 0.15} height={d} rx={6} fill="#55302a" />
            <rect x={-x0 - w * 0.15} y={y0} width={w * 0.15} height={d} rx={6} fill="#55302a" />
          </g>
        );
      return (
        <g opacity={op}>
          <rect x={x0} y={y0 + d * 0.15} width={w} height={d * 0.85} rx={4} fill="#a8794c" stroke="#5e3f22" strokeWidth={sw} />
          <rect x={x0} y={y0} width={w} height={d * 0.2} rx={3} fill="#7a5232" />
        </g>
      );
    }
    case "pouf": {
      const n = Math.max(1, el.count ?? 3);
      const pw = w / n;
      return (
        <g opacity={op}>
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={x0 + pw * i + 2} y={y0} width={pw - 4} height={d} rx={6} fill="#6b6f75" stroke="#e6d9c8" strokeOpacity={0.5} strokeWidth={sw} />
          ))}
        </g>
      );
    }
    case "shelf": {
      const fill = v === "black" ? "#27231f" : v === "cubes" ? "#8d5f36" : WOOD_DARK;
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill={fill} stroke="#2a1b10" strokeWidth={sw} />
          <path d={`M ${x0} ${y0} L ${-x0} ${-y0} M ${-x0} ${y0} L ${x0} ${-y0}`} stroke="#e8d6b4" strokeOpacity={0.35} strokeWidth={sw} />
          <line x1={x0} y1={-y0 - 1} x2={-x0} y2={-y0 - 1} stroke="#e8d6b4" strokeOpacity={0.7} strokeWidth={2.5} />
        </g>
      );
    }
    case "gameshelf": {
      const cols = colors?.length ? colors : [];
      const stripe = Math.min(10, d * 0.22);
      const band = cols.map((c, i) => (
        <rect key={c} x={x0 + 4 + ((w - 8) / cols.length) * i} y={-y0 - stripe - 3} width={(w - 8) / cols.length} height={stripe} fill={c} />
      ));
      if (v === "pouf1" || v === "pouf3") {
        const n = v === "pouf3" ? 3 : 1;
        const pw = w / n;
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={d} rx={5} fill="#1d1d20" stroke="#e6d9c8" strokeOpacity={0.35} strokeWidth={sw} />
            {n === 1
              ? [-1, 1].map((sx) => [-1, 1].map((sy) => <circle key={`${sx}${sy}`} cx={sx * w * 0.2} cy={sy * d * 0.2} r={1.8} fill="#4a4a50" />))
              : Array.from({ length: n }, (_, i) => (
                  <rect key={i} x={x0 + pw * i + 3} y={y0 + 3} width={pw - 6} height={d - 6} rx={4} fill={paper ? "#e9dccb" : "url(#fp-dots-2d)"} />
                ))}
            {/* Símbolo de baú (abre e guarda jogos) */}
            <path d={`M -6 ${-y0 - 8} h 12 v -6 h -12 z M -6 ${-y0 - 14} l 6 -4 l 6 4`} fill={n === 1 ? "none" : "#1d1d20"} stroke="#e6c56b" strokeOpacity={0.8} strokeWidth={1.4} />
            {band}
          </g>
        );
      }
      if (v === "chest")
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={d} rx={3} fill="#7a4f2c" stroke="#2a1b10" strokeWidth={2} />
            {[0.18, 0.82].map((f) => (
              <rect key={f} x={x0 + w * f - 2} y={y0} width={4} height={d} fill="#2a2a2c" />
            ))}
            <rect x={-4} y={-y0 - 6} width={8} height={6} fill="#c79a2c" />
            {band}
          </g>
        );
      if (v === "understair")
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={d} rx={2} fill="#a39b8e" stroke="#2a1b10" strokeWidth={2} />
            {/* Teto inclinado: baixo à esquerda, alto à direita */}
            {Array.from({ length: 6 }, (_, i) => (
              <line key={i} x1={x0 + (w * (i + 1)) / 7} y1={y0 + 3} x2={x0 + (w * (i + 1)) / 7} y2={-y0 - 3} stroke="#2a1b10" strokeOpacity={0.12 + i * 0.07} strokeWidth={1.4} />
            ))}
            {band}
            <line x1={x0} y1={-y0 - 1} x2={-x0} y2={-y0 - 1} stroke="#f3e2bd" strokeWidth={3} />
            {/* A porta de correr (lado alto), com a seta de para onde ela corre */}
            {(() => {
              const dr = understairDoor(el.w);
              const a = x0 + dr.x0 * U;
              const b = a + dr.w * U;
              return (
                <g>
                  <rect x={a} y={-y0 - 5} width={b - a} height={7} fill="#5e3d22" stroke="#f3e2bd" strokeWidth={1.2} />
                  <path d={`M ${b - 6} ${-y0 - 13} L ${a + 4} ${-y0 - 13} m 6 -4 l -6 4 l 6 4`} fill="none" stroke="#f3e2bd" strokeOpacity={0.7} strokeWidth={1.4} />
                </g>
              );
            })()}
          </g>
        );
      const wood = v === "cubes" ? "#b07f4c" : v === "lowcab" ? "#7a4f2c" : "#9a6a3c";
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} rx={2} fill={wood} stroke="#2a1b10" strokeWidth={2} />
          {/* Laterais e fundo do móvel */}
          <rect x={x0 + 4} y={y0 + 4} width={w - 8} height={d - 8} fill="none" stroke="#2a1b10" strokeOpacity={0.45} strokeWidth={1.5} />
          {v === "cubes" && <line x1={0} y1={y0 + 4} x2={0} y2={-y0 - 4} stroke="#2a1b10" strokeOpacity={0.3} strokeWidth={1.2} />}
          {/* Faixa das categorias na frente */}
          {band}
          <line x1={x0} y1={-y0 - 1} x2={-x0} y2={-y0 - 1} stroke="#f3e2bd" strokeWidth={3} />
        </g>
      );
    }
    case "cabinet":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill={v === "stack" ? "#7d6a55" : "#6e4a2a"} stroke="#2a1b10" strokeWidth={sw} />
          {v === "stack" ? (
            <path d={`M ${x0} ${y0} L ${-x0} ${-y0} M ${-x0} ${y0} L ${x0} ${-y0}`} stroke="#e8d6b4" strokeOpacity={0.35} strokeWidth={sw} />
          ) : (
            <line x1={0} y1={y0} x2={0} y2={-y0} stroke="#e8d6b4" strokeOpacity={0.35} strokeWidth={sw} />
          )}
        </g>
      );
    case "counter":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill={v === "bar" ? "#4a301c" : "#5a3d24"} stroke="#24160c" strokeWidth={sw} />
          {v === "register" && (
            <>
              <rect x={-Math.min(w, d) * 0.3} y={-d * 0.3} width={Math.min(w, d) * 0.6} height={d * 0.6} rx={3} fill="#1b1b1d" stroke="#e6c56b" strokeOpacity={0.5} strokeWidth={1.5} />
              <rect x={-Math.min(w, d) * 0.18} y={-d * 0.18} width={Math.min(w, d) * 0.36} height={d * 0.2} fill="#3d74e0" fillOpacity={0.7} />
            </>
          )}
          {v === "bar" &&
            Array.from({ length: Math.max(1, Math.floor(w / 30)) }, (_, i) => (
              <circle key={i} cx={x0 + 15 + i * 30} cy={0} r={4} fill={["#c98b2b", "#4f8a4f", "#e0cf8a", "#b23a3a"][i % 4]} />
            ))}
        </g>
      );
    case "steel":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill={STEEL} stroke="#5d6167" strokeWidth={sw} />
          {v === "sink" && <rect x={x0 + w * 0.15} y={y0 + d * 0.2} width={w * 0.7} height={d * 0.6} rx={6} fill="#c9ced3" stroke="#5d6167" strokeWidth={sw} />}
          {v === "tap" && (
            <>
              <rect x={-Math.min(w, d) * 0.2 - Math.min(w, d) * 0.25} y={-Math.min(w, d) * 0.2} width={Math.min(w, d) * 0.4} height={Math.min(w, d) * 0.4} fill="#1b1b1d" />
              <rect x={Math.min(w, d) * 0.05} y={-Math.min(w, d) * 0.2} width={Math.min(w, d) * 0.4} height={Math.min(w, d) * 0.4} fill="#1b1b1d" />
            </>
          )}
        </g>
      );
    case "fridge":
    case "freezer":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill={v === "steel" ? "#c4c8cc" : v === "glass" ? "#2a2c30" : "#e3e1db"} stroke="#6e6c66" strokeWidth={sw} />
          {v === "glass" ? (
            <rect x={x0 + 4} y={-y0 - 6} width={w - 8} height={4} fill="#9fd3f0" fillOpacity={0.8} />
          ) : (
            <path d={`M ${x0} ${y0} L ${-x0} ${-y0}`} stroke="#6e6c66" strokeWidth={sw} />
          )}
        </g>
      );
    case "sink":
      return <rect x={x0} y={y0} width={w} height={d} rx={8} fill="#eceae5" stroke="#8b8a86" strokeWidth={sw} opacity={op} />;
    case "toilet":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d * 0.3} rx={3} fill="#f2f2ef" stroke="#8b8a86" strokeWidth={sw} />
          <ellipse cx={0} cy={y0 + d * 0.62} rx={w * 0.42} ry={d * 0.36} fill="#f2f2ef" stroke="#8b8a86" strokeWidth={sw} />
        </g>
      );
    case "elevator":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill="#8f9296" stroke="#3b3d40" strokeWidth={sw} />
          <path d={`M ${x0} ${y0} L ${-x0} ${-y0} M ${-x0} ${y0} L ${x0} ${-y0}`} stroke="#3b3d40" strokeWidth={sw} />
        </g>
      );
    case "barrel":
      return (
        <g opacity={op}>
          <ellipse rx={w / 2} ry={d / 2} fill="#8a5a2b" stroke="#3a2412" strokeWidth={2} />
          <ellipse rx={w * 0.3} ry={d * 0.3} fill="none" stroke="#3a2412" strokeOpacity={0.6} strokeWidth={2} />
        </g>
      );
    case "keg":
      return <ellipse rx={w / 2} ry={d / 2} fill="#b4b8bc" stroke="#55595e" strokeWidth={2} opacity={op} />;
    case "plant":
      return (
        <g opacity={op}>
          <ellipse rx={w / 2} ry={d / 2} fill="#4f7a3e" />
          <ellipse rx={w * 0.28} ry={d * 0.28} fill="#6f9a55" />
        </g>
      );
    case "deco": {
      const fill = DECO_COLOR[v ?? ""] ?? "#d9c79e";
      if (v === "fan")
        return (
          <g opacity={0.5}>
            <circle r={Math.min(w, d) * 0.08} fill={fill} />
            {[0, 90, 180, 270].map((a) => (
              <rect key={a} x={-Math.min(w, d) * 0.06} y={-Math.min(w, d) / 2} width={Math.min(w, d) * 0.12} height={Math.min(w, d) * 0.42} rx={4} fill={fill} transform={`rotate(${a})`} />
            ))}
          </g>
        );
      if (v === "clock")
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={Math.max(d, 4)} fill="#5e3d22" />
            <circle cx={0} cy={y0 + Math.max(d, 4)} r={Math.min(w * 0.4, 14)} fill={fill} stroke="#5e3d22" strokeWidth={2} />
            <path d={`M 0 ${y0 + Math.max(d, 4)} l 0 -7 M 0 ${y0 + Math.max(d, 4)} l 5 2`} stroke="#1b1b1d" strokeWidth={1.4} />
          </g>
        );
      if (v === "chandelier")
        return (
          <g opacity={0.6}>
            <circle r={Math.min(w, d) * 0.42} fill="none" stroke={fill} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="4 3" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <circle key={a} cx={Math.cos((a * Math.PI) / 180) * Math.min(w, d) * 0.42} cy={Math.sin((a * Math.PI) / 180) * Math.min(w, d) * 0.42} r={2.5} fill={fill} />
            ))}
          </g>
        );
      if (v === "dice") {
        const s = Math.min(w, d);
        return (
          <g opacity={op}>
            <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.14} fill={fill} stroke="#8a7f6a" strokeWidth={1.5} />
            {[
              [-1, -1],
              [1, 1],
              [0, 0],
              [1, -1],
              [-1, 1],
            ].map(([a, b]) => (
              <circle key={`${a}${b}`} cx={a * s * 0.25} cy={b * s * 0.25} r={s * 0.08} fill="#b8322c" />
            ))}
          </g>
        );
      }
      if (v === "meeple") {
        const s = Math.min(w, d * 1.7);
        return (
          <path
            opacity={op}
            transform={`scale(${s / 100})`}
            d="M 0 -48 C 14 -48 16 -30 12 -22 L 46 -10 C 52 -6 50 6 42 6 L 22 6 L 40 44 L 10 44 L 0 26 L -10 44 L -40 44 L -22 6 L -42 6 C -50 6 -52 -6 -46 -10 L -12 -22 C -16 -30 -14 -48 0 -48 Z"
            fill={fill}
            stroke="#7a5a1c"
            strokeWidth={3}
          />
        );
      }
      if (v === "armor" || v === "easel")
        return (
          <g opacity={op}>
            {v === "armor" ? (
              <>
                <ellipse rx={w * 0.42} ry={d * 0.4} fill="#4a4a50" />
                <circle r={Math.min(w, d) * 0.22} fill={fill} stroke="#55595e" strokeWidth={1.5} />
                <line x1={w * 0.36} y1={-d * 0.45} x2={w * 0.36} y2={d * 0.45} stroke="#c9ced3" strokeWidth={2.5} />
              </>
            ) : (
              <>
                <line x1={x0 + 3} y1={-y0 - 3} x2={0} y2={y0 + 3} stroke={fill} strokeWidth={3} />
                <line x1={-x0 - 3} y1={-y0 - 3} x2={0} y2={y0 + 3} stroke={fill} strokeWidth={3} />
                <rect x={x0 + 2} y={-4} width={w - 4} height={8} fill="#111" stroke={fill} strokeWidth={1.5} />
              </>
            )}
          </g>
        );
      if (v === "darts")
        return (
          <g opacity={op}>
            <rect x={x0} y={y0} width={w} height={Math.max(d, 4)} fill="#1b1b1d" />
            <circle cx={0} cy={y0 + Math.max(d, 4)} r={Math.min(w * 0.35, 12)} fill={fill} stroke="#f2ead8" strokeWidth={1.5} />
          </g>
        );
      if (v === "bin" || v === "coatrack")
        return (
          <g opacity={op}>
            <ellipse rx={w / 2} ry={d / 2} fill={fill} stroke="#1b1b1d" strokeWidth={1.5} />
            {v === "coatrack" && <circle r={Math.min(w, d) * 0.12} fill="#3a2412" />}
          </g>
        );
      if (v === "ac" || v === "speaker" || v === "tv")
        return (
          <rect x={x0} y={y0} width={w} height={Math.max(d, 5)} rx={2} fill={fill} stroke={v === "ac" ? "#8b8a86" : "#e6c56b"} strokeOpacity={v === "ac" ? 1 : 0.35} strokeWidth={1.5} opacity={op} />
        );
      if (v === "pendant" || v === "extinguisher" || v === "sconce")
        return <ellipse rx={Math.max(w, 8) / 2} ry={Math.max(d, 8) / 2} fill={fill} opacity={op * (v === "pendant" ? 0.45 : 0.9)} />;
      // No teto: só um contorno, para não cobrir as mesas
      if (v === "projector")
        return <rect x={x0} y={y0} width={w} height={d} fill="none" stroke={fill} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="4 3" />;
      return <rect x={x0} y={y0} width={w} height={Math.max(d, 4)} fill={fill} opacity={op} />;
    }
    case "text":
      return <rect x={x0} y={y0} width={w} height={d} fill="transparent" />;
    default:
      return null;
  }
}

/** Padrões (hachura das áreas fechadas e grade). */
export function PlanDefs() {
  return (
    <defs>
      <pattern id="fp-hatch" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={14} height={14} fill="#1c1814" />
        <line x1={0} y1={0} x2={0} y2={14} stroke="#2e2822" strokeWidth={4} />
      </pattern>
      <pattern id="fp-hatch-paper" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={14} height={14} fill="#e2ded6" />
        <line x1={0} y1={0} x2={0} y2={14} stroke="#b5afa4" strokeWidth={3} />
      </pattern>
      <pattern id="fp-dots-2d" width={8} height={8} patternUnits="userSpaceOnUse">
        <rect width={8} height={8} fill="#e9dccb" />
        <circle cx={2} cy={2} r={1.2} fill="#c0504d" />
        <circle cx={6} cy={6} r={1.2} fill="#4f81bd" />
        <circle cx={6} cy={2} r={1} fill="#9bbb59" />
      </pattern>
      <pattern id="fp-grid" width={100} height={100} patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 50 100 M 0 50 L 100 50" stroke="#e6c56b" strokeOpacity={0.05} strokeWidth={1} />
        <path d="M 0 0 L 100 0 M 0 0 L 0 100" stroke="#e6c56b" strokeOpacity={0.11} strokeWidth={1.2} />
      </pattern>
    </defs>
  );
}
