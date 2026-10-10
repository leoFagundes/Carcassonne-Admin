import { useId, type CSSProperties } from "react";
import {
  GiCastle,
  GiCauldron,
  GiCrown,
  GiPumpkinLantern,
  GiStairsCake,
  GiStoneTower,
  GiTopHat,
  GiTowerFlag,
  GiWhiteTower,
} from "react-icons/gi";
import { INKS, Ink, type InkTone } from "./ink";
import { HollySprig, RoseGlyph, ShamrockGlyph, StarGlyph } from "./glyphs";
import { seededRandom } from "./ornaments";

// Artes próprias dos temas, no mesmo estilo de gravura dos ícones: contorno
// dourado fino e sombras em hachura ("riscado"). Sem animação de JS — as
// cenas só posicionam e movem.

/** IDs únicos por instância (o useId traz caracteres que não servem em url(#...)). */
function useSvgId() {
  return "st" + useId().replace(/[^a-zA-Z0-9]/g, "");
}

const svgClass = "block w-full h-auto";

// ── Céu ──────────────────────────────────────────────────────────────────────

/** Lua cheia gravada: disco claro, sombra em hachura e crateras riscadas. */
export function EngravedMoon() {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 200 200" className={svgClass}>
      <defs>
        <radialGradient id={`${id}h`}>
          <stop offset="0.5" stopColor="#ffd68a" stopOpacity="0.26" />
          <stop offset="1" stopColor="#ffd68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}d`} cx="0.4" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#fbf0cf" />
          <stop offset="1" stopColor="#e7bf76" />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <circle cx="100" cy="100" r="56" />
        </clipPath>
        <mask id={`${id}m`}>
          <rect width="200" height="200" fill="white" />
          <circle cx="117" cy="86" r="54" fill="black" />
        </mask>
        <pattern
          id={`${id}p`}
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-35)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="#8a5a1f" strokeWidth="1.3" strokeOpacity="0.75" />
        </pattern>
      </defs>
      <circle cx="100" cy="100" r="100" fill={`url(#${id}h)`} />
      <circle cx="100" cy="100" r="56" fill={`url(#${id}d)`} />
      <g clipPath={`url(#${id}c)`}>
        <rect x="40" y="40" width="120" height="120" fill={`url(#${id}p)`} mask={`url(#${id}m)`} />
      </g>
      <g fill="none" stroke="#a8742f" strokeOpacity="0.6" strokeWidth="1.1" strokeLinecap="round">
        <circle cx="84" cy="86" r="9" />
        <path d="M77 90 Q84 96 92 89" />
        <circle cx="121" cy="112" r="12" />
        <path d="M111 117 Q121 125 132 116" />
        <circle cx="97" cy="130" r="6" />
        <ellipse cx="127" cy="80" rx="5.5" ry="4.5" />
        <circle cx="74" cy="114" r="3.5" />
      </g>
      <circle cx="100" cy="100" r="56" fill="none" stroke="#e6c56b" strokeWidth="1.4" />
      <circle
        cx="100"
        cy="100"
        r="61"
        fill="none"
        stroke="#e6c56b"
        strokeWidth="0.7"
        strokeOpacity="0.5"
        strokeDasharray="2 4"
      />
    </svg>
  );
}

