"use client";

import { useEffect, useRef } from "react";
import type { Rgb } from "./ParticleCanvas";

interface Rocket {
  x: number;
  y: number;
  vy: number;
  targetY: number;
  color: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  twinkle: boolean;
}

const TAU = Math.PI * 2;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const DECELERATION = 140; // px/s² — o foguete perde força até parar e estourar
const GRAVITY = 60;

/**
 * Fogos de artifício em traço riscado: o foguete sobe (de trás da Cité),
 * estoura em raios que caem devagar e somem. Leve: só existe o que está
 * no ar, e para quando a aba fica em segundo plano.
 */
export default function FireworksCanvas({ colors }: { colors: readonly Rgb[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rgb = colors.map(([r, g, b]) => `${r},${g},${b}`);
    let width = 0;
    let height = 0;
    let rockets: Rocket[] = [];
    let sparks: Spark[] = [];
    let nextLaunch = 0.8;
    let raf = 0;
    let last = 0;

    const launch = () => {
      const targetY = rand(height * 0.1, height * 0.42);
      const y = height + 10;
      rockets.push({
        x: rand(width * 0.1, width * 0.9),
        y,
        // sobe exatamente até a altura do estouro
        vy: -Math.sqrt(2 * DECELERATION * (y - targetY)),
        targetY,
        color: Math.floor(Math.random() * colors.length),
      });
    };

    const explode = (rocket: Rocket) => {
      const count = Math.round(rand(36, 60));
      const speed = rand(70, 140) * Math.min(1, Math.max(0.6, width / 900));
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * TAU + rand(-0.05, 0.05);
        const v = speed * rand(0.55, 1);
        const life = rand(1.1, 1.9);
        sparks.push({
          x: rocket.x,
          y: rocket.y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life,
          maxLife: life,
          color: Math.random() < 0.8 ? rocket.color : Math.floor(Math.random() * colors.length),
          twinkle: Math.random() < 0.3,
        });
      }
    };

    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;

      nextLaunch -= dt;
      if (nextLaunch <= 0) {
        launch();
        nextLaunch = rand(1.1, 3);
      }

      rockets = rockets.filter((rocket) => {
        rocket.y += rocket.vy * dt;
        rocket.vy += DECELERATION * dt;
        if (rocket.vy >= -20 || rocket.y <= rocket.targetY) {
          explode(rocket);
          return false;
        }
        return true;
      });

      const drag = Math.max(0, 1 - 1.5 * dt);
      sparks = sparks.filter((spark) => {
        spark.vx *= drag;
        spark.vy = spark.vy * drag + GRAVITY * dt;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        return spark.life > 0;
      });

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      for (const rocket of rockets) {
        ctx.strokeStyle = `rgba(${rgb[rocket.color]},0.75)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(rocket.x, rocket.y + 14);
        ctx.lineTo(rocket.x, rocket.y);
        ctx.stroke();
      }

      for (const spark of sparks) {
        let alpha = spark.life / spark.maxLife;
        if (spark.twinkle) alpha *= 0.4 + 0.6 * Math.abs(Math.sin(spark.life * 18));
        ctx.strokeStyle = `rgba(${rgb[spark.color]},${(alpha * 0.9).toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        // Risco na direção do movimento — o "rastro" da faísca
        ctx.moveTo(spark.x - spark.vx * 0.06, spark.y - spark.vy * 0.06);
        ctx.lineTo(spark.x, spark.y);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    // Para com a aba em segundo plano ou com um detalhe/gaveta aberto por cima
    const root = document.documentElement;
    const sync = () =>
      document.hidden || root.hasAttribute("data-layer-open") ? stop() : start();
    const layerObserver = new MutationObserver(sync);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    sync();
    document.addEventListener("visibilitychange", sync);
    layerObserver.observe(root, { attributes: true, attributeFilter: ["data-layer-open"] });
    return () => {
      stop();
      observer.disconnect();
      layerObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [colors]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
