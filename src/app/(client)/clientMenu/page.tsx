"use client";

import {
  MenuItemType,
  InfoType,
  ComboType,
  DescriptionTypeProps,
  TypeOrderType,
  PopupType,
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
import Popup from "@/components/popup";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import PopupRepository from "@/services/repositories/PopupRepositoire";
import { FaAngleLeft, FaAngleRight, FaSearch } from "react-icons/fa";
import Input from "@/components/input";

export default function ClientMenuPage() {
  const [types, setTypes] = useState(["Avisos", "Combos"]);
  const [isMenuFixed, setIsMenuFixed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType | undefined>();
  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [typesOrder, setTypesOrder] = useState<TypeOrderType[]>([]);
  const [popup, setPopup] = useState<PopupType>();
  const [currentMenuItem, setCurrentMenuItem] = useState("");
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [searchCardExpanded, setSearchCardExpanded] = useState(false);
  const [searchItem, setSearchItem] = useState("");

  const [laoding, setLoading] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchTypesOrder = async () => {
      setLoading(true);
      try {
        const fecthedTypesOrder = await TypesOrderRepository.getAll();
        setTypesOrder(fecthedTypesOrder);
      } catch (error) {
        addAlert(`Erro ao carregar tipos: ${error}`);
      } finally {
        setLoading(false);
      }
    };

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
        setMenuItems(fetchedItems);

        const allTypes = Array.from(new Set([...menuTypes]));
        setTypes(allTypes);
      } catch (error) {
        addAlert(`Erro ao carregar itens: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchPopups = async () => {
      setLoading(true);
      try {
        const fetchedPopups = await PopupRepository.getAll();

        const currentPopup = fetchedPopups.filter((popup) => popup.isActive);
        if (currentPopup.length > 0) {
          setPopup(currentPopup[0]);
          setIsPopupOpen(true);
        }
      } catch (error) {
        addAlert(`Erro ao carregar configurações gerais: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTypesOrder();
    fetchPopups();
    fetchMenuItems();
    fetchCombos();
    fetchInfos();
    fetchDescriptions();
  }, []);

  useEffect(() => {
    if (types.length > 0 && typesOrder.length > 0) {
      const orderedTypes = [...types].sort((a, b) => {
        const orderA =
          typesOrder.find((t) => t.type.name === a)?.type.order ?? 999;
        const orderB =
          typesOrder.find((t) => t.type.name === b)?.type.order ?? 999;
        return orderA - orderB;
      });

      const baseTypes = ["Avisos", "Combos"];
      setTypes([...baseTypes, ...orderedTypes]);
    } else {
      const baseTypes = ["Avisos", "Combos"];

      setTypes([...baseTypes, ...types]);
    }
  }, [typesOrder]);

  const handleScroll = () => {
    const scrollTop = window.scrollY;

    if (scrollTop > 0) {
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
    setIsAutoScrolling(true);
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 200,
        behavior: "smooth",
      });
    }

    setTimeout(() => {
      setIsAutoScrolling(false);
    }, 800);
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
    setCurrentMenuItem(type);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isAutoScrolling) {
            const id = entry.target.getAttribute("id");
            const index = types.findIndex((type) => type === id);
            if (id && index !== -1) {
              centralizeMenuItem(`${id}-${index}`);
              setTimeout(() => {
                setCurrentMenuItem(id);
              }, 100);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1, // % da seção visível
      }
    );

    types.forEach((type) => {
      const section = document.getElementById(type);
      if (section) {
        observer.observe(section);
      }
    }, []);

    return () => {
      types.forEach((type) => {
        const section = document.getElementById(type);
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  });

  return (
    <div className="flex flex-col items-center w-full h-screen text-primary-gold px-8">
      {laoding && <LoaderFullscreen />}
      {popup && isPopupOpen && (
        <Popup
          url={popup.src}
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
        />
      )}
      {isMenuFixed && <div className="min-h-[145px] w-screen"></div>}

      <div
        className={` backdrop-blur-[2px] p-2 rounded-md ${searchCardExpanded ? "gap-2" : "gap-0"} flex items-center justify-center fixed bottom-2 left-2 z-10 bg-dark-black/80 shadow-card-light`}
      >
        <div
          onClick={() => setSearchCardExpanded(!searchCardExpanded)}
          className="flex items-center text-primary duration-300 ease-in-out opacity-100 cursor-pointer p-1"
        >
          <FaSearch size={"20px"} className={`min-w-[20px]`} />
          {searchCardExpanded ? (
            <FaAngleLeft size={"14px"} className={`min-w-[14px]`} />
          ) : (
            <FaAngleRight size={"14px"} className={`min-w-[14px]`} />
          )}
        </div>
        <div
          className={`w-0 ${searchCardExpanded && "w-[200px]"} transition-all duration-300`}
        >
          {searchCardExpanded && (
            <Input
              autoFocus
              placeholder="procurar item..."
              setValue={(e) => setSearchItem(e.target.value)}
              value={searchItem}
            />
          )}
        </div>
      </div>
      <div
        className={`${
          isMenuFixed && "fixed w-full top-0 left-0 "
        } flex items-center flex-col gap-4 bg-primary-black/90 backdrop-blur-[8px] z-50 pt-6`}
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
          {/* <div ref={menuRef} className="flex gap-5 overflow-x-scroll py-2 px-4">
            {types.map((type, index) => (
              <span
                id={`${type}-${index}`}
                key={index}
                onClick={() => handleTypeClick(type, `${type}-${index}`)}
                className={`flex items-center justify-center bg-secondary-black/60 rounded py-1 px-2 cursor-pointer hover:bg-secondary-black transition-all ${
                  currentMenuItem === type &&
                  "font-semibold -translate-y-1 !bg-secondary-black shadow-card text-md mx-1 px-3"
                }`}
              >
                {type}
              </span>
            ))}
          </div> */}
          <div ref={menuRef} className="flex gap-5 overflow-x-scroll py-2 px-4">
            {types.map((type, index) => {
              const hasItems = menuItems.some(
                (item) =>
                  item.type === type &&
                  item.isVisible &&
                  (!searchItem.trim() ||
                    item.name
                      .toLowerCase()
                      .includes(searchItem.toLowerCase()) ||
                    item.description
                      ?.toLowerCase()
                      .includes(searchItem.toLowerCase()))
              );

              if (!hasItems) return null;

              return (
                <span
                  id={`${type}-${index}`}
                  key={index}
                  onClick={() => handleTypeClick(type, `${type}-${index}`)}
                  className={`flex items-center justify-center bg-secondary-black/60 rounded py-1 px-2 cursor-pointer hover:bg-secondary-black transition-all ${
                    currentMenuItem === type &&
                    "font-semibold -translate-y-1 !bg-secondary-black shadow-card text-md mx-1 px-3"
                  }`}
                >
                  {type}
                </span>
              );
            })}
          </div>
        </section>
      </div>

      {/* Seções do cardápio */}
      {infos.length > 0 && !searchItem.trim() && (
        <section
          id="Avisos"
          className="flex flex-col items-center w-full mt-8 bg-secondary-black/60 p-3 rounded-sm shadow-card"
        >
          <h2 className="text-4xl w-full text-center">Avisos</h2>
          <div className="h-[1px] w-full bg-primary-gold mb-5 mt-2" />

          {infos.map((info, index) => (
            <InfoCard key={index} info={info} />
          ))}
        </section>
      )}

      {combos.length > 0 && !searchItem.trim() && (
        <section
          id="Combos"
          className="flex flex-col items-center w-full mt-8 bg-secondary-black/60 p-3 rounded-sm shadow-card"
        >
          <h2 className="text-4xl w-full text-center">Combos</h2>
          <div className="h-[1px] w-full bg-primary-gold mb-5 mt-2" />
          {combos.map((combo, index) => (
            <ComboCard key={index} combo={combo} />
          ))}
        </section>
      )}

      {types
        .filter((type) => type !== "Avisos" && type !== "Combos")
        .map((type, index) => {
          const filteredItems = menuItems
            .filter((item) => item.type === type && item.isVisible)
            .filter((item) => {
              if (!searchItem.trim()) return true;
              const term = searchItem.toLowerCase();
              return (
                item.name.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term)
              );
            })
            .sort((a, b) => {
              if (a.isFocus !== b.isFocus) {
                return b.isFocus ? 1 : -1;
              }
              return a.name.localeCompare(b.name);
            });

          if (filteredItems.length === 0) return null; // 🔥 esconde a seção inteira

          const itemsWithoutSubtype = filteredItems.filter(
            (item) => !item.subtype
          );
          const itemsWithSubtype = filteredItems.filter((item) => item.subtype);

          const groupedBySubtype = itemsWithSubtype.reduce(
            (acc, item) => {
              const key = item.subtype as string;
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            },
            {} as Record<string, typeof menuItems>
          );

          const typeOrder = typesOrder.find((t) => t.type.name === type);

          const orderedSubtypeEntries = Object.entries(groupedBySubtype).sort(
            ([a], [b]) => {
              const aOrder = typeOrder?.type.subtypes.find(
                (s) => s.name === a
              )?.order;
              const bOrder = typeOrder?.type.subtypes.find(
                (s) => s.name === b
              )?.order;

              const aHasOrder = aOrder !== undefined;
              const bHasOrder = bOrder !== undefined;

              if (aHasOrder && !bHasOrder) return -1;
              if (!aHasOrder && bHasOrder) return 1;

              if (aHasOrder && bHasOrder) {
                return aOrder! - bOrder!;
              }

              return a.localeCompare(b);
            }
          );

          return (
            <section
              key={index}
              id={type}
              className="flex flex-col items-center w-full mt-8"
            >
              <h2 className="text-4xl w-full text-center">{type}</h2>
              <div className="h-[1px] w-full bg-primary-gold my-2" />
              <span className="text-xs mb-5 text-center w-full italic">
                {
                  descriptions.find(
                    (descriptionType) => descriptionType.type === type
                  )?.description
                }
              </span>

              {/* Itens sem subtype */}
              {itemsWithoutSubtype.map((item, index, array) => (
                <Fragment key={`no-subtype-${index}`}>
                  <MenuCard
                    index={index}
                    item={item}
                    onClick={() => {
                      setIsModalOpen(true);
                      setCurrentItem(item);
                      toggleScrollLock(true);
                    }}
                  />
                  {array.length !== 1 && index !== array.length - 1 && (
                    <div className="h-[2px] w-full bg-secondary-black" />
                  )}
                </Fragment>
              ))}

              {/* Agrupamento por subtype */}
              {orderedSubtypeEntries.map(([subtype, items]) => (
                <div key={subtype} className="w-full">
                  <span className="text-xl font-semibold text-center">
                    {subtype}
                  </span>
                  {items.map((item, index, array) => (
                    <div className="mt-3" key={`${subtype}-${index}`}>
                      <MenuCard
                        index={index}
                        item={item}
                        onClick={() => {
                          setIsModalOpen(true);
                          setCurrentItem(item);
                          toggleScrollLock(true);
                        }}
                      />
                      {array.length !== 1 && index !== array.length - 1 && (
                        <div className="h-[2px] w-full bg-secondary-black" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          );
        })}

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
          <div className="flex flex-col items-center gap-4 my-2 max-w-[400px] h-full px-2 overflow-y-scroll w-full sm:bg-secondary-black/60 py-3 sm:px-6 sm:h-fit sm:shadow-2xl rounded-sm">
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
                  <LuVegan size={"22px"} className="min-w-[22px]" />
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
