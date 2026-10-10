"use client";

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { FiX } from "react-icons/fi";
import { LuMaximize2, LuVegan } from "react-icons/lu";
import Button from "@/components/button";
import type { MenuItemType } from "@/types";
import { HERO_RADIUS, HERO_SHADE, prefersReducedMotion } from "./motion";
import ImageViewer from "./imageViewer";

const PLACEHOLDER_IMAGE = "/images/[oficial]-pattern-menu-image.png";
const CARD_RADIUS = "6px 6px 6px 6px";
const FLY_SHADOW = "0px 18px 40px rgba(0,0,0,0.45)";
const NO_SHADOW = "0px 0px 0px rgba(0,0,0,0)";

/** Abaixo do breakpoint "sm" o detalhe vira gaveta. */
const isPhone = () => window.matchMedia("(max-width: 639.98px)").matches;

/** Retângulo do elemento, só se ele estiver visível na tela. */
function visibleRect(element: HTMLElement | null) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const onScreen = rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  return onScreen ? rect : null;
}

/** Cópia da foto que voa entre o card e o topo do painel, por cima de tudo. */
function createFlyer(src: string, rect: DOMRect, radius: string, shade: number, shadow: string) {
  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  Object.assign(box.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: radius,
    boxShadow: shadow,
    overflow: "hidden",
    zIndex: "70",
    pointerEvents: "none",
    background: "#191714",
  });
  const image = document.createElement("img");
  image.src = src;
  image.alt = "";
  Object.assign(image.style, { display: "block", width: "100%", height: "100%", objectFit: "cover" });
  const shadeLayer = document.createElement("div");
  Object.assign(shadeLayer.style, {
    position: "absolute",
    inset: "0",
    background: HERO_SHADE,
    opacity: String(shade),
  });
  box.append(image, shadeLayer);
  document.body.appendChild(box);
  return { box, shade: shadeLayer };
}

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
 * Detalhe do item. A foto sai do card e pousa no topo do painel (e volta ao
 * fechar); o título, o preço, os selos e o X entram em sequência depois que
 * ela pousa. No celular é uma gaveta que sobe de baixo e fecha arrastando a
 * foto para baixo; no computador, um cartão no centro.
 */
