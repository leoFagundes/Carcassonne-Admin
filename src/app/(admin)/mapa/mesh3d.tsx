"use client";

import React from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three-stdlib";
import type { ThreeEvent } from "@react-three/fiber";
import { tex, type TexName } from "./textures3d";

// ───────────────────────── materiais e peças compartilhados ─────────────────────────

export const BOX = new THREE.BoxGeometry(1, 1, 1);
/** Cilindro de diâmetro 1 e altura 1 (escala vira elipse: mesa oval). */
export const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 40);
const SPHERE = new THREE.SphereGeometry(0.5, 20, 14);

const MATS = new Map<string, THREE.MeshStandardMaterial>();
export type MatOpts = {
  metalness?: number;
  roughness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  /** Textura (veio de madeira, tecido…), tingida pela cor. */
  map?: TexName;
  /** Vidro: 0 a 1. */
  opacity?: number;
};
export function mat(color: number | string, o: MatOpts = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${o.metalness ?? 0}|${o.roughness ?? 0.85}|${o.emissive ?? 0}|${o.emissiveIntensity ?? 0}|${o.map ?? ""}|${o.opacity ?? 1}`;
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      metalness: o.metalness ?? 0,
      roughness: o.roughness ?? 0.85,
      emissive: o.emissive ?? 0x000000,
      emissiveIntensity: o.emissiveIntensity ?? 0,
      map: o.map ? tex(o.map) : null,
      transparent: o.opacity !== undefined && o.opacity < 1,
      opacity: o.opacity ?? 1,
    });
    MATS.set(key, m);
  }
  return m;
}

type Ev = {
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
};
type V3 = [number, number, number];

/** Caixa pelo centro: tamanho [x, y, z], posição [x, y, z] nos eixos do elemento. */
export function B({ s, p, c, o, shadow = true, rot, ...ev }: { s: V3; p: V3; c: number | string; o?: MatOpts; shadow?: boolean; rot?: V3 } & Ev) {
  return <mesh geometry={BOX} material={mat(c, o)} scale={s} position={p} rotation={rot} castShadow={shadow} receiveShadow {...ev} />;
}

const RGEO = new Map<string, THREE.BufferGeometry>();
function roundedGeo(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const k = [w, h, d, r].map((v) => v.toFixed(3)).join("|");
  let g = RGEO.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
    RGEO.set(k, g);
  }
  return g;
}

/** Caixa com quinas arredondadas (tampo, almofada, eletrodoméstico). */
export function RB({ s, p, c, o, r = 0.02, shadow = true, rot, ...ev }: { s: V3; p: V3; c: number | string; o?: MatOpts; r?: number; shadow?: boolean; rot?: V3 } & Ev) {
  return <mesh geometry={roundedGeo(s[0], s[1], s[2], r)} material={mat(c, o)} position={p} rotation={rot} castShadow={shadow} receiveShadow {...ev} />;
}

export function Cyl({
  r,
  h,
  p,
  c,
  o,
  seg = 16,
  r2,
  rot,
  shadow = true,
  ...ev
}: { r: number; h: number; p: V3; c: number | string; o?: MatOpts; seg?: number; r2?: number; rot?: V3; shadow?: boolean } & Ev) {
  return (
    <mesh position={p} rotation={rot} material={mat(c, o)} castShadow={shadow} receiveShadow {...ev}>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    </mesh>
  );
}

/** Esfera (ou elipsoide com `s`). */
export function Ball({ s, p, c, o, shadow = true }: { s: V3; p: V3; c: number | string; o?: MatOpts; shadow?: boolean }) {
  return <mesh geometry={SPHERE} material={mat(c, o)} scale={s} position={p} castShadow={shadow} receiveShadow />;
}

/** Anel (aro de barril, borda de prato, arco). */
export function Ring({ r, tube, p, rot, c, o, arc = Math.PI * 2 }: { r: number; tube: number; p: V3; rot?: V3; c: number | string; o?: MatOpts; arc?: number }) {
  return (
    <mesh position={p} rotation={rot} material={mat(c, o)} castShadow>
      <torusGeometry args={[r, tube, 8, 32, arc]} />
    </mesh>
  );
}
