"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * "site": camadas presas à tela inteira, nas páginas do cliente.
 * "preview": camadas presas a uma caixa (a pré-visualização do admin).
 */
export type SceneVariant = "site" | "preview";

export type LayerRef = RefObject<HTMLDivElement | null>;

// A camada de trás fica sobre o fundo e atrás do conteúdo — por isso as
// decorações maiores (lua, abóboras, coelho) nunca cobrem textos nem botões.
// A da frente só tem coisas pequenas e de passagem (morcegos, borboletas),
// abaixo dos botões flutuantes (z-40) e dos modais (z-50).
const LAYER_CLASS: Record<SceneVariant, Record<"back" | "front", string>> = {
  site: { back: "fixed inset-0 z-[-1]", front: "fixed inset-0 z-30" },
  preview: { back: "absolute inset-0 z-0", front: "absolute inset-0 z-20" },
};

/** true enquanto o tema está saindo (trocado em tempo real) — as camadas somem. */
export const SceneLeavingContext = createContext(false);

/**
 * true na versão minimalista do tema: fica só o céu, a decoração do topo e
 * poucas partículas — sai a camada da frente (o que passa pela tela) e tudo
 * que estiver dentro de <FullOnly> (a muralha, os enfeites do rodapé...).
 */
export const SceneMinimalContext = createContext(false);

export const useSceneMinimal = () => useContext(SceneMinimalContext);

/** Só aparece na versão completa do tema. */
export function FullOnly({ children }: { children: ReactNode }) {
  return useSceneMinimal() ? null : <>{children}</>;
}

export function SceneLayer({
  variant,
  depth,
  layerRef,
  children,
}: {
  variant: SceneVariant;
  depth: "back" | "front";
  layerRef?: LayerRef;
  children: ReactNode;
}) {
  const leaving = useContext(SceneLeavingContext);
  const minimal = useSceneMinimal();
  // A camada da frente (coisas passando pela tela) é só da versão completa
  if (minimal && depth === "front") return null;
  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className={`site-theme-layer ${LAYER_CLASS[variant][depth]} ${
        leaving ? "site-theme-layer-leaving" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const random = (min: number, max: number) =>
  min + Math.random() * (max - min);

/**
 * Largura da camada. Só a largura: no celular a altura muda o tempo todo com
 * a barra do navegador, e nada aqui precisa ser redesenhado por isso.
 */
export function useLayerWidth(ref: LayerRef) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
