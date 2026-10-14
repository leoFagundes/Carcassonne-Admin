"use client";

import { GiCastle, GiLanternFlame, GiPineTree, GiPolarStar, GiTensionSnowflake } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { SNOW_COLORS } from "../palettes";
import { CrownWithHolly, SnowGroundArt } from "../art";
import { EvergreenGarland } from "../rows";
import { Ink } from "../ink";
import { Dots, EmblemArt, Light, Line, Part, star } from "../emblemKit";

const look: BandLook = {
  particle: "snow",
  colors: SNOW_COLORS,
  headerStrip: "evergreen",
  sideStrip: "evergreen",
  cornerLeft: <Ink icon={GiTensionSnowflake} tone="frost" coarse />,
  cornerRight: (
    <div className="st-star-glow">
      <Ink icon={GiPolarStar} coarse />
    </div>
  ),
  emblem: <Emblem />,
  footer: () => (
    <>
      <div className="absolute left-[44%] top-[2%] w-[16%] st-star-glow">
        <Ink icon={GiPolarStar} coarse />
      </div>
      <div className="absolute left-[6%] bottom-[8px] h-[72%]">
        <Ink icon={GiPineTree} tone="pine" fitHeight />
      </div>
      <div className="absolute left-[30%] bottom-[8px] h-[48%]">
        <Ink icon={GiPineTree} tone="pine" fitHeight />
      </div>
      <div className="absolute right-[8%] bottom-[8px] h-[60%]">
        <Ink icon={GiPineTree} tone="pine" fitHeight />
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-[30px]">
        <SnowGroundArt />
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
      <CrownWithHolly />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 0% 100%, rgba(42,157,92,0.3), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(230,57,70,0.24), transparent 55%), linear-gradient(180deg, #111a17 0%, #121111 100%)">
      <div className="st-thumb-snow absolute inset-0" />
      <div className="absolute top-0 inset-x-0">
        <EvergreenGarland width={THUMB_WIDTH} />
      </div>
      <div className="absolute top-6 left-[48%] w-5 st-thumb-swing">
        <Ink icon={GiLanternFlame} />
      </div>
      <div className="absolute top-9 right-[12%] w-7 st-star-glow st-twinkle">
        <Ink icon={GiPolarStar} coarse />
      </div>
      <div className="absolute bottom-1 left-3 h-14">
        <Ink icon={GiPineTree} tone="pine" fitHeight />
      </div>
      <div className="absolute bottom-1 left-12 h-10">
        <Ink icon={GiPineTree} tone="pine" fitHeight />
      </div>
      <div className="absolute bottom-2.5 left-[46%] h-12">
        <Ink icon={GiCastle} tone="frost" fitHeight />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-7">
        <SnowGroundArt />
      </div>
    </ThumbFrame>
  );
}

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#9cc7a4">
      <Part d="M21.6 35H26.4V41.5H21.6Z" shade="M24 30H30V44H24Z" line={1.5} />
      <Part
        d="M24 8.5L31.5 18L28 18L34.5 27L30.5 27L38.5 36.5L9.5 36.5L17.5 27L13.5 27L20 18L16.5 18Z"
        shade="M24 6L27 40L46 40L46 6Z"
      >
        <Line d="M14.5 31.5C20 34 28.5 33.5 33.6 30.5" width={1} opacity={0.85} />
        <Line d="M18.6 22.8C22 24.6 27 24.3 29.8 22.2" width={1} opacity={0.85} />
      </Part>
      <Dots points={[[17.6, 32.8], [29.4, 31.4], [21.6, 24.4], [27.6, 19.6]]} r={1.45} color="#ff6b6b" />
      {/* Estrela-guia no topo */}
      <Light d={star(24, 7.2, 4.6)} color="#f8e6a8" />
    </EmblemArt>
  );
}
