"use client";

import { GiBat, GiCastle, GiPointyHat, GiWhiteTower } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { EMBER_COLORS } from "../palettes";
import { EngravedMoon, PumpkinLantern, SpiderWebArt, WallArt } from "../art";
import { Ink } from "../ink";

const look: BandLook = {
  particle: "ember",
  colors: EMBER_COLORS,
  headerStrip: "thorns",
  sideStrip: "thorns",
  cornerLeft: (
    <div className="st-pumpkin-glow">
      <PumpkinLantern coarse />
    </div>
  ),
  cornerRight: <EngravedMoon />,
  footer: (width) => (
    <>
      <div className="absolute right-[8%] top-0 w-[30%]">
        <EngravedMoon />
      </div>
      <div className="absolute left-[10%] bottom-[18px] h-[58%]">
        <Ink icon={GiWhiteTower} tone="amber" fitHeight />
      </div>
      <div className="absolute left-[34%] bottom-[18px] h-[74%]">
        <Ink icon={GiCastle} tone="amber" fitHeight />
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="amber" />
      </div>
      <div className="absolute right-[6%] bottom-[2px] w-[26%] st-pumpkin-glow">
        <PumpkinLantern />
      </div>
    </>
  ),
};

export function Band({ variant }: { variant: BandVariant }) {
  return <BandFrame look={look} variant={variant} />;
}

export function Accessory({ placement }: { placement: AccessoryPlacement }) {
  return (
    <AccessorySlot placement={placement} kind="witch">
      <Ink icon={GiPointyHat} tone="night" />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(circle at 82% 22%, rgba(255,150,60,0.2), transparent 45%), radial-gradient(ellipse at 50% 120%, rgba(124,58,237,0.38), transparent 60%), linear-gradient(180deg, #1d1229 0%, #121111 100%)">
      <div className="absolute top-0 left-0 w-16">
        <SpiderWebArt />
      </div>
      <div className="absolute top-1 right-2 w-[4.6rem]">
        <EngravedMoon />
      </div>
      <div className="absolute top-6 left-[34%] w-9 st-flap">
        <Ink icon={GiBat} coarse />
      </div>
      <div className="absolute top-12 left-[54%] w-6 st-flap" style={{ animationDelay: "-0.1s" }}>
        <Ink icon={GiBat} coarse />
      </div>
      <div className="absolute bottom-2.5 left-[52%] h-11">
        <Ink icon={GiWhiteTower} tone="amber" fitHeight />
      </div>
      <div className="absolute bottom-2.5 left-[68%] h-14">
        <Ink icon={GiCastle} tone="amber" fitHeight />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="amber" />
      </div>
      <div className="absolute -bottom-1 left-3 w-12 st-pumpkin-glow">
        <PumpkinLantern />
      </div>
      <div className="absolute -bottom-0.5 left-[3.6rem] w-8 st-pumpkin-glow">
        <PumpkinLantern />
      </div>
    </ThumbFrame>
  );
}
