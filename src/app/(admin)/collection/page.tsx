"use client";

import { BoardgameType } from "@/types";
import React, { useEffect, useState } from "react";
import { LuDices, LuDollarSign, LuLink } from "react-icons/lu";
import Card from "./card";
import Input from "@/components/input";
import Modal from "@/components/modal";
import CollectionForms from "@/components/collectionForms";
import { useAlert } from "@/contexts/alertProvider";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { difficultiesOptions, patternBoardgame } from "@/utils/patternValues";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/Tooltip";
import Checkbox from "@/components/checkbox";
import Dropdown from "@/components/dropdown";

export default function CollectionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [showOnlyFocus, setShowOnlyFocus] = useState(false);
  const [showOnlyInvisible, setShowOnlyInvisible] = useState(false);
  const [showOnlyIsForSale, setShowOnlyIsForSale] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [boardgames, setBoardgames] = useState<BoardgameType[]>([]);
  const [currentItem, setCurrentItem] =
    useState<BoardgameType>(patternBoardgame);

  const { addAlert } = useAlert();
  const router = useRouter();

  useEffect(() => {
    const fetchBoardgames = async () => {
      setLoading(true);
      try {
        const fetchedBoardgames = await BoardgameRepository.getAll();
        setBoardgames(fetchedBoardgames);
      } catch (error) {
        addAlert(`Erro ao carregar jogos: ${error}`);
      } finally {
        setLoading(false);
      }
    };
    fetchBoardgames();
  }, [currentItem]);

  const filteredBoardgames = boardgames.filter((game) => {
    const matchesSearch =
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "" || game.types.includes(filterType);
    const matchesDifficulty =
      filterDifficulty === "" || game.difficulty.includes(filterDifficulty);
    const matchesFocus = showOnlyFocus ? game.featured : true;
    const matchesInvisible = showOnlyInvisible ? !game.isVisible : true;
    const matchesIsForSale = showOnlyIsForSale ? game.isForSale : true;
    return (
      matchesSearch &&
      matchesType &&
      matchesFocus &&
      matchesInvisible &&
      matchesIsForSale &&
      matchesDifficulty
    );
  });

  const boardgameTypes = Array.from(
    new Set(boardgames.flatMap((b) => b.types)),
  ).sort();

  return (
    <section className="flex flex-col gap-6 w-full h-full overflow-y-auto py-2 px-6">
      {loading && <LoaderFullscreen />}

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
                onClick={() => router.push("/clientCollection")}
                className="p-2 cursor-pointer rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                <LuLink size={14} />
              </button>
            </Tooltip>
            <Tooltip direction="bottom" content="Jogos à venda (cliente)">
              <button
                onClick={() => router.push("/clientCollection/forSale")}
                className="p-2 cursor-pointer rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                <LuDollarSign size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      {/* Filters */}
      <section className="flex flex-row flex-wrap justify-center items-center gap-4 w-fit mx-auto bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-6">
        <div className="flex flex-col gap-4 w-full sm:w-auto">
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            setValue={(e) => setSearchTerm(e.target.value)}
            variant
            width="!w-full sm:!w-[240px]"
          />
          <Dropdown
            value={filterType}
            setValue={(e) => setFilterType(e.target.value)}
            options={boardgameTypes}
            firstLabel="Tipo"
            variant
            width="!w-full sm:!w-[240px]"
          />
          <Dropdown
            value={filterDifficulty}
            setValue={(e) => setFilterDifficulty(e.target.value)}
            options={difficultiesOptions}
            firstLabel="Dificuldade"
            variant
            width="!w-full sm:!w-[240px]"
          />
        </div>

        <div className="hidden lg:block w-px h-full bg-primary-gold/20 shrink-0 mx-1" />

        <div className="flex flex-col gap-4 shrink-0 w-full sm:w-auto">
          <Checkbox
            checked={showOnlyFocus}
            setChecked={(e) => setShowOnlyFocus(e.target.checked)}
            label="Destaque"
            width="!w-full sm:!w-fit"
            variant
          />
          <Checkbox
            checked={showOnlyInvisible}
            setChecked={(e) => setShowOnlyInvisible(e.target.checked)}
            label="Invisíveis"
            width="!w-full sm:!w-fit"
            variant
          />
          <Checkbox
            checked={showOnlyIsForSale}
            setChecked={(e) => setShowOnlyIsForSale(e.target.checked)}
            label="À venda"
            width="!w-full sm:!w-fit"
            variant
          />
        </div>
      </section>

      {/* Cards */}
      <section className="flex justify-center flex-wrap gap-4">
        {filteredBoardgames.length > 0 ? (
          filteredBoardgames.map((boardgame, index) => (
            <Card
              key={index}
              boardgame={boardgame}
              searchTerm={searchTerm}
              boardgames={boardgames}
              setBoardgames={setBoardgames}
              onClick={() => {
                setIsModalOpen(true);
                setCurrentItem(boardgame);
              }}
            />
          ))
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-primary-gold/40">
            <LuDices size={32} />
            <p className="text-sm">Nenhum jogo encontrado.</p>
          </div>
        )}
      </section>

      {currentItem && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentItem(patternBoardgame);
          }}
        >
          <CollectionForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
            closeForms={() => {
              setIsModalOpen(false);
              setCurrentItem(patternBoardgame);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
