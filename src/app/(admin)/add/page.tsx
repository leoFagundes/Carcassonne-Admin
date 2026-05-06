"use client";

import React, { useState } from "react";
import {
  LuBoxes,
  LuCalendarPlus,
  LuClipboardPenLine,
  LuDices,
  LuExternalLink,
  LuGroup,
  LuListOrdered,
  LuMusic,
  LuPizza,
  LuPlus,
  LuText,
  LuUserPlus,
} from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import {
  BoardgameType,
  MenuItemType,
  ComboType,
  InfoType,
  DescriptionTypeProps,
  TypeOrderType,
} from "@/types";
import CollectionForms from "@/components/collectionForms";
import MenuForms from "@/components/menuForms";
import ComboForms from "@/components/comboForms";
import InfoForms from "@/components/infoForms";
import DescriptionTypeForms from "@/components/descriptionTypeForms";
import {
  patternBoardgame,
  patternCombo,
  patternDescriptionType,
  patternInfo,
  patternMenuItem,
  patternTypeOrder,
} from "@/utils/patternValues";
import PopupForms from "@/components/popupForms";
import TypesOrderForms from "@/components/typesOrderForms";
import { useRouter } from "next/navigation";

export default function AddPage() {
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddComboModalOpen, setIsAddComboModalOpen] = useState(false);
  const [isAddInfoModalOpen, setIsAddInfoModalOpen] = useState(false);
  const [isAddPopupModalOpen, setIsAddPopupModalOpen] = useState(false);
  const [isAddTypesOrderModalOpen, setIsAddTypesOrderModalOpen] =
    useState(false);
  const [isDescriptionTypeModalOpen, setIsDescriptionTypeModalOpen] =
    useState(false);

  const [newBoardgame, setNewBoardgame] =
    useState<BoardgameType>(patternBoardgame);

  const [newMenuItem, setNewMenuItem] = useState<MenuItemType>(patternMenuItem);

  const [newCombo, setNewCombo] = useState<ComboType>(patternCombo);

  const [newInfo, setNewInfo] = useState<InfoType>(patternInfo);

  const [newTypeOrder, setNewTypeOrder] =
    useState<TypeOrderType>(patternTypeOrder);

  const [newDescriptionType, setNewDescriptionType] =
    useState<DescriptionTypeProps>(patternDescriptionType);

  const router = useRouter();

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          <LuPlus size={32} className="text-primary-gold/70 shrink-0" />
          <h1 className="text-3xl font-semibold text-primary-gold">
            Adicionar
          </h1>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>
      <section className="flex justify-center flex-wrap gap-4 pb-6 px-6">
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
        <Card
          title="Adicionar Descrição"
          description="Adicione uma descrição a um tipo de item já criado no cardápio!"
          icon={<LuText size={"32px"} className="min-w-[32px]" />}
          onClick={() => setIsDescriptionTypeModalOpen(true)}
        />
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
        <Card
          title="Adicionar Popup"
          description="Adicione um novo Popup ao cardápio!"
          icon={<LuGroup size={"32px"} className="min-w-[32px]" />}
          onClick={() => setIsAddPopupModalOpen(true)}
        />
        <Card
          title="Ordenar Tipos"
          description="Adicione e ordene os tipos e subtipos de cada item!"
          icon={<LuListOrdered size={"32px"} className="min-w-[32px]" />}
          onClick={() => setIsAddTypesOrderModalOpen(true)}
        />
        <Card
          title="Adicionar Reserva"
          description="Adicione uma nova reserva!"
          icon={<LuCalendarPlus size={"32px"} className="min-w-[32px]" />}
          onClick={() => router.push(`/myreserves?createreserve=true`)}
        />
        <Card
          title="Adicionar Freelancer"
          description="Adicione um novo freelancer em um determinado dia!"
          icon={<LuUserPlus size={"32px"} className="min-w-[32px]" />}
          onClick={() => router.push(`/myreserves?createfreela=true`)}
        />
        {/* <Card
          title="Adicionar Foto ao Mural"
          description="Adicione uma nova foto ao mural do Carcassonne!"
          icon={<LuImagePlus size={"32px"} className="min-w-[32px]" />}
          onClick={() => router.push(`/carcassonne?createimage=true`)}
        /> */}
        <Card
          title="Adicionar uma Música"
          description="Adicione uma recomendação de música para a lista!"
          icon={<LuMusic size={"32px"} className="min-w-[32px]" />}
          onClick={() => router.push(`/clientMusicRecommendation`)}
        />
        <Card
          title="Adicionar um Link"
          description="Adicione um novo Link ao Linktree do Carcassonne"
          icon={<LuExternalLink size={"32px"} className="min-w-[32px]" />}
          onClick={() => router.push(`/links?createlink=true`)}
        />
      </section>

      <Modal
        isOpen={isAddGameModalOpen}
        onClose={() => {
          setIsAddGameModalOpen(false);
          setNewBoardgame(patternBoardgame);
        }}
      >
        <CollectionForms
          currentItem={newBoardgame}
          setCurrentItem={setNewBoardgame}
          formType="add"
          closeForms={() => {
            setIsAddGameModalOpen(false);
            setNewBoardgame(patternBoardgame);
          }}
        />
      </Modal>

      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => {
          setIsAddItemModalOpen(false);
          setNewMenuItem(patternMenuItem);
        }}
      >
        <MenuForms
          currentItem={newMenuItem}
          setCurrentItem={setNewMenuItem}
          formType="add"
          closeForms={() => {
            setIsAddItemModalOpen(false);
            setNewMenuItem(patternMenuItem);
          }}
        />
      </Modal>

      <Modal
        isOpen={isAddComboModalOpen}
        onClose={() => {
          setIsAddComboModalOpen(false);
          setNewCombo(patternCombo);
        }}
      >
        <ComboForms
          currentCombo={newCombo}
          setCurrentCombo={setNewCombo}
          formType="add"
          closeForms={() => {
            setIsAddComboModalOpen(false);
            setNewCombo(patternCombo);
          }}
        />
      </Modal>

      <Modal
        isOpen={isAddInfoModalOpen}
        onClose={() => {
          setIsAddInfoModalOpen(false);
          setNewInfo(patternInfo);
        }}
      >
        <InfoForms
          currentInfo={newInfo}
          setCurrentInfo={setNewInfo}
          formType="add"
          closeForms={() => {
            setIsAddInfoModalOpen(false);
            setNewInfo(patternInfo);
          }}
        />
      </Modal>

      <Modal
        isOpen={isDescriptionTypeModalOpen}
        onClose={() => {
          setIsDescriptionTypeModalOpen(false);
          setNewDescriptionType(patternDescriptionType);
        }}
      >
        <DescriptionTypeForms
          currentDescriptionType={newDescriptionType}
          setcurrentDescriptionType={setNewDescriptionType}
        />
      </Modal>

      <Modal
        isOpen={isAddTypesOrderModalOpen}
        onClose={() => {
          setIsAddTypesOrderModalOpen(false);
          setNewTypeOrder(patternTypeOrder);
        }}
      >
        <TypesOrderForms currentTypeOrder={newTypeOrder} />
      </Modal>

      <Modal
        isOpen={isAddPopupModalOpen}
        onClose={() => {
          setIsAddPopupModalOpen(false);
        }}
      >
        <PopupForms
          closeForms={() => {
            setIsAddPopupModalOpen(false);
          }}
        />
      </Modal>
    </section>
  );
}
