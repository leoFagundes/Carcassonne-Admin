import type { CSSProperties } from "react";
import type { IconType } from "react-icons";

// Estilo "gravura": contorno fino + hachura diagonal por dentro, como as
// ilustrações em xilogravura de manuscritos medievais. Os desenhos-base vêm do
// pacote Game Icons (game-icons.net, licença CC BY 3.0 — Lorc, Delapouite e
// colaboradores), incluído no react-icons.

export type InkTone =
  | "gold"
  | "amber"
  | "orange"
  | "pale"
  | "frost"
  | "pine"
  | "night"
  | "cream"
  | "straw"
  | "rose"
  | "clover"
  | "royal"
  | "crimson";

/** Cor do traço e fundo da hachura de cada tom. */
export const INKS: Record<InkTone, { line: string; bg: string; opacity: number }> = {
  gold: { line: "#e6c56b", bg: "#15110c", opacity: 0.55 },
  amber: { line: "#f2a65a", bg: "#170d08", opacity: 0.55 },
  orange: { line: "#ffa040", bg: "#1d0e04", opacity: 0.7 },
  pale: { line: "#efe7d6", bg: "rgba(20, 16, 26, 0.55)", opacity: 0.5 },
  frost: { line: "#e9f0f7", bg: "#0e1318", opacity: 0.5 },
  pine: { line: "#9cc7a4", bg: "#0b1510", opacity: 0.5 },
  night: { line: "#e6c56b", bg: "#1d1428", opacity: 0.45 },
  cream: { line: "#f5ead6", bg: "#1b1611", opacity: 0.5 },
  straw: { line: "#f0c75e", bg: "#22180a", opacity: 0.6 },
  rose: { line: "#ff9eb5", bg: "#1f0b12", opacity: 0.6 },
  clover: { line: "#6fd49b", bg: "#0b1a12", opacity: 0.6 },
  royal: { line: "#8fb4ff", bg: "#0e1424", opacity: 0.55 },
  crimson: { line: "#ff8a8a", bg: "#1f0a0c", opacity: 0.6 },
};

const TONES = Object.keys(INKS) as InkTone[];

/**
 * Padrões de hachura usados pelos desenhos (referenciados por url(#...)).
 * Renderizado uma vez, no provider do tema.
 *  - normal ("st-hatch-<tom>"): ícones médios e grandes (viewBox 512)
 *  - grossa ("-c"): ícones pequenos, para os riscos não virarem uma mancha
 *  - fina ("-f"): artes próprias, desenhadas em pixels
 */
export function SiteThemeDefs() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {TONES.flatMap((tone) => {
          const { line, bg, opacity } = INKS[tone];
          return [
            { suffix: "", size: 26, stroke: 5.5 },
            { suffix: "-c", size: 64, stroke: 12 },
            { suffix: "-f", size: 5, stroke: 1.1 },
          ].map(({ suffix, size, stroke }) => (
            <pattern
              key={`${tone}${suffix}`}
              id={`st-hatch-${tone}${suffix}`}
              width={size}
              height={size}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(40)"
            >
              <rect width={size} height={size} fill={bg} />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={size}
                stroke={line}
                strokeWidth={stroke}
                strokeOpacity={opacity}
              />
            </pattern>
          ));
        })}
        <linearGradient id="st-grad-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e6a8" />
          <stop offset="0.5" stopColor="#e6c56b" />
          <stop offset="1" stopColor="#a8822a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Ícone desenhado como gravura no tom escolhido. */
export function Ink({
  icon: Icon,
  tone = "gold",
  coarse = false,
  fitHeight = false,
  className = "",
  style,
}: {
  icon: IconType;
  tone?: InkTone;
  /** Hachura grossa, para ícones pequenos (até ~60px). */
  coarse?: boolean;
  /** Dimensiona pela altura do container (torres, por exemplo). */
  fitHeight?: boolean;
  className?: string;
  /** Sobrescreve o preenchimento (ex: ovos em tom pastel). */
  style?: CSSProperties;
}) {
  return (
    <Icon
      aria-hidden="true"
      className={`st-ink ${fitHeight ? "st-ink-fit-h" : ""} ${className}`}
      style={{
        fill: `url(#st-hatch-${tone}${coarse ? "-c" : ""})`,
        stroke: INKS[tone].line,
        ...style,
      }}
    />
  );
}
