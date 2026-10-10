"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { GiLanternFlame, GiPineTree, GiPolarStar } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { BOKEH_COLORS, SNOW_COLORS } from "../palettes";
import {
  SceneLayer,
  prefersReducedMotion,
  random,
  useLayerWidth,
  type LayerRef,
  type SceneVariant,
} from "../sceneKit";
import { CastleSkyline, SnowGroundArt } from "../art";
import { EvergreenGarland, garlandGeometry } from "../rows";
import { Ink } from "../ink";

export default function NatalScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);
  // Lanternas penduradas no ponto mais baixo de um gomo sim, outro não
  const lanterns = useMemo(
    () =>
      width > 0
        ? garlandGeometry(width).swags.filter((_, i) => i % 2 === 0)
        : [],
    [width],
  );

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-natal-sky absolute inset-0" />
        <ShootingStar layerRef={backRef} />
        <div className="st-star">
          <Ink icon={GiPolarStar} />
        </div>
        <ParticleCanvas kind="snow" density={22} max={170} colors={SNOW_COLORS} />

        {/* A Cité de Carcassonne nevada, entre pinheiros */}
        <div className="st-skyline-glow st-skyline-glow-natal" />
        <CastleSkyline tone="frost" width={width} />
        <div className="st-pine st-pine-left">
          <Ink icon={GiPineTree} tone="pine" />
        </div>
        <div className="st-pine st-pine-left-small">
          <Ink icon={GiPineTree} tone="pine" />
        </div>
        <div className="st-pine st-pine-right">
          <Ink icon={GiPineTree} tone="pine" />
        </div>
        <div className="st-snow-ground">
          <SnowGroundArt />
        </div>

        <div className="st-garland">
          <EvergreenGarland width={width} />
        </div>
        {lanterns.map((swag, i) => (
          <div
            key={i}
            className="st-lantern"
            style={{
              left: swag.low.x,
              top: swag.low.y,
              animationDuration: `${3.2 + (i % 3) * 0.5}s`,
              animationDelay: `${-i * 0.7}s`,
            }}
          >
            <div className="st-lantern-chain" style={{ height: 10 + (i % 3) * 8 }} />
            <div className="st-lantern-body">
              <div className="st-lantern-light" style={{ animationDelay: `${-i * 0.4}s` }} />
              <Ink icon={GiLanternFlame} />
            </div>
          </div>
        ))}
      </SceneLayer>

      {/* Cristais grandes e desfocados na frente dão profundidade à neve */}
      <SceneLayer variant={variant} depth="front">
        <ParticleCanvas kind="bokeh" density={1.6} max={16} colors={BOKEH_COLORS} />
      </SceneLayer>
    </>
  );
}

/** Estrela cadente cruzando a parte de cima da tela de vez em quando. */
function ShootingStar({ layerRef }: { layerRef: LayerRef }) {
  const starRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let alive = true;
    let timeline: gsap.core.Timeline | undefined;

    const shoot = (delay: number) => {
      const star = starRef.current;
      const layer = layerRef.current;
      if (!alive || !star || !layer) return;

      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const x = random(w * 0.05, w * 0.55);
      const y = random(h * 0.08, h * 0.3);
      const distance = random(Math.min(w, h) * 0.3, Math.min(w, h) * 0.55);
      const angle = random(18, 34);
      const radians = (angle * Math.PI) / 180;

      timeline = gsap
        .timeline({ delay, onComplete: () => shoot(random(6, 14)) })
        .set(star, { x, y, rotation: angle, autoAlpha: 0 })
        .to(star, { autoAlpha: 1, duration: 0.18, ease: "power1.out" })
        .to(
          star,
          {
            x: x + Math.cos(radians) * distance,
            y: y + Math.sin(radians) * distance,
            duration: 1,
            ease: "power1.in",
          },
          0,
        )
        .to(star, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0.65);
    };

    shoot(random(2, 5));
    return () => {
      alive = false;
      timeline?.kill();
    };
  }, [layerRef]);

  return <div ref={starRef} className="st-shooting-star" />;
}
