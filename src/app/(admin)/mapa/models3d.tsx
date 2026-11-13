"use client";

import React, { useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { variantOf } from "@/floorplan/catalog";
import { STATE_META } from "@/floorplan/day";
import type { PlanElement, TableState } from "@/floorplan/types";
import { GameShelfModel } from "./shelf3d";
import { B, Ball, CYL, Cyl, mat, RB, Ring, type MatOpts } from "./mesh3d";
import { texRepeat, type TexName } from "./textures3d";

export interface BuildCtx {
  wallH: number;
  levelHeight: number;
  state?: TableState;
  selected: boolean;
  onPick?: (e: ThreeEvent<MouseEvent>) => void;
  shelfGames?: Record<string, string[]>;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// ───────────────────────── cores do pub ─────────────────────────

const WOOD = 0xb98a5a; // mesas
const WOOD_LIGHT = 0xc69a6b; // bancos
const WOOD_DARK = 0x6e4526;
const WOOD_MID = 0x8a5a32;
const STONE = 0xe3d9c7;
const PLASTER = 0xeae3d6;
const STEEL = 0xb4b8bc;
const CHROME = { metalness: 0.9, roughness: 0.18 };
const BRASS = 0xc79a2c;
const GRAIN: MatOpts = { map: "grain", roughness: 0.7 };
const FABRIC: MatOpts = { map: "fabric", roughness: 0.95 };

const FLOOR: Record<string, { c: number; tex: TexName; tile: number; rough: number }> = {
  wood: { c: 0x9a6a42, tex: "planks", tile: 2.4, rough: 0.75 },
  tile: { c: 0xdcd6c8, tex: "tiles", tile: 0.6, rough: 0.5 },
  granite: { c: 0xa3a6aa, tex: "granite", tile: 1.6, rough: 0.4 },
};

/** Material com textura repetida pelo tamanho (piso, parede de pedra). */
function useTexturedMat(name: TexName, w: number, d: number, tile: number, color: number, roughness: number) {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness, map: texRepeat(name, w, d, tile) }), [name, w, d, tile, color, roughness]);
  useEffect(
    () => () => {
      m.map?.dispose();
      m.dispose();
    },
    [m],
  );
  return m;
}

// ───────────────────────── formatos livres ─────────────────────────

function polyShape(points: { x: number; y: number }[]): THREE.Shape {
  const sh = new THREE.Shape();
  points.forEach((p, i) => (i ? sh.lineTo(p.x, -p.y) : sh.moveTo(p.x, -p.y)));
  sh.closePath();
  return sh;
}

function usePolyGeo(points: { x: number; y: number }[], h: number) {
  const key = points.map((p) => `${p.x},${p.y}`).join(";");
  const geo = useMemo(
    () => (h > 0 ? new THREE.ExtrudeGeometry(polyShape(points), { depth: h, bevelEnabled: false }) : new THREE.ShapeGeometry(polyShape(points))),
    [key, h],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}

// ───────────────────────── piso e estrutura ─────────────────────────

function Floor({ el }: { el: PlanElement }) {
  const f = FLOOR[variantOf(el) ?? "wood"] ?? FLOOR.wood;
  // No polígono o UV é em metros: repete 1 vez a cada `tile`
  const poly = !!el.points;
  const m = useTexturedMat(f.tex, poly ? 1 : el.w, poly ? 1 : el.d, poly ? f.tile : f.tile, f.c, f.rough);
  useEffect(() => {
    if (poly && m.map) m.map.repeat.set(1 / f.tile, 1 / f.tile);
  }, [poly, m, f.tile]);
  const geo = usePolyGeo(el.points ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], 0);
  if (el.points) return <mesh geometry={geo} material={m} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow />;
  return (
    <group>
      <B s={[el.w, 0.08, el.d]} p={[0, -0.042, 0]} c={0x2a2018} shadow={false} />
      <mesh material={m} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[el.w, el.d]} />
      </mesh>
    </group>
  );
}

function Block({ el, wallH }: { el: PlanElement; wallH: number }) {
  const geo = usePolyGeo(el.points ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], wallH);
  if (el.points) return <mesh geometry={geo} material={mat(0x2a2622, { roughness: 1 })} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow />;
  return (
    <group>
      <B s={[el.w, wallH, el.d]} p={[0, wallH / 2, 0]} c={0x2a2622} o={{ roughness: 1 }} />
      <B s={[el.w + 0.02, 0.04, el.d + 0.02]} p={[0, wallH + 0.02, 0]} c={0x3a342e} />
    </group>
  );
}

/** Parede de pedra (ou pintada), com rodapé e acabamento no topo. */
function Wall({ el, wallH }: { el: PlanElement; wallH: number }) {
  const v = variantOf(el);
  const len = el.w + el.d;
  const h = v === "low" ? 1.0 : wallH;
  const stone = useTexturedMat("stone", len, h, 1.1, v === "dark" ? 0x34312e : STONE, 0.95);
  if (v === "dark")
    return (
      <group>
        <B s={[len, h, el.d]} p={[0, h / 2, 0]} c={0x1e1d22} o={{ roughness: 0.9 }} />
        <B s={[len, 0.04, el.d + 0.02]} p={[0, h + 0.02, 0]} c={0x2c2b30} />
      </group>
    );
  return (
    <group>
      <mesh material={stone} scale={[len, h, el.d]} position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <B s={[len, 0.1, el.d + 0.03]} p={[0, 0.05, 0]} c={WOOD_DARK} />
      <B s={[len + 0.02, 0.04, el.d + 0.04]} p={[0, h + 0.02, 0]} c={v === "low" ? WOOD_MID : PLASTER} />
    </group>
  );
}

function DoorLeaf({ x, w, h, open, side, c = WOOD_MID }: { x: number; w: number; h: number; open: number; side: 1 | -1; c?: number }) {
  // Dobradiça em x; a folha abre girando no eixo vertical
  return (
    <group position={[x, 0, 0]} rotation={[0, side * open, 0]}>
      <RB s={[w, h, 0.04]} p={[(side * -w) / 2, h / 2, 0]} c={c} o={GRAIN} r={0.01} />
      <B s={[w * 0.7, h * 0.35, 0.012]} p={[(side * -w) / 2, h * 0.72, 0.025]} c={0x7a4f2c} />
      <B s={[w * 0.7, h * 0.35, 0.012]} p={[(side * -w) / 2, h * 0.3, 0.025]} c={0x7a4f2c} />
      <Ball s={[0.04, 0.04, 0.04]} p={[side * -w + side * 0.08, h * 0.48, 0.04]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} />
    </group>
  );
}

function Door({ el, wallH }: { el: PlanElement; wallH: number }) {
  const v = variantOf(el);
  const { w, d } = el;
  const H = Math.min(2.1, Math.max(wallH, 1.95));
  const jamb = 0.07;
  const inner = w - jamb * 2;
  return (
    <group>
      <B s={[jamb, H, d + 0.04]} p={[-w / 2 + jamb / 2, H / 2, 0]} c={WOOD_DARK} />
      <B s={[jamb, H, d + 0.04]} p={[w / 2 - jamb / 2, H / 2, 0]} c={WOOD_DARK} />
      <B s={[w, 0.08, d + 0.04]} p={[0, H + 0.04, 0]} c={WOOD_DARK} />
      {wallH > H + 0.08 && <B s={[w, wallH - H - 0.08, d]} p={[0, (wallH + H + 0.08) / 2, 0]} c={STONE} />}
      {v === "double" ? (
        <>
          <DoorLeaf x={-w / 2 + jamb} w={inner / 2} h={H - 0.04} open={-1.1} side={-1} />
          <DoorLeaf x={w / 2 - jamb} w={inner / 2} h={H - 0.04} open={1.1} side={1} />
        </>
      ) : v === "sliding" ? (
        <RB s={[inner * 0.55, H - 0.06, 0.035]} p={[-inner * 0.22, (H - 0.06) / 2, d / 2 + 0.03]} c={WOOD_MID} o={GRAIN} r={0.01} />
      ) : (
        <DoorLeaf x={-w / 2 + jamb} w={inner} h={H - 0.04} open={-1.2} side={-1} />
      )}
    </group>
  );
}

function Arch({ el, wallH }: { el: PlanElement; wallH: number }) {
  const { w, d } = el;
  const t = 0.12;
  const r = w / 2 - t / 2;
  const hj = Math.max(1.2, Math.min(2.0, wallH + 0.3) - r * 0.6);
  return (
    <group>
      <B s={[t, hj, d + 0.06]} p={[-w / 2 + t / 2, hj / 2, 0]} c={0xf2ece0} />
      <B s={[t, hj, d + 0.06]} p={[w / 2 - t / 2, hj / 2, 0]} c={0xf2ece0} />
      <Ring r={r} tube={t / 2} p={[0, hj, 0]} c={0xf2ece0} arc={Math.PI} />
      <Ring r={r} tube={t / 2} p={[0, hj, d / 2 - 0.02]} c={0xf7f2e8} arc={Math.PI} />
    </group>
  );
}

