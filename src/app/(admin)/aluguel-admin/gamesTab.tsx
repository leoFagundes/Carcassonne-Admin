"use client";

import { useEffect, useMemo, useState } from "react";
import { LuChevronRight, LuEye, LuEyeOff, LuPackage, LuPencil, LuPlus } from "react-icons/lu";
import type { RentalGameType, RentalType } from "@/types";
import Modal from "@/components/modal";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { Highlight, foldText, searchWords } from "@/components/showcase/search";
import {
  CatalogBadge,
  CatalogEmpty,
  CatalogItems,
  CatalogSearch,
  CatalogSkeleton,
  FilterPills,
  QuickToggle,
  ViewToggle,
  useCatalogView,
} from "@/components/adminCatalog";
import { useAlert } from "@/contexts/alertProvider";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import RentalRepository from "@/services/repositories/RentalRepository";
import { isCheckPending, returnDayOf } from "@/rental/returns";
import { gameAvailability } from "@/rental/availability";
import { withLiveBookings } from "@/rental/payments";
import { formatBRL } from "@/rental/money";
import { formatDateBR, todaySP } from "@/rental/dates";
import RentalGameForm, { emptyRentalGame } from "./rentalGameForm";
import { unitStatus } from "./unitsEditor";
import { BOARDGAME_PLACEHOLDER } from "@/utils/menuIllustrations";

type Status = "all" | "active" | "inactive" | "soldout";

const PLACEHOLDER = BOARDGAME_PLACEHOLDER;

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-primary-gold/15 bg-secondary-black/50 py-2.5">
      <span className="text-xl font-semibold text-primary-gold">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-primary-gold/50">{label}</span>
    </div>
  );
}

