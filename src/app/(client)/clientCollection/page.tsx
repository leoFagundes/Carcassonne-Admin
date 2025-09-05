"use client";

import Checkbox from "@/components/checkbox";
import Dropdown from "@/components/dropdown";
import Input from "@/components/input";
import { BoardgameType } from "@/types";
import React, { useEffect, useRef, useState } from "react";
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
import { GiCardRandom } from "react-icons/gi";
import { truncateText } from "@/utils/utilFunctions";

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
  const [isFilterVisible, setIsFilterVisible] = useState(true);
  const [boardgames, setBoardgames] = useState<BoardgameType[]>([]);
  const [loading, setLoading] = useState(false);
  const [myBoardGames, setMyBoardGames] = useState<BoardgameType[]>([]);
  const [isMyBoardGamesModalOpen, setIsMyBoardGamesModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<BoardgameType | null>(null);
  const [spinning, setSpinning] = useState(false);
  const lastIndexRef = useRef<number | null>(null);

  const { addAlert } = useAlert();

  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    updateMyBoardGamesList();
  }, []);

  useEffect(() => {
    const fetchBoardgames = async () => {
      setLoading(true);
      try {
        const fetchedBoardgames = await BoardgameRepository.getAll();
        const boardgamesNotForSale = fetchedBoardgames.filter(
          (boardgame) => !boardgame.isForSale
        );
        setBoardgames(boardgamesNotForSale);
      } catch (error) {
        addAlert(`Erro ao carregar jogos: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardgames();
  }, []);

  const drawGame = () => {
    if (myBoardGames.length === 0 || spinning) return;

    setSpinning(true);
    let count = 0;
    let delay = 150;

    const spin = () => {
      let randomIndex: number;

      do {
        randomIndex = Math.floor(Math.random() * myBoardGames.length);
      } while (myBoardGames.length > 1 && randomIndex === lastIndexRef.current);

      lastIndexRef.current = randomIndex;
      setSelectedGame(myBoardGames[randomIndex]);
      count++;

      if (count >= 10) delay += 5;
      if (count < 25) {
        setTimeout(spin, delay);
      } else {
        setSpinning(false);

        const selectedCard = cardsRef.current[randomIndex];
        if (selectedCard) {
          selectedCard.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    };

    spin();
  };

  const updateMyBoardGamesList = () => {
    const stored = localStorage.getItem("boardgames");
    if (stored) {
      setMyBoardGames(JSON.parse(stored));
    }
    if (stored?.length === 0) {
      setIsMyBoardGamesModalOpen(false);
    }
  };

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
    setChosenTypesList([]);
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

  const addBoardGameToList = (boardgame: BoardgameType) => {
    const alreadyExists = myBoardGames.some((game) => game.id === boardgame.id);

    if (alreadyExists) {
      addAlert(`${boardgame.name} já está na sua lista`);
      return;
    }

    const updatedList = [...myBoardGames, boardgame];

    localStorage.setItem("boardgames", JSON.stringify(updatedList));
    setMyBoardGames(updatedList);

    addAlert(`${boardgame.name} adicionado`);
  };

  const removeBoardGameFromList = (boardgame: BoardgameType) => {
    const updatedList = myBoardGames.filter((game) => game.id !== boardgame.id);

    localStorage.setItem("boardgames", JSON.stringify(updatedList));
    setMyBoardGames(updatedList);

    addAlert(`${boardgame.name} removido`);

    if (updatedList.length === 0) {
      setIsMyBoardGamesModalOpen(false);
      toggleScrollLock(false);
    }
  };

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
              <div>
                <Dropdown
                  firstLabel="Tipo"
                  value={""}
                  setValue={(e) =>
                    setChosenTypesList([...chosenTypesList, e.target.value])
                  }
                  options={boardgameTypes}
                  variant
                  label="Tipo"
                  width="!w-[250px]"
                />
                {chosenTypesList.length > 0 && (
                  <div className="flex flex-col p-2 border border-t-0 border-dashed rounded shadow-card">
                    {chosenTypesList.map((type, index) => (
                      <span
                        key={index}
                        className="flex gap-2 items-center p-1 cursor-pointer sm:hover:underline"
                        onClick={() =>
                          setChosenTypesList((prev) =>
                            prev.filter((t) => t !== type)
                          )
                        }
                      >
                        {type}
                        <LuX />
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
        {myBoardGames.length > 0 && (
          <div
            onClick={() => {
              setIsMyBoardGamesModalOpen(true);
              updateMyBoardGamesList();
              toggleScrollLock(true);
            }}
            className="cursor-pointer fixed bottom-2 left-2 py-1 px-2 m-1 sm:py-2 sm:px-3 z-20 rounded shadow-card bg-primary-black/50 backdrop-blur-[4px] border"
          >
            <span className="text-xs sm:text-base">
              Ver minha lista de jogos
            </span>
            <div className="flex items-center justify-center absolute -top-2 -right-2 sm:-top-3 sm:-right-3 p-1 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-primary-black border">
              <span className="text-xs sm:text-base">
                {myBoardGames.length}
              </span>
            </div>
          </div>
        )}
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
              setMyBoardGames={setMyBoardGames}
              mode="default"
              addBoardGameToList={addBoardGameToList}
              removeBoardGameFromList={removeBoardGameFromList}
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
          zIndex={60}
        >
          <div className="flex flex-col items-center gap-4 my-2 max-w-[500px] w-full h-full px-2 overflow-y-scroll sm:bg-secondary-black/60 py-3 sm:px-6 sm:h-fit sm:shadow-2xl rounded-sm">
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
      {myBoardGames.length > 0 && (
        <Modal
          isOpen={isMyBoardGamesModalOpen}
          onClose={() => {
            setIsMyBoardGamesModalOpen(false);
            toggleScrollLock(false);
            setSelectedGame(null);
          }}
          isFixed
        >
          <h1 className="text-2xl py-2">Minha lista de jogos</h1>
          <div
            className={`flex overflow-y-auto p-4 ${
              isListView
                ? "flex-col items-center gap-1 py-4"
                : "justify-center flex-wrap gap-10 py-6 pb-15"
            }  w-full `}
          >
            {myBoardGames.map((boardgame, index) => (
              <Card
                key={index}
                ref={(el) => {
                  cardsRef.current[index] = el;
                }}
                boardgame={boardgame}
                isListView={isListView}
                onClick={() => {
                  setIsModalOpen(true);
                  setCurrentGame(boardgame);
                  toggleScrollLock(true);
                }}
                setMyBoardGames={setMyBoardGames}
                mode="myList"
                addBoardGameToList={addBoardGameToList}
                removeBoardGameFromList={removeBoardGameFromList}
                selectedGame={
                  selectedGame ? selectedGame.name === boardgame.name : false
                }
                spinning={spinning}
              />
            ))}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div
              onClick={drawGame}
              className={`absolute bottom-4 border rounded flex items-center justify-center gap-2 px-3 py-1 bg-primary-black/30 backdrop-blur-[4px] cursor-pointer min-w-[180px] shadow-card overflow-hidden h-[35px] max-w-[250px] w-full border-primary-gold/50 ${!spinning && "shadow-card-gold !border-primary-gold"}`}
            >
              <GiCardRandom size={30} />

              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <AnimatePresence>
                  {selectedGame ? (
                    <motion.span
                      key={selectedGame.name}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -80, opacity: 0 }}
                      transition={{ duration: 0.1, ease: "easeInOut" }}
                      className="absolute text-base text-center w-full"
                    >
                      {truncateText(selectedGame.name, 20)}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="default"
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -80, opacity: 0 }}
                      transition={{ duration: 0.1, ease: "easeInOut" }}
                      className="absolute text-base text-center w-full"
                    >
                      Sortear um jogo
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Modal>
      )}
      <ScrollUp />
    </div>
  );
}
