"use client";

import "@/components/showcase/showcase.css";
import "./collection.css";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import {
  LuArrowRight,
  LuLayoutGrid,
  LuList,
  LuListChecks,
  LuSearch,
  LuSlidersHorizontal,
  LuX,
} from "react-icons/lu";
import type { BoardgameType } from "@/types";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { useAlert } from "@/contexts/alertProvider";
import ScrollUp from "@/components/scrollUp";
import ThemeBand from "@/components/siteTheme/ThemeBand";
import Counter from "@/components/mage-ui/text/counter";
import { useScrollReveal } from "@/components/showcase/useScrollReveal";
import { useShowcaseHeader } from "@/components/showcase/useShowcaseHeader";
import { prefersReducedMotion } from "@/components/showcase/motion";
import { searchWords } from "@/components/showcase/search";
import GameCard from "./gameCard";
import GameDetail from "./gameDetail";
import FiltersSheet from "./filtersSheet";
import MyListSheet from "./myListSheet";
import CollectionSkeleton from "./collectionSkeleton";
import {
  CollectionView,
  EMPTY_FILTERS,
  GameFilters,
  MY_LIST_KEY,
  VIEW_KEY,
  activeFilterChips,
  filterGames,
  gameAnchor,
  sameGame,
} from "./collectionUtils";

const COPY = {
  collection: {
    title: "Coleção de Jogos",
    tagline: "Encontre o jogo ideal para a sua mesa!",
    otherHref: "/clientCollection/forSale",
  },
  forSale: {
    title: "Jogos à Venda",
    tagline: "Encontre um jogo para chamar de seu!",
    otherHref: "/clientCollection",
  },
};

