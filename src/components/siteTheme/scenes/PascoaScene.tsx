"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import {
  GiButterfly,
  GiEasterEgg,
  GiFlowerEmblem,
  GiNestEggs,
  GiRabbit,
  GiTwirlyFlower,
} from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { PETAL_COLORS } from "../palettes";
import {
  SceneLayer,
  prefersReducedMotion,
  random,
  useLayerWidth,
  type LayerRef,
  type SceneVariant,
} from "../sceneKit";
import { CastleSkyline } from "../art";
import { BuntingRow } from "../rows";
import { Ink } from "../ink";

gsap.registerPlugin(MotionPathPlugin);

const BUTTERFLY_COUNT = 2;
const BUTTERFLY_COLORS = ["#c4a7ff", "#ffb3d1", "#9be7c4"];

export default function PascoaScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-pascoa-sky absolute inset-0" />
        <ParticleCanvas kind="petal" density={3.2} max={34} colors={PETAL_COLORS} />

        {/* Varal de flâmulas medievais no topo */}
        <BuntingRow width={width} shapes={["triangle", "swallowtail", "triangle"]} />

        {/* A Cité de Carcassonne em festa, com ninho, ovos e flores */}
        <div className="st-skyline-glow st-skyline-glow-pascoa" />
        <CastleSkyline tone="gold" width={width} />
        <div className="st-nest">
          <div className="st-nest-egg" style={{ left: "-6%", bottom: "4%", width: "30%", rotate: "-14deg" }}>
            <Ink icon={GiEasterEgg} style={{ fill: "#c4a7ff", fillOpacity: 0.9 }} />
          </div>
          <Ink icon={GiNestEggs} />
          <div className="st-nest-egg" style={{ right: "-14%", bottom: "2%", width: "28%", rotate: "12deg" }}>
            <Ink icon={GiEasterEgg} style={{ fill: "#9be7c4", fillOpacity: 0.9 }} />
          </div>
        </div>
        <div className="st-flower" style={{ left: "38%" }}>
          <Ink icon={GiFlowerEmblem} style={{ fill: "#ffb3d1", fillOpacity: 0.85 }} />
        </div>
        <div className="st-flower st-flower-small" style={{ left: "61%" }}>
          <Ink icon={GiTwirlyFlower} style={{ fill: "#ffe08a", fillOpacity: 0.85 }} />
        </div>
        <div className="st-flower" style={{ left: "88%" }}>
          <Ink icon={GiFlowerEmblem} style={{ fill: "#c4a7ff", fillOpacity: 0.85 }} />
        </div>
        <HoppingRabbit layerRef={backRef} />
      </SceneLayer>

      <SceneLayer variant={variant} depth="front" layerRef={frontRef}>
        <Butterflies layerRef={frontRef} />
      </SceneLayer>
    </>
  );
}

/**
 * Coelho gravado que entra saltitando por um lado, para, olha em volta e sai
 * pelo outro.
 */
function HoppingRabbit({ layerRef }: { layerRef: LayerRef }) {
  const rabbitRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rabbit = rabbitRef.current;
    const face = faceRef.current;
    if (!rabbit || !face) return;

    if (prefersReducedMotion()) {
      const layer = layerRef.current;
      gsap.set(rabbit, { x: (layer?.clientWidth ?? 0) * 0.62, autoAlpha: 1 });
      return;
    }

    let alive = true;
    let timeline: gsap.core.Timeline | undefined;

    const visit = (delay: number) => {
      const layer = layerRef.current;
      if (!alive || !layer) return;
      const w = layer.clientWidth;
      const size = rabbit.offsetWidth;
      const fromLeft = Math.random() < 0.5;
      const start = fromLeft ? -size - 20 : w + 20;
      const stop = random(w * 0.25, w * 0.75);
      const exit = fromLeft ? w + 20 : -size - 20;
      const facing = fromLeft ? 1 : -1; // o desenho olha para a direita

      const tl = gsap.timeline({ delay, onComplete: () => visit(random(5, 11)) });
      timeline = tl;
      tl.set(rabbit, { x: start, y: 0, autoAlpha: 1 }).set(face, { scaleX: facing });

      // Saltos do tamanho do coelho, em arco
      const hop = (from: number, to: number) => {
        const count = Math.max(2, Math.round(Math.abs(to - from) / (size * 0.9)));
        for (let i = 1; i <= count; i++) {
          tl.to(rabbit, { x: from + ((to - from) * i) / count, duration: 0.42, ease: "none" })
            .to(rabbit, { y: -size * 0.35, duration: 0.21, ease: "power1.out" }, "<")
            .to(rabbit, { y: 0, duration: 0.21, ease: "power1.in" }, ">");
        }
      };

      hop(start, stop);
      // Pousa, olha para trás e volta a olhar para a frente
      tl.to(face, { scaleY: 0.9, duration: 0.12, yoyo: true, repeat: 1, transformOrigin: "50% 100%" })
        .set(face, { scaleX: -facing }, `+=${random(1.2, 2.2).toFixed(2)}`)
        .set(face, { scaleX: facing }, `+=${random(0.8, 1.4).toFixed(2)}`)
        .to({}, { duration: random(0.4, 1) });
      hop(stop, exit);
    };

    visit(random(1.5, 4));
    return () => {
      alive = false;
      timeline?.kill();
    };
  }, [layerRef]);

  return (
    <div ref={rabbitRef} className="st-rabbit">
      <div ref={faceRef}>
        <Ink icon={GiRabbit} tone="cream" />
      </div>
    </div>
  );
}

/** Borboletas gravadas atravessando a tela em caminhos bem sinuosos. */
function Butterflies({ layerRef }: { layerRef: LayerRef }) {
  const butterflyRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let alive = true;
    const flights: gsap.core.Timeline[] = [];

    const flutter = (index: number, delay: number) => {
      const butterfly = butterflyRefs.current[index];
      const layer = layerRef.current;
      if (!alive || !butterfly || !layer) return;

      const w = layer.clientWidth;
      const h = layer.clientHeight;
      // Começa e termina totalmente fora da tela
      const offLeft = -butterfly.offsetWidth - 20;
      const offRight = w + 20;
      const toRight = Math.random() < 0.5;
      const startX = toRight ? offLeft : offRight;
      const endX = toRight ? offRight : offLeft;
      const baseY = random(h * 0.15, h * 0.7);
      const path = Array.from({ length: 7 }, (_, i) => ({
        x: startX + ((endX - startX) * i) / 6,
        y: Math.max(0, baseY + random(-h * 0.14, h * 0.14)),
      }));

      gsap.set(butterfly, { x: path[0].x, y: path[0].y, autoAlpha: 1, scaleX: toRight ? 1 : -1 });
      flights[index] = gsap
        .timeline({ delay, onComplete: () => flutter(index, random(4, 10)) })
        .to(butterfly, {
          duration: Math.abs(endX - startX) / random(70, 110),
          ease: "none",
          motionPath: { path: path.slice(1), curviness: 1.6 },
        });
    };

    for (let i = 0; i < BUTTERFLY_COUNT; i++) flutter(i, random(1, 4) + i * 3);
    return () => {
      alive = false;
      flights.forEach((flight) => flight?.kill());
    };
  }, [layerRef]);

  return (
    <>
      {Array.from({ length: BUTTERFLY_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            butterflyRefs.current[i] = el;
          }}
          className="st-butterfly"
        >
          <div className="st-butterfly-body" style={{ animationDelay: `${-i * 0.7}s` }}>
            <div className="st-flap st-flap-wings">
              <Ink
                icon={GiButterfly}
                style={{ fill: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length], fillOpacity: 0.85 }}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
