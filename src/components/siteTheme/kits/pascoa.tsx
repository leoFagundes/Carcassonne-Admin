"use client";

import {
  GiButterfly,
  GiCastle,
  GiEasterEgg,
  GiFlowerEmblem,
  GiNestEggs,
  GiRabbit,
} from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { PETAL_COLORS } from "../palettes";
import { BunnyEarsArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";
import { Dots, EmblemArt, Line, Part } from "../emblemKit";

const look: BandLook = {
  particle: "petal",
  colors: PETAL_COLORS,
  headerStrip: "bunting",
  sideStrip: "vine",
  cornerLeft: <Ink icon={GiFlowerEmblem} style={{ fill: "#ffb3d1", fillOpacity: 0.85 }} />,
  cornerRight: <Ink icon={GiButterfly} style={{ fill: "#c4a7ff", fillOpacity: 0.85 }} />,
  emblem: <Emblem />,
  footer: () => (
    <>
      <div className="absolute left-[6%] bottom-[4px] w-[34%]">
        <Ink icon={GiNestEggs} />
      </div>
      <div className="absolute left-[40%] bottom-[6px] w-[12%] rotate-12">
        <Ink icon={GiEasterEgg} style={{ fill: "#9be7c4", fillOpacity: 0.9 }} />
      </div>
      <div className="absolute right-[8%] bottom-[4px] w-[30%]">
        <Ink icon={GiRabbit} tone="cream" />
      </div>
      <div className="absolute left-[56%] top-[8%] w-[14%] st-thumb-flutter">
        <Ink icon={GiButterfly} style={{ fill: "#ffb3d1", fillOpacity: 0.85 }} />
      </div>
    </>
  ),
};

export function Band({ variant }: { variant: BandVariant }) {
  return <BandFrame look={look} variant={variant} />;
}

export function Accessory({ placement }: { placement: AccessoryPlacement }) {
  return (
    <AccessorySlot placement={placement} kind="ears">
      <BunnyEarsArt />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 15% 10%, rgba(196,167,255,0.28), transparent 50%), radial-gradient(ellipse at 90% 100%, rgba(155,231,196,0.22), transparent 55%), linear-gradient(180deg, #1a1624 0%, #121111 100%)">
      <div className="absolute top-0 inset-x-0 overflow-hidden">
        <OrnamentStrip kind="bunting" length={THUMB_WIDTH} thickness={26} />
      </div>
      <div className="absolute top-9 left-[40%] w-8 st-thumb-flutter">
        <Ink icon={GiButterfly} style={{ fill: "#ffb3d1", fillOpacity: 0.85 }} />
      </div>
      <div className="absolute bottom-2.5 left-[46%] h-12">
        <Ink icon={GiCastle} tone="gold" fitHeight />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-0.5 left-3 w-14">
        <Ink icon={GiNestEggs} />
      </div>
      <div className="absolute bottom-1 left-[4.4rem] w-5 rotate-12">
        <Ink icon={GiEasterEgg} style={{ fill: "#c4a7ff", fillOpacity: 0.9 }} />
      </div>
      <div className="absolute bottom-0.5 right-3 w-14">
        <Ink icon={GiRabbit} tone="cream" />
      </div>
    </ThumbFrame>
  );
}

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#c4a7ff">
      <Part
        d="M24 6.5C31.5 6.5 37.5 18 37.5 28C37.5 36.5 31.5 41.5 24 41.5C16.5 41.5 10.5 36.5 10.5 28C10.5 18 16.5 6.5 24 6.5Z"
        shade="M29 4C35 14 36 32 30 44L46 44L46 4Z"
      >
        <Line d="M10 24.5L13.5 21L17 24.5L20.5 21L24 24.5L27.5 21L31 24.5L34.5 21L38 24.5" width={1.2} />
        <Line d="M10 27.2L38 27.2" width={0.9} opacity={0.8} />
        <Line
          d="M10 32C13 29.4 15.5 34.6 18.5 32C21.5 29.4 24 34.6 27 32C30 29.4 32.5 34.6 35.5 32C36.5 31.2 37.5 31 38.5 31.4"
          width={1.1}
        />
        <Dots points={[[18.6, 15.2], [24, 13], [29.4, 15.2]]} r={1.3} color="#ffb3d1" />
      </Part>
    </EmblemArt>
  );
}
