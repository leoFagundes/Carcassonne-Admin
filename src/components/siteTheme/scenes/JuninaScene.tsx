"use client";

import { useRef } from "react";
import { GiAccordion, GiCampfire, GiCorn } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { CHITA_COLORS, EMBER_COLORS } from "../palettes";
import { FullOnly, SceneLayer, useLayerWidth, type SceneVariant } from "../sceneKit";
import { CastleSkyline, PaperBalloonArt } from "../art";
import { BuntingRow } from "../rows";
import { Flyers } from "../actors";
import { Ink } from "../ink";

const CHITA_REVERSED = [...CHITA_COLORS].reverse();
const BALLOON_COLORS = [
  ["#e63946", "#ffd23f", "#2f6db5"],
  ["#2a9d5c", "#ff8c42", "#e63946"],
];

export default function JuninaScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-sky-junina absolute inset-0" />
        <ParticleCanvas kind="ember" density={5} max={55} colors={EMBER_COLORS} />

        {/* Dois varais de bandeirinhas de chita, cruzando o topo */}
        <BuntingRow
          width={width}
          colors={CHITA_COLORS}
          shapes={["swallowtail"]}
          pattern="dots"
          spacing={150}
          every={21}
        />
        <FullOnly>
          <BuntingRow
            width={width}
            colors={CHITA_REVERSED}
            shapes={["swallowtail"]}
            pattern={(i) => (i % 2 ? "plain" : "dots")}
            spacing={230}
            every={24}
            style={{ top: "clamp(26px, 6.5cqmin, 58px)" }}
          />
        </FullOnly>

        <FullOnly>
          {/* Arraiá diante da Cité: fogueira no meio, milho e sanfona */}
          <div className="st-campfire-glow" />
          <CastleSkyline tone="amber" width={width} />
          <div
            className="absolute st-glow-orange"
            style={{ left: "50%", bottom: "0.5%", width: "clamp(64px, 15cqmin, 140px)", translate: "-50% 0" }}
          >
            <div className="relative">
              <div className="st-campfire-light" />
              <Ink icon={GiCampfire} tone="orange" />
            </div>
          </div>
          <div
            className="absolute"
            style={{ left: "3%", bottom: "0.5%", width: "clamp(30px, 7cqmin, 64px)", rotate: "-12deg" }}
          >
            <Ink icon={GiCorn} tone="straw" />
          </div>
          <div
            className="absolute"
            style={{
              left: "calc(3% + clamp(22px, 5cqmin, 46px))",
              bottom: "0.5%",
              width: "clamp(26px, 6cqmin, 54px)",
              rotate: "10deg",
            }}
          >
            <Ink icon={GiCorn} tone="straw" />
          </div>
          <div
            className="absolute"
            style={{ right: "4%", bottom: "0.5%", width: "clamp(40px, 9.5cqmin, 86px)" }}
          >
            <Ink icon={GiAccordion} />
          </div>
        </FullOnly>
      </SceneLayer>

      {/* Balões de papel subindo devagar pelas laterais */}
      <SceneLayer variant={variant} depth="front" layerRef={frontRef}>
        <Flyers
          layerRef={frontRef}
          count={2}
          mode="rise"
          sides
          speed={[22, 34]}
          gap={[4, 9]}
          wobble={0.05}
          curviness={1.2}
          scale={[0.85, 1.1]}
          className="w-[clamp(22px,5cqmin,40px)] st-glow-orange"
          render={(i) => <PaperBalloonArt colors={BALLOON_COLORS[i % BALLOON_COLORS.length]} />}
        />
      </SceneLayer>
    </>
  );
}
