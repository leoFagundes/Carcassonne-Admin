"use client";

import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import { MenuItemType } from "@/types";
import { highlightMatch, truncateText } from "@/utils/utilFunctions";
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
  const { addAlert } = useAlert();

  const toggleVisibility = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    state: "visible" | "invisible",
  ) => {
    event.stopPropagation();
    const newVisibilityValue = state === "visible";
    const newMenuItemValue = { ...item, isVisible: newVisibilityValue };
    if (!item.id) {
      addAlert("ID inválido");
      return;
    }
    try {
      await MenuItemRepository.update(item.id, newMenuItemValue);
      setMenuItems(
        menuItems.map((p) => (p.id === item.id ? newMenuItemValue : p)),
      );
      addAlert(
        `${item.name} está ${newVisibilityValue ? "visível" : "invisível"}`,
      );
    } catch (error) {
      addAlert(`Erro ao mudar a visibilidade do item: ${error}`);
    }
  };

  const toggleFocus = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    if (!item.id) {
      addAlert("ID inválido");
      return;
    }
    const updatedItem = { ...item, isFocus: !item.isFocus };
    try {
      await MenuItemRepository.update(item.id, updatedItem);
      setMenuItems(menuItems.map((p) => (p.id === item.id ? updatedItem : p)));
      addAlert(
        `${item.name} ${updatedItem.isFocus ? "agora está em destaque" : "não está mais em destaque"}`,
      );
    } catch (error) {
      addAlert(`Erro ao atualizar destaque do item: ${error}`);
    }
  };

  const toggleVegan = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    if (!item.id) {
      addAlert("ID inválido");
      return;
    }
    const updatedItem = { ...item, isVegan: !item.isVegan };
    try {
      await MenuItemRepository.update(item.id, updatedItem);
      setMenuItems(menuItems.map((p) => (p.id === item.id ? updatedItem : p)));
      addAlert(
        `${item.name} ${updatedItem.isVegan ? "agora é vegano" : "não é mais vegano"}`,
      );
    } catch (error) {
      addAlert(`Erro ao atualizar status vegano do item: ${error}`);
    }
  };

  return (
    <div
      {...props}
      className={`${!item.isVisible && "opacity-40"} ${
        isChildInFocus ? "" : "hover:border-primary-gold/55"
      } group relative flex flex-col w-[190px] rounded-xl border shadow-card border-primary-gold/20 bg-secondary-black/50 cursor-pointer transition-all duration-200 overflow-hidden`}
    >
      {/* Image */}
      <div
        className="w-full h-[120px] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${item.image || "images/patternMenuImage.png"})`,
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

      {/* Action buttons */}
      <div
        onMouseOver={() => setIsChildInFocus(true)}
        onMouseLeave={() => setIsChildInFocus(false)}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-1 absolute top-2 right-2"
      >
        <div className="p-1.5 rounded-lg bg-primary-black/75 text-primary-gold backdrop-blur-sm border border-primary-gold/20 hover:border-primary-gold/50 transition-all">
          {item.isVisible ? (
            <Tooltip direction="left" content="Deixar invisível">
              <LuEye
                size={14}
                onClick={(e) => toggleVisibility(e, "invisible")}
              />
            </Tooltip>
          ) : (
            <Tooltip direction="left" content="Deixar visível">
              <LuEyeOff
                size={14}
                onClick={(e) => toggleVisibility(e, "visible")}
              />
            </Tooltip>
          )}
        </div>

        <div
          className={`p-1.5 rounded-lg bg-primary-black/75 backdrop-blur-sm border transition-all ${
            item.isFocus
              ? "border-primary-gold/60 text-primary-gold"
              : "border-primary-gold/20 text-primary-gold/40 hover:border-primary-gold/50"
          }`}
        >
          <Tooltip
            direction="left"
            content={item.isFocus ? "Remover destaque" : "Destacar"}
          >
            <div className={!item.isFocus ? "diagonal-strike" : ""}>
              <LuSparkles
                size={14}
                onClick={toggleFocus}
                className="z-10 relative"
              />
            </div>
          </Tooltip>
        </div>

        <div
          className={`p-1.5 rounded-lg bg-primary-black/75 backdrop-blur-sm border transition-all ${
            item.isVegan
              ? "border-primary-gold/60 text-primary-gold"
              : "border-primary-gold/20 text-primary-gold/40 hover:border-primary-gold/50"
          }`}
        >
          <Tooltip
            direction="left"
            content={item.isVegan ? "Remover vegano" : "Marcar como vegano"}
          >
            <div className={!item.isVegan ? "diagonal-strike" : ""}>
              <LuVegan
                size={14}
                onClick={toggleVegan}
                className="z-10 relative"
              />
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