function Window({ el, wallH }: { el: PlanElement; wallH: number }) {
  const { w, d } = el;
  const sill = 0.95;
  const top = Math.min(2.25, Math.max(wallH, 2.0));
  const panes = Math.max(1, Math.round(w / 0.9));
  return (
    <group>
      <B s={[w, sill, d]} p={[0, sill / 2, 0]} c={STONE} />
      <B s={[w + 0.06, 0.05, d + 0.12]} p={[0, sill + 0.025, 0.02]} c={WOOD_DARK} />
      <B s={[w, 0.06, d]} p={[0, top, 0]} c={WOOD_DARK} />
      {Array.from({ length: panes + 1 }, (_, i) => (
        <B key={i} s={[0.05, top - sill, 0.06]} p={[-w / 2 + (w * i) / panes, (top + sill) / 2, 0]} c={WOOD_DARK} />
      ))}
      <B s={[w, top - sill - 0.04, 0.02]} p={[0, (top + sill) / 2, 0]} c={0x9fc4dc} o={{ opacity: 0.32, roughness: 0.05, metalness: 0.1 }} shadow={false} />
      {wallH > top + 0.05 && <B s={[w, wallH - top, d]} p={[0, (wallH + top) / 2, 0]} c={STONE} />}
    </group>
  );
}

/** Cortina com pregas (ripas que avançam e recuam) e varão dourado. */
function Drape({ x, w, h }: { x: number; w: number; h: number }) {
  const n = Math.max(3, Math.round(w / 0.07));
  const sw = w / n;
  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: n }, (_, i) => (
        <B key={i} s={[sw * 1.25, h, 0.035]} p={[-w / 2 + sw * (i + 0.5), h / 2, i % 2 ? 0.025 : -0.015]} c={i % 2 ? 0xa8322f : 0x922a27} o={FABRIC} />
      ))}
    </group>
  );
}

function Curtain({ el, wallH }: { el: PlanElement; wallH: number }) {
  const w = el.w;
  const h = Math.min(2.2, wallH + 0.25);
  const pw = w <= 1 ? w : Math.min(0.75, w * 0.25);
  return (
    <group>
      <Cyl r={0.015} h={w + 0.1} p={[0, h + 0.03, 0]} rot={[0, 0, Math.PI / 2]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} />
      {w <= 1 ? (
        <Drape x={0} w={w} h={h} />
      ) : (
        <>
          <Drape x={-w / 2 + pw / 2} w={pw} h={h} />
          <Drape x={w / 2 - pw / 2} w={pw} h={h} />
          {/* Abraçadeiras */}
          <B s={[pw * 0.9, 0.04, 0.08]} p={[-w / 2 + pw / 2, h * 0.45, 0.01]} c={0xd6b268} />
          <B s={[pw * 0.9, 0.04, 0.08]} p={[w / 2 - pw / 2, h * 0.45, 0.01]} c={0xd6b268} />
        </>
      )}
    </group>
  );
}

function Stair({ el, levelHeight }: { el: PlanElement; levelHeight: number }) {
  if (variantOf(el) === "down") return null;
  const { w, d } = el;
  const n = Math.max(2, el.count ?? 12);
  const run = d / n;
  const rise = levelHeight / n;
  const len = Math.hypot(d, levelHeight);
  const ang = Math.atan2(levelHeight, d);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const h = rise * (i + 1);
        const z = d / 2 - run * (i + 0.5);
        return (
          <group key={i}>
            <B s={[w - 0.08, 0.04, run + 0.03]} p={[0, h - 0.02, z]} c={0x8a5a33} o={GRAIN} />
            <B s={[w - 0.08, rise - 0.04, 0.02]} p={[0, h - rise / 2 - 0.02, z + run / 2]} c={0x5e3d22} />
          </group>
        );
      })}
      {/* Laterais (longarinas) e corrimão */}
      {[-1, 1].map((sx) => (
        <B key={sx} s={[0.05, 0.25, len]} p={[sx * (w / 2 - 0.025), levelHeight / 2 - 0.05, 0]} rot={[ang, 0, 0]} c={WOOD_DARK} />
      ))}
      {/* Corrimão: acompanha a subida (sobe para -z) e se apoia em balaústres */}
      <Cyl r={0.025} h={len} p={[w / 2 - 0.03, levelHeight / 2 + 0.85, 0]} rot={[ang - Math.PI / 2, 0, 0]} c={BRASS} o={{ metalness: 0.6, roughness: 0.35 }} />
      {[-0.42, -0.14, 0.14, 0.42].map((t) => {
        const z = t * d;
        const y = levelHeight / 2 - z * (levelHeight / d);
        return <Cyl key={t} r={0.016} h={0.85} p={[w / 2 - 0.03, y + 0.425, z]} c={BRASS} o={{ metalness: 0.6, roughness: 0.35 }} />;
      })}
    </group>
  );
}

function Pillar({ el, wallH }: { el: PlanElement; wallH: number }) {
  const { w, d } = el;
  const round = variantOf(el) === "round";
  const H = Math.max(wallH, 2.4);
  if (round)
    return (
      <group>
        <Cyl r={Math.min(w, d) / 2 + 0.04} h={0.12} p={[0, 0.06, 0]} c={0x8d8780} seg={24} />
        <Cyl r={Math.min(w, d) / 2} h={H - 0.24} p={[0, H / 2, 0]} c={0xa59f97} o={{ map: "stone" }} seg={24} />
        <Cyl r={Math.min(w, d) / 2 + 0.05} h={0.12} p={[0, H - 0.06, 0]} c={0x8d8780} seg={24} />
      </group>
    );
  return (
    <group>
      <B s={[w + 0.08, 0.12, d + 0.08]} p={[0, 0.06, 0]} c={0x8d8780} />
      <B s={[w, H - 0.24, d]} p={[0, H / 2, 0]} c={0xa59f97} o={{ map: "stone" }} />
      <B s={[w + 0.1, 0.12, d + 0.1]} p={[0, H - 0.06, 0]} c={0x8d8780} />
    </group>
  );
}

function Stage({ el }: { el: PlanElement }) {
  const geo = usePolyGeo(el.points ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }], 0.3);
  if (el.points) return <mesh geometry={geo} material={mat(WOOD_MID, GRAIN)} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow />;
  const { w, d } = el;
  return (
    <group>
      <B s={[w, 0.26, d]} p={[0, 0.13, 0]} c={0x3a2716} />
      <B s={[w + 0.04, 0.04, d + 0.04]} p={[0, 0.28, 0]} c={WOOD_MID} o={GRAIN} />
      <B s={[Math.min(1.2, w * 0.4), 0.14, 0.3]} p={[0, 0.07, d / 2 + 0.15]} c={WOOD_MID} o={GRAIN} />
    </group>
  );
}

// ───────────────────────── mesas e lugares ─────────────────────────

function Table({ el, ctx }: { el: PlanElement; ctx: BuildCtx }) {
  const v = variantOf(el);
  const black = v === "black";
  const high = v === "high";
  const barrel = v === "barrel";
  const topY = high || barrel ? 1.05 : 0.75;
  const color = ctx.state ? STATE_META[ctx.state].color : black ? 0x2a2a2d : WOOD;
  const topO: MatOpts = ctx.selected
    ? { emissive: 0xffffff, emissiveIntensity: 0.22, map: black ? undefined : "grain" }
    : black
      ? { roughness: 0.35 }
      : { ...GRAIN, roughness: ctx.state ? 0.55 : 0.6 };
  const legC = black ? 0x1b1b1d : 0x7a5232;
  const legO: MatOpts = black ? { metalness: 0.6, roughness: 0.35 } : GRAIN;
  const pick = ctx.onPick;
  const glow = ctx.selected && <B s={[el.w + 0.14, 0.02, el.d + 0.14]} p={[0, 0.012, 0]} c={0xffffff} o={{ emissive: 0xffffff, emissiveIntensity: 0.6 }} shadow={false} />;

  if (barrel) {
    // Barril em pé com tampo redondo por cima (mesa alta de bar)
    const r = Math.min(el.w, el.d) / 2;
    const s = (r * 0.78) / 0.5;
    const H = topY - 0.05;
    return (
      <group>
        <mesh geometry={BARREL_GEO} material={mat(0x8a5a2b, GRAIN)} scale={[s, H, s]} castShadow receiveShadow onClick={pick} />
        {[0.1, 0.5, 0.9].map((t) => (
          <Ring key={t} r={(0.42 + Math.sin(t * Math.PI) * 0.08) * s + 0.005} tube={0.012} p={[0, H * t, 0]} rot={[Math.PI / 2, 0, 0]} c={0x3b3d40} o={{ metalness: 0.6, roughness: 0.5 }} />
        ))}
        <mesh geometry={CYL} material={mat(color, topO)} scale={[el.w, 0.05, el.d]} position={[0, topY - 0.025, 0]} castShadow receiveShadow onClick={pick} />
        {glow}
      </group>
    );
  }
  if (el.shape === "round") {
    const r = Math.min(el.w, el.d) / 2;
    return (
      <group>
        <mesh geometry={CYL} material={mat(color, topO)} scale={[el.w, 0.05, el.d]} position={[0, topY, 0]} castShadow receiveShadow onClick={pick} />
        <mesh geometry={CYL} material={mat(black ? 0x1b1b1d : 0x8a5a32, legO)} scale={[el.w * 0.94, 0.03, el.d * 0.94]} position={[0, topY - 0.04, 0]} onClick={pick} />
        <Cyl r={0.05} h={topY - 0.08} p={[0, (topY - 0.08) / 2 + 0.04, 0]} c={legC} o={legO} onClick={pick} />
        {high && <Ring r={r * 0.45} tube={0.012} p={[0, 0.3, 0]} rot={[Math.PI / 2, 0, 0]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} />}
        {/* Pé em cruz */}
        <B s={[r * 1.3, 0.04, 0.07]} p={[0, 0.03, 0]} c={legC} o={legO} />
        <B s={[0.07, 0.04, r * 1.3]} p={[0, 0.03, 0]} c={legC} o={legO} />
        {glow}
      </group>
    );
  }
  // Mesa retangular de cavalete: o eixo comprido vira o x
  const along = el.w >= el.d;
  const L = along ? el.w : el.d;
  const D = along ? el.d : el.w;
  const legH = topY - 0.05;
  if (v === "folding") {
    // Mesa dobrável das salas: tampo fino e pés em X nas pontas
    const spread = D * 0.78;
    const bar = Math.hypot(legH, spread);
    const ang = Math.atan2(spread, legH);
    return (
      <group>
        <RB s={[el.w, 0.035, el.d]} p={[0, topY - 0.018, 0]} c={color} o={topO} r={0.012} onClick={pick} />
        <group rotation={[0, along ? 0 : Math.PI / 2, 0]}>
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * (L / 2 - 0.12), legH / 2, 0]}>
              {[-1, 1].map((k) => (
                <B key={k} s={[0.035, bar, 0.035]} p={[k * 0.022, 0, 0]} rot={[k * ang, 0, 0]} c={legC} o={legO} onClick={pick} />
              ))}
              <Cyl r={0.012} h={0.07} p={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} c={0x3b3d40} o={{ metalness: 0.6 }} seg={8} />
            </group>
          ))}
          <B s={[L - 0.3, 0.03, 0.03]} p={[0, legH - 0.04, 0]} c={legC} o={legO} />
        </group>
        {glow}
      </group>
    );
  }
  return (
    <group>
      <RB s={[el.w, 0.05, el.d]} p={[0, topY - 0.025, 0]} c={color} o={topO} r={0.018} onClick={pick} />
      <group rotation={[0, along ? 0 : Math.PI / 2, 0]}>
        {/* Saia */}
        <B s={[L - 0.2, 0.07, 0.025]} p={[0, topY - 0.09, D / 2 - 0.08]} c={legC} o={legO} onClick={pick} />
        <B s={[L - 0.2, 0.07, 0.025]} p={[0, topY - 0.09, -D / 2 + 0.08]} c={legC} o={legO} onClick={pick} />
        {/* Cavaletes nas pontas */}
        {[-1, 1].map((sx) => (
          <group key={sx} position={[sx * (L / 2 - 0.22), 0, 0]}>
            <B s={[0.08, legH - 0.08, 0.08]} p={[0, (legH - 0.08) / 2 + 0.05, 0]} c={legC} o={legO} onClick={pick} />
            <B s={[0.09, 0.05, D * 0.82]} p={[0, 0.025, 0]} c={legC} o={legO} onClick={pick} />
            <B s={[0.07, 0.05, D * 0.75]} p={[0, legH - 0.05, 0]} c={legC} o={legO} onClick={pick} />
          </group>
        ))}
        <B s={[L - 0.44, 0.06, 0.06]} p={[0, 0.26, 0]} c={legC} o={legO} onClick={pick} />
      </group>
      {glow}
    </group>
  );
}

