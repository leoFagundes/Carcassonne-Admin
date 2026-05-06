import Tooltip from "@/components/Tooltip";
import { InfoType } from "@/types";
import { highlightMatch, truncateText } from "@/utils/utilFunctions";
import React, { ComponentProps } from "react";
import { LuClipboardPenLine } from "react-icons/lu";

interface InfoCardProps extends ComponentProps<"div"> {
  item: InfoType;
  searchTerm?: string;
}

export default function InfoCard({
  item,
  searchTerm,
  ...props
}: InfoCardProps) {
  return (
    <div
      {...props}
      className={`hover:border-primary-gold/55 group relative flex flex-col w-[190px] rounded-xl border shadow-card border-primary-gold/20 bg-secondary-black/50 cursor-pointer transition-all duration-200 overflow-hidden`}
    >
      {/* Image */}
      <div
        className="w-full h-[120px] bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${"images/mascote-aviso-2.png"})`,
        }}
      />

      {/* Info */}
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <span
          className="font-semibold text-sm text-primary-gold leading-tight line-clamp-2"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(item.name, searchTerm),
          }}
        />
        <span
          className="text-xs text-primary-gold/55 line-clamp-2"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(
              truncateText(item.description, 60),
              searchTerm,
            ),
          }}
        />
      </div>

      <div className="flex flex-col gap-2 absolute top-4 right-3 text-primary-gold">
        <Tooltip direction="left" content="Este item é um Aviso">
          <LuClipboardPenLine />
        </Tooltip>
      </div>
    </div>
  );
}
