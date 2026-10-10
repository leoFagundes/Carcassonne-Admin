"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * Faz os elementos com `data-reveal` surgirem (subindo e aparecendo) quando
 * entram na tela — uma vez só, em sequência quando chegam juntos. Roda depois
 * de cada render para pegar elementos novos.
 */
export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const watched = useRef(new WeakSet<Element>());

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    const pending = document.querySelectorAll<HTMLElement>(
      "[data-reveal]:not([data-revealed])",
    );
    if (!pending.length) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      pending.forEach((element) => element.setAttribute("data-revealed", ""));
      return;
    }

    observerRef.current ??= new IntersectionObserver(
      (entries, observer) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          // Os que entram juntos aparecem um logo depois do outro
          element.style.setProperty("--cm-reveal-delay", `${Math.min(order++, 6) * 70}ms`);
          element.setAttribute("data-revealed", "");
          observer.unobserve(element);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );

    pending.forEach((element) => {
      if (watched.current.has(element)) return;
      watched.current.add(element);
      observerRef.current!.observe(element);
    });
  });
}
