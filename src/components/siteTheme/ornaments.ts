// Geradores dos ornamentos "riscados" (traço a traço, estilo gravura). Tudo é
// gerado com semente fixa: o desenho é sempre o mesmo para o mesmo tamanho.

export type Pt = { x: number; y: number };
export type PathPoint = Pt & { angle: number };

/** Aleatório determinístico (LCG) — mesmo resultado a cada render. */
export function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/** Pontos (com a direção da curva) de uma quadrática, a cada ~`step` px. */
export function sampleQuad(p0: Pt, c: Pt, p2: Pt, step: number): PathPoint[] {
  const length =
    Math.hypot(c.x - p0.x, c.y - p0.y) + Math.hypot(p2.x - c.x, p2.y - c.y);
  const n = Math.max(2, Math.round(length / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y,
      angle: Math.atan2(
        2 * u * (c.y - p0.y) + 2 * t * (p2.y - c.y),
        2 * u * (c.x - p0.x) + 2 * t * (p2.x - c.x),
      ),
    };
  });
}

/** Pontos de uma linha ondulada ao longo de x (0 → length), centrada em `mid`. */
export function sampleWave(
  length: number,
  mid: number,
  amplitude: number,
  wavelength: number,
  step: number,
  phase = 0,
): PathPoint[] {
  const n = Math.max(2, Math.round(length / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = (length * i) / n;
    const k = (2 * Math.PI) / wavelength;
    return {
      x,
      y: mid + amplitude * Math.sin(k * x + phase),
      angle: Math.atan2(amplitude * k * Math.cos(k * x + phase), 1),
    };
  });
}

export function pointsToPath(points: Pt[]) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${f(p.x)} ${f(p.y)}`)
    .join(" ");
}

/** Gira os pontos 90° (x↔y) — para usar os mesmos ornamentos na vertical. */
export function transpose<T extends PathPoint>(points: T[]): T[] {
  return points.map((p) => ({
    ...p,
    x: p.y,
    y: p.x,
    angle: Math.PI / 2 - p.angle,
  }));
}

/**
 * Ramo de pinheiro: agulhas curtas saindo dos dois lados da linha, em três
 * tons (escuro, médio e um toque de dourado). Devolve um path por tom.
 */
export function evergreenNeedles(points: PathPoint[], size: number, seed: number) {
  const rand = seededRandom(seed);
  const tones = ["", "", ""];
  for (const p of points) {
    for (const side of [-1, 1]) {
      const angle = p.angle + side * (0.85 + rand() * 0.45) + Math.PI * 0.08;
      const length = size * (0.38 + rand() * 0.22);
      const offset = (rand() - 0.5) * 2;
      const x0 = p.x - Math.sin(p.angle) * offset;
      const y0 = p.y + Math.cos(p.angle) * offset;
      const segment = `M${f(x0)} ${f(y0)} L${f(x0 + Math.cos(angle) * length)} ${f(
        y0 + Math.sin(angle) * length,
      )} `;
      const pick = rand();
      tones[pick < 0.68 ? 0 : pick < 0.92 ? 1 : 2] += segment;
    }
  }
  return { dark: tones[0], mid: tones[1], gold: tones[2] };
}

/** Espinhos triangulares alternando os lados de uma linha (vinha espinhosa). */
export function thorns(points: PathPoint[], every: number, size: number, seed: number) {
  const rand = seededRandom(seed);
  let d = "";
  let side = 1;
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    travelled += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    if (travelled < every) continue;
    travelled = 0;
    side = -side;
    const tx = Math.cos(p.angle);
    const ty = Math.sin(p.angle);
    const nx = -ty * side;
    const ny = tx * side;
    const length = size * (0.7 + rand() * 0.5);
    const base = size * 0.32;
    d += `M${f(p.x - tx * base)} ${f(p.y - ty * base)} L${f(p.x + nx * length - tx * length * 0.35)} ${f(
      p.y + ny * length - ty * length * 0.35,
    )} L${f(p.x + tx * base)} ${f(p.y + ty * base)} Z `;
  }
  return d;
}

/** Folhas em amêndoa alternando os lados (vinha florida). */
export function leaves(points: PathPoint[], every: number, size: number, seed: number) {
  const rand = seededRandom(seed);
  let d = "";
  let veins = "";
  let side = 1;
  let travelled = 0;
  const spots: (PathPoint & { side: number })[] = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    travelled += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    if (travelled < every) continue;
    travelled = 0;
    side = -side;
    const angle = p.angle + side * (0.7 + rand() * 0.35);
    const length = size * (0.9 + rand() * 0.4);
    const width = length * 0.36;
    const tip = { x: p.x + Math.cos(angle) * length, y: p.y + Math.sin(angle) * length };
    const mid = { x: (p.x + tip.x) / 2, y: (p.y + tip.y) / 2 };
    const px = -Math.sin(angle) * width;
    const py = Math.cos(angle) * width;
    d += `M${f(p.x)} ${f(p.y)} Q${f(mid.x + px)} ${f(mid.y + py)} ${f(tip.x)} ${f(tip.y)} Q${f(
      mid.x - px,
    )} ${f(mid.y - py)} ${f(p.x)} ${f(p.y)} Z `;
    veins += `M${f(p.x)} ${f(p.y)} L${f(mid.x + (tip.x - mid.x) * 0.6)} ${f(mid.y + (tip.y - mid.y) * 0.6)} `;
    spots.push({ ...p, side });
  }
  return { d, veins, spots };
}

/** Folhas aos pares, dos dois lados do mesmo ponto (guirlanda de louros). */
export function leafPairs(points: PathPoint[], every: number, size: number) {
  let d = "";
  let veins = "";
  let travelled = every;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    travelled += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    if (travelled < every) continue;
    travelled = 0;
    for (const side of [-1, 1]) {
      const angle = p.angle + side * 0.75;
      const length = size;
      const width = length * 0.34;
      const tip = { x: p.x + Math.cos(angle) * length, y: p.y + Math.sin(angle) * length };
      const mid = { x: (p.x + tip.x) / 2, y: (p.y + tip.y) / 2 };
      const px = -Math.sin(angle) * width;
      const py = Math.cos(angle) * width;
      d += `M${f(p.x)} ${f(p.y)} Q${f(mid.x + px)} ${f(mid.y + py)} ${f(tip.x)} ${f(tip.y)} Q${f(
        mid.x - px,
      )} ${f(mid.y - py)} ${f(p.x)} ${f(p.y)} Z `;
      veins += `M${f(p.x)} ${f(p.y)} L${f(mid.x + (tip.x - mid.x) * 0.6)} ${f(mid.y + (tip.y - mid.y) * 0.6)} `;
    }
  }
  return { d, veins };
}

/**
 * Laço "serpentina": a linha avança fazendo voltinhas (trocoide). `radius`
 * maior que `wavelength / 2π` gera os laços.
 */
export function trochoid(
  length: number,
  mid: number,
  radius: number,
  wavelength: number,
  phase = 0,
  step = 2,
): Pt[] {
  const k = (2 * Math.PI) / wavelength;
  const n = Math.max(2, Math.round(length / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = (length * i) / n;
    return {
      x: s + radius * Math.cos(k * s + phase),
      y: mid + radius * Math.sin(k * s + phase),
    };
  });
}
