"use client";

import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { BoardgameType } from "@/types";
import { highlightMatch } from "@/utils/utilFunctions";
import React, { ComponentProps, useState } from "react";
import { FiClock, FiUsers } from "react-icons/fi";
import { LuEye, LuEyeOff, LuSparkles, LuTag } from "react-icons/lu";

interface GameCardProps extends ComponentProps<"div"> {
  boardgame: BoardgameType;
  boardgames: BoardgameType[];
  setBoardgames: React.Dispatch<React.SetStateAction<BoardgameType[]>>;
  searchTerm?: string;
}

export default function Card({
  boardgame,
  searchTerm,
  boardgames,
  setBoardgames,
  ...props
}: GameCardProps) {
  const [isChildInFocus, setIsChildInFocus] = useState(false);

  const { addAlert } = useAlert();

  const toggleVisibility = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    state: "visible" | "invisible",
  ) => {
    event.stopPropagation();
    const newVisibilityValue = state === "visible";
    const newBoardgameValue = { ...boardgame, isVisible: newVisibilityValue };

    if (!boardgame.id) {
      addAlert("ID inválido");
      return;
    }

    try {
      await BoardgameRepository.update(boardgame.id, newBoardgameValue);
      setBoardgames(
        boardgames.map((b) => (b.id === boardgame.id ? newBoardgameValue : b)),
      );
      addAlert(
        `${boardgame.name} está ${newVisibilityValue ? "visível" : "invisível"}`,
      );
    } catch (error) {
      addAlert(`Erro ao mudar a visibilidade: ${error}`);
    }
  };

  const toggleFeatured = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
  ) => {
    event.stopPropagation();
    if (!boardgame.id) {
      addAlert("ID inválido");
      return;
    }

    const updatedBoardgame = { ...boardgame, featured: !boardgame.featured };

    try {
      await BoardgameRepository.update(boardgame.id, updatedBoardgame);
      setBoardgames(
        boardgames.map((b) => (b.id === boardgame.id ? updatedBoardgame : b)),
      );
      addAlert(
        `${boardgame.name} ${updatedBoardgame.featured ? "agora está em destaque" : "não está mais em destaque"}`,
      );
    } catch (error) {
      addAlert(`Erro ao atualizar destaque: ${error}`);
    }
  };

  return (
    <div
      {...props}
      className={`${!boardgame.isVisible && "opacity-40"} ${
        isChildInFocus ? "" : "hover:border-primary-gold/55"
      } group relative flex flex-col w-[190px] rounded-xl border shadow-card  border-primary-gold/20 bg-secondary-black/50 cursor-pointer transition-all duration-200 overflow-hidden`}
    >
      {/* Image */}
      <div
        className="w-full h-[120px] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${boardgame.image || "images/patternBoardgameImage.png"})`,
        }}
      >
        {/* For sale badge */}
        {boardgame.isForSale && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-primary-gold text-primary-black text-[10px] font-bold rounded-md">
            <LuTag size={10} /> Venda
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <span
          className="font-semibold text-sm text-primary-gold leading-tight line-clamp-2"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(boardgame.name, searchTerm),
          }}
        />
        <div className="flex gap-3 text-primary-gold/55">
          <span className="flex items-center gap-1 text-xs">
            <FiUsers size={11} />
            {boardgame.minPlayers}–{boardgame.maxPlayers}
          </span>
          <span className="flex items-center gap-1 text-xs">
            <FiClock size={11} />
            {boardgame.playTime}min
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div
        onMouseOver={() => setIsChildInFocus(true)}
        onMouseLeave={() => setIsChildInFocus(false)}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-1 absolute top-2 right-2"
      >
        <div className="p-1.5 rounded-lg bg-primary-black/75 text-primary-gold backdrop-blur-sm border border-primary-gold/20 hover:border-primary-gold/50 transition-all">
          {boardgame.isVisible ? (
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
          className={`p-1.5 rounded-lg bg-primary-black/75 backdrop-blur-sm border transition-all ${boardgame.featured ? "border-primary-gold/60 text-primary-gold" : "border-primary-gold/20 text-primary-gold/40 hover:border-primary-gold/50"}`}
        >
          <Tooltip
            direction="left"
            content={boardgame.featured ? "Remover destaque" : "Destacar"}
          >
            <div className={`${!boardgame.featured && "diagonal-strike"}`}>
              <LuSparkles
                size={14}
                onClick={toggleFeatured}
                className="z-10 relative"
              />
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
