"use client";

import React, { useEffect, useState } from "react";
import Button from "./button";
import LoaderFullscreen from "./loaderFullscreen";
import { useAlert } from "@/contexts/alertProvider";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import Input from "./input";
import { TypeOrderType } from "@/types";
import Loader from "./loader";
import { LuListOrdered } from "react-icons/lu";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import RecorderTypesOrderList from "./recorderTypesOrderList";
import { patternTypeOrder } from "@/utils/patternValues";

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
      await TypesOrderRepository.create(typeInOrder);
      setTypeInOrder(patternTypeOrder);
      setTypesOrder([...typesOrder].concat(typeInOrder));
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
            // já deve estar ordenado corretamente, mas pode reforçar aqui
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

  return (
    <div className="flex flex-col items-center overflow-y-scroll px-2 min-h-[250px]">
      {fetchLoading && <LoaderFullscreen />}
      <h1 className="text-4xl text-gradient-gold text-center">
        Adicionar tipo{" "}
      </h1>

      <div className="flex flex-col gap-6 my-6 text-primary-gold">
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
        />
      </div>
      <div className="flex gap-2 m-2">
        <Button onClick={handleCreateTypeOrder}>
          {fetchLoading ? <Loader /> : "Adicionar"}
        </Button>
      </div>
      {typesOrder.length > 0 && (
        <>
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
        </>
      )}
    </div>
  );
}