function Bench({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const back = variantOf(el) === "back";
  const along = w >= d;
  const L = along ? w : d;
  const D = along ? d : w;
  return (
    <group rotation={[0, along ? 0 : Math.PI / 2, 0]}>
      {/* Assento de duas tábuas */}
      <RB s={[L, 0.04, D / 2 - 0.006]} p={[0, 0.44, -D / 4]} c={WOOD_LIGHT} o={GRAIN} r={0.01} />
      <RB s={[L, 0.04, D / 2 - 0.006]} p={[0, 0.44, D / 4]} c={WOOD_LIGHT} o={GRAIN} r={0.01} />
      {[-1, 1].map((sx) => (
        <B key={sx} s={[0.045, 0.42, D * 0.85]} p={[sx * (L / 2 - 0.12), 0.21, 0]} c={0x8a6038} o={GRAIN} />
      ))}
      <B s={[L - 0.24, 0.05, 0.04]} p={[0, 0.15, 0]} c={0x8a6038} o={GRAIN} />
      {back && (
        <>
          {[-1, 1].map((sx) => (
            <B key={sx} s={[0.05, 0.48, 0.045]} p={[sx * (L / 2 - 0.12), 0.68, -D / 2 + 0.03]} c={0x8a6038} o={GRAIN} />
          ))}
          <RB s={[L - 0.04, 0.09, 0.03]} p={[0, 0.86, -D / 2 + 0.035]} c={0xa8794c} o={GRAIN} r={0.01} />
          <RB s={[L - 0.04, 0.07, 0.03]} p={[0, 0.66, -D / 2 + 0.035]} c={0xa8794c} o={GRAIN} r={0.01} />
        </>
      )}
    </group>
  );
}

function Sofa({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const C = 0x4a4d52;
  const n = Math.max(1, Math.round((w - 0.3) / 0.6));
  const cw = (w - 0.3) / n;
  return (
    <group>
      <RB s={[w, 0.24, d]} p={[0, 0.16, 0]} c={0x3a3c40} o={FABRIC} r={0.04} />
      {Array.from({ length: n }, (_, i) => (
        <RB key={`s${i}`} s={[cw - 0.02, 0.13, d - 0.2]} p={[-w / 2 + 0.15 + cw * (i + 0.5), 0.34, 0.06]} c={C} o={FABRIC} r={0.05} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <RB key={`b${i}`} s={[cw - 0.02, 0.42, 0.16]} p={[-w / 2 + 0.15 + cw * (i + 0.5), 0.55, -d / 2 + 0.11]} c={C} o={FABRIC} r={0.06} />
      ))}
      {[-1, 1].map((sx) => (
        <RB key={sx} s={[0.14, 0.42, d]} p={[sx * (w / 2 - 0.07), 0.42, 0]} c={0x404247} o={FABRIC} r={0.05} />
      ))}
    </group>
  );
}

function Pouf({ el }: { el: PlanElement }) {
  const n = Math.max(1, el.count ?? 3);
  const pw = el.w / n;
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const x = -el.w / 2 + pw * (i + 0.5);
        return (
          <group key={i}>
            <RB s={[pw - 0.05, 0.36, el.d]} p={[x, 0.18, 0]} c={0x3f4247} o={FABRIC} r={0.06} />
            <RB s={[pw - 0.07, 0.08, el.d - 0.03]} p={[x, 0.38, 0]} c={0xe6d9c8} o={FABRIC} r={0.035} />
            <Ball s={[0.03, 0.015, 0.03]} p={[x, 0.425, 0]} c={0xcfc0aa} />
          </group>
        );
      })}
    </group>
  );
}

function Chair({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const v = variantOf(el);
  if (v === "stool")
    return (
      <group>
        <Cyl r={Math.min(w, d) / 2} h={0.05} p={[0, 0.75, 0]} c={0xa8794c} o={GRAIN} seg={20} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          const rr = Math.min(w, d) / 2 - 0.04;
          return <Cyl key={i} r={0.016} h={0.74} p={[Math.cos(a) * rr, 0.37, Math.sin(a) * rr]} c={0x3a2412} seg={8} />;
        })}
        <Ring r={Math.min(w, d) / 2 - 0.05} tube={0.012} p={[0, 0.28, 0]} rot={[Math.PI / 2, 0, 0]} c={0x3a2412} />
      </group>
    );
  if (v === "armchair")
    return (
      <group>
        <RB s={[w, 0.3, d]} p={[0, 0.2, 0]} c={0x5a2f29} o={FABRIC} r={0.05} />
        <RB s={[w - 0.22, 0.12, d - 0.2]} p={[0, 0.41, 0.05]} c={0x6a3b33} o={FABRIC} r={0.05} />
        <RB s={[w, 0.55, 0.18]} p={[0, 0.6, -d / 2 + 0.09]} c={0x55302a} o={FABRIC} r={0.07} />
        {[-1, 1].map((sx) => (
          <RB key={sx} s={[0.13, 0.3, d]} p={[sx * (w / 2 - 0.065), 0.5, 0]} c={0x55302a} o={FABRIC} r={0.05} />
        ))}
        {[-1, 1].map((sx) => [-1, 1].map((sz) => <Cyl key={`${sx}${sz}`} r={0.025} h={0.06} p={[sx * (w / 2 - 0.08), 0.03, sz * (d / 2 - 0.08)]} c={WOOD_DARK} seg={8} />))}
      </group>
    );
  return (
    <group>
      <RB s={[w, 0.04, d]} p={[0, 0.46, 0]} c={0xa8794c} o={GRAIN} r={0.01} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <B key={`${sx}${sz}`} s={[0.035, 0.44, 0.035]} p={[sx * (w / 2 - 0.04), 0.22, sz * (d / 2 - 0.04)]} c={0x7a5532} o={GRAIN} />),
      )}
      {[-1, 1].map((sx) => (
        <B key={sx} s={[0.035, 0.48, 0.035]} p={[sx * (w / 2 - 0.04), 0.72, -d / 2 + 0.04]} c={0x7a5532} o={GRAIN} />
      ))}
      <RB s={[w - 0.02, 0.1, 0.025]} p={[0, 0.9, -d / 2 + 0.04]} c={0x8a6038} o={GRAIN} r={0.008} />
      <B s={[w - 0.08, 0.05, 0.02]} p={[0, 0.7, -d / 2 + 0.04]} c={0x8a6038} o={GRAIN} />
    </group>
  );
}

// ───────────────────────── móveis ─────────────────────────

const BOOK_COLORS = [0x8a1f1f, 0x2e5a8a, 0x2f6b3f, 0xc49a2c, 0x5a2f6b, 0xd8692a, 0xe9e4d8, 0x2a2f3a];

