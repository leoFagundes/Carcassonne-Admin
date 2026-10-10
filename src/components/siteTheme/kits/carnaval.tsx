"use client";

import { GiCarnivalMask, GiDramaMasks, GiJesterHat, GiTambourine, GiTwoFeathers } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { CARNIVAL_COLORS, CONFETTI_COLORS } from "../palettes";
import { SerpentineCurlArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";

const look: BandLook = {
  particle: "confetti",
  colors: CONFETTI_COLORS,
  headerStrip: "serpentine",
  sideStrip: "serpentine",
  stripColors: CARNIVAL_COLORS,
  cornerLeft: (
    <div className="st-glow-magenta">
      <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
    </div>
  ),
  cornerRight: <Ink icon={GiTambourine} coarse />,
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute left-[6%] bottom-[6px] w-[38%]">
        <div className="absolute w-[56%] left-[-12%] bottom-[34%] rotate-[-22deg]">
          <Ink icon={GiTwoFeathers} style={{ fill: "#8b5cf6", fillOpacity: 0.8 }} />
        </div>
        <div className="relative st-glow-magenta">
          <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
        </div>
      </div>
      <div className="absolute right-[6%] bottom-[4px] w-[32%] st-glow-teal">
        <Ink icon={GiDramaMasks} style={{ fill: "#19c3b2", fillOpacity: 0.8 }} />
      </div>
    </>
  ),
};

export function Band({ variant }: { variant: BandVariant }) {
  return <BandFrame look={look} variant={variant} />;
}

export function Accessory({ placement }: { placement: AccessoryPlacement }) {
  return (
    <AccessorySlot placement={placement} kind="hat">
      <Ink icon={GiJesterHat} tone="night" style={{ fill: "#8b5cf6", fillOpacity: 0.85 }} />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 15% 0%, rgba(255,62,165,0.3), transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(25,195,178,0.26), transparent 45%), radial-gradient(ellipse at 50% 110%, rgba(139,92,246,0.34), transparent 55%), linear-gradient(180deg, #1c1224 0%, #121111 100%)">
      <div className="st-thumb-confetti absolute inset-0" />
      <div className="absolute top-0 inset-x-0 overflow-hidden">
        <OrnamentStrip kind="bunting" length={THUMB_WIDTH} thickness={24} colors={CARNIVAL_COLORS} />
      </div>
      <div className="absolute top-5 left-[30%] w-[7px] st-thumb-swing">
        <SerpentineCurlArt color="#19c3b2" loops={4} />
      </div>
      <div className="absolute top-5 left-[68%] w-[7px] st-thumb-swing" style={{ animationDelay: "-1s" }}>
        <SerpentineCurlArt color="#ffd23f" loops={3} />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-1 left-3 w-14 st-glow-magenta">
        <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
      </div>
      <div className="absolute bottom-0.5 right-3 w-12 st-glow-teal">
        <Ink icon={GiDramaMasks} style={{ fill: "#19c3b2", fillOpacity: 0.8 }} />
      </div>
    </ThumbFrame>
  );
}