export default function GamesTab() {
  const [games, setGames] = useState<RentalGameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [editing, setEditing] = useState<RentalGameType | null>(null);
  // Devolvidos e ainda sem conferir: a cópia aparece como "Para conferir" no formulário
  const [toCheck, setToCheck] = useState<RentalType[]>([]);
  useEffect(() => RentalRepository.subscribeToAll((list) => setToCheck(list.filter(isCheckPending))), []);
  const [view, setView] = useCatalogView("carcassonne-admin-rental-games-view");
  const { addAlert } = useAlert();
  const today = todaySP();

  useEffect(() => {
    const unsub = RentalGameRepository.subscribeToAll((list) => {
      setGames(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Atalho da página Adicionar (?tab=jogos&createjogo=true): já abre o formulário.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("createjogo") !== "true") return;
    setEditing(emptyRentalGame);
    params.delete("createjogo");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, []);

  /** Liga/desliga na hora; se o banco recusar, volta como estava. */
  const toggleActive = async (game: RentalGameType) => {
    if (!game.id) return;
    const next = !game.isActive;
    const replace = (item: RentalGameType) =>
      setGames((list) => list.map((g) => (g.id === game.id ? item : g)));
    replace({ ...game, isActive: next });
    const ok = await RentalGameRepository.update(game.id, { isActive: next });
    if (!ok) {
      replace(game);
      addAlert(`Não foi possível atualizar ${game.name}. Tente novamente.`);
      return;
    }
    addAlert(`${game.name} ${next ? "está ativo para aluguel" : "foi desativado"}`);
  };

  const isSoldOut = (game: RentalGameType) => gameAvailability(withLiveBookings(game, Date.now()), today).state !== "available";

  const words = useMemo(() => searchWords(search), [search]);

  const searched = useMemo(
    () =>
      games.filter((game) => {
        if (!words.length) return true;
        const text = foldText(`${game.name} ${game.description} ${game.types.join(" ")}`);
        return words.every((word) => text.includes(word));
      }),
    [games, words],
  );

  const matches = (game: RentalGameType, value: Status) =>
    value === "all" ||
    (value === "active" && game.isActive) ||
    (value === "inactive" && !game.isActive) ||
    (value === "soldout" && isSoldOut(game));

  const filtered = searched.filter((game) => matches(game, status));
  const count = (value: Status) => searched.filter((game) => matches(game, value)).length;

  // Sem memo: reservas temporárias vencem com o tempo, então usa o instante atual a cada render.
  const now = Date.now();
  const totals = (() => {
    const t = { total: 0, free: 0, rented: 0, unavailable: 0 };
    for (const game of games) {
      for (const unit of game.units) {
        t.total++;
        const s = unitStatus(withLiveBookings(game, now), unit, today);
        if (s === "free") t.free++;
        else if (s === "rented" || s === "overdue") t.rented++;
        else if (s === "unavailable") t.unavailable++;
      }
    }
    return t;
  })();

  const hasFilters = !!search || status !== "all";
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  const unitsLabel = (game: RentalGameType) => {
    const free = game.units.filter((u) => unitStatus(withLiveBookings(game, Date.now()), u, today) === "free").length;
    return `${free}/${game.units.length} livres`;
  };

  const renderCard = (game: RentalGameType) => {
    const inactive = !game.isActive;
    const soldOut = !inactive && isSoldOut(game);
    const toggle = (
      <QuickToggle
        active={game.isActive}
        icon={LuEyeOff}
        activeIcon={LuEye}
        label={game.isActive ? "Ativo — desativar" : "Inativo — ativar"}
        onToggle={() => toggleActive(game)}
      />
    );
    const badges = (
      <>
        {inactive && <CatalogBadge icon={LuEyeOff}>Inativo</CatalogBadge>}
        {soldOut && <CatalogBadge icon={LuPackage}>Esgotado</CatalogBadge>}
      </>
    );
    const details = (
      <span className="flex items-center gap-2.5 text-[11px] text-primary-gold/55">
        <span className="font-semibold text-primary-gold/80">{formatBRL(game.price)}</span>
        <span>prazo {game.rentalDays} {game.rentalDays === 1 ? "dia" : "dias"}</span>
        <span>{unitsLabel(game)}</span>
      </span>
    );
    const key = game.id ?? game.name;

    if (view === "list") {
      return (
        <article
          key={key}
          onClick={() => setEditing(game)}
          className={`group flex items-center gap-3 p-2 pr-3 rounded-xl border bg-secondary-black/50 cursor-pointer transition-colors hover:border-primary-gold/45 hover:bg-secondary-black/80 ${
            inactive ? "border-dashed border-primary-gold/20" : "border-primary-gold/15"
          }`}
        >
          <ShowcaseImage
            src={game.image}
            placeholder={PLACEHOLDER}
            className={`w-12 h-12 rounded-lg shrink-0 ${inactive ? "opacity-40 grayscale" : ""}`}
          />
          <div className={`flex flex-col gap-1 flex-1 min-w-0 ${inactive ? "opacity-60" : ""}`}>
            <span className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-primary-gold truncate">
                <Highlight text={game.name} words={words} />
              </span>
              {badges}
            </span>
            {details}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">{toggle}</div>
          <LuChevronRight size={16} className="text-primary-gold/30 group-hover:text-primary-gold/70 shrink-0" />
        </article>
      );
    }

    return (
      <article
        key={key}
        onClick={() => setEditing(game)}
        className={`group relative flex flex-col rounded-xl border bg-secondary-black/50 overflow-hidden cursor-pointer transition-colors hover:border-primary-gold/45 ${
          inactive ? "border-dashed border-primary-gold/20" : "border-primary-gold/15"
        }`}
      >
        <div className="relative">
          <ShowcaseImage
            src={game.image}
            placeholder={PLACEHOLDER}
            className={`w-full aspect-[4/3] ${inactive ? "opacity-40 grayscale" : ""}`}
          />
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">{badges}</div>
        </div>
        <div className={`flex flex-col gap-1.5 px-2.5 pt-2.5 flex-1 ${inactive ? "opacity-60" : ""}`}>
          <span className="text-sm font-semibold leading-snug line-clamp-2 text-primary-gold">
            <Highlight text={game.name} words={words} />
          </span>
          {details}
        </div>
        <div className="flex items-center gap-1.5 p-2.5">
          {toggle}
          <span className="ml-auto flex items-center gap-1 text-[10px] text-primary-gold/30 group-hover:text-primary-gold/70 transition-colors">
            <LuPencil size={11} /> Editar
          </span>
        </div>
      </article>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Total label="Unidades" value={totals.total} />
        <Total label="Livres" value={totals.free} />
        <Total label="Alugadas" value={totals.rented} />
        <Total label="Indisponíveis" value={totals.unavailable} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <CatalogSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome, descrição ou categoria"
          />
          <ViewToggle view={view} onChange={setView} />
          <button
            type="button"
            onClick={() => setEditing(emptyRentalGame)}
            aria-label="Novo jogo"
            className="flex items-center gap-1 shrink-0 h-10 text-xs px-3 rounded-xl bg-primary-gold text-primary-black font-semibold cursor-pointer"
          >
            {/* No celular só o ícone, para a busca não ficar espremida */}
            <LuPlus size={14} /> <span className="hidden sm:inline">Novo jogo</span>
          </button>
        </div>
        <FilterPills<Status>
          label="Situação"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Todos", count: count("all") },
            { value: "active", label: "Ativos", count: count("active") },
            { value: "inactive", label: "Inativos", count: count("inactive") },
            { value: "soldout", label: "Esgotados", count: count("soldout") },
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-3 min-h-6 px-1">
        <span className="text-xs text-primary-gold/50">
          {loading
            ? "Carregando jogos..."
            : `${filtered.length} de ${games.length} ${games.length === 1 ? "jogo" : "jogos"}`}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-primary-gold/55 hover:text-primary-gold underline-offset-4 hover:underline transition-colors cursor-pointer"
          >
            Limpar busca e filtros
          </button>
        )}
      </div>

      {loading ? (
        <CatalogSkeleton view={view} />
      ) : filtered.length === 0 ? (
        <CatalogEmpty
          icon={LuPackage}
          title={games.length ? "Nenhum jogo com essa busca e filtros." : "Nenhum jogo para aluguel ainda."}
          onClear={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <CatalogItems view={view}>{filtered.map(renderCard)}</CatalogItems>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} noPadding patternCloseButton={false}>
        {editing && (
          <RentalGameForm
            key={editing.id ?? "new"}
            game={editing}
            live={editing.id ? games.find((g) => g.id === editing.id) : undefined}
            closeForms={() => setEditing(null)}
            pendingCheck={
              new Map(
                toCheck
                  .filter((r) => r.gameId === editing.id)
                  .map((r) => {
                    const day = returnDayOf(r);
                    return [r.unitId, `Para conferir${day ? ` · devolvida ${formatDateBR(day)}` : ""}`] as const;
                  }),
              )
            }
          />
        )}
      </Modal>
    </div>
  );
}
