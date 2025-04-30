"use client";

import { DescriptionTypeProps } from "@/types";
import React, { useEffect, useState } from "react";
import Input from "./input";
import Button from "./button";
import { LuSquareStack, LuText } from "react-icons/lu";
import { FiArrowRight } from "react-icons/fi";
import { useAlert } from "@/contexts/alertProvider";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import { patternDescriptionType } from "@/utils/patternValues";
import Loader from "./loader";
import LoaderFullscreen from "./loaderFullscreen";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";

interface DescriptionTypeFormsProps {
  currentDescriptionType: DescriptionTypeProps;
  setcurrentDescriptionType: React.Dispatch<
    React.SetStateAction<DescriptionTypeProps>
  >;
}

export default function DescriptionTypeForms({
  currentDescriptionType,
  setcurrentDescriptionType,
}: DescriptionTypeFormsProps) {
  const [descriptions, setDescriptions] = useState<DescriptionTypeProps[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const { addAlert } = useAlert();

  useEffect(() => {
    const fetchMenuItensTypes = async () => {
      setFetchLoading(true);
      try {
        const fecthedMenuItens = await MenuItemRepository.getAll();
        const existingTypes = fecthedMenuItens.map((item) => item.type);
        setTypeOptions(existingTypes);
      } catch (error) {
        addAlert(`Erro ao carregar descrições: ${error}`);
      } finally {
        setFetchLoading(false);
      }
    };

    const fetchDescriptions = async () => {
      setFetchLoading(true);
      try {
        const fecthedDescriptions = await DescriptionRepository.getAll();
        setDescriptions(fecthedDescriptions);
      } catch (error) {
        addAlert(`Erro ao carregar descrições: ${error}`);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchDescriptions();
    fetchMenuItensTypes();
  }, []);

  const isDescriptionValid = (description: DescriptionTypeProps) => {
    const requiredFields = [description.type, description.description];

    return requiredFields.every((field) => field.trim() !== "");
  };

  const handleCreateDescription = async () => {
    if (!isDescriptionValid(currentDescriptionType)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setAddLoading(true);
    try {
      const createdDescriptionId = await DescriptionRepository.create(
        currentDescriptionType
      );

      if (!createdDescriptionId || typeof createdDescriptionId !== "string") {
        addAlert("Erro ao criar nova descrição.");
        return;
      }

      addAlert(`Descrição criada com sucesso!`);
      setcurrentDescriptionType(patternDescriptionType);
      setDescriptions([
        ...descriptions,
        {
          ...currentDescriptionType,
          id: createdDescriptionId,
        },
      ]);
    } catch (error) {
      addAlert(`Erro ao criar uma nova descrição: ${error}`);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteDescription = async (
    descriptionType: DescriptionTypeProps
  ) => {
    setFetchLoading(true);
    try {
      if (!descriptionType.id) {
        addAlert("ID inválido.");
        return;
      }

      await DescriptionRepository.delete(descriptionType.id);
      addAlert(`Descrição deletada com sucesso!`);
      setDescriptions(
        [...descriptions].filter(
          (description) => description.id !== descriptionType.id
        )
      );
    } catch (error) {
      addAlert(`Erro ao deletar descrição: ${error}`);
    } finally {
      setFetchLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center overflow-y-scroll px-2">
      {fetchLoading && <LoaderFullscreen />}
      <h1 className="text-4xl text-gradient-gold text-center">
        Adicionar uma nova descrição
      </h1>

      <div className="flex flex-col gap-6 my-6 text-primary-gold">
        <Input
          label="Tipo"
          placeholder="Ex: Pizza, Entrada..."
          value={currentDescriptionType.type}
          setValue={(e) =>
            setcurrentDescriptionType({
              ...currentDescriptionType,
              type: e.target.value,
            })
          }
          variant
          icon={<LuSquareStack size={"18px"} />}
          width="!w-[250px]"
          options={typeOptions}
        />
        <Input
          label="Descrição"
          placeholder="Descrição"
          value={currentDescriptionType.description}
          setValue={(e) =>
            setcurrentDescriptionType({
              ...currentDescriptionType,
              description: e.target.value,
            })
          }
          variant
          multiline
          icon={<LuText size={"20px"} />}
          width="!w-[250px]"
        />
      </div>
      <div className="flex gap-2 m-2">
        <Button onClick={handleCreateDescription}>
          {addLoading ? <Loader /> : "Adicionar"}
        </Button>
      </div>
      {descriptions.length > 0 && (
        <section className="flex flex-col gap-2 mt-4">
          <span className="text-primary-gold font-semibold text-lg">
            Descrições atuais:
          </span>
          {descriptions.map((descriptionType, index) => (
            <div
              key={index}
              onClick={() => handleDeleteDescription(descriptionType)}
              className="flex items-center gap-2 p-2 border rounded text-primary-gold cursor-pointer hover:text-invalid-color transition-all border-dashed"
            >
              <span>{descriptionType.type}</span>
              <FiArrowRight className="min-w-[16px]" size={"16px"} />{" "}
              <span className="text-xs">{descriptionType.description}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
