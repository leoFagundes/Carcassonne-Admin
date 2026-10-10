"use client";

import { GiAccordion, GiCampfire, GiCorn, GiWesternHat } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { CHITA_COLORS, EMBER_COLORS } from "../palettes";
import { PaperBalloonArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";

/** Fogueira com a luz tremulando atrás das chamas. */
function Campfire({ coarse = false }: { coarse?: boolean }) {
  return (
    <div className="relative st-glow-orange">
      <div className="st-campfire-light" />
      <Ink icon={GiCampfire} tone="orange" coarse={coarse} />
    </div>
  );
}

const look: BandLook = {
  particle: "ember",
  colors: EMBER_COLORS,
  headerStrip: "bunting",
  sideStrip: "bunting",
  stripColors: CHITA_COLORS,
  cornerLeft: <Campfire coarse />,
  cornerRight: (
    <div className="st-glow-orange w-[80%] mx-auto">
      <PaperBalloonArt />
    </div>
  ),
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="amber" />
      </div>
      <div className="absolute left-[36%] bottom-[2px] w-[30%]">
        <Campfire />
      </div>
      <div className="absolute left-[6%] bottom-[2px] w-[16%] -rotate-12">
        <Ink icon={GiCorn} tone="straw" />
      </div>
      <div className="absolute right-[6%] bottom-[2px] w-[22%]">
        <Ink icon={GiAccordion} />
      </div>
      <div className="absolute right-[14%] top-[4%] w-[12%] st-glow-orange st-thumb-flutter">
        <PaperBalloonArt />
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
      <Ink icon={GiWesternHat} tone="straw" />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 50% 110%, rgba(255,120,40,0.4), transparent 55%), radial-gradient(ellipse at 50% -10%, rgba(40,70,140,0.3), transparent 60%), linear-gradient(180deg, #141a2a 0%, #121111 100%)">
      <div className="absolute top-0 inset-x-0 overflow-hidden">
        <OrnamentStrip kind="bunting" length={THUMB_WIDTH} thickness={26} colors={CHITA_COLORS} />
      </div>
      <div className="absolute top-8 right-[14%] w-5 st-glow-orange st-thumb-flutter">
        <PaperBalloonArt />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="amber" />
      </div>
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-14">
        <Campfire />
      </div>
      <div className="absolute bottom-0.5 left-3 w-7 -rotate-12">
        <Ink icon={GiCorn} tone="straw" />
      </div>
      <div className="absolute bottom-0.5 right-3 w-11">
        <Ink icon={GiAccordion} />
      </div>
    </ThumbFrame>
  );
}
