"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { prefersReducedMotion, random, type LayerRef } from "./sceneKit";

gsap.registerPlugin(MotionPathPlugin);

// Atores reaproveitáveis das cenas (GSAP). Todos param e limpam tudo ao
// desmontar, e ficam parados com "reduzir movimento" ligado.

type Range = [number, number];
const pick = ([min, max]: Range) => random(min, max);

/**
 * Elementos que atravessam a tela de tempos em tempos por caminhos suaves.
 * "cross": de um lado ao outro (morcegos, flechas). "rise": de baixo para
 * cima, sumindo no alto (balões, corações).
 */
export function Flyers({
  layerRef,
  count,
  render,
  className,
  mode = "cross",
  speed = [110, 180],
  gap = [3, 9],
  band = mode === "cross" ? [0.08, 0.55] : [0.05, 0.95],
  wobble = 0.12,
  curviness = 1.3,
  scale = [0.8, 1.1],
  autoRotate,
  mirror = false,
  sides = false,
}: {
  layerRef: LayerRef;
  count: number;
  render: (index: number) => ReactNode;
  /** Classe do elemento (tamanho, brilho). Comece invisível (st-actor). */
  className: string;
  mode?: "cross" | "rise";
  speed?: Range;
  gap?: Range;
  /** cross: faixa vertical (fração da altura); rise: faixa horizontal (fração da largura). */
  band?: Range;
  wobble?: number;
  curviness?: number;
  scale?: Range;
  /** Gira junto com o caminho; o número é o ângulo para onde o desenho aponta. */
  autoRotate?: number;
  /** Espelha quando vai para a esquerda. */
  mirror?: boolean;
  /** rise: alterna os lados da tela (fica longe do conteúdo do meio). */
  sides?: boolean;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  // Opções numa ref: as cenas passam arrays literais, sem reiniciar a animação
  const options = useRef({ mode, speed, gap, band, wobble, curviness, scale, autoRotate, mirror, sides });

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const o = options.current;
    let alive = true;
    const trips: gsap.core.Timeline[] = [];

    const go = (index: number, delay: number) => {
      const el = refs.current[index];
      const layer = layerRef.current;
      if (!alive || !el || !layer) return;
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const size = el.offsetWidth;
      const s = pick(o.scale);
      let path: { x: number; y: number }[];
      let flip = 1;

      if (o.mode === "cross") {
        const toRight = Math.random() < 0.5;
        const start = toRight ? -size - 20 : w + 20;
        const end = toRight ? w + 20 : -size - 20;
        const base = random(h * o.band[0], h * o.band[1]);
        path = Array.from({ length: 5 }, (_, i) => ({
          x: start + ((end - start) * i) / 4,
          y: Math.max(0, base + random(-h * o.wobble, h * o.wobble)),
        }));
        flip = o.mirror && !toRight ? -1 : 1;
      } else {
        const left = o.sides ? index % 2 === 0 : Math.random() < 0.5;
        const [from, to] = o.sides
          ? left
            ? [0.03, 0.22]
            : [0.78, 0.97]
          : o.band;
        const baseX = random(w * from, w * to) - size / 2;
        path = Array.from({ length: 5 }, (_, i) => ({
          x: baseX + (i === 0 ? 0 : random(-w * o.wobble, w * o.wobble)),
          y: h + 20 - ((h + size * 1.6 + 40) * i) / 4,
        }));
      }

      const distance = path.reduce(
        (sum, p, i) => (i ? sum + Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) : 0),
        0,
      );
      const duration = distance / pick(o.speed);
      gsap.set(el, { x: path[0].x, y: path[0].y, scaleX: s * flip, scaleY: s, autoAlpha: o.mode === "rise" ? 0 : 1, rotation: 0 });
      const tl = gsap.timeline({ delay, onComplete: () => go(index, pick(o.gap)) });
      tl.to(el, {
        duration,
        ease: "none",
        motionPath: {
          path: path.slice(1),
          curviness: o.curviness,
          ...(o.autoRotate !== undefined && { autoRotate: -o.autoRotate }),
        },
      });
      if (o.mode === "rise") {
        tl.to(el, { autoAlpha: 1, duration: Math.min(1.2, duration * 0.2) }, 0).to(
          el,
          { autoAlpha: 0, duration: Math.min(1.6, duration * 0.25) },
          duration * 0.72,
        );
      }
      trips[index] = tl;
    };

    for (let i = 0; i < count; i++) go(i, random(0.8, 4) + i * pick(o.gap) * 0.5);
    return () => {
      alive = false;
      trips.forEach((trip) => trip?.kill());
    };
  }, [layerRef, count]);

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`st-actor top-0 ${className}`}
        >
          {render(i)}
        </div>
      ))}
    </>
  );
}

