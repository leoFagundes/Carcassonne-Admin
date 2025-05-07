import { BoardgameType } from "@/types";
import React, { ComponentProps } from "react";
import { FiClock, FiStar, FiUsers } from "react-icons/fi";

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
      className="group relative flex flex-col w-[200px] h-fit max-h-[250px] outline hover:outline-primary-gold outline-transparent transition-all duration-200 ease-in overflow-visible scrollbar-none gap-2 items-center bg-primary-black/80 rounded-lg text-primary-gold shadow-card-gold cursor-pointer"
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

      {boardgame.featured && (
        <div className="flex items-center gap-1 absolute top-1 left-1 p-1 text-sm bg-primary-black/70 backdrop-blur-[2px] rounded shadow-card">
          <FiStar size={"16px"} className="min-w-[16px]" /> Destaque
        </div>
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
    </div>
  );
}
