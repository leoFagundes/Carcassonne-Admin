"use client";

import "@/components/showcase/showcase.css";
import "@/app/(client)/clientCollection/collection.css";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { LuLayoutGrid, LuList, LuSearch, LuSlidersHorizontal, LuX } from "react-icons/lu";
import type { BoardgameType, RentalSettingsType } from "@/types";
import { auth } from "@/services/firebaseConfig";
import AdminRepository from "@/services/repositories/AdminRepository";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { gameAvailability } from "@/rental/availability";
import { withLiveBookings } from "@/rental/payments";
import { todaySP } from "@/rental/dates";
import ScrollUp from "@/components/scrollUp";
import ThemeBand from "@/components/siteTheme/ThemeBand";
import Counter from "@/components/mage-ui/text/counter";
import { useScrollReveal } from "@/components/showcase/useScrollReveal";
import { useShowcaseHeader } from "@/components/showcase/useShowcaseHeader";
import { searchWords } from "@/components/showcase/search";
import CollectionSkeleton from "@/app/(client)/clientCollection/collectionSkeleton";
import FiltersSheet from "@/app/(client)/clientCollection/filtersSheet";
import {
  CollectionView,
  EMPTY_FILTERS,
  GameFilters,
  VIEW_KEY,
  activeFilterChips,
  filterGames,
} from "@/app/(client)/clientCollection/collectionUtils";
import RentalGameCard, { type RentalGameWithId, rentalAnchor } from "./rentalGameCard";
import RentalGameDetail from "./rentalGameDetail";
import RentalHeader from "./rentalHeader";
import { useRentalCart } from "./useRentalCart";

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
 * Catálogo de jogos para alugar, no mesmo modelo da coleção: busca no
 * cabeçalho, filtros numa gaveta, grade ou lista e o detalhe com a capa
 * saindo do card — mais o selo de disponibilidade e o pedido.
 */
