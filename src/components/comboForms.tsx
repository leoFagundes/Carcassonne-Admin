"use client";

import React, { useState } from "react";
import { LuBookOpenText, LuDollarSign, LuBoxes } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { ComboType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import Tooltip from "./Tooltip";
import ComboRepository from "@/services/repositories/ComboRepository";
import { patternCombo } from "@/utils/patternValues";

interface ComboFormsType {
  currentCombo: ComboType;
  setCurrentCombo: React.Dispatch<React.SetStateAction<ComboType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

export default function ComboForms({
  currentCombo,
  setCurrentCombo,
  formType,
  closeForms,
}: ComboFormsType) {
  const [loading, setLoading] = useState(false);
  const { addAlert } = useAlert();

  const isComboValid = (combo: ComboType) => {
    return (
      combo.name.trim() !== "" &&
      combo.description.trim() !== "" &&
      combo.value.trim() !== ""
    );
  };

  const handleCreateCombo = async () => {
    if (!isComboValid(currentCombo)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await ComboRepository.create(currentCombo);
      addAlert(`Combo "${currentCombo.name}" criado com sucesso!`);
      setCurrentCombo({ name: "", description: "", value: "" });
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar novo combo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCombo = async () => {
    if (!isComboValid(currentCombo)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    if (!currentCombo.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await ComboRepository.update(currentCombo.id, currentCombo);
      addAlert(`Combo "${currentCombo.name}" editado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao editar combo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCombo = async () => {
    if (!currentCombo.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await ComboRepository.delete(currentCombo.id);
      addAlert(`Combo "${currentCombo.name}" deletado com sucesso!`);
      setCurrentCombo(patternCombo);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar combo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl text-gradient-gold text-center">
        {currentCombo.name ? currentCombo.name : "Combo sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 text-primary-gold gap-6 my-4 overflow-y-scroll px-4">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={currentCombo.name}
            setValue={(e) =>
              setCurrentCombo({ ...currentCombo, name: e.target.value })
            }
            variant
            icon={<LuBoxes size={"20px"} />}
            width={"!w-[250px]"}
          />
          <Input
            label="Descrição"
            placeholder="Descrição"
            value={currentCombo.description}
            setValue={(e) =>
              setCurrentCombo({
                ...currentCombo,
                description: e.target.value,
              })
            }
            variant
            multiline
            icon={<LuBookOpenText size={"20px"} />}
            width={"!w-[250px]"}
          />
          <Input
            label="Valor"
            placeholder="Valor"
            value={currentCombo.value}
            setValue={(e) =>
              setCurrentCombo({
                ...currentCombo,
                value: e.target.value,
              })
            }
            variant
            icon={<LuDollarSign size={"18px"} />}
            width={"!w-[250px]"}
          />
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button onClick={handleDeleteCombo} isHoverInvalid>
              Excluir
            </Button>
          </Tooltip>
        )}
        <Button
          onClick={formType === "edit" ? handleEditCombo : handleCreateCombo}
        >
          {loading ? <Loader /> : formType === "edit" ? "Salvar" : "Criar"}
        </Button>
      </div>
    </>
  );
}
