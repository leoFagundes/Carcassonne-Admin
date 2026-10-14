"use client";

import { GiHarp, GiShamrock } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { CLOVER_COLORS } from "../palettes";
import { LeprechaunHat, PotOfGold, RainbowArt, WallArt } from "../art";
import { GarlandRow } from "../rows";
import { Ink } from "../ink";
import { EmblemArt, Line, Part, place } from "../emblemKit";

// Folha em coração com a ponta no centro do trevo (girada para cada lado)
const LEAF =
  "M0 0C-1.5 -2.5 -9.5 -5.5 -9.5 -11C-9.5 -15 -5 -16.5 -1.8 -14C-1 -13.4 -0.4 -12.6 0 -12C0.4 -12.6 1 -13.4 1.8 -14C5 -16.5 9.5 -15 9.5 -11C9.5 -5.5 1.5 -2.5 0 0Z";
const LEAVES = [0, 120, -120].map((degrees) => ({
  degrees,
  d: place(LEAF, 24, 23, degrees),
  vein: place("M0 -1.5L0 -11.5", 24, 23, degrees),
}));

const look: BandLook = {
  particle: "clover",
  colors: CLOVER_COLORS,
  headerStrip: "celtic",
  sideStrip: "clover",
  cornerLeft: <Ink icon={GiShamrock} tone="clover" coarse />,
  cornerRight: <Ink icon={GiHarp} coarse />,
  emblem: <Emblem />,
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

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#6fd49b">
      <Line d="M24 24.5C25 31.5 28 37 33.5 41.5" width={2.2} />
      {LEAVES.map((leaf) => (
        <Part key={leaf.degrees} d={leaf.d} shade="M25 0L48 0L48 48L25 48Z" line={1.5}>
          <Line d={leaf.vein} width={0.9} opacity={0.85} />
        </Part>
      ))}
    </EmblemArt>
  );
}