/** Nuvem estilizada de iluminura, com riscos internos. */
export function EngravedCloud() {
  return (
    <svg viewBox="0 0 160 44" className={svgClass}>
      <path
        d="M14 34 C4 34 4 22 14 22 C15 13 28 10 35 16 C41 5 60 5 66 15 C74 7 90 9 93 18 C101 11 117 13 118 22 C128 18 142 22 140 32 C148 34 146 40 138 40 L18 40 C10 40 8 35 14 34 Z"
        fill="url(#st-hatch-night-f)"
        stroke="#b9a2d8"
        strokeOpacity="0.7"
        strokeWidth="1"
      />
      <path
        d="M22 33 C48 29 92 29 128 33 M40 22 C46 17 56 17 60 22 M78 21 C83 16 92 17 95 22"
        fill="none"
        stroke="#b9a2d8"
        strokeOpacity="0.45"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Teia ancorada no canto superior esquerdo, desenhada duas vezes (a segunda
// levemente tremida) para parecer traçada à mão.
const WEB_ANGLES = [0, 15, 30, 45, 60, 75, 90].map((deg) => (deg * Math.PI) / 180);
const WEB_RINGS = [26, 54, 86, 120, 156, 192];

function webPath(jitter: number, seed: number) {
  const rand = seededRandom(seed);
  const j = () => (rand() - 0.5) * jitter;
  const pt = (r: number, a: number) =>
    `${(r * Math.cos(a) + j()).toFixed(1)} ${(r * Math.sin(a) + j()).toFixed(1)}`;
  return [
    ...WEB_ANGLES.map((a) => `M${j().toFixed(1)} ${j().toFixed(1)} L${pt(198, a)}`),
    ...WEB_RINGS.flatMap((r) =>
      WEB_ANGLES.slice(0, -1).map((a, i) => {
        const b = WEB_ANGLES[i + 1];
        return `M${pt(r, a)} Q${pt(r * 0.86, (a + b) / 2)} ${pt(r, b)}`;
      }),
    ),
  ].join(" ");
}

const WEB_MAIN = webPath(0, 1);
const WEB_SKETCH = webPath(3.4, 7);

export function SpiderWebArt() {
  return (
    <svg viewBox="0 0 200 200" fill="none" className={svgClass}>
      <path d={WEB_MAIN} stroke="#e6c56b" strokeOpacity="0.34" strokeWidth="0.9" strokeLinecap="round" />
      <path d={WEB_SKETCH} stroke="#e6c56b" strokeOpacity="0.16" strokeWidth="0.6" strokeLinecap="round" />
      <g fill="#ffe7a8">
        <circle className="st-dew" cx="74.5" cy="43" r="1.4" />
        <circle className="st-dew st-dew-2" cx="60" cy="103.9" r="1.2" />
        <circle className="st-dew st-dew-3" cx="150.7" cy="40.4" r="1.3" />
        <circle className="st-dew st-dew-2" cx="14" cy="52.2" r="1" />
      </g>
    </svg>
  );
}

/** Explosão de fogos parada (miniaturas e faixas) — os fogos de verdade são canvas. */
export function FireworkBurstArt({ color = "#f7e7b4" }: { color?: string }) {
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const inner = 9;
    const outer = i % 2 ? 34 : 44;
    return {
      d: `M${(Math.cos(a) * inner).toFixed(1)} ${(Math.sin(a) * inner).toFixed(1)} L${(Math.cos(a) * outer).toFixed(1)} ${(Math.sin(a) * outer).toFixed(1)}`,
      x: Math.cos(a) * (outer + 3),
      y: Math.sin(a) * (outer + 3),
    };
  });
  return (
    <svg viewBox="-50 -50 100 100" className={svgClass}>
      <g stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.85">
        {rays.map((ray, i) => (
          <path key={i} d={ray.d} />
        ))}
      </g>
      <g fill={color}>
        {rays.map((ray, i) => (
          <circle key={i} cx={ray.x} cy={ray.y} r={i % 3 ? 1.1 : 1.8} />
        ))}
      </g>
      <circle r="4" fill={color} fillOpacity="0.6" />
    </svg>
  );
}

// ── A Cité: muralha e torres ─────────────────────────────────────────────────

/** Muralha com ameias e tijolos riscados, na largura exata da tela. */
export function WallArt({ width, tone }: { width: number; tone: InkTone }) {
  if (width <= 0) return null;
  const top = 3;
  const crenel = 11;
  let outline = `M0 ${crenel}`;
  for (let x = 0; x < width; x += 22) {
    const end = Math.min(x + 13, width);
    outline += ` L${x} ${top} L${end} ${top} L${end} ${crenel}`;
    if (end < width) outline += ` L${Math.min(x + 22, width)} ${crenel}`;
  }
  outline += ` L${width} 40 L0 40 Z`;

  let bricks = "";
  [19, 27, 35].forEach((y, row) => {
    bricks += `M0 ${y} L${width} ${y} `;
    for (let x = row % 2 ? 9 : 0; x < width; x += 18) {
      bricks += `M${x} ${y} L${x} ${Math.min(y + 8, 40)} `;
    }
  });

  return (
    <svg
      viewBox={`0 0 ${width} 40`}
      preserveAspectRatio="none"
      className="block w-full h-full"
    >
      <path
        d={outline}
        fill={`url(#st-hatch-${tone}-f)`}
        stroke={INKS[tone].line}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={bricks}
        fill="none"
        stroke={INKS[tone].line}
        strokeOpacity="0.45"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const TOWERS = [
  { icon: GiWhiteTower, left: "5%", height: "clamp(46px, 14cqmin, 130px)" },
  { icon: GiTowerFlag, left: "17%", height: "clamp(40px, 11cqmin, 104px)", optional: true },
  { icon: GiCastle, left: "33%", height: "clamp(62px, 19cqmin, 180px)" },
  { icon: GiStoneTower, left: "52%", height: "clamp(44px, 12cqmin, 112px)", optional: true },
  { icon: GiWhiteTower, left: "70%", height: "clamp(52px, 15.5cqmin, 146px)" },
  { icon: GiTowerFlag, left: "85%", height: "clamp(38px, 10.5cqmin, 98px)", optional: true, flip: true },
  { icon: GiStoneTower, left: "96%", height: "clamp(36px, 9.5cqmin, 90px)" },
];

/**
 * Silhueta da Cité de Carcassonne no rodapé: torres gravadas atrás de uma
 * muralha com ameias. Em telas estreitas algumas torres somem.
 */
export function CastleSkyline({ tone, width }: { tone: InkTone; width: number }) {
  return (
    <div className="st-skyline">
      {TOWERS.map((tower, i) => (
        <div
          key={i}
          className={`st-tower ${tower.optional ? "st-tower-optional" : ""}`}
          style={{ left: tower.left, height: tower.height }}
        >
          <div className="h-full" style={tower.flip ? { transform: "scaleX(-1)" } : undefined}>
            <Ink icon={tower.icon} tone={tone} fitHeight />
          </div>
        </div>
      ))}
      <div className="st-wall">
        <WallArt width={width} tone={tone} />
      </div>
    </div>
  );
}

// ── Peças com luz própria ────────────────────────────────────────────────────

/**
 * Abóbora-lanterna gravada, com a luz da vela aparecendo pelos recortes.
 * `coarse` para tamanhos pequenos (hachura mais aberta).
 */
export function PumpkinLantern({ coarse = false }: { coarse?: boolean }) {
  return (
    <div className="relative">
      <div className="st-pumpkin-light" />
      <Ink icon={GiPumpkinLantern} tone="orange" coarse={coarse} />
    </div>
  );
}

/** Bolo de andares com o brilho das velas no topo. */
export function CakeWithCandles({ coarse = false }: { coarse?: boolean }) {
  return (
    <div className="relative">
      <div className="st-candle-light" />
      <Ink icon={GiStairsCake} coarse={coarse} />
    </div>
  );
}

/** Pote de ouro: caldeirão gravado com um monte de moedas brilhando. */
export function PotOfGold() {
  const coins = [
    [18, 30], [31, 24], [44, 20], [57, 20], [70, 24], [83, 30],
    [37, 31], [50, 27], [63, 31], [44, 12], [57, 13], [50, 5],
  ];
  return (
    <div className="relative">
      <div className="st-gold-light" />
      <svg viewBox="0 0 100 40" className="absolute left-[8%] top-[4%] w-[84%] h-auto">
        {coins.map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="7" fill="url(#st-grad-gold)" stroke="#8a6a14" strokeWidth="0.8" />
            <circle cx={cx} cy={cy} r="4.4" fill="none" stroke="#fff1b8" strokeOpacity="0.6" strokeWidth="0.6" />
          </g>
        ))}
      </svg>
      <Ink icon={GiCauldron} />
    </div>
  );
}

// ── Natal ────────────────────────────────────────────────────────────────────

export function SnowGroundArt() {
  return (
    <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="block w-full h-full">
      <path
        d="M0 34 C40 22 80 30 120 26 C170 21 200 34 250 30 C300 26 340 18 400 26 L400 60 L0 60 Z"
        fill="#f8f4ec"
        opacity="0.07"
      />
      <path
        d="M0 44 C50 36 90 46 140 40 C190 34 230 46 280 42 C330 38 360 34 400 40 L400 60 L0 60 Z"
        fill="#f8f4ec"
        opacity="0.11"
      />
      <path
        d="M0 44 C50 36 90 46 140 40 C190 34 230 46 280 42 C330 38 360 34 400 40"
        fill="none"
        stroke="#f8f4ec"
        strokeOpacity="0.35"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Festa Junina ─────────────────────────────────────────────────────────────

const BALLOON_BODY =
  "M20 2 C33 2 38 13 37 23 C36 33 29 41 25 47 L15 47 C11 41 4 33 3 23 C2 13 7 2 20 2 Z";

/** Balão de papel de festa junina: gomos riscados, faixas coloridas e bucha acesa. */
export function PaperBalloonArt({
  colors = ["#e63946", "#ffd23f", "#2f6db5"],
}: {
  colors?: string[];
}) {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 40 62" className={svgClass}>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={BALLOON_BODY} />
        </clipPath>
      </defs>
      <path d={BALLOON_BODY} fill="url(#st-hatch-straw-f)" />
      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="13" width="40" height="7" fill={colors[0]} fillOpacity="0.75" />
        <rect x="0" y="25" width="40" height="5" fill={colors[1]} fillOpacity="0.75" />
        <rect x="0" y="35" width="40" height="5" fill={colors[2]} fillOpacity="0.75" />
        <path
          d="M20 2 C14 12 13 32 16 47 M20 2 C26 12 27 32 24 47 M20 2 C8 10 6 30 10 42 M20 2 C32 10 34 30 30 42"
          fill="none"
          stroke="#f0c75e"
          strokeOpacity="0.55"
          strokeWidth="0.7"
        />
      </g>
      <path d={BALLOON_BODY} fill="none" stroke="#f0c75e" strokeWidth="1" />
      <rect x="15" y="47" width="10" height="3" rx="1" fill="#22180a" stroke="#f0c75e" strokeWidth="0.8" />
      <path className="st-balloon-flame" d="M20 51 C23 54 22 58 20 60 C18 58 17 54 20 51 Z" fill="#ffb347" />
    </svg>
  );
}

// ── Oktoberfest ──────────────────────────────────────────────────────────────

/** Chapéu tirolês de feltro, com cordão vermelho, edelvais e pena. */
export function AlpineHatArt() {
  const barbs = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 1) / 10;
    const x = 66 + 28 * t;
    const y = 52 - 46 * t;
    return `M${x.toFixed(1)} ${y.toFixed(1)} l-5 -1.5 M${x.toFixed(1)} ${y.toFixed(1)} l2.5 4.5`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 74" className={svgClass}>
      <ellipse cx="48" cy="60" rx="44" ry="10" fill="url(#st-hatch-pine-f)" stroke="#e6c56b" strokeWidth="1.1" />
      <path
        d="M66 52 C74 38 82 24 95 7"
        fill="none"
        stroke="#f5ead6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d={barbs} fill="none" stroke="#f5ead6" strokeOpacity="0.7" strokeWidth="0.7" />
      <path
        d="M22 58 C22 40 27 24 48 21 C69 24 74 40 74 58 Z"
        fill="url(#st-hatch-pine-f)"
        stroke="#e6c56b"
        strokeWidth="1.1"
      />
      <path d="M34 27 C42 31 54 31 62 27" fill="none" stroke="#e6c56b" strokeOpacity="0.6" strokeWidth="0.9" />
      <path
        d="M23 50 C38 55 58 55 73 50 L74 57 C58 62 38 62 22 57 Z"
        fill="#b8322f"
        fillOpacity="0.85"
        stroke="#e6c56b"
        strokeWidth="0.8"
      />
      <g transform="translate(31 54)">
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-2.6"
            rx="1.3"
            ry="2.6"
            fill="#f8f4ec"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="1.3" fill="#e6c56b" />
      </g>
    </svg>
  );
}

