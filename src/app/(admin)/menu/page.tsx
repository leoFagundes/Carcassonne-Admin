"use client";

import Input from "@/components/input";
import { ComboType, InfoType, MenuItemType } from "@/types";
import React, { useEffect, useState } from "react";
import { LuLink, LuPizza } from "react-icons/lu";
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
      info.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCombos = combos.filter(
    (combo) =>
      combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      combo.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="flex flex-col gap-8 w-full h-full overflow-y-scroll overflow-x-hidden outline-none px-3">
      {loading && <LoaderFullscreen />}
      <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
        <LuPizza size={"48px"} className="min-w-[48px]" />
        <h2 className="text-5xl text-primary-gold text-center">Cardápio</h2>

        <Tooltip direction="bottom" content="Ir para visão do cliente">
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuLink
              onClick={() => router.push("/clientMenu")}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
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
            checked={showOnlyInvisible}
            setChecked={(e) => setShowOnlyInvisible(e.target.checked)}
            label="Mostrar apenas invisíveis"
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
              menuItems={menuItems}
              setMenuItems={setMenuItems}
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
