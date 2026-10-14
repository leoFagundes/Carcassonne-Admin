"use client";

import { GiBeerStein, GiCellarBarrels, GiPretzel, GiWheat } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { BAVARIA_COLORS, BUBBLE_COLORS } from "../palettes";
import { AlpineHatArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";
import { EMBLEM_LINE, EmblemArt, Line, Part } from "../emblemKit";

const look: BandLook = {
  particle: "bubble",
  colors: BUBBLE_COLORS,
  headerStrip: "hops",
  sideStrip: "hops",
  cornerLeft: <Ink icon={GiBeerStein} tone="amber" coarse />,
  cornerRight: <Ink icon={GiPretzel} tone="straw" coarse />,
  emblem: <Emblem />,
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

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#f2a65a">
      <Part
        d="M31 19C39.5 19 41.5 23.5 41.5 28C41.5 32.5 39.5 37 31 37L31 33C36 33 37.5 30.5 37.5 28C37.5 25.5 36 23 31 23Z"
        line={1.4}
      />
      <Part d="M10.5 16H32.5V39C32.5 40.4 31.4 41.5 30 41.5H13C11.6 41.5 10.5 40.4 10.5 39Z" shade="M26.5 10H46V46H26.5Z">
        <Line d="M10.5 22H32.5M10.5 36H32.5" width={1.1} />
        <Line d="M17.8 22V36M25.2 22V36" width={0.9} opacity={0.85} />
      </Part>
      {/* Espuma transbordando */}
      <Part
        d="M8.5 17C7 14 9 11 12 11.5C12.5 8 16.5 6.5 19.5 8.5C21.5 5.5 26.5 5.5 28 8.5C31 7 34.5 9 34 12.5C36 13.5 36 16.5 34 17.5C33.4 17.8 32.8 18 32.5 18L32.5 22C32.5 23.6 30 23.6 30 22L30 18L10 18C9.3 18 8.8 17.6 8.5 17Z"
        line={1.4}
      >
        <circle cx="16" cy="13" r="1.2" fill="none" stroke={EMBLEM_LINE} strokeWidth={0.8} />
        <circle cx="24" cy="11" r="1.5" fill="none" stroke={EMBLEM_LINE} strokeWidth={0.8} />
        <circle cx="29.5" cy="14" r="0.9" fill="none" stroke={EMBLEM_LINE} strokeWidth={0.8} />
      </Part>
    </EmblemArt>
  );
}
