import Tooltip from "@/components/Tooltip";
import { InfoType } from "@/types";
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
  function highlightMatch(text: string, search: string = "") {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    return text.replace(regex, `<span class='text-secondary-gold'>$1</span>`);
  }

  return (
    <div
      {...props}
      className={`relative flex flex-col w-[200px] h-[280px] outline hover:outline-primary-gold outline-transparent border border-primary-gold transition-all duration-200 ease-in scrollbar-none gap-2 items-center bg-primary-black/80 p-4 rounded text-primary-gold shadow-card cursor-pointer overflow-visible`}
    >
      <div className="flex items-center">
        <img
          className="w-[120px] h-[120px] rounded"
          src={"images/mascote-aviso.png"}
          alt="item"
        />
      </div>
      <span
        className="font-semibold text-center text-lg flex-1"
        dangerouslySetInnerHTML={{
          __html: highlightMatch(item.name, searchTerm),
        }}
      />

      <div className="overflow-y-scroll">
        <span
          className="text-sm text-center"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(item.description, searchTerm),
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
