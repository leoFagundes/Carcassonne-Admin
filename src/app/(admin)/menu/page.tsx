"use client";

import { ComboType, InfoType, MenuItemType, TypeOrderType } from "@/types";
import { useEffect, useMemo, useState } from "react";
import {
  LuBoxes,
  LuEyeOff,
  LuFileCode2,
  LuLink,
  LuMegaphone,
  LuPizza,
  LuSparkles,
  LuUtensils,
  LuVegan,
} from "react-icons/lu";
import Modal from "@/components/modal";
import MenuForms from "@/components/menuForms";
import MenuCard from "./menuCard";
import InfoCard from "./infoCard";
import ComboCard from "./comboCard";
import InfoForms from "@/components/infoForms";
import ComboForms from "@/components/comboForms";
import { patternCombo, patternInfo, patternMenuItem } from "@/utils/patternValues";
import InfoRepository from "@/services/repositories/InfoRepository";
import { useAlert } from "@/contexts/alertProvider";
import ComboRepository from "@/services/repositories/ComboRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/Tooltip";
import { foldText, searchWords } from "@/components/showcase/search";
import {
  CatalogEmpty,
  CatalogItems,
  CatalogSearch,
  CatalogSection,
  CatalogSkeleton,
  FilterPills,
  ViewToggle,
  useCatalogView,
} from "@/components/adminCatalog";

type Status = "all" | "hidden" | "focus" | "vegan";

