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
import patternBoardGameImage from "../../../../../public/images/patternBoardgameImage.png";

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

    handleResize();
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
          } relative cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary-gold/15 hover:border-primary-gold/35 hover:bg-secondary-black/50 transition-all ease-in duration-200`}
        >
          <div className="relative shrink-0">
            <img
              src={boardgame.image || patternBoardGameImage.src}
              alt="boardgame"
              className="h-10 w-10 min-w-10 rounded-lg object-cover shadow-card"
            />
            {boardgame.featured && (
              <div className="flex items-center justify-center absolute -bottom-1.5 -right-1.5 p-0.5 bg-primary-black rounded-full border border-primary-gold/30 shadow-card">
                <LuSparkles size={"10px"} className="min-w-[10px]" />
              </div>
            )}
          </div>

          <span className="flex-1 text-sm font-medium truncate">
            {boardgame.name}
          </span>

          {boardgame.isForSale && boardgame.value && (
            <span className="text-sm font-semibold text-primary-gold shrink-0">
              {boardgame.value}
            </span>
          )}

          {!isSmallScreen && (
            <span className="flex items-center gap-1.5 text-xs text-primary-gold/60 shrink-0">
              <FiUsers size={"13px"} className="min-w-[13px]" />
              {boardgame.minPlayers === boardgame.maxPlayers
                ? boardgame.maxPlayers
                : `${boardgame.minPlayers}–${boardgame.maxPlayers}`}
            </span>
          )}

          <FiArrowRight
            size={"16px"}
            className="min-w-[16px] text-primary-gold/50 shrink-0"
          />
        </div>
      ) : (
        <div
          {...props}
          className={`${
            !boardgame.isVisible && "hidden"
          } relative w-full h-fit max-w-[280px] rounded-xl border border-primary-gold/20 bg-secondary-black/40 cursor-pointer hover:border-primary-gold/50 transition-all ease-in duration-200`}
        >
          <div
            className="relative w-full h-[150px] bg-center bg-cover rounded-t-xl overflow-hidden"
            style={{
              backgroundImage: `url(${
                boardgame.image ? boardgame.image : patternBoardGameImage.src
              })`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
              <span className="font-bold text-sm text-primary-white drop-shadow leading-tight line-clamp-2">
                {boardgame.name}
              </span>
            </div>
            {boardgame.featured && (
              <div className="absolute top-2 left-2 p-1.5 bg-primary-black/70 backdrop-blur-sm rounded-full border border-primary-gold/30 shadow-card">
                <LuSparkles size={"12px"} className="min-w-[12px]" />
              </div>
            )}
            {boardgame.value && (
              <div className="absolute top-2 right-2 px-2 py-0.5 mx-2 bg-primary-gold text-primary-black text-xs font-bold rounded-lg">
                {boardgame.value}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 p-3">
            <span className="flex items-center gap-2 text-xs text-primary-gold/80">
              <FiUsers size={"13px"} className="min-w-[13px]" />
              {boardgame.minPlayers === boardgame.maxPlayers
                ? boardgame.maxPlayers
                : `${boardgame.minPlayers}–${boardgame.maxPlayers}`}{" "}
              Jogadores
            </span>
            <span className="flex items-center gap-2 text-xs text-primary-gold/80">
              <FiClock size={"13px"} className="min-w-[13px]" />
              {boardgame.playTime} minutos
            </span>
            <span className="flex items-center gap-2 text-xs text-primary-gold/80">
              <FiTrendingUp size={"13px"} className="min-w-[13px]" />
              {boardgame.difficulty}
            </span>
            <span className="flex items-center gap-2 text-xs text-primary-gold/70">
              <FiLayers size={"13px"} className="min-w-[13px]" />
              {truncateText(boardgame.types.join(", "), 24)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