export default function ItemSheet({
  item,
  origin,
  onClosed,
}: {
  item: MenuItemType;
  /** Foto do card tocado — de onde a foto sai voando. */
  origin: HTMLElement | null;
  /** Chamado quando a animação de fechar termina. */
  onClosed: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLImageElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const animations = useRef<gsap.core.Animation[]>([]);
  const flyers = useRef<HTMLElement[]>([]);
  const closing = useRef(false);
  const drag = useRef<DragState | null>(null);
  // Depois de arrastar a foto, o "clique" que vem junto não abre o visualizador
  const suppressClick = useRef(false);
  const viewerOpenRef = useRef(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);
  const src = item.image || PLACEHOLDER_IMAGE;
  // Só faz sentido ampliar uma foto de verdade (não a imagem padrão)
  const canExpand = !!item.image && !heroFailed;

  const track = (animation: gsap.core.Animation) => {
    animations.current.push(animation);
  };

  /** Leva ao fim o que estiver animando (ex: a abertura, antes de arrastar). */
  const finishAnimations = () => {
    while (animations.current.length) {
      const running = animations.current;
      animations.current = [];
      running.forEach((animation) => animation.progress(1));
    }
  };

  // ── Elementos por cima da foto ─────────────────────────────────────────────

  const heroParts = () => ({
    handle: handleRef.current,
    close: closeButtonRef.current,
    expand: expandButtonRef.current,
    badges: badgesRef.current ? (Array.from(badgesRef.current.children) as HTMLElement[]) : [],
    title: titleRef.current,
    price: priceRef.current,
  });

  const allHeroParts = () => {
    const { handle, close, expand, badges, title, price } = heroParts();
    return [handle, close, expand, title, price, ...badges].filter(
      (element): element is HTMLElement => !!element,
    );
  };

  /** Esconde título, preço, selos, botões e alça na posição de onde vão entrar. */
  const hideHeroParts = () => {
    const { handle, close, expand, badges, title, price } = heroParts();
    gsap.set(allHeroParts(), { opacity: 0 });
    if (handle) gsap.set(handle, { scaleX: 0.3 });
    if (close) gsap.set(close, { scale: 0.55, rotate: -90 });
    if (expand) gsap.set(expand, { scale: 0.6 });
    if (badges.length) gsap.set(badges, { x: -14 });
    if (title) gsap.set(title, { y: 16 });
    if (price) gsap.set(price, { y: 12 });
  };

  /** Entrada em sequência: o título sobe, o preço vem atrás, selos e botões chegam. */
  const revealHeroParts = () => {
    const { handle, close, expand, badges, title, price } = heroParts();
    const timeline = gsap.timeline({
      defaults: { ease: "power3.out" },
      // Termina limpo, sem estilos de animação sobrando
      onComplete: () => gsap.set(allHeroParts(), { clearProps: "all" }),
    });
    if (title) timeline.to(title, { opacity: 1, y: 0, duration: 0.55 }, 0);
    if (price) timeline.to(price, { opacity: 1, y: 0, duration: 0.5 }, 0.08);
    if (badges.length) timeline.to(badges, { opacity: 1, x: 0, duration: 0.45, stagger: 0.07 }, 0.05);
    if (close) {
      timeline.to(close, { opacity: 1, scale: 1, rotate: 0, duration: 0.55, ease: "back.out(1.7)" }, 0.1);
    }
    if (expand) timeline.to(expand, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }, 0.16);
    if (handle) timeline.to(handle, { opacity: 1, scaleX: 1, duration: 0.45 }, 0.12);
    return timeline;
  };

  // ── Foto inteira (visualizador) ────────────────────────────────────────────

  const openViewer = () => {
    if (!canExpand || closing.current || viewerOpenRef.current) return;
    // Se o detalhe ainda estava abrindo, termina antes
    finishAnimations();
    viewerOpenRef.current = true;
    setViewerOpen(true);
  };

  /** A foto saiu do detalhe: título, botões e selos somem por baixo dela. */
  const leaveHero = () => {
    const parts = allHeroParts();
    gsap.killTweensOf(parts);
    gsap.to(parts, { opacity: 0, duration: 0.15, ease: "power1.out" });
  };

  /** A foto voltou: os elementos entram de novo, na mesma sequência da abertura. */
  const returnHero = () => {
    const parts = allHeroParts();
    gsap.killTweensOf(parts);
    if (prefersReducedMotion()) {
      gsap.set(parts, { clearProps: "all" });
      return;
    }
    hideHeroParts();
    track(revealHeroParts());
  };

  const closeViewer = () => {
    viewerOpenRef.current = false;
    setViewerOpen(false);
  };

  // ── Abertura ───────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const heroImage = heroImageRef.current;
    if (!overlay || !panel || !heroImage) return;
    const still = prefersReducedMotion();
    const phone = isPhone();
    // Onde a foto vai pousar — medido antes de qualquer animação
    const target = heroImage.getBoundingClientRect();
    const from = still ? null : visibleRect(origin);
    // Adianta a decodificação da foto para a troca no pouso não piscar
    heroImage.decode?.().catch(() => undefined);

    // Mesma duração e curva para a gaveta e a foto: chegam juntas
    const duration = phone ? 0.55 : 0.5;

    track(
      gsap.fromTo(
        overlay,
        { opacity: 0 },
        { opacity: 1, duration: still ? 0.2 : 0.35, ease: "power1.out" },
      ),
    );
    if (still) {
      track(gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.2 }));
    } else if (phone) {
      track(
        gsap.fromTo(
          panel,
          { y: panel.offsetHeight + 40 },
          { y: 0, duration, ease: "power4.out" },
        ),
      );
    } else {
      track(
        gsap.fromTo(
          panel,
          { opacity: 0, y: 24, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" },
        ),
      );
    }

    if (from && origin) {
      // A foto sai do card e pousa no topo do painel
      const flyer = createFlyer(src, from, CARD_RADIUS, 0, FLY_SHADOW);
      flyers.current.push(flyer.box);
      origin.style.visibility = "hidden";
      heroImage.style.opacity = "0";
      hideHeroParts();
      track(
        gsap
          .timeline()
          .to(
            flyer.box,
            {
              left: target.left,
              top: target.top,
              width: target.width,
              height: target.height,
              borderRadius: HERO_RADIUS,
              boxShadow: NO_SHADOW,
              duration,
              ease: "power4.out",
            },
            0,
          )
          .to(flyer.shade, { opacity: 1, duration: duration * 0.75, ease: "power1.out" }, 0)
          // Visualmente já pousou (falta menos de 1px): troca a cópia pela
          // foto do painel e os elementos começam a entrar, sem tempo parado
          .call(
            () => {
              heroImage.style.opacity = "";
              flyer.box.remove();
              track(revealHeroParts());
            },
            undefined,
            duration * 0.82,
          ),
      );
    } else if (!still) {
      // Sem voo (card fora da tela): os elementos entram junto com o painel
      hideHeroParts();
      track(revealHeroParts().delay(phone ? 0.22 : 0.12));
    }

    return () => {
      animations.current.forEach((animation) => animation.kill());
      animations.current = [];
      flyers.current.forEach((flyer) => flyer.remove());
      flyers.current = [];
      gsap.set([overlay, panel, ...allHeroParts()], { clearProps: "all" });
      heroImage.style.opacity = "";
      if (origin) origin.style.visibility = "";
    };
  }, []);

  // ── Fechar ─────────────────────────────────────────────────────────────────

  /**
   * Os elementos saem primeiro e a foto decola de volta para o card. Vindo
   * de um arrasto (`immediate`), a gaveta continua descendo sem pausa.
   */
  const close = useCallback(
    (immediate = false) => {
      if (closing.current) return;
      closing.current = true;
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      const heroImage = heroImageRef.current;
      if (!overlay || !panel || !heroImage) {
        onClosed();
        return;
      }
      finishAnimations();
      const still = prefersReducedMotion();
      const phone = isPhone();
      const to = still ? null : visibleRect(origin);
      const parts = allHeroParts();
      // Tempo para título, X e selos saírem antes de a foto decolar
      const lift = to && !immediate ? 0.16 : 0;

      const timeline = gsap.timeline({
        onComplete: () => {
          if (origin) origin.style.visibility = "";
          onClosed();
        },
      });

      if (to && immediate) {
        // Arrasto: a cópia da foto cobre tudo na hora
        timeline.set(parts, { opacity: 0 }, 0);
      } else if (to) {
        const { handle, close: closeButton, expand, badges, title, price } = heroParts();
        const fade = { opacity: 0, duration: 0.14, ease: "power2.in" };
        if (title) timeline.to(title, { ...fade, y: 10 }, 0);
        if (price) timeline.to(price, { ...fade, y: 8 }, 0.02);
        if (badges.length) timeline.to(badges, { ...fade, x: -10, stagger: 0.02 }, 0);
        const controls = [closeButton, expand, handle].filter(
          (element): element is HTMLElement => !!element,
        );
        if (controls.length) timeline.to(controls, { ...fade, scale: 0.7 }, 0);
      }

      timeline.to(overlay, { opacity: 0, duration: still ? 0.15 : 0.38, ease: "power1.in" }, 0);
      if (still) {
        timeline.to(panel, { opacity: 0, duration: 0.15 }, 0);
      } else if (phone) {
        timeline.to(panel, { y: panel.offsetHeight + 40, duration: 0.42, ease: "power3.in" }, lift);
      } else {
        timeline.to(panel, { opacity: 0, y: 16, scale: 0.97, duration: 0.3, ease: "power2.in" }, lift);
      }

      if (to) {
        // A foto decola do painel e volta para o card de onde saiu. A cópia
        // nasce escondida no lugar da foto e aparece no instante da decolagem
        // (o painel ainda não se mexeu até lá).
        const flyer = createFlyer(src, heroImage.getBoundingClientRect(), HERO_RADIUS, 1, NO_SHADOW);
        flyer.box.style.visibility = "hidden";
        flyers.current.push(flyer.box);
        timeline
          .call(
            () => {
              flyer.box.style.visibility = "";
              heroImage.style.opacity = "0";
            },
            undefined,
            lift,
          )
          .to(
            flyer.box,
            {
              left: to.left,
              top: to.top,
              width: to.width,
              height: to.height,
              borderRadius: CARD_RADIUS,
              duration: 0.5,
              ease: "power3.inOut",
              onComplete: () => flyer.box.remove(),
            },
            lift,
          )
          .to(flyer.shade, { opacity: 0, duration: 0.4, ease: "power1.in" }, lift);
      } else if (origin) {
        origin.style.visibility = "";
      }
      track(timeline);
    },
    [onClosed, origin, src],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Com a foto aberta, o Esc fecha só a foto (o visualizador cuida disso)
      if (event.key === "Escape" && !viewerOpenRef.current) close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  // ── Arrastar para fechar (celular) ─────────────────────────────────────────

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPhone() || closing.current || event.button !== 0) return;
    // O X continua sendo um clique normal
    if ((event.target as HTMLElement).closest("button")) return;
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
    const overlay = overlayRef.current;
    if (!state || state.pointerId !== event.pointerId || !panel || !overlay) return;
    const distance = event.clientY - state.startY;
    if (!state.active) {
      if (Math.abs(distance) < 6) return;
      // Começou a arrastar: termina a abertura e passa a seguir o dedo
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
    gsap.set(overlay, {
      opacity: 1 - Math.max(0, state.offset) / (panel.offsetHeight * 1.2),
    });
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!state.active) return;
    // O navegador ainda manda um "clique" depois do arrasto: ignora esse
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);
    if (state.offset > 110 || state.velocity > 0.5) {
      close(true);
    } else {
      // Não arrastou o suficiente: volta para o lugar
      track(gsap.to(panelRef.current, { y: 0, duration: 0.45, ease: "back.out(1.6)" }));
      track(gsap.to(overlayRef.current, { opacity: 1, duration: 0.3 }));
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[3px]"
    >
      <div
        ref={panelRef}
        className="cm-sheet-panel relative w-full flex flex-col overflow-hidden bg-primary-black rounded-t-2xl border-t border-primary-gold/20 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] sm:w-[420px] sm:rounded-2xl sm:border sm:bg-secondary-black/95 sm:shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
      >
        {/* Foto: tocar abre ela inteira; no celular, arrastar para baixo fecha */}
        <div
          className={`cm-sheet-drag relative w-full h-[240px] shrink-0 bg-[#191714] ${
            canExpand ? "cursor-zoom-in" : ""
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={(event) => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            // X e botão de expandir cuidam do próprio clique
            if ((event.target as HTMLElement).closest("button")) return;
            openViewer();
          }}
        >
          <img
            ref={heroImageRef}
            className="w-full h-full object-cover"
            src={src}
            alt={item.name}
            draggable={false}
            onError={(event) => {
              // Foto quebrada: usa a imagem padrão do cardápio (e não amplia)
              if (!event.currentTarget.src.includes("pattern-menu-image")) {
                event.currentTarget.src = PLACEHOLDER_IMAGE;
                setHeroFailed(true);
              }
            }}
          />
          {/* Degradê fixo: fica sempre visível, igual ao da foto que voa */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: HERO_SHADE }}
          />

          <div
            aria-hidden="true"
            className="absolute top-2 inset-x-0 flex justify-center pointer-events-none sm:hidden"
          >
            <span ref={handleRef} className="w-10 h-1 rounded-full bg-white/45" />
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => close()}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-2 bg-primary-black/60 backdrop-blur-sm rounded-full border border-primary-gold/20 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/50 transition-colors cursor-pointer"
          >
            <FiX size={18} />
          </button>

          <div ref={badgesRef} className="absolute top-4 left-4 flex flex-col gap-2">
            {item.isFocus && (
              <span className="px-2 py-0.5 bg-primary-gold text-primary-black text-xs font-bold rounded-full">
                Destaque
              </span>
            )}
            {item.isVegan && (
              <div className="p-1.5 bg-primary-black/70 backdrop-blur-sm rounded-full border border-primary-gold/30 w-fit">
                <LuVegan size={18} className="text-primary-gold" />
              </div>
            )}
          </div>

          <div
            className={`absolute bottom-0 left-0 right-0 px-5 pb-4 ${canExpand ? "pr-16" : ""}`}
          >
            <p ref={titleRef} className="text-2xl font-bold text-primary drop-shadow-lg leading-tight">
              {item.name}
            </p>
            {item.value && (
              <span ref={priceRef} className="block text-primary-gold font-semibold text-base">
                {item.value}
              </span>
            )}
          </div>

          {/* Ver a foto inteira (também abre tocando na própria foto) */}
          {canExpand && (
            <button
              ref={expandButtonRef}
              type="button"
              onClick={openViewer}
              aria-label="Ver a foto inteira"
              title="Ver a foto inteira"
              className="absolute bottom-4 right-4 p-2 bg-primary-black/60 backdrop-blur-sm rounded-full border border-primary-gold/20 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/50 transition-colors cursor-pointer"
            >
              <LuMaximize2 size={16} />
            </button>
          )}
        </div>

        {viewerOpen && (
          <ImageViewer
            src={src}
            alt={item.name}
            hero={heroImageRef}
            onLeaveHero={leaveHero}
            onReturnHero={returnHero}
            onClosed={closeViewer}
          />
        )}

        {/* Conteúdo (rola quando é comprido) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-4">
          {item.description && (
            <p className="text-sm text-primary-gold/85 whitespace-pre-line leading-relaxed">
              {item.description}
            </p>
          )}

          {item.sideDish && item.sideDish.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Acompanhamentos
              </span>
              <ul className="flex flex-col gap-1.5">
                {item.sideDish.map((dish, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-primary-gold/80">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                    {dish}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.observation && (item.observation.length > 0 || item.isVegan) && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Observações
              </span>
              <ul className="flex flex-col gap-1.5">
                {item.observation.map((observation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-primary-gold/80">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                    {observation}
                  </li>
                ))}
                {item.isVegan && (
                  <li className="flex items-start gap-2 text-sm text-primary-gold/80">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                    Item vegano
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-primary-gold/10">
          <Button onClick={() => close()}>Voltar</Button>
        </div>
      </div>
    </div>
  );
}
