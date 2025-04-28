import { ReactNode } from "react";

type TooltipProps = {
  children: ReactNode;
  content: string;
  direction?: "top" | "right" | "left" | "bottom";
};

export default function Tooltip({
  children,
  content,
  direction = "top",
}: TooltipProps) {
  const tooltipPosition: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
  };

  const arrowPosition: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2",
    bottom: "bottom-full left-1/2 -translate-x-1/2",
    left: "left-full top-1/2 -translate-y-1/2",
    right: "right-full top-1/2 -translate-y-1/2",
  };

  return (
    <div className="relative group flex items-center justify-center">
      {children}

      <div
        className={`font-medium absolute hidden group-hover:flex border border-primary-black sahdow-card bg-primary-gold text-primary-black text-sm px-3 py-1 rounded-md whitespace-nowrap transition-all z-20 ${tooltipPosition[direction]}`}
      >
        <span className="text-md font-semibold">{content}</span>
        <div
          className={`absolute w-2 h-2 rotate-45 bg-primary-gold e ${arrowPosition[direction]}`}
        />
      </div>
    </div>
  );
}
