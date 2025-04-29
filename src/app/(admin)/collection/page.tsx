"use client";

import { BoardgameType } from "@/types";
import React, { useState } from "react";
import { LuDices } from "react-icons/lu";
import Card from "./card";
import Input from "@/components/input";
import Modal from "@/components/modal";
import CollectionForms from "@/components/collectionForms";

export default function CollectionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<BoardgameType>({
    name: "",
    description: "",
    difficulty: "",
    minPlayers: 0,
    maxPlayers: 0,
    playTime: 0,
    featured: false,
    image: "",
    type: "",
  });

  const boardgames: BoardgameType[] = [
    {
      name: "Catan",
      description:
        "Catan é um jogo de tabuleiro de estratégia onde os jogadores competem para colonizar uma ilha, construindo assentamentos, estradas e cidades.",
      difficulty: "Médio",
      minPlayers: 3,
      maxPlayers: 4,
      playTime: 60,
      featured: true,
      image:
        "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
      type: "Estratégia",
    },
    {
      name: "Ticket to Ride Ride Ride ",
      description:
        "Ticket to Ride é um jogo de tabuleiro de conquista de rotas de trem, onde os jogadores tentam completar cartas de destino conectando cidades através de trilhos.",
      difficulty: "Fácil",
      minPlayers: 2,
      maxPlayers: 5,
      playTime: 45,
      featured: false,
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
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_3MGLtlntqH2ez1OoFl9pDtcHHVKwBwNIcQ&s",
      type: "Cooperativo",
    },
  ];

  const filteredBoardgames = boardgames.filter((game) =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="flex flex-col gap-8 w-full h-full px-3">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuDices size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold">Coleção de jogos</h2>
      </section>

      {/* Input de busca */}
      <section className="w-full flex justify-center">
        <Input
          variant
          type="text"
          placeholder="Buscar por nome do jogo..."
          value={searchTerm}
          setValue={(e) => setSearchTerm(e.target.value)}
        />
      </section>

      {/* Lista de jogos */}
      <section className="flex justify-center flex-wrap gap-x-6 gap-y-8 p-1 overflow-y-scroll">
        {filteredBoardgames.length > 0 && !isModalOpen ? (
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
            setCurrentItem({
              name: "",
              description: "",
              difficulty: "",
              minPlayers: 0,
              maxPlayers: 0,
              playTime: 0,
              featured: false,
              image: "",
              type: "",
            });
          }}
        >
          <CollectionForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
          />
        </Modal>
      )}
    </section>
  );
}
