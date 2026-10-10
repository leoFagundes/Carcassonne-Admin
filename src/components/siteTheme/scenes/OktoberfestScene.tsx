"use client";

import { useMemo, useRef } from "react";
import { GiBeerStein, GiCellarBarrels, GiHops, GiPretzel, GiWheat } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { BAVARIA_COLORS, BUBBLE_COLORS } from "../palettes";
import { SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline } from "../art";
import { BuntingRow, HangingRow, swagGeometry } from "../rows";
import { ToastPair } from "../actors";
import { Ink } from "../ink";

const SPACING = 200;

export default function OktoberfestScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);
  // Ramos de lúpulo pendurados nas emendas do varal
  const junctions = useMemo(
    () => (width > 0 ? swagGeometry(width, { spacing: SPACING }).junctions.slice(1, -1) : []),
    [width],
  );

  return (
    <SceneLayer variant={variant} depth="back" layerRef={backRef}>
      <div className="st-sky-oktoberfest absolute inset-0" />
      <ParticleCanvas kind="bubble" density={4} max={42} colors={BUBBLE_COLORS} />

      {/* Flâmulas da Baviera (losangos azuis e brancos) e lúpulo */}
      <BuntingRow
        width={width}
        colors={BAVARIA_COLORS}
        pattern={(i) => (i % 2 ? "plain" : "lozenge")}
        spacing={SPACING}
        every={24}
      />
      <HangingRow
        points={junctions}
        itemWidth="clamp(16px, 3.8cqmin, 32px)"
        chain={(i) => 4 + (i % 2) * 9}
        render={() => <Ink icon={GiHops} tone="pine" />}
      />

      {/* Cervejaria diante da Cité */}
      <div className="st-skyline-glow st-skyline-glow-amber" />
      <CastleSkyline tone="gold" width={width} />
      <div
        className="absolute"
        style={{ left: "1.5%", bottom: "0.5%", width: "clamp(72px, 17cqmin, 156px)" }}
      >
        <Ink icon={GiCellarBarrels} tone="amber" />
      </div>
      <div
        className="absolute"
        style={{
          left: "calc(1.5% + clamp(60px, 14.5cqmin, 134px))",
          bottom: "0.5%",
          width: "clamp(28px, 6.5cqmin, 58px)",
          rotate: "-8deg",
        }}
      >
        <Ink icon={GiPretzel} tone="straw" />
      </div>
      <div
        className="absolute"
        style={{ right: "3%", bottom: "0.5%", width: "clamp(34px, 8cqmin, 72px)" }}
      >
        <Ink icon={GiWheat} tone="straw" />
      </div>
      <ToastPair
        className="right-[13%] bottom-[1.5%] w-[clamp(90px,21cqmin,186px)] h-[clamp(44px,10.5cqmin,92px)]"
        left={<Ink icon={GiBeerStein} tone="amber" />}
        right={<Ink icon={GiBeerStein} tone="amber" />}
        splash="#fff3d0"
      />
    </SceneLayer>
  );
}
