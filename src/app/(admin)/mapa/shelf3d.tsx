"use client";

import React from "react";
import { CUBES, HUTCH, LOWCAB, shelfModel, shelfSlots } from "@/floorplan/shelves";
import type { PlanElement } from "@/floorplan/types";
import { B } from "./mesh3d";

/** Caixas de jogo coloridas (o nome define a cor, sempre a mesma). */
const BOX_COLORS = [0xb8322c, 0x2e6fb5, 0x2f8a4f, 0xd9a21b, 0x6b3fa0, 0xd8692a, 0xe9e4d8, 0x2a2f3a, 0x1f8a8a, 0x9c2f6b];
function boxColor(name: string): number {
  let h = 7;
  for (const ch of name) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return BOX_COLORS[h % BOX_COLORS.length];
}

function Knob({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <mesh position={[x, y, z]} castShadow>
      <sphereGeometry args={[0.022, 12, 10]} />
      <meshStandardMaterial color={0xc49a6c} roughness={0.6} />
    </mesh>
  );
}

function Foot({ x, z, r = 0.045 }: { x: number; z: number; r?: number }) {
  return (
    <mesh position={[x, r, z]} castShadow>
      <sphereGeometry args={[r, 12, 10]} />
      <meshStandardMaterial color={0x6e4526} roughness={0.8} />
    </mesh>
  );
}

/** Porta fechada com almofada (relevo) e puxador. */
function Door({ x, y, w, h, z, wood, knobLeft }: { x: number; y: number; w: number; h: number; z: number; wood: number; knobLeft: boolean }) {
  return (
    <group>
      <B s={[w, h, 0.025]} p={[x, y, z]} c={wood} />
      <B s={[w * 0.72, h * 0.72, 0.012]} p={[x, y, z + 0.015]} c={wood} o={{ roughness: 0.7 }} />
      <Knob x={x + (knobLeft ? -w * 0.36 : w * 0.36)} y={y} z={z + 0.03} />
    </group>
  );
}

/** Pilhas de caixas de jogo num espaço aberto (do chão do espaço para cima). */
function GameBoxes({ names, x0, x1, y0, h, d, z }: { names: string[]; x0: number; x1: number; y0: number; h: number; d: number; z: number }) {
  if (!names.length) return null;
  const bw = 0.27;
  const bh = 0.065;
  const per = Math.max(1, Math.floor((h - 0.02) / bh));
  const piles = Math.max(1, Math.floor((x1 - x0) / (bw + 0.015)));
  const shown = names.slice(0, per * piles);
  return (
    <group>
      {shown.map((n, i) => {
        const pile = i % piles;
        const level = Math.floor(i / piles);
        return (
          <B
            key={`${n}-${i}`}
            s={[bw, bh - 0.004, Math.min(0.3, d)]}
            p={[x0 + 0.01 + pile * (bw + 0.015) + bw / 2, y0 + level * bh + bh / 2, z]}
            c={boxColor(n)}
            o={{ roughness: 0.55 }}
          />
        );
      })}
    </group>
  );
}

/**
 * Armário de jogos fiel às fotos: estante alta (aberta ou com portas embaixo),
 * torre de nichos e armário baixo. Frente para +z (nos eixos do elemento).
 */
