"use client";

import { BoardgameType } from "@/types";
import { truncateText } from "@/utils/utilFunctions";
import React, { ComponentProps, useEffect, useState } from "react";
import {
  FiArrowRight,
  FiClock,
  FiDollarSign,
  FiLayers,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { LuPlus, LuSparkles, LuX } from "react-icons/lu";
import patternBoardGameImage from "../../../../public/images/patternBoardgameImage.png";
import Button from "@/components/button";
import ReactConfetti from "react-confetti";

interface CardProps extends ComponentProps<"div"> {
  boardgame: BoardgameType;
  isListView: boolean;
  selectedGame?: boolean;
  spinning?: boolean;
  setMyBoardGames: React.Dispatch<React.SetStateAction<BoardgameType[]>>;
  mode: "default" | "myList";
  removeBoardGameFromList: (boardgame: BoardgameType) => void;
  addBoardGameToList: (boardgame: BoardgameType) => void;
}

export default function Card({
  boardgame,
  isListView,
  selectedGame,
  spinning,
  setMyBoardGames,
  addBoardGameToList,
  removeBoardGameFromList,
  mode,
  ...props
}: CardProps) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("boardgames");
    if (stored) {
      setMyBoardGames(JSON.parse(stored));
    }
  }, []);

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
          className={`${!boardgame.isVisible && "hidden"} ${
            selectedGame && !spinning
              ? "border-primary-gold/60 bg-secondary-black/60"
              : "border-primary-gold/15 hover:border-primary-gold/35 hover:bg-secondary-black/50"
          } relative cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ease-in duration-200`}
        >
          {selectedGame && !spinning && (
            <ReactConfetti
              width={800}
              height={300}
              className="max-w-full max-h-full"
              numberOfPieces={40}
            />
          )}
          <div className="relative shrink-0">
            <img
              src={boardgame.image || patternBoardGameImage.src}
              alt="boardgame"
              className="h-10 w-10 min-w-10 rounded-lg object-cover shadow-card"
            />
            {boardgame.featured && (
              <div className="shadow-card flex items-center justify-center absolute -bottom-1.5 -right-1.5 p-0.5 bg-primary-black rounded-full border border-primary-gold/30">
                <LuSparkles size={"10px"} className="min-w-[10px]" />
              </div>
            )}
          </div>
          <span className="flex-1 text-sm font-medium truncate">
            {boardgame.name}
          </span>
          {boardgame.isForSale && (
            <span className="text-xs text-primary-gold/70">{boardgame.value}</span>
          )}
          {!isSmallScreen && (
            <span className="flex items-center gap-1.5 text-xs text-primary-gold/60 shrink-0">
              <FiUsers size={"13px"} className="min-w-[13px]" />
              {boardgame.minPlayers === boardgame.maxPlayers
                ? boardgame.maxPlayers
                : `${boardgame.minPlayers}–${boardgame.maxPlayers}`}
            </span>
          )}
          <div
            className={`flex items-center justify-end gap-2 ${
              isSmallScreen && "flex-1"
            }`}
          >
            <div className="p-1 rounded-full border border-primary-gold/25 hover:border-primary-gold/60 transition-all cursor-pointer">
              {mode === "default" ? (
                <LuPlus
                  size={14}
                  onClick={(e) => {
                    addBoardGameToList(boardgame);
                    e.stopPropagation();
                  }}
                />
              ) : (
                <LuX
                  size={14}
                  onClick={(e) => {
                    removeBoardGameFromList(boardgame);
                    e.stopPropagation();
                  }}
                />
              )}
            </div>
            <FiArrowRight size={"16px"} className="min-w-[16px] text-primary-gold/50" />
          </div>
        </div>
      ) : (
        <div
          {...props}
          className={`${!boardgame.isVisible && "hidden"} ${
            selectedGame && !spinning
              ? "border-primary-gold/70 border-[2px] shadow-[0_0_20px_rgba(230,197,107,0.15)]"
              : "border-primary-gold/20 hover:border-primary-gold/50"
          } relative w-full h-fit max-w-[280px] rounded-xl border bg-secondary-black/40 cursor-pointer transition-all ease-in duration-200`}
        >
          {selectedGame && !spinning && (
            <ReactConfetti
              width={600}
              height={300}
              className="max-w-full max-h-full"
              numberOfPieces={40}
            />
          )}
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
          </div>

          <div className="flex flex-col gap-1.5 p-3">
            {boardgame.isForSale && (
              <span className="flex items-center gap-2 text-xs text-primary-gold/80">
                <FiDollarSign size={"13px"} className="min-w-[13px]" />
                {boardgame.value}
              </span>
            )}
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
            <div
              onClick={(e) => e.stopPropagation()}
              className="pt-1.5"
            >
              {mode === "default" ? (
                <Button onClick={() => addBoardGameToList(boardgame)}>
                  Adicionar a minha lista
                </Button>
              ) : (
                <Button onClick={() => removeBoardGameFromList(boardgame)}>
                  Remover da minha lista
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
