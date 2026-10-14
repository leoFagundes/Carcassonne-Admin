"use client";

import { GiHeartWings, GiLockedHeart, GiRose, GiWingedArrow } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { HEART_COLORS } from "../palettes";
import { RoseWreathArt, WallArt } from "../art";
import { GarlandRow } from "../rows";
import { Ink } from "../ink";
import { EmblemArt, Line, Part } from "../emblemKit";

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
  emblem: <Emblem />,
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

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#ff9eb5">
      {/* Flecha atravessando o coração: a haste passa por trás dele */}
      <Line d="M6 41L42 7" width={1.6} />
      <Line d="M6 41L4.6 36.4M6 41L10.6 42.4M8.6 38.6L7.2 34M8.6 38.6L13.2 40" width={1.1} />
      <Part
        d="M24 40C12.5 31.5 7.5 24.5 7.5 17.5C7.5 11.5 12 7.5 17 7.5C20.2 7.5 22.6 9.3 24 11.8C25.4 9.3 27.8 7.5 31 7.5C36 7.5 40.5 11.5 40.5 17.5C40.5 24.5 35.5 31.5 24 40Z"
        shade="M29 4C34.5 14 34 28 25 44L46 44L46 4Z"
      >
        <Line d="M11.8 15.6C12.2 13 14.2 11.4 16.8 11.2" width={1} opacity={0.75} />
      </Part>
      <Part d="M43 6L35.8 8.4L40.6 13.2Z" line={1.2} />
    </EmblemArt>
  );
}