/** Fileira de livros/caixas em pé numa prateleira (decoração). */
function Books({ x0, x1, y, d, seed }: { x0: number; x1: number; y: number; d: number; seed: number }) {
  const out: React.ReactNode[] = [];
  let x = x0 + 0.01;
  let i = seed;
  while (x < x1 - 0.06) {
    const bw = 0.035 + ((i * 37) % 5) * 0.008;
    const bh = 0.2 + ((i * 53) % 7) * 0.015;
    out.push(<B key={i} s={[bw, bh, d]} p={[x + bw / 2, y + bh / 2, 0]} c={BOOK_COLORS[i % BOOK_COLORS.length]} o={{ roughness: 0.7 }} shadow={false} />);
    x += bw + 0.004;
    i++;
    if (i % 9 === 0) x += 0.08;
  }
  return <>{out}</>;
}

function Shelf({ el }: { el: PlanElement }) {
  const v = variantOf(el);
  const black = v === "black";
  const C = black ? 0x232020 : v === "cubes" ? 0x9a6a3c : 0x8f6236;
  const H = v === "cubes" ? 1.75 : black ? 1.85 : 2.05;
  const t = 0.035;
  const W = el.w;
  const D = el.d;
  const base = v === "doors" ? 1.0 : 0.08;
  const n = v === "cubes" ? 4 : 3;
  const shelfYs = Array.from({ length: n + 1 }, (_, i) => base + ((H - base - 0.06) * i) / n);
  return (
    <group>
      <B s={[W, H, 0.015]} p={[0, H / 2, -D / 2 + 0.008]} c={black ? 0x1a1818 : 0x6e4526} />
      <B s={[t, H, D]} p={[-W / 2 + t / 2, H / 2, 0]} c={C} o={black ? undefined : GRAIN} />
      <B s={[t, H, D]} p={[W / 2 - t / 2, H / 2, 0]} c={C} o={black ? undefined : GRAIN} />
      <B s={[W + 0.03, 0.05, D + 0.02]} p={[0, H - 0.025, 0]} c={black ? 0x2c2828 : WOOD_MID} />
      {shelfYs.map((y, i) => (
        <group key={i}>
          <B s={[W - t * 2, t, D - 0.02]} p={[0, y, 0]} c={C} o={black ? undefined : GRAIN} />
          {i < n && <Books x0={-W / 2 + t} x1={W / 2 - t} y={y + t / 2} d={D - 0.12} seed={i * 7 + Math.round(W * 10)} />}
        </group>
      ))}
      {v === "doors" &&
        [-1, 1].map((sx) => (
          <group key={sx}>
            <RB s={[W / 2 - 0.03, base - 0.1, 0.03]} p={[sx * (W / 4), (base - 0.1) / 2 + 0.05, D / 2]} c={0x7a5230} o={GRAIN} r={0.008} />
            <Ball s={[0.035, 0.035, 0.035]} p={[sx * 0.06, base / 2, D / 2 + 0.025]} c={0xc49a6c} />
          </group>
        ))}
    </group>
  );
}

function Cabinet({ el }: { el: PlanElement }) {
  const { w, d } = el;
  if (variantOf(el) === "stack") {
    const boxes = [
      [w, 0.42, d, 0, 0x9c7a52],
      [w * 0.9, 0.38, d * 0.95, 0.03, 0xb08a5a],
      [w * 0.8, 0.32, d * 0.9, -0.02, 0x8d6e4a],
    ] as const;
    let y = 0;
    return (
      <group>
        {boxes.map(([bw, bh, bd, ox, c], i) => {
          const el2 = <RB key={i} s={[bw, bh, bd]} p={[ox, y + bh / 2, 0]} c={c} r={0.01} />;
          y += bh;
          return el2;
        })}
      </group>
    );
  }
  return (
    <group>
      <RB s={[w, 0.9, d]} p={[0, 0.47, 0]} c={0x7a5230} o={GRAIN} r={0.012} />
      <B s={[w + 0.03, 0.04, d + 0.03]} p={[0, 0.94, 0]} c={WOOD_DARK} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B s={[w / 2 - 0.05, 0.62, 0.012]} p={[sx * (w / 4), 0.42, d / 2 + 0.006]} c={0x8a5a32} o={GRAIN} />
          <Ball s={[0.03, 0.03, 0.03]} p={[sx * 0.05, 0.5, d / 2 + 0.02]} c={0xc49a6c} />
        </group>
      ))}
      <B s={[w - 0.06, 0.12, 0.012]} p={[0, 0.82, d / 2 + 0.006]} c={0x8a5a32} />
    </group>
  );
}

function Bottle({ x, y, z, c }: { x: number; y: number; z: number; c: number }) {
  const o = { roughness: 0.15, metalness: 0.1 };
  return (
    <group position={[x, y, z]}>
      <Cyl r={0.035} h={0.2} p={[0, 0.1, 0]} c={c} o={o} seg={10} />
      <Cyl r={0.013} r2={0.03} h={0.05} p={[0, 0.225, 0]} c={c} o={o} seg={8} />
      <Cyl r={0.012} h={0.05} p={[0, 0.275, 0]} c={c} o={o} seg={8} />
      <B s={[0.05, 0.06, 0.002]} p={[0, 0.09, 0.035]} c={0xf1e6c8} shadow={false} />
    </group>
  );
}

