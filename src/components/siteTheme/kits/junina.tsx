"use client";

import { GiAccordion, GiCampfire, GiCorn, GiWesternHat } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { CHITA_COLORS, EMBER_COLORS } from "../palettes";
import { PaperBalloonArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";
import { Dots, EmblemArt, Light, Line, Part, place } from "../emblemKit";

/** Fogueira com a luz tremulando atrás das chamas. */
function Campfire({ coarse = false }: { coarse?: boolean }) {
  return (
    <div className="relative st-glow-orange">
      <div className="st-campfire-light" />
      <Ink icon={GiCampfire} tone="orange" coarse={coarse} />
    </div>
  );
}

// Tora de lenha em volta da origem; duas, cruzadas, debaixo da chama
const LOG =
  "M-15 -3L15 -3C16.7 -3 18 -1.7 18 0C18 1.7 16.7 3 15 3L-15 3C-16.7 3 -18 1.7 -18 0C-18 -1.7 -16.7 -3 -15 -3Z";
const LOGS = [16, -16].map((degrees) => ({
  degrees,
  d: place(LOG, 24, 37.5, degrees),
  shade: place("M-20 0.4L20 0.4L20 5L-20 5Z", 24, 37.5, degrees),
  grain: place("M-12 -0.6L9 -0.6", 24, 37.5, degrees),
}));

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
  emblem: <Emblem />,
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

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#ff6b1a">
      {LOGS.map((log) => (
        <Part key={log.degrees} d={log.d} shade={log.shade} line={1.4}>
          <Line d={log.grain} width={0.8} opacity={0.8} />
        </Part>
      ))}
      <Part
        d="M24 6C27.5 11.5 33 15 32.5 23.5C32 30 28 33.5 24 33.5C20 33.5 15.5 30 15.5 23.5C15.5 18.5 19 16 20.5 11.5C21.8 14.2 23 15.5 24 16.5C24.6 13 23.5 9.5 24 6Z"
        shade="M26 4C30 14 33.5 25 27 36L46 36L46 4Z"
      />
      <Light
        d="M24 17.5C26.5 21 28.5 23.5 28 27.5C27.6 30.5 25.8 31.8 24 31.8C22.2 31.8 20.4 30.5 20 27.5C19.6 24.5 22 22 24 17.5Z"
        color="#ffcf5c"
        flicker
      />
      <Dots points={[[13.5, 12.5], [34.5, 10.5], [31, 6]]} r={0.9} color="#ffcf5c" />
    </EmblemArt>
  );
}