const INFOS = "Avisos";
const COMBOS = "Combos";

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [category, setCategory] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType>(patternMenuItem);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<InfoType>(patternInfo);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [currentCombo, setCurrentCombo] = useState<ComboType>(patternCombo);
  const [loading, setLoading] = useState(true);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [typesOrder, setTypesOrder] = useState<TypeOrderType[]>([]);
  const [view, setView] = useCatalogView("carcassonne-admin-menu-view");

  const { addAlert } = useAlert();
  const router = useRouter();

  const fetchAll = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [items, fetchedCombos, fetchedInfos, order] = await Promise.all([
        MenuItemRepository.getAll(),
        ComboRepository.getAll(),
        InfoRepository.getAll(),
        TypesOrderRepository.getAll(),
      ]);
      setMenuItems(items);
      setCombos(fetchedCombos);
      setInfos(fetchedInfos);
      setTypesOrder(order);
    } catch (error) {
      addAlert(`Erro ao carregar o cardápio: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
  }, []);

  // Fecham a edição e atualizam a lista (pode ter salvo ou excluído)
  const closeMenuModal = () => {
    setIsMenuModalOpen(false);
    setCurrentItem(patternMenuItem);
    fetchAll();
  };
  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setCurrentInfo(patternInfo);
    fetchAll();
  };
  const closeComboModal = () => {
    setIsComboModalOpen(false);
    setCurrentCombo(patternCombo);
    fetchAll();
  };

  /** Liga/desliga na hora; se o banco recusar, volta como estava. */
  const updateItem = async (item: MenuItemType, patch: Partial<MenuItemType>) => {
    if (!item.id) {
      addAlert("ID inválido");
      return;
    }
    const updated = { ...item, ...patch };
    const replace = (next: MenuItemType) =>
      setMenuItems((list) => list.map((current) => (current.id === item.id ? next : current)));
    replace(updated);
    const ok = await MenuItemRepository.update(item.id, patch);
    if (!ok) {
      replace(item);
      addAlert(`Não foi possível atualizar ${item.name}. Tente novamente.`);
      return;
    }
    if ("isVisible" in patch) {
      addAlert(`${item.name} ${updated.isVisible ? "está visível no cardápio" : "foi ocultado do cardápio"}`);
    } else if ("isFocus" in patch) {
      addAlert(`${item.name} ${updated.isFocus ? "agora está em destaque" : "não está mais em destaque"}`);
    } else if ("isVegan" in patch) {
      addAlert(`${item.name} ${updated.isVegan ? "agora é vegano" : "não é mais vegano"}`);
    }
  };

  const words = useMemo(() => searchWords(search), [search]);
  const matches = (text: string) => {
    if (!words.length) return true;
    const folded = foldText(text);
    return words.every((word) => folded.includes(word));
  };

  // Categorias na mesma ordem do cardápio do cliente (as sem ordem vão no fim)
  const typeNames = useMemo(() => {
    const orderOf = (type: string) =>
      typesOrder.find((entry) => entry.type.name === type)?.type.order ?? 999;
    return Array.from(new Set(menuItems.map((item) => item.type))).sort(
      (a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b, "pt-BR"),
    );
  }, [menuItems, typesOrder]);

  const subtypeOrder = (type: string, subtype?: string) =>
    typesOrder.find((entry) => entry.type.name === type)?.type.subtypes.find((s) => s.name === subtype)
      ?.order ?? 999;

  const matchesStatus = (item: MenuItemType) =>
    status === "all" ||
    (status === "hidden" && !item.isVisible) ||
    (status === "focus" && item.isFocus) ||
    (status === "vegan" && item.isVegan);

  const searchedItems = menuItems.filter((item) =>
    matches(`${item.name} ${item.description} ${item.type} ${item.subtype ?? ""}`),
  );
  const filteredItems = searchedItems.filter(matchesStatus);
  const filteredInfos = infos
    .filter((info) => matches(`${info.name} ${info.description} ${info.values.join(" ")}`))
    .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0));
  const filteredCombos = combos.filter((combo) =>
    matches(`${combo.name} ${combo.description} ${combo.value}`),
  );

  // Avisos e combos não têm situação (oculto, destaque, vegano)
  const showInfos = status === "all" && (category === "" || category === INFOS);
  const showCombos = status === "all" && (category === "" || category === COMBOS);

  const sections = typeNames
    .filter((type) => category === "" || category === type)
    .map((type) => ({
      type,
      items: filteredItems
        .filter((item) => item.type === type)
        .sort(
          (a, b) =>
            subtypeOrder(type, a.subtype) - subtypeOrder(type, b.subtype) ||
            (a.subtype ?? "").localeCompare(b.subtype ?? "", "pt-BR") ||
            Number(b.isFocus) - Number(a.isFocus) ||
            a.name.localeCompare(b.name, "pt-BR"),
        ),
    }))
    .filter((section) => section.items.length > 0);

  const totalVisible =
    sections.reduce((sum, section) => sum + section.items.length, 0) +
    (showInfos ? filteredInfos.length : 0) +
    (showCombos ? filteredCombos.length : 0);

  const hasFilters = !!search || status !== "all" || !!category;
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setCategory("");
  };

  // Buscando ou numa categoria só: tudo aberto, para nada ficar escondido
  const isCollapsed = (key: string) => !words.length && !category && collapsed.has(key);
  const toggleSection = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const countBy = (predicate: (item: MenuItemType) => boolean) => menuItems.filter(predicate).length;

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto py-2 px-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <LuPizza size={32} className="text-primary-gold/70 shrink-0" />
            <h1 className="text-3xl font-semibold text-primary-gold">
              Cardápio
            </h1>
            <span className="text-xs text-primary-gold/35 mt-0.5">
              ({totalVisible})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip direction="bottom" content="Visão do cliente">
              <button
                onClick={() =>
                  window.open("/clientMenu", "_blank", "noopener,noreferrer")
                }
                className="p-2 cursor-pointer rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                <LuLink size={14} />
              </button>
            </Tooltip>
            <Tooltip direction="bottom" content="Visualização do PDF">
              <button
                onClick={() => router.push("/menu/pdf")}
                className="p-2 cursor-pointer rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all"
              >
                <LuFileCode2 size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
        {/* Busca e filtros */}
        <div className="flex flex-col gap-3 rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <CatalogSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome, descrição ou categoria"
            />
            <ViewToggle view={view} onChange={setView} />
          </div>
          <FilterPills<Status>
            label="Situação"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Todos", count: menuItems.length },
              {
                value: "hidden",
                label: "Ocultos",
                icon: LuEyeOff,
                count: countBy((item) => !item.isVisible),
              },
              {
                value: "focus",
                label: "Destaques",
                icon: LuSparkles,
                count: countBy((item) => item.isFocus),
              },
              {
                value: "vegan",
                label: "Veganos",
                icon: LuVegan,
                count: countBy((item) => item.isVegan),
              },
            ]}
          />
          <FilterPills
            label="Categoria"
            scroll
            value={category}
            onChange={setCategory}
            options={[
              { value: "", label: "Todas" },
              { value: INFOS, label: INFOS, icon: LuMegaphone, count: infos.length },
              { value: COMBOS, label: COMBOS, icon: LuBoxes, count: combos.length },
              ...typeNames.map((type) => ({
                value: type,
                label: type,
                count: countBy((item) => item.type === type),
              })),
            ]}
          />
        </div>

        {/* Resultado */}
        <div className="flex items-center justify-between gap-3 min-h-6 px-1">
          <span className="text-xs text-primary-gold/50">
            {loading
              ? "Carregando o cardápio..."
              : `${totalVisible} ${totalVisible === 1 ? "item" : "itens"}${hasFilters ? " encontrados" : ""}`}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-primary-gold/55 hover:text-primary-gold underline-offset-4 hover:underline transition-colors cursor-pointer"
            >
              Limpar busca e filtros
            </button>
          )}
        </div>

        {loading ? (
          <CatalogSkeleton view={view} />
        ) : totalVisible === 0 ? (
          <CatalogEmpty
            icon={LuPizza}
            title={hasFilters ? "Nenhum item com essa busca e filtros." : "O cardápio está vazio."}
            onClear={hasFilters ? clearFilters : undefined}
          />
        ) : (
          <div className="flex flex-col gap-7">
            {showInfos && filteredInfos.length > 0 && (
              <CatalogSection
                title={INFOS}
                icon={LuMegaphone}
                count={filteredInfos.length}
                collapsed={isCollapsed(INFOS)}
                onToggle={() => toggleSection(INFOS)}
              >
                <CatalogItems view={view}>
                  {filteredInfos.map((info) => (
                    <InfoCard
                      key={info.id ?? info.name}
                      info={info}
                      view={view}
                      words={words}
                      onEdit={() => {
                        setCurrentInfo(info);
                        setIsInfoModalOpen(true);
                      }}
                    />
                  ))}
                </CatalogItems>
              </CatalogSection>
            )}

            {showCombos && filteredCombos.length > 0 && (
              <CatalogSection
                title={COMBOS}
                icon={LuBoxes}
                count={filteredCombos.length}
                collapsed={isCollapsed(COMBOS)}
                onToggle={() => toggleSection(COMBOS)}
              >
                <CatalogItems view={view}>
                  {filteredCombos.map((combo) => (
                    <ComboCard
                      key={combo.id ?? combo.name}
                      combo={combo}
                      view={view}
                      words={words}
                      onEdit={() => {
                        setCurrentCombo(combo);
                        setIsComboModalOpen(true);
                      }}
                    />
                  ))}
                </CatalogItems>
              </CatalogSection>
            )}

            {sections.map(({ type, items }) => (
              <CatalogSection
                key={type}
                title={type}
                icon={LuUtensils}
                count={items.length}
                collapsed={isCollapsed(type)}
                onToggle={() => toggleSection(type)}
              >
                <CatalogItems view={view}>
                  {items.map((item) => (
                    <MenuCard
                      key={item.id ?? item.name}
                      item={item}
                      view={view}
                      words={words}
                      onEdit={() => {
                        setCurrentItem(item);
                        setIsMenuModalOpen(true);
                      }}
                      onUpdate={(patch) => updateItem(item, patch)}
                    />
                  ))}
                </CatalogItems>
              </CatalogSection>
            ))}
          </div>
        )}
      </div>

      {currentItem && (
        <Modal isOpen={isMenuModalOpen} onClose={closeMenuModal} noPadding patternCloseButton={false}>
          <MenuForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
            closeForms={closeMenuModal}
          />
        </Modal>
      )}
      {currentInfo && (
        <Modal isOpen={isInfoModalOpen} onClose={closeInfoModal} noPadding patternCloseButton={false}>
          <InfoForms
            currentInfo={currentInfo}
            setCurrentInfo={setCurrentInfo}
            formType="edit"
            closeForms={closeInfoModal}
          />
        </Modal>
      )}
      {currentCombo && (
        <Modal isOpen={isComboModalOpen} onClose={closeComboModal} noPadding patternCloseButton={false}>
          <ComboForms
            currentCombo={currentCombo}
            setCurrentCombo={setCurrentCombo}
            formType="edit"
            closeForms={closeComboModal}
          />
        </Modal>
      )}
    </section>
  );
}
