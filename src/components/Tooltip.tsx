"use client";

import { CSSProperties, ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Direction = "top" | "right" | "left" | "bottom";

type TooltipProps = {
  children: ReactNode;
  content?: string;
  contentNode?: ReactNode;
  textWrap?: boolean;
  direction?: Direction;
  clickToStay?: boolean;
  /**
   * Desenha o balão por cima da página (fora do container). Para tooltips
   * dentro de áreas com rolagem — como o menu lateral do admin —, que
   * cortariam o balão na borda.
   */
  portal?: boolean;
};

/** Posição do balão desenhado fora do container (mesmas distâncias de mb-3/mt-3/mr-2/ml-2). */
function portalStyle(rect: DOMRect, direction: Direction): CSSProperties {
  switch (direction) {
    case "top":
      return { left: rect.left + rect.width / 2, top: rect.top - 12, transform: "translate(-50%, -100%)" };
    case "bottom":
      return { left: rect.left + rect.width / 2, top: rect.bottom + 12, transform: "translateX(-50%)" };
    case "left":
      return { left: rect.left - 8, top: rect.top + rect.height / 2, transform: "translate(-100%, -50%)" };
    case "right":
      return { left: rect.right + 8, top: rect.top + rect.height / 2, transform: "translateY(-50%)" };
  }
}

export default function Tooltip({
  children,
  content = "Tooltip",
  contentNode,
  textWrap = false,
  direction = "top",
  clickToStay = false,
  portal = false,
}: TooltipProps) {
  const [isPersistent, setIsPersistent] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const tooltipPosition: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowPosition: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-b border-r",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-t border-l",
    left: "left-full top-1/2 -translate-y-1/2 border-r border-t",
    right: "right-full top-1/2 -translate-y-1/2 border-l border-b",
  };

  const toggleTooltip = () => {
    if (clickToStay) {
      setIsPersistent((prev) => !prev);
    }
  };

  const showTooltip = clickToStay ? isPersistent || isHovering : isHovering;

  // Balão fora do container: mede o elemento antes de pintar e acompanha a
  // rolagem/redimensionamento enquanto ele estiver aparecendo
  useLayoutEffect(() => {
    if (!portal || !showTooltip) return;
    const update = () => setRect(wrapperRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [portal, showTooltip]);

  const renderBox = (positionClass: string, style?: CSSProperties) => (
    <div
      style={style}
      className={`font-medium ${positionClass} ${
        textWrap
          ? "whitespace-break-spaces max-w-[300px] w-[300px] py-2"
          : "whitespace-nowrap"
      } shadow-card bg-primary-gold text-primary-black text-sm px-3 py-1 rounded-md transition-all border`}
    >
      <span className="text-md font-semibold w-full overflow-auto">
        {contentNode ? contentNode : content}
      </span>
      <div
        className={`absolute w-2 h-2 rotate-45 bg-primary-gold ${arrowPosition[direction]}`}
      />
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className=" relative flex items-center justify-center"
      onClick={toggleTooltip}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={() => setIsHovering(true)}
      onTouchEnd={() => setIsHovering(false)}
      onTouchCancel={() => setIsHovering(false)}
    >
      <div className={clickToStay ? "cursor-pointer" : ""}>{children}</div>

      {showTooltip &&
        (portal
          ? rect &&
            createPortal(
              renderBox("fixed z-[100] pointer-events-none", portalStyle(rect, direction)),
              document.body,
            )
          : renderBox(`absolute z-40 ${tooltipPosition[direction]}`))}
    </div>
  );
}
