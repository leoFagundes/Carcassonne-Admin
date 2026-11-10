"use client";

import { LuChevronRight, LuClock, LuEye, LuEyeOff, LuPencil, LuSparkles, LuTag, LuUsers } from "react-icons/lu";
import type { BoardgameType } from "@/types";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { Highlight } from "@/components/showcase/search";
import { CatalogBadge, CatalogView, QuickToggle } from "@/components/adminCatalog";

const PLACEHOLDER = "/images/[oficial]-pattern-boardgame-image.png";

const playersLabel = (game: BoardgameType) =>
  game.minPlayers === game.maxPlayers ? `${game.maxPlayers}` : `${game.minPlayers}–${game.maxPlayers}`;

/**
 * Jogo no acervo do admin. Tocar abre a edição; os botões de baixo
 * mostram/ocultam no site e destacam sem abrir nada.
 */
export default function Card({
  game,
  view,
  words,
  onEdit,
  onUpdate,
}: {
  game: BoardgameType;
  view: CatalogView;
  /** Palavras buscadas (destacadas no nome). */
  words: string[];
  onEdit: () => void;
  onUpdate: (patch: Partial<BoardgameType>) => void;
}) {
  const isHidden = !game.isVisible;

  const toggles = (
    <>
      <QuickToggle
        active={game.isVisible}
        icon={LuEyeOff}
        activeIcon={LuEye}
        label={game.isVisible ? "Visível no site — ocultar" : "Oculto — mostrar no site"}
        onToggle={() => onUpdate({ isVisible: !game.isVisible })}
      />
      <QuickToggle
        active={game.featured}
        icon={LuSparkles}
        label={game.featured ? "Em destaque — tirar o destaque" : "Destacar no site"}
        onToggle={() => onUpdate({ featured: !game.featured })}
      />
    </>
  );

  const details = (
    <span className="flex items-center gap-2.5 text-[11px] text-primary-gold/55">
      <span className="flex items-center gap-1">
        <LuUsers size={11} /> {playersLabel(game)}
      </span>
      <span className="flex items-center gap-1">
        <LuClock size={11} /> {game.playTime} min
      </span>
      <span className="truncate">{game.difficulty}</span>
    </span>
  );

  if (view === "list") {
    return (
      <article
        onClick={onEdit}
        className={`group flex items-center gap-3 p-2 pr-3 rounded-xl border bg-secondary-black/50 cursor-pointer transition-colors hover:border-primary-gold/45 hover:bg-secondary-black/80 ${
          isHidden ? "border-dashed border-primary-gold/20" : "border-primary-gold/15"
        }`}
      >
        <ShowcaseImage
          src={game.image}
          placeholder={PLACEHOLDER}
          className={`w-12 h-12 rounded-lg shrink-0 ${isHidden ? "opacity-40 grayscale" : ""}`}
        />
        <div className={`flex flex-col gap-1 flex-1 min-w-0 ${isHidden ? "opacity-60" : ""}`}>
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-primary-gold truncate">
              <Highlight text={game.name} words={words} />
            </span>
            {isHidden && <CatalogBadge icon={LuEyeOff}>Oculto</CatalogBadge>}
            {game.isForSale && (
              <CatalogBadge icon={LuTag} tone="gold">
                {game.value || "À venda"}
              </CatalogBadge>
            )}
          </span>
          {details}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">{toggles}</div>
        <LuChevronRight size={16} className="text-primary-gold/30 group-hover:text-primary-gold/70 shrink-0" />
      </article>
    );
  }

  return (
    <article
      onClick={onEdit}
      className={`group relative flex flex-col rounded-xl border bg-secondary-black/50 overflow-hidden cursor-pointer transition-colors hover:border-primary-gold/45 ${
        isHidden ? "border-dashed border-primary-gold/20" : "border-primary-gold/15"
      }`}
    >
      <div className="relative">
        <ShowcaseImage
          src={game.image}
          placeholder={PLACEHOLDER}
          className={`w-full aspect-[4/3] ${isHidden ? "opacity-40 grayscale" : ""}`}
        />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {isHidden && <CatalogBadge icon={LuEyeOff}>Oculto</CatalogBadge>}
          {game.featured && (
            <CatalogBadge icon={LuSparkles} tone="gold">
              Destaque
            </CatalogBadge>
          )}
          {game.isForSale && <CatalogBadge icon={LuTag}>{game.value || "À venda"}</CatalogBadge>}
        </div>
      </div>
      <div className={`flex flex-col gap-1.5 px-2.5 pt-2.5 flex-1 ${isHidden ? "opacity-60" : ""}`}>
        <span className="text-sm font-semibold leading-snug line-clamp-2 text-primary-gold">
          <Highlight text={game.name} words={words} />
        </span>
        {details}
      </div>
      <div className="flex items-center gap-1.5 p-2.5">
        {toggles}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-primary-gold/30 group-hover:text-primary-gold/70 transition-colors">
          <LuPencil size={11} /> Editar
        </span>
      </div>
    </article>
  );
}
