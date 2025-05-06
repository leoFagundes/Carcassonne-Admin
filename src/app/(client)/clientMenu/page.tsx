"use client";

import {
  MenuItemType,
  InfoType,
  ComboType,
  DescriptionTypeProps,
  GeneralConfigsType,
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
import ComboRepository from "@/services/repositories/ComboRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import Popup from "@/components/popup";

export default function ClientMenuPage() {
  const [types, setTypes] = useState(["Avisos", "Combos"]);
  const [isMenuFixed, setIsMenuFixed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType | undefined>();

  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [generalConfigs, setGeneralConfigs] = useState<GeneralConfigsType>();

  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const [laoding, setLoading] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchDescriptions = async () => {
      setLoading(true);
      try {
        const fecthedDescriptions = await DescriptionRepository.getAll();
        setDescriptions(fecthedDescriptions);
      } catch (error) {
        addAlert(`Erro ao carregar descrições: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchInfos = async () => {
      setLoading(true);
      try {
        const fetchedInfos = await InfoRepository.getAll();
        setInfos(fetchedInfos);
      } catch (error) {
        addAlert(`Erro ao carregar avisos: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchCombos = async () => {
      setLoading(true);
      try {
        const fetchedCombos = await ComboRepository.getAll();
        setCombos(fetchedCombos);
      } catch (error) {
        addAlert(`Erro ao carregar combos: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchMenuItems = async () => {
      setLoading(true);
      try {
        const fetchedItems = await MenuItemRepository.getAll();
        const menuTypes = Array.from(new Set(fetchedItems.map((b) => b.type)));
        setTypes([...types].concat(menuTypes));
        setMenuItems(fetchedItems);
      } catch (error) {
        addAlert(`Erro ao carregar itens: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchGeneralConfigs = async () => {
      setLoading(true);
      try {
        const configs = await GeneralConfigsRepository.get();

        if (configs) {
          setGeneralConfigs(configs);
          if (configs.popUpImage) {
            setIsPopupOpen(true);
          }
        }
      } catch (error) {
        addAlert(`Erro ao carregar configurações gerais: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchGeneralConfigs();
    fetchMenuItems();
    fetchCombos();
    fetchInfos();
    fetchDescriptions();
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
      {generalConfigs?.popUpImage && isPopupOpen && (
        <Popup
          url={generalConfigs.popUpImage}
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
        />
      )}
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
      {infos.length > 0 && (
        <section id="Avisos" className="flex flex-col items-center w-full mt-8">
          <h2 className="text-4xl w-full text-center">Avisos</h2>
          <div className="h-[1px] w-full bg-primary-gold mb-5 mt-2" />

          {infos.map((info, index) => (
            <InfoCard key={index} info={info} />
          ))}
        </section>
      )}

      {combos.length > 0 && (
        <section id="Combos" className="flex flex-col items-center w-full mt-8">
          <h2 className="text-4xl w-full text-center">Combos</h2>
          <div className="h-[1px] w-full bg-primary-gold mb-5 mt-2" />
          {combos.map((combo, index) => (
            <ComboCard key={index} combo={combo} />
          ))}
        </section>
      )}

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
                    index={index}
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
                src={
                  currentItem.image
                    ? currentItem.image
                    : "images/patternMenuImage.png"
                }
                alt="menu item"
              />
              {currentItem.isVegan && (
                <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black rounded-full z-10">
                  <LuVegan size={"16px"} className="min-w-[16px]" />
                </div>
              )}
            </div>

            <p className="text-sm whitespace-pre-line">
              {currentItem.description}
            </p>
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
                      <li key={index}>- {item}</li>
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
                        <li key={index}>- {item}</li>
                      ))}
                      {currentItem.isVegan && <li>- Item vegano</li>}
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
