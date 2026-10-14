"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { GiBat, GiSpectre, GiSpiderAlt } from "react-icons/gi";
import ParticleCanvas from "../ParticleCanvas";
import { EMBER_COLORS } from "../palettes";
import {
  FullOnly,
  SceneLayer,
  prefersReducedMotion,
  random,
  useLayerWidth,
  type LayerRef,
  type SceneVariant,
} from "../sceneKit";
import {
  CastleSkyline,
  EngravedCloud,
  EngravedMoon,
  PumpkinLantern,
  SpiderWebArt,
} from "../art";
import { Ink } from "../ink";

gsap.registerPlugin(MotionPathPlugin);

const BAT_COUNT = 3;

export default function HalloweenScene({ variant }: { variant: SceneVariant }) {
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const width = useLayerWidth(backRef);

  return (
    <>
      <SceneLayer variant={variant} depth="back" layerRef={backRef}>
        <div className="st-halloween-sky absolute inset-0" />
        <ParticleCanvas kind="ember" density={4} max={45} colors={EMBER_COLORS} />
        <div className="st-moon">
          <EngravedMoon />
          <div className="st-moon-cloud">
            <EngravedCloud />
          </div>
        </div>
        <FullOnly>
          <SpiderOnWeb layerRef={backRef} />

          {/* A Cité de Carcassonne contra um clarão de fogueira */}
          <div className="st-skyline-glow st-skyline-glow-halloween" />
          <CastleSkyline tone="amber" width={width} />
          <div className="st-fog st-fog-1" />
          <div className="st-fog st-fog-2" />
          <div className="st-fog st-fog-3" />
          <div className="st-pumpkin st-pumpkin-left">
            <PumpkinLantern />
          </div>
          <div className="st-pumpkin st-pumpkin-left-small">
            <PumpkinLantern />
          </div>
          <div className="st-pumpkin st-pumpkin-right">
            <PumpkinLantern />
          </div>
        </FullOnly>
      </SceneLayer>

      <SceneLayer variant={variant} depth="front" layerRef={frontRef}>
        <FlyingBats layerRef={frontRef} />
        <FloatingSpectre layerRef={frontRef} />
      </SceneLayer>
    </>
  );
}

/** Morcegos gravados atravessando a tela em caminhos ondulados. */
function FlyingBats({ layerRef }: { layerRef: LayerRef }) {
  const batRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let alive = true;
    const flights: gsap.core.Timeline[] = [];

    const fly = (index: number, delay: number) => {
      const bat = batRefs.current[index];
      const layer = layerRef.current;
      if (!alive || !bat || !layer) return;

      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const scale = random(0.6, 1.15);
      // Começa e termina totalmente fora da tela (com folga para a escala)
      const offLeft = -bat.offsetWidth - 20;
      const offRight = w + 20;
      const toRight = Math.random() < 0.5;
      const startX = toRight ? offLeft : offRight;
      const endX = toRight ? offRight : offLeft;
      const baseY = random(h * 0.06, h * 0.55);
      // Pontos espalhados na horizontal, subindo e descendo — o MotionPath
      // liga tudo com curvas suaves.
      const path = Array.from({ length: 5 }, (_, i) => ({
        x: startX + ((endX - startX) * i) / 4,
        y: Math.max(0, baseY + random(-h * 0.12, h * 0.12)),
      }));

      // Posiciona fora da tela; o MotionPath parte da posição atual
      gsap.set(bat, { x: path[0].x, y: path[0].y, scale, autoAlpha: 1 });
      flights[index] = gsap
        .timeline({
          delay,
          onComplete: () => fly(index, random(3, 9)),
        })
        .to(bat, {
          duration: Math.abs(endX - startX) / random(120, 200),
          ease: "none",
          motionPath: { path: path.slice(1), curviness: 1.3 },
        });
    };

    for (let i = 0; i < BAT_COUNT; i++) fly(i, random(0.6, 4) + i * 1.4);
    return () => {
      alive = false;
      flights.forEach((flight) => flight?.kill());
    };
  }, [layerRef]);

  return (
    <>
      {Array.from({ length: BAT_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            batRefs.current[i] = el;
          }}
          className="st-bat"
        >
          <div className="st-flap" style={{ animationDelay: `${-i * 0.09}s` }}>
            <Ink icon={GiBat} coarse />
          </div>
        </div>
      ))}
    </>
  );
}

