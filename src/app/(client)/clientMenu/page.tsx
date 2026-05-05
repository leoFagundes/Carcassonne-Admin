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
import { FiX } from "react-icons/fi";
import Input from "@/components/input";

export default function ClientMenuPage() {
  const [types, setTypes] = useState(["Avisos", "Combos"]);
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
  const [loading, setLoading] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          fetchedTypesOrder,
          fetchedPopups,
          fetchedItems,
          fetchedCombos,
          fetchedInfos,
          fetchedDescriptions,
        ] = await Promise.all([
          TypesOrderRepository.getAll(),
          PopupRepository.getAll(),
          MenuItemRepository.getAll(),
          ComboRepository.getAll(),
          InfoRepository.getAll(),
          DescriptionRepository.getAll(),
        ]);

        setTypesOrder(fetchedTypesOrder);
        setMenuItems(fetchedItems);
        setCombos(fetchedCombos);
        setInfos(fetchedInfos);
        setDescriptions(fetchedDescriptions);

        const currentPopup = fetchedPopups.find((popup) => popup.isActive);
        if (currentPopup) {
          setPopup(currentPopup);
          setIsPopupOpen(true);
        }

        const menuTypes = Array.from(new Set(fetchedItems.map((b) => b.type)));

        const orderedTypes = menuTypes.sort((a, b) => {
          const orderA =
            fetchedTypesOrder.find((t) => t.type.name === a)?.type.order ?? 999;
          const orderB =
            fetchedTypesOrder.find((t) => t.type.name === b)?.type.order ?? 999;
          return orderA - orderB;
        });

        const baseTypes = ["Avisos", "Combos"];
        const finalTypes = [
          ...baseTypes,
          ...orderedTypes.filter((t) => !baseTypes.includes(t)),
        ];

        setTypes(finalTypes);
      } catch (error) {
        addAlert(`Erro ao carregar dados: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleScrollToSection = (sectionId: string) => {
    setIsAutoScrolling(true);
    const section = document.getElementById(sectionId);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 130,
        behavior: "smooth",
      });
    }
    setTimeout(() => setIsAutoScrolling(false), 800);
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
    document.body.style.overflow = lock ? "hidden" : "auto";
  }

  const handleTypeClick = (type: string, id: string) => {
    handleScrollToSection(type);
    centralizeMenuItem(id);
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
              setTimeout(() => setCurrentMenuItem(id), 100);
            }
          }
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    types.forEach((type) => {
      const section = document.getElementById(type);
      if (section) observer.observe(section);
    }, []);

    return () => {
      types.forEach((type) => {
        const section = document.getElementById(type);
        if (section) observer.unobserve(section);
      });
    };
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }

        @keyframes shimmer-gold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s linear infinite;
        }
        .hex-bg-menu {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="relative flex flex-col items-center w-full min-h-screen text-primary-gold px-4 sm:px-8 pb-10">
        {/* Background effects */}
        <div className="hex-bg-menu fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        {loading && <LoaderFullscreen />}
        {popup && isPopupOpen && (
          <Popup
            url={popup.src}
            isOpen={isPopupOpen}
            onClose={() => setIsPopupOpen(false)}
          />
        )}

        {/* Header sempre fixo */}
        <div className="fixed top-0 left-0 w-full z-50 flex flex-col bg-primary-black/95 backdrop-blur-[10px] pt-4 pb-1 border-b border-primary-gold/10">
          <section className="flex flex-col items-center gap-1.5 px-4 mb-3">
            <h1 className="font-cinzel text-xl sm:text-3xl text-center text-shimmer-gold tracking-widest uppercase leading-tight">
              Cardápio Digital
            </h1>
            <div className="flex items-center gap-2 w-full max-w-xs">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
              <svg
                width="7"
                height="7"
                viewBox="0 0 10 10"
                className="text-primary-gold/50 shrink-0"
              >
                <polygon
                  points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
                  fill="currentColor"
                />
              </svg>
              <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-primary-gold/50 whitespace-nowrap">
                Carcassonne Pub
              </span>
              <svg
                width="7"
                height="7"
                viewBox="0 0 10 10"
                className="text-primary-gold/50 shrink-0"
              >
                <polygon
                  points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
                  fill="currentColor"
                />
              </svg>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
            </div>
          </section>

          {/* Nav de categorias */}
          <div
            ref={menuRef}
            className="flex gap-2 overflow-x-auto scrollbar-none py-2 px-4"
          >
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
                      .includes(searchItem.toLowerCase())),
              );

              if (!hasItems) return null;
              if (type === "???") return null;

              return (
                <span
                  id={`${type}-${index}`}
                  key={index}
                  onClick={() => handleTypeClick(type, `${type}-${index}`)}
                  className={`flex items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 sm:px-4 cursor-pointer transition-all duration-300 border text-xs sm:text-sm font-medium shrink-0 ${
                    currentMenuItem === type
                      ? "border-primary-gold/70 bg-secondary-black text-primary-gold shadow-[0_0_12px_rgba(230,197,107,0.15)] -translate-y-0.5"
                      : "border-primary-gold/15 bg-secondary-black/40 text-primary-gold/65 hover:border-primary-gold/40 hover:bg-secondary-black/70 hover:text-primary-gold"
                  }`}
                >
                  {type}
                </span>
              );
            })}
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent mt-1" />
        </div>

        {/* Espaço reservado para o header fixo */}
        <div className="h-[130px] sm:h-[140px] w-full shrink-0" />

        {/* Search floating button */}
        <div
          className={`backdrop-blur-[4px] p-2 rounded-xl ${searchCardExpanded ? "gap-2" : "gap-0"} flex items-center justify-center fixed bottom-3 left-3 z-40 bg-dark-black/85 border border-primary-gold/20 shadow-card`}
        >
          <div
            onClick={() => setSearchCardExpanded(!searchCardExpanded)}
            className="flex items-center text-primary-gold/70 hover:text-primary-gold duration-300 ease-in-out cursor-pointer p-1"
          >
            <FaSearch size={"18px"} className="min-w-[18px]" />
            {searchCardExpanded ? (
              <FaAngleLeft size={"13px"} className="min-w-[13px]" />
            ) : (
              <FaAngleRight size={"13px"} className="min-w-[13px]" />
            )}
          </div>
          <div
            className={`w-0 ${searchCardExpanded && "w-[180px] sm:w-[200px]"} transition-all duration-300 overflow-hidden`}
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

        {/* Avisos */}
        {infos.length > 0 && !searchItem.trim() && (
          <section
            id="Avisos"
            className="flex flex-col items-center w-full mt-4 bg-secondary-black/60 p-3 sm:p-4 rounded-xl shadow-card border border-primary-gold/20"
          >
            <h2 className="text-3xl sm:text-4xl w-full text-center">Avisos</h2>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/50 to-transparent mb-4 mt-2" />
            {[...infos]
              .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0))
              .map((info, index) => (
                <InfoCard key={index} info={info} />
              ))}
          </section>
        )}

        {/* Combos */}
        {combos.length > 0 && !searchItem.trim() && (
          <section
            id="Combos"
            className="flex flex-col items-center w-full mt-4 bg-secondary-black/60 p-3 sm:p-4 rounded-xl shadow-card border border-primary-gold/20"
          >
            <h2 className="text-3xl sm:text-4xl w-full text-center">Combos</h2>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/50 to-transparent mb-4 mt-2" />
            {combos.map((combo, index) => (
              <ComboCard key={index} combo={combo} />
            ))}
          </section>
        )}

        {/* Type sections */}
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
                if (a.isFocus !== b.isFocus) return b.isFocus ? 1 : -1;
                return a.name.localeCompare(b.name);
              });

            if (filteredItems.length === 0) return null;

            const itemsWithoutSubtype = filteredItems.filter(
              (item) => !item.subtype,
            );
            const itemsWithSubtype = filteredItems.filter(
              (item) => item.subtype,
            );

            const groupedBySubtype = itemsWithSubtype.reduce(
              (acc, item) => {
                const key = item.subtype as string;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              },
              {} as Record<string, typeof menuItems>,
            );

            const typeOrder = typesOrder.find((t) => t.type.name === type);

            const orderedSubtypeEntries = Object.entries(groupedBySubtype).sort(
              ([a], [b]) => {
                const aOrder = typeOrder?.type.subtypes.find(
                  (s) => s.name === a,
                )?.order;
                const bOrder = typeOrder?.type.subtypes.find(
                  (s) => s.name === b,
                )?.order;

                const aHasOrder = aOrder !== undefined;
                const bHasOrder = bOrder !== undefined;

                if (aHasOrder && !bHasOrder) return -1;
                if (!aHasOrder && bHasOrder) return 1;
                if (aHasOrder && bHasOrder) return aOrder! - bOrder!;

                return a.localeCompare(b);
              },
            );

            return (
              <section
                key={index}
                id={type}
                className="flex flex-col items-center w-full mt-4 bg-secondary-black/60 p-3 sm:p-4 rounded-xl border border-primary-gold/20 shadow-card"
              >
                <h2 className="text-3xl sm:text-4xl w-full text-center">
                  {type}
                </h2>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/50 to-transparent my-2" />
                <span className="text-xs mb-4 text-center w-full italic text-primary-gold/65">
                  {
                    descriptions.find(
                      (descriptionType) => descriptionType.type === type,
                    )?.description
                  }
                </span>

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
                      <div className="h-px w-full bg-primary-gold/10" />
                    )}
                  </Fragment>
                ))}

                {orderedSubtypeEntries.map(([subtype, items]) => (
                  <div key={subtype} className="w-full mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-primary-gold/20" />
                      <span className="text-base font-semibold text-primary-gold/80">
                        {subtype}
                      </span>
                      <div className="h-px flex-1 bg-primary-gold/20" />
                    </div>
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
                          <div className="h-px w-full bg-primary-gold/10" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            );
          })}

        {/* Modal */}
        {currentItem && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setCurrentItem(undefined);
              toggleScrollLock(false);
            }}
            isFixed
            noPadding
            patternCloseButton={false}
          >
            <div className="w-full h-full flex flex-col overflow-hidden bg-primary-black sm:w-[420px] sm:h-auto sm:max-h-[88vh] sm:rounded-2xl sm:border sm:border-primary-gold/20 sm:bg-secondary-black/90">
              {/* Hero image */}
              <div className="relative w-full h-[240px] shrink-0">
                <img
                  className="w-full h-full object-cover"
                  src={
                    currentItem.image
                      ? currentItem.image
                      : "images/patternMenuImage.png"
                  }
                  alt="menu item"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-black via-primary-black/20 to-transparent" />

                {/* Close button */}
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setCurrentItem(undefined);
                    toggleScrollLock(false);
                  }}
                  className="absolute top-4 right-4 p-2 bg-primary-black/60 backdrop-blur-sm rounded-full border border-primary-gold/20 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/50 transition-all"
                >
                  <FiX size={18} />
                </button>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {currentItem.isFocus && (
                    <span className="px-2 py-0.5 bg-primary-gold text-primary-black text-xs font-bold rounded-full">
                      Destaque
                    </span>
                  )}
                  {currentItem.isVegan && (
                    <div className="p-1.5 bg-primary-black/70 backdrop-blur-sm rounded-full border border-primary-gold/30 w-fit">
                      <LuVegan size={18} className="text-primary-gold" />
                    </div>
                  )}
                </div>

                {/* Name + price overlaid */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <p className="text-2xl font-bold text-primary drop-shadow-lg leading-tight">
                    {currentItem.name}
                  </p>
                  {currentItem.value && (
                    <span className="text-primary-gold font-semibold text-base">
                      {currentItem.value}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4 sm:overflow-visible sm:flex-none">
                {currentItem.description && (
                  <p className="text-sm text-primary-gold/85 whitespace-pre-line leading-relaxed">
                    {currentItem.description}
                  </p>
                )}

                {currentItem.sideDish && currentItem.sideDish.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                      Acompanhamentos
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {currentItem.sideDish.map((dish, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-primary-gold/80"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                          {dish}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentItem.observation &&
                  (currentItem.observation.length > 0 ||
                    currentItem.isVegan) && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                        Observações
                      </span>
                      <ul className="flex flex-col gap-1.5">
                        {currentItem.observation.map((obs, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-primary-gold/80"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                            {obs}
                          </li>
                        ))}
                        {currentItem.isVegan && (
                          <li className="flex items-start gap-2 text-sm text-primary-gold/80">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-gold/40 shrink-0" />
                            Item vegano
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 py-4 border-t border-primary-gold/10">
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
            </div>
          </Modal>
        )}
        <ScrollUp />
      </div>
    </>
  );
}
