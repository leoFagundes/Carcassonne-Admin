"use client";

import { ReactNode, useState } from "react";

type TooltipProps = {
  children: ReactNode;
  content?: string;
  contentNode?: ReactNode;
  textWrap?: boolean;
  direction?: "top" | "right" | "left" | "bottom";
  clickToStay?: boolean;
};

export default function Tooltip({
  children,
  content = "Tooltip",
  contentNode,
  textWrap = false,
  direction = "top",
  clickToStay = false,
}: TooltipProps) {
  const [isPersistent, setIsPersistent] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

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

  return (
    <div
      className=" relative flex items-center justify-center"
      onClick={toggleTooltip}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={() => setIsHovering(true)}
      onTouchEnd={() => setIsHovering(false)}
      onTouchCancel={() => setIsHovering(false)}
    >
      <div className={clickToStay ? "cursor-pointer" : ""}>{children}</div>

      {showTooltip && (
        <div
          className={`font-medium absolute ${
            textWrap
              ? "whitespace-break-spaces max-w-[300px] w-[300px] py-2"
              : "whitespace-nowrap"
          } shadow-card bg-primary-gold text-primary-black text-sm px-3 py-1 rounded-md transition-all z-40 border ${
            tooltipPosition[direction]
          }`}
        >
          <span className="text-md font-semibold w-full overflow-auto">
            {contentNode ? contentNode : content}
          </span>
          <div
            className={`absolute w-2 h-2 rotate-45 bg-primary-gold ${arrowPosition[direction]}`}
          />
        </div>
      )}
    </div>
  );
}