function Counter({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const v = variantOf(el);
  if (v === "bar") {
    const n = Math.max(1, Math.floor(w / 0.12));
    const colors = [0x7a4b16, 0x2f5d2f, 0xd8c27a, 0x8a1f1f, 0x3a5f7a];
    return (
      <group>
        <RB s={[w, 0.95, d]} p={[0, 0.475, 0]} c={0x4a301c} o={GRAIN} r={0.01} />
        {[1.0, 1.45, 1.9].map((y) => (
          <B key={y} s={[w, 0.035, d]} p={[0, y, 0]} c={WOOD_MID} o={GRAIN} />
        ))}
        <B s={[w, 1.0, 0.02]} p={[0, 1.45, -d / 2 + 0.01]} c={0x2a1b10} />
        {[1.02, 1.47].map((y, j) =>
          Array.from({ length: n }, (_, i) => <Bottle key={`${j}-${i}`} x={-w / 2 + 0.06 + i * 0.12} y={y + 0.018} z={0} c={colors[(i + j) % colors.length]} />),
        )}
      </group>
    );
  }
  return (
    <group>
      <B s={[w, 1.0, d - 0.04]} p={[0, 0.5, -0.02]} c={0x5a3d24} o={GRAIN} />
      {/* Almofadas (painéis) na frente */}
      {range(Math.max(1, Math.round(w / 0.7))).map((i, _, arr) => (
        <B key={i} s={[w / arr.length - 0.08, 0.6, 0.015]} p={[-w / 2 + (w / arr.length) * (i + 0.5), 0.52, d / 2 - 0.02]} c={0x6e4a2a} o={GRAIN} />
      ))}
      <RB s={[w + 0.06, 0.05, d + 0.1]} p={[0, 1.04, 0.03]} c={0x3e2716} o={{ ...GRAIN, roughness: 0.35 }} r={0.015} />
      <Cyl r={0.02} h={w - 0.1} p={[0, 0.2, d / 2 + 0.1]} rot={[0, 0, Math.PI / 2]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} />
      {v === "register" && (
        <group>
          <RB s={[0.34, 0.1, 0.3]} p={[0, 1.12, 0]} c={0x1b1b1d} r={0.015} />
          <RB s={[0.28, 0.2, 0.02]} p={[0, 1.27, -0.08]} rot={[-0.3, 0, 0]} c={0x1b1b1d} r={0.008} />
          <B s={[0.24, 0.15, 0.005]} p={[0, 1.27, -0.068]} rot={[-0.3, 0, 0]} c={0x3d74e0} o={{ emissive: 0x1f49a8, emissiveIntensity: 0.6 }} shadow={false} />
        </group>
      )}
    </group>
  );
}

function Steel({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const v = variantOf(el);
  const o = { metalness: 0.55, roughness: 0.32 };
  return (
    <group>
      <B s={[w - 0.02, 0.84, d - 0.03]} p={[0, 0.42, -0.015]} c={0x9a9da2} o={o} />
      {range(Math.max(1, Math.round(w / 0.6))).map((i, _, arr) => (
        <B key={i} s={[w / arr.length - 0.03, 0.7, 0.01]} p={[-w / 2 + (w / arr.length) * (i + 0.5), 0.42, d / 2 - 0.02]} c={STEEL} o={o} />
      ))}
      <B s={[w, 0.04, d]} p={[0, 0.88, 0]} c={0xc4c8cc} o={CHROME} />
      {v === "sink" && (
        <group>
          <B s={Math.max(w, d) === w ? [w * 0.6, 0.02, d * 0.6] : [w * 0.6, 0.02, d * 0.6]} p={[0, 0.895, 0]} c={0x4a4d52} o={o} shadow={false} />
          <Cyl r={0.015} h={0.3} p={[0, 1.04, -d / 2 + 0.08]} c={0xd0d4d8} o={CHROME} seg={10} />
          <Cyl r={0.012} h={0.14} p={[0, 1.18, -d / 2 + 0.14]} rot={[Math.PI / 2, 0, 0]} c={0xd0d4d8} o={CHROME} seg={10} />
        </group>
      )}
      {v === "tap" && (
        <group>
          <B s={[Math.min(w, d) * 0.9, 0.02, 0.18]} p={[0, 0.91, 0.05]} c={0x2a2b2e} o={o} />
          <Cyl r={0.05} h={0.42} p={[0, 1.11, -0.05]} c={0xd0d4d8} o={CHROME} seg={16} />
          {[-0.07, 0, 0.07].map((x) => (
            <group key={x}>
              <Cyl r={0.012} h={0.09} p={[x, 1.24, 0.0]} rot={[Math.PI / 2, 0, 0]} c={0xd0d4d8} o={CHROME} seg={8} />
              <Cyl r={0.012} h={0.12} p={[x, 1.32, 0.04]} c={0x1b1b1d} seg={8} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

function Fridge({ el }: { el: PlanElement }) {
  const { w, d } = el;
  if (variantOf(el) === "glass") {
    // Expositor: corpo preto, porta de vidro, prateleiras com garrafas e luz no topo
    const H = 1.9;
    const cols = [0x2f6b3f, 0x8a4a1c, 0xc9b26a, 0x8a1f1f, 0x2e5a8a];
    const per = Math.max(2, Math.floor((w - 0.1) / 0.09));
    return (
      <group>
        {/* Caixa aberta na frente: fundo, laterais, base e topo com o letreiro */}
        <B s={[w, H, 0.04]} p={[0, H / 2, -d / 2 + 0.02]} c={0xf3f6f8} o={{ emissive: 0xdfe9ff, emissiveIntensity: 0.35 }} />
        {[-1, 1].map((sx) => (
          <B key={sx} s={[0.04, H, d]} p={[sx * (w / 2 - 0.02), H / 2, 0]} c={0x1d1e22} o={{ roughness: 0.4 }} />
        ))}
        <B s={[w, 0.08, d]} p={[0, 0.04, 0]} c={0x1d1e22} o={{ roughness: 0.4 }} />
        <B s={[w, 0.22, d]} p={[0, H - 0.11, 0]} c={0x1d1e22} o={{ roughness: 0.4 }} />
        <B s={[w - 0.06, 0.15, 0.01]} p={[0, H - 0.11, d / 2 + 0.002]} c={0xb8322c} o={{ emissive: 0xb8322c, emissiveIntensity: 0.5 }} shadow={false} />
        {[0.42, 0.82, 1.22].map((y, i) => (
          <group key={y}>
            <B s={[w - 0.1, 0.012, d - 0.12]} p={[0, y, -0.02]} c={0x9aa0a7} o={CHROME} shadow={false} />
            {range(per).map((k) => (
              <Bottle key={k} x={-w / 2 + 0.08 + k * ((w - 0.16) / Math.max(1, per - 1))} y={y + 0.006} z={0.02} c={cols[(k + i) % cols.length]} />
            ))}
          </group>
        ))}
        <B s={[w - 0.04, H - 0.3, 0.015]} p={[0, (H - 0.3) / 2 + 0.06, d / 2 + 0.005]} c={0xbfe3f5} o={{ opacity: 0.22, roughness: 0.05, metalness: 0.1 }} shadow={false} />
        <Cyl r={0.012} h={0.6} p={[w / 2 - 0.06, H * 0.5, d / 2 + 0.035]} c={0x8a8d90} o={CHROME} seg={8} />
      </group>
    );
  }
  const steel = variantOf(el) === "steel";
  const H = steel ? 2.0 : 1.85;
  const c = steel ? 0xc4c8cc : 0xf0f0ec;
  const o = steel ? { metalness: 0.55, roughness: 0.28 } : { roughness: 0.35 };
  return (
    <group>
      <RB s={[w, H, d]} p={[0, H / 2, 0]} c={c} o={o} r={0.03} />
      <B s={[w - 0.02, 0.012, 0.01]} p={[0, H * 0.68, d / 2 + 0.001]} c={0x6a6d70} shadow={false} />
      <Cyl r={0.012} h={0.35} p={[w / 2 - 0.08, H * 0.82, d / 2 + 0.03]} c={0x8a8d90} o={CHROME} seg={8} />
      <Cyl r={0.012} h={0.5} p={[w / 2 - 0.08, H * 0.45, d / 2 + 0.03]} c={0x8a8d90} o={CHROME} seg={8} />
      {[-1, 1].map((sx) => (
        <B key={sx} s={[0.06, 0.04, d - 0.1]} p={[sx * (w / 2 - 0.08), 0.02, 0]} c={0x3a3c40} />
      ))}
    </group>
  );
}

function Freezer({ el }: { el: PlanElement }) {
  const { w, d } = el;
  return (
    <group>
      <RB s={[w, 0.8, d]} p={[0, 0.4, 0]} c={0xf0f0ec} o={{ roughness: 0.35 }} r={0.03} />
      <RB s={[w + 0.01, 0.06, d + 0.01]} p={[0, 0.83, 0]} c={0xe4e4e0} r={0.02} />
      <B s={[w * 0.4, 0.03, 0.04]} p={[0, 0.78, d / 2 + 0.02]} c={0x8a8d90} o={CHROME} />
    </group>
  );
}

function Sink({ el }: { el: PlanElement }) {
  const { w, d } = el;
  return (
    <group>
      <Cyl r={0.07} r2={0.1} h={0.7} p={[0, 0.35, -d * 0.1]} c={0xf4f4f2} o={{ roughness: 0.3 }} seg={16} />
      <RB s={[w, 0.16, d]} p={[0, 0.78, 0]} c={0xf4f4f2} o={{ roughness: 0.25 }} r={0.05} />
      <Cyl r={0.012} h={0.18} p={[0, 0.94, -d / 2 + 0.06]} c={0xd0d4d8} o={CHROME} seg={8} />
    </group>
  );
}

function Toilet({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const white = { roughness: 0.25 };
  return (
    <group>
      <mesh geometry={CYL} material={mat(0xf4f4f2, white)} scale={[w * 0.85, 0.38, d * 0.62]} position={[0, 0.19, d * 0.12]} castShadow />
      <Ring r={Math.min(w, d * 0.62) * 0.4} tube={0.03} p={[0, 0.4, d * 0.12]} rot={[Math.PI / 2, 0, 0]} c={0xffffff} o={white} />
      <RB s={[w, 0.38, 0.17]} p={[0, 0.58, -d / 2 + 0.085]} c={0xf4f4f2} o={white} r={0.03} />
      <RB s={[w + 0.02, 0.03, 0.19]} p={[0, 0.78, -d / 2 + 0.085]} c={0xeeeeea} o={white} r={0.012} />
    </group>
  );
}

function Elevator({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const o = { metalness: 0.5, roughness: 0.35 };
  return (
    <group>
      <B s={[w, 2.25, d]} p={[0, 1.125, 0]} c={0x6f7276} o={o} />
      <B s={[w * 0.8, 2.0, 0.02]} p={[0, 1.0, d / 2 + 0.01]} c={0xa9adb2} o={CHROME} />
      <B s={[0.01, 2.0, 0.025]} p={[0, 1.0, d / 2 + 0.012]} c={0x3b3d40} shadow={false} />
      <B s={[w * 0.9, 0.12, 0.03]} p={[0, 2.12, d / 2 + 0.01]} c={0x3b3d40} />
      <B s={[0.06, 0.14, 0.02]} p={[w / 2 - 0.05, 1.2, d / 2 + 0.02]} c={0x1b1b1d} />
    </group>
  );
}

/** Barril de madeira com barriga e três aros de ferro. */
const BARREL_GEO = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(0.42 + Math.sin(t * Math.PI) * 0.08, t));
  }
  return new THREE.LatheGeometry(pts, 24);
})();

function Barrel({ el }: { el: PlanElement }) {
  const r = Math.min(el.w, el.d) / 2;
  const s = r / 0.5;
  const H = 0.95;
  return (
    <group>
      <mesh geometry={BARREL_GEO} material={mat(0x8a5a2b, GRAIN)} scale={[s, H, s]} castShadow receiveShadow />
      <mesh geometry={CYL} material={mat(0x6e4526, GRAIN)} scale={[r * 1.68, 0.02, r * 1.68]} position={[0, H - 0.01, 0]} />
      {[0.1, 0.5, 0.9].map((t) => (
        <Ring key={t} r={(0.42 + Math.sin(t * Math.PI) * 0.08) * s + 0.005} tube={0.012} p={[0, H * t, 0]} rot={[Math.PI / 2, 0, 0]} c={0x3b3d40} o={{ metalness: 0.6, roughness: 0.5 }} />
      ))}
    </group>
  );
}

function Keg({ el }: { el: PlanElement }) {
  const r = Math.min(el.w, el.d) / 2;
  const o = { metalness: 0.75, roughness: 0.28 };
  return (
    <group>
      <Cyl r={r} h={0.56} p={[0, 0.3, 0]} c={STEEL} o={o} seg={24} />
      {[0.03, 0.57].map((y) => (
        <Ring key={y} r={r - 0.01} tube={0.018} p={[0, y, 0]} rot={[Math.PI / 2, 0, 0]} c={0xc8ccd0} o={o} />
      ))}
      <Cyl r={0.04} h={0.05} p={[0, 0.6, 0]} c={0x1b1b1d} seg={10} />
    </group>
  );
}

function Plant({ el }: { el: PlanElement }) {
  const r = Math.min(el.w, el.d) / 2;
  const leaves = [
    [0, 0.95, 0, 0.36],
    [0.16, 0.8, 0.08, 0.26],
    [-0.15, 0.82, -0.06, 0.27],
    [0.05, 1.2, -0.1, 0.24],
    [-0.06, 1.15, 0.13, 0.22],
  ];
  return (
    <group>
      <Cyl r={r * 0.8} r2={r * 0.62} h={0.5} p={[0, 0.25, 0]} c={0xa8673f} seg={14} />
      <Ring r={r * 0.8} tube={0.025} p={[0, 0.5, 0]} rot={[Math.PI / 2, 0, 0]} c={0x9a5a35} />
      <Cyl r={r * 0.76} h={0.02} p={[0, 0.49, 0]} c={0x3a2a1a} seg={14} />
      {leaves.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x * r * 2, y, z * r * 2]} material={mat(i % 2 ? 0x4f7d3a : 0x5f8f46, { roughness: 0.8 })} castShadow>
          <icosahedronGeometry args={[s * (r / 0.3) * 0.55, 1]} />
        </mesh>
      ))}
    </group>
  );
}

// ───────────────────────── detalhes de parede e teto ─────────────────────────

/** Coisas do teto: só aparecem com as paredes altas (na vista em corte cobririam as mesas). */
const CEILING = new Set(["pendant", "fan", "projector", "chandelier"]);

const IRON: MatOpts = { metalness: 0.65, roughness: 0.45 };
// Pouco metálico: a cena não tem reflexo de ambiente, e metal puro fica preto
const ARMOR: MatOpts = { metalness: 0.4, roughness: 0.32 };

/** Contorno do meeple (o bonequinho dos jogos de tabuleiro), 100 unidades de largura, y para cima. */
const MEEPLE_GEO = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 48);
  s.bezierCurveTo(14, 48, 16, 30, 12, 22);
  s.lineTo(46, 10);
  s.bezierCurveTo(52, 6, 50, -6, 42, -6);
  s.lineTo(22, -6);
  s.lineTo(40, -44);
  s.lineTo(10, -44);
  s.lineTo(0, -26);
  s.lineTo(-10, -44);
  s.lineTo(-40, -44);
  s.lineTo(-22, -6);
  s.lineTo(-42, -6);
  s.bezierCurveTo(-50, -6, -52, 6, -46, 10);
  s.lineTo(-12, 22);
  s.bezierCurveTo(-16, 30, -14, 48, 0, 48);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 2.5, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 44, -0.5);
  return g;
})();