/** Fileira de bonequinhos que de vez em quando pulam em "ola" (meeples). */
export function JumpingCrowd({
  items,
  className,
  itemClassName = "",
}: {
  items: ReactNode[];
  className: string;
  itemClassName?: string;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const elements = refs.current.filter((el): el is HTMLDivElement => !!el);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.2, delay: random(1, 3) });
    tl.to(elements, {
      y: (_: number, el: HTMLDivElement) => -el.offsetHeight * 0.45,
      rotation: (i: number) => (i % 2 ? 9 : -9),
      duration: 0.28,
      ease: "power2.out",
      yoyo: true,
      repeat: 1,
      stagger: 0.11,
    }).to(
      elements,
      { scaleY: 0.9, duration: 0.1, yoyo: true, repeat: 1, transformOrigin: "50% 100%", stagger: 0.11 },
      0.56,
    );
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className={`absolute flex items-end ${className}`}>
      {items.map((item, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={itemClassName}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

/**
 * Objeto que atravessa o rodapé rolando de tempos em tempos: moeda (gira
 * redondo) ou dado (`tumble`: vira de face em face, aos pulinhos).
 */
export function Roller({
  layerRef,
  className,
  children,
  tumble = false,
  gap = [7, 14],
}: {
  layerRef: LayerRef;
  className: string;
  children: ReactNode;
  tumble?: boolean;
  gap?: Range;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const gapRef = useRef(gap);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let alive = true;
    let tl: gsap.core.Timeline | undefined;

    const roll = (delay: number) => {
      const layer = layerRef.current;
      if (!alive || !layer) return;
      const w = layer.clientWidth;
      const size = el.offsetWidth;
      const toRight = Math.random() < 0.5;
      const start = toRight ? -size - 20 : w + 20;
      const end = toRight ? w + 20 : -size - 20;
      const dir = toRight ? 1 : -1;
      tl = gsap.timeline({ delay, onComplete: () => roll(pick(gapRef.current)) });
      tl.set(el, { x: start, y: 0, rotation: 0, autoAlpha: 1 });

      if (tumble) {
        const steps = Math.ceil(Math.abs(end - start) / size);
        for (let i = 1; i <= steps; i++) {
          tl.to(el, { x: start + dir * size * i, rotation: dir * 90 * i, duration: 0.32, ease: "power1.inOut" })
            .to(el, { y: -size * 0.22, duration: 0.16, ease: "power1.out" }, "<")
            .to(el, { y: 0, duration: 0.16, ease: "power1.in" }, ">");
        }
      } else {
        const distance = Math.abs(end - start);
        tl.to(el, {
          x: end,
          rotation: (dir * distance * 360) / (Math.PI * size),
          duration: distance / random(70, 100),
          ease: "none",
        });
      }
    };

    roll(random(2, 6));
    return () => {
      alive = false;
      tl?.kill();
    };
  }, [layerRef, tumble]);

  return (
    <div ref={ref} className={`st-actor ${className}`}>
      {children}
    </div>
  );
}

/**
 * Brinde: dois copos se aproximam, se inclinam, batem (faísca e respingos) e
 * voltam. Repete de tempos em tempos.
 */
export function ToastPair({
  left,
  right,
  className,
  splash = "#fff1c9",
}: {
  left: ReactNode;
  right: ReactNode;
  className: string;
  splash?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const l = leftRef.current;
    const r = rightRef.current;
    const burst = burstRef.current;
    if (!box || !l || !r || !burst || prefersReducedMotion()) return;
    const drops = Array.from(burst.querySelectorAll(".st-drop"));
    const shift = () => Math.max(0, (box.offsetWidth - l.offsetWidth - r.offsetWidth) / 2 + l.offsetWidth * 0.12);

    gsap.set(burst, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 4.5, delay: random(1.5, 4) });
    tl.to(l, { x: shift, rotation: 14, duration: 0.6, ease: "power2.inOut", transformOrigin: "50% 100%" })
      .to(r, { x: () => -shift(), rotation: -14, duration: 0.6, ease: "power2.inOut", transformOrigin: "50% 100%" }, "<")
      .to(burst, { autoAlpha: 1, scale: 1.1, duration: 0.16, ease: "power2.out" })
      .fromTo(
        drops,
        { x: 0, y: 0, autoAlpha: 1 },
        {
          x: (i: number) => (i % 2 ? 1 : -1) * random(10, 22),
          y: () => -random(14, 30),
          autoAlpha: 0,
          duration: 0.7,
          ease: "power1.out",
        },
        "<",
      )
      .to(burst, { autoAlpha: 0, scale: 1.4, duration: 0.35 }, "<0.12")
      .to([l, r], { x: 0, rotation: 0, duration: 0.8, ease: "power2.inOut" }, "+=0.35");
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={boxRef} className={`absolute ${className}`}>
      <div ref={leftRef} className="absolute left-0 bottom-0 w-[44%]">
        {left}
      </div>
      <div ref={rightRef} className="absolute right-0 bottom-0 w-[44%]">
        <div style={{ transform: "scaleX(-1)" }}>{right}</div>
      </div>
      <svg
        ref={burstRef}
        viewBox="-20 -20 40 40"
        className="absolute left-1/2 top-0 w-[46%] -translate-x-1/2 overflow-visible"
      >
        <g stroke="#ffe7a8" strokeWidth="1.4" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const a = (angle * Math.PI) / 180;
            return (
              <path
                key={angle}
                d={`M${(Math.cos(a) * 5).toFixed(1)} ${(Math.sin(a) * 5).toFixed(1)} L${(Math.cos(a) * 12).toFixed(1)} ${(Math.sin(a) * 12).toFixed(1)}`}
              />
            );
          })}
        </g>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} className="st-drop" r="1.6" fill={splash} />
        ))}
      </svg>
    </div>
  );
}

