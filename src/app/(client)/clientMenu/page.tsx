"use client";

import {
  MenuItemType,
  InfoType,
  ComboType,
  DescriptionTypeProps,
} from "@/types";
import React, { Fragment, useEffect, useRef, useState } from "react";
import InfoCard from "./infoCard";
import ComboCard from "./comboCard";
import MenuCard from "./menuCard";
import Modal from "@/components/modal";
import Button from "@/components/button";
import { LuVegan } from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import ScrollUp from "@/components/scrollUp";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import LoaderFullscreen from "@/components/loaderFullscreen";

export default function ClientMenuPage() {
  const [types, setTypes] = useState(["Avisos", "Combos"]);
  const [isMenuFixed, setIsMenuFixed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType | undefined>();
  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [laoding, setLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchDescriptions = async () => {
      setLoading(true);
      try {
        const fecthedDescriptions = await DescriptionRepository.getAll();
        setDescriptions(fecthedDescriptions);
      } catch (error) {
        addAlert("Erro ao carregar descrições.");
      } finally {
        setLoading(false);
      }
    };

    fetchDescriptions();
  }, []);

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
        "Hambúrguer de carne bovina 180g, queijo cheddar, alface e tomate.",
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
      name: "Hambúrguer Artesanal",
      description:
        "Hambúrguer de carne bovina 180g, queijo cheddar, alface e tomate.",
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
      name: "Hambúrguer Artesanal",
      description:
        "Hambúrguer de carne bovina 180g, queijo cheddar, alface e tomate.",
      observation: ["Pode conter glúten", "Servir com batata frita"],
      value: "R$ 28,00",
      type: "Hambúrguer",
      sideDish: ["Bacon", "Ovo", "Queijo extra"],
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349",
      isVegan: true,
      isFocus: false,
      isVisible: true,
    },
    {
      name: "Pizza Vegana de Legumes",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: ["Sem lactose", "Massa fina"],
      value: "R$ 38,00",
      type: "Teste",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: false,
      isVisible: true,
    },
    {
      name: "Cerveja Amanteigada Vegana sem Obs",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: [],
      value: "R$ 38,00",
      type: "Bebida",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: false,
      isVisible: true,
    },
    {
      name: "Cerveja Amanteigada",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: ["Sem lactose", "Massa fina"],
      value: "R$ 38,00",
      type: "Bebida",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: false,
      isVisible: true,
    },
    {
      name: "Cerveja Amanteigada",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: ["Sem lactose", "Massa fina"],
      value: "R$ 38,00",
      type: "Bebida",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: false,
      isVisible: true,
    },
    {
      name: "Cerveja Amanteigada",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: ["Sem lactose", "Massa fina"],
      value: "R$ 38,00",
      type: "Bebida",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: true,
      isVisible: true,
    },
    {
      name: "Cerveja Amanteigada",
      description:
        "Pizza com massa integral, coberta com abobrinha, berinjela e pimentões.",
      observation: ["Sem lactose", "Massa fina"],
      value: "R$ 38,00",
      type: "Bebida",
      image:
        "https://uploads.metroimg.com/wp-content/uploads/2024/09/19164943/Carcassonne-Pub.jpg",
      isVegan: true,
      isFocus: false,
      isVisible: true,
    },
  ];

  const infos: InfoType[] = [
    {
      name: "PASSAPORTE",
      description: "Acesso a todos os jogos da casa!",
      values: ["R$ 25,00"],
    },
    {
      name: "CARCASSONNE EXPRESS",
      description:
        "A cada 100 reais de consumo você garante o desconto de 15 reais no passaporte de uma pessoa!",
      values: ["R$ 25,00", "R$ 10,00"],
    },
    {
      name: "QUARTASSONNE",
      description:
        "Quarta-feira temos um preço especial no Passaporte e no Carcapromo! Passaporte: R$ 20,00 e Carcapromo: R$ 62,00",
      values: [""],
    },
  ];

  const combos: ComboType[] = [
    {
      name: "CARCAPROMO",
      description: "PIZZA BROTO + REFRI ou SUCO ou SPATEN + PASSAPORTE ",
      value: "R$ 72,00",
    },
  ];

  const descriptionsType: DescriptionTypeProps[] = [
    {
      type: "Pizza",
      description:
        "THEY LOVE TRUTH, JUSTICE, AND A SLICE OF PIZZA AND A SLICE OF PIZZA",
    },
    {
      type: "Teste",
      description:
        "THEY LOVE TRUTH, JUSTICE, AND A SLICE OF PIZZA AND A SLICE OF PIZZA",
    },
  ];

  useEffect(() => {
    addAlert("Bem-vindo ao Carcassonne! 🎲🖤 ");
  }, []);

  const handleScroll = () => {
    const scrollTop = window.scrollY;

    if (scrollTop > 10) {
      setIsMenuFixed(true);
    } else {
      setIsMenuFixed(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const menuTypes = Array.from(new Set(menuItems.map((b) => b.type)));
    setTypes([...types].concat(menuTypes));
  }, []);

  const handleScrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 200,
        behavior: "smooth",
      });
    }
  };

  const centralizeMenuItem = (itemId: string) => {
    if (menuRef.current) {
      const item = document.getElementById(itemId);
      if (item) {
        const itemOffsetLeft = item.offsetLeft;
        const itemWidth = item.offsetWidth;
        const menuWidth = menuRef.current.offsetWidth;

        const scrollPosition = itemOffsetLeft - (menuWidth - itemWidth) / 2;

        menuRef.current.scrollTo({
          left: scrollPosition < 0 ? 0 : scrollPosition,
          behavior: "smooth",
        });
      }
    }
  };

  function toggleScrollLock(lock: boolean) {
    if (lock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }

  const handleTypeClick = (type: string, id: string) => {
    handleScrollToSection(type); // Rola para a seção
    centralizeMenuItem(id); // Centraliza o tipo no menu horizontal
  };

  return (
    <div className="flex flex-col items-center w-full h-screen text-primary-gold p-8">
      {laoding && <LoaderFullscreen />}
      {isMenuFixed && <div className="min-h-[145px] w-screen"></div>}
      <div
        className={`${
          isMenuFixed && "fixed w-full top-0 left-0 py-6"
        } flex items-center flex-col gap-4 bg-primary-black z-50`}
      >
        <section className="flex flex-col item center gap-1 w-fit">
          <h1 className="text-4xl text-center">Cardápio Digital</h1>
          <div className="flex items-center gap-2 justify-center text-center italic font-light w-full">
            <div className="h-[1px] flex-1 bg-primary-gold" />
            <span>Carcassonne Pub</span>
            <div className="h-[1px] flex-1 bg-primary-gold" />
          </div>
        </section>

        {/* Menu de tipos */}
        <section className="w-screen shadow-card">
          <div ref={menuRef} className="flex gap-5 overflow-x-scroll py-2 px-4">
            {types.map((type, index) => (
              <span
                id={`${type}-${index}`}
                key={index}
                onClick={() => handleTypeClick(type, `${type}-${index}`)}
                className="bg-secondary-black/60 rounded py-1 px-2 cursor-pointer hover:bg-secondary-black transition-all"
              >
                {type}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Seções do cardápio */}
      <section id="Avisos" className="flex flex-col items-center w-full mt-8">
        <h2 className="text-4xl w-full text-center">Avisos</h2>
        <div className="h-[1px] w-full bg-primary-gold mb-5 mt-2" />

        {infos.map((info, index) => (
          <InfoCard key={index} info={info} />
        ))}
      </section>

      <section id="Combos" className="flex flex-col items-center w-full mt-8">
        <h2 className="text-4xl w-full text-center">Combos</h2>
        <div className="h-[1px] w-full bg-primary-gold mb-5 mt-2" />
        {combos.map((combo, index) => (
          <ComboCard key={index} combo={combo} />
        ))}
      </section>

      {/* Seções para cada tipo de item */}
      {types
        .filter((type) => type !== "Avisos" && type !== "Combos")
        .map((type, index) => (
          <section
            key={index}
            id={type}
            className="flex flex-col items-center w-full mt-8"
          >
            <h2 className="text-4xl w-full text-center">{type}</h2>
            <div className="h-[1px] w-full bg-primary-gold my-2" />
            <span className="text-xs mb-5 text-center w-full italic">
              {'"'}
              {
                descriptions.filter(
                  (descriptionType) => descriptionType.type === type
                )[0]?.description
              }
              {'"'}
            </span>
            {menuItems
              .filter((item) => item.type === type)
              .map((item, index) => (
                <Fragment key={index}>
                  <MenuCard
                    item={item}
                    onClick={() => {
                      setIsModalOpen(true);
                      setCurrentItem(item);
                      toggleScrollLock(true);
                    }}
                  />
                  {menuItems.filter((item) => item.type === type).length !==
                    1 &&
                    menuItems.filter((item) => item.type === type).length -
                      1 !==
                      index && (
                      <div className="h-[2px] w-full bg-secondary-black" />
                    )}
                </Fragment>
              ))}
          </section>
        ))}
      {currentItem && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setCurrentItem(undefined);
            toggleScrollLock(false);
          }}
          isFixed
        >
          <div className="flex flex-col items-center gap-4 my-2 max-w-[400px] h-full px-2 overflow-y-scroll w-full">
            <h2 className="text-2xl text-center my-2 px-2">
              {currentItem.name}
            </h2>
            <div className="relative h-fit w-fit">
              <img
                className="rounded shadow-card w-[200px]"
                src={currentItem.image}
                alt="menu item"
              />
              {currentItem.isVegan && (
                <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black rounded-full z-10">
                  <LuVegan size={"16px"} className="min-w-[16px]" />
                </div>
              )}
            </div>

            <p className="text-sm">{currentItem.description}</p>
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-2 w-full">
                <span className="font-semibold">Valor:</span>
                <span className="text-sm">{currentItem.value}</span>
              </div>

              {currentItem.sideDish && currentItem.sideDish?.length > 0 && (
                <div className="flex flex-col gap-1 w-full">
                  <span className="font-semibold">Acompanhamentos:</span>
                  <ul>
                    {currentItem.sideDish.map((item, index) => (
                      <li key={index}>
                        {index + 1}- {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentItem.observation &&
                (currentItem.observation?.length > 0 ||
                  currentItem.isVegan) && (
                  <div className="flex flex-col gap-1 w-full">
                    <span className="font-semibold">Observações:</span>
                    <ul>
                      {currentItem.observation.map((item, index) => (
                        <li key={index}>
                          {index + 1}- {item}
                        </li>
                      ))}
                      {currentItem.isVegan && (
                        <li>
                          {currentItem.observation.length + 1}- Item vegano
                        </li>
                      )}
                    </ul>
                  </div>
                )}
            </div>
          </div>
          <div className="py-2">
            <Button
              onClick={() => {
                setIsModalOpen(false);
                setCurrentItem(undefined);
                toggleScrollLock(false);
              }}
            >
              Voltar
            </Button>
          </div>
        </Modal>
      )}
      <ScrollUp />
    </div>
  );
}
