"use client";

import Checkbox from "@/components/checkbox";
import Dropdown from "@/components/dropdown";
import Input from "@/components/input";
import { BoardgameType } from "@/types";
import React, { useEffect, useState } from "react";
import { LuClock, LuDices, LuUsers, LuX } from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import {
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiLayers,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import Button from "@/components/button";
import ScrollUp from "@/components/scrollUp";
import { motion, AnimatePresence } from "framer-motion";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { difficultiesOptions } from "@/utils/patternValues";
import Counter from "@/components/mage-ui/text/counter";

export default function ClientCollectionPage() {
  const [filterBoardgameName, setFilterBoardgameName] = useState("");
  const [filterBoardgameQuantityPlayers, setFilterBoardgameQuantityPlayers] =
    useState<number | undefined>();
  const [filterBoardgamePlayTime, setFilterBoardgamePlayTime] = useState<
    number | undefined
  >();
  const [filterBoardgameDifficulty, setFilterBoardgameDifficulty] =
    useState("");
  const [filterBoardgameType, setFilterBoardgameType] = useState("");
  const [isListView, setIsListView] = useState(false);
  const [filterJustForTow, setFilterJustForTwo] = useState(false);
  const [filterGameFeatured, setFilterGameFeatured] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGame, setCurrentGame] = useState<BoardgameType | undefined>();
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [boardgames, setBoardgames] = useState<BoardgameType[]>([]);
  const [loading, setLoading] = useState(false);

  const { addAlert } = useAlert();

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
  }, []);

  const boardgameTypes = Array.from(
    new Set(boardgames.flatMap((b) => b.types))
  ).sort();

  const filteredBoardgames = boardgames
    .filter((boardgame) => {
      if (!boardgame.isVisible) return false;

      const matchesName =
        filterBoardgameName === "" ||
        boardgame.name
          .toLowerCase()
          .includes(filterBoardgameName.toLowerCase());

      const matchesQuantityPlayers =
        filterBoardgameQuantityPlayers === undefined ||
        (boardgame.maxPlayers >= filterBoardgameQuantityPlayers &&
          boardgame.minPlayers <= filterBoardgameQuantityPlayers);

      const matchesPlayTime =
        filterBoardgamePlayTime === undefined ||
        boardgame.playTime <= filterBoardgamePlayTime;

      const matchesDifficulty =
        filterBoardgameDifficulty === "" ||
        boardgame.difficulty === filterBoardgameDifficulty;

      const matchesType =
        filterBoardgameType === "" ||
        boardgame.types.includes(filterBoardgameType);

      const matchesFeatured = !filterGameFeatured || boardgame.featured;

      const matchesFowTwo =
        !filterJustForTow ||
        (boardgame.minPlayers === 2 && boardgame.maxPlayers === 2);

      return (
        matchesName &&
        matchesQuantityPlayers &&
        matchesPlayTime &&
        matchesDifficulty &&
        matchesType &&
        matchesFeatured &&
        matchesFowTwo
      );
    })
    .sort((a, b) => {
      // Primeiro, destaque (featured)
      if (a.featured !== b.featured) {
        return b.featured ? 1 : -1;
      }
      // Depois, ordem alfabética
      return a.name.localeCompare(b.name);
    });

  function handleClearFilters() {
    setFilterBoardgameName("");
    setFilterBoardgameQuantityPlayers(undefined);
    setFilterBoardgamePlayTime(undefined);
    setFilterBoardgameDifficulty("");
    setFilterBoardgameType("");
    setIsListView(false);
    setFilterJustForTwo(false);
    setFilterGameFeatured(false);
  }

  function toggleScrollLock(lock: boolean) {
    if (lock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full h-screen text-primary-gold p-8">
      {loading && <LoaderFullscreen />}
      <section className="flex flex-col item center gap-1">
        <h1 className="text-4xl text-center">Coleção de Jogos</h1>
        <div className="flex items-center gap-2 justify-center text-center italic font-light w-full">
          <div className="h-[1px] flex-1 bg-primary-gold" />
          <span>Carcassonne Pub</span>
          <div className="h-[1px] flex-1 bg-primary-gold" />
        </div>
      </section>
      <div className="flex flex-col gap-2 items-center">
        <span className="text-center sm:text-lg text-sm">
          Encontre o jogo ideal para a sua mesa!
        </span>
        <button
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          className="flex items-center gap-1 text-sm border-b rounded px-2 py-1"
        >
          {isFilterVisible ? "Esconder Filtros" : "Mostrar Filtros"}
          <AnimatePresence mode="wait" initial={false}>
            {isFilterVisible ? (
              <motion.span
                key="up"
                initial={{ opacity: 1, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <FiChevronUp className="min-w-[16px]" size={"16px"} />
              </motion.span>
            ) : (
              <motion.span
                key="down"
                initial={{ opacity: 1, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 2 }}
                transition={{ duration: 0.2 }}
              >
                <FiChevronDown className="min-w-[16px]" size={"16px"} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
      <AnimatePresence>
        {isFilterVisible && (
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap justify-center gap-6"
          >
            <div className="flex flex-col gap-6">
              <Input
                value={filterBoardgameName}
                setValue={(e) => setFilterBoardgameName(e.target.value)}
                placeholder="Nome do Jogo"
                label="Nome do Jogo"
                variant
                icon={<LuDices size={"20px"} className="min-w-[20px]" />}
                width="!w-[250px]"
              />
              <Input
                value={
                  filterBoardgameQuantityPlayers !== undefined
                    ? filterBoardgameQuantityPlayers.toString()
                    : ""
                }
                setValue={(e) => {
                  if (e.target.value === "") {
                    setFilterBoardgameQuantityPlayers(undefined);
                  } else {
                    setFilterBoardgameQuantityPlayers(parseInt(e.target.value));
                  }
                }}
                label="Até quantos jogadores?"
                placeholder="Até quantos jogadores?"
                variant
                type="number"
                icon={<LuUsers size={"20px"} className="min-w-[20px]" />}
                width="!w-[250px]"
              />
              <Input
                value={
                  filterBoardgamePlayTime !== undefined
                    ? filterBoardgamePlayTime.toString()
                    : ""
                }
                setValue={(e) => {
                  if (e.target.value === "") {
                    setFilterBoardgamePlayTime(undefined);
                  } else {
                    setFilterBoardgamePlayTime(parseInt(e.target.value));
                  }
                }}
                label="Até quantos minutos?"
                placeholder="Até quantos minutos?"
                variant
                type="number"
                icon={<LuClock size={"20px"} className="min-w-[20px]" />}
                width="!w-[250px]"
              />
              <Dropdown
                firstLabel="Dificuldade do Jogo"
                value={filterBoardgameDifficulty}
                setValue={(e) => setFilterBoardgameDifficulty(e.target.value)}
                options={difficultiesOptions}
                variant
                label="Dificuldade"
                width="!w-[250px]"
              />
            </div>
            <div className="flex flex-col gap-6">
              <Dropdown
                firstLabel="Tipo"
                value={filterBoardgameType}
                setValue={(e) => setFilterBoardgameType(e.target.value)}
                options={boardgameTypes}
                variant
                label="Tipo"
                width="!w-[250px]"
              />
              <div className="flex flex-col gap-2 -mt-2">
                <Checkbox
                  checked={filterGameFeatured}
                  setChecked={(e) => setFilterGameFeatured(e.target.checked)}
                  label="Visualizar jogos destaque"
                />
                <Checkbox
                  checked={filterJustForTow}
                  setChecked={(e) => setFilterJustForTwo(e.target.checked)}
                  label="Apenas jogos para dois"
                />
                <Checkbox
                  checked={isListView}
                  setChecked={(e) => setIsListView(e.target.checked)}
                  label="Visualizar em lista?"
                />
                <div className="flex w-full justify-center mt-2">
                  <span
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 italic py-2 px-4 shadow-card text-xs cursor-pointer sm:hover:scale-[98%] border text-primary-gold/60 border-primary-gold/60 w-fit rounded-lg"
                  >
                    <LuX size={"16px"} className="min-w-[16px]" /> Limpar
                    filtros
                  </span>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="flex flex-col items-center w-full">
        <div className="flex items-center gap-2 justify-center text-center italic font-light w-full">
          <div className="h-[1px] flex-1 bg-primary-gold max-w-[30px]" />
          <span className="text-center">
            <Counter targetValue={filteredBoardgames.length} />{" "}
            {filteredBoardgames.length === 1
              ? "jogo encontrado"
              : "jogos encontrados"}
          </span>
          <div className="h-[1px] flex-1 bg-primary-gold max-w-[30px]" />
        </div>

        <div
          className={`flex ${
            isListView
              ? "flex-col items-center gap-1 py-4"
              : "justify-center flex-wrap gap-10 py-6"
          }  w-full `}
        >
          {filteredBoardgames.map((boardgame, index) => (
            <Card
              key={index}
              boardgame={boardgame}
              isListView={isListView}
              onClick={() => {
                setIsModalOpen(true);
                setCurrentGame(boardgame);
                toggleScrollLock(true);
              }}
            />
          ))}
        </div>
      </section>
      {currentGame && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentGame(undefined);
            toggleScrollLock(false);
          }}
          isFixed
        >
          <div className="flex flex-col items-center gap-4 my-2 max-w-[500px] w-full h-full px-2 overflow-y-scroll">
            <h2 className="text-2xl">{currentGame.name}</h2>
            <img
              className="rounded shadow-card w-[200px]"
              src={
                currentGame.image
                  ? currentGame.image
                  : "images/patternBoardgameImage.png"
              }
              alt="boardgame"
            />
            <p className="text-sm whitespace-pre-line">
              {currentGame.description}
            </p>

            <div className="w-full flex flex-col justify-between gap-2 flex-wrap">
              <span className="flex items-center gap-2 text-sm">
                <FiUsers size={"16px"} className="min-w-[16px]" />
                {currentGame.minPlayers === currentGame.maxPlayers
                  ? currentGame.maxPlayers
                  : `${currentGame.minPlayers} - ${currentGame.maxPlayers}`}{" "}
                Jogadores
              </span>

              <span className="flex items-center gap-2 text-sm">
                <FiClock size={"16px"} className="min-w-[16px]" />
                {currentGame.playTime} minutos
              </span>

              <span className="flex items-center gap-2 text-sm">
                <FiTrendingUp size={"16px"} className="min-w-[16px]" />
                {currentGame.difficulty}{" "}
              </span>

              <div className="flex flex-col gap-1">
                {currentGame.types.map((type, index) => (
                  <span key={index} className="flex items-center gap-2 text-sm">
                    {index === 0 ? (
                      <FiLayers size={"16px"} className="min-w-[16px]" />
                    ) : (
                      <div className="w-[16px]" />
                    )}{" "}
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="py-2">
            <Button
              onClick={() => {
                setIsModalOpen(false);
                setCurrentGame(undefined);
                toggleScrollLock(false);
              }}
            >
              Voltar
            </Button>
          </div>
        </Modal>
      )}
      <ScrollUp />
    </div>
  );
}
