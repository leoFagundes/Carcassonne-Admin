// Pequenos desenhos em gravura (elementos <g> centrados em 0,0) usados nas
// guirlandas, faixas e acessórios. As hachuras "-f" vêm do SiteThemeDefs.

const f = (n: number) => n.toFixed(2);

/** Ramo de azevinho: duas folhas riscadas e três frutinhas. */
export function HollySprig() {
  const leaf =
    "M0 0 C2 -3 4 -4 5 -4 L6 -7 L8 -4.5 L11 -5 L12 -7.5 L14 -4.5 L17 -3 L19 0 L17 3 L14 4.5 L12 7.5 L11 5 L8 4.5 L6 7 L5 4 C4 4 2 3 0 0 Z";
  return (
    <g>
      {[-28, 208].map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path d={leaf} fill="url(#st-hatch-pine-f)" stroke="#9cc7a4" strokeWidth="0.8" />
          <path d="M1 0 L17 0" stroke="#9cc7a4" strokeOpacity="0.7" strokeWidth="0.6" />
        </g>
      ))}
      {[
        [-2.6, 1.6],
        [2.6, 1.6],
        [0, -1.8],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="2.5" fill="#c0392b" stroke="#e6c56b" strokeOpacity="0.7" strokeWidth="0.5" />
          <circle cx={cx - 0.8} cy={cy - 0.8} r="0.7" fill="#fff" opacity="0.7" />
        </g>
      ))}
    </g>
  );
}

// Contorno de flor com 5 lóbulos e miolo em espiral — a rosa "de gravura"
function rosePaths(r: number) {
  const steps = 60;
  let outline = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const radius = r * (0.84 + 0.16 * Math.cos(5 * a));
    outline += `${i === 0 ? "M" : "L"}${f(Math.cos(a) * radius)} ${f(Math.sin(a) * radius)} `;
  }
  let spiral = "";
  const turns = Math.PI * 3.4;
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * turns;
    const radius = (r * 0.72 * i) / 40;
    spiral += `${i === 0 ? "M" : "L"}${f(Math.cos(a) * radius)} ${f(Math.sin(a) * radius)} `;
  }
  return { outline: outline + "Z", spiral };
}

/** Rosa gravada: pétalas em lóbulos e miolo em espiral. */
export function RoseGlyph({ r = 5 }: { r?: number }) {
  const { outline, spiral } = rosePaths(r);
  return (
    <g>
      <path d={outline} fill="url(#st-hatch-rose-f)" stroke="#ff9eb5" strokeWidth="0.7" />
      <path d={spiral} fill="none" stroke="#ffd0dc" strokeOpacity="0.85" strokeWidth="0.6" />
    </g>
  );
}

/** Trevo de três folhas (cada folha um coraçãozinho) com cabinho. */
export function ShamrockGlyph({ r = 4 }: { r?: number }) {
  const leaf = `M0 0 C${f(-r * 0.95)} ${f(-r * 0.35)} ${f(-r * 0.9)} ${f(-r * 1.35)} 0 ${f(-r * 0.95)} C${f(r * 0.9)} ${f(-r * 1.35)} ${f(r * 0.95)} ${f(-r * 0.35)} 0 0 Z`;
  return (
    <g>
      <path
        d={`M0 0 Q${f(r * 0.35)} ${f(r * 0.8)} ${f(r * 0.15)} ${f(r * 1.45)}`}
        fill="none"
        stroke="#6fd49b"
        strokeWidth="0.8"
      />
      {[0, 120, 240].map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path d={leaf} fill="url(#st-hatch-clover-f)" stroke="#6fd49b" strokeWidth="0.7" />
          <path d={`M0 0 L0 ${f(-r * 0.75)}`} stroke="#6fd49b" strokeOpacity="0.6" strokeWidth="0.5" />
        </g>
      ))}
    </g>
  );
}

/** Estrela de N pontas com hachura dourada. */
export function StarGlyph({ r = 5, points = 5 }: { r?: number; points?: number }) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    d += `${i === 0 ? "M" : "L"}${f(Math.cos(a) * radius)} ${f(Math.sin(a) * radius)} `;
  }
  return <path d={`${d}Z`} fill="url(#st-hatch-gold-f)" stroke="#e6c56b" strokeWidth="0.8" />;
}

/** Cone de lúpulo: escamas sobrepostas riscadas. */
export function HopConeGlyph({ r = 4 }: { r?: number }) {
  return (
    <g>
      <ellipse rx={r * 0.68} ry={r} fill="url(#st-hatch-pine-f)" stroke="#b5d98a" strokeWidth="0.7" />
      {[-0.45, 0, 0.45].map((t) => (
        <path
          key={t}
          d={`M${f(-r * 0.6)} ${f(r * t - r * 0.15)} Q0 ${f(r * t + r * 0.25)} ${f(r * 0.6)} ${f(r * t - r * 0.15)}`}
          fill="none"
          stroke="#b5d98a"
          strokeOpacity="0.75"
          strokeWidth="0.6"
        />
      ))}
    </g>
  );
}

/** Moeda de ouro com borda serrilhada riscada. */
export function CoinGlyph({ r = 3 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill="url(#st-grad-gold)" stroke="#8a6a14" strokeWidth="0.6" />
      <circle r={r * 0.68} fill="none" stroke="#fff1b8" strokeOpacity="0.6" strokeWidth="0.5" />
    </g>
  );
}
