import { MenuItemType } from "@/types";
import { truncateText } from "@/utils/utilFunctions";
import React, { ComponentProps } from "react";
import { LuVegan } from "react-icons/lu";

interface MenuCardProps extends ComponentProps<"div"> {
  item: MenuItemType;
  index: number;
}

export default function MenuCard({ item, index, ...props }: MenuCardProps) {
  return (
    <div
      {...props}
      className={`flex gap-3 my-3 w-full cursor-pointer md:transition-all p-2 rounded ${
        item.isFocus && "relative border border-primary-gold/40 pt-4"
      } ${!item.isVisible && "hidden"} ${index === 0 && "mt-0"}`}
    >
      <div className="relative h-fit w-fit">
        <img
          className="w-[100px] h-[100px] rounded shadow-card"
          src={item.image ? item.image : "images/patternMenuImage.png"}
          alt="menu item"
        />
        {item.isVegan && (
          <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black rounded-full z-10">
            <LuVegan size={"16px"} className="min-w-[16px]" />
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
        <div className="absolute -top-3 left-3 px-1 bg-primary-black">
          <span className="text-sm font-semibold">Destaque</span>
        </div>
      )}
    </div>
  );
}
