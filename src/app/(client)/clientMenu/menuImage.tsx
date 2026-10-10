"use client";

import { useEffect, useRef, useState } from "react";

const PLACEHOLDER_IMAGE = "/images/[oficial]-pattern-menu-image.png";

/**
 * Foto do item: só baixa quando chega perto da tela, mostra um brilho
 * dourado enquanto carrega e aparece suavemente. Sem foto (ou com erro), usa
 * a imagem padrão do cardápio.
 */
export default function MenuImage({ src, className = "" }: { src?: string; className?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Já estava no cache do navegador: aparece direto
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <span className={`cm-img ${loaded ? "cm-img-loaded" : ""} ${className}`}>
      <img
        ref={imageRef}
        src={!src || failed ? PLACEHOLDER_IMAGE : src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => (failed ? setLoaded(true) : setFailed(true))}
      />
    </span>
  );
}
