import Tooltip from "@/components/Tooltip";
import { MenuItemType } from "@/types";
import React, { ComponentProps } from "react";
import { LuEye, LuEyeOff, LuSparkles, LuVegan } from "react-icons/lu";

interface MenuCardProps extends ComponentProps<"div"> {
  item: MenuItemType;
  searchTerm?: string;
}

export default function MenuCard({
  item,
  searchTerm,
  ...props
}: MenuCardProps) {
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
      } relative flex flex-col w-[240px] h-fit max-h-[280px] shadow-card-gold outline hover:outline-primary-gold outline-transparent  transition-all duration-200 ease-in scrollbar-none gap-2 items-center bg-primary-black/80 rounded-lg text-primary-gold cursor-pointer overflow-visible`}
    >
      {item.image && (
        <div
          className="flex items-center w-full h-[120px] bg-cover bg-no-repeat bg-center rounded-t-lg"
          style={{
            backgroundImage: `url(${item.image})`,
          }}
        ></div>
      )}

      {!item.image && (
        <img
          className="h-[120px]"
          src={"images/patternMenuImage.png"}
          alt="Pattern Image"
        />
      )}

      <div className="flex flex-col gap-2 py-2 px-3 w-full text-center">
        <span
          className="font-semibold text-center text-md"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(item.name, searchTerm),
          }}
        />

        <div className="overflow-y-scroll flex-1 w-full">
          <span
            className="text-xs text-center w-full"
            dangerouslySetInnerHTML={{
              __html: highlightMatch(item.description, searchTerm),
            }}
          />
        </div>
        <div className="flex flex-col gap-2 absolute top-1 right-1 p-2 rounded-lg backdrop-blur-[4px]">
          {item.isVisible ? (
            <Tooltip direction="left" content="Item visivel">
              <LuEye />
            </Tooltip>
          ) : (
            <Tooltip direction="left" content="Item invisivel">
              <LuEyeOff />
            </Tooltip>
          )}

          {item.isFocus && (
            <Tooltip direction="left" content="Item em desatque">
              <LuSparkles />
            </Tooltip>
          )}

          {item.isVegan && (
            <Tooltip direction="left" content="Item vegano">
              <LuVegan />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