// ── St. Patrick's Day ────────────────────────────────────────────────────────

const RAINBOW_BANDS = ["#e86a6a", "#f0a35a", "#f2d36b", "#6fd49b", "#6aa8e8", "#a78bfa"];

/** Arco-íris gravado: faixas suaves separadas por fios dourados. */
export function RainbowArt() {
  const arc = (r: number) => `M${100 - r} 104 A${r} ${r} 0 0 1 ${100 + r} 104`;
  return (
    <svg viewBox="0 0 200 106" className={svgClass}>
      {RAINBOW_BANDS.map((color, i) => (
        <path
          key={color}
          d={arc(92 - i * 8)}
          fill="none"
          stroke={color}
          strokeOpacity="0.45"
          strokeWidth="8"
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          d={arc(96 - i * 8)}
          fill="none"
          stroke="#e6c56b"
          strokeOpacity={i === 0 || i === 6 ? 0.75 : 0.4}
          strokeWidth="0.7"
        />
      ))}
    </svg>
  );
}

/** Cartola verde de duende, com um trevo na fita. */
export function LeprechaunHat() {
  return (
    <span className="relative block">
      <Ink icon={GiTopHat} tone="clover" />
      <svg viewBox="-8 -8 16 16" className="absolute w-[24%] left-[24%] top-[54%]">
        <ShamrockGlyph r={4.4} />
      </svg>
    </span>
  );
}

