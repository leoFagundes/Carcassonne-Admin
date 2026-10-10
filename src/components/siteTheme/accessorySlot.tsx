import "./siteTheme.css";
import type { ReactNode } from "react";

export type AccessoryPlacement = "top" | "corner";

/**
 * Como o enfeite assenta no logo:
 * - witch: chapéu com aba embaixo e ponta para a direita
 * - hat: chapéu largo em cima, levemente inclinado (palha, tirolês, cartola...)
 * - cone: chapéu de festa, pontudo
 * - crown: coroa/guirlanda pousada no topo
 * - ears: orelhas saindo por trás do logo
 */
export type AccessoryKind = "witch" | "hat" | "cone" | "crown" | "ears";

export function AccessorySlot({
  placement,
  kind,
  children,
}: {
  placement: AccessoryPlacement;
  kind: AccessoryKind;
  children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={`st-accessory ${placement === "corner" ? "st-accessory-corner" : ""} st-accessory-${kind}`}
    >
      {children}
    </span>
  );
}

/** Fundo das miniaturas do admin. */
export function ThumbFrame({ background, children }: { background: string; children: ReactNode }) {
  return (
    <div className="st-thumb" style={{ background }}>
      {children}
    </div>
  );
}

// As miniaturas usam um tamanho fixo de desenho (a faixa estica na largura do card)
export const THUMB_WIDTH = 300;
