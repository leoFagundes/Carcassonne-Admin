"use client";

import { BoardgameType } from "@/types";
import React, { useState } from "react";
import { LuDices } from "react-icons/lu";
import Card from "./card";
import Input from "@/components/input";
import Modal from "@/components/modal";

export default function CollectionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<BoardgameType>();

  const boardgames: BoardgameType[] = [
    {
      name: "Catan",
      description:
        "Catan é um jogo de tabuleiro de estratégia onde os jogadores competem para colonizar uma ilha, construindo assentamentos, estradas e cidades.",
      difficulty: "medium",
      minPlayers: 3,
      maxPlayers: 4,
      playTime: 60,
      image:
        "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
      type: "Estratégia",
    },
    {
      name: "Ticket to Ride Ride Ride",
      description:
        "Ticket to Ride é um jogo de tabuleiro de conquista de rotas de trem, onde os jogadores tentam completar cartas de destino conectando cidades através de trilhos.",
      difficulty: "easy",
      minPlayers: 2,
      maxPlayers: 5,
      playTime: 45,
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJicnbXO03iN3eFeIFdMe1WnQ_NgnrQmaE_g&s",
      type: "Familiar",
    },
    {
      name: "Pandemic",
      description:
        "Pandemic é um jogo cooperativo onde os jogadores trabalham juntos para parar a propagação de doenças globais e encontrar curas antes que seja tarde demais.",
      difficulty: "hard",
      minPlayers: 2,
      maxPlayers: 4,
      playTime: 45,
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_3MGLtlntqH2ez1OoFl9pDtcHHVKwBwNIcQ&s",
      type: "Cooperativo",
    },
  ];

  const filteredBoardgames = boardgames.filter((game) =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="flex flex-col gap-8 w-full h-full">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuDices size={"48px"} />
        <h2 className="text-5xl text-primary-gold">Coleção de jogos</h2>
      </section>

      {/* Input de busca */}
      <section className="w-full flex justify-center">
        <Input
          type="text"
          placeholder="Buscar por nome do jogo..."
          value={searchTerm}
          setValue={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-[400px] px-4 py-2 rounded-md bg-primary-black/40 text-white placeholder:text-primary-gold border border-primary-gold focus:outline-none focus:ring-2 focus:ring-primary-gold"
        />
      </section>

      {/* Lista de jogos */}
      <section className="flex justify-center flex-wrap gap-x-6 gap-y-8 p-1 h-full overflow-y-scroll scrollbar-none ">
        {filteredBoardgames.length > 0 ? (
          filteredBoardgames.map((boardgame, index) => (
            <Card
              key={index}
              boardgame={boardgame}
              searchTerm={searchTerm}
              onClick={() => {
                setIsModalOpen(true);
                setCurrentItem(boardgame);
              }}
            />
          ))
        ) : (
          <p className="text-primary-gold text-xl">Nenhum jogo encontrado.</p>
        )}
      </section>
      {currentItem && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentItem(undefined);
          }}
        >
          <h1 className="text-4xl text-gradient-gold">{currentItem?.name}</h1>
          <div className="flex flex-col py-6 text-primary-gold gap-6">
            <Input
              label="Nome"
              placeholder={"Nome"}
              value={currentItem.name}
              setValue={(e) =>
                setCurrentItem({ ...currentItem, name: e.target.value })
              }
              variant
              icon={<LuDices size={"20px"} />}
            />
            <Input
              label="Nome"
              placeholder={"Nome"}
              value={currentItem.name}
              setValue={(e) =>
                setCurrentItem({ ...currentItem, name: e.target.value })
              }
              variant
              icon={<LuDices size={"20px"} />}
            />
            <Input
              label="Nome"
              placeholder={"Nome"}
              value={currentItem.name}
              setValue={(e) =>
                setCurrentItem({ ...currentItem, name: e.target.value })
              }
              variant
              icon={<LuDices size={"20px"} />}
            />
            <Input
              label="Nome"
              placeholder={"Nome"}
              value={currentItem.name}
              setValue={(e) =>
                setCurrentItem({ ...currentItem, name: e.target.value })
              }
              variant
              icon={<LuDices size={"20px"} />}
            />
            <Input
              label="Nome"
              placeholder={"Nome"}
              value={currentItem.name}
              setValue={(e) =>
                setCurrentItem({ ...currentItem, name: e.target.value })
              }
              variant
              icon={<LuDices size={"20px"} />}
            />
          </div>
        </Modal>
      )}
    </section>
  );
}
