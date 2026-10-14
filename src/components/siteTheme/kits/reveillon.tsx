"use client";

import { GiCastle, GiGlassCelebration, GiRingingBell, GiTopHat, GiWhiteTower } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { GOLD_GLITTER_COLORS } from "../palettes";
import { FireworkBurstArt, HangingStarArt, WallArt } from "../art";
import { Ink } from "../ink";
import { Dots, EmblemArt, Light, Line, Part, place, rotatePoint, star } from "../emblemKit";

// Taça de champanhe em volta da origem; duas, inclinadas, brindando
const BOWL = "M-5 -17L5 -17L4.2 -3C3.8 0.5 2 2 0 2C-2 2 -3.8 0.5 -4.2 -3Z";
const FLUTES = (
  [
    [16, 18],
    [32, -18],
  ] as const
).map(([x, degrees]) => ({
  degrees,
  bowl: place(BOWL, x, 28, degrees),
  liquid: place("M-7 -10.5L7 -10.5L7 4L-7 4Z", x, 28, degrees),
  stem: place("M0 2L0 13", x, 28, degrees),
  base: place("M-5.2 13.6L5.2 13.6", x, 28, degrees),
  bubbles: (
    [
      [-1.5, -7],
      [1.8, -4],
      [-0.6, -1.5],
    ] as const
  ).map(([bx, by]) => {
    const [rx, ry] = rotatePoint(bx, by, degrees);
    return [rx + x, ry + 28] as [number, number];
  }),
}));

const look: BandLook = {
  particle: "glitter",
  colors: GOLD_GLITTER_COLORS,
  headerStrip: "stars",
  sideStrip: "stars",
  cornerLeft: <Ink icon={GiRingingBell} coarse />,
  cornerRight: <FireworkBurstArt />,
  emblem: <Emblem />,
  footer: (width) => (
    <>
      <div className="absolute left-[8%] top-[4%] w-[26%] st-twinkle">
        <FireworkBurstArt color="#f7e7b4" />
      </div>
      <div className="absolute right-[10%] top-[16%] w-[20%] st-twinkle" style={{ animationDelay: "-1.2s" }}>
        <FireworkBurstArt color="#b4cdff" />
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="frost" />
      </div>
      <div className="absolute left-[30%] bottom-[2px] w-[40%] st-glow-gold">
        <Ink icon={GiGlassCelebration} />
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
      <Ink icon={GiTopHat} tone="night" />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 50% -20%, rgba(70,90,160,0.45), transparent 60%), radial-gradient(ellipse at 50% 110%, rgba(230,197,107,0.2), transparent 55%), linear-gradient(180deg, #0f1730 0%, #121111 100%)">
      <div className="absolute top-2 left-[14%] w-14 st-twinkle">
        <FireworkBurstArt color="#f7e7b4" />
      </div>
      <div className="absolute top-1 left-[48%] w-10 st-twinkle" style={{ animationDelay: "-0.8s" }}>
        <FireworkBurstArt color="#ffaa8c" />
      </div>
      <div className="absolute top-6 right-[8%] w-12 st-twinkle" style={{ animationDelay: "-1.6s" }}>
        <FireworkBurstArt color="#b4cdff" />
      </div>
      {[0.3, 0.62, 0.86].map((left, i) => (
        <div
          key={left}
          className="absolute top-0 w-3.5 st-thumb-swing"
          style={{ left: `${left * 100}%`, animationDelay: `${-i * 0.7}s` }}
        >
          <div className="w-px h-3 mx-auto bg-primary-gold/50" />
          <HangingStarArt points={i % 2 ? 4 : 5} />
        </div>
      ))}
      <div className="absolute bottom-2.5 left-[10%] h-10">
        <Ink icon={GiWhiteTower} tone="frost" fitHeight />
      </div>
      <div className="absolute bottom-2.5 left-[30%] h-12">
        <Ink icon={GiCastle} tone="frost" fitHeight />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="frost" />
      </div>
      <div className="absolute bottom-0.5 right-3 w-14 st-glow-gold">
        <Ink icon={GiGlassCelebration} />
      </div>
    </ThumbFrame>
  );
}

/** Selo da versão minimalista (cabeçalho do cardápio): gravura com hachura. */
function Emblem() {
  return (
    <EmblemArt hatch="#f7e7b4">
      {FLUTES.map((flute) => (
        <g key={flute.degrees}>
          <Line d={flute.stem} width={1.5} />
          <Line d={flute.base} width={1.8} />
          <Part d={flute.bowl} shade={flute.liquid} line={1.5}>
            <Dots points={flute.bubbles} r={0.7} color="#fff3d0" />
          </Part>
        </g>
      ))}
      {/* Brilho do brinde */}
      <Light d={star(24, 6.6, 4.4, 4, 0.32)} color="#fff3d0" />
      <Dots points={[[17.5, 6], [30.5, 5.4], [33, 9.6]]} r={0.8} color="#fff3d0" />
    </EmblemArt>
  );
}
