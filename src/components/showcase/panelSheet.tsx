"use client";

import "./showcase.css";
import {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import gsap from "gsap";
import { FiX } from "react-icons/fi";
import { useBackToClose } from "@/components/useBackToClose";
import { prefersReducedMotion } from "./motion";
import { useScrollLock } from "./scrollLock";

/** Abaixo do breakpoint "sm" o painel vira gaveta. */
const isPhone = () => window.matchMedia("(max-width: 639.98px)").matches;

interface DragState {
  pointerId: number;
  startY: number;
  lastY: number;
  lastTime: number;
  velocity: number;
  offset: number;
  active: boolean;
}

/**
 * Painel das vitrines (filtros, "minha lista"...). No celular é uma gaveta
 * que sobe de baixo e fecha arrastando o cabeçalho para baixo; no computador,
 * um cartão no centro. Os elementos com `data-sheet-item` entram em
 * sequência. Fecha com o X, tocando fora, com o "voltar" do celular ou Esc.
 */
export default function PanelSheet({
  title,
  subtitle,
  icon,
  headerAction,
  overlay,
  onClosed,
  footer,
  children,
  className = "sm:w-[520px]",
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Ação extra no cabeçalho, ao lado do X (ex: "Limpar"). */
  headerAction?: ReactNode;
  /** Camada por cima do painel inteiro (ex: confete). */
  overlay?: ReactNode;
  /** Chamado quando a animação de fechar termina. */
  onClosed: () => void;
  /** Rodapé; recebe a função que fecha com animação. */
  footer?: (close: () => void) => ReactNode;
  children: ReactNode;
  /** Largura do painel no computador. */
  className?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const animations = useRef<gsap.core.Animation[]>([]);
  const closing = useRef(false);
  const drag = useRef<DragState | null>(null);

  useScrollLock(true);

  /** Leva ao fim o que estiver animando (ex: a abertura, antes de arrastar). */
  const finishAnimations = () => {
    const running = animations.current;
    animations.current = [];
    running.forEach((animation) => animation.progress(1));
  };

  // Abertura: o painel sobe (ou aparece) e o conteúdo entra em sequência
  useLayoutEffect(() => {
    const overlayElement = overlayRef.current;
    const panel = panelRef.current;
    if (!overlayElement || !panel) return;
    const still = prefersReducedMotion();
    const items = Array.from(panel.querySelectorAll<HTMLElement>("[data-sheet-item]"));
    const timeline = gsap.timeline();
    timeline.fromTo(
      overlayElement,
      { opacity: 0 },
      { opacity: 1, duration: still ? 0.2 : 0.35, ease: "power1.out" },
      0,
    );
    if (still) {
      timeline.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0);
    } else if (isPhone()) {
      timeline.fromTo(
        panel,
        { y: panel.offsetHeight + 40 },
        { y: 0, duration: 0.55, ease: "power4.out" },
        0,
      );
    } else {
      timeline.fromTo(
        panel,
        { opacity: 0, y: 24, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" },
        0,
      );
    }
    if (!still && items.length) {
      timeline.fromTo(
        items,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power3.out",
          stagger: 0.05,
          clearProps: "opacity,transform",
        },
        0.12,
      );
    }
    animations.current.push(timeline);

    return () => {
      timeline.kill();
      animations.current = [];
      gsap.set([overlayElement, panel, ...items], { clearProps: "opacity,transform" });
    };
  }, []);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const overlayElement = overlayRef.current;
    const panel = panelRef.current;
    if (!overlayElement || !panel) {
      onClosed();
      return;
    }
    finishAnimations();
    const still = prefersReducedMotion();
    const timeline = gsap.timeline({ onComplete: onClosed });
    timeline.to(overlayElement, { opacity: 0, duration: still ? 0.15 : 0.32, ease: "power1.in" }, 0);
    if (still) {
      timeline.to(panel, { opacity: 0, duration: 0.15 }, 0);
    } else if (isPhone()) {
      timeline.to(panel, { y: panel.offsetHeight + 40, duration: 0.38, ease: "power3.in" }, 0);
    } else {
      timeline.to(panel, { opacity: 0, y: 16, scale: 0.97, duration: 0.26, ease: "power2.in" }, 0);
    }
    animations.current.push(timeline);
  }, [onClosed]);

  // "Voltar" do celular (ou Esc) fecha o painel em vez de sair da página
  useBackToClose(true, close);

  // ── Arrastar o cabeçalho para fechar (celular) ─────────────────────────────

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPhone() || closing.current || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a, input")) return;
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      offset: 0,
      active: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const panel = panelRef.current;
    const overlayElement = overlayRef.current;
    if (!state || state.pointerId !== event.pointerId || !panel || !overlayElement) return;
    const distance = event.clientY - state.startY;
    if (!state.active) {
      if (Math.abs(distance) < 6) return;
      state.active = true;
      finishAnimations();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    state.velocity = (event.clientY - state.lastY) / Math.max(1, event.timeStamp - state.lastTime);
    state.lastY = event.clientY;
    state.lastTime = event.timeStamp;
    // Para baixo acompanha o dedo; para cima, só um pouco (resistência)
    state.offset = distance > 0 ? distance : distance / 4;
    gsap.set(panel, { y: state.offset });
    gsap.set(overlayElement, {
      opacity: 1 - Math.max(0, state.offset) / (panel.offsetHeight * 1.2),
    });
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!state.active) return;
    if (state.offset > 100 || state.velocity > 0.5) {
      close();
    } else {
      animations.current.push(
        gsap.to(panelRef.current, { y: 0, duration: 0.45, ease: "back.out(1.6)" }),
        gsap.to(overlayRef.current, { opacity: 1, duration: 0.3 }),
      );
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      // Desfoque só no computador (no celular, desfocar a página animada por
      // trás enquanto o véu aparece fazia a abertura piscar)
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 sm:bg-black/60 sm:backdrop-blur-[3px]"
    >
      <div
        ref={panelRef}
        className={`cm-sheet-panel relative w-full flex flex-col overflow-hidden bg-primary-black rounded-t-2xl border-t border-primary-gold/20 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:border sm:bg-secondary-black/95 sm:shadow-[0_24px_70px_rgba(0,0,0,0.6)] ${className}`}
      >
        {/* Cabeçalho (no celular, arrastar daqui para baixo fecha) */}
        <div
          className="cm-sheet-drag relative shrink-0 px-5 pt-5 pb-3 border-b border-primary-gold/10"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div
            aria-hidden="true"
            className="absolute top-2 inset-x-0 flex justify-center pointer-events-none sm:hidden"
          >
            <span className="w-10 h-1 rounded-full bg-primary-gold/25" />
          </div>
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl border border-primary-gold/25 bg-primary-gold/10 text-primary-gold">
                {icon}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-cinzel text-base sm:text-lg text-primary-gold tracking-wide leading-tight truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-[11px] text-primary-gold/50 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            {headerAction}
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="shrink-0 p-2 rounded-full border border-primary-gold/20 text-primary-gold/70 hover:text-primary-gold hover:border-primary-gold/50 transition-colors cursor-pointer"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="shrink-0 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-primary-gold/10">
            {footer(close)}
          </div>
        )}

        {overlay}
      </div>
    </div>
  );
}
