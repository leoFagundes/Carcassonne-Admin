import { BoardgameType } from "@/types";
import React, { ComponentProps } from "react";
import { FiClock, FiUsers } from "react-icons/fi";

interface GameCardProps extends ComponentProps<"div"> {
  boardgame: BoardgameType;
  searchTerm?: string;
}

export default function Card({
  boardgame,
  searchTerm,
  ...props
}: GameCardProps) {
  function highlightMatch(name: string, search: string = "") {
    if (!search) return name;

    const regex = new RegExp(`(${search})`, "gi");
    return name.replace(regex, `<span class='text-secondary-gold '>$1</span>`);
  }

  return (
    <div
      {...props}
      className="flex flex-col hover:brightness-110 w-[250px] h-[280px] border border-transparent hover:border-primary-gold transition-all duration-200 ease-in overflow-scroll scrollbar-none gap-2 items-center bg-primary-black/80 p-4 rounded text-primary-gold shadow-card cursor-pointer"
    >
      <div className="flex items-center">
        <img
          className="w-[150px] h-[150px] rounded shadow-md"
          src={boardgame.image}
          alt="boardgame"
        />
      </div>
      <span
        className="font-semibold text-center text-2xl flex-1"
        dangerouslySetInnerHTML={{
          __html: highlightMatch(boardgame.name, searchTerm),
        }}
      />
      <div className="flex gap-4">
        <span className="flex items-center gap-2">
          <FiUsers />
          {boardgame.minPlayers} - {boardgame.maxPlayers}
        </span>
        <span className="flex items-center gap-2">
          <FiClock />
          {boardgame.playTime} min
        </span>
      </div>
    </div>
  );
}
