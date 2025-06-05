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
      className={`relative flex flex-col w-[240px] h-fit max-h-[280px] outline hover:outline-primary-gold outline-transparent shadow-card-gold transition-all duration-200 ease-in scrollbar-none gap-2 items-center bg-primary-black/80 p-4 rounded-lg text-primary-gold cursor-pointer overflow-visible`}
    >
      <div className="flex items-center">
        <img
          className="w-[120px] rounded"
          src={"images/mascote-aviso-2.png"}
          alt="item"
        />
      </div>
      <span
        className="font-semibold text-center text-md w-full"
        dangerouslySetInnerHTML={{
          __html: highlightMatch(item.name, searchTerm),
        }}
      />

      <div className="overflow-y-scroll flex-1 w-full text-center">
        <span
          className="text-xs text-center w-full"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(
              truncateText(item.description, 80),
              searchTerm
            ),
          }}
        />
      </div>
      <div className="flex flex-col gap-2 absolute top-4 right-3">
        <Tooltip direction="left" content="Este item é um Aviso">
          <LuClipboardPenLine />
        </Tooltip>
      </div>
    </div>
  );
}
