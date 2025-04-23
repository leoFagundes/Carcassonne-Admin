import Tooltip from "@/components/Tooltip";
import { MenuItemType } from "@/types";
import React, { ComponentProps } from "react";
import { LuEye, LuEyeOff, LuStar, LuVegan } from "react-icons/lu";

interface MenuCardProps extends ComponentProps<"div"> {
  item: MenuItemType;
  searchTerm?: string;
}

export default function Card({ item, searchTerm, ...props }: MenuCardProps) {
  function highlightMatch(text: string, search: string = "") {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    return text.replace(regex, `<span class='text-secondary-gold'>$1</span>`);
  }

  return (
    <div
      {...props}
      className={`${
        !item.isVisible && "opacity-50"
      } relative flex flex-col w-[200px] h-[280px] outline hover:outline-primary-gold outline-transparent border border-primary-gold transition-all duration-200 ease-in scrollbar-none gap-2 items-center bg-primary-black/80 p-4 rounded text-primary-gold shadow-card cursor-pointer overflow-visible`}
    >
      <div className="flex items-center">
        <img
          className="w-[120px] h-[120px] rounded"
          src={item.image}
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
        {item.isVisible ? (
          <Tooltip direction="right" content="Item visivel">
            <LuEye />
          </Tooltip>
        ) : (
          <Tooltip direction="right" content="Item invisivel">
            <LuEyeOff />
          </Tooltip>
        )}

        {item.isFocus && (
          <Tooltip direction="right" content="Item em desatque">
            <LuStar />
          </Tooltip>
        )}

        {item.isVegan && (
          <Tooltip direction="right" content="Item vegano">
            <LuVegan />
          </Tooltip>
        )}
      </div>
    </div>
  );
}
