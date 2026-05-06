"use client";

import React, { useEffect, useState } from "react";
import { LuBookOpenText, LuDollarSign, LuBoxes } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { ComboType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import Tooltip from "./Tooltip";
import ComboRepository from "@/services/repositories/ComboRepository";

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
  const [localItem, setLocalItem] = useState<ComboType>(currentCombo);

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentCombo);
  }, [currentCombo]);

  const isComboValid = (combo: ComboType) => {
    return (
      combo.name.trim() !== "" &&
      combo.description.trim() !== "" &&
      combo.value.trim() !== ""
    );
  };

  const handleCreateCombo = async () => {
    if (!isComboValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await ComboRepository.create(localItem);
      addAlert(`Combo "${localItem.name}" criado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar novo combo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCombo = async () => {
    if (!isComboValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    if (!localItem.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await ComboRepository.update(localItem.id, localItem);
      addAlert(`Combo "${localItem.name}" editado com sucesso!`);
      setCurrentCombo(localItem);
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
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar combo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full text-center">
        <h1 className="text-xl sm:text-2xl text-gradient-gold">
          {localItem.name ? localItem.name : "Combo sem nome"}
        </h1>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent mt-2" />
      </div>
      <div className="flex flex-wrap justify-center py-4 text-primary-gold gap-6 overflow-y-auto px-2 flex-1 min-h-0 w-full">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={localItem.name}
            setValue={(e) =>
              setLocalItem({ ...localItem, name: e.target.value })
            }
            variant
            icon={<LuBoxes size={"20px"} />}
            width={"!w-[250px]"}
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
            width={"!w-[250px]"}
          />
          <Input
            label="Valor"
            placeholder="Valor"
            value={localItem.value}
            setValue={(e) =>
              setLocalItem({
                ...localItem,
                value: e.target.value,
              })
            }
            variant
            icon={<LuDollarSign size={"18px"} />}
            width={"!w-[250px]"}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-primary-gold/10 w-full justify-center">
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