export default function RentalShowcase() {
  const [games, setGames] = useState<RentalGameWithId[] | null>(null);
  const [settings, setSettings] = useState<RentalSettingsType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [today, setToday] = useState(() => todaySP());
  const [rawFilters, setFilters] = useState<GameFilters>(EMPTY_FILTERS);
  // Aluguel não tem destaques: esse filtro nunca vale
  const filters = useMemo(() => ({ ...rawFilters, featured: false }), [rawFilters]);
  const [view, setView] = useState<CollectionView>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<{
    game: RentalGameWithId;
    origin: HTMLElement | null;
  } | null>(null);
  const [spacer, setSpacer] = useState(132);

  const headerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const cart = useRentalCart();
  const compact = useShowcaseHeader(progressRef);
  useScrollReveal();

  useEffect(() => RentalGameRepository.subscribeToAll(setGames), []);
  useEffect(() => RentalConfigRepository.subscribeSettings(setSettings), []);

  // Admin logado vê o catálogo mesmo com o serviço desativado
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) return setIsAdmin(false);
        try {
          setIsAdmin((await AdminRepository.getAccessStatus(user.uid)) === "admin");
        } catch {
          setIsAdmin(false);
        }
      }),
    [],
  );

  // "Hoje" é recalculado a cada minuto para os selos
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todaySP()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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

  const loading = games === null || settings === null;
  const disabled = settings?.isEnabled === false;
  const hidden = !loading && disabled && !isAdmin;

  // Altura do cabeçalho aberto, medida sem transição e antes de pintar
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

  const active = useMemo(() => (games ?? []).filter((game) => game.isActive), [games]);
  const words = useMemo(() => searchWords(filters.query), [filters.query]);
  const results = useMemo(
    () =>
      // Os filtros do acervo só leem campos que o jogo de aluguel também tem
      filterGames(active as unknown as BoardgameType[], filters) as unknown as RentalGameWithId[],
    [active, filters],
  );
  const types = useMemo(
    () =>
      Array.from(new Set(active.flatMap((game) => game.types))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [active],
  );
  const chips = activeFilterChips(filters);
  const chipsKey = chips.map((chip) => chip.key).join("|");
  const [shownChips, setShownChips] = useState(chips);
  useEffect(() => {
    if (chips.length) {
      setShownChips(chips);
      return;
    }
    const timer = window.setTimeout(() => setShownChips([]), 350);
    return () => window.clearTimeout(timer);
  }, [chipsKey]);

  const clearFilters = () => setFilters((current) => ({ ...EMPTY_FILTERS, query: current.query }));
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
        <div className="hex-bg-coll fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Cabeçalho fixo: título (encolhe ao rolar), atalhos, busca e visão */}
        <div
          ref={headerRef}
          data-compact={compact}
          className="cm-header fixed top-0 left-0 w-full z-50 flex flex-col bg-primary-black/95 backdrop-blur-[10px] pb-1 border-b border-primary-gold/10"
        >
          <ThemeBand variant="header" />
          <section className="cm-heading flex flex-col items-center px-4">
            <h1 className="cm-title font-cinzel text-xl sm:text-3xl text-center text-shimmer-gold tracking-widest uppercase leading-tight">
              Aluguel de Jogos
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

          <RentalHeader cartCount={cart.gameIds.length} />

          {!hidden && (
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
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
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
          )}

          <div className="relative h-px w-full mt-1">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
            <div ref={progressRef} className="cm-progress" />
          </div>
        </div>

        <div className="w-full shrink-0" style={{ height: spacer }} />

        <div className="relative z-10 flex flex-col items-center w-full">
          {hidden ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <img src="/images/mascote-triste.png" alt="" className="w-28 h-28 object-contain opacity-90" />
              <span className="text-base font-semibold text-primary-gold/90">
                Aluguel de jogos em breve
              </span>
              <span className="text-xs text-primary-gold/55 max-w-xs">
                Estamos preparando tudo para você levar um jogo para casa. Volte em breve!
              </span>
              <Link
                href="/clientCollection"
                className="mt-1 h-9 px-4 flex items-center rounded-full border border-primary-gold/40 text-sm text-primary-gold hover:bg-primary-gold/10 transition-colors"
              >
                Ver a coleção do pub
              </Link>
            </div>
          ) : (
            <>
              {!loading && disabled && (
                <div className="w-full max-w-6xl mt-4 px-3 py-2 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200">
                  Serviço desativado — só você está vendo
                </div>
              )}

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

              <div className="flex flex-col gap-0.5 w-full max-w-6xl pt-5 pb-5">
                <span className="text-xs text-primary-gold/50">
                  Leve um jogo para casa e jogue com quem você quiser!
                </span>
                <span className="text-sm text-primary-gold/85">
                  {loading ? (
                    "Carregando jogos..."
                  ) : (
                    <>
                      <Counter targetValue={results.length} />{" "}
                      {results.length === 1 ? "jogo" : "jogos"}
                      {searching
                        ? results.length === 1
                          ? " encontrado"
                          : " encontrados"
                        : " para alugar"}
                    </>
                  )}
                </span>
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
                    {active.length ? "Nenhum jogo com esses filtros" : "Nenhum jogo por aqui ainda"}
                  </span>
                  {active.length > 0 && (
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
                <div
                  key={view}
                  className={
                    view === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6 w-full max-w-6xl"
                      : "flex flex-col gap-2 w-full max-w-2xl"
                  }
                >
                  {results.map((game) => (
                    <RentalGameCard
                      key={rentalAnchor(game)}
                      game={game}
                      view={view}
                      words={words}
                      availability={gameAvailability(withLiveBookings(game, Date.now()), today)}
                      onOpen={(item, origin) => setDetail({ game: item, origin })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {filtersOpen && (
          <FiltersSheet
            filters={filters}
            onChange={setFilters}
            types={types}
            resultCount={results.length}
            hideFeatured
            onClosed={() => setFiltersOpen(false)}
          />
        )}

        {detail && (
          <RentalGameDetail
            key={detail.game.id}
            // Sempre a versão mais recente do jogo (as reservas mudam ao vivo)
            game={active.find((game) => game.id === detail.game.id) ?? detail.game}
            origin={detail.origin}
            availability={gameAvailability(
              withLiveBookings(
                active.find((game) => game.id === detail.game.id) ?? detail.game,
                Date.now(),
              ),
              today,
            )}
            inCart={cart.has(detail.game.id)}
            onAdd={() => cart.add(detail.game.id)}
            onClosed={() => setDetail(null)}
          />
        )}

        <ScrollUp />
      </div>
    </>
  );
}
