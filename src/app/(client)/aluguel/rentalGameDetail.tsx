"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
  LuArrowRight,
  LuCalendarDays,
  LuClock,
  LuCopy,
  LuGauge,
  LuLayers,
  LuPlus,
  LuTag,
  LuUsers,
} from "react-icons/lu";
import DetailSheet from "@/components/showcase/detailSheet";
import { DifficultyMeter } from "@/app/(client)/clientCollection/gameCard";
import {
  BOARDGAME_PLACEHOLDER,
  playTimeLabel,
  playersLabel,
} from "@/app/(client)/clientCollection/collectionUtils";
import type { GameAvailability } from "@/rental/availability";
import { formatBRL } from "@/rental/money";
import AvailabilityBadge from "./availabilityBadge";
import { asBoardgame, type RentalGameWithId } from "./rentalGameCard";

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

/** Detalhe de um jogo para alugar: o do acervo mais preço, prazo e pedido. */
export default function RentalGameDetail({
  game,
  origin,
  availability,
  inCart,
  onAdd,
  onClosed,
}: {
  game: RentalGameWithId;
  origin: HTMLElement | null;
  availability: GameAvailability;
  inCart: boolean;
  onAdd: () => void;
  onClosed: () => void;
}) {
  const board = asBoardgame(game);
  const copies = game.units.filter((unit) => unit.status === "active").length;
  const unavailable = availability.state === "unavailable";

  return (
    <DetailSheet
      image={game.image}
      placeholder={BOARDGAME_PLACEHOLDER}
      title={game.name}
      subtitle={
        <span className="flex items-center gap-1.5 text-lg font-bold">
          <LuTag size={15} /> {formatBRL(game.price)}
        </span>
      }
      badges={<AvailabilityBadge availability={availability} className="!text-xs !px-2.5 !py-1" />}
      origin={origin}
      onClosed={onClosed}
      footer={(close) => (
        <div className="flex gap-2">
          {inCart ? (
            // Já está no pedido: o próximo passo natural é revisar.
            <Link
              href="/aluguel/pedido"
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-primary-gold bg-primary-gold text-primary-black text-sm font-semibold hover:bg-primary-gold/90"
            >
              No pedido · Ver pedido <LuArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              disabled={unavailable}
              onClick={onAdd}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                unavailable
                  ? "border-primary-gold/15 bg-primary-gold/5 text-primary-gold/35 cursor-not-allowed"
                  : "border-primary-gold bg-primary-gold text-primary-black hover:bg-primary-gold/90 cursor-pointer"
              }`}
            >
              <LuPlus size={16} /> {unavailable ? "Indisponível" : "Adicionar ao pedido"}
            </button>
          )}
          <button
            type="button"
            onClick={close}
            className="h-10 px-5 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 text-sm transition-colors cursor-pointer"
          >
            Voltar
          </button>
        </div>
      )}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={LuUsers} label="Jogadores">
          {playersLabel(board)}
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

      <div className="grid grid-cols-2 gap-2">
        <Stat icon={LuCalendarDays} label="Fica com você">
          {game.rentalDays} {game.rentalDays === 1 ? "dia" : "dias"}
        </Stat>
        <Stat icon={LuCopy} label="Cópias">
          {copies}
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
