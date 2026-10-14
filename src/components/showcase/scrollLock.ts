"use client";

import { useEffect } from "react";

// Trava a rolagem da página enquanto houver alguma camada aberta (detalhe,
// gaveta de filtros, lista...). Com contador: fechar uma camada não destrava
// a página se outra ainda estiver aberta por cima.
//
// Também marca o <html> com data-layer-open: as decorações do tema ficam
// atrás do véu escuro e param de animar enquanto isso (no celular, animar
// tudo por baixo da camada que está abrindo deixava a abertura piscando).
let locks = 0;
let previousOverflow = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.dataset.layerOpen = "";
    }
    return () => {
      if (--locks === 0) {
        document.body.style.overflow = previousOverflow;
        delete document.documentElement.dataset.layerOpen;
      }
    };
  }, [active]);
}
