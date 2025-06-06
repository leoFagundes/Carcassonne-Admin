"use client";

import React, { useEffect, useState } from "react";
import {
  LuBoxes,
  LuClipboardPenLine,
  LuDices,
  LuGroup,
  LuListOrdered,
  LuPizza,
  LuPlus,
  LuText,
} from "react-icons/lu";
import Card from "./card";
import Modal from "@/components/modal";
import {
  BoardgameType,
  MenuItemType,
  ComboType,
  InfoType,
  DescriptionTypeProps,
  GeneralConfigsType,
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
  patternGeneralConfigs,
  patternInfo,
  patternMenuItem,
  patternTypeOrder,
} from "@/utils/patternValues";
import PopupForms from "@/components/popupForms";
import { useAlert } from "@/contexts/alertProvider";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import TypesOrderForms from "@/components/typesOrderForms";

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

  const [generalConfigs, setGeneralConfigs] = useState<GeneralConfigsType>();

  const [newDescriptionType, setNewDescriptionType] =
    useState<DescriptionTypeProps>(patternDescriptionType);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchGeneralConfigs = async () => {
      try {
        const configs = await GeneralConfigsRepository.get();

        if (configs) setGeneralConfigs(configs);
      } catch (error) {
        addAlert(`Erro ao carregar configurações gerais: ${error}`);
      }
    };

    fetchGeneralConfigs();
  }, []);

  return (
    <section className="flex flex-col items-center gap-8 w-full h-full">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuPlus size={"48px"} className="min-w-[48px]" />
        <h2 className="sm:text-5xl text-3xl text-primary-gold">Adicionar</h2>
      </section>
      <section className=" sm:scrollbar-none flex justify-center flex-wrap gap-6 px-2 py-4 overflow-y-scroll overflow-x-hidden">
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
          title="Ordenar tipos"
          description="Adicione e ordene os tipos e subtipos de cada item!"
          icon={<LuListOrdered size={"32px"} className="min-w-[32px]" />}
          onClick={() => setIsAddTypesOrderModalOpen(true)}
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

      {generalConfigs && (
        <Modal
          isOpen={isAddPopupModalOpen}
          onClose={() => {
            setIsAddPopupModalOpen(false);
            setGeneralConfigs(patternGeneralConfigs);
          }}
        >
          <PopupForms
            currentConfig={generalConfigs}
            setCurrentConfig={setGeneralConfigs}
            closeForms={() => {
              setIsAddPopupModalOpen(false);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
