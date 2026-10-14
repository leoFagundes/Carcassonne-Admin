"use client";

import { GiBat, GiCastle, GiPointyHat, GiWhiteTower } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { EMBER_COLORS } from "../palettes";
import { EngravedMoon, PumpkinLantern, SpiderWebArt, WallArt } from "../art";
import { Ink } from "../ink";
import { EmblemArt, Light, Line, Part } from "../emblemKit";

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
  emblem: <Emblem />,
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

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  const face = "#ffb347";
  return (
    <EmblemArt hatch="#ffa040">
      <Line d="M24.5 13.5C24 10 25 7.8 28.2 6.4" width={2.4} />
      <Line d="M26.2 10C29 8.4 32 9.3 32.6 12.4" width={1.1} />
      <Part
        d="M24 13C15 13 8 18.5 8 27.5C8 36 14.5 41 24 41C33.5 41 40 36 40 27.5C40 18.5 33 13 24 13Z"
        shade="M30 10C35 18 35.5 34 30 44L46 44L46 10Z"
      >
        <Line d="M24 13.5C18.5 17 17.5 35 24 40.5" width={1.1} />
        <Line d="M24 13.5C29.5 17 30.5 35 24 40.5" width={1.1} />
        <Line d="M15.5 15.6C11.6 20.5 11.4 33.5 16 38.6" width={1} opacity={0.8} />
        <Line d="M32.5 15.6C36.4 20.5 36.6 33.5 32 38.6" width={1} opacity={0.8} />
      </Part>
      {/* Rosto aceso pela vela */}
      <Light d="M14.5 25.2L17.6 20.4L20.7 25.2Z" color={face} flicker />
      <Light d="M27.3 25.2L30.4 20.4L33.5 25.2Z" color={face} flicker />
      <Light
        d="M13.8 29.4C18 35.4 30 35.4 34.2 29.4L31.2 30.6L29.6 28.6L27 31.2L24 28.8L21 31.2L18.4 28.6L16.8 30.6Z"
        color={face}
        flicker
      />
    </EmblemArt>
  );
}
