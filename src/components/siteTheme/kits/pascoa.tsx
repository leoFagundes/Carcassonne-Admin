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

const look: BandLook = {
  particle: "petal",
  colors: PETAL_COLORS,
  headerStrip: "bunting",
  sideStrip: "vine",
  cornerLeft: <Ink icon={GiFlowerEmblem} style={{ fill: "#ffb3d1", fillOpacity: 0.85 }} />,
  cornerRight: <Ink icon={GiButterfly} style={{ fill: "#c4a7ff", fillOpacity: 0.85 }} />,
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
