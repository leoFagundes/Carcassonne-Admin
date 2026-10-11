"use client";

import { BoardgameType } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { LuDices, LuDollarSign, LuEyeOff, LuLink, LuSparkles, LuTag } from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import CollectionForms from "@/components/collectionForms";
import { useAlert } from "@/contexts/alertProvider";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { difficultiesOptions, patternBoardgame } from "@/utils/patternValues";
import Tooltip from "@/components/Tooltip";
import { foldText, searchWords } from "@/components/showcase/search";
import {
  CatalogEmpty,
  CatalogItems,
  CatalogSearch,
  CatalogSkeleton,
  FilterPills,
  ViewToggle,
  useCatalogView,
} from "@/components/adminCatalog";

type Status = "all" | "hidden" | "featured" | "forSale";

export default function CollectionPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [boardgames, setBoardgames] = useState<BoardgameType[]>([]);
  const [currentItem, setCurrentItem] = useState<BoardgameType>(patternBoardgame);
  const [view, setView] = useCatalogView("carcassonne-admin-collection-view");

  const { addAlert } = useAlert();

  const fetchBoardgames = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setBoardgames(await BoardgameRepository.getAll());
    } catch (error) {
      addAlert(`Erro ao carregar jogos: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardgames(true);
  }, []);

  /** Fecha a edição e atualiza a lista (pode ter salvo ou excluído). */
  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentItem(patternBoardgame);
    fetchBoardgames();
  };

  /** Liga/desliga na hora; se o banco recusar, volta como estava. */
  const updateGame = async (game: BoardgameType, patch: Partial<BoardgameType>) => {
    if (!game.id) {
      addAlert("ID inválido");
      return;
    }
    const updated = { ...game, ...patch };
    const replace = (next: BoardgameType) =>
      setBoardgames((list) => list.map((item) => (item.id === game.id ? next : item)));
    replace(updated);
    const ok = await BoardgameRepository.update(game.id, patch);
    if (!ok) {
      replace(game);
      addAlert(`Não foi possível atualizar ${game.name}. Tente novamente.`);
      return;
    }
    if ("isVisible" in patch) {
      addAlert(`${game.name} ${updated.isVisible ? "está visível no site" : "foi ocultado do site"}`);
    } else if ("featured" in patch) {
      addAlert(`${game.name} ${updated.featured ? "agora está em destaque" : "não está mais em destaque"}`);
    }
  };

  const words = useMemo(() => searchWords(search), [search]);

  // Busca (nome, descrição e categorias, sem acento) + tipo + dificuldade:
  // a base das contagens de cada situação
  const searched = useMemo(
    () =>
      boardgames.filter((game) => {
        if (filterType && !game.types.includes(filterType)) return false;
        if (filterDifficulty && game.difficulty !== filterDifficulty) return false;
        if (!words.length) return true;
        const text = foldText(`${game.name} ${game.description} ${game.types.join(" ")}`);
        return words.every((word) => text.includes(word));
      }),
    [boardgames, filterType, filterDifficulty, words],
  );

  const matchesStatus = (game: BoardgameType, value: Status) =>
    value === "all" ||
    (value === "hidden" && !game.isVisible) ||
    (value === "featured" && game.featured) ||
    (value === "forSale" && game.isForSale);

  const filteredBoardgames = useMemo(
    () =>
      searched
        .filter((game) => matchesStatus(game, status))
        .sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "pt-BR"),
        ),
    [searched, status],
  );

  const boardgameTypes = useMemo(
    () =>
      Array.from(new Set(boardgames.flatMap((game) => game.types))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [boardgames],
  );

  const countBy = (predicate: (game: BoardgameType) => boolean) =>
    boardgames.filter(predicate).length;

  const hasFilters = !!search || status !== "all" || !!filterType || !!filterDifficulty;
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setFilterType("");
    setFilterDifficulty("");
  };

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto py-2 px-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <LuDices size={32} className="text-primary-gold/70 shrink-0" />
            <h1 className="text-3xl font-semibold text-primary-gold">
              Coleção de Jogos
            </h1>
            <span className="text-xs text-primary-gold/35 mt-0.5">
              ({filteredBoardgames.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip direction="bottom" content="Visão do cliente">
              <button
                onClick={() =>
                  window.open("/clientCollection", "_blank", "noopener,noreferrer")
                }
                className="p-2 cursor-pointer rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                <LuLink size={14} />
              </button>
            </Tooltip>
            <Tooltip direction="bottom" content="Jogos à venda (cliente)">
              <button
                onClick={() =>
                  window.open(
                    "/clientCollection/forSale",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="p-2 cursor-pointer rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                <LuDollarSign size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
        {/* Busca e filtros */}
        <div className="flex flex-col gap-3 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <CatalogSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, descrição ou categoria"
            />
            <ViewToggle view={view} onChange={setView} />
          </div>
          <FilterPills<Status>
            label="Situação"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Todos", count: boardgames.length },
              {
                value: "hidden",
                label: "Ocultos",
                icon: LuEyeOff,
                count: countBy((game) => !game.isVisible),
              },
              {
                value: "featured",
                label: "Destaques",
                icon: LuSparkles,
                count: countBy((game) => game.featured),
              },
              {
                value: "forSale",
                label: "À venda",
                icon: LuTag,
                count: countBy((game) => game.isForSale),
              },
            ]}
          />
          {boardgameTypes.length > 0 && (
            <FilterPills
              label="Categoria"
              scroll
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: "", label: "Todas" },
                ...boardgameTypes.map((type) => ({
                  value: type,
                  label: type,
                  count: countBy((game) => game.types.includes(type)),
                })),
              ]}
            />
          )}
          <FilterPills
            label="Dificuldade"
            value={filterDifficulty}
            onChange={setFilterDifficulty}
            options={[
              { value: "", label: "Todas" },
              ...difficultiesOptions.map((difficulty) => ({
                value: difficulty,
                label: difficulty,
                count: countBy((game) => game.difficulty === difficulty),
              })),
            ]}
          />
        </div>

        {/* Resultado */}
        <div className="flex items-center justify-between gap-3 min-h-6 px-1">
          <span className="text-xs text-primary-gold/50">
            {loading
              ? "Carregando jogos..."
              : `${filteredBoardgames.length} de ${boardgames.length} ${
                  boardgames.length === 1 ? "jogo" : "jogos"
                }`}
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
        ) : filteredBoardgames.length === 0 ? (
          <CatalogEmpty
            icon={LuDices}
            title={boardgames.length ? "Nenhum jogo com essa busca e filtros." : "Nenhum jogo cadastrado ainda."}
            onClear={hasFilters ? clearFilters : undefined}
          />
        ) : (
          <CatalogItems view={view}>
            {filteredBoardgames.map((game) => (
              <Card
                key={game.id ?? game.name}
                game={game}
                view={view}
                words={words}
                onEdit={() => {
                  setCurrentItem(game);
                  setIsModalOpen(true);
                }}
                onUpdate={(patch) => updateGame(game, patch)}
              />
            ))}
          </CatalogItems>
        )}
      </div>

      {currentItem && (
        <Modal isOpen={isModalOpen} onClose={closeModal} noPadding patternCloseButton={false}>
          <CollectionForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
            closeForms={closeModal}
          />
        </Modal>
      )}
    </section>
  );
}
