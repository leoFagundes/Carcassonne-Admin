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
import { patternBoardgame } from "@/utils/patternValues";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/Tooltip";

export default function CollectionPage() {
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredBoardgames = boardgames.filter((game) =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="flex flex-col gap-8 w-full h-full px-3">
      {loading && <LoaderFullscreen />}
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuDices size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold">Coleção de jogos</h2>{" "}
        <Tooltip direction="bottom" content="Ir para visão do cliente">
          <LuLink
            onClick={() => router.push("/clientCollection")}
            size={"16px"}
            className="min-w-[16px] cursor-pointer"
          />
        </Tooltip>
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
      <section className="flex justify-center flex-wrap gap-x-6 gap-y-8 px-1 pt-2 pb-4 overflow-y-scroll">
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
