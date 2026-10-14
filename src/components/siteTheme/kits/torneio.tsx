"use client";

import type { CSSProperties } from "react";
import { GiCrossedSwords, GiDiceSixFacesSix, GiKnightBanner, GiLaurelCrown, GiTrophyCup } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { GOLD_GLITTER_COLORS } from "../palettes";
import { WallArt } from "../art";
import { Ink } from "../ink";
import { EmblemArt, Light, Line, Part, star } from "../emblemKit";

const GOLD: CSSProperties = { fill: "url(#st-grad-gold)", stroke: "#8a6a14" };

const look: BandLook = {
  particle: "glitter",
  colors: GOLD_GLITTER_COLORS,
  headerStrip: "laurel",
  sideStrip: "laurel",
  cornerLeft: <Ink icon={GiCrossedSwords} coarse />,
  cornerRight: (
    <div className="st-glow-gold">
      <Ink icon={GiTrophyCup} style={GOLD} />
    </div>
  ),
  emblem: <Emblem />,
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute left-[36%] bottom-[2px] w-[28%] st-trophy">
        <Ink icon={GiTrophyCup} style={GOLD} />
      </div>
      <div className="absolute left-[6%] bottom-[2px] w-[24%]">
        <Ink icon={GiCrossedSwords} />
      </div>
      <div className="absolute right-[8%] bottom-[2px] w-[16%] rotate-12">
        <Ink icon={GiDiceSixFacesSix} />
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
      <Ink icon={GiLaurelCrown} style={GOLD} />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 50% -10%, rgba(255,230,160,0.26), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(200,50,60,0.28), transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(59,111,216,0.28), transparent 50%), linear-gradient(180deg, #17140f 0%, #121111 100%)">
      <svg viewBox="0 0 300 20" className="absolute top-0 inset-x-0 w-full h-auto" preserveAspectRatio="none">
        <path d="M0 3 Q75 17 150 3 Q225 17 300 3" fill="none" stroke="#e6c56b" strokeOpacity="0.7" strokeWidth="1.2" />
      </svg>
      {[0.24, 0.5, 0.76].map((left, i) => (
        <div
          key={left}
          className="absolute top-[3px] w-6 st-thumb-swing"
          style={{ left: `${left * 100}%`, translate: "-50% 0", animationDelay: `${-i * 0.6}s` }}
        >
          <Ink icon={GiKnightBanner} tone={i % 2 ? "royal" : "crimson"} />
        </div>
      ))}
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-12 st-trophy">
        <Ink icon={GiTrophyCup} style={GOLD} />
      </div>
      <div className="absolute bottom-0.5 left-3 w-11">
        <Ink icon={GiCrossedSwords} />
      </div>
      <div className="absolute bottom-1 right-4 w-7 rotate-12">
        <Ink icon={GiDiceSixFacesSix} />
      </div>
    </ThumbFrame>
  );
}

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#e6c56b">
      <Line d="M15 12C8.5 12 8 21.5 15.5 22.5" width={1.8} />
      <Line d="M33 12C39.5 12 40 21.5 32.5 22.5" width={1.8} />
      <Part d="M14.5 8.5H33.5V16.5C33.5 24 29.5 28.5 24 28.5C18.5 28.5 14.5 24 14.5 16.5Z" shade="M27 5C30.5 12 31 24 26 32L46 32L46 5Z">
        <Line d="M14.5 11.2H33.5" width={0.9} opacity={0.85} />
      </Part>
      <Part d="M22 28H26L25.4 33H22.6Z" line={1.3} />
      <Part d="M17 33H31V36.5H17Z" shade="M26 30H34V40H26Z" line={1.4} />
      <Part d="M14 36.5H34V41.5H14Z" shade="M27 34H38V44H27Z" line={1.5} />
      <Light d={star(24, 18.2, 3.6)} color="#ff8a8a" />
    </EmblemArt>
  );
}
