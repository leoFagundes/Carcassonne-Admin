"use client";

import Checkbox from "@/components/checkbox";
import Dropdown from "@/components/dropdown";
import Input from "@/components/input";
import { BoardgameType } from "@/types";
import React, { useEffect, useState } from "react";
import { LuClock, LuDices, LuUsers, LuX, LuSparkles } from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import {
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiDollarSign,
  FiLayers,
  FiTrendingUp,
  FiUsers,
  FiX,
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
  const [chosenTypesList, setChosenTypesList] = useState<string[]>([]);
  const [isListView, setIsListView] = useState(false);
  const [filterJustForTow, setFilterJustForTwo] = useState(false);
  const [filterGameFeatured, setFilterGameFeatured] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGame, setCurrentGame] = useState<BoardgameType | undefined>();
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [boardgames, setBoardgames] = useState<BoardgameType[]>([]);
  const [loading, setLoading] = useState(false);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchBoardgames = async () => {
      setLoading(true);
      try {
        const fetchedBoardgames = await BoardgameRepository.getAll();
        const boardgamesForSale = fetchedBoardgames.filter(
          (boardgame) => boardgame.isForSale,
        );
        setBoardgames(boardgamesForSale);
      } catch (error) {
        addAlert(`Erro ao carregar jogos: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardgames();
  }, []);

  const boardgameTypes = Array.from(
    new Set(boardgames.flatMap((b) => b.types)),
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
        chosenTypesList.length === 0 ||
        chosenTypesList.every((type) => boardgame.types.includes(type));

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
      if (a.featured !== b.featured) return b.featured ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

  function handleClearFilters() {
    setFilterBoardgameName("");
    setFilterBoardgameQuantityPlayers(undefined);
    setFilterBoardgamePlayTime(undefined);
    setFilterBoardgameDifficulty("");
    setChosenTypesList([]);
    setIsListView(false);
    setFilterJustForTwo(false);
    setFilterGameFeatured(false);
  }

  function toggleScrollLock(lock: boolean) {
    document.body.style.overflow = lock ? "hidden" : "auto";
  }

  const closeGameModal = () => {
    setIsModalOpen(false);
    setCurrentGame(undefined);
    toggleScrollLock(false);
  };

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
        .hex-bg-sale {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="relative flex flex-col items-center gap-6 w-full min-h-screen text-primary-gold px-4 sm:px-8 py-8 pb-16">
        {loading && <LoaderFullscreen />}

        {/* Background effects */}
        <div className="hex-bg-sale fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Header */}
        <section className="relative z-10 flex flex-col items-center gap-2 w-fit mt-2">
          <h1 className="font-cinzel text-2xl sm:text-4xl text-center text-shimmer-gold tracking-widest uppercase leading-tight">
            Jogos à Venda
          </h1>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
            <svg
              width="7"
              height="7"
              viewBox="0 0 10 10"
              className="text-primary-gold/50 shrink-0"
            >
              <polygon
                points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
                fill="currentColor"
              />
            </svg>
            <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-primary-gold/50 whitespace-nowrap">
              Carcassonne Pub
            </span>
            <svg
              width="7"
              height="7"
              viewBox="0 0 10 10"
              className="text-primary-gold/50 shrink-0"
            >
              <polygon
                points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
                fill="currentColor"
              />
            </svg>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
          </div>
          <p className="text-xs sm:text-sm text-primary-gold/60 text-center mt-1">
            Encontre um jogo para chamar de seu!
          </p>
        </section>

        {/* Filter toggle */}
        <div className="relative z-10 flex flex-col gap-2 items-center w-full">
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="flex items-center gap-1.5 text-xs sm:text-sm border border-primary-gold/25 hover:border-primary-gold/50 rounded-lg px-4 py-1.5 transition-all duration-200 text-primary-gold/70 hover:text-primary-gold"
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
                  <FiChevronUp className="min-w-[14px]" size={"14px"} />
                </motion.span>
              ) : (
                <motion.span
                  key="down"
                  initial={{ opacity: 1, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 1, y: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiChevronDown className="min-w-[14px]" size={"14px"} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Filters */}
          <AnimatePresence>
            {isFilterVisible && (
              <motion.section
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, height: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-[640px] bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 sm:p-6"
              >
                <div className="flex flex-wrap justify-center gap-6">
                  <div className="flex flex-col gap-4">
                    <Input
                      value={filterBoardgameName}
                      setValue={(e) => setFilterBoardgameName(e.target.value)}
                      placeholder="Nome do Jogo"
                      label="Nome do Jogo"
                      variant
                      icon={<LuDices size={"20px"} className="min-w-[20px]" />}
                      width="!w-[220px]"
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
                          setFilterBoardgameQuantityPlayers(
                            parseInt(e.target.value),
                          );
                        }
                      }}
                      label="Até quantos jogadores?"
                      placeholder="Até quantos jogadores?"
                      variant
                      type="number"
                      icon={<LuUsers size={"20px"} className="min-w-[20px]" />}
                      width="!w-[220px]"
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
                      width="!w-[220px]"
                    />
                    <Dropdown
                      firstLabel="Dificuldade do Jogo"
                      value={filterBoardgameDifficulty}
                      setValue={(e) =>
                        setFilterBoardgameDifficulty(e.target.value)
                      }
                      options={difficultiesOptions}
                      variant
                      label="Dificuldade"
                      width="!w-[220px]"
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <Dropdown
                        firstLabel="Tipo"
                        value={""}
                        setValue={(e) =>
                          setChosenTypesList([
                            ...chosenTypesList,
                            e.target.value,
                          ])
                        }
                        options={boardgameTypes}
                        variant
                        label="Tipo"
                        width="!w-[220px]"
                      />
                      {chosenTypesList.length > 0 && (
                        <div className="flex flex-col p-2 border border-t-0 border-primary-gold/15 rounded-b-lg">
                          {chosenTypesList.map((type, index) => (
                            <span
                              key={index}
                              className="flex gap-2 items-center p-1 cursor-pointer text-sm hover:text-primary-gold/80 hover:underline"
                              onClick={() =>
                                setChosenTypesList((prev) =>
                                  prev.filter((t) => t !== type),
                                )
                              }
                            >
                              {type}
                              <LuX size={12} />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Checkbox
                        checked={filterGameFeatured}
                        setChecked={(e) =>
                          setFilterGameFeatured(e.target.checked)
                        }
                        label="Visualizar jogos destaque"
                      />
                      <Checkbox
                        checked={filterJustForTow}
                        setChecked={(e) =>
                          setFilterJustForTwo(e.target.checked)
                        }
                        label="Apenas jogos para dois"
                      />
                      <Checkbox
                        checked={isListView}
                        setChecked={(e) => setIsListView(e.target.checked)}
                        label="Visualizar em lista?"
                      />
                      <div className="flex w-full justify-center mt-1">
                        <span
                          onClick={handleClearFilters}
                          className="flex items-center gap-1.5 italic py-1.5 px-3 text-xs cursor-pointer border border-primary-gold/25 hover:border-primary-gold/50 text-primary-gold/55 hover:text-primary-gold/80 w-fit rounded-lg transition-all"
                        >
                          <LuX size={"13px"} className="min-w-[13px]" /> Limpar
                          filtros
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Game count + cards */}
        <section className="relative z-10 flex flex-col items-center w-full">
          <div className="flex items-center gap-3 w-full max-w-xs mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/30" />
            <span className="text-sm text-primary-gold/70 text-center whitespace-nowrap">
              <Counter targetValue={filteredBoardgames.length} />{" "}
              {filteredBoardgames.length === 1
                ? "jogo encontrado"
                : "jogos encontrados"}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/30" />
          </div>

          <div
            className={`flex ${
              isListView
                ? "flex-col items-center gap-2 py-4 w-full max-w-[560px]"
                : "justify-center flex-wrap gap-6 py-4"
            }`}
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

        {/* Game detail modal */}
        {currentGame && (
          <Modal
            isOpen={isModalOpen}
            onClose={closeGameModal}
            isFixed
            noPadding
            patternCloseButton={false}
          >
            <div className="w-full h-full flex flex-col overflow-hidden bg-primary-black sm:w-[440px] sm:h-auto sm:max-h-[88vh] sm:rounded-2xl sm:border sm:border-primary-gold/20 sm:bg-secondary-black/90">
              {/* Hero image */}
              <div className="relative w-full h-[240px] shrink-0">
                <img
                  className="w-full h-full object-cover"
                  src={
                    currentGame.image
                      ? currentGame.image
                      : "images/patternBoardgameImage.png"
                  }
                  alt="boardgame"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-black via-primary-black/20 to-transparent" />

                {/* Close button */}
                <button
                  onClick={closeGameModal}
                  className="absolute top-4 right-4 p-2 bg-primary-black/60 backdrop-blur-sm rounded-full border border-primary-gold/20 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/50 transition-all"
                >
                  <FiX size={18} />
                </button>

                {/* Featured badge */}
                {currentGame.featured && (
                  <div className="absolute top-4 left-4 flex items-center gap-1 px-2 py-0.5 bg-primary-gold text-primary-black text-xs font-bold rounded-full">
                    <LuSparkles size={11} /> Destaque
                  </div>
                )}

                {/* Name + price */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="text-2xl font-bold text-primary drop-shadow-lg leading-tight">
                    {currentGame.name}
                  </p>
                  {currentGame.value && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <FiDollarSign size={14} className="text-primary-gold" />
                      <span className="text-primary-gold font-bold text-lg">
                        {currentGame.value}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4 sm:overflow-visible sm:flex-none">
                {/* Info pills */}
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 text-xs bg-primary-black/40 rounded-lg px-3 py-1.5 border border-primary-gold/15">
                    <FiUsers size={12} />
                    {currentGame.minPlayers === currentGame.maxPlayers
                      ? currentGame.maxPlayers
                      : `${currentGame.minPlayers}–${currentGame.maxPlayers}`}{" "}
                    jogadores
                  </span>
                  <span className="flex items-center gap-1.5 text-xs bg-primary-black/40 rounded-lg px-3 py-1.5 border border-primary-gold/15">
                    <FiClock size={12} />
                    {currentGame.playTime} min
                  </span>
                  <span className="flex items-center gap-1.5 text-xs bg-primary-black/40 rounded-lg px-3 py-1.5 border border-primary-gold/15">
                    <FiTrendingUp size={12} />
                    {currentGame.difficulty}
                  </span>
                </div>

                {/* Types */}
                <div className="flex flex-wrap gap-1.5">
                  {currentGame.types.map((type, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 text-xs bg-secondary-black/60 rounded-lg px-2 py-1 border border-primary-gold/10 text-primary-gold/70"
                    >
                      <FiLayers size={10} /> {type}
                    </span>
                  ))}
                </div>

                {/* Description */}
                {currentGame.description && (
                  <p className="text-sm text-primary-gold/85 whitespace-pre-line leading-relaxed">
                    {currentGame.description}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 py-4 border-t border-primary-gold/10">
                <Button onClick={closeGameModal}>Voltar</Button>
              </div>
            </div>
          </Modal>
        )}

        <ScrollUp />
      </div>
    </>
  );
}
