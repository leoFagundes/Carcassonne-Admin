"use client";

import Input from "@/components/input";
import { MenuItemType } from "@/types";
import React, { useState } from "react";
import { LuPizza } from "react-icons/lu";
import Card from "./card";
import Dropdown from "@/components/dropdown";
import Checkbox from "@/components/checkbox";
import Modal from "@/components/modal";

import MenuForms from "@/components/menuForms";

export default function MenuPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showOnlyFocus, setShowOnlyFocus] = useState(false);
  const [showOnlyVisible, setShowOnlyVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType>();

  // {
  //   name: "",
  //   description: "",
  //   value: "",
  //   type: "",
  //   observation: [],
  //   extra: [],
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
      extra: ["Borda recheada", "Adicional de catupiry"],
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: false,
      isFocus: true,
      isVisible: true,
    },
    {
      name: "Hambúrguer Artesanal",
      description:
        "Hambúrguer de carne bovina 180g, queijo cheddar, alface e tomate.",
      observation: ["Pode conter glúten", "Servir com batata frita"],
      value: "R$ 28,00",
      type: "Hambúrguer",
      extra: ["Bacon", "Ovo", "Queijo extra"],
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

  const filteredMenu = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType ? item.type === filterType : true;
    const matchesFocus = showOnlyFocus ? item.isFocus : true;
    const matchesVisible = showOnlyVisible ? item.isVisible : true;

    return matchesSearch && matchesType && matchesFocus && matchesVisible;
  });

  return (
    <section className="flex flex-col gap-8 w-full h-full">
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuPizza size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold">Cardápio</h2>
      </section>
      {/* Input de busca */}
      <section className="flex items-center flex-wrap justify-center gap-4">
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
            options={[...new Set(menuItems.map((item) => item.type))]}
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
      <section className="flex flex-wrap justify-center gap-6">
        {filteredMenu.length > 0 && !isModalOpen ? (
          filteredMenu.map((item, index) => (
            <Card
              key={index}
              item={item}
              searchTerm={searchTerm.toLowerCase()}
              onClick={() => {
                setIsModalOpen(true);
                setCurrentItem(item);
              }}
            />
          ))
        ) : (
          <p className="text-xl text-primary-gold text-center">
            Nenhum item encontrado.
          </p>
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
          <MenuForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
          />
        </Modal>
      )}
    </section>
  );
}