/** Pontos do dado numa face (de -1 a 1). */
const PIPS: Record<number, [number, number][]> = {
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
};

function Deco({ el, v, wallH }: { el: PlanElement; v?: string; wallH: number }) {
  const { w, d } = el;
  if (CEILING.has(v ?? "") && wallH < 2.4) return null;
  const top = Math.min(wallH - 0.08, 2.3);
  const bot = Math.max(0.35, top - 1.4);
  const hh = top - bot;
  const t = Math.max(0.04, d);
  const GLOW = { emissive: 0x1f49a8, emissiveIntensity: 0.9, roughness: 0.3 };
  switch (v) {
    case "glass-blue":
    case "glass-green": {
      const blue = v === "glass-blue";
      return (
        <group>
          <B s={[w, hh, t * 0.6]} p={[0, bot + hh / 2, 0]} c={blue ? 0x2f66d0 : 0xc8d84a} o={blue ? GLOW : { emissive: 0x8fa22a, emissiveIntensity: 0.9, roughness: 0.3 }} />
          {blue && <B s={[w * 0.45, hh * 0.3, t * 0.7]} p={[0, bot + hh * 0.55, 0]} c={0xc0392b} o={{ emissive: 0x7a1f17, emissiveIntensity: 0.7 }} />}
          {/* Moldura de chumbo e arco no alto */}
          <B s={[w + 0.06, 0.05, t + 0.02]} p={[0, bot, 0]} c={0x3b2a1a} />
          <B s={[0.04, hh, t + 0.02]} p={[-w / 2, bot + hh / 2, 0]} c={0x3b2a1a} />
          <B s={[0.04, hh, t + 0.02]} p={[w / 2, bot + hh / 2, 0]} c={0x3b2a1a} />
          <Ring r={w / 2} tube={0.025} p={[0, bot + hh, 0]} c={0x3b2a1a} arc={Math.PI} />
        </group>
      );
    }
    case "logo":
    case "logo-dark": {
      const lh = Math.min(hh, 0.8);
      const fullH = Math.min(wallH, 2.4) - 0.02;
      return (
        <group>
          {v === "logo-dark" && <B s={[w, fullH, t]} p={[0, fullH / 2, 0]} c={0x141316} />}
          <RB s={[w * (v === "logo-dark" ? 0.45 : 1), lh, t + 0.02]} p={[0, bot + hh - lh / 2, 0]} c={0xd6b268} o={{ emissive: 0x8a6d1f, emissiveIntensity: 0.8, metalness: 0.4 }} r={0.02} />
        </group>
      );
    }
    case "mirror":
      return (
        <group>
          <RB s={[w + 0.06, Math.min(hh, 0.9) + 0.06, t]} p={[0, bot + hh - Math.min(hh, 0.9) / 2, 0]} c={WOOD_DARK} r={0.015} />
          <B s={[w, Math.min(hh, 0.9), 0.01]} p={[0, bot + hh - Math.min(hh, 0.9) / 2, t / 2 + 0.002]} c={0xc9d6dc} o={{ metalness: 0.9, roughness: 0.05 }} />
        </group>
      );
    case "board":
    case "map":
    case "frame": {
      const fh = v === "map" ? Math.min(hh, 1.2) : v === "board" ? Math.min(hh, 0.8) : hh;
      const inner = v === "board" ? 0x16241a : v === "map" ? 0xd9cba4 : 0x6a7a52;
      return (
        <group>
          <RB s={[w, fh, t]} p={[0, bot + hh - fh / 2, 0]} c={v === "frame" ? 0xa8794c : WOOD_DARK} o={GRAIN} r={0.01} />
          <B s={[w - 0.08, fh - 0.08, 0.008]} p={[0, bot + hh - fh / 2, t / 2 + 0.002]} c={inner} o={{ roughness: 0.9 }} />
        </group>
      );
    }
    case "banner": {
      const n = Math.max(1, Math.round(w / 1.1));
      const bh = Math.min(hh, 1.2);
      return (
        <group>
          <Cyl r={0.012} h={w} p={[0, top, 0.04]} rot={[0, 0, Math.PI / 2]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} />
          {Array.from({ length: n }, (_, i) => {
            const x = -w / 2 + (w / n) * (i + 0.5);
            return (
              <group key={i}>
                <B s={[0.55, bh, 0.015]} p={[x, top - bh / 2, 0.05]} c={i % 2 ? 0x7a1f1f : 0x1f3a7a} o={FABRIC} />
                <B s={[0.3, 0.3, 0.016]} p={[x, top - bh - 0.08, 0.05]} rot={[0, 0, Math.PI / 4]} c={i % 2 ? 0x7a1f1f : 0x1f3a7a} o={FABRIC} />
                <Ball s={[0.08, 0.08, 0.02]} p={[x, top - bh * 0.45, 0.06]} c={0xd6b268} />
              </group>
            );
          })}
        </group>
      );
    }
    case "shield":
      return (
        <group>
          <RB s={[Math.max(w, 0.4), 0.5, 0.05]} p={[0, top - 0.5, 0.02]} c={0x9a9ea3} o={{ metalness: 0.7, roughness: 0.4 }} r={0.06} />
          <B s={[0.06, 0.4, 0.06]} p={[0, top - 0.5, 0.05]} c={0xc0392b} />
          <B s={[0.3, 0.06, 0.06]} p={[0, top - 0.45, 0.05]} c={0xc0392b} />
        </group>
      );
    case "weapons":
      return (
        <group>
          {[-1, 1].map((s) => (
            <group key={s} position={[0, top - 0.45, 0.03]} rotation={[0, 0, s * 0.7]}>
              <B s={[0.03, Math.min(hh, 0.8), 0.01]} p={[0, 0, 0]} c={0xc8ccd0} o={CHROME} />
              <B s={[0.14, 0.025, 0.02]} p={[0, -0.25, 0]} c={BRASS} />
            </group>
          ))}
        </group>
      );
    case "arches": {
      const n = Math.max(1, el.count ?? 2);
      const aw = Math.min(1.0, (w / n) * 0.75);
      const ah = Math.min(hh + 0.3, 1.8);
      return (
        <group>
          {Array.from({ length: n }, (_, i) => {
            const x0 = -w / 2 + (w * (i + 0.5)) / n;
            return (
              <group key={i}>
                <B s={[0.07, ah, 0.03]} p={[x0 - aw / 2, ah / 2 + 0.1, 0]} c={0xf6f1e6} />
                <B s={[0.07, ah, 0.03]} p={[x0 + aw / 2, ah / 2 + 0.1, 0]} c={0xf6f1e6} />
                <Ring r={aw / 2} tube={0.035} p={[x0, ah + 0.1, 0]} c={0xf6f1e6} arc={Math.PI} />
              </group>
            );
          })}
        </group>
      );
    }
    case "sconce":
      return (
        <group>
          <B s={[0.06, 0.06, 0.12]} p={[0, top - 0.35, 0.06]} c={0x3a2a1a} />
          <Cyl r={0.06} r2={0.04} h={0.16} p={[0, top - 0.25, 0.12]} c={0xfff0c8} o={{ emissive: 0xffd98a, emissiveIntensity: 1.1 }} seg={12} />
        </group>
      );
    case "pendant":
      return (
        <group>
          <Cyl r={0.004} h={Math.max(0.2, wallH - 2.35)} p={[0, 2.35 + Math.max(0.2, wallH - 2.35) / 2, 0]} c={0x1b1b1d} seg={6} shadow={false} />
          <mesh position={[0, 2.25, 0]} material={mat(0x6e5a3a, { metalness: 0.5, roughness: 0.4 })}>
            <coneGeometry args={[0.26, 0.28, 18, 1, true]} />
          </mesh>
          <Ball s={[0.11, 0.11, 0.11]} p={[0, 2.13, 0]} c={0xfff2cc} o={{ emissive: 0xffd98a, emissiveIntensity: 1.4 }} shadow={false} />
        </group>
      );
    case "projector":
      return (
        <group>
          <RB s={[w, 0.13, d]} p={[0, 2.45, 0]} c={0xe9e9e6} r={0.03} />
          <Cyl r={0.04} h={0.05} p={[0, 2.45, d / 2 + 0.02]} rot={[Math.PI / 2, 0, 0]} c={0x1b1b1d} seg={12} />
          <Cyl r={0.015} h={0.3} p={[0, 2.67, 0]} c={0x999999} seg={8} />
        </group>
      );
    case "lattice":
      return (
        <group>
          {Array.from({ length: 6 }, (_, i) => (
            <B key={`v${i}`} s={[0.035, 2.1, t]} p={[-w / 2 + (i * w) / 5, 1.05, 0]} c={0x1c1714} />
          ))}
          {Array.from({ length: 7 }, (_, j) => (
            <B key={`h${j}`} s={[w, 0.035, t]} p={[0, 0.2 + j * 0.3, 0]} c={0x1c1714} />
          ))}
        </group>
      );
    case "rail":
      return (
        <group>
          <Cyl r={0.025} h={w} p={[0, 0.95, 0]} rot={[0, 0, Math.PI / 2]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} />
          {range(Math.max(2, Math.round(w / 0.9) + 1)).map((i, _, a) => (
            <Cyl key={i} r={0.015} h={0.95} p={[-w / 2 + (w * i) / (a.length - 1), 0.475, 0]} c={BRASS} o={{ metalness: 0.7, roughness: 0.3 }} seg={8} />
          ))}
        </group>
      );
    case "extinguisher":
      return (
        <group>
          <Cyl r={0.08} h={0.5} p={[0, 0.3, 0]} c={0xcc2222} o={{ roughness: 0.4 }} seg={14} />
          <Ball s={[0.16, 0.08, 0.16]} p={[0, 0.55, 0]} c={0xcc2222} />
          <B s={[0.12, 0.04, 0.03]} p={[0.03, 0.6, 0]} c={0x1b1b1d} />
        </group>
      );
    case "wallcab":
      return (
        <group>
          <RB s={[w, 0.6, Math.max(d, 0.35)]} p={[0, 1.8, 0]} c={0xe2ddd3} r={0.015} />
          <B s={[0.01, 0.56, 0.01]} p={[0, 1.8, Math.max(d, 0.35) / 2 + 0.003]} c={0x9a958c} shadow={false} />
        </group>
      );
    case "hood":
      return (
        <group>
          <B s={[w + 0.1, 0.12, d + 0.1]} p={[0, 1.95, 0]} c={0x8c9095} o={{ metalness: 0.6, roughness: 0.35 }} />
          <Cyl r={Math.min(w, d) * 0.45} r2={Math.min(w, d) * 0.15} h={0.35} p={[0, 2.2, 0]} c={0x8c9095} o={{ metalness: 0.6, roughness: 0.35 }} seg={4} />
        </group>
      );
    case "tv": {
      const th = Math.min(w * 0.5625, hh);
      const y = Math.min(top - 0.1, 1.6 + th / 2);
      return (
        <group>
          <RB s={[w + 0.04, th + 0.04, 0.05]} p={[0, y, 0.02]} c={0x111214} r={0.01} />
          <B s={[w, th, 0.005]} p={[0, y, 0.047]} c={0x1a2a44} o={{ emissive: 0x24406a, emissiveIntensity: 0.6, roughness: 0.2 }} shadow={false} />
        </group>
      );
    }
    case "speaker": {
      const y = Math.min(top, 2.2) - 0.25;
      return (
        <group>
          <RB s={[w, 0.5, d]} p={[0, y, 0]} c={0x1c1c20} r={0.02} />
          <Cyl r={Math.min(w, 0.5) * 0.3} h={0.01} p={[0, y - 0.08, d / 2 + 0.003]} rot={[Math.PI / 2, 0, 0]} c={0x3a3a40} seg={20} />
          <Cyl r={Math.min(w, 0.5) * 0.14} h={0.01} p={[0, y + 0.14, d / 2 + 0.003]} rot={[Math.PI / 2, 0, 0]} c={0x3a3a40} seg={16} />
        </group>
      );
    }
    case "ac": {
      const y = Math.min(top, 2.3) - 0.15;
      return (
        <group>
          <RB s={[w, 0.3, Math.max(d, 0.2)]} p={[0, y, 0]} c={0xf2f2ee} r={0.05} />
          {[0, 1, 2].map((i) => (
            <B key={i} s={[w * 0.85, 0.008, 0.01]} p={[0, y - 0.1 + i * 0.02, Math.max(d, 0.2) / 2]} c={0xb8b8b4} shadow={false} />
          ))}
        </group>
      );
    }
    case "fan":
      return (
        <group>
          <Cyl r={0.008} h={0.3} p={[0, 2.75, 0]} c={0x1b1b1d} seg={6} shadow={false} />
          <Cyl r={0.09} h={0.12} p={[0, 2.58, 0]} c={BRASS} o={{ metalness: 0.6, roughness: 0.35 }} seg={14} />
          {[0, 1, 2, 3].map((i) => (
            <RB key={i} s={[Math.min(w, d) * 0.46, 0.015, 0.12]} p={[Math.cos((i * Math.PI) / 2) * Math.min(w, d) * 0.27, 2.53, Math.sin((i * Math.PI) / 2) * Math.min(w, d) * 0.27]} rot={[0, (-i * Math.PI) / 2, 0]} c={0x8a5a32} o={GRAIN} r={0.006} />
          ))}
        </group>
      );
    case "clock": {
      const r = Math.min(w, 0.6) / 2;
      const y = Math.min(top - r - 0.05, 2.05);
      return (
        <group position={[0, y, 0]}>
          <Cyl r={r} h={0.05} p={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} c={0x5e3d22} o={GRAIN} seg={32} />
          <Cyl r={r * 0.86} h={0.01} p={[0, 0, 0.028]} rot={[Math.PI / 2, 0, 0]} c={0xefe7d6} seg={32} shadow={false} />
          {range(12).map((i) => (
            <B key={i} s={[0.008, i % 3 ? 0.018 : 0.035, 0.004]} p={[Math.sin((i * Math.PI) / 6) * r * 0.74, Math.cos((i * Math.PI) / 6) * r * 0.74, 0.035]} rot={[0, 0, (-i * Math.PI) / 6]} c={0x1b1b1d} shadow={false} />
          ))}
          <B s={[0.012, r * 0.5, 0.004]} p={[0, r * 0.22, 0.039]} c={0x1b1b1d} shadow={false} />
          <B s={[0.008, r * 0.66, 0.004]} p={[r * 0.24, -r * 0.14, 0.041]} rot={[0, 0, -2.1]} c={0x1b1b1d} shadow={false} />
          <Ball s={[0.025, 0.025, 0.012]} p={[0, 0, 0.042]} c={BRASS} />
        </group>
      );
    }
    case "armor": {
      // Armadura de cavaleiro num pedestal, com espada e escudo
      const s = Math.min(1, Math.min(w, d) / 0.5);
      return (
        <group scale={[s, s, s]}>
          <B s={[0.5, 0.08, 0.4]} p={[0, 0.04, 0]} c={0x5e3d22} o={GRAIN} />
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <Cyl r={0.055} r2={0.045} h={0.78} p={[sx * 0.08, 0.47, 0]} c={0xb4b8bc} o={ARMOR} seg={12} />
              <RB s={[0.1, 0.06, 0.18]} p={[sx * 0.08, 0.11, 0.03]} c={0x9aa0a7} o={ARMOR} r={0.02} />
              <Ball s={[0.15, 0.12, 0.15]} p={[sx * 0.18, 1.42, 0]} c={0xc4c8cc} o={ARMOR} />
              <Cyl r={0.04} r2={0.035} h={0.5} p={[sx * 0.21, 1.15, 0]} c={0xb4b8bc} o={ARMOR} seg={10} />
            </group>
          ))}
          <RB s={[0.34, 0.2, 0.2]} p={[0, 0.92, 0]} c={0x9aa0a7} o={ARMOR} r={0.04} />
          <RB s={[0.36, 0.42, 0.22]} p={[0, 1.24, 0]} c={0xc4c8cc} o={ARMOR} r={0.07} />
          <Cyl r={0.11} h={0.24} p={[0, 1.62, 0]} c={0xb4b8bc} o={ARMOR} seg={16} />
          <Ball s={[0.22, 0.14, 0.22]} p={[0, 1.74, 0]} c={0xc4c8cc} o={ARMOR} />
          <B s={[0.16, 0.02, 0.01]} p={[0, 1.64, 0.11]} c={0x1b1b1d} shadow={false} />
          <B s={[0.03, 0.08, 0.02]} p={[0, 1.86, -0.02]} c={0xb8322c} />
          {/* Espada na mão direita e escudo na esquerda */}
          <B s={[0.035, 0.9, 0.012]} p={[0.27, 0.62, 0.12]} c={0xdfe3e6} o={ARMOR} />
          <B s={[0.16, 0.025, 0.03]} p={[0.27, 1.08, 0.12]} c={BRASS} o={{ metalness: 0.7 }} />
          <RB s={[0.3, 0.42, 0.04]} p={[-0.27, 1.0, 0.14]} c={0x8a1f1f} r={0.05} />
          <B s={[0.05, 0.36, 0.012]} p={[-0.27, 1.0, 0.165]} c={0xe6c56b} shadow={false} />
          <B s={[0.24, 0.05, 0.012]} p={[-0.27, 1.06, 0.165]} c={0xe6c56b} shadow={false} />
        </group>
      );
    }
    case "chandelier": {
      // Roda de ferro com velas, pendurada por correntes
      const r = Math.min(w, d) * 0.42;
      const y = wallH - 0.65;
      return (
        <group position={[0, y, 0]}>
          <Ring r={r} tube={0.018} p={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} c={0x2a2a2c} o={IRON} />
          <Ring r={r * 0.45} tube={0.012} p={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} c={0x2a2a2c} o={IRON} />
          {[0, 1, 2].map((i) => {
            const a = (i * Math.PI * 2) / 3;
            const len = Math.hypot(r, 0.6);
            return <Cyl key={i} r={0.005} h={len} p={[(Math.cos(a) * r) / 2, 0.3, (Math.sin(a) * r) / 2]} rot={[Math.sin(a) * Math.atan2(r, 0.6), 0, -Math.cos(a) * Math.atan2(r, 0.6)]} c={0x2a2a2c} seg={5} shadow={false} />;
          })}
          {range(8).map((i) => {
            const a = (i * Math.PI) / 4;
            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            return (
              <group key={i} position={[x, 0.02, z]}>
                <Cyl r={0.022} h={0.12} p={[0, 0.06, 0]} c={0xf2ead8} seg={10} />
                <Ball s={[0.016, 0.03, 0.016]} p={[0, 0.14, 0]} c={0xffb347} o={{ emissive: 0xffa53a, emissiveIntensity: 1.6 }} shadow={false} />
              </group>
            );
          })}
          <pointLight position={[0, 0.1, 0]} intensity={0.7} distance={4} color={0xffc27a} />
        </group>
      );
    }
    case "easel": {
      // Cavalete de pé com lousa (cardápio do dia)
      const bw = Math.min(w, 0.7);
      const tilt = 0.14;
      return (
        <group>
          {[-1, 1].map((sx) => (
            <B key={sx} s={[0.035, 1.55, 0.035]} p={[sx * bw * 0.4, 0.76, 0.05]} rot={[-tilt, 0, 0]} c={0x7a5232} o={GRAIN} />
          ))}
          <B s={[0.035, 1.5, 0.035]} p={[0, 0.72, -0.15]} rot={[0.28, 0, 0]} c={0x7a5232} o={GRAIN} />
          <group position={[0, 1.02, 0.02]} rotation={[-tilt, 0, 0]}>
            <B s={[bw, 0.72, 0.03]} p={[0, 0, 0.04]} c={0x7a5232} o={GRAIN} />
            <B s={[bw - 0.06, 0.66, 0.01]} p={[0, 0, 0.058]} c={0x15171a} o={{ roughness: 0.95 }} shadow={false} />
            {[0.2, 0.08, -0.02, -0.12, -0.22].map((y, i) => (
              <B key={y} s={[(bw - 0.2) * (i === 0 ? 0.6 : 0.85 - (i % 2) * 0.2), 0.016, 0.002]} p={[0, y, 0.065]} c={i === 0 ? 0xe6c56b : 0xe9e4d8} shadow={false} />
            ))}
          </group>
          <B s={[bw * 0.9, 0.04, 0.08]} p={[0, 0.64, 0.12]} c={0x7a5232} o={GRAIN} />
        </group>
      );
    }
    case "dice": {
      const s = Math.min(w, d, 0.8);
      const pip = s * 0.08;
      const face = (n: number, p: (a: number, b: number) => [number, number, number]) =>
        PIPS[n].map(([a, b], i) => <Ball key={`${n}-${i}`} s={[pip, pip, pip]} p={p(a * s * 0.25, b * s * 0.25)} c={0xb8322c} shadow={false} />);
      return (
        <group rotation={[0, 0.35, 0]}>
          <RB s={[s, s, s]} p={[0, s / 2, 0]} c={0xf2ead8} o={{ roughness: 0.45 }} r={s * 0.12} />
          {face(5, (a, b) => [a, s + 0.001, b])}
          {face(3, (a, b) => [a, s / 2 + b, s / 2 + 0.001])}
          {face(2, (a, b) => [s / 2 + 0.001, s / 2 + b, a])}
        </group>
      );
    }
    case "meeple": {
      const k = w / 100;
      return (
        <group>
          <mesh geometry={MEEPLE_GEO} material={mat(0xd9a21b, { roughness: 0.55, map: "grain" })} scale={[k, k, Math.max(0.12, d * 0.7)]} castShadow receiveShadow />
        </group>
      );
    }
    case "darts": {
      const r = Math.min(w, 0.5) * 0.45;
      return (
        <group position={[0, 1.73, 0.03]}>
          <B s={[w, w, 0.03]} p={[0, 0, -0.02]} c={0x1b1b1d} />
          {[
            [r, 0x1b1b1d],
            [r * 0.82, 0xd8c9a0],
            [r * 0.62, 0xb8322c],
            [r * 0.42, 0xd8c9a0],
            [r * 0.2, 0x2f8a4f],
            [r * 0.08, 0xb8322c],
          ].map(([rr, c], i) => (
            <Cyl key={i} r={rr as number} h={0.01} p={[0, 0, i * 0.004]} rot={[Math.PI / 2, 0, 0]} c={c as number} seg={24} shadow={false} />
          ))}
        </group>
      );
    }
    case "bin":
      return (
        <group>
          <Cyl r={Math.min(w, d) / 2} r2={Math.min(w, d) * 0.42} h={0.66} p={[0, 0.33, 0]} c={0x6f747a} o={{ metalness: 0.4, roughness: 0.4 }} seg={18} />
          <Cyl r={Math.min(w, d) / 2 + 0.01} h={0.04} p={[0, 0.68, 0]} c={0x55595e} o={{ metalness: 0.4 }} seg={18} />
        </group>
      );
    case "coatrack":
      return (
        <group>
          <Cyl r={Math.min(w, d) / 2} r2={Math.min(w, d) / 2 + 0.02} h={0.04} p={[0, 0.02, 0]} c={0x3a2412} seg={16} />
          <Cyl r={0.025} h={1.75} p={[0, 0.9, 0]} c={0x7a5232} o={GRAIN} seg={10} />
          {[0, 1, 2, 3].map((i) => (
            <Cyl key={i} r={0.012} h={0.16} p={[Math.cos(i * 1.57) * 0.07, 1.68, Math.sin(i * 1.57) * 0.07]} rot={[Math.sin(i * 1.57) * 0.9, 0, -Math.cos(i * 1.57) * 0.9]} c={0x7a5232} seg={6} />
          ))}
          <Ball s={[0.06, 0.06, 0.06]} p={[0, 1.8, 0]} c={0x7a5232} />
        </group>
      );
    default:
      return <B s={[w, hh, t]} p={[0, bot + hh / 2, 0]} c={0xd9c79e} />;
  }
}

