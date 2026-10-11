"use client";

import { MouseEvent, useRef } from "react";
import { FaStar } from "react-icons/fa";
import { LuCheck, LuChevronRight, LuClock, LuPlus, LuUsers } from "react-icons/lu";
import type { BoardgameType } from "@/types";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { Highlight } from "@/components/showcase/search";
import {
  BOARDGAME_PLACEHOLDER,
  CollectionView,
  difficultyLevel,
  gameAnchor,
  playTimeLabel,
  playersLabel,
} from "./collectionUtils";

/** Dificuldade em cinco tracinhos (Muito Leve → Muito Pesado). */
export function DifficultyMeter({
  difficulty,
  showLabel = true,
  size = "sm",
}: {
  difficulty: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const level = difficultyLevel(difficulty);
  return (
    <span className="flex items-center gap-1.5" title={`Dificuldade: ${difficulty}`}>
      <span className="flex items-center gap-[3px]" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`rounded-full transition-colors ${
              size === "md" ? "h-1.5 w-4" : "h-[5px] w-2.5"
            } ${step <= level ? "bg-primary-gold" : "bg-primary-gold/15"}`}
          />
        ))}
      </span>
      {showLabel && <span className="text-[10px] text-primary-gold/60">{difficulty}</span>}
    </span>
  );
}

/** Botão de pôr/tirar o jogo da "minha lista" (dá um pulinho ao tocar). */
function ListToggle({
  inList,
  onToggle,
  className = "",
}: {
  inList: boolean;
  onToggle: (source: HTMLElement | null) => void;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = inList ? "Tirar da minha lista" : "Pôr na minha lista";

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Não abre o detalhe do jogo
    event.stopPropagation();
    buttonRef.current?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(1)" }],
      { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
    );
    const source = event.currentTarget.closest("article")?.querySelector<HTMLElement>(".cm-img");
    onToggle(source ?? null);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={inList}
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={`flex items-center justify-center w-9 h-9 shrink-0 rounded-full border backdrop-blur-sm transition-colors duration-200 cursor-pointer ${
        inList
          ? "bg-primary-gold text-primary-black border-primary-gold"
          : "bg-black/55 text-primary-gold border-primary-gold/35 hover:border-primary-gold/70"
      } ${className}`}
    >
      {inList ? <LuCheck size={16} strokeWidth={3} /> : <LuPlus size={17} />}
    </button>
  );
}

/**
 * Jogo do acervo, em grade (capa grande) ou em lista (linha compacta). Tocar
 * abre o detalhe — a capa sai voando do card.
 */
export default function GameCard({
  game,
  view,
  index,
  words,
  forSale,
  inList,
  onOpen,
  onToggleList,
}: {
  game: BoardgameType;
  view: CollectionView;
  index: number;
  /** Palavras buscadas (destacadas no nome). */
  words: string[];
  forSale: boolean;
  inList?: boolean;
  onOpen: (game: BoardgameType, origin: HTMLElement | null) => void;
  /** Só no acervo: pôr/tirar da "minha lista". */
  onToggleList?: (game: BoardgameType, source: HTMLElement | null) => void;
}) {
  const open = (event: MouseEvent<HTMLElement>) =>
    onOpen(game, event.currentTarget.querySelector<HTMLElement>(".cm-img"));
  const sheen = game.featured && (
    // Reflexo de luz que passa pelos destaques de tempos em tempos
    <span aria-hidden="true" className="cm-sheen">
      <span style={{ animationDelay: `${(index % 5) * 1.4}s` }} />
    </span>
  );

  if (view === "list") {
    return (
      <article
        id={gameAnchor(game)}
        data-reveal
        onClick={open}
        className={`cm-card group relative flex items-center gap-3 p-2 pr-3 rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer ${
          game.featured ? "cm-card-focus" : ""
        }`}
      >
        <ShowcaseImage
          src={game.image}
          placeholder={BOARDGAME_PLACEHOLDER}
          className="w-16 h-16 rounded-lg shrink-0"
        />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-gold min-w-0">
            <span className="truncate">
              <Highlight text={game.name} words={words} />
            </span>
            {game.featured && (
              <FaStar size={10} className="shrink-0 text-primary-gold" aria-label="Destaque" />
            )}
          </span>
          <span className="flex items-center gap-3 text-[11px] text-primary-gold/65">
            <span className="flex items-center gap-1">
              <LuUsers size={12} /> {playersLabel(game)}
            </span>
            <span className="flex items-center gap-1">
              <LuClock size={12} /> {playTimeLabel(game.playTime)}
            </span>
          </span>
          <DifficultyMeter difficulty={game.difficulty} />
        </div>
        {forSale && game.value && (
          <span className="text-sm font-bold text-primary-gold shrink-0">{game.value}</span>
        )}
        {onToggleList && (
          <ListToggle
            inList={!!inList}
            onToggle={(source) => onToggleList(game, source)}
            className="!w-8 !h-8"
          />
        )}
        <LuChevronRight size={16} className="text-primary-gold/30 shrink-0" />
        {sheen}
      </article>
    );
  }

  return (
    <article
      id={gameAnchor(game)}
      data-reveal
      onClick={open}
      className={`cm-card group relative flex flex-col rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer ${
        game.featured ? "cm-card-focus" : ""
      }`}
    >
      <div className="relative">
        <ShowcaseImage
          src={game.image}
          placeholder={BOARDGAME_PLACEHOLDER}
          className="w-full aspect-[4/3] rounded-t-[11px]"
        />
        <div className="absolute inset-0 rounded-t-[11px] bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        {forSale && game.value && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-primary-gold text-primary-black text-xs font-bold shadow-card">
            {game.value}
          </span>
        )}
        {onToggleList && (
          <ListToggle
            inList={!!inList}
            onToggle={(source) => onToggleList(game, source)}
            className="absolute top-2 right-2"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-2.5 sm:p-3 flex-1">
        <span className="block text-[13px] sm:text-sm font-semibold leading-snug line-clamp-2 text-primary-gold">
          <Highlight text={game.name} words={words} />
        </span>
        <span className="flex items-center gap-3 text-[11px] text-primary-gold/65 mt-auto">
          <span className="flex items-center gap-1">
            <LuUsers size={12} /> {playersLabel(game)}
          </span>
          <span className="flex items-center gap-1">
            <LuClock size={12} /> {playTimeLabel(game.playTime)}
          </span>
        </span>
        <DifficultyMeter difficulty={game.difficulty} />
      </div>
      {sheen}
      {game.featured && (
        <span className="cm-ribbon">
          <FaStar size={9} aria-hidden="true" />
          Destaque
        </span>
      )}
    </article>
  );
}
