"use client";

import type { CSSProperties } from "react";
import { GiKnightBanner, GiMeeple, GiMeepleKing, GiPartyHat } from "react-icons/gi";
import { BandFrame, type BandLook, type BandVariant } from "../bandFrame";
import { AccessorySlot, ThumbFrame, THUMB_WIDTH, type AccessoryPlacement } from "../accessorySlot";
import { MEEPLE_COLORS, TILE_COLORS } from "../palettes";
import { CakeWithCandles, WallArt } from "../art";
import { Ink } from "../ink";

const meeple = (color: string): CSSProperties => ({ fill: color, fillOpacity: 0.85, stroke: "#e6c56b" });
const KING: CSSProperties = { fill: "url(#st-grad-gold)", stroke: "#8a6a14" };

const look: BandLook = {
  particle: "tile",
  colors: TILE_COLORS,
  headerStrip: "bunting",
  sideStrip: "laurel",
  stripColors: MEEPLE_COLORS,
  cornerLeft: <Ink icon={GiMeeple} style={meeple(MEEPLE_COLORS[0])} />,
  cornerRight: (
    <div className="st-glow-gold">
      <CakeWithCandles coarse />
    </div>
  ),
  footer: (width) => (
    <>
      <div className="absolute left-0 right-0 bottom-0 h-[22px]">
        <WallArt width={width} tone="gold" />
      </div>
      <div className="absolute left-[5%] bottom-[2px] flex items-end gap-[2px] w-[52%]">
        <div className="w-1/3">
          <Ink icon={GiMeeple} style={meeple(MEEPLE_COLORS[1])} />
        </div>
        <div className="w-1/3 -translate-y-1">
          <Ink icon={GiMeepleKing} style={KING} />
        </div>
        <div className="w-1/3">
          <Ink icon={GiMeeple} style={meeple(MEEPLE_COLORS[3])} />
        </div>
      </div>
      <div className="absolute right-[6%] bottom-[2px] w-[32%] st-glow-gold">
        <CakeWithCandles />
      </div>
    </>
  ),
};

export function Band({ variant }: { variant: BandVariant }) {
  return <BandFrame look={look} variant={variant} />;
}

export function Accessory({ placement }: { placement: AccessoryPlacement }) {
  return (
    <AccessorySlot placement={placement} kind="cone">
      <Ink icon={GiPartyHat} />
    </AccessorySlot>
  );
}

export function Thumbnail() {
  return (
    <ThumbFrame background="radial-gradient(ellipse at 50% -10%, rgba(230,197,107,0.3), transparent 55%), radial-gradient(ellipse at 50% 110%, rgba(179,38,46,0.26), transparent 55%), linear-gradient(180deg, #1a160f 0%, #121111 100%)">
      <svg viewBox="0 0 300 20" className="absolute top-0 inset-x-0 w-full h-auto" preserveAspectRatio="none">
        <path d="M0 3 Q75 17 150 3 Q225 17 300 3" fill="none" stroke="#e6c56b" strokeOpacity="0.7" strokeWidth="1.2" />
      </svg>
      {[0.24, 0.5, 0.76].map((left, i) => (
        <div
          key={left}
          className="absolute top-[3px] w-6 st-thumb-swing"
          style={{ left: `${left * 100}%`, translate: "-50% 0", animationDelay: `${-i * 0.6}s` }}
        >
          <Ink icon={GiKnightBanner} style={meeple(MEEPLE_COLORS[i])} />
        </div>
      ))}
      <div className="absolute bottom-0 inset-x-0 h-3.5">
        <WallArt width={THUMB_WIDTH} tone="gold" />
      </div>
      <div className="absolute bottom-1 left-3 flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`w-5 ${i === 1 ? "-translate-y-1" : ""}`}>
            <Ink icon={i === 1 ? GiMeepleKing : GiMeeple} style={i === 1 ? KING : meeple(MEEPLE_COLORS[i + 1])} />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0.5 right-3 w-12 st-glow-gold">
        <CakeWithCandles />
      </div>
    </ThumbFrame>
  );
}