/**
 * Serpentina lançada: uma fita em laços se desenha atravessando a tela e
 * depois some. Fica atrás do conteúdo.
 */
export function StreamerThrow({ layerRef, colors }: { layerRef: LayerRef; colors: string[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const ribbonRef = useRef<SVGPathElement>(null);
  const edgeRef = useRef<SVGPathElement>(null);
  const colorsRef = useRef(colors);

  useEffect(() => {
    const svg = svgRef.current;
    const ribbon = ribbonRef.current;
    const edge = edgeRef.current;
    if (!svg || !ribbon || !edge || prefersReducedMotion()) return;
    let alive = true;
    let tl: gsap.core.Timeline | undefined;
    let throwIndex = 0;

    const toss = (delay: number) => {
      const layer = layerRef.current;
      if (!alive || !layer) return;
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

      // Parte de uma lateral e atravessa em diagonal, fazendo laços
      const fromLeft = Math.random() < 0.5;
      const start = { x: fromLeft ? -10 : w + 10, y: random(h * 0.1, h * 0.5) };
      const length = random(w * 0.5, w * 0.85);
      const angle = (fromLeft ? 0 : Math.PI) + (fromLeft ? 1 : -1) * random(0.08, 0.3);
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const perp = { x: -dir.y, y: dir.x };
      const radius = random(9, 15);
      const k = (2 * Math.PI) / random(34, 46);
      let d = "";
      for (let s = 0; s <= length; s += 3) {
        const along = s + radius * Math.cos(k * s);
        const across = radius * Math.sin(k * s) + Math.sin(s / 120) * 18;
        const x = start.x + dir.x * along + perp.x * across;
        const y = start.y + dir.y * along + perp.y * across;
        d += `${s === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      ribbon.setAttribute("d", d);
      edge.setAttribute("d", d);
      const palette = colorsRef.current;
      ribbon.setAttribute("stroke", palette[throwIndex++ % palette.length]);
      const total = ribbon.getTotalLength();

      tl = gsap.timeline({ delay, onComplete: () => toss(random(5, 10)) });
      tl.set([ribbon, edge], { strokeDasharray: total, strokeDashoffset: total, autoAlpha: 1 })
        .to([ribbon, edge], { strokeDashoffset: 0, duration: 1.7, ease: "power2.out" })
        .to([ribbon, edge], { autoAlpha: 0, duration: 1.4, ease: "sine.in" }, "+=1.6");
    };

    toss(random(1.5, 4));
    return () => {
      alive = false;
      tl?.kill();
    };
  }, [layerRef]);

  return (
    <svg ref={svgRef} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      <path ref={ribbonRef} fill="none" strokeWidth="2.6" strokeLinecap="round" strokeOpacity="0.85" />
      <path ref={edgeRef} fill="none" stroke="#e6c56b" strokeOpacity="0.55" strokeWidth="0.6" />
    </svg>
  );
}
