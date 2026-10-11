"use client";

import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  LuCheck,
  LuClock,
  LuGauge,
  LuLayers,
  LuSlidersHorizontal,
  LuSparkles,
  LuUsers,
} from "react-icons/lu";
import PanelSheet from "@/components/showcase/panelSheet";
import { difficultiesOptions } from "@/utils/patternValues";
import { DifficultyMeter } from "./gameCard";
import {
  EMPTY_FILTERS,
  GameFilters,
  PLAYER_OPTIONS,
  TIME_OPTIONS,
  activeFilterChips,
} from "./collectionUtils";

/** Etiqueta de filtro: dourada quando marcada. */
export function FilterChip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full border text-sm transition-all duration-200 active:scale-95 cursor-pointer ${
        active
          ? "border-primary-gold bg-primary-gold/15 text-primary-gold font-semibold shadow-[0_0_14px_rgba(230,197,107,0.18)]"
          : "border-primary-gold/20 bg-secondary-black/50 text-primary-gold/70 hover:border-primary-gold/45 hover:text-primary-gold"
      } ${className}`}
    >
      {active && <LuCheck size={13} strokeWidth={3} className="shrink-0" />}
      {children}
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: IconType;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section data-sheet-item className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-gold/55">
          <Icon size={13} /> {title}
        </span>
        {hint && <span className="text-[11px] text-primary-gold/40">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

/** Filtros do acervo. Tudo vale na hora; o botão mostra quantos jogos sobram. */
export default function FiltersSheet({
  filters,
  onChange,
  types,
  resultCount,
  onClosed,
}: {
  filters: GameFilters;
  onChange: (filters: GameFilters) => void;
  /** Categorias existentes no acervo. */
  types: string[];
  resultCount: number;
  onClosed: () => void;
}) {
  const set = (patch: Partial<GameFilters>) => onChange({ ...filters, ...patch });
  const hasFilters = activeFilterChips(filters).length > 0;

  return (
    <PanelSheet
      title="Filtros"
      subtitle="Encontre o jogo certo para a sua mesa"
      icon={<LuSlidersHorizontal size={17} />}
      onClosed={onClosed}
      headerAction={
        hasFilters && (
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs text-primary-gold/60 hover:text-primary-gold border border-transparent hover:border-primary-gold/30 transition-colors cursor-pointer"
          >
            Limpar
          </button>
        )
      }
      footer={(close) => (
        <button
          type="button"
          onClick={close}
          className="w-full h-11 rounded-xl bg-primary-gold text-primary-black font-semibold transition-colors hover:bg-primary-gold/90 cursor-pointer"
        >
          {resultCount === 0
            ? "Nenhum jogo com esses filtros"
            : `Ver ${resultCount} ${resultCount === 1 ? "jogo" : "jogos"}`}
        </button>
      )}
    >
      <div className="flex flex-col gap-6 px-5 py-5">
        <Section icon={LuUsers} title="Quantas pessoas vão jogar?">
          {PLAYER_OPTIONS.map((count) => (
            <FilterChip
              key={count}
              active={filters.players === count}
              onClick={() => set({ players: filters.players === count ? undefined : count })}
              className="!px-0 w-11"
            >
              {count === PLAYER_OPTIONS[PLAYER_OPTIONS.length - 1] ? `${count}+` : count}
            </FilterChip>
          ))}
        </Section>

        <Section icon={LuClock} title="Tempo de partida">
          {TIME_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              active={filters.maxTime === option.value}
              onClick={() =>
                set({ maxTime: filters.maxTime === option.value ? undefined : option.value })
              }
            >
              {option.label}
            </FilterChip>
          ))}
        </Section>

        <Section icon={LuGauge} title="Dificuldade">
          {difficultiesOptions.map((difficulty) => (
            <FilterChip
              key={difficulty}
              active={filters.difficulty === difficulty}
              onClick={() =>
                set({ difficulty: filters.difficulty === difficulty ? "" : difficulty })
              }
            >
              <DifficultyMeter difficulty={difficulty} showLabel={false} />
              {difficulty}
            </FilterChip>
          ))}
        </Section>

        {types.length > 0 && (
          <Section
            icon={LuLayers}
            title="Categorias"
            hint="Mostra os jogos que têm todas as categorias marcadas"
          >
            {types.map((type) => {
              const active = filters.types.includes(type);
              return (
                <FilterChip
                  key={type}
                  active={active}
                  onClick={() =>
                    set({
                      types: active
                        ? filters.types.filter((t) => t !== type)
                        : [...filters.types, type],
                    })
                  }
                >
                  {type}
                </FilterChip>
              );
            })}
          </Section>
        )}

        <Section icon={LuSparkles} title="Mais">
          <FilterChip active={filters.featured} onClick={() => set({ featured: !filters.featured })}>
            Destaques da casa
          </FilterChip>
          <FilterChip active={filters.forTwo} onClick={() => set({ forTwo: !filters.forTwo })}>
            Só para dois
          </FilterChip>
        </Section>
      </div>
    </PanelSheet>
  );
}
