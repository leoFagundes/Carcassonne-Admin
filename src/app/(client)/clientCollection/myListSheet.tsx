"use client";

import { useEffect, useRef, useState } from "react";
import ReactConfetti from "react-confetti";
import { GiCardRandom } from "react-icons/gi";
import { LuClock, LuListChecks, LuTrash2, LuUsers, LuX } from "react-icons/lu";
import PanelSheet from "@/components/showcase/panelSheet";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { flashCard, prefersReducedMotion } from "@/components/showcase/motion";
import type { BoardgameType } from "@/types";
import { DifficultyMeter } from "./gameCard";
import { BOARDGAME_PLACEHOLDER, gameAnchor, playTimeLabel, playersLabel, sameGame } from "./collectionUtils";

const CONFETTI_COLORS = ["#e6c56b", "#f8e6a8", "#d4af37", "#fff1c2", "#b8902e"];

/**
 * "Minha lista": os jogos que o cliente separou para jogar, com sorteio.
 * Tocar num jogo abre o detalhe dele por cima.
 */
export default function MyListSheet({
  games,
  onOpen,
  onRemove,
  onClear,
  onClosed,
}: {
  games: BoardgameType[];
  onOpen: (game: BoardgameType, origin: HTMLElement | null) => void;
  onRemove: (game: BoardgameType) => void;
  onClear: () => void;
  onClosed: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [current, setCurrent] = useState<BoardgameType | null>(null);
  const [winner, setWinner] = useState<BoardgameType | null>(null);
  const [confetti, setConfetti] = useState<{ width: number; height: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  // "Limpar" pede confirmação; se ninguém confirmar, volta ao normal
  useEffect(() => {
    if (!confirmClear) return;
    const timer = window.setTimeout(() => setConfirmClear(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmClear]);

  const later = (callback: () => void, delay: number) => {
    timers.current.push(window.setTimeout(callback, delay));
  };

  const rowOf = (game: BoardgameType) =>
    document.getElementById(`list-${gameAnchor(game)}`) as HTMLElement | null;

  /** O sorteado brilha, aparece na lista e cai confete. */
  const celebrate = (game: BoardgameType) => {
    setSpinning(false);
    setWinner(game);
    const row = rowOf(game);
    if (row) {
      row.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      later(() => flashCard(row), 250);
    }
    const box = overlayRef.current?.getBoundingClientRect();
    if (box && !prefersReducedMotion()) {
      setConfetti({ width: box.width, height: box.height });
      later(() => setConfetti(null), 4500);
    }
  };

  /** Roleta: os nomes passam cada vez mais devagar até parar num jogo. */
  const draw = () => {
    if (spinning || !games.length) return;
    setWinner(null);
    setConfetti(null);
    const pick = (avoid?: BoardgameType | null) => {
      if (games.length === 1) return games[0];
      let game: BoardgameType;
      do {
        game = games[Math.floor(Math.random() * games.length)];
      } while (avoid && sameGame(game, avoid));
      return game;
    };

    if (prefersReducedMotion() || games.length === 1) {
      const game = pick();
      setCurrent(game);
      celebrate(game);
      return;
    }

    setSpinning(true);
    const steps = 20 + Math.floor(Math.random() * 5);
    let delay = 55;
    let last: BoardgameType | null = null;
    let step = 0;
    const tick = () => {
      last = pick(last);
      setCurrent(last);
      step++;
      if (step < steps) {
        delay *= 1.09;
        later(tick, delay);
      } else {
        const chosen = last;
        later(() => celebrate(chosen), 260);
      }
    };
    tick();
  };

  const count = games.length;

  return (
    <PanelSheet
      title="Minha lista"
      subtitle={count ? `${count} ${count === 1 ? "jogo separado" : "jogos separados"}` : "Nenhum jogo ainda"}
      icon={<LuListChecks size={17} />}
      className="sm:w-[560px]"
      onClosed={onClosed}
      headerAction={
        count > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirmClear) {
                setConfirmClear(false);
                setWinner(null);
                onClear();
              } else {
                setConfirmClear(true);
              }
            }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer ${
              confirmClear
                ? "border-invalid-color/50 text-invalid-color bg-invalid-color/10"
                : "border-transparent text-primary-gold/55 hover:text-primary-gold hover:border-primary-gold/30"
            }`}
          >
            <LuTrash2 size={12} /> {confirmClear ? "Confirmar" : "Limpar"}
          </button>
        )
      }
      overlay={
        <div ref={overlayRef} aria-hidden="true" className="absolute inset-0 pointer-events-none z-10">
          {confetti && (
            <ReactConfetti
              width={confetti.width}
              height={confetti.height}
              recycle={false}
              numberOfPieces={160}
              gravity={0.22}
              colors={CONFETTI_COLORS}
            />
          )}
        </div>
      }
      footer={() => (
        <button
          type="button"
          onClick={draw}
          disabled={!count}
          aria-live="polite"
          className={`relative w-full h-12 flex items-center justify-center gap-3 px-4 rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            spinning
              ? "border-primary-gold/40 bg-primary-black/40"
              : "border-primary-gold bg-primary-gold/10 shadow-[0_0_18px_rgba(230,197,107,0.15)] hover:bg-primary-gold/15"
          }`}
        >
          <GiCardRandom size={24} className={`shrink-0 text-primary-gold ${spinning ? "animate-pulse" : ""}`} />
          <span className="relative flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden">
            <span
              key={current ? `${current.id ?? current.name}-${spinning}` : "idle"}
              className="gc-slot truncate text-sm font-semibold text-primary-gold"
            >
              {spinning && current
                ? current.name
                : winner
                  ? `Sorteado: ${winner.name}`
                  : "Sortear um jogo"}
            </span>
          </span>
        </button>
      )}
    >
      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="flex items-center justify-center w-12 h-12 rounded-full border border-primary-gold/20 bg-secondary-black/60 text-primary-gold/60">
            <LuListChecks size={20} />
          </span>
          <span className="text-sm font-semibold text-primary-gold/80">Sua lista está vazia</span>
          <span className="text-xs text-primary-gold/45">
            Toque no + dos jogos para separar os que querem jogar hoje.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {games.map((game) => {
            const isCurrent = spinning && !!current && sameGame(current, game);
            const isWinner = !spinning && !!winner && sameGame(winner, game);
            return (
              <li key={game.id ?? game.name} data-sheet-item>
                <div
                  id={`list-${gameAnchor(game)}`}
                  role="button"
                  tabIndex={0}
                  data-spin={isCurrent}
                  data-winner={isWinner}
                  onClick={(event) =>
                    onOpen(game, event.currentTarget.querySelector<HTMLElement>(".cm-img"))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onOpen(game, event.currentTarget.querySelector<HTMLElement>(".cm-img"));
                    }
                  }}
                  className="gc-row cm-card relative flex items-center gap-3 p-2 pr-2.5 rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer"
                >
                  <ShowcaseImage
                    src={game.image}
                    placeholder={BOARDGAME_PLACEHOLDER}
                    className="w-14 h-14 rounded-lg shrink-0"
                  />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-primary-gold truncate">{game.name}</span>
                    <span className="flex items-center gap-3 text-[11px] text-primary-gold/65">
                      <span className="flex items-center gap-1">
                        <LuUsers size={12} /> {playersLabel(game)}
                      </span>
                      <span className="flex items-center gap-1">
                        <LuClock size={12} /> {playTimeLabel(game.playTime)}
                      </span>
                      <DifficultyMeter difficulty={game.difficulty} showLabel={false} />
                    </span>
                  </div>
                  {isWinner && (
                    <span className="gc-chip-in shrink-0 px-2 py-0.5 rounded-full bg-primary-gold text-primary-black text-[10px] font-bold uppercase tracking-wider">
                      Sorteado
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Tirar ${game.name} da lista`}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (winner && sameGame(winner, game)) setWinner(null);
                      onRemove(game);
                    }}
                    className="shrink-0 p-2 rounded-full border border-primary-gold/15 text-primary-gold/50 hover:text-invalid-color hover:border-invalid-color/40 transition-colors cursor-pointer"
                  >
                    <LuX size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PanelSheet>
  );
}
