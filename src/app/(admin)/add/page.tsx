"use client";

import React, { useState } from "react";
import {
  LuBoxes,
  LuClipboardPenLine,
  LuDices,
  LuPizza,
  LuPlus,
} from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import { BoardgameType, MenuItemType, ComboType, InfoType } from "@/types";
import CollectionForms from "@/components/collectionForms";
import MenuForms from "@/components/menuForms";
import ComboForms from "@/components/comboForms";
import InfoForms from "@/components/infoForms";

export default function AddPage() {
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddComboModalOpen, setIsAddComboModalOpen] = useState(false);
  const [isAddInfoModalOpen, setIsAddInfoModalOpen] = useState(false);

  const [newBoardgame, setNewBoardgame] = useState<BoardgameType>({
    name: "",
    description: "",
    difficulty: "",
    minPlayers: 0,
    maxPlayers: 0,
    playTime: 0,
    image: "",
    type: "",
  });

  const [newMenuItem, setNewMenuItem] = useState<MenuItemType>({
    name: "",
    description: "",
    value: "",
    type: "",
    observation: [],
    extra: [],
    image: "",
    isVegan: false,
    isFocus: false,
    isVisible: true,
  });

  const [newCombo, setNewCombo] = useState<ComboType>({
    name: "",
    description: "",
    value: "",
  });

  const [newInfo, setNewInfo] = useState<InfoType>({
    name: "",
    description: "",
    values: [],
  });

  return (
    <section className="flex flex-col items-center gap-8 w-full h-full">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuPlus size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold">Adicionar</h2>
      </section>
      <section className="max-w-[550px] sm:scrollbar-none flex justify-center flex-wrap gap-6 px-2 py-4 overflow-y-scroll overflow-x-hidden">
        <div className="flex justify-center gap-4 flex-wrap">
          <Card
            title="Adicionar Jogo"
            description="Adicione um novo jogo a coleção do Carcassonne!"
            icon={<LuDices size={"32px"} className="min-w-[32px]" />}
            onClick={() => setIsAddGameModalOpen(true)}
          />
          <Card
            title="Adicionar Item"
            description="Adicione um novo item ao cardápio do Carcassonne!"
            icon={<LuPizza size={"32px"} className="min-w-[32px]" />}
            onClick={() => setIsAddItemModalOpen(true)}
          />
        </div>
        <div className="flex justify-center gap-4 flex-wrap">
          <Card
            title="Adicionar Combo"
            description="Adicione um novo Combo ao cardápio do Carcassonne!"
            icon={<LuBoxes size={"32px"} className="min-w-[32px]" />}
            onClick={() => setIsAddComboModalOpen(true)}
          />
          <Card
            title="Adicionar Aviso"
            description="Adicione um novo Aviso ao cardápio do Carcassonne!"
            icon={<LuClipboardPenLine size={"32px"} className="min-w-[32px]" />}
            onClick={() => setIsAddInfoModalOpen(true)}
          />
        </div>
      </section>

      <Modal
        isOpen={isAddGameModalOpen}
        onClose={() => {
          setIsAddGameModalOpen(false);
          setNewBoardgame({
            name: "",
            description: "",
            difficulty: "",
            minPlayers: 0,
            maxPlayers: 0,
            playTime: 0,
            image: "",
            type: "",
          });
        }}
      >
        <CollectionForms
          currentItem={newBoardgame}
          setCurrentItem={setNewBoardgame}
          formType="add"
        />
      </Modal>

      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setNewMenuItem({
            name: "",
            description: "",
            value: "",
            type: "",
            observation: [],
            extra: [],
            image: "",
            isVegan: false,
            isFocus: false,
            isVisible: true,
          });
        }}
      >
        <MenuForms
          currentItem={newMenuItem}
          setCurrentItem={setNewMenuItem}
          formType="add"
        />
      </Modal>

      <Modal
        isOpen={isAddComboModalOpen}
        onClose={() => {
          setIsAddComboModalOpen(false);
          setNewCombo({
            name: "",
            description: "",
            value: "",
          });
        }}
      >
        <ComboForms
          currentCombo={newCombo}
          setCurrentCombo={setNewCombo}
          formType="add"
        />
      </Modal>

      <Modal
        isOpen={isAddInfoModalOpen}
        onClose={() => {
          setIsAddInfoModalOpen(false);
          setNewInfo({
            name: "",
            description: "",
            values: [],
          });
        }}
      >
        <InfoForms
          currentInfo={newInfo}
          setCurrentInfo={setNewInfo}
          formType="add"
        />
      </Modal>
    </section>
  );
}
