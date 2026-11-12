import React from "react";
import { variantOf } from "@/floorplan/catalog";
import type { PlanElement, TableState } from "@/floorplan/types";
import { STATE_META } from "@/floorplan/day";

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
};

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
}: {
  el: PlanElement;
  /** Estado da mesa no modo dia. */
  state?: TableState;
  /** Fora do foco (outro andar, modo dia nos móveis). */
  dim?: boolean;
}) {
  const w = el.w * U;
  const d = el.d * U;
  const x0 = -w / 2;
  const y0 = -d / 2;
  const v = variantOf(el);
  const op = dim ? 0.55 : 1;
  const sw = 1.5; // traço fino em cm

  switch (el.kind) {
    case "room":
      return (
        <rect x={x0} y={y0} width={w} height={d} fill={FLOOR_2D[v ?? "wood"]} stroke="#e6c56b" strokeOpacity={0.08} strokeWidth={2} />
      );
    case "block":
      return <rect x={x0} y={y0} width={w} height={d} fill="url(#fp-hatch)" stroke="#0e0c0a" strokeWidth={2} opacity={op} />;
    case "wall": {
      const fill = v === "dark" ? "#7d776d" : WALL;
      if (v === "low")
        return (
          <rect x={x0 - d / 2} y={y0} width={w + d} height={d} fill={WALL} fillOpacity={0.35} stroke={WALL} strokeWidth={2} strokeDasharray="8 5" />
        );
      return <rect x={x0 - d / 2} y={y0} width={w + d} height={d} fill={fill} />;
    }
    case "door":
      return (
        <g opacity={op}>
          <rect x={x0} y={y0} width={w} height={d} fill="#1b1612" />
          <path d={`M ${w / 2} 0 A ${w} ${w} 0 0 1 ${-w / 2} ${w}`} fill="none" stroke={WALL} strokeWidth={2} strokeOpacity={0.6} />
          <line x1={-w / 2} y1={0} x2={-w / 2} y2={w} stroke={WALL} strokeWidth={2.5} strokeOpacity={0.8} />
        </g>
      );
    case "arch":
      return (
        <g>
          <rect x={x0} y={y0} width={w} height={d} fill="#1b1612" fillOpacity={0.5} />
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
          <rect x={x0} y={y0} width={w} height={d} fill={v === "steel" ? "#c4c8cc" : "#e3e1db"} stroke="#6e6c66" strokeWidth={sw} />
          <path d={`M ${x0} ${y0} L ${-x0} ${-y0}`} stroke="#6e6c66" strokeWidth={sw} />
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
      <pattern id="fp-grid" width={100} height={100} patternUnits="userSpaceOnUse">
        <path d="M 50 0 L 50 100 M 0 50 L 100 50" stroke="#e6c56b" strokeOpacity={0.05} strokeWidth={1} />
        <path d="M 0 0 L 100 0 M 0 0 L 0 100" stroke="#e6c56b" strokeOpacity={0.11} strokeWidth={1.2} />
      </pattern>
    </defs>
  );
}
