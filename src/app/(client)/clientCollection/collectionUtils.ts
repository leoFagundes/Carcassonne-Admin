import type { BoardgameType } from "@/types";
import { difficultiesOptions } from "@/utils/patternValues";
import { foldText, searchWords } from "@/components/showcase/search";

export const BOARDGAME_PLACEHOLDER = "/images/placeholder-boardgame.svg";

/** Lista de jogos escolhidos pelo cliente, guardada no aparelho. */
export const MY_LIST_KEY = "boardgames";
/** Grade ou lista: a última escolha fica guardada no aparelho. */
export const VIEW_KEY = "carcassonne-collection-view";

export type CollectionView = "grid" | "list";

export interface GameFilters {
  query: string;
  /** Quantas pessoas vão jogar. */
  players?: number;
  /** Duração máxima, em minutos. */
  maxTime?: number;
  difficulty: string;
  /** Categorias marcadas (o jogo precisa ter todas). */
  types: string[];
  featured: boolean;
  forTwo: boolean;
}

export const EMPTY_FILTERS: GameFilters = {
  query: "",
  players: undefined,
  maxTime: undefined,
  difficulty: "",
  types: [],
  featured: false,
  forTwo: false,
};

export const PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export const TIME_OPTIONS = [
  { value: 30, label: "Até 30 min" },
  { value: 45, label: "Até 45 min" },
  { value: 60, label: "Até 1h" },
  { value: 90, label: "Até 1h30" },
  { value: 120, label: "Até 2h" },
];

export const playersLabel = (game: BoardgameType) =>
  game.minPlayers === game.maxPlayers
    ? `${game.maxPlayers}`
    : `${game.minPlayers}–${game.maxPlayers}`;

/** 45 → "45 min"; 90 → "1h30"; 120 → "2h" */
export function playTimeLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

/** "Muito Leve" → 1 … "Muito Pesado" → 5 (0 se não estiver na lista). */
export const difficultyLevel = (difficulty: string) =>
  difficultiesOptions.indexOf(difficulty) + 1;

/** Âncora do card de cada jogo. */
export const gameAnchor = (game: BoardgameType) => `game-${game.id ?? game.name}`;

export const sameGame = (a: BoardgameType, b: BoardgameType) =>
  a.id ? a.id === b.id : a.name === b.name;

/**
 * Jogos que passam nos filtros. Com busca, primeiro os que começam com o
 * texto, depois os que têm tudo no nome e por fim os que só batem na
 * categoria; dentro disso, destaques da casa primeiro e ordem alfabética.
 */
export function filterGames(games: BoardgameType[], filters: GameFilters) {
  const words = searchWords(filters.query);
  const phrase = words.join(" ");

  return games
    .flatMap((game) => {
      if (filters.players !== undefined) {
        if (game.minPlayers > filters.players || game.maxPlayers < filters.players) return [];
      }
      if (filters.maxTime !== undefined && game.playTime > filters.maxTime) return [];
      if (filters.difficulty && game.difficulty !== filters.difficulty) return [];
      if (filters.types.length && !filters.types.every((type) => game.types.includes(type))) {
        return [];
      }
      if (filters.featured && !game.featured) return [];
      if (filters.forTwo && !(game.minPlayers === 2 && game.maxPlayers === 2)) return [];

      let rank = 0;
      if (words.length) {
        const name = foldText(game.name);
        const all = `${name} ${foldText(game.types.join(" "))}`;
        if (!words.every((word) => all.includes(word))) return [];
        rank = name.startsWith(phrase) ? 0 : words.every((word) => name.includes(word)) ? 1 : 2;
      }
      return [{ game, rank }];
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(b.game.featured) - Number(a.game.featured) ||
        a.game.name.localeCompare(b.game.name, "pt-BR"),
    )
    .map(({ game }) => game);
}

/** Filtros ativos como etiquetas removíveis (a busca fica no próprio campo). */
export function activeFilterChips(filters: GameFilters) {
  const chips: { key: string; label: string; clear: (current: GameFilters) => GameFilters }[] = [];
  if (filters.players !== undefined) {
    chips.push({
      key: "players",
      label: filters.players === 1 ? "1 jogador" : `${filters.players} jogadores`,
      clear: (current) => ({ ...current, players: undefined }),
    });
  }
  if (filters.maxTime !== undefined) {
    chips.push({
      key: "time",
      label: TIME_OPTIONS.find((option) => option.value === filters.maxTime)?.label ??
        `Até ${filters.maxTime} min`,
      clear: (current) => ({ ...current, maxTime: undefined }),
    });
  }
  if (filters.difficulty) {
    chips.push({
      key: "difficulty",
      label: filters.difficulty,
      clear: (current) => ({ ...current, difficulty: "" }),
    });
  }
  filters.types.forEach((type) =>
    chips.push({
      key: `type-${type}`,
      label: type,
      clear: (current) => ({ ...current, types: current.types.filter((t) => t !== type) }),
    }),
  );
  if (filters.featured) {
    chips.push({
      key: "featured",
      label: "Destaques",
      clear: (current) => ({ ...current, featured: false }),
    });
  }
  if (filters.forTwo) {
    chips.push({
      key: "two",
      label: "Só para dois",
      clear: (current) => ({ ...current, forTwo: false }),
    });
  }
  return chips;
}
