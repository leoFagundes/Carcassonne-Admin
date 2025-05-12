"use client";

import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { BoardgameType } from "@/types";
import React, { ComponentProps, useState } from "react";
import { FiClock, FiUsers } from "react-icons/fi";
import { LuEye, LuEyeOff, LuSparkles } from "react-icons/lu";

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

  function highlightMatch(name: string, search: string = "") {
    if (!search) return name;

    const regex = new RegExp(`(${search})`, "gi");
    return name.replace(regex, `<span class='text-secondary-gold '>$1</span>`);
  }

  const toggleVisibility = async (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    state: "visible" | "invisible"
  ) => {
    event.stopPropagation();

    const newVisibilityValue = state === "visible" ? true : false;
    const newBoardgameValue = {
      ...boardgame,
      isVisible: newVisibilityValue,
    };

    if (!boardgame.id) {
      addAlert("ID inválido");
      return;
    }

    try {
      await BoardgameRepository.update(boardgame.id, newBoardgameValue);
      const updatedBoardgames = boardgames.map((propBoardgame) =>
        propBoardgame.id === boardgame.id ? newBoardgameValue : propBoardgame
      );
      setBoardgames(updatedBoardgames);
      addAlert(
        `${boardgame.name} está ${newVisibilityValue ? "visível" : "invisível"}`
      );
    } catch (error) {
      addAlert(`Erro ao mudar a visibilidade do jogo: ${error}`);
    }
  };

  const toggleFeatured = async (
    event: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    event.stopPropagation();

    if (!boardgame.id) {
      addAlert("ID inválido");
      return;
    }

    const updatedBoardgame = {
      ...boardgame,
      featured: !boardgame.featured,
    };

    try {
      await BoardgameRepository.update(boardgame.id, updatedBoardgame);
      const updatedBoardgames = boardgames.map((propBoardgame) =>
        propBoardgame.id === boardgame.id ? updatedBoardgame : propBoardgame
      );
      setBoardgames(updatedBoardgames);
      addAlert(
        `${boardgame.name} ${
          updatedBoardgame.featured
            ? "agora está em destaque"
            : "não está mais em destaque"
        }`
      );
    } catch (error) {
      addAlert(`Erro ao atualizar destaque do item: ${error}`);
    }
  };

  return (
    <div
      {...props}
      className={`${!boardgame.isVisible && "opacity-50"} ${
        isChildInFocus
          ? "outline-transparent hover:outline-transparent"
          : "hover:outline-primary-gold"
      } group relative flex flex-col w-[200px] h-fit max-h-[250px] outline hover:outline-primary-gold outline-transparent transition-all duration-200 ease-in overflow-visible scrollbar-none gap-2 items-center bg-primary-black/80 rounded-lg text-primary-gold shadow-card-gold cursor-pointer`}
    >
      {boardgame.image && (
        <div
          className="flex items-center w-full h-[120px] bg-cover bg-no-repeat bg-center rounded-t-lg"
          style={{ backgroundImage: `url(${boardgame.image})` }}
        ></div>
      )}

      {!boardgame.image && (
        <img
          className="h-[120px]"
          src={"images/patternBoardgameImage.png"}
          alt="Pattern Image"
        />
      )}

      <div className="flex flex-col items-center gap-2 py-2 px-3">
        <span
          className="font-semibold text-center text-md"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(boardgame.name, searchTerm),
          }}
        />
        <div className="flex gap-4">
          <span className="flex text-sm items-center gap-2">
            <FiUsers />
            {boardgame.minPlayers} - {boardgame.maxPlayers}
          </span>
          <span className="flex text-sm items-center gap-2">
            <FiClock />
            {boardgame.playTime} min
          </span>
        </div>
      </div>
      <div
        onMouseOver={() => setIsChildInFocus(true)}
        onMouseLeave={() => setIsChildInFocus(false)}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-1 absolute top-2 right-2"
      >
        <div className="p-2 rounded-lg bg-primary-black/80 backdrop-blur-[2px] hover:outline-primary-gold outline outline-transparent transition-all duration-300 ease-in">
          {boardgame.isVisible ? (
            <Tooltip direction="left" content="Deixar jogo invisivel">
              <LuEye onClick={(e) => toggleVisibility(e, "invisible")} />
            </Tooltip>
          ) : (
            <Tooltip direction="left" content="Deixar jogo visivel">
              <LuEyeOff onClick={(e) => toggleVisibility(e, "visible")} />
            </Tooltip>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary-black/80 backdrop-blur-[2px] hover:outline-primary-gold outline outline-transparent transition-all duration-300 ease-in">
          <Tooltip
            direction="left"
            content={
              boardgame.featured ? "Remover destaque" : "Colocar em destaque"
            }
          >
            <div
              className={`${!boardgame.featured ? "diagonal-strike" : ""} ${
                !boardgame.featured && "opacity-50"
              }`}
            >
              <LuSparkles onClick={toggleFeatured} className="z-10 relative" />
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
