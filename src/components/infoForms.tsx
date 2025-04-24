"use client";

import React from "react";
import { LuBookOpenText, LuClipboardPenLine } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { InfoType } from "@/types";
import OptionsInput from "./optionsInput";

interface InfoFormsType {
  currentInfo: InfoType;
  setCurrentInfo: React.Dispatch<React.SetStateAction<InfoType>>;
  formType: "edit" | "add";
}

export default function InfoForms({
  currentInfo,
  setCurrentInfo,
  formType,
}: InfoFormsType) {
  return (
    <>
      <h1 className="text-4xl text-gradient-gold">
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
        {formType === "edit" && <Button isHoverInvalid>Excluir</Button>}
        <Button>{formType === "edit" ? "Salvar" : "Criar"}</Button>
      </div>
    </>
  );
}
