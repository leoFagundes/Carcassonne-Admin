"use client";

import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import { MenuItemType } from "@/types";
import { truncateText } from "@/utils/utilFunctions";
import React, { ComponentProps, useState } from "react";
import { LuEye, LuEyeOff, LuSparkles, LuVegan } from "react-icons/lu";

interface MenuCardProps extends ComponentProps<"div"> {
  item: MenuItemType;
  menuItems: MenuItemType[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItemType[]>>;
  searchTerm?: string;
}

export default function MenuCard({
  item,
  searchTerm,
  menuItems,
  setMenuItems,
  ...props
}: MenuCardProps) {
  const [isChildInFocus, setIsChildInFocus] = useState(false);

  function highlightMatch(text: string, search: string = "") {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    return text.replace(regex, `<span class='text-secondary-gold'>$1</span>`);
  }

  const { addAlert } = useAlert();

  const toggleVisibility = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    state: "visible" | "invisible"
  ) => {
    event.stopPropagation();

    const newVisibilityValue = state === "visible" ? true : false;
    const newMenuItemValue = {
      ...item,
      isVisible: newVisibilityValue,
    };

    if (!item.id) {
      addAlert("ID inválido");
      return;
    }

    try {
      await MenuItemRepository.update(item.id, newMenuItemValue);
      const updatedItems = menuItems.map((propItem) =>
        propItem.id === item.id ? newMenuItemValue : propItem
      );
      setMenuItems(updatedItems);
      addAlert(
        `${item.name} está ${newVisibilityValue ? "visível" : "invisível"}`
      );
    } catch (error) {
      addAlert(`Erro ao mudar a visibilidade do item: ${error}`);
    }
  };

  const toggleFocus = async (
    event: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    event.stopPropagation();

    if (!item.id) {
      addAlert("ID inválido");
      return;
    }

    const updatedItem = {
      ...item,
      isFocus: !item.isFocus,
    };

    try {
      await MenuItemRepository.update(item.id, updatedItem);
      const updatedItems = menuItems.map((propItem) =>
        propItem.id === item.id ? updatedItem : propItem
      );
      setMenuItems(updatedItems);
      addAlert(
        `${item.name} ${
          updatedItem.isFocus
            ? "agora está em destaque"
            : "não está mais em destaque"
        }`
      );
    } catch (error) {
      addAlert(`Erro ao atualizar destaque do item: ${error}`);
    }
  };

  const toggleVegan = async (
    event: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    event.stopPropagation();

    if (!item.id) {
      addAlert("ID inválido");
      return;
    }

    const updatedItem = {
      ...item,
      isVegan: !item.isVegan,
    };

    try {
      await MenuItemRepository.update(item.id, updatedItem);
      const updatedItems = menuItems.map((propItem) =>
        propItem.id === item.id ? updatedItem : propItem
      );
      setMenuItems(updatedItems);
      addAlert(
        `${item.name} ${
          updatedItem.isVegan ? "agora é vegano" : "não é mais vegano"
        }`
      );
    } catch (error) {
      addAlert(`Erro ao atualizar status vegano do item: ${error}`);
    }
  };

  return (
    <div
      {...props}
      className={`${!item.isVisible && "opacity-50"} ${
        isChildInFocus
          ? "outline-transparent hover:outline-transparent"
          : "hover:outline-primary-gold"
      } relative flex flex-col w-[240px] h-fit max-h-[280px] shadow-card-gold outline outline-transparent transition-all duration-200 ease-in scrollbar-none gap-2 items-center bg-primary-black/80 rounded-lg text-primary-gold cursor-pointer overflow-visible`}
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
          <span className="text-xs text-center w-full">
            {truncateText(item.description, 80)}
          </span>
        </div>
        <div
          onMouseOver={() => setIsChildInFocus(true)}
          onMouseLeave={() => setIsChildInFocus(false)}
          onClick={(e) => e.stopPropagation()}
          className="hover:outline-primary-gold outline outline-transparent transition-all duration-300 ease-in flex flex-col gap-3 absolute top-1 right-1 p-2 rounded-lg bg-primary-black/80 backdrop-blur-[2px]"
        >
          {item.isVisible ? (
            <Tooltip direction="left" content="Deixar item invisivel">
              <LuEye
                className="hover:scale-110 transition-all duration-200 ease-in"
                onClick={(e) => toggleVisibility(e, "invisible")}
              />
            </Tooltip>
          ) : (
            <Tooltip direction="left" content="Deixar item visivel">
              <LuEyeOff
                className="hover:scale-110 transition-all duration-200 ease-in"
                onClick={(e) => toggleVisibility(e, "visible")}
              />
            </Tooltip>
          )}

          <Tooltip
            direction="left"
            content={item.isFocus ? "Remover destaque" : "Colocar em destaque"}
          >
            <div
              className={`relative hover:scale-110 transition-all duration-200 ease-in ${
                !item.isFocus ? "diagonal-strike" : ""
              } ${!item.isFocus && "opacity-50"}`}
            >
              <LuSparkles onClick={toggleFocus} className="z-10 relative" />
            </div>
          </Tooltip>

          <Tooltip
            direction="left"
            content={item.isVegan ? "Remover vegano" : "Marcar como vegano"}
          >
            <div
              className={`relative hover:scale-110 transition-all duration-200 ease-in ${
                !item.isVegan ? "diagonal-strike" : ""
              } ${!item.isVegan && "opacity-50"}`}
            >
              <LuVegan onClick={toggleVegan} className={`z-10 relative`} />
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
