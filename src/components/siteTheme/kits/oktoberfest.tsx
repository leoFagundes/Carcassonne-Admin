"use client";

import { GiBeerStein, GiCellarBarrels, GiPretzel, GiWheat } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { BAVARIA_COLORS, BUBBLE_COLORS } from "../palettes";
import { AlpineHatArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";

const look: BandLook = {
  particle: "bubble",
  colors: BUBBLE_COLORS,
  headerStrip: "hops",
  sideStrip: "hops",
  cornerLeft: <Ink icon={GiBeerStein} tone="amber" coarse />,
  cornerRight: <Ink icon={GiPretzel} tone="straw" coarse />,
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute left-[4%] bottom-[2px] w-[44%]">
        <Ink icon={GiCellarBarrels} tone="amber" />
      </div>
      <div className="absolute left-[52%] bottom-[4px] w-[18%] -rotate-6">
        <Ink icon={GiBeerStein} tone="amber" />
      </div>
      <div className="absolute right-[6%] bottom-[2px] w-[20%]">
        <Ink icon={GiWheat} tone="straw" />
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
      <AlpineHatArt />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 50% 110%, rgba(242,169,0,0.3), transparent 55%), radial-gradient(ellipse at 10% 0%, rgba(47,109,181,0.28), transparent 45%), linear-gradient(180deg, #1a160d 0%, #121111 100%)">
      <div className="absolute top-0 inset-x-0 overflow-hidden">
        <OrnamentStrip kind="bunting" length={THUMB_WIDTH} thickness={26} colors={BAVARIA_COLORS} />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-0.5 left-2 w-16">
        <Ink icon={GiCellarBarrels} tone="amber" />
      </div>
      <div className="absolute bottom-1 right-[34%] w-8 rotate-12">
        <Ink icon={GiBeerStein} tone="amber" />
      </div>
      <div className="absolute bottom-1 right-[17%] w-8 -rotate-12" style={{ transform: "scaleX(-1)" }}>
        <Ink icon={GiBeerStein} tone="amber" />
      </div>
      <div className="absolute bottom-0.5 right-2 w-7">
        <Ink icon={GiWheat} tone="straw" />
      </div>
    </ThumbFrame>
  );
}
