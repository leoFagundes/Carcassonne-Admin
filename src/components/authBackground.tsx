"use client";

import type { CSSProperties } from "react";
import type { StaticImageData } from "next/image";
import ParticleCanvas, { type Rgb } from "@/components/siteTheme/ParticleCanvas";

const DUST_COLORS: readonly Rgb[] = [
  [255, 214, 140],
  [255, 236, 196],
  [230, 197, 107],
];

/**
 * Fonte de luz da foto que tremula: posição (fração da largura e da altura da
 * foto, de 0 a 1) e tamanho do halo (fração da largura). `fire` é uma
 * lareira: mais forte, mais laranja e com uma poça de luz em volta.
 */
export interface SceneLight {
  x: number;
  y: number;
  size: number;
  kind?: "flame" | "fire";
}

/**
 * Fundo vivo do login e do cadastro, integrado ao visual do site: a foto
 * preenche a tela (corte um pouco acima do centro), entra com um zoom lento e
 * depois respira devagar. Por cima, um tratamento que leva a foto para o
 * preto e dourado do site (cor mais calma, tom dourado, a textura hexagonal
 * das outras páginas, foco escuro atrás do card e vinheta), poeira dourada no
 * ar e as luzes da cena tremulando no lugar certo em qualquer tela.
 */
export default function AuthBackground({
  image,
  lights = [],
}: {
  image: StaticImageData;
  lights?: SceneLight[];
}) {
  return (
    <div
      aria-hidden="true"
      className="auth-scene-frame fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-primary-black"
    >
      <div
        className="auth-scene"
        style={{ "--auth-ratio": image.width / image.height } as CSSProperties}
      >
        <div
          className="auth-photo absolute inset-0 bg-no-repeat"
          style={{ backgroundImage: `url(${image.src})`, backgroundSize: "100% 100%" }}
        />
        {lights.map((light, index) => (
          <div
            key={`${light.x}-${light.y}`}
            className={`auth-light ${light.kind === "fire" ? "auth-light-fire" : ""}`}
            style={
              {
                left: `${light.x * 100}%`,
                top: `${light.y * 100}%`,
                "--light-size": light.size,
                // Cada luz num ritmo, para não piscarem juntas
                "--light-delay": `${-(index * 0.73) % 3}s`,
              } as CSSProperties
            }
          >
            {light.kind === "fire" && <span className="auth-light-pool" />}
            <span className="auth-light-halo" />
            <span className="auth-light-core" />
          </div>
        ))}
      </div>

      {/* Tratamento que integra a foto ao preto e dourado do site */}
      <div className="auth-tint absolute inset-0" />
      <div className="auth-hex absolute inset-0" />
      <ParticleCanvas kind="dust" density={2.2} max={56} colors={DUST_COLORS} />
      <div className="auth-vignette absolute inset-0" />
    </div>
  );
}
