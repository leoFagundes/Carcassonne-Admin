"use client";

import { useEffect, useRef } from "react";

// O botão/gesto de "voltar" do celular fecha a camada aberta (modal, gaveta,
// foto ampliada) em vez de sair da página. Cada camada empilha uma entrada no
// histórico ao abrir; voltar fecha só a de cima. Fechando pela própria
// interface, a entrada é retirada do histórico. O Esc do teclado faz o mesmo
// que o "voltar" — assim também fecha só a camada de cima.

interface Layer {
  onBack: () => void;
  pushed: boolean;
  poppedByBack: boolean;
}

const LAYER_KEY = "__carcassonneLayer";

// Camadas abertas, da mais antiga para a de cima
const layers: Layer[] = [];
// Voltas no histórico disparadas por nós mesmos (não fecham nada)
let ignoredPops = 0;
let listening = false;
let savedScrollRestoration: ScrollRestoration | null = null;

/** Sem camadas abertas, o navegador volta a restaurar a rolagem como antes. */
function restoreScrollMode() {
  if (layers.length || ignoredPops || savedScrollRestoration === null) return;
  window.history.scrollRestoration = savedScrollRestoration;
  savedScrollRestoration = null;
}

function onPopState() {
  if (ignoredPops > 0) {
    ignoredPops--;
  } else {
    const top = layers.pop();
    if (top) {
      top.poppedByBack = true;
      top.onBack();
    }
  }
  restoreScrollMode();
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented || !layers.length) return;
  event.preventDefault();
  window.history.back();
}

function pushLayer(layer: Layer) {
  if (!listening) {
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    listening = true;
  }
  if (savedScrollRestoration === null) {
    // Ao voltar, o navegador não pode "desfazer" uma rolagem feita com a
    // camada aberta (ex: a busca levando até o item)
    savedScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
  }
  // Mesma URL: o Next copia o próprio estado para a entrada e não navega
  window.history.pushState({ [LAYER_KEY]: true }, "");
  layer.pushed = true;
  layers.push(layer);
}

/**
 * Enquanto `open` for verdadeiro, o "voltar" do celular/navegador chama
 * `onBack` (que deve fechar a camada) em vez de sair da página.
 */
export function useBackToClose(open: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!open) return;
    const layer: Layer = {
      onBack: () => onBackRef.current(),
      pushed: false,
      poppedByBack: false,
    };
    // Adiado um instante: no modo estrito do React o efeito monta, desmonta e
    // monta de novo — assim não sobra entrada a mais no histórico
    const timer = window.setTimeout(() => pushLayer(layer), 0);

    return () => {
      window.clearTimeout(timer);
      if (!layer.pushed || layer.poppedByBack) return;
      const index = layers.indexOf(layer);
      if (index !== -1) layers.splice(index, 1);
      // Fechou pela interface: tira a entrada que a camada colocou (se a
      // página ainda estiver nela — uma navegação já teria saído dela)
      if (window.history.state?.[LAYER_KEY]) {
        ignoredPops++;
        window.history.back();
      } else {
        restoreScrollMode();
      }
    };
  }, [open]);
}
