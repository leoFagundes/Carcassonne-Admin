"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import {
  GiDiceSixFacesFive,
  GiKnightBanner,
  GiMeeple,
  GiMeepleKing,
  GiVerticalBanner,
} from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { GOLD_GLITTER_COLORS, MEEPLE_COLORS, TILE_COLORS } from "../palettes";
import { SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CakeWithCandles, CastleSkyline } from "../art";
import { HangingRow, swagGeometry } from "../rows";
import { JumpingCrowd, Roller } from "../actors";
import { Ink } from "../ink";

const meepleStyle = (color: string): CSSProperties => ({
  fill: color,
  fillOpacity: 0.85,
  stroke: "#e6c56b",
});

// O aniversariante (o rei) no meio da fileira
const CROWD = [
  <Ink key="0" icon={GiMeeple} style={meepleStyle(MEEPLE_COLORS[0])} />,
  <Ink key="1" icon={GiMeeple} style={meepleStyle(MEEPLE_COLORS[1])} />,
  <Ink key="2" icon={GiMeepleKing} style={{ fill: "url(#st-grad-gold)", stroke: "#8a6a14" }} />,
  <Ink key="3" icon={GiMeeple} style={meepleStyle(MEEPLE_COLORS[3])} />,
  <Ink key="4" icon={GiMeeple} style={meepleStyle(MEEPLE_COLORS[4])} />,
];

export default function AniversarioScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);
  const rope = useMemo(
    () =>
      width > 0
        ? swagGeometry(width, { spacing: 170, depthRatio: 0.12, minDepth: 10, maxDepth: 22 })
        : null,
    [width],
  );

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-sky-aniversario absolute inset-0" />
        <ParticleCanvas kind="tile" density={3} max={28} colors={TILE_COLORS} />

        {/* Estandartes nas cores dos meeples, pendurados numa corda dourada */}
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
              itemWidth="clamp(22px, 5.4cqmin, 48px)"
              chain={() => 3}
              render={(i) => (
                <Ink
                  icon={i % 2 ? GiVerticalBanner : GiKnightBanner}
                  style={meepleStyle(MEEPLE_COLORS[i % MEEPLE_COLORS.length])}
                />
              )}
            />
          </>
        )}

        {/* A festa diante da Cité: meeples pulando, bolo e um dado rolando */}
        <div className="st-skyline-glow st-skyline-glow-gold" />
        <CastleSkyline tone="gold" width={width} />
        <JumpingCrowd
          className="left-[3%] bottom-[0.5%] gap-[2px]"
          itemClassName="w-[clamp(20px,4.6cqmin,40px)]"
          items={CROWD}
        />
        <div
          className="absolute st-glow-gold"
          style={{ right: "4%", bottom: "0.5%", width: "clamp(56px, 13cqmin, 122px)" }}
        >
          <CakeWithCandles />
        </div>
        <Roller layerRef={backRef} tumble className="bottom-[1%] w-[clamp(22px,5cqmin,40px)]">
          <Ink icon={GiDiceSixFacesFive} />
        </Roller>
      </SceneLayer>

      <SceneLayer variant={variant} depth="front">
        <ParticleCanvas kind="glitter" density={1.6} max={16} colors={GOLD_GLITTER_COLORS} />
      </SceneLayer>
    </>
  );
}
