"use client";

import { MouseEvent } from "react";
import { LuChevronRight, LuClock, LuUsers } from "react-icons/lu";
import type { BoardgameType, RentalGameType } from "@/types";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { Highlight } from "@/components/showcase/search";
import { DifficultyMeter } from "@/app/(client)/clientCollection/gameCard";
import {
  BOARDGAME_PLACEHOLDER,
  CollectionView,
  playTimeLabel,
  playersLabel,
} from "@/app/(client)/clientCollection/collectionUtils";
import type { GameAvailability } from "@/rental/availability";
import { formatBRL } from "@/rental/money";
import AvailabilityBadge from "./availabilityBadge";

export type RentalGameWithId = RentalGameType & { id: string };

/** Os helpers do acervo só leem campos que o jogo de aluguel também tem. */
export const asBoardgame = (game: RentalGameType) => game as unknown as BoardgameType;

export const rentalAnchor = (game: RentalGameWithId) => `rental-game-${game.id}`;

/** Jogo para alugar, em grade ou em lista; tocar abre o detalhe. */
export default function RentalGameCard({
  game,
  view,
  words,
  availability,
  onOpen,
}: {
  game: RentalGameWithId;
  view: CollectionView;
  words: string[];
  availability: GameAvailability;
  onOpen: (game: RentalGameWithId, origin: HTMLElement | null) => void;
}) {
  const open = (event: MouseEvent<HTMLElement>) =>
    onOpen(game, event.currentTarget.querySelector<HTMLElement>(".cm-img"));
  const board = asBoardgame(game);

  if (view === "list") {
    return (
      <article
        id={rentalAnchor(game)}
        data-reveal
        onClick={open}
        className="cm-card group relative flex items-center gap-3 p-2 pr-3 rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer"
      >
        <ShowcaseImage
          src={game.image}
          placeholder={BOARDGAME_PLACEHOLDER}
          className="w-16 h-16 rounded-lg shrink-0"
        />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-sm font-semibold text-primary-gold truncate">
            <Highlight text={game.name} words={words} />
          </span>
          <span className="flex items-center gap-3 text-[11px] text-primary-gold/65">
            <span className="flex items-center gap-1">
              <LuUsers size={12} /> {playersLabel(board)}
            </span>
            <span className="flex items-center gap-1">
              <LuClock size={12} /> {playTimeLabel(game.playTime)}
            </span>
          </span>
          <span className="flex items-center gap-2 flex-wrap">
            <AvailabilityBadge availability={availability} />
            <DifficultyMeter difficulty={game.difficulty} />
          </span>
        </div>
        <span className="text-sm font-bold text-primary-gold shrink-0">{formatBRL(game.price)}</span>
        <LuChevronRight size={16} className="text-primary-gold/30 shrink-0" />
      </article>
    );
  }

  return (
    <article
      id={rentalAnchor(game)}
      data-reveal
      onClick={open}
      className="cm-card group relative flex flex-col rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer"
    >
      <div className="relative">
        <ShowcaseImage
          src={game.image}
          placeholder={BOARDGAME_PLACEHOLDER}
          className="w-full aspect-[4/3] rounded-t-[11px]"
        />
        <div className="absolute inset-0 rounded-t-[11px] bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <AvailabilityBadge availability={availability} className="absolute top-2 left-2" />
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-primary-gold text-primary-black text-xs font-bold shadow-card">
          {formatBRL(game.price)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-2.5 sm:p-3 flex-1">
        <span className="block text-[13px] sm:text-sm font-semibold leading-snug line-clamp-2 text-primary-gold">
          <Highlight text={game.name} words={words} />
        </span>
        <span className="flex items-center gap-3 text-[11px] text-primary-gold/65 mt-auto">
          <span className="flex items-center gap-1">
            <LuUsers size={12} /> {playersLabel(board)}
          </span>
          <span className="flex items-center gap-1">
            <LuClock size={12} /> {playTimeLabel(game.playTime)}
          </span>
        </span>
        <DifficultyMeter difficulty={game.difficulty} />
      </div>
    </article>
  );
}
