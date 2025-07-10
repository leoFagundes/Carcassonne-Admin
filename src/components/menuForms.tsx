"use client";

import React, { useEffect, useState } from "react";
import {
  LuPizza,
  LuBookOpenText,
  LuDollarSign,
  LuSquareStack,
  LuVegan,
  LuEye,
  LuEyeClosed,
  LuImage,
  LuSparkles,
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
import LoaderFullscreen from "./loaderFullscreen";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
  uploadImageToFirebase,
} from "@/services/repositories/FirebaseImageUtils";

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
  const [fullscreenLoading, setFullscreenLoading] = useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [types, setTypes] = useState<string[]>([]);
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const [localItem, setLocalItem] = useState<MenuItemType>(currentItem);
  const [observations, setObservations] = useState<string[]>([]);
  const [sideDishes, setSideDishes] = useState<string[]>([]);

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentItem);
  }, [currentItem]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      setFullscreenLoading(true);
      try {
        const fetchedItems = await MenuItemRepository.getAll();

        const menuTypes = Array.from(new Set(fetchedItems.map((b) => b.type)));
        const menuSubTypes = Array.from(
          new Set(
            fetchedItems
              .map((b) => b.subtype)
              .filter((subtype): subtype is string => subtype !== undefined)
          )
        );
        const allObservations = Array.from(
          new Set(fetchedItems.flatMap((item) => item.observation ?? []))
        );
        const allSideDishes = Array.from(
          new Set(fetchedItems.flatMap((item) => item.sideDish ?? []))
        );

        setTypes(menuTypes);
        setSubtypes(menuSubTypes);
        setObservations(allObservations);
        setSideDishes(allSideDishes);
      } catch (error) {
        addAlert(`Erro ao carregar os itens existentes: ${error}`);
      } finally {
        setFullscreenLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  const handleSaveItem = async () => {
    if (
      localItem.name.trim() === "" ||
      localItem.description.trim() === "" ||
      localItem.value.trim() === "" ||
      localItem.type.trim() === ""
    ) {
      addAlert("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = localItem.image || "";

      if (imageFile) {
        const { url } = await uploadImageToFirebase(imageFile, "menu-items");
        imageUrl = url;
      }

      const itemToSave = {
        ...localItem,
        image: imageUrl,
      };

      if (formType === "edit") {
        if (!localItem.id) throw new Error("ID inválido");

        const previousItem = currentItem;
        const newImageIsDifferent = imageUrl !== previousItem.image;

        if (
          newImageIsDifferent &&
          previousItem.image &&
          previousItem.image.trim() !== ""
        ) {
          const imagePathToDelete = getPathFromFirebaseUrl(previousItem.image);
          if (imagePathToDelete) {
            await deleteImageFromFirebase(imagePathToDelete);
          }
        }

        await MenuItemRepository.update(localItem.id, itemToSave);
        setCurrentItem(itemToSave);
        addAlert(`Item "${localItem.name}" editado com sucesso!`);
        closeForms();
      } else {
        // CREATE
        await MenuItemRepository.create(itemToSave);
        addAlert(`Item "${localItem.name}" criado com sucesso!`);
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
      if (currentItem.image) {
        const imagePath = getPathFromFirebaseUrl(currentItem.image);
        if (imagePath) {
          await deleteImageFromFirebase(imagePath);
        }
      }

      await MenuItemRepository.delete(currentItem.id);
      addAlert(`Item "${currentItem.name}" deletado com sucesso!`);
      closeForms();
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao deletar item: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {fullscreenLoading && <LoaderFullscreen />}
      <h1 className="text-4xl text-gradient-gold text-center">
        {localItem.name ? localItem.name : "Item sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 text-primary-gold gap-6 my-4 overflow-y-scroll px-4">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={localItem.name}
            setValue={(e) =>
              setLocalItem({ ...localItem, name: e.target.value })
            }
            variant
            icon={<LuPizza size={"20px"} />}
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
            width="!w-[250px]"
          />
          <Input
            label="Tipo"
            placeholder="Tipo"
            value={localItem.type}
            setValue={(e) =>
              setLocalItem({ ...localItem, type: e.target.value })
            }
            variant
            icon={<LuSquareStack size={"18px"} />}
            width="!w-[250px]"
            options={types}
          />
          <Input
            label="SubTipo"
            placeholder="SubTipo"
            value={localItem.subtype || ""}
            setValue={(e) =>
              setLocalItem({ ...localItem, subtype: e.target.value })
            }
            variant
            icon={<LuSquareStack size={"18px"} />}
            width="!w-[250px]"
            options={subtypes}
          />
          <OptionsInput
            values={localItem.sideDish}
            setValues={(values) =>
              setLocalItem({ ...localItem, sideDish: values })
            }
            placeholder="Acompanhamento"
            label="Acompanhamento"
            variant
            width="!w-[250px]"
            options={sideDishes}
          />
        </div>
        <div className="flex flex-col gap-6">
          <OptionsInput
            values={localItem.observation}
            setValues={(values) =>
              setLocalItem({ ...localItem, observation: values })
            }
            placeholder="Observações"
            label="Observações"
            variant
            width="!w-[250px]"
            options={observations}
          />
          <div className="relative">
            <Checkbox
              checked={localItem.isVisible}
              setChecked={() =>
                setLocalItem({
                  ...localItem,
                  isVisible: !localItem.isVisible,
                })
              }
              variant
              label={`${localItem.isVisible ? "Visível" : "Invisível"}`}
            />
            {localItem.isVisible ? (
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
              checked={localItem.isFocus}
              setChecked={() =>
                setLocalItem({
                  ...localItem,
                  isFocus: !localItem.isFocus,
                })
              }
              variant
              label={`Está em destaque: ${localItem.isFocus ? "Sim" : "Não"}`}
            />
            {localItem.isFocus && (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuSparkles size={"16px"} />
              </div>
            )}
          </div>
          <div className="relative">
            <Checkbox
              checked={localItem.isVegan}
              setChecked={() =>
                setLocalItem({
                  ...localItem,
                  isVegan: !localItem.isVegan,
                })
              }
              variant
              label={`Item ${localItem.isVegan ? "" : "não"} vegano`}
            />
            {localItem.isVegan && (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuVegan size={"16px"} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 border p-1 rounded shadow-card border-dashed border-primary-gold/20">
            <InputImage
              onChange={(file) => {
                if (file) {
                  setImageFile(file);
                  setLocalItem({
                    ...localItem,
                    image: URL.createObjectURL(file),
                  });
                }
              }}
              onCloseImage={() => {
                setImageFile(null);
                setLocalItem({
                  ...localItem,
                  image: "",
                });
              }}
              width="!w-[250px]"
              previewUrl={localItem.image}
            />

            {!imageFile && (
              <>
                <span className="w-full text-center text-primary-gold/80 italic">
                  ou
                </span>

                <Input
                  label="Link da imagem"
                  placeholder="URL da imagem"
                  value={localItem.image ?? ""}
                  setValue={(e) =>
                    setLocalItem({ ...localItem, image: e.target.value })
                  }
                  variant
                  icon={<LuImage size={"18px"} />}
                  width="!w-[250px]"
                />
              </>
            )}
          </div>
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
