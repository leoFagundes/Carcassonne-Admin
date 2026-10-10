"use client";

import { useRef } from "react";
import { GiLockedHeart, GiRose, GiWingedArrow } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { HEART_COLORS, ROSE_PETAL_COLORS } from "../palettes";
import { SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline } from "../art";
import { GarlandRow } from "../rows";
import { Flyers } from "../actors";
import { Ink } from "../ink";

export default function NamoradosScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-sky-namorados absolute inset-0" />
        <ParticleCanvas kind="petal" density={3.5} max={36} colors={ROSE_PETAL_COLORS} />
        <div className="st-garland">
          <GarlandRow width={width} kind="roses" />
        </div>

        {/* Roseiras e o cadeado do amor na muralha */}
        <div className="st-skyline-glow st-skyline-glow-rose" />
        <CastleSkyline tone="gold" width={width} />
        <div
          className="absolute st-glow-rose"
          style={{ left: "2%", bottom: "0.5%", width: "clamp(44px, 10.5cqmin, 96px)", rotate: "-10deg" }}
        >
          <Ink icon={GiRose} tone="rose" />
        </div>
        <div
          className="absolute st-glow-rose"
          style={{
            left: "calc(2% + clamp(34px, 8cqmin, 74px))",
            bottom: "0.5%",
            width: "clamp(32px, 7.5cqmin, 68px)",
            rotate: "12deg",
          }}
        >
          <Ink icon={GiRose} tone="rose" />
        </div>
        <div
          className="absolute st-glow-gold"
          style={{ right: "5%", bottom: "clamp(10px, 2.5cqmin, 24px)", width: "clamp(26px, 6cqmin, 54px)", rotate: "8deg" }}
        >
          <Ink icon={GiLockedHeart} />
        </div>
        <div
          className="absolute st-glow-rose"
          style={{ right: "calc(5% + clamp(28px, 6.5cqmin, 58px))", bottom: "0.5%", width: "clamp(36px, 8.5cqmin, 78px)" }}
        >
          <Ink icon={GiRose} tone="rose" />
        </div>
      </SceneLayer>

      {/* Flechas de cupido cruzando a tela e coraçõezinhos subindo */}
      <SceneLayer variant={variant} depth="front" layerRef={frontRef}>
        <Flyers
          layerRef={frontRef}
          count={2}
          speed={[180, 260]}
          gap={[5, 11]}
          band={[0.12, 0.5]}
          wobble={0.06}
          curviness={0.8}
          autoRotate={135}
          className="w-[clamp(34px,8cqmin,62px)] st-glow-rose"
          render={() => <Ink icon={GiWingedArrow} tone="rose" coarse />}
        />
        <ParticleCanvas kind="heart" density={1.2} max={12} colors={HEART_COLORS} />
      </SceneLayer>
    </>
  );
}
