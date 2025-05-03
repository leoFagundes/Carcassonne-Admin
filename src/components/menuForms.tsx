"use client";

import React, { useState } from "react";
import {
  LuPizza,
  LuBookOpenText,
  LuDollarSign,
  LuSquareStack,
  LuVegan,
  LuStar,
  LuEye,
  LuEyeClosed,
} from "react-icons/lu";
import Button from "./button";
import Checkbox from "./checkbox";
import Input from "./input";
import OptionsInput from "./optionsInput";
import { MenuItemType } from "@/types";
import InputImage from "./inputImage";
import { useAlert } from "@/contexts/alertProvider";
import Tooltip from "./Tooltip";
import Loader from "./loader";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import { patternMenuItem } from "@/utils/patternValues";
import { uploadImage } from "@/utils/imageFunctions";

interface MenuFormsType {
  currentItem: MenuItemType;
  setCurrentItem: React.Dispatch<React.SetStateAction<MenuItemType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

export default function MenuForms({
  currentItem,
  setCurrentItem,
  formType,
  closeForms,
}: MenuFormsType) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  const { addAlert } = useAlert();

  const handleSaveItem = async () => {
    if (
      currentItem.name.trim() === "" ||
      currentItem.description.trim() === "" ||
      currentItem.value.trim() === "" ||
      currentItem.type.trim() === ""
    ) {
      addAlert("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = currentItem.image || "";
      if (imageFile) {
        const path = `menu-images/${Date.now()}-${imageFile.name}`;
        imageUrl = await uploadImage(imageFile, path);
      }

      const itemToSave = {
        ...currentItem,
        image: imageUrl,
      };

      if (formType === "edit") {
        // UPDATE
        if (!currentItem.id) throw new Error("ID inválido");
        await MenuItemRepository.update(currentItem.id, itemToSave);
        setCurrentItem(currentItem);
        addAlert(`Item "${currentItem.name}" editado com sucesso!`);
        closeForms();
      } else {
        // CREATE
        await MenuItemRepository.create(itemToSave);
        addAlert(`Item "${currentItem.name}" criado com sucesso!`);
        setCurrentItem(patternMenuItem);
        setImageFile(null);
        closeForms();
      }
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao salvar o item: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!currentItem.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await MenuItemRepository.delete(currentItem.id);
      addAlert(`Item "${currentItem.name}" deletado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar item: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl text-gradient-gold text-center">
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
          <OptionsInput
            values={currentItem.sideDish}
            setValues={(values) =>
              setCurrentItem({ ...currentItem, sideDish: values })
            }
            placeholder="Acompanhamento"
            label="Acompanhamento"
            variant
            width="!w-[250px]"
          />
        </div>
        <div className="flex flex-col gap-6">
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
          <div className="relative">
            <Checkbox
              checked={currentItem.isVisible}
              setChecked={() =>
                setCurrentItem({
                  ...currentItem,
                  isVisible: !currentItem.isVisible,
                })
              }
              variant
              label={`${currentItem.isVisible ? "Visível" : "Invisível"}`}
            />
            {currentItem.isVisible ? (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuEye size={"16px"} />
              </div>
            ) : (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuEyeClosed size={"16px"} />
              </div>
            )}
          </div>
          <div className="relative">
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
            {currentItem.isFocus && (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuStar size={"16px"} />
              </div>
            )}
          </div>
          <div className="relative">
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
            {currentItem.isVegan && (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuVegan size={"16px"} />
              </div>
            )}
          </div>

          <InputImage
            onChange={(file) => {
              if (file) {
                setImageFile(file);
              }
            }}
            width="!w-[250px]"
            previewUrl={currentItem.image}
          />
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button onClick={handleDeleteItem} isHoverInvalid>
              Excluir
            </Button>
          </Tooltip>
        )}
        <Button onClick={handleSaveItem}>
          {loading ? <Loader /> : formType === "edit" ? "Salvar" : "Criar"}
        </Button>
      </div>
    </>
  );
}
