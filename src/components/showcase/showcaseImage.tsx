"use client";

import "./showcase.css";
import { useEffect, useRef, useState } from "react";

/**
 * Foto de vitrine (item do cardápio, jogo do acervo): só baixa quando chega
 * perto da tela, mostra um brilho dourado enquanto carrega e aparece
 * suavemente. Sem foto (ou com erro), usa a imagem padrão da vitrine.
 */
export default function ShowcaseImage({
  src,
  placeholder,
  className = "",
}: {
  src?: string;
  placeholder: string;
  className?: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Já estava no cache do navegador: aparece direto. A imagem padrão é um SVG
  // que se ajusta à caixa (sem tamanho próprio), então o naturalWidth dela é 0
  useEffect(() => {
    const image = imageRef.current;
    const isSvg = /\.svg($|\?)/.test(image?.currentSrc ?? "");
    if (image?.complete && (image.naturalWidth > 0 || isSvg)) setLoaded(true);
  }, []);

  return (
    <span className={`cm-img ${loaded ? "cm-img-loaded" : ""} ${className}`}>
      <img
        ref={imageRef}
        src={!src || failed ? placeholder : src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => (failed ? setLoaded(true) : setFailed(true))}
      />
    </span>
  );
}
