"use client";

import * as THREE from "three";

/**
 * Texturas desenhadas no navegador (sem baixar imagens): veio de madeira,
 * tábuas do piso, piso frio, granito e tecido. São em tons de cinza claro;
 * a cor do material dá o tom.
 */
export type TexName = "grain" | "planks" | "tiles" | "granite" | "fabric" | "stone";

const CACHE = new Map<TexName, THREE.CanvasTexture>();

// Pseudoaleatório estável (a textura sai igual toda vez)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  return [c, c.getContext("2d")!];
}

function grainStrokes(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: () => number, n: number) {
  for (let i = 0; i < n; i++) {
    const yy = y + r() * h;
    const amp = 1 + r() * 3;
    const freq = 0.01 + r() * 0.03;
    g.strokeStyle = `rgba(60,40,20,${0.05 + r() * 0.1})`;
    g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath();
    for (let xx = x; xx <= x + w; xx += 6) {
      const yv = yy + Math.sin(xx * freq + i) * amp;
      if (xx === x) g.moveTo(xx, yv);
      else g.lineTo(xx, yv);
    }
    g.stroke();
  }
}

function draw(name: TexName): HTMLCanvasElement {
  const r = rng(name.length * 977 + 13);
  if (name === "grain") {
    const [c, g] = canvas(256);
    g.fillStyle = "#e8e2d8";
    g.fillRect(0, 0, 256, 256);
    grainStrokes(g, 0, 0, 256, 256, r, 70);
    // Nós da madeira
    for (let i = 0; i < 2; i++) {
      const cx = r() * 256;
      const cy = r() * 256;
      for (let k = 6; k > 0; k--) {
        g.strokeStyle = `rgba(70,45,20,${0.06 * k})`;
        g.beginPath();
        g.ellipse(cx, cy, 4 + k * 3, 2 + k * 1.2, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    return c;
  }
  if (name === "planks") {
    const [c, g] = canvas(512);
    const rows = 4;
    const ph = 512 / rows;
    for (let i = 0; i < rows; i++) {
      // Cada fileira com emendas em lugares diferentes
      let x = -r() * 300;
      while (x < 512) {
        const len = 220 + r() * 220;
        const shade = 205 + Math.floor(r() * 45);
        g.fillStyle = `rgb(${shade},${shade - 8},${shade - 20})`;
        g.fillRect(x, i * ph, len, ph);
        grainStrokes(g, x, i * ph + 3, len, ph - 6, r, 14);
        g.fillStyle = "rgba(40,25,12,0.55)";
        g.fillRect(x + len - 1.5, i * ph, 1.5, ph);
        x += len;
      }
      g.fillStyle = "rgba(30,18,8,0.6)";
      g.fillRect(0, i * ph + ph - 2, 512, 2);
    }
    return c;
  }
  if (name === "tiles") {
    const [c, g] = canvas(256);
    const n = 2;
    const t = 256 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 225 + Math.floor(r() * 25);
        g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
        g.fillRect(i * t, j * t, t, t);
        for (let k = 0; k < 120; k++) {
          g.fillStyle = `rgba(0,0,0,${r() * 0.04})`;
          g.fillRect(i * t + r() * t, j * t + r() * t, 2, 2);
        }
      }
    g.strokeStyle = "rgba(90,85,78,0.85)";
    g.lineWidth = 4;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * t, 0);
      g.lineTo(i * t, 256);
      g.moveTo(0, i * t);
      g.lineTo(256, i * t);
      g.stroke();
    }
    return c;
  }
  if (name === "granite" || name === "stone") {
    const [c, g] = canvas(256);
    g.fillStyle = name === "stone" ? "#d8d2c6" : "#c9cbcd";
    g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 2600; k++) {
      const v = Math.floor(r() * 255);
      g.fillStyle = `rgba(${v},${v},${v},${0.08 + r() * 0.12})`;
      const s = 1 + r() * 2.5;
      g.fillRect(r() * 256, r() * 256, s, s);
    }
    if (name === "stone") {
      // Pedras assentadas (como as paredes de pedra do pub)
      g.strokeStyle = "rgba(70,62,50,0.55)";
      g.lineWidth = 3;
      for (let row = 0; row < 4; row++) {
        const y = row * 64;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(256, y);
        g.stroke();
        let x = row % 2 ? -40 : 0;
        while (x < 256) {
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x, y + 64);
          g.stroke();
          x += 70 + r() * 50;
        }
      }
    }
    return c;
  }
  // fabric
  const [c, g] = canvas(128);
  g.fillStyle = "#d9d9d9";
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`;
    g.fillRect(0, y, 128, 1);
  }
  for (let x = 0; x < 128; x += 2) {
    g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`;
    g.fillRect(x, 0, 1, 128);
  }
  return c;
}

/** Textura compartilhada (repetição 1×1). */
export function tex(name: TexName): THREE.CanvasTexture {
  let t = CACHE.get(name);
  if (!t) {
    t = new THREE.CanvasTexture(draw(name));
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    CACHE.set(name, t);
  }
  return t;
}

/** Cópia da textura repetida para cobrir w × d metros (1 repetição a cada `tile` m). */
export function texRepeat(name: TexName, w: number, d: number, tile: number): THREE.Texture {
  const t = tex(name).clone();
  t.needsUpdate = true;
  t.repeat.set(Math.max(1, w / tile), Math.max(1, d / tile));
  return t;
}
