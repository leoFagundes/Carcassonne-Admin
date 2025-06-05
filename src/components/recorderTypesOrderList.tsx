"use client";

import { TypeOrderType } from "@/types";
import { Reorder } from "framer-motion";
import React, { useState } from "react";
import { LuDelete, LuPlus } from "react-icons/lu";
import Input from "./input";
import Button from "./button";
import { useAlert } from "@/contexts/alertProvider";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";

interface RecorderListProps {
  items: TypeOrderType[];
  setItems: React.Dispatch<React.SetStateAction<TypeOrderType[]>>;
  subItemOptions: string[];
}

export default function RecorderTypesOrderList({
  items,
  setItems,
  subItemOptions,
}: RecorderListProps) {
  const { addAlert } = useAlert();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubtypeReorder = (typeIndex: number, newSubtypes: any[]) => {
    const updatedItems = [...items];
    updatedItems[typeIndex].type.subtypes = newSubtypes.map((s, index) => ({
      ...s,
      order: index,
    }));
    setItems(updatedItems);
  };

  const handleAddSubtype = (typeIndex: number, name: string) => {
    const updatedItems = [...items];
    const subtypes = updatedItems[typeIndex].type.subtypes;
    const newSubtype = {
      name,
      order: subtypes.length,
    };
    updatedItems[typeIndex].type.subtypes = [...subtypes, newSubtype];
    setItems(updatedItems);
  };

  const [newSubtypeInputs, setNewSubtypeInputs] = useState<string[]>(
    items.map(() => "")
  );

  async function deleteTypeOrder(id?: string) {
    if (!id) {
      addAlert(
        "Item não encontrado na base de dados, recarregue a página e tente novamente."
      );
      return;
    }

    try {
      await TypesOrderRepository.delete(id);
      addAlert("Item deletado com sucesso.");
      setItems((prevItems) => {
        const filtered = prevItems.filter((item) => item.id !== id);
        return filtered.map((item, index) => ({
          ...item,
          type: {
            ...item.type,
            order: index,
          },
        }));
      });
    } catch (error) {
      addAlert(`Erro ao deletar item: ${error}`);
    }
  }

  const handleDeleteSubtype = (typeIndex: number, subIndex: number) => {
    const updatedItems = [...items];
    const subtypes = updatedItems[typeIndex].type.subtypes;

    // Remove o subtipo
    subtypes.splice(subIndex, 1);

    // Reorganiza a ordem
    updatedItems[typeIndex].type.subtypes = subtypes.map((s, index) => ({
      ...s,
      order: index,
    }));

    setItems(updatedItems);
  };

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={(newOrder) => {
        const updatedOrder = newOrder.map((item, index) => ({
          ...item,
          type: {
            ...item.type,
            order: index,
          },
        }));
        setItems(updatedOrder);
      }}
    >
      {items.map((item, typeIndex) => (
        <Reorder.Item
          key={item.id ?? item.type.name}
          value={item}
          className="my-4 p-2 border border-primary-gold rounded shadow-card bg-primary-black border-dashed"
        >
          <div className="flex justify-between text-lg text-primary-gold font-semibold">
            <span className="hover:cursor-grab">
              {item.type.order}. {item.type.name}
            </span>
            <div
              className="cursor-pointer hover:text-invalid-color transition-all duration-100 ease-in p-1"
              onClick={() => deleteTypeOrder(item.id)}
            >
              <LuDelete />
            </div>
          </div>

          <div className="mt-2 ml-4">
            <Reorder.Group
              axis="y"
              values={item.type.subtypes}
              onReorder={(newSubtypes) =>
                handleSubtypeReorder(typeIndex, newSubtypes)
              }
            >
              {item.type.subtypes.map((sub, subIndex) => (
                <Reorder.Item
                  key={sub.name + subIndex}
                  value={sub}
                  className="pl-2 my-1 text-sm border-l-4 border-primary-gold text-primary-gold py-1 px-2 rounded hover:cursor-grab flex justify-between items-center"
                >
                  <span>
                    {sub.order}. {sub.name}
                  </span>
                  <button
                    className="p-1 cursor-pointer hover:text-invalid-color transition-all duration-100 ease-in"
                    onClick={() => handleDeleteSubtype(typeIndex, subIndex)}
                  >
                    <LuDelete size={14} />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="h-[1px] w-full bg-primary-gold my-4"></div>

            <div className="flex items-center gap-2 mt-2 text-primary-gold">
              <Input
                label="Subtipo"
                placeholder="Novo subtipo"
                value={newSubtypeInputs[typeIndex] || ""}
                setValue={(e) => {
                  const newInputs = [...newSubtypeInputs];
                  newInputs[typeIndex] = e.target.value;
                  setNewSubtypeInputs(newInputs);
                }}
                variant
                options={subItemOptions}
                smallInput
              />

              <Button
                onClick={() => {
                  const name = newSubtypeInputs[typeIndex]?.trim();
                  if (name) {
                    handleAddSubtype(typeIndex, name);
                    const newInputs = [...newSubtypeInputs];
                    newInputs[typeIndex] = "";
                    setNewSubtypeInputs(newInputs);
                  }
                }}
                className="text-xs bg-primary-gold text-black px-2 py-1 rounded flex items-center gap-1"
              >
                <LuPlus size={14} />
                Adicionar
              </Button>
            </div>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
