"use client";

import { useMemo, useRef } from "react";
import {
  GiCheckedShield,
  GiCrossedSwords,
  GiDiceSixFacesSix,
  GiKnightBanner,
  GiTrophyCup,
} from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { GOLD_GLITTER_COLORS } from "../palettes";
import { FullOnly, SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline } from "../art";
import { HangingRow, swagGeometry } from "../rows";
import { Roller } from "../actors";
import { Ink } from "../ink";

export default function TorneioScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);
  const rope = useMemo(
    () =>
      width > 0
        ? swagGeometry(width, { spacing: 160, depthRatio: 0.12, minDepth: 10, maxDepth: 22 })
        : null,
    [width],
  );

  return (
    <SceneLayer variant={variant} depth="back" layerRef={backRef}>
      <div className="st-sky-torneio absolute inset-0" />
      <FullOnly>
        {/* Holofotes da arena varrendo o céu */}
        <div className="st-spotlight st-spotlight-left" />
        <div className="st-spotlight st-spotlight-right" />
      </FullOnly>
      <ParticleCanvas kind="glitter" density={2} max={20} colors={GOLD_GLITTER_COLORS} />

      {/* Estandartes dos dois times */}
      {rope && (
        <>
          <svg
            viewBox={`0 0 ${width} ${rope.top + rope.depth + 6}`}
            className="absolute top-0 left-0 w-full h-auto"
          >
            <path d={rope.string} fill="none" stroke="#e6c56b" strokeOpacity="0.7" strokeWidth="1.3" />
            <path
              d={rope.string}
              fill="none"
              stroke="#5b4630"
              strokeOpacity="0.6"
              strokeWidth="0.6"
              strokeDasharray="3 3"
            />
          </svg>
          <HangingRow
            points={rope.junctions.slice(1, -1)}
            itemWidth="clamp(24px, 5.6cqmin, 50px)"
            chain={() => 3}
            render={(i) => <Ink icon={GiKnightBanner} tone={i % 2 ? "royal" : "crimson"} />}
          />
        </>
      )}

      <FullOnly>
        {/* Troféu no centro da arena, diante da Cité */}
        <div className="st-skyline-glow st-skyline-glow-gold" />
        <CastleSkyline tone="gold" width={width} />
        <div
          className="absolute st-trophy"
          style={{ left: "50%", bottom: "0.5%", width: "clamp(54px, 13cqmin, 118px)", translate: "-50% 0" }}
        >
          <Ink icon={GiTrophyCup} style={{ fill: "url(#st-grad-gold)", stroke: "#8a6a14" }} />
        </div>
        <div
          className="absolute"
          style={{ left: "3%", bottom: "0.5%", width: "clamp(44px, 10.5cqmin, 96px)" }}
        >
          <Ink icon={GiCrossedSwords} />
        </div>
        <div
          className="absolute"
          style={{ right: "3%", bottom: "0.5%", width: "clamp(34px, 8cqmin, 72px)", rotate: "8deg" }}
        >
          <Ink icon={GiCheckedShield} tone="royal" />
        </div>
        <div
          className="absolute"
          style={{
            right: "calc(3% + clamp(28px, 6.5cqmin, 60px))",
            bottom: "0.5%",
            width: "clamp(34px, 8cqmin, 72px)",
            rotate: "-8deg",
          }}
        >
          <Ink icon={GiCheckedShield} tone="crimson" />
        </div>
        <Roller layerRef={backRef} tumble className="bottom-[1%] w-[clamp(22px,5cqmin,40px)]">
          <Ink icon={GiDiceSixFacesSix} />
        </Roller>
      </FullOnly>
    </SceneLayer>
  );
}