// ── Réveillon ────────────────────────────────────────────────────────────────

/** Estrela dourada para pendurar (Réveillon). */
export function HangingStarArt({ points = 5 }: { points?: number }) {
  return (
    <svg viewBox="-13 -13 26 26" className={svgClass}>
      <StarGlyph r={12} points={points} />
      <circle cx="-3" cy="-4" r="1.4" fill="#fff8e1" opacity="0.8" />
    </svg>
  );
}

// ── Carnaval ─────────────────────────────────────────────────────────────────

/** Serpentina enrolada, pendurada (fita colorida com borda dourada). */
export function SerpentineCurlArt({ color, loops = 5 }: { color: string; loops?: number }) {
  let d = "M10 0";
  for (let i = 0; i < loops; i++) {
    const y = i * 12;
    d += ` C19 ${y + 3} 19 ${y + 9} 10 ${y + 12}`;
    d += ` C1 ${y + 15} 1 ${y + 9} 10 ${y + 12}`;
  }
  return (
    <svg viewBox={`0 0 20 ${loops * 12 + 4}`} className={svgClass}>
      <path d={d} fill="none" stroke={color} strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#e6c56b" strokeOpacity="0.5" strokeWidth="0.5" />
    </svg>
  );
}

// ── Acessórios do logo ───────────────────────────────────────────────────────

