import { MenuItemType } from "@/types";
import { truncateText } from "@/utils/utilFunctions";
import React, { ComponentProps } from "react";
import { FaStar } from "react-icons/fa";
import { LuVegan } from "react-icons/lu";
import MenuImage from "./menuImage";

interface MenuCardProps extends ComponentProps<"div"> {
  item: MenuItemType;
  index: number;
}

export default function MenuCard({ item, index, ...props }: MenuCardProps) {
  return (
    <div
      {...props}
      className={`cm-card group relative flex gap-3 my-3 w-full cursor-pointer p-2 rounded-lg ${
        item.isFocus ? "cm-card-focus pt-5" : ""
      } ${!item.isVisible ? "hidden" : ""} ${index === 0 ? "mt-0" : ""}`}
    >
      <div className="relative h-fit w-fit shrink-0">
        <MenuImage
          src={item.image}
          className="w-[100px] h-[100px] rounded-md shadow-card transition-shadow duration-200 sm:group-hover:shadow-none"
        />
        {item.isVegan && (
          <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black rounded-full z-10">
            <LuVegan size={"22px"} className="min-w-[22px]" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex flex-col">
          <span className="font-bold text-md flex-1">{item.name}</span>
          <span className="text-xs font-semibold">{item.value}</span>
        </div>
        <p className="text-xs">{truncateText(item.description, 65)}</p>
      </div>
      {item.isFocus && (
        <>
          {/* Reflexo de luz que passa pelo card de tempos em tempos */}
          <span aria-hidden="true" className="cm-sheen">
            <span style={{ animationDelay: `${(index % 4) * 1.7}s` }} />
          </span>
          <span className="cm-ribbon">
            <FaStar size={9} aria-hidden="true" />
            Destaque
          </span>
        </>
      )}
    </div>
  );
}
