import tavern from "../../public/images/carcassonne-bg4.jpg";
import type { SceneLight } from "@/components/authBackground";

/**
 * Cena de fundo do login e do cadastro: a foto e onde ficam as luzes dela
 * (fração da largura e da altura da foto, de 0 a 1), para tremularem em cima
 * do desenho. Trocando a foto, ajuste as luzes aqui (ou deixe a lista vazia).
 */
export const AUTH_SCENE: { image: typeof tavern; lights: SceneLight[] } = {
  image: tavern,
  lights: [
    // { x: 0.662, y: 0.372, size: 0.2, kind: "fire" }, // lareira
    // { x: 0.921, y: 0.7, size: 0.11 }, // vela na mesa da frente
    // { x: 0.587, y: 0.19, size: 0.07 }, // lustre da esquerda
    // { x: 0.655, y: 0.215, size: 0.05 }, // lustre da direita
    // { x: 0.772, y: 0.225, size: 0.055 }, // lanterna pendurada
    // { x: 0.828, y: 0.268, size: 0.045 }, // arandela da direita
    // { x: 0.292, y: 0.275, size: 0.045 }, // arandelas da estante
    // { x: 0.382, y: 0.269, size: 0.045 },
  ],
};
