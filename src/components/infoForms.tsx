"use client";

import React, { useState } from "react";
import { LuBookOpenText, LuClipboardPenLine } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { InfoType } from "@/types";
import OptionsInput from "./optionsInput";
import { useAlert } from "@/contexts/alertProvider";
import Tooltip from "./Tooltip";
import Loader from "./loader";
import InfoRepository from "@/services/repositories/InfoRepository";
import { patternInfo } from "@/utils/patternValues";

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
  const { addAlert } = useAlert();

  const isInfoValid = (info: InfoType) => {
    return info.name.trim() !== "" && info.description.trim() !== "";
  };

  const handleCreateInfo = async () => {
    if (!isInfoValid(currentInfo)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await InfoRepository.create(currentInfo);
      addAlert(`Aviso "${currentInfo.name}" criado com sucesso!`);
      setCurrentInfo({ name: "", description: "", values: [] });
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar aviso: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInfo = async () => {
    if (!isInfoValid(currentInfo)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    if (!currentInfo.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await InfoRepository.update(currentInfo.id, currentInfo);
      setCurrentInfo(currentInfo);
      addAlert(`Aviso "${currentInfo.name}" editado com sucesso!`);
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
      setCurrentInfo(patternInfo);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar aviso: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl text-gradient-gold text-center">
        {currentInfo.name ? currentInfo.name : "Aviso sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 text-primary-gold gap-6 my-4 overflow-y-scroll px-4">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={currentInfo.name}
            setValue={(e) =>
              setCurrentInfo({ ...currentInfo, name: e.target.value })
            }
            variant
            icon={<LuClipboardPenLine size={"20px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Descrição"
            placeholder="Descrição"
            value={currentInfo.description}
            setValue={(e) =>
              setCurrentInfo({
                ...currentInfo,
                description: e.target.value,
              })
            }
            variant
            multiline
            icon={<LuBookOpenText size={"20px"} />}
            width="!w-[250px]"
          />
          <OptionsInput
            values={currentInfo.values}
            setValues={(values) =>
              setCurrentInfo({ ...currentInfo, values: values })
            }
            placeholder="Valor (limite de 2)"
            label="Valor"
            variant
            width="!w-[250px]"
            limit={2}
          />
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button onClick={handleDeleteInfo} isHoverInvalid>
              Excluir
            </Button>
          </Tooltip>
        )}
        <Button
          onClick={formType === "edit" ? handleEditInfo : handleCreateInfo}
        >
          {loading ? <Loader /> : formType === "edit" ? "Salvar" : "Criar"}
        </Button>
      </div>
    </>
  );
}
