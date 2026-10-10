"use client";

import {
  PointerEvent as ReactPointerEvent,
  RefObject,
  SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { FiX } from "react-icons/fi";
import { HERO_RADIUS, HERO_SHADE, prefersReducedMotion } from "./motion";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// Guarda que a dica do zoom já foi mostrada neste aparelho
const HINT_KEY = "carcassonne-photo-zoom-hint";

type Point = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };
/** Zoom e deslocamento da foto em relação à posição de descanso. */
type View = { scale: number; x: number; y: number };

type Gesture =
  | { kind: "pending"; start: Point; view: View; onImage: boolean }
  | { kind: "pan"; start: Point; view: View; last: Point; lastTime: number; velocity: Point }
  | { kind: "swipe"; start: Point; last: Point; lastTime: number; velocity: number }
  | { kind: "pinch"; distance: number; mid: Point; lastMid: Point; view: View }
  | { kind: "ignore" };

const REST: View = { scale: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Maior retângulo com a proporção da foto que cabe na tela, centralizado. */
function fitRect(ratio: number): Rect {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const phone = viewportWidth < 640;
  // No celular a foto vai de ponta a ponta; em cima fica espaço para o X
  const padX = phone ? 0 : 48;
  const padY = phone ? 64 : 56;
  let width = viewportWidth - padX * 2;
  let height = width / ratio;
  const maxHeight = viewportHeight - padY * 2;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
  };
}

const restRadius = () =>
  window.innerWidth < 640 ? "0px 0px 0px 0px" : "14px 14px 14px 14px";

/**
 * Foto inteira do item, por cima de tudo. Ela se expande a partir do topo do
 * detalhe (o corte vai se abrindo até mostrar a imagem completa) e volta
 * para lá ao fechar. Dá para ampliar com dois toques, com dois dedos ou com
 * a rodinha do mouse, arrastar quando ampliada e fechar arrastando para
 * baixo, tocando fora da foto, no X ou com Esc.
 */