export function GameShelfModel({ el, games }: { el: PlanElement; games?: Record<string, string[]> }) {
  const { w, d } = el;
  const m = shelfModel(el);
  const H = m.height;
  const yOf = (frontY: number) => H - frontY; // vista de frente (de cima para baixo) → altura
  const slots = shelfSlots(el);
  const boxes = slots
    .filter((s) => s.kind === "open" || s.kind === "top")
    .map((s) => (
      <GameBoxes
        key={s.id}
        names={games?.[s.id] ?? []}
        x0={-w / 2 + s.x}
        x1={-w / 2 + s.x + s.w}
        y0={s.kind === "top" ? H : yOf(s.y + s.h)}
        h={s.h}
        d={d - 0.1}
        z={s.kind === "top" ? 0 : 0.02}
      />
    ));

  if (m.id === "cubes") {
    const wood = 0xb07f4c;
    const t = CUBES.wall;
    return (
      <group>
        {[0, 1, 2, 3].map((i) => {
          const y0 = H - (i + 1) * CUBES.cube;
          const c = y0 + CUBES.cube / 2;
          return (
            <group key={i}>
              <B s={[w, t, d]} p={[0, y0 + t / 2, 0]} c={wood} />
              <B s={[w, t, d]} p={[0, y0 + CUBES.cube - t / 2, 0]} c={wood} />
              <B s={[t, CUBES.cube, d]} p={[-w / 2 + t / 2, c, 0]} c={wood} />
              <B s={[t, CUBES.cube, d]} p={[w / 2 - t / 2, c, 0]} c={wood} />
              <B s={[w - t * 2, CUBES.cube - t * 2, 0.008]} p={[0, c, -d / 2 + 0.004]} c={0x9a6c3e} />
            </group>
          );
        })}
        {boxes}
      </group>
    );
  }

  if (m.id === "lowcab") {
    const wood = 0x7a4f2c;
    const sideH = yOf(LOWCAB.base[1]);
    return (
      <group>
        {[-1, 1].map((sx) => [-1, 1].map((sz) => <Foot key={`${sx}${sz}`} x={sx * (w / 2 - 0.08)} z={sz * (d / 2 - 0.08)} r={0.035} />))}
        <B s={[w - 0.04, yOf(LOWCAB.ledge[1]) - sideH, d - 0.03]} p={[0, (yOf(LOWCAB.ledge[1]) + sideH) / 2, -0.015]} c={wood} />
        {/* Tampo com sobra */}
        <B s={[w + 0.04, 0.05, d + 0.04]} p={[0, H - 0.025, 0]} c={0x6e4526} />
        {/* Gaveta */}
        <B s={[w - 0.08, yOf(LOWCAB.drawer[0]) - yOf(LOWCAB.drawer[1]) - 0.01, 0.03]} p={[0, (yOf(LOWCAB.drawer[0]) + yOf(LOWCAB.drawer[1])) / 2, d / 2 - 0.01]} c={0x8a5a32} />
        <Knob x={-w * 0.28} y={(yOf(LOWCAB.drawer[0]) + yOf(LOWCAB.drawer[1])) / 2} z={d / 2 + 0.02} />
        <Knob x={w * 0.28} y={(yOf(LOWCAB.drawer[0]) + yOf(LOWCAB.drawer[1])) / 2} z={d / 2 + 0.02} />
        {/* Duas portas */}
        {[-1, 1].map((sx) => (
          <Door
            key={sx}
            x={sx * (w / 4 - 0.005)}
            y={(yOf(LOWCAB.inner[0][0]) + yOf(LOWCAB.base[0])) / 2}
            w={w / 2 - 0.05}
            h={yOf(LOWCAB.inner[0][0]) - yOf(LOWCAB.base[0]) - 0.02}
            z={d / 2 - 0.005}
            wood={0x8a5a32}
            knobLeft={sx > 0}
          />
        ))}
        {boxes}
      </group>
    );
  }

  // Estante alta
  const wood = 0x9a6a3c;
  const dark = 0x7a5230;
  const t = HUTCH.side;
  const doors = m.id === "hutch-doors";
  const lowerTop = yOf(HUTCH.drawer[1]);
  const lowerBottom = yOf(HUTCH.base[1]);
  const upperBottom = yOf(HUTCH.ledge[0]);
  const upperTop = yOf(HUTCH.cornice);
  const uw = w - HUTCH.upperInset * 2;
  const ud = d - 0.06;
  const uz = -0.03;
  return (
    <group>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <Foot key={`${sx}${sz}`} x={sx * (w / 2 - 0.07)} z={sz * (d / 2 - 0.07)} />))}
      {/* Parte de baixo: laterais, fundo, piso e prateleira do meio */}
      <B s={[t, yOf(HUTCH.ledge[1]) - lowerBottom, d]} p={[-w / 2 + t / 2, (yOf(HUTCH.ledge[1]) + lowerBottom) / 2, 0]} c={wood} />
      <B s={[t, yOf(HUTCH.ledge[1]) - lowerBottom, d]} p={[w / 2 - t / 2, (yOf(HUTCH.ledge[1]) + lowerBottom) / 2, 0]} c={wood} />
      <B s={[w, lowerTop - lowerBottom, 0.015]} p={[0, (lowerTop + lowerBottom) / 2, -d / 2 + 0.008]} c={dark} />
      <B s={[w, yOf(HUTCH.base[0]) - lowerBottom, d]} p={[0, (yOf(HUTCH.base[0]) + lowerBottom) / 2, 0]} c={wood} />
      <B s={[w - t * 2, 0.025, d - 0.02]} p={[0, yOf(HUTCH.lower[0][1]) - 0.0125, 0]} c={wood} />
      {doors &&
        [-1, 1].map((sx) => (
          <Door
            key={sx}
            x={sx * (w / 4 - 0.005)}
            y={(yOf(HUTCH.lower[0][0]) + yOf(HUTCH.lower[1][1])) / 2}
            w={w / 2 - 0.04}
            h={yOf(HUTCH.lower[0][0]) - yOf(HUTCH.lower[1][1]) + 0.02}
            z={d / 2 - 0.005}
            wood={0x8f6236}
            knobLeft={sx > 0}
          />
        ))}
      {/* Gaveta com dois puxadores */}
      <B s={[w - 0.05, yOf(HUTCH.drawer[0]) - lowerTop - 0.01, 0.03]} p={[0, (yOf(HUTCH.drawer[0]) + lowerTop) / 2, d / 2 - 0.01]} c={0x8f6236} />
      <B s={[w - t * 2, yOf(HUTCH.drawer[0]) - lowerTop, d - 0.04]} p={[0, (yOf(HUTCH.drawer[0]) + lowerTop) / 2, -0.02]} c={dark} />
      <Knob x={-w * 0.3} y={(yOf(HUTCH.drawer[0]) + lowerTop) / 2} z={d / 2 + 0.02} />
      <Knob x={w * 0.3} y={(yOf(HUTCH.drawer[0]) + lowerTop) / 2} z={d / 2 + 0.02} />
      {/* Tampo (aba) entre a gaveta e a estante */}
      <B s={[w + 0.02, yOf(HUTCH.ledge[0]) - yOf(HUTCH.ledge[1]), d + 0.02]} p={[0, (yOf(HUTCH.ledge[0]) + yOf(HUTCH.ledge[1])) / 2, 0]} c={0x8a5a32} />
      {/* Estante de cima: laterais, fundo de tábuas, prateleiras e cornija */}
      <B s={[t, upperTop - upperBottom, ud]} p={[-uw / 2 + t / 2, (upperTop + upperBottom) / 2, uz]} c={wood} />
      <B s={[t, upperTop - upperBottom, ud]} p={[uw / 2 - t / 2, (upperTop + upperBottom) / 2, uz]} c={wood} />
      <B s={[uw, upperTop - upperBottom, 0.015]} p={[0, (upperTop + upperBottom) / 2, uz - ud / 2 + 0.008]} c={dark} />
      {[1, 2, 3, 4, 5].map((i) => (
        <B key={i} s={[0.006, upperTop - upperBottom - 0.02, 0.004]} p={[-uw / 2 + (uw * i) / 6, (upperTop + upperBottom) / 2, uz - ud / 2 + 0.017]} c={0x5e3d22} shadow={false} />
      ))}
      {HUTCH.upper.slice(1).map(([y0], i) => (
        <B key={i} s={[uw - t * 2, 0.025, ud - 0.02]} p={[0, yOf(y0) + 0.0125, uz]} c={wood} />
      ))}
      <B s={[uw - t * 2, 0.025, ud - 0.02]} p={[0, yOf(HUTCH.upper[0][0]) + 0.0125, uz]} c={wood} />
      <B s={[uw + 0.05, HUTCH.cornice, ud + 0.05]} p={[0, H - HUTCH.cornice / 2, uz + 0.01]} c={0x8a5a32} />
      {boxes}
    </group>
  );
}
