"use client";

import { useEffect, useRef } from "react";

export type Rgb = readonly [number, number, number];

export type ParticleKind =
  | "snow" // flocos (os maiores em cristal riscado) caindo
  | "bokeh" // cristais grandes e desfocados (camada da frente)
  | "ember" // brasas subindo e tremulando
  | "petal" // pétalas girando enquanto caem
  | "bubble" // bolhinhas de chopp subindo
  | "confetti" // confete girando e virando enquanto cai
  | "glitter" // purpurina: brilhos de quatro pontas piscando
  | "heart" // coraçõezinhos subindo devagar
  | "clover" // trevos caindo
  | "tile"; // peças do Carcassonne (estrada, cidade, mosteiro) caindo

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  freq: number;
  amp: number;
  alpha: number;
  rot: number;
  spin: number;
  color: number;
  /** Variação do desenho (ex: qual peça do Carcassonne). */
  variant: number;
}

interface ParticleCanvasProps {
  kind: ParticleKind;
  /** Partículas a cada 100.000 px² — a quantidade acompanha o tamanho da tela. */
  density: number;
  max: number;
  /** Use uma constante (fora do componente): trocar o array reinicia a animação. */
  colors: readonly Rgb[];
}

const TAU = Math.PI * 2;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Brilho suave pré-desenhado uma vez por cor — bem mais barato que criar um
// gradiente por partícula a cada quadro.
function makeGlowSprite([r, g, b]: Rgb) {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gradient.addColorStop(0.3, `rgba(${r},${g},${b},0.55)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return sprite;
}

const GLOW_KINDS: ParticleKind[] = ["ember", "bokeh", "glitter"];

export default function ParticleCanvas({
  kind,
  density,
  max,
  colors,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fills = colors.map(([r, g, b]) => `rgb(${r},${g},${b})`);
    const sprites = GLOW_KINDS.includes(kind) ? colors.map(makeGlowSprite) : [];

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let last = 0;
    let time = 0;

    // anywhere = espalhada pela tela toda (início); senão, nasce na borda de entrada
    const spawn = (anywhere: boolean): Particle => {
      const p: Particle = {
        x: rand(0, width),
        y: 0,
        r: 1,
        vx: 0,
        vy: 0,
        phase: rand(0, TAU),
        freq: rand(0.4, 1.1),
        amp: 0,
        alpha: 1,
        rot: rand(0, TAU),
        spin: 0,
        color: Math.floor(Math.random() * colors.length),
        variant: Math.floor(Math.random() * 3),
      };
      switch (kind) {
        case "snow":
          p.r = rand(0.7, 2.4);
          p.vy = 14 + p.r * 14;
          p.vx = rand(-4, 4);
          p.amp = rand(6, 18);
          p.alpha = rand(0.35, 0.85);
          p.spin = rand(-0.6, 0.6);
          break;
        case "bokeh":
          p.r = rand(2.6, 5.5);
          p.vy = 20 + p.r * 6;
          p.vx = rand(-5, 5);
          p.amp = rand(10, 20);
          p.alpha = rand(0.12, 0.3);
          p.spin = rand(-0.4, 0.4);
          break;
        case "ember":
          p.r = rand(0.8, 2.2);
          p.vy = -rand(10, 28);
          p.vx = rand(-3, 3);
          p.amp = rand(6, 14);
          p.alpha = rand(0.4, 0.9);
          break;
        case "petal":
          p.r = rand(3, 6);
          p.vy = rand(14, 30);
          p.vx = rand(-6, 6);
          p.amp = rand(10, 24);
          p.alpha = rand(0.5, 0.85);
          p.spin = rand(-1.6, 1.6);
          break;
        case "bubble":
          p.r = rand(1.2, 3.6);
          p.vy = -rand(12, 30);
          p.vx = rand(-2, 2);
          p.amp = rand(4, 10);
          p.alpha = rand(0.3, 0.65);
          break;
        case "confetti":
          p.r = rand(2.2, 4);
          p.vy = rand(18, 40);
          p.vx = rand(-8, 8);
          p.amp = rand(10, 26);
          p.alpha = rand(0.6, 0.95);
          p.spin = rand(-3, 3);
          break;
        case "glitter":
          p.r = rand(1.2, 3);
          p.vy = rand(6, 14);
          p.vx = rand(-3, 3);
          p.amp = rand(4, 10);
          p.alpha = rand(0.45, 0.95);
          p.spin = rand(-0.5, 0.5);
          break;
        case "heart":
          p.r = rand(3, 6);
          p.vy = -rand(8, 18);
          p.vx = rand(-3, 3);
          p.amp = rand(8, 16);
          p.alpha = rand(0.35, 0.7);
          p.spin = rand(-0.4, 0.4);
          p.rot = rand(-0.3, 0.3);
          break;
        case "clover":
          p.r = rand(3, 5);
          p.vy = rand(12, 26);
          p.vx = rand(-5, 5);
          p.amp = rand(8, 18);
          p.alpha = rand(0.55, 0.85);
          p.spin = rand(-1.4, 1.4);
          break;
        case "tile":
          p.r = rand(3.5, 6);
          p.vy = rand(10, 22);
          p.vx = rand(-4, 4);
          p.amp = rand(6, 14);
          p.alpha = rand(0.45, 0.8);
          p.spin = rand(-0.9, 0.9);
          break;
      }
      const rising = p.vy < 0;
      if (anywhere) p.y = rand(0, height);
      else p.y = rising ? height + p.r * 2 + rand(0, 20) : -p.r * 2 - rand(0, 20);
      return p;
    };

    const update = (dt: number) => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += (p.vx + Math.sin(time * p.freq + p.phase) * p.amp) * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        const gone =
          p.vy > 0 ? p.y - p.r * 2 > height : p.y + p.r * 2 < 0;
        if (gone || p.x < -30 || p.x > width + 30) particles[i] = spawn(false);
      }
    };

    // Floco em cristal riscado: seis braços com ramos em "V", como nas gravuras
    const crystal = (p: Particle, size: number) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const cx = Math.cos(a);
        const cy = Math.sin(a);
        ctx.moveTo(0, 0);
        ctx.lineTo(cx * size, cy * size);
        const bx = cx * size * 0.55;
        const by = cy * size * 0.55;
        const branch = size * 0.32;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + 0.8) * branch, by + Math.sin(a + 0.8) * branch);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a - 0.8) * branch, by + Math.sin(a - 0.8) * branch);
      }
      ctx.stroke();
      ctx.restore();
    };

    const heartPath = (r: number) => {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.9);
      ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
      ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9);
      ctx.closePath();
    };

    // Peça do Carcassonne em miniatura: estrada, cidade ou mosteiro
    const tile = (p: Particle) => {
      const s = p.r;
      ctx.fillStyle = "rgba(230, 197, 107, 0.12)";
      ctx.strokeStyle = fills[p.color];
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.rect(-s, -s, s * 2, s * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      if (p.variant === 0) {
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
      } else if (p.variant === 1) {
        ctx.arc(-s, -s, s * 1.2, 0, Math.PI / 2);
      } else {
        ctx.rect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7);
      }
      ctx.stroke();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      for (const p of particles) {
        switch (kind) {
          case "snow":
            ctx.globalAlpha = p.alpha;
            if (p.r > 1.5) {
              ctx.strokeStyle = fills[p.color];
              ctx.lineWidth = 0.8;
              crystal(p, p.r * 2.6);
            } else {
              ctx.fillStyle = fills[p.color];
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r, 0, TAU);
              ctx.fill();
            }
            break;
          case "bokeh":
            ctx.globalAlpha = p.alpha * 0.8;
            ctx.drawImage(sprites[p.color], p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4);
            ctx.globalAlpha = Math.min(1, p.alpha * 2.4);
            ctx.strokeStyle = fills[p.color];
            ctx.lineWidth = 1;
            crystal(p, p.r * 2.2);
            break;
          case "ember": {
            const flicker = 0.55 + 0.45 * Math.sin(time * p.freq * 5 + p.phase);
            ctx.globalAlpha = p.alpha * flicker;
            ctx.drawImage(sprites[p.color], p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8);
            ctx.globalAlpha = Math.min(1, p.alpha * flicker * 1.2);
            ctx.fillStyle = fills[p.color];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.6, 0, TAU);
            ctx.fill();
            break;
          }
          case "petal": {
            // Achata e "desachata" a elipse para parecer que a pétala gira no ar
            const tumble = 0.35 + 0.65 * Math.abs(Math.sin(time * p.freq * 1.6 + p.phase));
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = fills[p.color];
            ctx.beginPath();
            ctx.ellipse(0, 0, p.r, p.r * 0.55 * tumble, 0, 0, TAU);
            ctx.fill();
            // Nervura riscada no meio da pétala
            ctx.strokeStyle = "rgba(90, 60, 80, 0.35)";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(-p.r * 0.8, 0);
            ctx.lineTo(p.r * 0.8, 0);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case "bubble":
            // Contorno + reflexo: bolha desenhada, não uma bola chapada
            ctx.globalAlpha = p.alpha;
            ctx.strokeStyle = fills[p.color];
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, TAU);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.6, Math.PI * 1.1, Math.PI * 1.55);
            ctx.stroke();
            break;
          case "confetti": {
            const flip = Math.cos(time * p.freq * 4 + p.phase);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, 0.25 + 0.75 * Math.abs(flip));
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = fills[p.color];
            if (p.variant === 2) {
              ctx.beginPath();
              ctx.arc(0, 0, p.r * 0.7, 0, TAU);
              ctx.fill();
            } else {
              ctx.fillRect(-p.r * 0.8, -p.r * 0.45, p.r * 1.6, p.r * 0.9);
            }
            ctx.restore();
            break;
          }
          case "glitter": {
            const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(time * p.freq * 3 + p.phase));
            const size = p.r * 2.4 * (0.7 + 0.3 * twinkle);
            ctx.globalAlpha = p.alpha * twinkle * 0.35;
            ctx.drawImage(sprites[p.color], p.x - size, p.y - size, size * 2, size * 2);
            ctx.globalAlpha = p.alpha * twinkle;
            ctx.strokeStyle = fills[p.color];
            ctx.lineWidth = 0.8;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.lineTo(size, 0);
            ctx.moveTo(0, -size);
            ctx.lineTo(0, size);
            ctx.stroke();
            ctx.restore();
            break;
          }
          case "heart":
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            heartPath(p.r);
            ctx.globalAlpha = p.alpha * 0.45;
            ctx.fillStyle = fills[p.color];
            ctx.fill();
            ctx.globalAlpha = p.alpha;
            ctx.strokeStyle = fills[p.color];
            ctx.lineWidth = 0.9;
            ctx.stroke();
            ctx.restore();
            break;
          case "clover":
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = fills[p.color];
            ctx.strokeStyle = "rgba(15, 50, 30, 0.6)";
            ctx.lineWidth = 0.6;
            for (let k = 0; k < 3; k++) {
              const a = (k * TAU) / 3 - Math.PI / 2;
              ctx.beginPath();
              ctx.arc(Math.cos(a) * p.r * 0.55, Math.sin(a) * p.r * 0.55, p.r * 0.5, 0, TAU);
              ctx.fill();
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(p.r * 0.3, p.r * 0.8, p.r * 0.1, p.r * 1.3);
            ctx.strokeStyle = fills[p.color];
            ctx.stroke();
            ctx.restore();
            break;
          case "tile":
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.globalAlpha = p.alpha;
            tile(p);
            ctx.restore();
            break;
        }
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(
        max,
        Math.round(((width * height) / 100_000) * density),
      );
      while (particles.length < target) particles.push(spawn(true));
      if (particles.length > target) particles = particles.slice(0, target);
      draw();
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    // Aba em segundo plano: para de desenhar
    const onVisibility = () => (document.hidden ? stop() : start());

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // Com "reduzir movimento" ligado, as partículas aparecem paradas
    if (!reduceMotion) {
      start();
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [kind, density, max, colors]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
