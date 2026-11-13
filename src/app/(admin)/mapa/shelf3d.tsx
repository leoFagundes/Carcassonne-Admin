"use client";

import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CHEST, CUBES, HUTCH, LOWCAB, POUF, shelfModel, shelfSlots, UNDERSTAIR, understairTop } from "@/floorplan/shelves";
import type { PlanElement } from "@/floorplan/types";
import { B, Ball, mat, RB } from "./mesh3d";

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

/** Pufes-baú: preto de couro (1 lugar, com botões) ou base preta com 3 almofadas de bolinhas. */
function PoufChest({ el, n }: { el: PlanElement; n: number }) {
  const { w, d } = el;
  const H = POUF.height;
  const body = H - POUF.lid;
  const pw = w / n;
  const leather = { roughness: 0.42 };
  return (
    <group>
      <B s={[w - 0.03, 0.03, d - 0.03]} p={[0, 0.015, 0]} c={0x0e0e10} />
      <RB s={[w, body - 0.02, d]} p={[0, 0.02 + (body - 0.02) / 2, 0]} c={0x1d1d20} o={leather} r={0.025} />
      {/* Costura logo abaixo do tampo */}
      <B s={[w + 0.002, 0.006, d + 0.002]} p={[0, body - 0.03, 0]} c={0x2c2c30} shadow={false} />
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + pw * (i + 0.5);
        return n === 1 ? (
          <group key={i}>
            <RB s={[pw - 0.006, POUF.lid, d - 0.006]} p={[x, body + POUF.lid / 2, 0]} c={0x222226} o={leather} r={0.03} />
            {/* Botões do capitonê */}
            {[-1, 1].map((sx) => [-1, 1].map((sz) => <Ball key={`${sx}${sz}`} s={[0.018, 0.008, 0.018]} p={[x + sx * pw * 0.2, H + 0.001, sz * d * 0.2]} c={0x0c0c0e} shadow={false} />))}
          </group>
        ) : (
          <RB key={i} s={[pw - 0.03, POUF.lid, d - 0.025]} p={[x, body + POUF.lid / 2, 0]} c={0xffffff} o={{ map: "dots", roughness: 0.95 }} r={0.03} />
        );
      })}
    </group>
  );
}

/** Baú de madeira com cintas de ferro e fecho. */
function ChestModel({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const H = CHEST.height;
  const wood = { map: "grain" as const, roughness: 0.75 };
  const iron = { metalness: 0.6, roughness: 0.45 };
  return (
    <group>
      <RB s={[w, H - CHEST.lid, d]} p={[0, (H - CHEST.lid) / 2, 0]} c={0x7a4f2c} o={wood} r={0.012} />
      <RB s={[w + 0.02, CHEST.lid, d + 0.02]} p={[0, H - CHEST.lid / 2, 0]} c={0x6e4526} o={wood} r={0.015} />
      {[-0.32, 0.32].map((fx) => (
        <group key={fx}>
          <B s={[0.04, H + 0.004, 0.006]} p={[w * fx, H / 2, d / 2 + 0.012]} c={0x2a2a2c} o={iron} shadow={false} />
          <B s={[0.04, 0.006, d + 0.024]} p={[w * fx, H + 0.002, 0]} c={0x2a2a2c} o={iron} shadow={false} />
        </group>
      ))}
      <B s={[0.07, 0.09, 0.012]} p={[0, H - CHEST.lid - 0.02, d / 2 + 0.012]} c={0xc79a2c} o={{ metalness: 0.7, roughness: 0.3 }} />
    </group>
  );
}

/** Armário embaixo da escada: corpo com o teto inclinado e três portas de correr de alturas diferentes. */
function UnderstairModel({ el }: { el: PlanElement }) {
  const { w, d } = el;
  const U = UNDERSTAIR;
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0);
    s.lineTo(w / 2, 0);
    s.lineTo(w / 2, U.height);
    s.lineTo(-w / 2, U.low);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }, [w, d, U.height, U.low]);
  useEffect(() => () => geo.dispose(), [geo]);
  const cw = w / 3;
  const slope = Math.atan2(U.height - U.low, w);
  return (
    <group>
      <mesh geometry={geo} material={mat(0x8a5a32, { map: "grain", roughness: 0.75 })} castShadow receiveShadow />
      {/* Rodapé */}
      <B s={[w + 0.01, U.base, 0.02]} p={[0, U.base / 2, d / 2 + 0.006]} c={0x5e3d22} />
      {/* Acabamento no alto, seguindo a escada */}
      <B s={[Math.hypot(w, U.height - U.low) + 0.02, 0.04, d + 0.04]} p={[0, (U.low + U.height) / 2, 0]} rot={[0, 0, slope]} c={0x5e3d22} />
      {/* Trilho de baixo (duas canaletas) */}
      <B s={[w - 0.02, 0.025, 0.07]} p={[0, U.base + 0.0125, d / 2 + 0.035]} c={0x9a9a9e} o={{ metalness: 0.5, roughness: 0.4 }} />
      {/* Portas de correr: alternam entre o trilho da frente e o de trás e se sobrepõem um pouco */}
      {[0, 1, 2].map((i) => {
        const x0 = -w / 2 + cw * i;
        const top = understairTop(w, cw * i) - U.frame - 0.02;
        const h = top - U.base - 0.03;
        const pw = cw + (i === 1 ? 0.06 : 0.01);
        const z = d / 2 + (i === 1 ? 0.018 : 0.05);
        const pullX = x0 + cw / 2 + (i === 0 ? cw / 2 - 0.08 : i === 2 ? -cw / 2 + 0.08 : 0);
        const y = U.base + 0.025 + h / 2;
        return (
          <group key={i}>
            <B s={[pw - 0.01, h, 0.022]} p={[x0 + cw / 2, y, z]} c={i === 1 ? 0x93643a : 0x9a6a3c} o={{ map: "grain", roughness: 0.7 }} />
            {/* Moldura fina nas bordas da folha */}
            {[-1, 1].map((sx) => (
              <B key={sx} s={[0.02, h, 0.026]} p={[x0 + cw / 2 + sx * (pw / 2 - 0.015), y, z]} c={0x6e4727} />
            ))}
            {/* Puxador embutido (cavidade) */}
            <B s={[0.03, Math.min(0.22, h * 0.3), 0.006]} p={[pullX, U.base + 0.025 + Math.min(0.95, h * 0.5), z + 0.012]} c={0x241810} o={{ roughness: 0.9 }} />
          </group>
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

  if (m.id === "pouf1" || m.id === "pouf3") return <PoufChest el={el} n={m.id === "pouf3" ? 3 : 1} />;
  if (m.id === "chest") return <ChestModel el={el} />;
  if (m.id === "understair") return <UnderstairModel el={el} />;

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
