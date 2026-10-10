"use client";

import { useMemo, useRef } from "react";
import { GiChampagneCork, GiHourglass, GiRingingBell, GiWineGlass } from "react-icons/gi";
import ParticleCanvas, { type Rgb } from "../ParticleCanvas";
import FireworksCanvas from "../FireworksCanvas";
import { GOLD_GLITTER_COLORS } from "../palettes";
import { SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline, HangingStarArt } from "../art";
import { HangingRow, swagGeometry } from "../rows";
import { ToastPair } from "../actors";
import { Ink } from "../ink";

const FIREWORK_COLORS: readonly Rgb[] = [
  [255, 226, 150],
  [247, 231, 180],
  [255, 255, 255],
  [255, 170, 140],
  [180, 205, 255],
];

export default function ReveillonScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);
  const garland = useMemo(
    () =>
      width > 0
        ? swagGeometry(width, { spacing: 150, top: 2, depthRatio: 0.1, minDepth: 8, maxDepth: 18 })
        : null,
    [width],
  );

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-sky-reveillon absolute inset-0" />
        {/* Fogos atrás da Cité (o canvas vem antes da muralha) */}
        <FireworksCanvas colors={FIREWORK_COLORS} />
        <ParticleCanvas kind="glitter" density={3} max={30} colors={GOLD_GLITTER_COLORS} />

        {/* Estrelas penduradas num fio dourado e sinos nos cantos */}
        {garland && (
          <>
            <svg
              viewBox={`0 0 ${width} ${garland.top + garland.depth + 4}`}
              className="absolute top-0 left-0 w-full h-auto"
            >
              <path d={garland.string} fill="none" stroke="#e6c56b" strokeOpacity="0.55" strokeWidth="0.8" />
            </svg>
            <HangingRow
              points={garland.swags.map((s) => s.low)}
              itemWidth="clamp(16px, 3.8cqmin, 30px)"
              chain={(i) => 6 + (i % 3) * 12}
              render={(i) => <HangingStarArt points={i % 3 === 1 ? 4 : 5} />}
            />
          </>
        )}
        <div className="st-bell" style={{ left: "5%" }}>
          <div className="st-hang-chain" style={{ height: "clamp(14px, 3cqmin, 26px)" }} />
          <Ink icon={GiRingingBell} />
        </div>
        <div className="st-bell" style={{ right: "5%", animationDelay: "-0.9s" }}>
          <div className="st-hang-chain" style={{ height: "clamp(20px, 4.5cqmin, 40px)" }} />
          <Ink icon={GiRingingBell} />
        </div>

        {/* Brinde diante da Cité */}
        <div className="st-skyline-glow st-skyline-glow-reveillon" />
        <CastleSkyline tone="frost" width={width} />
        <div
          className="absolute st-glow-gold"
          style={{ left: "3%", bottom: "0.5%", width: "clamp(36px, 8.5cqmin, 74px)", rotate: "-10deg" }}
        >
          <Ink icon={GiChampagneCork} />
        </div>
        <div
          className="absolute"
          style={{
            left: "calc(3% + clamp(34px, 8cqmin, 70px))",
            bottom: "0.5%",
            width: "clamp(22px, 5cqmin, 44px)",
          }}
        >
          <Ink icon={GiHourglass} tone="frost" />
        </div>
        <ToastPair
          className="right-[4%] bottom-[1.5%] w-[clamp(80px,19cqmin,160px)] h-[clamp(52px,12.5cqmin,108px)]"
          left={<Ink icon={GiWineGlass} />}
          right={<Ink icon={GiWineGlass} />}
          splash="#fff8e1"
        />
      </SceneLayer>

      <SceneLayer variant={variant} depth="front">
        <ParticleCanvas kind="glitter" density={0.8} max={8} colors={GOLD_GLITTER_COLORS} />
      </SceneLayer>
    </>
  );
}
