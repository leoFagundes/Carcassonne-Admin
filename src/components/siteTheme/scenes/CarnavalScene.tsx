"use client";

import { useMemo, useRef } from "react";
import { GiCarnivalMask, GiDramaMasks, GiTambourine, GiTwoFeathers } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { CARNIVAL_COLORS, CONFETTI_COLORS } from "../palettes";
import { FullOnly, SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline, SerpentineCurlArt } from "../art";
import { BuntingRow, HangingRow, swagGeometry } from "../rows";
import { StreamerThrow } from "../actors";
import { Ink } from "../ink";

const SPACING = 170;

export default function CarnavalScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);
  // Serpentinas enroladas penduradas no ponto mais baixo de cada gomo
  const lows = useMemo(
    () => (width > 0 ? swagGeometry(width, { spacing: SPACING }).swags.map((s) => s.low) : []),
    [width],
  );

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-sky-carnaval absolute inset-0" />
        <ParticleCanvas kind="confetti" density={6} max={64} colors={CONFETTI_COLORS} />

        {/* Flâmulas em losango e serpentinas penduradas */}
        <BuntingRow
          width={width}
          colors={CARNIVAL_COLORS}
          shapes={["diamond"]}
          pattern={(i) => (i % 3 === 0 ? "stripes" : "plain")}
          spacing={SPACING}
          every={22}
        />
        <HangingRow
          points={lows}
          itemWidth="clamp(9px, 2.2cqmin, 18px)"
          chain={() => 2}
          render={(i) => (
            <SerpentineCurlArt color={CARNIVAL_COLORS[(i + 1) % CARNIVAL_COLORS.length]} loops={4 + (i % 3)} />
          )}
        />

        <FullOnly>
          {/* Serpentinas sendo lançadas de vez em quando */}
          <StreamerThrow layerRef={backRef} colors={CARNIVAL_COLORS} />

          {/* Baile de máscaras diante da Cité */}
          <div className="st-skyline-glow st-skyline-glow-magenta" />
          <CastleSkyline tone="gold" width={width} />
          <div
            className="absolute"
            style={{ left: "3%", bottom: "1%", width: "clamp(56px, 13cqmin, 120px)" }}
          >
            <div className="absolute w-[58%] left-[-16%] bottom-[34%] rotate-[-22deg]">
              <Ink icon={GiTwoFeathers} style={{ fill: "#8b5cf6", fillOpacity: 0.8 }} />
            </div>
            <div className="relative st-glow-magenta">
              <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
            </div>
          </div>
          <div
            className="absolute st-glow-teal"
            style={{ right: "3%", bottom: "0.5%", width: "clamp(48px, 11.5cqmin, 104px)" }}
          >
            <Ink icon={GiDramaMasks} style={{ fill: "#19c3b2", fillOpacity: 0.8 }} />
          </div>
          <div
            className="absolute"
            style={{
              right: "calc(3% + clamp(42px, 10cqmin, 92px))",
              bottom: "0.5%",
              width: "clamp(28px, 6.5cqmin, 58px)",
              rotate: "-14deg",
            }}
          >
            <Ink icon={GiTambourine} />
          </div>
        </FullOnly>
      </SceneLayer>

      <SceneLayer variant={variant} depth="front">
        <ParticleCanvas kind="confetti" density={1.2} max={12} colors={CONFETTI_COLORS} />
      </SceneLayer>
    </>
  );
}
