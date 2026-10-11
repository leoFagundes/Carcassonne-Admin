"use client";

import { RefObject, useEffect, useState } from "react";

// O cabeçalho encolhe depois de COMPACT_ENTER px de rolagem e só volta a abrir
// perto do topo — a folga evita que ele fique abrindo e fechando
export const COMPACT_ENTER = 72;
export const COMPACT_EXIT = 24;

/**
 * Cabeçalho fixo das vitrines: diz se ele deve estar compacto e enche a
 * linha de progresso (direto no estilo, sem re-render a cada rolagem).
 */
export function useShowcaseHeader(progressRef: RefObject<HTMLElement | null>) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;
    let isCompact = window.scrollY > COMPACT_ENTER;
    setCompact(isCompact);
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      const next = isCompact ? y > COMPACT_EXIT : y > COMPACT_ENTER;
      if (next !== isCompact) {
        isCompact = next;
        setCompact(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // A página muda de altura (carregou, filtrou): a linha se ajusta
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [progressRef]);

  return compact;
}
