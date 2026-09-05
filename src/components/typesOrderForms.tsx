"use client";

import React, { useEffect, useState } from "react";
import LoaderFullscreen from "./loaderFullscreen";
import { useAlert } from "@/contexts/alertProvider";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import Input from "./input";
import { InfoType, TypeOrderType } from "@/types";
import Loader from "./loader";
import { LuListOrdered, LuPlus, LuSave } from "react-icons/lu";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import RecorderTypesOrderList from "./recorderTypesOrderList";
import { patternTypeOrder } from "@/utils/patternValues";
import RecorderInfoList from "./recorderInfoList";
import InfoRepository from "@/services/repositories/InfoRepository";
import FormCard from "./formCard";

interface TypesOrderFormsProps {
  currentTypeOrder: TypeOrderType;
  closeForms: VoidFunction;
}

const compactButtonClass =
  "flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40";

export default function TypesOrderForms({
  currentTypeOrder,
  closeForms,
}: TypesOrderFormsProps) {
  const [fetchLoading, setFetchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const [typeInOrder, setTypeInOrder] = useState(currentTypeOrder);
  const [typesOrder, setTypesOrder] = useState<TypeOrderType[]>([]);
  const [infos, setInfos] = useState<InfoType[]>([]);

  const { addAlert } = useAlert();

  useEffect(() => {
    async function fetchTypesAndSubtypes() {
      setFetchLoading(true);
      try {
        const menuItems = await MenuItemRepository.getAll();

        const fetchedTypes = Array.from(
          new Set(
            menuItems
              .map((item) => item.type)
              .filter((type): type is string => !!type && type.trim() !== ""),
          ),
        );

        const fetchedSubtypes = Array.from(
          new Set(
            menuItems
              .map((item) => item.subtype)
              .filter(
                (subtype): subtype is string =>
                  !!subtype && subtype.trim() !== "",
              ),
          ),
        );

        const fetchedTypesOrder = await TypesOrderRepository.getAll();

        setTypes(fetchedTypes);
        setSubtypes(fetchedSubtypes);
        setTypesOrder(fetchedTypesOrder);
      } catch (error) {
        addAlert(`Erro ao carregar os tipos: ${error}`);
      } finally {
        setFetchLoading(false);
      }
    }

    fetchTypesAndSubtypes();
  }, []);

  useEffect(() => {
    async function fetchInfos() {
      try {
        const infosFetched = await InfoRepository.getAll();
        setInfos(infosFetched);
      } catch (error) {
        console.error(error);
      }
    }

    fetchInfos();
  }, []);

  async function handleCreateTypeOrder() {
    if (typeInOrder.type.name.trim() === "") {
      addAlert("Adicione um valor válido!");
      return;
    }

    const valueAlreadyExist =
      typesOrder.filter((item) => item.type.name === typeInOrder.type.name)
        .length > 0;

    if (valueAlreadyExist) {
      addAlert("Esse item já foi adicionado!");
      return;
    }

    try {
      const createdTypeOrder = await TypesOrderRepository.create(typeInOrder);
      setTypeInOrder(patternTypeOrder);
      setTypesOrder([...typesOrder].concat(createdTypeOrder || typeInOrder));
      addAlert(`${typeInOrder.type.name} adicionado com sucesso!`);
    } catch (error) {
      addAlert(`Erro ao criar tipo: ${error}`);
    }
  }

  async function handleUpdateOrder() {
    try {
      setLoading(true);

      // Atualiza cada item individualmente no Firestore
      for (const item of typesOrder) {
        if (!item.id) continue;

        await TypesOrderRepository.update(item.id, {
          type: {
            ...item.type,
            order: item.type.order,
            subtypes: item.type.subtypes.map((subtype, index) => ({
              ...subtype,
              order: index,
            })),
          },
        });
      }

      addAlert("Ordem salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar ordenação:", error);
      addAlert("Erro ao salvar a ordem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOrder() {
    try {
      setLoading(true);
      for (const item of infos) {
        if (!item.id) continue;
        await InfoRepository.update(item.id, {
          orderPriority: item.orderPriority,
        });
      }
      addAlert("Ordem salva com sucesso!");
    } catch (error) {
      addAlert(`Erro ao salvar: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormCard
      title="Ordenação do cardápio"
      subtitle="Adicione tipos e arraste para definir a ordem de exibição"
      icon={<LuListOrdered size={18} />}
      onClose={closeForms}
      maxWidth="sm:max-w-[680px]"
      hideFooter
    >
      {fetchLoading && <LoaderFullscreen />}

      <div className="flex items-center flex-wrap justify-center gap-x-3 gap-y-4 py-2 text-primary-gold">
        <Input
          label="Tipo"
          placeholder="Ex: Pizza, Entrada..."
          value={typeInOrder.type.name}
          setValue={(e) =>
            setTypeInOrder({
              ...typeInOrder,
              type: { ...typeInOrder.type, name: e.target.value },
            })
          }
          variant
          icon={<LuListOrdered />}
          width="!w-[250px]"
          options={types}
          smallInput
        />
        <button
          onClick={handleCreateTypeOrder}
          disabled={fetchLoading}
          className={compactButtonClass}
        >
          {fetchLoading ? (
            <Loader />
          ) : (
            <>
              <LuPlus size={13} /> Adicionar
            </>
          )}
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {typesOrder.length > 0 && (
          <div className="flex flex-col items-center gap-3 border border-primary-gold/15 bg-primary-black/30 py-4 px-4 rounded-xl">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Ordenar Tipos e Subtipos
            </span>
            <RecorderTypesOrderList
              items={typesOrder}
              subItemOptions={subtypes}
              setItems={setTypesOrder}
            />
            <button
              onClick={handleUpdateOrder}
              disabled={loading}
              className={compactButtonClass}
            >
              {loading ? (
                <Loader />
              ) : (
                <>
                  <LuSave size={13} /> Salvar ordem
                </>
              )}
            </button>
          </div>
        )}

        {infos.length > 0 && (
          <div className="flex flex-col items-center gap-3 border border-primary-gold/15 bg-primary-black/30 py-4 px-4 rounded-xl">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Ordenar Avisos
            </span>
            <RecorderInfoList items={infos} setItems={setInfos} />
            <button
              onClick={saveOrder}
              disabled={loading}
              className={compactButtonClass}
            >
              {loading ? (
                <Loader />
              ) : (
                <>
                  <LuSave size={13} /> Salvar ordem
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </FormCard>
  );
}