export default function ImageViewer({
  src,
  alt,
  hero,
  onLeaveHero,
  onReturnHero,
  onClosed,
}: {
  src: string;
  alt: string;
  /** Foto do topo do detalhe: de onde a foto se expande e para onde volta. */
  hero: RefObject<HTMLImageElement | null>;
  /** A foto saiu do detalhe (título, X e selos podem sumir). */
  onLeaveHero: () => void;
  /** A foto voltou para o detalhe. */
  onReturnHero: () => void;
  onClosed: () => void;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const opening = useRef<gsap.core.Timeline | null>(null);
  const rest = useRef<Rect>({ left: 0, top: 0, width: 0, height: 0 });
  const ratio = useRef(1);
  const view = useRef<View>({ ...REST });
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const closing = useRef(false);
  const [hint, setHint] = useState<string | null>(null);

  // ── Zoom e deslocamento ────────────────────────────────────────────────────

  /** Com zoom, a foto não deixa sobrar espaço vazio na tela; sem, fica no centro. */
  const clampView = (scale: number, x: number, y: number): View => {
    const { left, top, width, height } = rest.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    return {
      scale,
      x:
        scaledWidth <= viewportWidth
          ? (viewportWidth - scaledWidth) / 2 - left
          : clamp(x, viewportWidth - left - scaledWidth, -left),
      y:
        scaledHeight <= viewportHeight
          ? (viewportHeight - scaledHeight) / 2 - top
          : clamp(y, viewportHeight - top - scaledHeight, -top),
    };
  };

  /** Zoom mantendo parado o ponto da foto que está sob (x, y) na tela. */
  const zoomAt = (scale: number, x: number, y: number, from: View = view.current): View => {
    const { left, top } = rest.current;
    const imageX = (x - left - from.x) / from.scale;
    const imageY = (y - top - from.y) / from.scale;
    return clampView(scale, x - left - scale * imageX, y - top - scale * imageY);
  };

  const render = (next: View) => {
    view.current = next;
    const frame = frameRef.current;
    if (!frame) return;
    gsap.set(frame, { x: next.x, y: next.y, scale: next.scale });
    frame.style.cursor = next.scale > 1.02 ? "grab" : "zoom-in";
  };

  const animateTo = (next: View, duration = 0.4) => {
    view.current = next;
    const frame = frameRef.current;
    if (!frame) return;
    gsap.to(frame, {
      x: next.x,
      y: next.y,
      scale: next.scale,
      duration,
      ease: "power3.out",
      overwrite: "auto",
    });
    frame.style.cursor = next.scale > 1.02 ? "grab" : "zoom-in";
  };

  /** Para o zoom animado onde ele estiver: o dedo assume a partir dali. */
  const syncView = () => {
    const frame = frameRef.current;
    if (!frame) return;
    gsap.killTweensOf(frame, "x,y,scale");
    view.current = {
      scale: Number(gsap.getProperty(frame, "scale")) || 1,
      x: Number(gsap.getProperty(frame, "x")) || 0,
      y: Number(gsap.getProperty(frame, "y")) || 0,
    };
  };

  // ── Abrir ──────────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    const heroImage = hero.current;
    const frame = frameRef.current;
    const backdrop = backdropRef.current;
    const shade = shadeRef.current;
    const chrome = chromeRef.current;
    if (!heroImage || !frame || !backdrop || !shade || !chrome) return;
    const still = prefersReducedMotion();
    const from = heroImage.getBoundingClientRect();
    ratio.current =
      heroImage.naturalWidth && heroImage.naturalHeight
        ? heroImage.naturalWidth / heroImage.naturalHeight
        : from.width / from.height;
    const target = fitRect(ratio.current);
    rest.current = target;
    view.current = { ...REST };

    // Começa exatamente sobre a foto do detalhe, com o mesmo corte e degradê
    gsap.set(frame, {
      left: from.left,
      top: from.top,
      width: from.width,
      height: from.height,
      borderRadius: HERO_RADIUS,
      opacity: 0,
      x: 0,
      y: 0,
      scale: 1,
      transformOrigin: "0 0",
    });
    gsap.set(shade, { opacity: 1 });
    gsap.set([backdrop, chrome], { opacity: 0 });
    onLeaveHero();

    const fadeIn = still ? 0.01 : 0.14;
    opening.current = gsap
      .timeline()
      .to(frame, { opacity: 1, duration: fadeIn, ease: "power1.out" }, 0)
      // A cópia já cobre a foto do detalhe: a de baixo some
      .call(
        () => {
          heroImage.style.opacity = "0";
        },
        undefined,
        fadeIn,
      )
      .to(backdrop, { opacity: 1, duration: still ? 0.2 : 0.4, ease: "power1.out" }, 0)
      // O corte vai se abrindo até a foto aparecer inteira
      .to(
        frame,
        {
          left: target.left,
          top: target.top,
          width: target.width,
          height: target.height,
          borderRadius: restRadius(),
          duration: still ? 0.01 : 0.6,
          ease: "expo.out",
        },
        still ? 0 : 0.05,
      )
      .to(shade, { opacity: 0, duration: still ? 0.01 : 0.35, ease: "power1.out" }, still ? 0 : 0.1)
      .to(chrome, { opacity: 1, duration: 0.3, ease: "power1.out" }, still ? 0 : 0.3);

    return () => {
      opening.current?.kill();
      opening.current = null;
      gsap.killTweensOf([frame, backdrop, shade, chrome]);
      heroImage.style.opacity = "";
    };
  }, []);

  // Dica do zoom, só na primeira vez neste aparelho
  useEffect(() => {
    let seen = true;
    try {
      seen = !!localStorage.getItem(HINT_KEY);
    } catch {
      // sem armazenamento: sem dica
    }
    if (seen) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const show = window.setTimeout(() => {
      try {
        localStorage.setItem(HINT_KEY, "1");
      } catch {
        // segue sem guardar
      }
      setHint(
        touch
          ? "Toque duas vezes ou use dois dedos para ampliar"
          : "Clique duas vezes ou use a rodinha do mouse para ampliar",
      );
    }, 450);
    const hide = window.setTimeout(() => setHint(null), 3600);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
      setHint(null);
    };
  }, []);

  // ── Fechar ─────────────────────────────────────────────────────────────────

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const heroImage = hero.current;
    const frame = frameRef.current;
    const backdrop = backdropRef.current;
    const shade = shadeRef.current;
    const chrome = chromeRef.current;
    if (!heroImage || !frame || !backdrop || !shade || !chrome) {
      if (heroImage) heroImage.style.opacity = "";
      onReturnHero();
      onClosed();
      return;
    }
    opening.current?.progress(1);
    syncView();
    const still = prefersReducedMotion();

    if (still) {
      heroImage.style.opacity = "";
      gsap
        .timeline({
          onComplete: () => {
            onReturnHero();
            onClosed();
          },
        })
        .to([frame, backdrop, chrome], { opacity: 0, duration: 0.2 });
      return;
    }

    // Parte de onde a foto está agora (ampliada ou arrastada) e volta para o
    // topo do detalhe, recortando de novo, com o degradê voltando junto
    const current = frame.getBoundingClientRect();
    gsap.set(frame, {
      x: 0,
      y: 0,
      scale: 1,
      left: current.left,
      top: current.top,
      width: current.width,
      height: current.height,
    });
    const to = heroImage.getBoundingClientRect();
    gsap
      .timeline({
        onComplete: () => {
          heroImage.style.opacity = "";
          onReturnHero();
          onClosed();
        },
      })
      .to(chrome, { opacity: 0, duration: 0.15 }, 0)
      .to(backdrop, { opacity: 0, duration: 0.42, ease: "power1.in" }, 0)
      .to(
        frame,
        {
          left: to.left,
          top: to.top,
          width: to.width,
          height: to.height,
          borderRadius: HERO_RADIUS,
          duration: 0.48,
          ease: "power3.inOut",
        },
        0,
      )
      .to(shade, { opacity: 1, duration: 0.3, ease: "power1.in" }, 0.16);
  }, [hero, onClosed, onReturnHero]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  // Tela girou ou mudou de tamanho: a foto volta a caber inteira
  useEffect(() => {
    const onResize = () => {
      if (closing.current) return;
      opening.current?.progress(1);
      rest.current = fitRect(ratio.current);
      const frame = frameRef.current;
      if (!frame) return;
      gsap.killTweensOf(frame, "x,y,scale");
      gsap.set(frame, { ...rest.current, borderRadius: restRadius() });
      render({ ...REST });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Rodinha do mouse (e pinça do trackpad) amplia em volta do cursor
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (closing.current) return;
      opening.current?.progress(1);
      // A pinça do trackpad chega como roda com Ctrl, em passos menores
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015));
      const scale = clamp(view.current.scale * factor, 1, MAX_SCALE);
      if (Math.abs(scale - view.current.scale) < 0.001) return;
      animateTo(
        scale <= 1.001 ? { ...REST } : zoomAt(scale, event.clientX, event.clientY),
        0.18,
      );
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  /** A foto ainda não tinha carregado ao abrir: ajusta à proporção real. */
  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight || closing.current) return;
    const next = naturalWidth / naturalHeight;
    if (Math.abs(next - ratio.current) < 0.01) return;
    ratio.current = next;
    opening.current?.progress(1);
    rest.current = fitRect(next);
    gsap.to(frameRef.current, { ...rest.current, duration: 0.35, ease: "power2.out" });
    animateTo({ ...REST }, 0.35);
  };

  // ── Gestos ─────────────────────────────────────────────────────────────────

  const isOnImage = (point: Point) => {
    const rect = frameRef.current?.getBoundingClientRect();
    return (
      !!rect &&
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (closing.current) return;
    opening.current?.progress(1);
    syncView();
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const mid = midpoint(a, b);
      gesture.current = {
        kind: "pinch",
        distance: Math.max(1, distance(a, b)),
        mid,
        lastMid: mid,
        view: { ...view.current },
      };
    } else if (pointers.current.size === 1) {
      gesture.current = {
        kind: "pending",
        start: point,
        view: { ...view.current },
        onImage: isOnImage(point),
      };
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId) || closing.current) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    const current = gesture.current;
    if (!current) return;

    if (current.kind === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = Array.from(pointers.current.values());
      const mid = midpoint(a, b);
      current.lastMid = mid;
      // Um pouco abaixo/acima dos limites durante o gesto; ajusta ao soltar
      const scale = clamp(
        current.view.scale * (distance(a, b) / current.distance),
        0.85,
        MAX_SCALE * 1.2,
      );
      const { left, top } = rest.current;
      const imageX = (current.mid.x - left - current.view.x) / current.view.scale;
      const imageY = (current.mid.y - top - current.view.y) / current.view.scale;
      render({ scale, x: mid.x - left - scale * imageX, y: mid.y - top - scale * imageY });
      return;
    }

    if (current.kind === "pending") {
      const dx = point.x - current.start.x;
      const dy = point.y - current.start.y;
      if (Math.hypot(dx, dy) < 8) return;
      if (current.view.scale > 1.02) {
        gesture.current = {
          kind: "pan",
          start: current.start,
          view: current.view,
          last: point,
          lastTime: event.timeStamp,
          velocity: { x: 0, y: 0 },
        };
      } else if (Math.abs(dy) > Math.abs(dx)) {
        gesture.current = {
          kind: "swipe",
          start: current.start,
          last: point,
          lastTime: event.timeStamp,
          velocity: 0,
        };
      } else {
        gesture.current = { kind: "ignore" };
        return;
      }
    }

    const active = gesture.current;
    if (!active) return;
    const elapsed = Math.max(1, event.timeStamp - ("lastTime" in active ? active.lastTime : 0));

    if (active.kind === "pan") {
      if (frameRef.current) frameRef.current.style.cursor = "grabbing";
      const x = active.view.x + point.x - active.start.x;
      const y = active.view.y + point.y - active.start.y;
      const bounded = clampView(active.view.scale, x, y);
      // Passou do limite: resiste, como um elástico
      render({
        scale: active.view.scale,
        x: bounded.x + (x - bounded.x) * 0.35,
        y: bounded.y + (y - bounded.y) * 0.35,
      });
      active.velocity = {
        x: (point.x - active.last.x) / elapsed,
        y: (point.y - active.last.y) / elapsed,
      };
      active.last = point;
      active.lastTime = event.timeStamp;
    } else if (active.kind === "swipe") {
      // Arrastando para fechar: a foto segue o dedo e diminui um pouco
      const dy = point.y - active.start.y;
      const progress = Math.min(1, Math.abs(dy) / (window.innerHeight * 0.5));
      const scale = 1 - progress * 0.12;
      const { width, height } = rest.current;
      render({ scale, x: (width * (1 - scale)) / 2, y: dy + (height * (1 - scale)) / 2 });
      gsap.set(backdropRef.current, { opacity: 1 - progress * 0.85 });
      gsap.set(chromeRef.current, { opacity: Math.max(0, 1 - progress * 2) });
      active.velocity = (point.y - active.last.y) / elapsed;
      active.last = point;
      active.lastTime = event.timeStamp;
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    const current = gesture.current;
    if (!current || closing.current) {
      if (!pointers.current.size) gesture.current = null;
      return;
    }

    if (current.kind === "pinch") {
      // Soltou: volta para dentro dos limites de zoom
      const { scale, x, y } = view.current;
      if (scale < 1.02) animateTo({ ...REST });
      else if (scale > MAX_SCALE) animateTo(zoomAt(MAX_SCALE, current.lastMid.x, current.lastMid.y));
      else animateTo(clampView(scale, x, y));
      // O dedo que sobrar não faz nada até soltar
      gesture.current = pointers.current.size ? { kind: "ignore" } : null;
      return;
    }

    if (current.kind === "pan") {
      // Solta com embalo e para dentro dos limites
      const { scale, x, y } = view.current;
      animateTo(
        clampView(scale, x + current.velocity.x * 180, y + current.velocity.y * 180),
        0.55,
      );
    } else if (current.kind === "swipe") {
      const dy = current.last.y - current.start.y;
      if (Math.abs(dy) > 110 || Math.abs(current.velocity) > 0.6) {
        close();
      } else {
        animateTo({ ...REST }, 0.35);
        gsap.to([backdropRef.current, chromeRef.current], { opacity: 1, duration: 0.3 });
      }
    } else if (current.kind === "pending") {
      // Toque sem arrastar
      const point = { x: event.clientX, y: event.clientY };
      if (!current.onImage) {
        close();
      } else {
        const previous = lastTap.current;
        if (
          previous &&
          event.timeStamp - previous.time < 320 &&
          distance(previous.point, point) < 32
        ) {
          // Dois toques: amplia no ponto tocado (ou volta ao normal)
          lastTap.current = null;
          animateTo(
            view.current.scale > 1.05
              ? { ...REST }
              : zoomAt(DOUBLE_TAP_SCALE, point.x, point.y),
            0.42,
          );
        } else {
          lastTap.current = { time: event.timeStamp, point };
        }
      }
    }

    if (!pointers.current.size) gesture.current = null;
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[80] select-none">
      <div ref={backdropRef} className="absolute inset-0 bg-black/95" />
      <div
        ref={stageRef}
        className="absolute inset-0 touch-none cursor-zoom-out"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <div ref={frameRef} className="fixed overflow-hidden bg-[#191714] cursor-zoom-in">
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={onImageLoad}
            className="block w-full h-full object-cover pointer-events-none"
          />
          <div
            ref={shadeRef}
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: HERO_SHADE }}
          />
        </div>
      </div>
      <div ref={chromeRef} className="pointer-events-none">
        <button
          type="button"
          aria-label="Fechar a foto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={close}
          className="pointer-events-auto fixed top-4 right-4 p-2.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/85 hover:text-white transition-colors cursor-pointer"
        >
          <FiX size={20} />
        </button>
        {hint && <span className="cm-viewer-hint">{hint}</span>}
      </div>
    </div>,
    document.body,
  );
}
