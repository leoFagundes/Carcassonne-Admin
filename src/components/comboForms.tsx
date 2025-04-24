"use client";

import React from "react";
import { LuPizza, LuBookOpenText, LuDollarSign } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { ComboType } from "@/types";

interface ComboFormsType {
  currentCombo: ComboType;
  setCurrentCombo: React.Dispatch<React.SetStateAction<ComboType>>;
  formType: "edit" | "add";
}

export default function ComboForms({
  currentCombo,
  setCurrentCombo,
  formType,
}: ComboFormsType) {
  return (
    <>
      <h1 className="text-4xl text-gradient-gold">
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
            icon={<LuPizza size={"20px"} />}
            width="!w-[250px]"
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
            width="!w-[250px]"
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
            width="!w-[250px]"
          />
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && <Button isHoverInvalid>Excluir</Button>}
        <Button>{formType === "edit" ? "Salvar" : "Criar"}</Button>
      </div>
    </>
  );
}