/** Coroa dourada (os Reis Magos) com um ramo de azevinho. */
export function CrownWithHolly() {
  return (
    <span className="relative block">
      <Ink
        icon={GiCrown}
        style={{ fill: "url(#st-grad-gold)", stroke: "#8a6a14" } as CSSProperties}
      />
      <svg viewBox="-20 -12 40 26" className="absolute w-[46%] left-[-10%] bottom-[-6%]">
        <HollySprig />
      </svg>
    </span>
  );
}

/** Coroa de rosas: três rosas e folhas num arco. */
export function RoseWreathArt() {
  const leaf = "M0 0 Q4 -4 9 0 Q4 4 0 0 Z";
  return (
    <svg viewBox="0 0 100 46" className={svgClass}>
      <path d="M8 40 Q50 4 92 40" fill="none" stroke="#6b8a4e" strokeWidth="1.6" />
      {[
        [14, 34, -40],
        [30, 22, -150],
        [44, 18, -30],
        [58, 18, 200],
        [72, 24, -20],
        [86, 34, 210],
      ].map(([x, y, angle]) => (
        <path
          key={`${x}-${y}`}
          d={leaf}
          transform={`translate(${x} ${y}) rotate(${angle}) scale(1.3)`}
          fill="url(#st-hatch-pine-f)"
          stroke="#9cc7a4"
          strokeWidth="0.6"
        />
      ))}
      <g transform="translate(22 30)">
        <RoseGlyph r={8} />
      </g>
      <g transform="translate(50 16)">
        <RoseGlyph r={10} />
      </g>
      <g transform="translate(78 30)">
        <RoseGlyph r={8} />
      </g>
    </svg>
  );
}

/** Orelhas de coelho gravadas (contorno dourado, hachura e miolo rosado). */
export function BunnyEarsArt() {
  return (
    <svg viewBox="0 0 100 90" className={svgClass}>
      <g className="st-ear-still">
        <path
          d="M33 82 C20 62 17 26 26 8 C30 1 38 2 40 10 C45 30 44 60 41 82 Z"
          fill="url(#st-hatch-cream-f)"
          stroke="#e6c56b"
          strokeWidth="1.2"
        />
        <path
          d="M34 74 C26 56 25 30 30 16 C34 23 36 46 36 74 Z"
          fill="#ffc1d9"
          fillOpacity="0.55"
          stroke="#e6c56b"
          strokeOpacity="0.6"
          strokeWidth="0.8"
        />
      </g>
      <g className="st-ear-twitch">
        <path
          d="M60 82 C58 60 60 28 68 10 C72 2 80 4 80 12 C80 34 74 60 67 82 Z"
          fill="url(#st-hatch-cream-f)"
          stroke="#e6c56b"
          strokeWidth="1.2"
        />
        <path
          d="M64 74 C63 56 65 34 71 18 C74 26 72 50 67 74 Z"
          fill="#ffc1d9"
          fillOpacity="0.55"
          stroke="#e6c56b"
          strokeOpacity="0.6"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}
