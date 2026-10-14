"use client";

import { useRef } from "react";
import { GiCrownCoin, GiHarp } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { CLOVER_COLORS, GOLD_GLITTER_COLORS } from "../palettes";
import { FullOnly, SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline, PotOfGold, RainbowArt } from "../art";
import { GarlandRow } from "../rows";
import { Roller } from "../actors";
import { Ink } from "../ink";

// O pé direito do arco-íris (a 87% da largura dele) cai no meio do pote
const POT_WIDTH = "clamp(54px, 13cqmin, 118px)";

export default function StPatricksScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-sky-stpatricks absolute inset-0" />
        <ParticleCanvas kind="clover" density={3} max={30} colors={CLOVER_COLORS} />
        <div className="st-garland">
          <GarlandRow width={width} kind="clover" />
        </div>

        <FullOnly>
          {/* Arco-íris terminando no pote de ouro, atrás da muralha */}
          <div
            className="absolute"
            style={{
              right: "calc(3% + clamp(27px, 6.5cqmin, 59px) - clamp(21px, 6cqmin, 55px))",
              bottom: "calc(0.5% + clamp(36px, 8.5cqmin, 80px))",
              width: "clamp(160px, 46cqmin, 420px)",
              opacity: 0.85,
            }}
          >
            <RainbowArt />
          </div>
          <CastleSkyline tone="gold" width={width} />
          <div
            className="absolute st-glow-gold"
            style={{ right: "3%", bottom: "0.5%", width: POT_WIDTH }}
          >
            <PotOfGold />
          </div>
          <div
            className="absolute"
            style={{ left: "3%", bottom: "0.5%", width: "clamp(40px, 9.5cqmin, 86px)" }}
          >
            <Ink icon={GiHarp} />
          </div>
          <Roller layerRef={backRef} className="bottom-[1%] w-[clamp(20px,4.6cqmin,38px)] st-glow-gold">
            <Ink icon={GiCrownCoin} style={{ fill: "url(#st-grad-gold)", stroke: "#8a6a14" }} />
          </Roller>
        </FullOnly>
      </SceneLayer>

      <SceneLayer variant={variant} depth="front">
        <ParticleCanvas kind="glitter" density={1} max={10} colors={GOLD_GLITTER_COLORS} />
      </SceneLayer>
    </>
  );
}
