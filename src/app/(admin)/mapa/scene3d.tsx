"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { variantOf } from "@/floorplan/catalog";
import { boundsOf } from "@/floorplan/geometry";
import { STATE_META } from "@/floorplan/day";
import type { PlanElement, PlanLevel, TableState } from "@/floorplan/types";

export interface Scene3DProps {
  elements: PlanElement[];
  levels: PlanLevel[];
  levelHeight: number;
  /** Andar mostrado, ou "all" para todos empilhados. */
  level: string | "all";
  tableStates?: ReadonlyMap<string, TableState>;
  selected: ReadonlySet<string>;
  /** Nome exibido sobre cada mesa (ex.: grupo "2/3"). */
  tableLabels?: ReadonlyMap<string, string>;
  highWalls: boolean;
  topView: boolean;
  showLabels: boolean;
  onPickTable?: (id: string) => void;
}

// ───────────────────────── materiais e caixas compartilhados ─────────────────────────

const BOX = new THREE.BoxGeometry(1, 1, 1);
const MATS = new Map<string, THREE.MeshStandardMaterial>();
type MatOpts = { metalness?: number; roughness?: number; emissive?: number; emissiveIntensity?: number };
function mat(color: number | string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${o.metalness ?? 0}|${o.roughness ?? 0.85}|${o.emissive ?? 0}|${o.emissiveIntensity ?? 0}`;
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      metalness: o.metalness ?? 0,
      roughness: o.roughness ?? 0.85,
      emissive: o.emissive ?? 0x000000,
      emissiveIntensity: o.emissiveIntensity ?? 0,
    });
    MATS.set(key, m);
  }
  return m;
}

/** Caixa pelo centro: tamanho [x, y, z], posição [x, y, z] nos eixos do elemento. */
function B({
  s,
  p,
  c,
  o,
  shadow = true,
  ...ev
}: {
  s: [number, number, number];
  p: [number, number, number];
  c: number | string;
  o?: MatOpts;
  shadow?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <mesh geometry={BOX} material={mat(c, o)} scale={s} position={p} castShadow={shadow} receiveShadow {...ev} />
  );
}

function Cyl({ r, h, p, c, o, seg = 16, r2 }: { r: number; h: number; p: [number, number, number]; c: number; o?: MatOpts; seg?: number; r2?: number }) {
  return (
    <mesh position={p} material={mat(c, o)} castShadow receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    </mesh>
  );
}

const FLOOR: Record<string, number> = { wood: 0x7b5236, tile: 0xcfc8ba, granite: 0x8f9296 };
const GLOW_BLUE = { emissive: 0x1f49a8, emissiveIntensity: 0.9, roughness: 0.3 };

// ───────────────────────── cada tipo ─────────────────────────

interface BuildCtx {
  wallH: number;
  levelHeight: number;
  state?: TableState;
  selected: boolean;
  onPick?: (e: ThreeEvent<MouseEvent>) => void;
}

function ElementModel({ el, ctx }: { el: PlanElement; ctx: BuildCtx }) {
  const { w, d } = el;
  const v = variantOf(el);
  const wallH = ctx.wallH;
  const top = Math.min(wallH - 0.08, 2.3);
  const bot = Math.max(0.35, top - 1.4);
  const hh = top - bot;
  const wallColor = 0xe4dccd;

  switch (el.kind) {
    case "room":
      return <B s={[w, 0.08, d]} p={[0, -0.04, 0]} c={FLOOR[v ?? "wood"]} o={{ roughness: v === "granite" ? 0.35 : 0.8 }} shadow={false} />;
    case "block":
      return <B s={[w, wallH, d]} p={[0, wallH / 2, 0]} c={0x2a2622} o={{ roughness: 1 }} />;
    case "wall": {
      const h = v === "low" ? 1.0 : wallH;
      return <B s={[w + d, h, d]} p={[0, h / 2, 0]} c={v === "dark" ? 0x1e1d22 : wallColor} />;
    }
    case "door":
      return wallH > 2.1 ? <B s={[w, wallH - 2.1, d]} p={[0, (wallH + 2.1) / 2, 0]} c={wallColor} /> : null;
    case "arch": {
      const jh = Math.min(wallH, 2.15);
      return (
        <group>
          <B s={[0.12, jh, d + 0.05]} p={[-w / 2 + 0.06, jh / 2, 0]} c={0xf2ece0} />
          <B s={[0.12, jh, d + 0.05]} p={[w / 2 - 0.06, jh / 2, 0]} c={0xf2ece0} />
          {wallH > 2.15 && <B s={[w, wallH - 2.15, d]} p={[0, (wallH + 2.15) / 2, 0]} c={0xf2ece0} />}
        </group>
      );
    }
    case "window":
      return (
        <group>
          <B s={[w, 1.05, d]} p={[0, 0.525, 0]} c={0x5a3d24} />
          {wallH > 2.3 && <B s={[w, wallH - 2.3, d]} p={[0, (wallH + 2.3) / 2, 0]} c={wallColor} />}
        </group>
      );
    case "curtain": {
      const ch = Math.min(2.2, wallH + 0.25);
      if (w <= 1) return <B s={[w, ch, Math.max(0.06, d)]} p={[0, ch / 2, 0]} c={0xa8322f} o={{ roughness: 0.95 }} />;
      const pw = Math.min(0.7, w * 0.25);
      return (
        <group>
          <B s={[pw, ch, 0.08]} p={[-w / 2 + pw / 2, ch / 2, 0]} c={0xa8322f} o={{ roughness: 0.95 }} />
          <B s={[pw, ch, 0.08]} p={[w / 2 - pw / 2, ch / 2, 0]} c={0xa8322f} o={{ roughness: 0.95 }} />
          {wallH > 2.4 && <B s={[w, wallH - 2.35, d]} p={[0, (wallH + 2.35) / 2, 0]} c={wallColor} />}
        </group>
      );
    }
    case "stair": {
      if (v === "down") return null; // abertura no andar de cima
      const n = Math.max(2, el.count ?? 12);
      const run = d / n;
      const rise = ctx.levelHeight / n;
      return (
        <group>
          {Array.from({ length: n }, (_, i) => {
            const h = rise * (i + 1);
            return <B key={i} s={[w, h, run]} p={[0, h / 2, d / 2 - run * (i + 0.5)]} c={i % 2 ? 0x8a5a33 : 0x7d5130} />;
          })}
        </group>
      );
    }
    case "table": {
      const black = v === "black";
      const topColor = ctx.state ? STATE_META[ctx.state].color : black ? 0x2a2a2d : 0xb98a5a;
      const along = w >= d;
      const off = (along ? w : d) / 2 - 0.25;
      return (
        <group>
          <B
            s={[w, 0.06, d]}
            p={[0, 0.75, 0]}
            c={topColor}
            o={ctx.selected ? { emissive: 0xffffff, emissiveIntensity: 0.25 } : ctx.state ? { roughness: 0.6 } : undefined}
            onClick={ctx.onPick}
          />
          {[-1, 1].map((sgn) => (
            <B
              key={sgn}
              s={[along ? 0.08 : w * 0.8, 0.72, along ? d * 0.8 : 0.08]}
              p={[along ? sgn * off : 0, 0.36, along ? 0 : sgn * off]}
              c={0x8a6038}
              onClick={ctx.onPick}
            />
          ))}
          {ctx.selected && <B s={[w + 0.12, 0.02, d + 0.12]} p={[0, 0.015, 0]} c={0xffffff} o={{ emissive: 0xffffff, emissiveIntensity: 0.6 }} shadow={false} />}
        </group>
      );
    }
    case "bench":
      return (
        <group>
          <B s={[w, 0.06, d]} p={[0, 0.45, 0]} c={0xc69a6b} />
          <B s={[w * 0.9, 0.42, 0.06]} p={[0, 0.21, 0]} c={0x8a6038} />
          {v === "back" && <B s={[w, 0.4, 0.05]} p={[0, 0.72, -d / 2 + 0.025]} c={0xa8794c} />}
        </group>
      );
    case "sofa":
      return (
        <group>
          <B s={[w, 0.45, d]} p={[0, 0.225, 0]} c={0x4a4d52} o={{ roughness: 0.5 }} />
          <B s={[w, 0.45, 0.15]} p={[0, 0.67, -d / 2 + 0.075]} c={0x4a4d52} o={{ roughness: 0.5 }} />
        </group>
      );
    case "pouf": {
      const n = Math.max(1, el.count ?? 3);
      const pw = w / n;
      return (
        <group>
          {Array.from({ length: n }, (_, i) => (
            <group key={i}>
              <B s={[pw - 0.06, 0.36, d]} p={[-w / 2 + pw * (i + 0.5), 0.18, 0]} c={0x3f4247} o={{ roughness: 0.6 }} />
              <B s={[pw - 0.06, 0.07, d]} p={[-w / 2 + pw * (i + 0.5), 0.395, 0]} c={0xe6d9c8} />
            </group>
          ))}
        </group>
      );
    }
    case "shelf": {
      const black = v === "black";
      const C = black ? 0x232020 : v === "cubes" ? 0x9a6a3c : 0x8f6236;
      const H = v === "cubes" ? 1.75 : black ? 1.85 : 2.05;
      const t = 0.04;
      const base = v === "doors" ? 1.0 : v === "bookcase" ? 0.95 : 0.05;
      const n = v === "cubes" ? 4 : 3;
      return (
        <group>
          <B s={[w, H, t]} p={[0, H / 2, -d / 2 + t / 2]} c={C} />
          <B s={[t, H, d]} p={[-w / 2 + t / 2, H / 2, 0]} c={C} />
          <B s={[t, H, d]} p={[w / 2 - t / 2, H / 2, 0]} c={C} />
          <B s={[w, t, d]} p={[0, H - t / 2, 0]} c={C} />
          {(v === "doors" || v === "bookcase") && (
            <B s={[w, base - 0.1, 0.03]} p={[0, (base - 0.1) / 2 + 0.05, d / 2]} c={v === "doors" ? 0x7a5230 : 0x6e4a2a} />
          )}
          {Array.from({ length: n + 1 }, (_, i) => (
            <B key={i} s={[w - 0.06, t, d - 0.04]} p={[0, base + ((H - base - 0.05) * i) / n, 0]} c={C} />
          ))}
        </group>
      );
    }
    case "cabinet":
      return v === "stack" ? (
        <B s={[w, 1.3, d]} p={[0, 0.65, 0]} c={0x7d6a55} />
      ) : (
        <group>
          <B s={[w, 0.95, d]} p={[0, 0.475, 0]} c={0x7a5230} />
          <B s={[w, 0.2, 0.04]} p={[0, 0.83, d / 2 + 0.01]} c={0x6e4a2a} />
        </group>
      );
    case "counter": {
      if (v !== "bar") return <B s={[w, 1.05, d]} p={[0, 0.525, 0]} c={0x5a3d24} />;
      const n = Math.max(1, Math.floor(w / 0.3));
      return (
        <group>
          <B s={[w, 1.0, d]} p={[0, 0.5, 0]} c={0x4a301c} />
          {[1.45, 1.9].map((y) => (
            <B key={y} s={[w, 0.04, d]} p={[0, y, 0]} c={0x7a5532} />
          ))}
          {Array.from({ length: n }, (_, i) =>
            [1.15, 1.6].map((y, j) => (
              <Cyl
                key={`${i}-${j}`}
                r={0.04}
                h={0.28}
                seg={8}
                p={[-w / 2 + 0.15 + i * 0.3, y + 0.14, 0]}
                c={[0x7a4b16, 0x2f5d2f, 0xd8c27a, 0x8a1f1f][(i + j) % 4]}
                o={{ roughness: 0.25 }}
              />
            )),
          )}
        </group>
      );
    }
    case "steel":
      return (
        <group>
          <B s={[w, 0.9, d]} p={[0, 0.45, 0]} c={0x9a9da2} o={{ metalness: 0.45, roughness: 0.35 }} />
          {v === "tap" && (
            <>
              <B s={[0.35, 0.55, 0.3]} p={[-0.3, 1.17, 0]} c={0x1b1b1d} />
              <B s={[0.35, 0.55, 0.3]} p={[0.3, 1.17, 0]} c={0x1b1b1d} />
            </>
          )}
        </group>
      );
    case "fridge":
      return v === "steel" ? (
        <B s={[w, 2.0, d]} p={[0, 1.0, 0]} c={0xc4c8cc} o={{ metalness: 0.5, roughness: 0.3 }} />
      ) : (
        <B s={[w, 1.85, d]} p={[0, 0.925, 0]} c={0xeeeeea} o={{ roughness: 0.5 }} />
      );
    case "freezer":
      return <B s={[w, 0.85, d]} p={[0, 0.425, 0]} c={0xe8e8e4} o={{ roughness: 0.4 }} />;
    case "sink":
      return <B s={[w, 0.85, d]} p={[0, 0.425, 0]} c={0xf0f0ee} o={{ roughness: 0.3 }} />;
    case "toilet":
      return (
        <group>
          <B s={[w * 0.9, 0.42, d * 0.6]} p={[0, 0.21, d * 0.15]} c={0xf4f4f2} o={{ roughness: 0.3 }} />
          <B s={[w, 0.4, 0.18]} p={[0, 0.6, -d / 2 + 0.09]} c={0xf4f4f2} o={{ roughness: 0.3 }} />
        </group>
      );
    case "elevator":
      return <B s={[w, 2.2, d]} p={[0, 1.1, 0]} c={0x8f9296} o={{ metalness: 0.4, roughness: 0.4 }} />;
    case "barrel":
      return <Cyl r={Math.min(w, d) / 2} r2={(Math.min(w, d) / 2) * 0.9} h={0.95} p={[0, 0.475, 0]} c={0x8a5a2b} seg={18} />;
    case "keg":
      return <Cyl r={Math.min(w, d) / 2} h={0.6} p={[0, 0.3, 0]} c={0xb4b8bc} o={{ metalness: 0.7, roughness: 0.3 }} />;
    case "plant":
      return (
        <group>
          <Cyl r={Math.min(w, d) / 2} r2={Math.min(w, d) * 0.42} h={0.7} p={[0, 0.35, 0]} c={0x9c6a52} seg={6} />
          <mesh position={[0, 1.5, 0]} material={mat(0x5f7d4a)} castShadow>
            <coneGeometry args={[Math.min(w, d) * 0.9, 1.6, 7]} />
          </mesh>
        </group>
      );
    case "deco":
      return <DecoModel el={el} v={v} top={top} bot={bot} hh={hh} wallH={wallH} />;
    default:
      return null;
  }
}

function DecoModel({ el, v, top, bot, hh, wallH }: { el: PlanElement; v?: string; top: number; bot: number; hh: number; wallH: number }) {
  const { w, d } = el;
  const t = Math.max(0.04, d);
  switch (v) {
    case "glass-blue":
      return (
        <group>
          <B s={[w, hh, t]} p={[0, bot + hh / 2, 0]} c={0x2f66d0} o={GLOW_BLUE} />
          <B s={[w * 0.45, hh * 0.3, t + 0.02]} p={[0, bot + hh * 0.55, 0]} c={0xc0392b} o={{ emissive: 0x7a1f17, emissiveIntensity: 0.7 }} />
          <B s={[w + 0.1, 0.06, t + 0.04]} p={[0, top, 0]} c={0x8a5a2b} />
        </group>
      );
    case "glass-green":
      return (
        <group>
          <B s={[w, hh, t]} p={[0, bot + hh / 2, 0]} c={0xc8d84a} o={{ emissive: 0x8fa22a, emissiveIntensity: 0.9, roughness: 0.3 }} />
          <B s={[w + 0.1, 0.06, t + 0.04]} p={[0, top, 0]} c={0x8a5a2b} />
        </group>
      );
    case "logo":
    case "logo-dark": {
      const lh = Math.min(hh, 0.8);
      const fullH = Math.min(wallH, 2.4) - 0.02;
      return (
        <group>
          {v === "logo-dark" && <B s={[w, fullH, t]} p={[0, fullH / 2, 0]} c={0x141316} />}
          <B s={[w * (v === "logo-dark" ? 0.45 : 1), lh, t + 0.02]} p={[0, bot + hh - lh / 2, 0]} c={0xd6b268} o={{ emissive: 0x8a6d1f, emissiveIntensity: 0.8 }} />
        </group>
      );
    }
    case "mirror":
      return <B s={[w, Math.min(hh, 0.9), t]} p={[0, bot + hh - Math.min(hh, 0.9) / 2, 0]} c={0xc9d6dc} o={{ metalness: 0.7, roughness: 0.1 }} />;
    case "board":
      return <B s={[w, Math.min(hh, 0.8), t]} p={[0, bot + hh - Math.min(hh, 0.8) / 2, 0]} c={0x111111} />;
    case "map":
      return <B s={[w, Math.min(hh, 1.2), t]} p={[0, bot + hh - Math.min(hh, 1.2) / 2, 0]} c={0xcfc3a0} />;
    case "frame":
      return <B s={[w, hh, t]} p={[0, bot + hh / 2, 0]} c={0x7a5532} />;
    case "banner": {
      const n = Math.max(1, Math.round(w / 1.1));
      const bh = Math.min(hh, 1.2);
      return (
        <group>
          {Array.from({ length: n }, (_, i) => (
            <B key={i} s={[0.6, bh, 0.04]} p={[-w / 2 + (w / n) * (i + 0.5), top - bh / 2, 0]} c={0x6e4426} />
          ))}
        </group>
      );
    }
    case "shield":
      return (
        <group>
          <B s={[w, 0.45, t]} p={[0, top - 0.5, 0]} c={0x9a9ea3} o={{ metalness: 0.7, roughness: 0.4 }} />
          <B s={[0.5, Math.min(hh, 0.9), 0.03]} p={[0.3, top - Math.min(hh, 0.9) / 2, 0]} c={0xd98a2b} />
        </group>
      );
    case "weapons":
      return <B s={[w, Math.min(hh, 0.7), t]} p={[0, top - 0.4, 0]} c={0x9a9ea3} o={{ metalness: 0.8 }} />;
    case "arches": {
      const n = Math.max(1, el.count ?? 2);
      const aw = Math.min(1.0, (w / n) * 0.75);
      const ah = Math.min(hh + 0.3, 2.0);
      return (
        <group>
          {Array.from({ length: n }, (_, i) => {
            const x0 = -w / 2 + (w * (i + 0.5)) / n;
            return (
              <group key={i}>
                <B s={[0.08, ah, 0.03]} p={[x0 - aw / 2, ah / 2 + 0.1, 0]} c={0xf6f1e6} />
                <B s={[0.08, ah, 0.03]} p={[x0 + aw / 2, ah / 2 + 0.1, 0]} c={0xf6f1e6} />
                <B s={[aw, 0.08, 0.03]} p={[x0, ah + 0.1, 0]} c={0xf6f1e6} />
              </group>
            );
          })}
        </group>
      );
    }
    case "sconce":
      return <B s={[Math.max(w, 0.1), 0.25, t]} p={[0, top - 0.2, 0]} c={0xfff0c8} o={{ emissive: 0xffd98a, emissiveIntensity: 1 }} />;
    case "pendant":
      return (
        <group>
          <mesh position={[0, 2.25, 0]} material={mat(0x6e5a3a, { metalness: 0.4 })}>
            <coneGeometry args={[0.28, 0.32, 14, 1, true]} />
          </mesh>
          <mesh position={[0, 2.12, 0]} material={mat(0xfff2cc, { emissive: 0xffd98a, emissiveIntensity: 1.2 })}>
            <sphereGeometry args={[0.07, 10, 8]} />
          </mesh>
        </group>
      );
    case "projector":
      return (
        <group>
          <B s={[w, 0.14, d]} p={[0, 2.45, 0]} c={0xe9e9e6} />
          <B s={[0.04, 0.3, 0.04]} p={[0, 2.67, 0]} c={0x999999} />
        </group>
      );
    case "lattice":
      return (
        <group>
          {Array.from({ length: 6 }, (_, i) => (
            <B key={`v${i}`} s={[0.04, 2.1, t]} p={[-w / 2 + (i * w) / 5, 1.05, 0]} c={0x1c1714} />
          ))}
          {Array.from({ length: 7 }, (_, j) => (
            <B key={`h${j}`} s={[w, 0.04, t]} p={[0, 0.2 + j * 0.3, 0]} c={0x1c1714} />
          ))}
        </group>
      );
    case "rail":
      return <B s={[w, 1.0, t]} p={[0, 0.5, 0]} c={0xc79a2c} o={{ metalness: 0.4, roughness: 0.4 }} />;
    case "extinguisher":
      return <Cyl r={0.1} h={0.55} p={[0, 0.28, 0]} c={0xcc2222} seg={10} />;
    case "wallcab":
      return <B s={[w, 0.6, Math.max(d, 0.35)]} p={[0, 1.8, 0]} c={0xe2ddd3} />;
    case "hood":
      return <B s={[w + 0.1, 0.35, d + 0.1]} p={[0, 2.05, 0]} c={0x8c9095} o={{ metalness: 0.6, roughness: 0.35 }} />;
    default:
      return <B s={[w, hh, t]} p={[0, bot + hh / 2, 0]} c={0xd9c79e} />;
  }
}

const Placed = memo(function Placed({ el, ctx }: { el: PlanElement; ctx: BuildCtx }) {
  return (
    <group position={[el.x, 0, el.y]} rotation={[0, (-el.rot * Math.PI) / 180, 0]}>
      <ElementModel el={el} ctx={ctx} />
    </group>
  );
});

// ───────────────────────── câmera ─────────────────────────

function CameraRig({ center, radius, topView, fitKey }: { center: THREE.Vector3; radius: number; topView: boolean; fitKey: string }) {
  const { camera, controls, invalidate, size } = useThree();
  useEffect(() => {
    const c = controls as unknown as OrbitControlsImpl | null;
    const cam = camera as THREE.PerspectiveCamera;
    // Distância para caber a planta inteira (considerando a tela estreita do celular)
    const aspect = size.width / Math.max(1, size.height);
    const vFov = (cam.fov * Math.PI) / 180;
    const fitH = radius / Math.tan(vFov / 2);
    const fitW = radius / (Math.tan(vFov / 2) * Math.min(1, aspect));
    const dist = Math.max(8, Math.max(fitH, fitW) * 1.15);
    if (topView) camera.position.set(center.x, center.y + dist, center.z + 0.01);
    else camera.position.set(center.x - dist * 0.42, center.y + dist * 0.72, center.z + dist * 0.55);
    camera.lookAt(center);
    if (c) {
      c.target.copy(center);
      c.update();
    }
    invalidate();
  }, [fitKey, topView, controls]);
  return null;
}

// ───────────────────────── nomes sobre a cena ─────────────────────────

interface Label3D {
  key: string;
  pos: [number, number, number];
  text: string;
  tableId?: string;
  state?: TableState;
  /** Andar de baixo na vista com todos: fica mais apagado. */
  dim?: boolean;
}

/**
 * Reposiciona os nomes (DOM comum, fora do canvas) a cada quadro desenhado.
 * Sem uma raiz React por nome: troca de vista e de andar sem erro ao desmontar.
 */
function LabelProjector({ labels, nodes }: { labels: Label3D[]; nodes: React.RefObject<Map<string, HTMLElement>> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [labels, invalidate]);
  useFrame(({ camera, size }) => {
    for (const l of labels) {
      const node = nodes.current?.get(l.key);
      if (!node) continue;
      v.set(l.pos[0], l.pos[1], l.pos[2]).project(camera);
      const onScreen = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      node.style.visibility = onScreen ? "visible" : "hidden";
      // Mais perto da câmera fica por cima
      node.style.zIndex = String(Math.round((1 - v.z) * 1000));
    }
  });
  return null;
}

// ───────────────────────── cena ─────────────────────────

export default function Scene3D({
  elements,
  levels,
  levelHeight,
  level,
  tableStates,
  selected,
  tableLabels,
  highWalls,
  topView,
  showLabels,
  onPickTable,
}: Scene3DProps) {
  const wallH = highWalls ? 2.8 : 1.3;
  const gap = level === "all" ? levelHeight + 3.2 : 0;
  const shown = useMemo(() => {
    const ids = level === "all" ? levels.map((l) => l.id) : [level];
    return levels.filter((l) => ids.includes(l.id));
  }, [level, levels]);
  const offsetOf = useCallback(
    (id: string) => {
      const idx = shown.findIndex((l) => l.id === id);
      return idx < 0 ? 0 : idx * gap;
    },
    [shown, gap],
  );
  const visible = useMemo(
    () => elements.filter((e) => shown.some((l) => l.id === e.level) && e.kind !== "text"),
    [elements, shown],
  );

  const { center, radius } = useMemo(() => {
    const b = boundsOf(visible);
    if (!b) return { center: new THREE.Vector3(0, 0, 0), radius: 10 };
    const midY = level === "all" ? ((shown.length - 1) * gap) / 2 : 0;
    return {
      center: new THREE.Vector3((b.minX + b.maxX) / 2, midY, (b.minY + b.maxY) / 2),
      radius: Math.max(b.maxX - b.minX, b.maxY - b.minY, level === "all" ? gap * 1.5 : 0) / 2,
    };
    // Reenquadra ao trocar de andar, não a cada mesa movida
  }, [level, shown.length, gap]);

  const pick = useRef(onPickTable);
  pick.current = onPickTable;
  const tableIdsKey = visible
    .filter((e) => e.kind === "table")
    .map((e) => e.id)
    .join("|");
  const pickers = useMemo(() => {
    const m = new Map<string, (e: ThreeEvent<MouseEvent>) => void>();
    for (const id of tableIdsKey.split("|")) {
      if (!id) continue;
      m.set(id, (e) => {
        e.stopPropagation();
        if (e.delta > 6) return; // foi um arrasto da câmera
        pick.current?.(id);
      });
    }
    return m;
  }, [tableIdsKey]);

  const labels: Label3D[] = useMemo(() => {
    if (!showLabels) return [];
    const out: Label3D[] = [];
    const top = shown[shown.length - 1]?.id;
    for (const el of visible) {
      const y0 = offsetOf(el.level);
      const dim = level === "all" && el.level !== top;
      if (el.kind === "table")
        out.push({ key: `t-${el.id}`, pos: [el.x, y0 + 1.25, el.y], text: tableLabels?.get(el.id) ?? el.label ?? "", tableId: el.id, state: tableStates?.get(el.id), dim });
      else if (el.kind === "room" && el.label && !el.hideLabel && level !== "all")
        out.push({ key: `r-${el.id}`, pos: [el.x + (el.lx ?? 0), y0 + 2.6, el.y + (el.ly ?? 0)], text: el.label });
    }
    return out;
  }, [visible, showLabels, tableLabels, tableStates, offsetOf, shown, level]);
  const nodes = useRef(new Map<string, HTMLElement>());

  const fitKey = `${level}|${visible.length > 0}`;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-primary-gold/15 bg-[#14110e]">
      <Canvas
        shadows="percentage"
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 30, 30] }}
        gl={{ antialias: true }}
        style={{ touchAction: "none" }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(0x14110e);
          scene.fog = new THREE.Fog(0x14110e, 70, 180);
        }}
      >
        <hemisphereLight args={[0xfff1d6, 0x2a2018, 0.8]} />
        <directionalLight
          position={[center.x - 12, center.y + 28, center.z + 18]}
          intensity={0.85}
          color={0xffe2b0}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-radius - 6}
          shadow-camera-right={radius + 6}
          shadow-camera-top={radius + 6}
          shadow-camera-bottom={-radius - 6}
          shadow-camera-near={1}
          shadow-camera-far={120}
        >
          <object3D attach="target" position={[center.x, center.y, center.z]} />
        </directionalLight>

        {shown.map((l) => (
          <group key={l.id} position={[0, offsetOf(l.id), 0]}>
            {visible
              .filter((e) => e.level === l.id)
              .map((el) => (
                <Placed
                  key={el.id}
                  el={el}
                  ctx={{
                    wallH,
                    levelHeight: level === "all" ? gap : levelHeight,
                    state: el.kind === "table" ? tableStates?.get(el.id) : undefined,
                    selected: el.kind === "table" && selected.has(el.id),
                    onPick: el.kind === "table" ? pickers.get(el.id) : undefined,
                  }}
                />
              ))}
          </group>
        ))}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={Math.PI * 0.47}
          minDistance={3}
          maxDistance={160}
          screenSpacePanning
        />
        <CameraRig center={center} radius={radius} topView={topView} fitKey={fitKey} />
        <LabelProjector labels={labels} nodes={nodes} />
      </Canvas>

      {/* Nomes: DOM comum por cima do canvas */}
      <div className="pointer-events-none absolute inset-0">
        {labels.map((l) => {
          const ref = (n: HTMLElement | null) => {
            if (n) nodes.current.set(l.key, n);
            else nodes.current.delete(l.key);
          };
          const style: React.CSSProperties = { position: "absolute", left: 0, top: 0, transform: "translate(-9999px, 0)" };
          if (!l.tableId)
            return (
              <span
                key={l.key}
                ref={ref}
                style={style}
                className="whitespace-nowrap rounded-full bg-primary-black/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-gold/85"
              >
                {l.text}
              </span>
            );
          const color = l.state ? STATE_META[l.state].color : "#d6b268";
          const ink = l.state ? STATE_META[l.state].ink : "#15110d";
          const isSel = selected.has(l.tableId);
          return (
            <button
              key={l.key}
              ref={ref}
              type="button"
              onClick={() => onPickTable?.(l.tableId!)}
              style={{ ...style, background: color, color: ink, opacity: l.dim ? 0.5 : 1 }}
              className={`pointer-events-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold shadow-card ${isSel ? "outline outline-2 outline-white" : ""}`}
              aria-label={`Mesa ${l.text}`}
            >
              {l.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
