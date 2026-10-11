"use client";

import { LuChevronRight, LuEye, LuEyeOff, LuPencil, LuSparkles, LuVegan } from "react-icons/lu";
import type { MenuItemType } from "@/types";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { Highlight } from "@/components/showcase/search";
import { CatalogBadge, CatalogView, QuickToggle } from "@/components/adminCatalog";

const PLACEHOLDER = "/images/placeholder-menu.svg";

/**
 * Item do cardápio no admin. Tocar abre a edição; os botões de baixo
 * mostram/ocultam, destacam e marcam como vegano sem abrir nada.
 */
export default function MenuCard({
  item,
  view,
  words,
  onEdit,
  onUpdate,
}: {
  item: MenuItemType;
  view: CatalogView;
  /** Palavras buscadas (destacadas no nome). */
  words: string[];
  onEdit: () => void;
  onUpdate: (patch: Partial<MenuItemType>) => void;
}) {
  const isHidden = !item.isVisible;

  const toggles = (
    <>
      <QuickToggle
        active={item.isVisible}
        icon={LuEyeOff}
        activeIcon={LuEye}
        label={item.isVisible ? "Visível no cardápio — ocultar" : "Oculto — mostrar no cardápio"}
        onToggle={() => onUpdate({ isVisible: !item.isVisible })}
      />
      <QuickToggle
        active={item.isFocus}
        icon={LuSparkles}
        label={item.isFocus ? "Em destaque — tirar o destaque" : "Destacar no cardápio"}
        onToggle={() => onUpdate({ isFocus: !item.isFocus })}
      />
      <QuickToggle
        active={item.isVegan}
        icon={LuVegan}
        label={item.isVegan ? "Vegano — desmarcar" : "Marcar como vegano"}
        onToggle={() => onUpdate({ isVegan: !item.isVegan })}
      />
    </>
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
          src={item.image}
          placeholder={PLACEHOLDER}
          className={`w-12 h-12 rounded-lg shrink-0 ${isHidden ? "opacity-40 grayscale" : ""}`}
        />
        <div className={`flex flex-col gap-0.5 flex-1 min-w-0 ${isHidden ? "opacity-60" : ""}`}>
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-primary-gold truncate">
              <Highlight text={item.name} words={words} />
            </span>
            {isHidden && <CatalogBadge icon={LuEyeOff}>Oculto</CatalogBadge>}
          </span>
          <span className="flex items-center gap-2 text-[11px] text-primary-gold/55 min-w-0">
            {item.subtype && <span className="shrink-0 text-primary-gold/70">{item.subtype}</span>}
            <span className="truncate">{item.description}</span>
          </span>
        </div>
        {item.value && (
          <span className="hidden sm:block max-w-[140px] truncate text-xs font-semibold text-primary-gold/85 shrink-0">
            {item.value}
          </span>
        )}
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
          src={item.image}
          placeholder={PLACEHOLDER}
          className={`w-full aspect-[4/3] ${isHidden ? "opacity-40 grayscale" : ""}`}
        />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {isHidden && <CatalogBadge icon={LuEyeOff}>Oculto</CatalogBadge>}
          {item.isFocus && (
            <CatalogBadge icon={LuSparkles} tone="gold">
              Destaque
            </CatalogBadge>
          )}
          {item.isVegan && <CatalogBadge icon={LuVegan}>Vegano</CatalogBadge>}
        </div>
        {item.subtype && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate px-1.5 py-0.5 rounded-md bg-primary-black/80 border border-primary-gold/20 text-[10px] text-primary-gold/80 backdrop-blur-sm">
            {item.subtype}
          </span>
        )}
      </div>
      <div className={`flex flex-col gap-1 px-2.5 pt-2.5 flex-1 ${isHidden ? "opacity-60" : ""}`}>
        <span className="text-sm font-semibold leading-snug line-clamp-2 text-primary-gold">
          <Highlight text={item.name} words={words} />
        </span>
        {item.value && (
          <span className="text-xs font-semibold text-primary-gold/80 line-clamp-2">{item.value}</span>
        )}
        {item.description && (
          <span className="text-[11px] text-primary-gold/50 line-clamp-2">{item.description}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 p-2.5">
        {toggles}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-primary-gold/30 group-hover:text-primary-gold/70 transition-colors">
          <LuPencil size={11} />
        </span>
      </div>
    </article>
  );
}
