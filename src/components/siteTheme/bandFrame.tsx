"use client";

import "./siteTheme.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ParticleCanvas, { type ParticleKind, type Rgb } from "./ParticleCanvas";
import { OrnamentStrip, type StripKind } from "./strips";
import { useSiteThemeStyle } from "./siteThemeContext";

export type BandVariant = "header" | "sidebar";

/** Como cada tema decora as barras fixas (cabeçalho do cardápio e menu do admin). */
export interface BandLook {
  particle: ParticleKind;
  colors: readonly Rgb[];
  /** Faixa pendurada sob o cabeçalho. */
  headerStrip: StripKind;
  /** Faixa vertical na borda do menu lateral. */
  sideStrip: StripKind;
  /** Cores das flâmulas/serpentina das faixas, quando houver. */
  stripColors?: string[];
  cornerLeft: ReactNode;
  cornerRight: ReactNode;
  /** Símbolo do tema no selo do cabeçalho (versão minimalista). */
  emblem: ReactNode;
  /** Cena pequena no pé do menu lateral (recebe a largura do menu). */
  footer: (width: number) => ReactNode;
}

/**
 * Decoração do tema dentro de uma barra fixa e opaca, que cobriria as
 * decorações da página. Fica atrás do conteúdo da barra (z-index -1 dentro
 * dela); no cabeçalho, a faixa fica pendurada logo abaixo. Na versão
 * minimalista do tema fica só a faixa (e o brilho de fundo).
 */
export function BandFrame({ look, variant }: { look: BandLook; variant: BandVariant }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const minimal = useSiteThemeStyle().style === "minimal";

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const isHeader = variant === "header";

  return (
    <>
      <div ref={ref} aria-hidden="true" className={`st-band st-band-${variant}`}>
        <div className={`st-band-glow st-band-glow-${variant}`} />
        {!minimal && (
          <ParticleCanvas
            kind={look.particle}
            density={isHeader ? 26 : 16}
            max={isHeader ? 24 : 30}
            colors={look.colors}
          />
        )}
        {isHeader ? (
          minimal ? (
            // Selo com o símbolo do tema no canto, ao lado do título
            <div className="st-band-emblem">
              <div className="st-band-emblem-art">{look.emblem}</div>
            </div>
          ) : (
            <>
              <div className="st-band-corner st-band-corner-left">{look.cornerLeft}</div>
              <div className="st-band-corner st-band-corner-right">{look.cornerRight}</div>
            </>
          )
        ) : (
          <>
            <div className="st-band-side-strip">
              <OrnamentStrip
                kind={look.sideStrip}
                length={size.height}
                thickness={14}
                vertical
                colors={look.stripColors}
              />
            </div>
            {!minimal && <div className="st-band-footer">{look.footer(size.width)}</div>}
          </>
        )}
      </div>

      {isHeader && (
        <div aria-hidden="true" className="st-band-hang">
          <OrnamentStrip
            kind={look.headerStrip}
            length={size.width}
            thickness={18}
            colors={look.stripColors}
          />
        </div>
      )}
    </>
  );
}
