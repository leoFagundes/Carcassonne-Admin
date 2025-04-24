"use client";

import React from "react";
import {
  LuPizza,
  LuBookOpenText,
  LuDollarSign,
  LuImage,
  LuSquareStack,
} from "react-icons/lu";
import Button from "./button";
import Checkbox from "./checkbox";
import Input from "./input";
import OptionsInput from "./optionsInput";
import { MenuItemType } from "@/types";

interface MenuFormsType {
  currentItem: MenuItemType;
  setCurrentItem: React.Dispatch<React.SetStateAction<MenuItemType>>;
  formType: "edit" | "add";
}

export default function MenuForms({
  currentItem,
  setCurrentItem,
  formType,
}: MenuFormsType) {
  return (
    <>
      <h1 className="text-4xl text-gradient-gold">
        {currentItem.name ? currentItem.name : "Item sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 text-primary-gold gap-6 my-4 overflow-y-scroll px-4">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={currentItem.name}
            setValue={(e) =>
              setCurrentItem({ ...currentItem, name: e.target.value })
            }
            variant
            icon={<LuPizza size={"20px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Descrição"
            placeholder="Descrição"
            value={currentItem.description}
            setValue={(e) =>
              setCurrentItem({
                ...currentItem,
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
            value={currentItem.value}
            setValue={(e) =>
              setCurrentItem({
                ...currentItem,
                value: e.target.value,
              })
            }
            variant
            icon={<LuDollarSign size={"18px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Link da imagem"
            placeholder="URL da imagem"
            value={currentItem.image}
            setValue={(e) =>
              setCurrentItem({ ...currentItem, image: e.target.value })
            }
            variant
            icon={<LuImage size={"18px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Tipo"
            placeholder="Ex: Pizza, Entrada..."
            value={currentItem.type}
            setValue={(e) =>
              setCurrentItem({ ...currentItem, type: e.target.value })
            }
            variant
            icon={<LuSquareStack size={"18px"} />}
            width="!w-[250px]"
            options={[
              "Peste",
              "Pizza",
              "Hambúrguer",
              "Bebidas",
              "Mais um teste",
            ]}
          />
        </div>
        <div className="flex flex-col gap-6">
          <OptionsInput
            values={currentItem.extra}
            setValues={(values) =>
              setCurrentItem({ ...currentItem, extra: values })
            }
            placeholder="Extras"
            label="Extras"
            variant
            width="!w-[250px]"
          />
          <OptionsInput
            values={currentItem.observation}
            setValues={(values) =>
              setCurrentItem({ ...currentItem, observation: values })
            }
            placeholder="Observações"
            label="Observações"
            variant
            width="!w-[250px]"
          />
          <Checkbox
            checked={currentItem.isVisible}
            setChecked={() =>
              setCurrentItem({
                ...currentItem,
                isVisible: !currentItem.isVisible,
              })
            }
            variant
            label={`${currentItem.isVisible ? "Visivel" : "Invisivel"}`}
          />
          <Checkbox
            checked={currentItem.isFocus}
            setChecked={() =>
              setCurrentItem({
                ...currentItem,
                isFocus: !currentItem.isFocus,
              })
            }
            variant
            label={`Está em destaque: ${currentItem.isFocus ? "Sim" : "Não"}`}
          />
          <Checkbox
            checked={currentItem.isVegan}
            setChecked={() =>
              setCurrentItem({
                ...currentItem,
                isVegan: !currentItem.isVegan,
              })
            }
            variant
            label={`Item ${currentItem.isVegan ? "" : "não"} vegano`}
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
