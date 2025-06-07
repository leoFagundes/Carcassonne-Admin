"use client";

import { BoardgameType } from "@/types";
import React, { useEffect, useState } from "react";
import { LuDices, LuLink } from "react-icons/lu";
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
    new Set(boardgames.flatMap((b) => b.types))
  ).sort();

  return (
    <section className="flex flex-col gap-8 w-full h-full px-3 overflow-y-scroll">
      {loading && <LoaderFullscreen />}
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold ">
        <LuDices size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold text-center">
          Coleção de jogos
        </h2>{" "}
        <Tooltip direction="bottom" content="Ir para visão do cliente">
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuLink
              onClick={() => router.push("/clientCollection")}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
        <Tooltip
          direction="bottom"
          content="Ir para visão do cliente (Jogos à venda)"
        >
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuLink
              onClick={() => router.push("/clientCollection/forSale")}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
      </section>

      {/* Input de busca */}
      <section className="flex items-center flex-wrap justify-center gap-4 ">
        <div className="flex justify-center gap-4 flex-wrap max-w-[300px]">
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            setValue={(e) => setSearchTerm(e.target.value)}
            variant
          />
          <Dropdown
            value={filterType}
            setValue={(e) => setFilterType(e.target.value)}
            options={boardgameTypes}
            firstLabel="Todos os tipos"
            variant
          />
          <Dropdown
            value={filterDifficulty}
            setValue={(e) => setFilterDifficulty(e.target.value)}
            options={difficultiesOptions}
            firstLabel="Todos as Dificuldades"
            variant
          />
        </div>
        <div className="flex justify-center gap-4 flex-wrap max-w-[300px]">
          <Checkbox
            checked={showOnlyFocus}
            setChecked={(e) => setShowOnlyFocus(e.target.checked)}
            label="Jogos em destaque"
            variant
          />
          <Checkbox
            checked={showOnlyInvisible}
            setChecked={(e) => setShowOnlyInvisible(e.target.checked)}
            label="Mostrar apenas invisíveis"
            variant
          />
          <Checkbox
            checked={showOnlyIsForSale}
            setChecked={(e) => setShowOnlyIsForSale(e.target.checked)}
            label="Mostrar apenas jogos à venda"
            variant
          />
        </div>
      </section>
      {/* Lista de jogos */}
      <section className="flex justify-center flex-wrap gap-x-6 gap-y-8 px-1 pt-2 pb-4">
        {filteredBoardgames.length > 0 && !isModalOpen ? (
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
          <p className="text-primary-gold text-xl text-center">
            Nenhum jogo encontrado.
          </p>
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
