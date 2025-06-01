"use client";

import { BoardgameType } from "@/types";
import { truncateText } from "@/utils/utilFunctions";
import React, { ComponentProps, useEffect, useState } from "react";
import {
  FiArrowRight,
  FiClock,
  FiLayers,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";

interface CardProps extends ComponentProps<"div"> {
  boardgame: BoardgameType;
  isListView: boolean;
}

export default function Card({ boardgame, isListView, ...props }: CardProps) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 350);
    };

    handleResize(); // Checar no carregamento
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {isListView ? (
        <div
          {...props}
          className={`${
            !boardgame.isVisible && "hidden"
          } cursor-pointer sm:max-w-[600px] max-w-[300px] flex items-center gap-3 w-full p-3 border-b border-primary-gold/50 sm:hover:bg-secondary-black sm:hover:shadow-lg transition-all ease-in duration-200`}
        >
          <div className="relative">
            {boardgame.image && (
              <img
                src={boardgame.image}
                alt="boardgame"
                className="h-12 w-12 rounded shadow-card"
              />
            )}

            {!boardgame.image && (
              <img
                src={"images/patternBoardgameImage.png"}
                alt="boardgame"
                className="h-12 w-12 rounded shadow-card"
              />
            )}
            {boardgame.featured && (
              <div className="shadow-card flex items-center justify-center absolute -bottom-2 -right-2 p-1 bg-primary-black rounded-full">
                <LuSparkles size={"14px"} className="min-w-[14px] " />
              </div>
            )}
          </div>
          <span className="max-w-[100px] sm:max-w-[300px]">
            {boardgame.name}
          </span>
          {!isSmallScreen && (
            <span className="flex items-center gap-2 text-sm flex-1 justify-end text-nowrap">
              <FiUsers size={"16px"} className="min-w-[16px]" />
              {boardgame.minPlayers === boardgame.maxPlayers
                ? boardgame.maxPlayers
                : `${boardgame.minPlayers} - ${boardgame.maxPlayers}`}{" "}
            </span>
          )}

          <div
            className={`flex items-center justify-end ${
              isSmallScreen && "flex-1"
            }`}
          >
            <FiArrowRight size={"20px"} className="min-w-[20px]" />
          </div>
        </div>
      ) : (
        <div
          {...props}
          className={`${
            !boardgame.isVisible && "hidden"
          } relative w-full h-fit max-w-[300px] rounded-lg shadow-card-gold cursor-pointer sm:hover:border-primary-gold/50 sm:border sm:border-transparent transition-all ease-in duration-200`}
        >
          <div
            className="relative w-full h-[150px] bg-center bg-cover rounded-t-lg"
            style={{
              backgroundImage: `url(${
                boardgame.image
                  ? boardgame.image
                  : "images/patternBoardgameImage.png"
              })`,
            }}
          >
            <div className="flex py-2 px-4 items-end absolute w-full h-full bg-primary-black/40">
              <span className="font-bold text-lg text-primary-white">
                {boardgame.name}
              </span>
            </div>
          </div>
          {boardgame.featured && (
            <div className="flex items-center gap-1 absolute top-1 left-1 p-2 text-sm bg-primary-black/70 backdrop-blur-[2px] rounded-full shadow-card">
              <LuSparkles size={"16px"} className="min-w-[16px]" />
            </div>
          )}

          <div className="flex flex-col gap-2 p-4 relative">
            <span className="flex items-center gap-2 text-sm">
              <FiUsers size={"16px"} className="min-w-[16px]" />
              {boardgame.minPlayers === boardgame.maxPlayers
                ? boardgame.maxPlayers
                : `${boardgame.minPlayers} - ${boardgame.maxPlayers}`}{" "}
              Jogadores
            </span>
            <span className="flex items-center gap-2 text-sm">
              <FiClock size={"16px"} className="min-w-[16px]" />
              {boardgame.playTime} minutos
            </span>
            <span className="flex items-center gap-2 text-sm">
              <FiTrendingUp size={"16px"} className="min-w-[16px]" />
              {boardgame.difficulty}{" "}
              <span className="text-xs italic text-primary-gold/60">
                (dificuldade)
              </span>
            </span>
            <span className="flex items-center gap-2 text-sm">
              <FiLayers size={"16px"} className="min-w-[16px]" />
              {truncateText(boardgame.types.join(", "), 22)}

              <span className="text-xs italic text-primary-gold/60">
                (Tipo)
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
