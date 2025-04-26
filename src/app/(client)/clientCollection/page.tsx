"use client";

import Checkbox from "@/components/checkbox";
import Dropdown from "@/components/dropdown";
import Input from "@/components/input";
import { BoardgameType } from "@/types";
import React, { useState } from "react";
import { LuClock, LuDices, LuUsers, LuX } from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import { FiClock, FiLayers, FiTrendingUp, FiUsers } from "react-icons/fi";
import Button from "@/components/button";

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

  const boardgames: BoardgameType[] = [
    {
      name: "Pandemic",
      description:
        "Pandemic é um jogo cooperativo onde os jogadores trabalham juntos para parar a propagação de doenças globais e encontrar curas antes que seja tarde demais.",
      difficulty: "Difícil",
      minPlayers: 2,
      maxPlayers: 4,
      playTime: 45,
      featured: false,
      image:
        "https://images.tcdn.com.br/img/img_prod/460977/jogo_de_tabuleiro_pandemic_pandemia_games_mkp_117092_1_1d452d4f23b9c6fdabcfdbb673330c8c.jpg",
      type: "Cooperativo",
    },
    {
      name: "Catan",
      description:
        "Catan é um jogo de tabuleiro de estratégia onde os jogadores competem para colonizar uma ilha, construindo assentamentos, estradas e cidades.",
      difficulty: "Médio",
      minPlayers: 2,
      maxPlayers: 2,
      playTime: 60,
      featured: true,
      image:
        "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
      type: "Estratégia",
    },
    {
      name: "Ticket to Ride Ride Ride",
      description:
        "Ticket to Ride é um jogo de tabuleiro de conquista de rotas de trem, onde os jogadores tentam completar cartas de destino conectando cidades através de trilhos.",
      difficulty: "Fácil",
      minPlayers: 2,
      maxPlayers: 7,
      playTime: 45,
      featured: true,
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJicnbXO03iN3eFeIFdMe1WnQ_NgnrQmaE_g&s",
      type: "Familiar",
    },
    {
      name: "Pandemic",
      description:
        "Pandemic é um jogo cooperativo onde os jogadores trabalham juntos para parar a propagação de doenças globais e encontrar curas antes que seja tarde demais.",
      difficulty: "Difícil",
      minPlayers: 2,
      maxPlayers: 4,
      playTime: 45,
      featured: false,
      image:
        "https://images.tcdn.com.br/img/img_prod/460977/jogo_de_tabuleiro_pandemic_pandemia_games_mkp_117092_1_1d452d4f23b9c6fdabcfdbb673330c8c.jpg",
      type: "Cooperativo",
    },
    {
      name: "Catan",
      description:
        "Catan é um jogo de tabuleiro de estratégia onde os jogadores competem para colonizar uma ilha, construindo assentamentos, estradas e cidades.",
      difficulty: "Médio",
      minPlayers: 2,
      maxPlayers: 2,
      playTime: 60,
      featured: true,
      image:
        "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
      type: "Estratégia",
    },
    {
      name: "Ticket to Ride Ride Ride",
      description:
        "Ticket to Ride é um jogo de tabuleiro de conquista de rotas de trem, onde os jogadores tentam completar cartas de destino conectando cidades através de trilhos.Ticket to Ride é um jogo de tabuleiro de conquista de rotas de trem, onde os jogadores tentam completar cartas de destino conectando cidades através de trilhos.Ticket to Ride é um jogo de tabuleiro de conquista de rotas de trem, onde os jogadores tentam completar cartas de destino conectando cidades através de trilhos.",
      difficulty: "Fácil",
      minPlayers: 2,
      maxPlayers: 7,
      playTime: 45,
      featured: true,
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJicnbXO03iN3eFeIFdMe1WnQ_NgnrQmaE_g&s",
      type: "Familiar",
    },
  ];

  const boardgameDifficulties = Array.from(
    new Set(boardgames.map((b) => b.difficulty))
  );

  const boardgameTypes = Array.from(new Set(boardgames.map((b) => b.type)));

  const filteredBoardgames = boardgames
    .filter((boardgame) => {
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
        filterBoardgameType === "" || boardgame.type === filterBoardgameType;

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
    .sort((a, b) => a.name.localeCompare(b.name));

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
      <section className="flex flex-col item center gap-1">
        <h1 className="text-4xl text-center">Coleção de Jogos</h1>
        <div className="flex items-center gap-2 justify-center text-center italic font-light w-full">
          <div className="h-[1px] flex-1 bg-primary-gold" />
          <span>Carcassonne Pub</span>
          <div className="h-[1px] flex-1 bg-primary-gold" />
        </div>
      </section>
      <span className="text-center">
        Encontre o jogo ideal para a sua mesa!
      </span>
      <section className="flex flex-wrap justify-center gap-6">
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
            firstLabel="Dificuldade"
            value={filterBoardgameDifficulty}
            setValue={(e) => setFilterBoardgameDifficulty(e.target.value)}
            options={boardgameDifficulties}
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
            <span
              onClick={handleClearFilters}
              className="flex items-center gap-1 italic py-1 px-2 shadow-card text-xs cursor-pointer sm:hover:scale-[98%] border text-primary-gold/60 border-primary-gold/60 w-fit rounded-lg"
            >
              <LuX size={"14px"} className="min-w-[14px]" /> Limpar filtros
            </span>
          </div>
        </div>
      </section>
      <section className="flex flex-col items-center w-full">
        <div className="flex items-center gap-2 justify-center text-center italic font-light w-full">
          <div className="h-[1px] flex-1 bg-primary-gold max-w-[30px]" />
          <span className="text-center">
            {filteredBoardgames.length}{" "}
            {filteredBoardgames.length === 1
              ? "jogo encontrado"
              : "jogos encontrados"}
          </span>
          <div className="h-[1px] flex-1 bg-primary-gold max-w-[30px]" />
        </div>

        <div
          className={`flex ${
            isListView
              ? "flex-col items-center gap-4"
              : "justify-center flex-wrap gap-10"
          }  w-full py-6`}
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
          <div className="flex flex-col items-center gap-4 my-2 max-w-[400px] h-full px-2 overflow-y-scroll">
            <h2 className="text-2xl">{currentGame.name}</h2>
            <img
              className="rounded shadow-card w-[200px]"
              src={currentGame.image}
              alt="boardgame"
            />
            <p className="text-sm">{currentGame.description}</p>

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

              <span className="flex items-center gap-2 text-sm">
                <FiLayers size={"16px"} className="min-w-[16px]" />
                {currentGame.type}{" "}
              </span>
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
    </div>
  );
}
