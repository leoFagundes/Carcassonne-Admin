"use client";

import Input from "@/components/input";
import { ComboType, InfoType, MenuItemType } from "@/types";
import React, { useEffect, useState } from "react";
import { LuFileCode2, LuLink, LuPizza } from "react-icons/lu";
import Dropdown from "@/components/dropdown";
import Checkbox from "@/components/checkbox";
import Modal from "@/components/modal";
import MenuForms from "@/components/menuForms";
import MenuCard from "./menuCard";
import InfoCard from "./infoCard";
import ComboCard from "./comboCard";
import InfoForms from "@/components/infoForms";
import ComboForms from "@/components/comboForms";
import {
  patternCombo,
  patternInfo,
  patternMenuItem,
} from "@/utils/patternValues";
import InfoRepository from "@/services/repositories/InfoRepository";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import ComboRepository from "@/services/repositories/ComboRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import { useRouter } from "next/navigation";
import Tooltip from "@/components/Tooltip";

export default function MenuPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showOnlyFocus, setShowOnlyFocus] = useState(false);
  const [showOnlyInvisible, setShowOnlyInvisible] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItemType>(patternMenuItem);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<InfoType>(patternInfo);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [currentCombo, setCurrentCombo] = useState<ComboType>(patternCombo);
  const [loading, setLoading] = useState(false);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);

  const { addAlert } = useAlert();
  const router = useRouter();

  useEffect(() => {
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
        setMenuItems(fetchedItems);
      } catch (error) {
        addAlert(`Erro ao carregar itens: ${error}`);
      } finally {
        setLoading(false);
      }
    };
    fetchMenuItems();
    fetchCombos();
    fetchInfos();
  }, [currentInfo, currentCombo, currentItem]);

  const filteredMenu = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType ? item.type === filterType : true;
    const matchesFocus = showOnlyFocus ? item.isFocus : true;
    const matchesInvisible = showOnlyInvisible ? !item.isVisible : true;
    return matchesSearch && matchesType && matchesFocus && matchesInvisible;
  });

  const filteredInfos = infos.filter(
    (info) =>
      info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      info.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCombos = combos.filter(
    (combo) =>
      combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      combo.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalVisible =
    filteredMenu.length +
    (filterType === "Avisos" || filterType === "" ? filteredInfos.length : 0) +
    (filterType === "Combos" || filterType === "" ? filteredCombos.length : 0);

  return (
    <section className="flex flex-col gap-6 w-full h-full overflow-y-auto py-2 px-6">
      {loading && <LoaderFullscreen />}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <LuPizza size={32} className="text-primary-gold/70 shrink-0" />
            <h1 className="text-lg sm:text-3xl font-semibold text-primary-gold">
              Cardápio
            </h1>
            <span className="text-xs text-primary-gold/35 mt-0.5">
              ({totalVisible})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip direction="bottom" content="Visão do cliente">
              <button
                onClick={() => router.push("/clientMenu")}
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

      {/* Filters */}
      <section className="flex flex-row flex-wrap justify-center items-center gap-4 w-fit mx-auto bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-6">
        <div className="flex flex-col gap-4 w-full sm:w-auto">
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            setValue={(e) => setSearchTerm(e.target.value)}
            variant
            width="!w-full sm:!w-[240px]"
          />
          <Dropdown
            value={filterType}
            setValue={(e) => setFilterType(e.target.value)}
            options={[
              "Avisos",
              "Combos",
              ...new Set(menuItems.map((item) => item.type)),
            ]}
            firstLabel="Tipo"
            variant
            width="!w-full sm:!w-[240px]"
          />
        </div>

        <div className="hidden lg:block w-px h-full bg-primary-gold/20 shrink-0 mx-1" />

        <div className="flex flex-col gap-4 shrink-0 w-full sm:w-auto">
          <Checkbox
            checked={showOnlyFocus}
            setChecked={(e) => setShowOnlyFocus(e.target.checked)}
            label="Destaque"
            width="!w-full sm:!w-fit"
            variant
          />
          <Checkbox
            checked={showOnlyInvisible}
            setChecked={(e) => setShowOnlyInvisible(e.target.checked)}
            label="Invisíveis"
            width="!w-full sm:!w-fit"
            variant
          />
        </div>
      </section>

      {/* Cards */}
      <section className="flex justify-center flex-wrap gap-4">
        {totalVisible === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-primary-gold/40">
            <LuPizza size={32} />
            <p className="text-sm">Nenhum item encontrado.</p>
          </div>
        ) : (
          <>
            {filteredMenu.map((item, index) => (
              <MenuCard
                key={index}
                item={item}
                searchTerm={searchTerm.toLowerCase()}
                menuItems={menuItems}
                setMenuItems={setMenuItems}
                onClick={() => {
                  setIsMenuModalOpen(true);
                  setCurrentItem(item);
                }}
              />
            ))}

            {(filterType === "Avisos" || filterType === "") &&
              !showOnlyFocus &&
              !showOnlyInvisible &&
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
              !showOnlyInvisible &&
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
          </>
        )}
      </section>

      {currentItem && (
        <Modal
          isOpen={isMenuModalOpen}
          onClose={() => {
            setIsMenuModalOpen(false);
            setCurrentItem(patternMenuItem);
          }}
        >
          <MenuForms
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            formType="edit"
            closeForms={() => {
              setIsMenuModalOpen(false);
              setCurrentItem(patternMenuItem);
            }}
          />
        </Modal>
      )}
      {currentInfo && (
        <Modal
          isOpen={isInfoModalOpen}
          onClose={() => {
            setIsInfoModalOpen(false);
            setCurrentInfo(patternInfo);
          }}
        >
          <InfoForms
            currentInfo={currentInfo}
            setCurrentInfo={setCurrentInfo}
            formType="edit"
            closeForms={() => {
              setIsInfoModalOpen(false);
              setCurrentInfo(patternInfo);
            }}
          />
        </Modal>
      )}
      {currentCombo && (
        <Modal
          isOpen={isComboModalOpen}
          onClose={() => {
            setIsComboModalOpen(false);
            setCurrentCombo(patternCombo);
          }}
        >
          <ComboForms
            currentCombo={currentCombo}
            setCurrentCombo={setCurrentCombo}
            formType="edit"
            closeForms={() => {
              setIsComboModalOpen(false);
              setCurrentCombo(patternCombo);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