/** Espectro encapuzado que surge nas laterais (longe do conteúdo), sobe e some. */
function FloatingSpectre({ layerRef }: { layerRef: LayerRef }) {
  const spectreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let alive = true;
    let timeline: gsap.core.Timeline | undefined;

    const haunt = (delay: number) => {
      const spectre = spectreRef.current;
      const layer = layerRef.current;
      if (!alive || !spectre || !layer) return;

      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const size = spectre.offsetWidth;
      const leftSide = Math.random() < 0.5;
      const x = leftSide
        ? random(w * 0.02, w * 0.14)
        : random(w * 0.84, w * 0.96) - size;
      const y = random(h * 0.4, h * 0.72);
      const scale = random(0.8, 1.05);

      timeline = gsap
        .timeline({ delay, onComplete: () => haunt(random(9, 18)) })
        .set(spectre, {
          x,
          y,
          autoAlpha: 0,
          // Espelhado do lado esquerdo, para "olhar" para o meio da tela
          scaleX: leftSide ? -scale : scale,
          scaleY: scale,
          rotation: 0,
        })
        .to(spectre, { autoAlpha: 0.8, duration: 1.4, ease: "sine.out" })
        .to(spectre, { y: y - random(h * 0.16, h * 0.3), duration: 6, ease: "sine.inOut" }, 0)
        .to(spectre, { x: x + random(-30, 30), duration: 6, ease: "sine.inOut" }, 0)
        .to(spectre, { rotation: 6, duration: 1.2, yoyo: true, repeat: 4, ease: "sine.inOut" }, 0)
        .to(spectre, { autoAlpha: 0, duration: 1.6, ease: "sine.in" }, 4.4);
    };

    haunt(random(4, 8));
    return () => {
      alive = false;
      timeline?.kill();
    };
  }, [layerRef]);

  return (
    <div ref={spectreRef} className="st-ghost">
      <Ink icon={GiSpectre} tone="pale" coarse />
    </div>
  );
}

/** Teia dourada no canto, com uma aranha gravada que desce pelo fio e sobe. */
function SpiderOnWeb({ layerRef }: { layerRef: LayerRef }) {
  const threadRef = useRef<HTMLDivElement>(null);
  const spiderRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thread = threadRef.current;
    const spider = spiderRef.current;
    const body = bodyRef.current;
    if (!thread || !spider || !body) return;

    // O fio tem 100px de base e estica com scaleY junto com a descida
    const proxy = { drop: 0 };
    const render = () => {
      gsap.set(thread, { scaleY: Math.max(proxy.drop, 0.5) / 100 });
      gsap.set(spider, { y: proxy.drop });
    };

    if (prefersReducedMotion()) {
      proxy.drop = 60;
      render();
      return;
    }

    let alive = true;
    let timeline: gsap.core.Timeline | undefined;

    const descend = (delay: number) => {
      const layer = layerRef.current;
      if (!alive || !layer) return;
      const depth = random(layer.clientHeight * 0.12, layer.clientHeight * 0.3);

      timeline = gsap
        .timeline({ delay, onComplete: () => descend(random(2, 6)) })
        .to(proxy, { drop: depth, duration: random(2, 3), ease: "power2.out", onUpdate: render })
        .to(body, { rotation: 9, duration: 0.3, yoyo: true, repeat: 5, ease: "sine.inOut" })
        .to(proxy, { drop: depth * 0.55, duration: 1.3, ease: "sine.inOut", onUpdate: render })
        .to(proxy, { drop: depth * 0.8, duration: 1, ease: "sine.inOut", onUpdate: render })
        .to(
          proxy,
          { drop: 0, duration: random(2.6, 3.6), ease: "power1.inOut", onUpdate: render },
          `+=${random(1, 2.5).toFixed(2)}`,
        );
    };

    render();
    descend(random(1, 3));
    return () => {
      alive = false;
      timeline?.kill();
    };
  }, [layerRef]);

  return (
    <div className="st-web">
      <SpiderWebArt />
      <div ref={threadRef} className="st-spider-thread" />
      <div ref={spiderRef} className="st-spider">
        <div ref={bodyRef} className="st-spider-body">
          <Ink icon={GiSpiderAlt} coarse />
        </div>
      </div>
    </div>
  );
}
