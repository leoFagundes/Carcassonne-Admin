"use client";

import Input from "@/components/input";
import { ComboType, InfoType, MenuItemType } from "@/types";
import React, { useState } from "react";
import { LuPizza } from "react-icons/lu";
import Dropdown from "@/components/dropdown";
import Checkbox from "@/components/checkbox";
import Modal from "@/components/modal";

import MenuForms from "@/components/menuForms";
import MenuCard from "./menuCard";
import InfoCard from "./infoCard";
import ComboCard from "./comboCard";
import InfoForms from "@/components/infoForms";
import ComboForms from "@/components/comboForms";

export default function MenuPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showOnlyFocus, setShowOnlyFocus] = useState(false);
  const [showOnlyVisible, setShowOnlyVisible] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType>({
    name: "",
    description: "",
    value: "",
    type: "",
    observation: [],
    sideDish: [],
    image: "",
    isVegan: false,
    isFocus: false,
    isVisible: true,
  });

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<InfoType>({
    name: "",
    description: "",
    values: [],
  });

  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [currentCombo, setCurrentCombo] = useState<ComboType>({
    name: "",
    description: "",
    value: "",
  });

  // {
  //   name: "",
  //   description: "",
  //   value: "",
  //   type: "",
  //   observation: [],
  //   sideDish: [],
  //   image: "",
  //   isVegan: false,
  //   isFocus: false,
  //   isVisible: true,
  // }

  const menuItems: MenuItemType[] = [
    {
      name: "Pizza Margherita",
      description:
        "Pizza clássica com molho de tomate, mussarela e manjericão fresco.",
      observation: ["Servir quente", "Corte em 8 pedaços"],
      value: "R$ 35,00",
      type: "Pizza",
      sideDish: ["Borda recheada", "Adicional de catupiry"],
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: false,
      isFocus: true,
      isVisible: true,
    },
    {
      name: "Hambúrguer Artesanal",
      description:
        "Hambúrguer de carne bovina 180g, queijo cheddar, alface e tomate. Hambúrguer de carne bovina 180g, queijo cheddar, alface e tomate. ",
      observation: ["Pode conter glúten", "Servir com batata frita"],
      value: "R$ 28,00",
      type: "Hambúrguer",
      sideDish: ["Bacon", "Ovo", "Queijo extra"],
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349",
      isVegan: false,
      isFocus: false,
      isVisible: true,
    },
    {
      name: "Pizza Vegana de Legumes",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: ["Sem lactose", "Massa fina"],
      value: "R$ 38,00",
      type: "Pizza",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: false,
      isVisible: false,
    },
  ];

  const infos: InfoType[] = [
    {
      name: "Horário de funcionamento",
      description: "Nosso restaurante abre todos os dias das 18h às 23h.",
      values: [],
    },
    {
      name: "Taxa de entrega",
      description: "A taxa de entrega varia conforme a região.",
      values: [
        "Zona Sul: R$ 5,00",
        "Zona Norte: R$ 7,00",
        "Plano Piloto: R$ 6,00",
      ],
    },
  ];

  const combos: ComboType[] = [
    {
      name: "Combo Pizza + Refri",
      description: "1 Pizza grande + 1 Refrigerante de 2L.",
      value: "R$ 59,90",
    },
    {
      name: "Combo Família",
      description: "2 Pizzas médias + 2 Refrigerantes lata.",
      value: "R$ 89,90",
    },
  ];

  const filteredMenu = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType ? item.type === filterType : true;
    const matchesFocus = showOnlyFocus ? item.isFocus : true;
    const matchesVisible = showOnlyVisible ? item.isVisible : true;

    return matchesSearch && matchesType && matchesFocus && matchesVisible;
  });

  const filteredInfos = infos.filter(
    (info) =>
      info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      info.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCombos = combos.filter(
    (combo) =>
      combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      combo.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="flex flex-col gap-8 w-full h-full overflow-y-scroll overflow-x-hidden outline-none px-3">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuPizza size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold">Cardápio</h2>
      </section>
      {/* Input de busca */}
      <section className="flex items-center flex-wrap justify-center gap-4 ">
        <div className="flex justify-center gap-4 flex-wrap max-w-[300px]">
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            setValue={(e) => setSearchTerm(e.target.value)}
            variant
          />
          <Dropdown
            value={filterType}
            setValue={(e) => setFilterType(e.target.value)}
            options={[
              "Avisos",
              "Combos",
              ...new Set(menuItems.map((item) => item.type)),
            ]}
            firstLabel="Todos os tipos"
            variant
          />
        </div>
        <div className="flex justify-center gap-4 flex-wrap max-w-[300px]">
          <Checkbox
            checked={showOnlyFocus}
            setChecked={(e) => setShowOnlyFocus(e.target.checked)}
            label="Itens em destaque"
            variant
          />
          <Checkbox
            checked={showOnlyVisible}
            setChecked={(e) => setShowOnlyVisible(e.target.checked)}
            label="Mostrar apenas visíveis"
            variant
          />
        </div>
      </section>
      <section className="flex flex-wrap justify-center gap-x-6 gap-y-8 p-1">
        {filteredMenu.length > 0 && !isMenuModalOpen ? (
          filteredMenu.map((item, index) => (
            <MenuCard
              key={index}
              item={item}
              searchTerm={searchTerm.toLowerCase()}
              onClick={() => {
                setIsMenuModalOpen(true);
                setCurrentItem(item);
              }}
            />
          ))
        ) : filteredMenu.length === 0 &&
          filteredInfos.length === 0 &&
          filteredCombos.length === 0 ? (
          <p className="text-xl text-primary-gold text-center">
            Nenhum item encontrado.
          </p>
        ) : null}

        {(filterType === "Avisos" || filterType === "") &&
          !showOnlyFocus &&
          !showOnlyVisible &&
          filteredInfos.map((info) => (
            <InfoCard
              key={info.name}
              item={info}
              searchTerm={searchTerm.toLowerCase()}
              onClick={() => {
                setIsInfoModalOpen(true);
                setCurrentInfo(info);
              }}
            />
          ))}

        {(filterType === "Combos" || filterType === "") &&
          !showOnlyFocus &&
          !showOnlyVisible &&
          filteredCombos.map((combo) => (
            <ComboCard
              key={combo.name}
              item={combo}
              searchTerm={searchTerm.toLowerCase()}
              onClick={() => {
                setIsComboModalOpen(true);
                setCurrentCombo(combo);
              }}
            />
          ))}
      </section>
      {currentItem && (
        <Modal
          isOpen={isMenuModalOpen}
          onClose={() => {
            setIsMenuModalOpen(false);
            setCurrentItem({
              name: "",
              description: "",
              value: "",
              type: "",
              observation: [],
              sideDish: [],
              image: "",
              isVegan: false,
              isFocus: false,
              isVisible: true,
            });
          }}
        >
          <MenuForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
          />
        </Modal>
      )}
      {currentInfo && (
        <Modal
          isOpen={isInfoModalOpen}
          onClose={() => {
            setIsInfoModalOpen(false);
            setCurrentInfo({
              name: "",
              description: "",
              values: [],
            });
          }}
        >
          <InfoForms
            currentInfo={currentInfo}
            setCurrentInfo={setCurrentInfo}
            formType="edit"
          />
        </Modal>
      )}
      {currentCombo && (
        <Modal
          isOpen={isComboModalOpen}
          onClose={() => {
            setIsComboModalOpen(false);
            setCurrentCombo({
              name: "",
              description: "",
              value: "",
            });
          }}
        >
          <ComboForms
            currentCombo={currentCombo}
            setCurrentCombo={setCurrentCombo}
            formType="edit"
          />
        </Modal>
      )}
    </section>
  );
}