function Star() {
  return (
    <svg width="7" height="7" viewBox="0 0 10 10" className="text-primary-gold/50 shrink-0">
      <polygon
        points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Vitrine dos jogos: o acervo para jogar no pub (com a "minha lista" e o
 * sorteio) ou os jogos à venda. Busca no cabeçalho, filtros numa gaveta,
 * grade ou lista, e o detalhe de cada jogo com a capa saindo do card.
 */
export default function CollectionShowcase({ forSale }: { forSale: boolean }) {
  const [games, setGames] = useState<BoardgameType[]>([]);
  // Jogos da outra vitrine (à venda, para quem está no acervo, e vice-versa)
  const [otherCount, setOtherCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<GameFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<CollectionView>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [detail, setDetail] = useState<{
    game: BoardgameType;
    origin: HTMLElement | null;
  } | null>(null);
  const [myList, setMyList] = useState<BoardgameType[]>([]);
  const [spacer, setSpacer] = useState(132);

  const headerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const filtersChanged = useRef(false);

  const { addAlert } = useAlert();
  const compact = useShowcaseHeader(progressRef);
  // Cards surgem ao entrar na tela (e ao trocar a busca/visão)
  useScrollReveal();
  const copy = forSale ? COPY.forSale : COPY.collection;

  // Grade ou lista: lembra a última escolha neste aparelho
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // sem armazenamento: começa na grade
    }
  }, []);

  const changeView = (next: CollectionView) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // segue sem guardar
    }
  };

  const saveList = (list: BoardgameType[]) => {
    setMyList(list);
    try {
      localStorage.setItem(MY_LIST_KEY, JSON.stringify(list));
    } catch {
      // segue sem guardar
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = (await BoardgameRepository.getAll()).filter((game) => game.isVisible);
        setGames(all.filter((game) => !!game.isForSale === forSale));
        setOtherCount(all.filter((game) => !!game.isForSale !== forSale).length);

        if (!forSale) {
          // "Minha lista" guardada no aparelho, com os dados atualizados (e
          // sem jogos que saíram do acervo)
          let stored: BoardgameType[] = [];
          try {
            stored = JSON.parse(localStorage.getItem(MY_LIST_KEY) || "[]");
          } catch {
            stored = [];
          }
          saveList(
            stored.flatMap((saved) => {
              const game = all.find((item) => !item.isForSale && sameGame(item, saved));
              return game ? [game] : [];
            }),
          );
        }
      } catch (error) {
        addAlert(`Erro ao carregar jogos: ${error}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [forSale]);

  // Altura do cabeçalho aberto (o espaço que ele ocupa no topo da página),
  // medida sem transição e antes de pintar
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => {
      const current = header.dataset.compact ?? "false";
      header.classList.add("cm-no-transition");
      header.dataset.compact = "false";
      setSpacer(header.offsetHeight);
      header.dataset.compact = current;
      header.getBoundingClientRect();
      header.classList.remove("cm-no-transition");
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const words = useMemo(() => searchWords(filters.query), [filters.query]);
  const results = useMemo(() => filterGames(games, filters), [games, filters]);
  const types = useMemo(
    () =>
      Array.from(new Set(games.flatMap((game) => game.types))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [games],
  );
  const chips = activeFilterChips(filters);
  const chipsKey = chips.map((chip) => chip.key).join("|");

  // As etiquetas continuam na tela enquanto a linha recolhe
  const [shownChips, setShownChips] = useState(chips);
  useEffect(() => {
    if (chips.length) {
      setShownChips(chips);
      return;
    }
    const timer = window.setTimeout(() => setShownChips([]), 350);
    return () => window.clearTimeout(timer);
  }, [chipsKey]);

  // Mudou a busca ou um filtro com a página rolada: volta para o começo dos
  // resultados (a busca espera a pessoa parar de digitar)
  useEffect(() => {
    if (!filtersChanged.current) {
      filtersChanged.current = true;
      return;
    }
    const timer = window.setTimeout(
      () => {
        const resultsTop = resultsRef.current?.getBoundingClientRect().top;
        const headerHeight = headerRef.current?.offsetHeight ?? 0;
        if (resultsTop === undefined) return;
        const target = resultsTop + window.scrollY - headerHeight - 8;
        if (window.scrollY > target + 4) {
          window.scrollTo({
            top: Math.max(0, target),
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
        }
      },
      filters.query ? 300 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [filters]);

  const clearFilters = () => setFilters((current) => ({ ...EMPTY_FILTERS, query: current.query }));

  const isInList = (game: BoardgameType) => myList.some((item) => sameGame(item, game));

  /** A capa do jogo voa até o botão "Minha lista", que dá um pulinho. */
  const flyToList = (source: HTMLElement) => {
    const fab = fabRef.current;
    const image = source.querySelector("img");
    if (!fab || !image || prefersReducedMotion()) return;
    const from = source.getBoundingClientRect();
    const to = fab.getBoundingClientRect();
    const size = Math.min(from.width, from.height, 120);
    const endSize = 26;
    const chip = document.createElement("div");
    chip.setAttribute("aria-hidden", "true");
    Object.assign(chip.style, {
      position: "fixed",
      left: `${from.left + (from.width - size) / 2}px`,
      top: `${from.top + (from.height - size) / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "14px",
      backgroundImage: `url("${image.currentSrc || image.src}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      border: "1px solid rgba(230,197,107,0.7)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
      zIndex: "70",
      pointerEvents: "none",
    });
    document.body.appendChild(chip);
    gsap
      .timeline({
        onComplete: () => {
          chip.remove();
          fab.animate(
            [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
            { duration: 380, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
          );
        },
      })
      // Sobe um pouco e cai no botão, em arco, encolhendo
      .to(chip, { left: to.left + to.width / 2 - endSize / 2, duration: 0.75, ease: "power1.inOut" }, 0)
      .to(chip, { top: to.top + to.height / 2 - endSize / 2, duration: 0.75, ease: "back.in(1.6)" }, 0)
      .to(chip, { width: endSize, height: endSize, borderRadius: "50%", duration: 0.75, ease: "power2.in" }, 0)
      .to(chip, { opacity: 0, duration: 0.18 }, 0.6);
  };

  const toggleList = (game: BoardgameType, source?: HTMLElement | null) => {
    if (isInList(game)) {
      saveList(myList.filter((item) => !sameGame(item, game)));
      return;
    }
    saveList([...myList, game]);
    if (source) flyToList(source);
  };

  const openDetail = (game: BoardgameType, origin: HTMLElement | null) =>
    setDetail({ game, origin });

  const searching = words.length > 0 || chips.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }

        @keyframes shimmer-gold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s linear infinite;
        }
        .hex-bg-coll {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="relative flex flex-col items-center w-full min-h-screen text-primary-gold px-4 sm:px-8 pb-28">
        {/* Background effects */}
        <div className="hex-bg-coll fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Cabeçalho fixo: título (encolhe ao rolar), busca, filtros e visão */}
        <div
          ref={headerRef}
          data-compact={compact}
          className="cm-header fixed top-0 left-0 w-full z-50 flex flex-col bg-primary-black/95 backdrop-blur-[10px] pb-1 border-b border-primary-gold/10"
        >
          {/* Decoração do tema ativo (Configurações → Temas) */}
          <ThemeBand variant="header" />
          <section className="cm-heading flex flex-col items-center px-4">
            <h1 className="cm-title font-cinzel text-xl sm:text-3xl text-center text-shimmer-gold tracking-widest uppercase leading-tight">
              {copy.title}
            </h1>
            <div className="cm-brand w-full max-w-xs">
              <div>
                <div className="flex items-center gap-2 w-full pt-1.5">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
                  <Star />
                  <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-primary-gold/50 whitespace-nowrap">
                    Carcassonne Pub
                  </span>
                  <Star />
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 w-full max-w-3xl mx-auto px-4 pb-2">
            <label className="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-xl bg-secondary-black/80 border border-primary-gold/20 focus-within:border-primary-gold/60 transition-colors">
              <LuSearch size={16} className="text-primary-gold/55 shrink-0" />
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="Buscar jogo"
                placeholder="Buscar jogo ou categoria..."
                value={filters.query}
                onChange={(event) => {
                  const query = event.target.value;
                  setFilters((current) => ({ ...current, query }));
                }}
                // Enter fecha o teclado do celular para ver os resultados
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                // 16px: abaixo disso o iPhone dá zoom ao focar o campo
                className="flex-1 min-w-0 bg-transparent outline-none text-base text-primary-gold placeholder:text-primary-gold/35"
              />
              {filters.query && (
                <button
                  type="button"
                  aria-label="Limpar a busca"
                  onClick={() => setFilters((current) => ({ ...current, query: "" }))}
                  className="text-primary-gold/50 hover:text-primary-gold transition-colors cursor-pointer"
                >
                  <LuX size={15} />
                </button>
              )}
            </label>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label={chips.length ? `Filtros (${chips.length} ativos)` : "Filtros"}
              className={`relative flex items-center gap-2 h-10 px-3 shrink-0 rounded-xl border transition-colors cursor-pointer ${
                chips.length
                  ? "border-primary-gold/60 bg-primary-gold/10 text-primary-gold"
                  : "border-primary-gold/20 bg-secondary-black/80 text-primary-gold/75 hover:border-primary-gold/45 hover:text-primary-gold"
              }`}
            >
              <LuSlidersHorizontal size={16} />
              <span className="hidden sm:inline text-sm">Filtros</span>
              {chips.length > 0 && (
                <span
                  key={chips.length}
                  className="gc-count absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-gold text-primary-black text-[10px] font-bold"
                >
                  {chips.length}
                </span>
              )}
            </button>

            {/* Grade ou lista: a pílula dourada desliza para a escolhida */}
            <div
              role="radiogroup"
              aria-label="Visualização"
              className="relative flex h-10 p-1 shrink-0 rounded-xl border border-primary-gold/20 bg-secondary-black/80"
            >
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-1 w-8 rounded-lg border border-primary-gold/50 bg-primary-gold/15 transition-transform duration-300 ease-out"
                style={{ transform: view === "list" ? "translateX(2rem)" : "none" }}
              />
              {(
                [
                  { value: "grid", label: "Grade", Icon: LuLayoutGrid },
                  { value: "list", label: "Lista", Icon: LuList },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={view === value}
                  aria-label={label}
                  title={label}
                  onClick={() => changeView(value)}
                  className={`relative z-[1] flex items-center justify-center w-8 transition-colors cursor-pointer ${
                    view === value ? "text-primary-gold" : "text-primary-gold/45 hover:text-primary-gold/80"
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Linha dourada que enche conforme a pessoa rola */}
          <div className="relative h-px w-full mt-1">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
            <div ref={progressRef} className="cm-progress" />
          </div>
        </div>

        {/* Espaço reservado para o cabeçalho fixo */}
        <div className="w-full shrink-0" style={{ height: spacer }} />

        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Filtros ativos: tocar tira o filtro */}
          <div className="gc-collapse w-full max-w-6xl" data-open={chips.length > 0}>
            <div>
              <div className="flex flex-wrap items-center gap-2 pt-4">
                {shownChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilters(chip.clear)}
                    aria-label={`Tirar o filtro ${chip.label}`}
                    className="gc-chip-in flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full border border-primary-gold/40 bg-primary-gold/10 text-xs text-primary-gold hover:bg-primary-gold/20 transition-colors cursor-pointer"
                  >
                    {chip.label}
                    <LuX size={12} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-8 px-2 text-xs text-primary-gold/55 hover:text-primary-gold underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  Limpar tudo
                </button>
              </div>
            </div>
          </div>

          {/* Quantos jogos e o atalho para a outra vitrine */}
          <div
            ref={resultsRef}
            className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 w-full max-w-6xl pt-5 pb-5"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-primary-gold/50">{copy.tagline}</span>
              <span className="text-sm text-primary-gold/85">
                {loading ? (
                  "Carregando jogos..."
                ) : (
                  <>
                    <Counter targetValue={results.length} />{" "}
                    {results.length === 1 ? "jogo" : "jogos"}
                    {searching ? (results.length === 1 ? " encontrado" : " encontrados") : forSale ? " à venda" : " no acervo"}
                  </>
                )}
              </span>
            </div>
            {otherCount > 0 && (
              <Link
                href={copy.otherHref}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary-gold/20 hover:border-primary-gold/45 text-xs text-primary-gold/65 hover:text-primary-gold transition-colors"
              >
                {forSale
                  ? "Ver os jogos para jogar aqui"
                  : `${otherCount} ${otherCount === 1 ? "jogo" : "jogos"} à venda`}
                <LuArrowRight
                  size={13}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>

          {loading ? (
            <CollectionSkeleton view={view} />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <img
                src="/images/mascote-triste.png"
                alt=""
                className="w-28 h-28 object-contain opacity-90"
              />
              <span className="text-base font-semibold text-primary-gold/90">
                {games.length ? "Nenhum jogo com esses filtros" : "Nenhum jogo por aqui ainda"}
              </span>
              {games.length > 0 && (
                <>
                  <span className="text-xs text-primary-gold/55 max-w-xs">
                    Tente tirar algum filtro ou buscar por outro nome.
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="mt-1 h-9 px-4 rounded-full border border-primary-gold/40 text-sm text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer"
                  >
                    Limpar busca e filtros
                  </button>
                </>
              )}
            </div>
          ) : (
            // A key refaz a entrada dos cards ao trocar entre grade e lista
            <div
              key={view}
              className={
                view === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 w-full max-w-6xl"
                  : "flex flex-col gap-2 w-full max-w-2xl"
              }
            >
              {results.map((game, index) => (
                <GameCard
                  key={gameAnchor(game)}
                  game={game}
                  view={view}
                  index={index}
                  words={words}
                  forSale={forSale}
                  inList={!forSale && isInList(game)}
                  onOpen={openDetail}
                  onToggleList={forSale ? undefined : toggleList}
                />
              ))}
            </div>
          )}
        </div>

        {/* "Minha lista": aparece quando entra o primeiro jogo */}
        {!forSale && (
          <button
            ref={fabRef}
            type="button"
            data-empty={myList.length === 0}
            aria-hidden={myList.length === 0}
            tabIndex={myList.length ? 0 : -1}
            onClick={() => setListOpen(true)}
            aria-label={`Minha lista: ${myList.length} ${myList.length === 1 ? "jogo" : "jogos"}`}
            className="gc-fab fixed floating-bottom left-3 z-20 flex items-center gap-2 h-12 pl-3.5 pr-2.5 rounded-xl bg-dark-black/85 backdrop-blur-[4px] border border-primary-gold/35 hover:border-primary-gold/60 text-primary-gold shadow-card cursor-pointer"
          >
            <LuListChecks size={18} />
            <span className="text-sm font-medium">Minha lista</span>
            <span
              key={myList.length}
              className="gc-count flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary-gold text-primary-black text-[11px] font-bold"
            >
              {myList.length}
            </span>
          </button>
        )}

        {filtersOpen && (
          <FiltersSheet
            filters={filters}
            onChange={setFilters}
            types={types}
            resultCount={results.length}
            onClosed={() => setFiltersOpen(false)}
          />
        )}

        {listOpen && (
          <MyListSheet
            games={myList}
            onOpen={openDetail}
            onRemove={(game) => toggleList(game)}
            onClear={() => saveList([])}
            onClosed={() => setListOpen(false)}
          />
        )}

        {/* Detalhe do jogo (por cima da lista, se ela estiver aberta) */}
        {detail && (
          <GameDetail
            key={gameAnchor(detail.game)}
            game={detail.game}
            origin={detail.origin}
            forSale={forSale}
            inList={isInList(detail.game)}
            onToggleList={forSale ? undefined : () => toggleList(detail.game)}
            onClosed={() => setDetail(null)}
          />
        )}

        <ScrollUp />
      </div>
    </>
  );
}
