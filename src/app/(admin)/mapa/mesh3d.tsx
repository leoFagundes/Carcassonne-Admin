"use client";

import React from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

// ───────────────────────── materiais e caixas compartilhados ─────────────────────────

export const BOX = new THREE.BoxGeometry(1, 1, 1);
/** Cilindro de diâmetro 1 e altura 1 (escala vira elipse: mesa oval). */
export const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 40);
const MATS = new Map<string, THREE.MeshStandardMaterial>();
export type MatOpts = { metalness?: number; roughness?: number; emissive?: number; emissiveIntensity?: number };
export function mat(color: number | string, o: MatOpts = {}): THREE.MeshStandardMaterial {
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
export function B({
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

export function Cyl({ r, h, p, c, o, seg = 16, r2 }: { r: number; h: number; p: [number, number, number]; c: number; o?: MatOpts; seg?: number; r2?: number }) {
  return (
    <mesh position={p} material={mat(c, o)} castShadow receiveShadow>
      <cylinderGeometry args={[r, r2 ?? r, h, seg]} />
    </mesh>
  );
}
