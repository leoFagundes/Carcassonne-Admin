"use client";

import { GiHeartWings, GiLockedHeart, GiRose, GiWingedArrow } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { HEART_COLORS } from "../palettes";
import { RoseWreathArt, WallArt } from "../art";
import { GarlandRow } from "../rows";
import { Ink } from "../ink";

const look: BandLook = {
  particle: "heart",
  colors: HEART_COLORS,
  headerStrip: "roses",
  sideStrip: "roses",
  cornerLeft: (
    <div className="st-glow-rose">
      <Ink icon={GiRose} tone="rose" coarse />
    </div>
  ),
  cornerRight: <Ink icon={GiHeartWings} tone="rose" coarse />,
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute left-[6%] bottom-[2px] w-[26%] -rotate-12 st-glow-rose">
        <Ink icon={GiRose} tone="rose" />
      </div>
      <div className="absolute left-[28%] bottom-[2px] w-[20%] rotate-12 st-glow-rose">
        <Ink icon={GiRose} tone="rose" />
      </div>
      <div className="absolute right-[10%] bottom-[10px] w-[20%] st-glow-gold">
        <Ink icon={GiLockedHeart} />
      </div>
      <div className="absolute right-[8%] top-[6%] w-[30%] st-thumb-flutter">
        <Ink icon={GiHeartWings} tone="rose" coarse />
      </div>
    </>
  ),
};

export function Band({ variant }: { variant: BandVariant }) {
  return <BandFrame look={look} variant={variant} />;
}

export function Accessory({ placement }: { placement: AccessoryPlacement }) {
  return (
    <AccessorySlot placement={placement} kind="crown">
      <RoseWreathArt />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 50% 110%, rgba(180,30,70,0.38), transparent 55%), radial-gradient(ellipse at 85% 5%, rgba(255,120,160,0.24), transparent 45%), linear-gradient(180deg, #1d0f15 0%, #121111 100%)">
      <div className="absolute top-0 inset-x-0">
        <GarlandRow width={THUMB_WIDTH} kind="roses" />
      </div>
      <div className="absolute top-10 left-[36%] w-9 -rotate-[30deg] st-glow-rose">
        <Ink icon={GiWingedArrow} tone="rose" coarse />
      </div>
      <div className="absolute top-9 right-[10%] w-8 st-thumb-flutter">
        <Ink icon={GiHeartWings} tone="rose" coarse />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-0.5 left-3 w-10 -rotate-12 st-glow-rose">
        <Ink icon={GiRose} tone="rose" />
      </div>
      <div className="absolute bottom-0.5 left-11 w-8 rotate-12 st-glow-rose">
        <Ink icon={GiRose} tone="rose" />
      </div>
      <div className="absolute bottom-2 right-4 w-7 st-glow-gold">
        <Ink icon={GiLockedHeart} />
      </div>
    </ThumbFrame>
  );
}
