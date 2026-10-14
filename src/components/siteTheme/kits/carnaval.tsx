"use client";

import { GiCarnivalMask, GiDramaMasks, GiJesterHat, GiTambourine, GiTwoFeathers } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { CARNIVAL_COLORS, CONFETTI_COLORS } from "../palettes";
import { SerpentineCurlArt, WallArt } from "../art";
import { OrnamentStrip } from "../strips";
import { Ink } from "../ink";
import { EMBLEM_LINE, EmblemArt, Light, Line, Part } from "../emblemKit";

const look: BandLook = {
  particle: "confetti",
  colors: CONFETTI_COLORS,
  headerStrip: "serpentine",
  sideStrip: "serpentine",
  stripColors: CARNIVAL_COLORS,
  cornerLeft: (
    <div className="st-glow-magenta">
      <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
    </div>
  ),
  cornerRight: <Ink icon={GiTambourine} coarse />,
  emblem: <Emblem />,
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute left-[6%] bottom-[6px] w-[38%]">
        <div className="absolute w-[56%] left-[-12%] bottom-[34%] rotate-[-22deg]">
          <Ink icon={GiTwoFeathers} style={{ fill: "#8b5cf6", fillOpacity: 0.8 }} />
        </div>
        <div className="relative st-glow-magenta">
          <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
        </div>
      </div>
      <div className="absolute right-[6%] bottom-[4px] w-[32%] st-glow-teal">
        <Ink icon={GiDramaMasks} style={{ fill: "#19c3b2", fillOpacity: 0.8 }} />
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
      <Ink icon={GiJesterHat} tone="night" style={{ fill: "#8b5cf6", fillOpacity: 0.85 }} />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 15% 0%, rgba(255,62,165,0.3), transparent 45%), radial-gradient(ellipse at 85% 10%, rgba(25,195,178,0.26), transparent 45%), radial-gradient(ellipse at 50% 110%, rgba(139,92,246,0.34), transparent 55%), linear-gradient(180deg, #1c1224 0%, #121111 100%)">
      <div className="st-thumb-confetti absolute inset-0" />
      <div className="absolute top-0 inset-x-0 overflow-hidden">
        <OrnamentStrip kind="bunting" length={THUMB_WIDTH} thickness={24} colors={CARNIVAL_COLORS} />
      </div>
      <div className="absolute top-5 left-[30%] w-[7px] st-thumb-swing">
        <SerpentineCurlArt color="#19c3b2" loops={4} />
      </div>
      <div className="absolute top-5 left-[68%] w-[7px] st-thumb-swing" style={{ animationDelay: "-1s" }}>
        <SerpentineCurlArt color="#ffd23f" loops={3} />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-1 left-3 w-14 st-glow-magenta">
        <Ink icon={GiCarnivalMask} style={{ fill: "#ff3ea5", fillOpacity: 0.85 }} />
      </div>
      <div className="absolute bottom-0.5 right-3 w-12 st-glow-teal">
        <Ink icon={GiDramaMasks} style={{ fill: "#19c3b2", fillOpacity: 0.8 }} />
      </div>
    </ThumbFrame>
  );
}

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#ff3ea5">
      <Line d="M35.5 30.5L41.5 42" width={2.2} />
      {/* Plumas saindo da têmpora esquerda, abertas em leque */}
      <Part d="M12 18.6C7 17.6 3.2 14 2.4 8.6C6.8 9.6 10.6 13 13.6 17.6Z" shade="M0 12L14 12L14 20L0 20Z" line={1.3}>
        <Line d="M12.6 17.9C9 15.6 6 12.6 3.8 9.6" width={0.8} opacity={0.85} />
      </Part>
      <Part d="M14.6 17.6C10.6 14.8 8.4 10.2 9.2 4.6C12.8 7.2 15.2 11.6 16.4 17.2Z" shade="M12 9L18 9L18 19L12 19Z" line={1.3}>
        <Line d="M15.4 17.2C13 13.8 11.2 9.8 10.2 6" width={0.8} opacity={0.85} />
      </Part>
      <Part
        d="M7 19C12 16 18 17 24 20.5C30 17 36 16 41 19C41.5 27 36.5 32 30.5 31C27.5 30.5 25.5 28.5 24 27C22.5 28.5 20.5 30.5 17.5 31C11.5 32 6.5 27 7 19Z"
        shade="M0 25.5C10 27 38 27 48 24.5L48 48L0 48Z"
      >
        <Line d="M9.6 21.2C10.8 19.6 13 19.2 14.2 20.2" width={0.9} opacity={0.85} />
        <Line d="M38.4 21.2C37.2 19.6 35 19.2 33.8 20.2" width={0.9} opacity={0.85} />
      </Part>
      <path d="M12.5 23C14.5 20.8 18.6 20.8 20.6 23.4C18.6 25.8 14.5 25.8 12.5 23Z" fill="#0b0907" stroke={EMBLEM_LINE} strokeWidth={1.1} />
      <path d="M35.5 23C33.5 20.8 29.4 20.8 27.4 23.4C29.4 25.8 33.5 25.8 35.5 23Z" fill="#0b0907" stroke={EMBLEM_LINE} strokeWidth={1.1} />
      <Light d="M24 18.4L25.5 20.4L24 22.4L22.5 20.4Z" color="#ff7ac0" />
    </EmblemArt>
  );
}
