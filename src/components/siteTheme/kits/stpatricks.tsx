"use client";

import { GiHarp, GiShamrock } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { CLOVER_COLORS } from "../palettes";
import { LeprechaunHat, PotOfGold, RainbowArt, WallArt } from "../art";
import { GarlandRow } from "../rows";
import { Ink } from "../ink";

const look: BandLook = {
  particle: "clover",
  colors: CLOVER_COLORS,
  headerStrip: "celtic",
  sideStrip: "clover",
  cornerLeft: <Ink icon={GiShamrock} tone="clover" coarse />,
  cornerRight: <Ink icon={GiHarp} coarse />,
  footer: (width) => (
    <>
      <div className="absolute right-[2%] bottom-[30px] w-[78%] opacity-80">
        <RainbowArt />
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute right-[4%] bottom-[2px] w-[30%] st-glow-gold">
        <PotOfGold />
      </div>
      <div className="absolute left-[6%] bottom-[2px] w-[22%]">
        <Ink icon={GiHarp} />
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
      <LeprechaunHat />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 15% 110%, rgba(47,191,113,0.34), transparent 55%), radial-gradient(ellipse at 85% 0%, rgba(230,197,107,0.2), transparent 45%), linear-gradient(180deg, #0f1a14 0%, #121111 100%)">
      <div className="absolute top-0 inset-x-0">
        <GarlandRow width={THUMB_WIDTH} kind="clover" />
      </div>
      <div className="absolute right-[6%] bottom-7 w-[58%] opacity-85">
        <RainbowArt />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-0.5 right-3 w-12 st-glow-gold">
        <PotOfGold />
      </div>
      <div className="absolute bottom-0.5 left-3 w-10">
        <Ink icon={GiHarp} />
      </div>
    </ThumbFrame>
  );
}
