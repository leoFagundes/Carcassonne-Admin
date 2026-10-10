"use client";

// Movimentos do cardápio: rolagem até um ponto e o brilho dourado que pisca
// no item/categoria encontrados.

/**
 * Topo do detalhe do item (foto). O degradê e o arredondamento são os mesmos
 * na foto do painel, na cópia que voa do card e no visualizador de foto — por
 * isso a troca entre eles não aparece.
 */
export const HERO_SHADE =
  "linear-gradient(to top, #121111 0%, rgba(18,17,17,0.2) 50%, rgba(18,17,17,0) 100%)";
export const HERO_RADIUS = "16px 16px 0px 0px";

/** O aparelho pediu menos movimento (acessibilidade). */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Chama `callback` quando a rolagem da página termina — ou logo, se ela nem
 * começar. Não depende do evento "scrollend", que o Safari não tem.
 */
export function afterScrollSettles(callback: () => void, maxWait = 1800) {
  const startedAt = performance.now();
  let lastY = window.scrollY;
  let stillFrames = 0;
  const check = () => {
    const y = window.scrollY;
    stillFrames = Math.abs(y - lastY) < 0.5 ? stillFrames + 1 : 0;
    lastY = y;
    if (stillFrames >= 6 || performance.now() - startedAt > maxWait) callback();
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

const GOLD = "230,197,107";
const LIGHT = "255,240,190";

/** Anel dourado somado à sombra que o elemento já tem (para não "piscar" a dele). */
function ring(base: string, spread: number, blur: number, alpha: number) {
  const glow = `0 0 0 ${spread}px rgba(${GOLD},${alpha}), 0 0 ${blur}px rgba(${GOLD},${(alpha * 0.4).toFixed(2)})`;
  return base && base !== "none" ? `${glow}, ${base}` : glow;
}

/** Brilho dourado que pisca duas vezes no card (item encontrado pela busca). */
export function flashCard(element: HTMLElement) {
  const base = getComputedStyle(element).boxShadow;
  element.animate(
    [
      { boxShadow: ring(base, 0, 0, 0), backgroundColor: `rgba(${GOLD},0)` },
      { boxShadow: ring(base, 2, 24, 0.8), backgroundColor: `rgba(${GOLD},0.1)`, offset: 0.15 },
      { boxShadow: ring(base, 1, 10, 0.3), backgroundColor: `rgba(${GOLD},0.03)`, offset: 0.4 },
      { boxShadow: ring(base, 2, 20, 0.7), backgroundColor: `rgba(${GOLD},0.08)`, offset: 0.6 },
      { boxShadow: ring(base, 0, 0, 0), backgroundColor: `rgba(${GOLD},0)` },
    ],
    { duration: 2200, easing: "ease-out" },
  );
}

/** Categoria escolhida no menu: o título brilha e a moldura da seção pisca. */
export function flashSection(section: HTMLElement) {
  const still = prefersReducedMotion();
  const glow = (alpha: number, blur: number, light: number) =>
    `0 0 ${blur}px rgba(${GOLD},${alpha}), 0 0 2px rgba(${LIGHT},${light})`;
  section.querySelector<HTMLElement>(".cm-section-heading")?.animate(
    [
      { textShadow: glow(0, 0, 0), transform: "scale(1)" },
      { textShadow: glow(0.75, 18, 0.9), transform: still ? "scale(1)" : "scale(1.05)", offset: 0.2 },
      { textShadow: glow(0.25, 6, 0), transform: "scale(1)", offset: 0.45 },
      { textShadow: glow(0.6, 16, 0.8), transform: still ? "scale(1)" : "scale(1.03)", offset: 0.62 },
      { textShadow: glow(0, 0, 0), transform: "scale(1)" },
    ],
    { duration: 1700, easing: "ease-out" },
  );
  const base = getComputedStyle(section).boxShadow;
  section.animate(
    [
      { boxShadow: ring(base, 0, 0, 0) },
      { boxShadow: ring(base, 1, 26, 0.55), offset: 0.2 },
      { boxShadow: ring(base, 0, 8, 0.15), offset: 0.45 },
      { boxShadow: ring(base, 1, 22, 0.45), offset: 0.62 },
      { boxShadow: ring(base, 0, 0, 0) },
    ],
    { duration: 1700, easing: "ease-out" },
  );
}
