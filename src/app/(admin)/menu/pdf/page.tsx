"use client";

import LoaderFullscreen from "@/components/loaderFullscreen";
import MenuPDF from "@/components/menupdf";
import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import ComboRepository from "@/services/repositories/ComboRepository";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import {
  InfoType,
  ComboType,
  MenuItemType,
  DescriptionTypeProps,
  TypeOrderType,
} from "@/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LuDownload, LuSkipBack } from "react-icons/lu";

export default function PDFPage() {
  const [loading, setLoading] = useState(false);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [combos, setCombos] = useState<ComboType[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [typesOrder, setTypesOrder] = useState<TypeOrderType[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const { addAlert } = useAlert();
  const router = useRouter();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          fetchedTypesOrder,
          fetchedItems,
          fetchedCombos,
          fetchedInfos,
          fetchedDescriptions,
        ] = await Promise.all([
          TypesOrderRepository.getAll(),
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
      } catch (error) {
        addAlert(`Erro ao carregar dados: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  function printPDF(): void {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  }

  return (
    <div className="flex flex-col items-center justify-center overflow-auto ">
      <section
        className={`${isPrinting ? "hidden" : "flex"} relative w-full justify-center items-center gap-4 text-primary-gold `}
      >
        {loading && <LoaderFullscreen />}
        <div
          onClick={() => router.back()}
          className="absolute left-3 top-3 flex items-center justify-center gap-1 cursor-pointer"
        >
          <LuSkipBack size={"22px"} className="min-w-[22px]" />
          <span className="text-lg">Voltar</span>
        </div>
        <h2 className="sm:text-5xl text-3xl text-primary-gold text-center">
          Visualizador de PDF
        </h2>

        <Tooltip direction="bottom" content="Download">
          <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
            <LuDownload
              onClick={() => printPDF()}
              size={"16px"}
              className="min-w-[16px]"
            />
          </div>
        </Tooltip>
      </section>

      <p
        className={`${isPrinting ? "hidden" : "flex mb-10"} max-w-200  text-center mt-2 text-primary-gold`}
      >
        Dica: Após clicar no botão de Download adicione a opção de {'"'}Salvar
        como PDF{'"'} e também marque a opção de {'"'}Gráficos de Segundo Plano
        {'"'}
      </p>

      <MenuPDF
        items={menuItems}
        combos={combos}
        infos={infos}
        descriptions={descriptions}
        typesOrder={typesOrder}
      />
    </div>
  );
}
