"use client";

import { useEffect } from "react";

// Trava a rolagem da página enquanto houver alguma camada aberta (detalhe,
// gaveta de filtros, lista...). Com contador: fechar uma camada não destrava
// a página se outra ainda estiver aberta por cima.
let locks = 0;
let previousOverflow = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (locks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (--locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
