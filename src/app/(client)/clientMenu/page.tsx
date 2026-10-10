"use client";

import "./clientMenu.css";
import {
  MenuItemType,
  InfoType,
  ComboType,
  DescriptionTypeProps,
  TypeOrderType,
  PopupType,
} from "@/types";
import React, {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import InfoCard from "./infoCard";
import ComboCard from "./comboCard";
import MenuCard from "./menuCard";
import MenuSearch from "./menuSearch";
import ItemSheet from "./itemSheet";
import SectionTitle from "./sectionTitle";
import MenuSkeleton, { NavSkeleton } from "./menuSkeleton";
import { afterScrollSettles, flashCard, flashSection, prefersReducedMotion } from "./motion";
import { useScrollReveal } from "./useScrollReveal";
import { useAlert } from "@/contexts/alertProvider";
import ScrollUp from "@/components/scrollUp";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import ComboRepository from "@/services/repositories/ComboRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import Popup from "@/components/popup";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import PopupRepository from "@/services/repositories/PopupRepository";
import { pickActivePopup } from "@/utils/popupSchedule";
import ThemeBand from "@/components/siteTheme/ThemeBand";

/** Âncora do card de cada item (a busca rola a página até ele). */
const menuItemAnchor = (item: MenuItemType) => `menu-item-${item.id ?? item.name}`;

// O cabeçalho encolhe depois de COMPACT_ENTER px de rolagem e só volta a
// abrir perto do topo — a folga evita que ele fique abrindo e fechando
const COMPACT_ENTER = 72;
const COMPACT_EXIT = 24;
// Respiro entre o cabeçalho e o que a página rola para mostrar
const SCROLL_GAP = 12;

export default function ClientMenuPage() {
  const [types, setTypes] = useState(["Avisos", "Combos"]);
  const [sheet, setSheet] = useState<{
    item: MenuItemType;
    origin: HTMLElement | null;
  } | null>(null);
  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [typesOrder, setTypesOrder] = useState<TypeOrderType[]>([]);
  const [popup, setPopup] = useState<PopupType>();
  const [currentMenuItem, setCurrentMenuItem] = useState("");
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [loading, setLoading] = useState(true);

  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const chipRefs = useRef(new Map<string, HTMLSpanElement>());
  // Altura do cabeçalho aberto e compacto (para rolar até o ponto certo)
  const headerHeights = useRef({ expanded: 130, compact: 96 });

  const { addAlert } = useAlert();

  // Cards, avisos e títulos surgem ao entrar na tela
  useScrollReveal();

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

        const currentPopup = pickActivePopup(fetchedPopups);
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

  // Mede o cabeçalho aberto e compacto — sem transição e antes de pintar
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => {
      const current = header.dataset.compact ?? "false";
      header.classList.add("cm-no-transition");
      header.dataset.compact = "false";
      const expanded = header.offsetHeight;
      header.dataset.compact = "true";
      const compactHeight = header.offsetHeight;
      header.dataset.compact = current;
      header.getBoundingClientRect();
      header.classList.remove("cm-no-transition");
      headerHeights.current = { expanded, compact: compactHeight };
    };
    measure();
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    // A fonte do título chega depois e muda a altura
    document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [loading]);

  // Rolagem: linha de progresso (direto no estilo, sem re-render) e
  // cabeçalho compacto
  useEffect(() => {
    let frame = 0;
    let isCompact = window.scrollY > COMPACT_ENTER;
    setCompact(isCompact);
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        const progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
      const next = isCompact ? y > COMPACT_EXIT : y > COMPACT_ENTER;
      if (next !== isCompact) {
        isCompact = next;
        setCompact(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [loading]);

  // Pílula dourada da categoria atual: desliza de uma categoria para a outra
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const nav = menuRef.current;
    if (!pill || !nav) return;
    const place = (slide: boolean) => {
      const chip = chipRefs.current.get(currentMenuItem);
      if (!chip) {
        pill.style.opacity = "0";
        return;
      }
      // Aparecendo agora ou tela mudou de tamanho: vai direto, sem deslizar
      const jump = !slide || pill.style.opacity !== "1";
      if (jump) pill.style.transition = "none";
      pill.style.width = `${chip.offsetWidth}px`;
      pill.style.transform = `translate3d(${chip.offsetLeft}px, -2px, 0)`;
      if (jump) {
        pill.getBoundingClientRect();
        pill.style.transition = "";
      }
      pill.style.opacity = "1";
    };
    place(true);
    // Fonte carregando ou tela girando mudam a largura das categorias
    let initial = true;
    const observer = new ResizeObserver(() => {
      if (initial) {
        initial = false;
        return;
      }
      place(false);
    });
    observer.observe(nav);
    chipRefs.current.forEach((chip) => observer.observe(chip));
    return () => observer.disconnect();
  }, [currentMenuItem, types, menuItems, loading]);

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

  /**
   * Rola até o elemento descontando o cabeçalho fixo — no tamanho que ele vai
   * ter quando a rolagem terminar — e avisa quando chegar.
   */
  const scrollToElement = (element: HTMLElement, onArrive?: () => void) => {
    const { expanded, compact: compactHeight } = headerHeights.current;
    const top = element.getBoundingClientRect().top + window.scrollY;
    const compactTarget = top - compactHeight - SCROLL_GAP;
    const willBeCompact = compactTarget > (compact ? COMPACT_EXIT : COMPACT_ENTER);
    const target = willBeCompact ? compactTarget : top - expanded - SCROLL_GAP;
    setIsAutoScrolling(true);
    window.scrollTo({
      top: Math.max(0, target),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    afterScrollSettles(() => {
      setIsAutoScrolling(false);
      onArrive?.();
    });
  };

  const handleTypeClick = (type: string, id: string) => {
    const section = document.getElementById(type);
    // Ao chegar, o título da categoria brilha (como o item da busca)
    if (section) scrollToElement(section, () => flashSection(section));
    centralizeMenuItem(id);
    setCurrentMenuItem(type);
  };

  // Itens que aparecem na página (Avisos e Combos têm seções próprias)
  const searchableItems = useMemo(
    () =>
      menuItems.filter(
        (item) => item.isVisible && item.type !== "Avisos" && item.type !== "Combos",
      ),
    [menuItems],
  );

  const openSearch = () => {
    setIsSearchOpen(true);
    toggleScrollLock(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    toggleScrollLock(false);
  };

  /** Fecha a busca e rola a página até o item escolhido, que pisca ao chegar. */
  const goToItem = (item: MenuItemType) => {
    closeSearch();
    // Fecha o teclado do celular antes de rolar
    (document.activeElement as HTMLElement | null)?.blur();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const card = document.getElementById(menuItemAnchor(item));
        if (!card) return;
        scrollToElement(card, () => flashCard(card));
        const typeIndex = types.indexOf(item.type);
        if (typeIndex !== -1) {
          setCurrentMenuItem(item.type);
          centralizeMenuItem(`${item.type}-${typeIndex}`);
        }
      }),
    );
  };

  /** Abre o detalhe do item; a foto sai voando do card tocado. */
  const openItem = (item: MenuItemType, origin: HTMLElement | null) => {
    setSheet({ item, origin });
    toggleScrollLock(true);
  };

  const closeItem = () => {
    setSheet(null);
    toggleScrollLock(false);
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

  const renderMenuCard = (item: MenuItemType, index: number) => (
    <MenuCard
      id={menuItemAnchor(item)}
      data-reveal
      index={index}
      item={item}
      onClick={(event) =>
        openItem(item, event.currentTarget.querySelector<HTMLElement>(".cm-img"))
      }
    />
  );

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

        {popup && isPopupOpen && (
          <Popup
            url={popup.src}
            title={popup.title}
            description={popup.description}
            isOpen={isPopupOpen}
            onClose={() => setIsPopupOpen(false)}
          />
        )}

        {/* Header sempre fixo — encolhe ao rolar */}
        <div
          ref={headerRef}
          data-compact={compact}
          className="cm-header fixed top-0 left-0 w-full z-50 flex flex-col bg-primary-black/95 backdrop-blur-[10px] pb-1 border-b border-primary-gold/10"
        >
          {/* Decoração do tema ativo (Configurações → Temas) */}
          <ThemeBand variant="header" />
          <section className="cm-heading flex flex-col items-center px-4">
            <h1 className="cm-title font-cinzel text-xl sm:text-3xl text-center text-shimmer-gold tracking-widest uppercase leading-tight">
              Cardápio Digital
            </h1>
            <div className="cm-brand w-full max-w-xs">
              <div>
                <div className="flex items-center gap-2 w-full pt-1.5">
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
              </div>
            </div>
          </section>

          {/* Nav de categorias: a pílula dourada acompanha a categoria atual */}
          <div
            ref={menuRef}
            className="relative flex gap-2 overflow-x-auto scrollbar-none py-2 px-4"
          >
            <span ref={pillRef} aria-hidden="true" className="cm-nav-pill" />
            {loading ? (
              <NavSkeleton />
            ) : (
              types.map((type, index) => {
                const hasItems = menuItems.some(
                  (item) => item.type === type && item.isVisible,
                );

                if (!hasItems) return null;
                if (type === "???") return null;

                const isActive = currentMenuItem === type;

                return (
                  <span
                    id={`${type}-${index}`}
                    key={index}
                    ref={(element) => {
                      if (element) chipRefs.current.set(type, element);
                      else chipRefs.current.delete(type);
                    }}
                    onClick={() => handleTypeClick(type, `${type}-${index}`)}
                    className={`relative z-[1] flex items-center justify-center whitespace-nowrap rounded-lg py-1.5 px-3 sm:px-4 cursor-pointer transition-all duration-300 border text-xs sm:text-sm font-medium shrink-0 ${
                      isActive
                        ? "border-transparent bg-transparent text-primary-gold -translate-y-0.5"
                        : "border-primary-gold/15 bg-secondary-black/40 text-primary-gold/65 hover:border-primary-gold/40 hover:bg-secondary-black/70 hover:text-primary-gold"
                    }`}
                  >
                    {type}
                  </span>
                );
              })
            )}
          </div>

          {/* Linha dourada que enche conforme a pessoa rola o cardápio */}
          <div className="relative h-px w-full mt-1">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
            <div ref={progressRef} className="cm-progress" />
          </div>
        </div>

        {/* Espaço reservado para o header fixo */}
        <div className="h-[130px] sm:h-[140px] w-full shrink-0" />

        {/* Busca: botão junto dos outros flutuantes (ScrollUp), abre um modal */}
        <MenuSearch
          isOpen={isSearchOpen}
          onClose={closeSearch}
          items={searchableItems}
          onPick={goToItem}
        />

        {loading ? (
          <MenuSkeleton />
        ) : (
          <>
            {/* Avisos */}
            {infos.length > 0 && (
              <section
                id="Avisos"
                className="flex flex-col items-center w-full mt-4 bg-secondary-black/60 p-3 sm:p-4 rounded-xl shadow-card border border-primary-gold/20"
              >
                <SectionTitle title="Avisos" />
                {[...infos]
                  .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0))
                  .map((info, index) => (
                    <InfoCard key={index} info={info} data-reveal />
                  ))}
              </section>
            )}

            {/* Combos */}
            {combos.length > 0 && (
              <section
                id="Combos"
                className="flex flex-col items-center w-full mt-4 bg-secondary-black/60 p-3 sm:p-4 rounded-xl shadow-card border border-primary-gold/20"
              >
                <SectionTitle title="Combos" />
                {combos.map((combo, index) => (
                  <ComboCard key={index} combo={combo} data-reveal />
                ))}
              </section>
            )}

            {/* Type sections */}
            {types
              .filter((type) => type !== "Avisos" && type !== "Combos")
              .map((type, index) => {
                const filteredItems = menuItems
                  .filter((item) => item.type === type && item.isVisible)
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
                    <SectionTitle
                      title={type}
                      description={
                        descriptions.find(
                          (descriptionType) => descriptionType.type === type,
                        )?.description
                      }
                    />

                    {itemsWithoutSubtype.map((item, index, array) => (
                      <Fragment key={`no-subtype-${index}`}>
                        {renderMenuCard(item, index)}
                        {array.length !== 1 && index !== array.length - 1 && (
                          <div className="h-px w-full bg-primary-gold/10" />
                        )}
                      </Fragment>
                    ))}

                    {orderedSubtypeEntries.map(([subtype, items]) => (
                      <div key={subtype} className="w-full mt-4">
                        <div data-reveal className="flex items-center gap-2 mb-3">
                          <div className="h-px flex-1 bg-primary-gold/20" />
                          <span className="text-base font-semibold text-primary-gold/80">
                            {subtype}
                          </span>
                          <div className="h-px flex-1 bg-primary-gold/20" />
                        </div>
                        {items.map((item, index, array) => (
                          <div className="mt-3" key={`${subtype}-${index}`}>
                            {renderMenuCard(item, index)}
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
          </>
        )}

        {/* Detalhe do item: gaveta no celular, cartão no computador */}
        {sheet && (
          <ItemSheet
            key={menuItemAnchor(sheet.item)}
            item={sheet.item}
            origin={sheet.origin}
            onClosed={closeItem}
          />
        )}
        <ScrollUp onSearch={openSearch} searchHintReady={!loading && !isPopupOpen} />
      </div>
    </>
  );
}
