"use client";

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { LuCheck, LuClock, LuGauge, LuLayers, LuPlus, LuSparkles, LuTag, LuUsers } from "react-icons/lu";
import DetailSheet from "@/components/showcase/detailSheet";
import type { BoardgameType } from "@/types";
import { DifficultyMeter } from "./gameCard";
import { BOARDGAME_PLACEHOLDER, playTimeLabel, playersLabel } from "./collectionUtils";

function Stat({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-primary-gold/15 bg-primary-black/40 px-3 py-2.5 min-w-0">
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">
        <Icon size={11} /> {label}
      </span>
      <span className="text-sm font-semibold text-primary-gold leading-tight">{children}</span>
    </div>
  );
}

/** Detalhe de um jogo (gaveta no celular, cartão no computador). */
export default function GameDetail({
  game,
  origin,
  forSale,
  inList,
  onToggleList,
  onClosed,
}: {
  game: BoardgameType;
  /** Capa do card tocado — de onde a foto sai voando. */
  origin: HTMLElement | null;
  forSale: boolean;
  inList: boolean;
  /** Só no acervo: pôr/tirar da "minha lista". */
  onToggleList?: () => void;
  onClosed: () => void;
}) {
  return (
    <DetailSheet
      image={game.image}
      placeholder={BOARDGAME_PLACEHOLDER}
      title={game.name}
      subtitle={
        forSale && game.value ? (
          <span className="flex items-center gap-1.5 text-lg font-bold">
            <LuTag size={15} /> {game.value}
          </span>
        ) : undefined
      }
      badges={
        game.featured ? (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-primary-gold text-primary-black text-xs font-bold rounded-full">
            <LuSparkles size={11} /> Destaque
          </span>
        ) : undefined
      }
      origin={origin}
      onClosed={onClosed}
      footer={
        onToggleList
          ? (close) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onToggleList}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-semibold transition-colors cursor-pointer ${
                    inList
                      ? "border-primary-gold/50 bg-primary-gold/10 text-primary-gold"
                      : "border-primary-gold bg-primary-gold text-primary-black hover:bg-primary-gold/90"
                  }`}
                >
                  {inList ? (
                    <>
                      <LuCheck size={16} strokeWidth={3} /> Na sua lista
                    </>
                  ) : (
                    <>
                      <LuPlus size={16} /> Pôr na minha lista
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="h-10 px-5 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 text-sm transition-colors cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            )
          : undefined
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={LuUsers} label="Jogadores">
          {playersLabel(game)}
        </Stat>
        <Stat icon={LuClock} label="Duração">
          {playTimeLabel(game.playTime)}
        </Stat>
        <Stat icon={LuGauge} label="Dificuldade">
          <span className="flex flex-col gap-1">
            <DifficultyMeter difficulty={game.difficulty} showLabel={false} />
            <span className="text-[11px] font-medium text-primary-gold/70 truncate">
              {game.difficulty}
            </span>
          </span>
        </Stat>
      </div>

      {game.types.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {game.types.map((type) => (
            <span
              key={type}
              className="flex items-center gap-1 text-xs bg-secondary-black/60 rounded-lg px-2 py-1 border border-primary-gold/10 text-primary-gold/70"
            >
              <LuLayers size={10} /> {type}
            </span>
          ))}
        </div>
      )}

      {game.description && (
        <p className="text-sm text-primary-gold/85 whitespace-pre-line leading-relaxed">
          {game.description}
        </p>
      )}
    </DetailSheet>
  );
}
