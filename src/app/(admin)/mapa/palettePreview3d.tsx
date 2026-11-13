"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PaletteItem } from "@/floorplan/palette";
import type { PlanElement } from "@/floorplan/types";
import { ElementModel, type BuildCtx } from "./models3d";

const CTX: BuildCtx = { wallH: 3, levelHeight: 3, selected: false };

/** O objeto da paleta como elemento solto (centrado na origem). */
export function previewElement(item: PaletteItem): PlanElement {
  return {
    id: `preview-${item.id}`,
    level: "preview",
    kind: item.kind,
    x: 0,
    y: 0,
    w: item.w,
    d: item.d,
    rot: 0,
    variant: item.variant,
    shape: item.shape,
    count: item.count,
    seats: item.kind === "table" ? 4 : undefined,
  };
}

/** Gira o modelo devagar e enquadra a câmera no tamanho dele. */
function Spinner({ el }: { el: PlanElement }) {
  const g = useRef<THREE.Group>(null);
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    const grp = g.current;
    if (!grp) return;
    grp.rotation.y = 0;
    grp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(grp);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = Math.max(0.12, sphere.radius);
    const cam = camera as THREE.PerspectiveCamera;
    const dist = (r / Math.sin(((cam.fov * Math.PI) / 180) / 2)) * 1.02;
    const dir = new THREE.Vector3(0, 0.5, 1).normalize().multiplyScalar(dist);
    cam.position.copy(sphere.center).add(dir);
    cam.near = Math.max(0.01, dist / 60);
    cam.far = dist * 8;
    cam.lookAt(sphere.center);
    cam.updateProjectionMatrix();
    grp.rotation.y = -0.5;
    invalidate();
  }, [el, camera, invalidate]);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += Math.min(dt, 0.05) * 0.85;
  });
  return (
    <group ref={g}>
      <ElementModel el={el} ctx={CTX} />
    </group>
  );
}

/** Janela pequena com o objeto 3D girando (aparece ao passar o mouse na paleta). */
export default function PalettePreview3D({ item, active }: { item: PaletteItem | null; active: boolean }) {
  const el = useMemo(() => (item ? previewElement(item) : null), [item]);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ fov: 32, position: [2, 2, 3] }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ width: "100%", height: "100%" }}
    >
      <hemisphereLight args={[0xfff3df, 0x2a1f16, 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} color={0xc9d8ff} />
      {el && <Spinner key={el.id} el={el} />}
    </Canvas>
  );
}
