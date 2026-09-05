"use client";

import React, { useEffect, useState } from "react";
import { LuBookOpenText, LuClipboardPenLine } from "react-icons/lu";
import Input from "./input";
import { InfoType } from "@/types";
import OptionsInput from "./optionsInput";
import { useAlert } from "@/contexts/alertProvider";
import FormCard from "./formCard";
import InfoRepository from "@/services/repositories/InfoRepository";

interface InfoFormsType {
  currentInfo: InfoType;
  setCurrentInfo: React.Dispatch<React.SetStateAction<InfoType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

export default function InfoForms({
  currentInfo,
  setCurrentInfo,
  formType,
  closeForms,
}: InfoFormsType) {
  const [loading, setLoading] = useState(false);
  const [localItem, setLocalItem] = useState<InfoType>(currentInfo);

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentInfo);
  }, [currentInfo]);

  const isInfoValid = (info: InfoType) => {
    return info.name.trim() !== "" && info.description.trim() !== "";
  };

  const handleCreateInfo = async () => {
    if (!isInfoValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await InfoRepository.create(localItem);
      addAlert(`Aviso "${localItem.name}" criado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar aviso: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInfo = async () => {
    if (!isInfoValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    if (!localItem.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await InfoRepository.update(localItem.id, localItem);
      setCurrentInfo(localItem);
      addAlert(`Aviso "${localItem.name}" editado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao editar aviso: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInfo = async () => {
    if (!currentInfo.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await InfoRepository.delete(currentInfo.id);
      addAlert(`Aviso "${currentInfo.name}" deletado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar aviso: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormCard
      title={localItem.name || "Novo Aviso"}
      subtitle={formType === "edit" ? "Editar aviso" : "Criar novo aviso"}
      icon={<LuClipboardPenLine size={18} />}
      onClose={closeForms}
      onSubmit={formType === "edit" ? handleEditInfo : handleCreateInfo}
      submitLabel={formType === "edit" ? "Salvar alterações" : "Criar aviso"}
      onDelete={formType === "edit" ? handleDeleteInfo : undefined}
      loading={loading}
    >
      <div className="flex flex-wrap justify-center py-2 text-primary-gold gap-6 w-full">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={localItem.name}
            setValue={(e) =>
              setLocalItem({ ...localItem, name: e.target.value })
            }
            variant
            icon={<LuClipboardPenLine size={"20px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Descrição"
            placeholder="Descrição"
            value={localItem.description}
            setValue={(e) =>
              setLocalItem({
                ...localItem,
                description: e.target.value,
              })
            }
            variant
            multiline
            icon={<LuBookOpenText size={"20px"} />}
            width="!w-[250px]"
          />
          <OptionsInput
            values={localItem.values}
            setValues={(values) =>
              setLocalItem({ ...localItem, values: values })
            }
            placeholder="Valor (limite de 2)"
            label="Valor"
            variant
            width="!w-[250px]"
            limit={2}
          />
        </div>
      </div>
    </FormCard>
  );
}
