"use client";

import { DescriptionTypeProps } from "@/types";
import React, { useEffect, useState } from "react";
import Input from "./input";
import { LuSquareStack, LuText, LuTrash, LuPlus } from "react-icons/lu";
import { FiArrowRight } from "react-icons/fi";
import { useAlert } from "@/contexts/alertProvider";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import { patternDescriptionType } from "@/utils/patternValues";
import Loader from "./loader";
import LoaderFullscreen from "./loaderFullscreen";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import FormCard from "./formCard";

interface DescriptionTypeFormsProps {
  currentDescriptionType: DescriptionTypeProps;
  setcurrentDescriptionType: React.Dispatch<
    React.SetStateAction<DescriptionTypeProps>
  >;
  closeForms: VoidFunction;
}

export default function DescriptionTypeForms({
  currentDescriptionType,
  setcurrentDescriptionType,
  closeForms,
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
        const uniqueTypes = Array.from(
          new Set(fecthedMenuItens.map((item) => item.type)),
        );
        setTypeOptions(uniqueTypes);
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
        currentDescriptionType,
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
    descriptionType: DescriptionTypeProps,
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
          (description) => description.id !== descriptionType.id,
        ),
      );
    } catch (error) {
      addAlert(`Erro ao deletar descrição: ${error}`);
    } finally {
      setFetchLoading(false);
    }
  };

  return (
    <FormCard
      title="Descrições de tipo"
      subtitle="Textos exibidos no cardápio para cada tipo de item"
      icon={<LuText size={18} />}
      onClose={closeForms}
      hideFooter
    >
      {fetchLoading && <LoaderFullscreen />}

      <div className="flex flex-col items-center gap-6 text-primary-gold py-2">
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
        <button
          onClick={handleCreateDescription}
          disabled={addLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40"
        >
          {addLoading ? (
            <Loader />
          ) : (
            <>
              <LuPlus size={13} /> Adicionar descrição
            </>
          )}
        </button>
      </div>

      {descriptions.length > 0 && (
        <section className="flex flex-col gap-2 w-full border-t border-primary-gold/10 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
            Descrições atuais
          </span>
          {descriptions.map((descriptionType, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 border border-primary-gold/15 bg-primary-black/30 rounded-lg text-primary-gold"
            >
              <span className="text-sm shrink-0">{descriptionType.type}</span>
              <FiArrowRight
                className="min-w-[14px] text-primary-gold/40"
                size={"14px"}
              />
              <span className="text-xs text-primary-gold/70 flex-1 min-w-0">
                {descriptionType.description}
              </span>
              <button
                onClick={() => handleDeleteDescription(descriptionType)}
                className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer shrink-0"
              >
                <LuTrash size={13} />
              </button>
            </div>
          ))}
        </section>
      )}
    </FormCard>
  );
}
