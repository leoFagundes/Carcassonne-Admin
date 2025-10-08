"use client";

import React, { useEffect, useState } from "react";
import Button from "./button";
import LoaderFullscreen from "./loaderFullscreen";
import { useAlert } from "@/contexts/alertProvider";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import Input from "./input";
import { InfoType, TypeOrderType } from "@/types";
import Loader from "./loader";
import { LuListOrdered, LuPlus } from "react-icons/lu";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import RecorderTypesOrderList from "./recorderTypesOrderList";
import { patternTypeOrder } from "@/utils/patternValues";
import RecorderInfoList from "./recorderInfoList";
import InfoRepository from "@/services/repositories/InfoRepository";

interface TypesOrderFormsProps {
  currentTypeOrder: TypeOrderType;
}

export default function TypesOrderForms({
  currentTypeOrder,
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
              .filter((type): type is string => !!type && type.trim() !== "")
          )
        );

        const fetchedSubtypes = Array.from(
          new Set(
            menuItems
              .map((item) => item.subtype)
              .filter(
                (subtype): subtype is string =>
                  !!subtype && subtype.trim() !== ""
              )
          )
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
        console.log(infosFetched);
        setInfos(infosFetched);
      } catch (error) {
        console.log(error);
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
      console.log(createdTypeOrder);
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
    <div className="flex flex-col items-center overflow-y-scroll px-2 min-h-[250px]">
      {fetchLoading && <LoaderFullscreen />}
      <h1 className="text-4xl text-gradient-gold text-center">
        Adicionar tipo{" "}
      </h1>

      <div className="flex items-center flex-wrap justify-center gap-x-2 gap-y-4 my-6 text-primary-gold">
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
        <div className="flex gap-2">
          <Button onClick={handleCreateTypeOrder}>
            <LuPlus size={14} />
            {fetchLoading ? <Loader /> : "Adicionar"}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {typesOrder.length > 0 && (
          <div className="flex flex-col items-center bg-dark-black/50 my-2 mx-4 py-2 px-4 rounded shadow-card">
            <h1 className="text-4xl text-gradient-gold text-center mt-4">
              Ordenar Tipos e Subtipos
            </h1>
            <RecorderTypesOrderList
              items={typesOrder}
              subItemOptions={subtypes}
              setItems={setTypesOrder}
            />

            <div className="flex gap-2 m-2">
              <Button onClick={handleUpdateOrder}>
                {loading ? <Loader /> : "Salvar"}
              </Button>
            </div>
          </div>
        )}

        {infos.length > 0 && (
          <div className="flex flex-col items-center bg-dark-black/50 my-2 mx-4 py-2 px-4 rounded shadow-card">
            <h1 className="text-4xl text-gradient-gold text-center mt-4">
              Ordenar Avisos
            </h1>

            <RecorderInfoList items={infos} setItems={setInfos} />

            <div>
              <Button onClick={saveOrder} disabled={loading}>
                {loading ? <Loader /> : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