// ───────────────────────── escolha do modelo ─────────────────────────

export function ElementModel({ el, ctx }: { el: PlanElement; ctx: BuildCtx }) {
  const v = variantOf(el);
  switch (el.kind) {
    case "room":
      return <Floor el={el} />;
    case "block":
      return <Block el={el} wallH={ctx.wallH} />;
    case "wall":
      return <Wall el={el} wallH={ctx.wallH} />;
    case "door":
      return <Door el={el} wallH={ctx.wallH} />;
    case "arch":
      return <Arch el={el} wallH={ctx.wallH} />;
    case "window":
      return <Window el={el} wallH={ctx.wallH} />;
    case "curtain":
      return <Curtain el={el} wallH={ctx.wallH} />;
    case "stair":
      return <Stair el={el} levelHeight={ctx.levelHeight} />;
    case "pillar":
      return <Pillar el={el} wallH={ctx.wallH} />;
    case "stage":
      return <Stage el={el} />;
    case "table":
      return <Table el={el} ctx={ctx} />;
    case "bench":
      return <Bench el={el} />;
    case "sofa":
      return <Sofa el={el} />;
    case "pouf":
      return <Pouf el={el} />;
    case "chair":
      return <Chair el={el} />;
    case "gameshelf":
      return (
        <group>
          <GameShelfModel el={el} games={ctx.shelfGames} />
          {ctx.selected && <B s={[el.w + 0.16, 0.02, el.d + 0.16]} p={[0, 0.012, 0]} c={0xe6c56b} o={{ emissive: 0xe6c56b, emissiveIntensity: 0.8 }} shadow={false} />}
        </group>
      );
    case "shelf":
      return <Shelf el={el} />;
    case "cabinet":
      return <Cabinet el={el} />;
    case "counter":
      return <Counter el={el} />;
    case "steel":
      return <Steel el={el} />;
    case "fridge":
      return <Fridge el={el} />;
    case "freezer":
      return <Freezer el={el} />;
    case "sink":
      return <Sink el={el} />;
    case "toilet":
      return <Toilet el={el} />;
    case "elevator":
      return <Elevator el={el} />;
    case "barrel":
      return <Barrel el={el} />;
    case "keg":
      return <Keg el={el} />;
    case "plant":
      return <Plant el={el} />;
    case "deco":
      return <Deco el={el} v={v} wallH={ctx.wallH} />;
    default:
      return null;
  }
}
