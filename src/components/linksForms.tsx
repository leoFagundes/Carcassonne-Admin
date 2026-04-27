"use client";

import React, { useEffect, useState } from "react";
import { LuLink, LuSignature, LuText } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { LinkType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import Tooltip from "./Tooltip";
import LinksRepository from "@/services/repositories/LinksRepository";
import { getLucideIcon, normalizeIconName } from "@/utils/utilFunctions";
import IconAutocomplete from "./IconAutoComplete";

interface LinkFormsType {
  currentLink: LinkType;
  setCurrentLink: React.Dispatch<React.SetStateAction<LinkType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

export default function LinksForms({
  currentLink,
  setCurrentLink,
  formType,
  closeForms,
}: LinkFormsType) {
  const [loading, setLoading] = useState(false);
  const [localItem, setLocalItem] = useState<LinkType>(currentLink);
  const IconPreview = getLucideIcon(localItem.icon || "");

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentLink);
  }, [currentLink]);

  const isLinkValid = (link: LinkType) => {
    return link.name.trim() !== "" && link.url.trim() !== "";
  };

  const handleCreateLink = async () => {
    if (!isLinkValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await LinksRepository.create({
        ...localItem,
        icon: normalizeIconName(localItem.icon),
      });
      addAlert(`Link "${localItem.name}" criado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar novo link: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLink = async () => {
    if (!isLinkValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    if (!localItem.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await LinksRepository.update(localItem.id, {
        ...localItem,
        icon: normalizeIconName(localItem.icon),
      });
      addAlert(`Link "${localItem.name}" editado com sucesso!`);
      setCurrentLink(localItem);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao editar link: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!currentLink.id) {
      addAlert("ID inválido.");
      return;
    }

    setLoading(true);
    try {
      await LinksRepository.delete(currentLink.id);
      addAlert(`Link "${currentLink.name}" deletado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar link: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl text-gradient-gold text-center">
        {localItem.name ? localItem.name : "Link sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 text-primary-gold gap-6 my-4 overflow-y-visible px-4">
        <div className="flex flex-col gap-6 ">
          <Input
            label="Nome"
            placeholder="Nome"
            value={localItem.name}
            setValue={(e) =>
              setLocalItem({ ...localItem, name: e.target.value })
            }
            variant
            icon={<LuSignature size={"20px"} />}
            width={"!w-[250px]"}
          />
          <Input
            label="Descrição"
            placeholder="Descrição"
            value={localItem.description}
            setValue={(e) =>
              setLocalItem({ ...localItem, description: e.target.value })
            }
            variant
            icon={<LuText size={"20px"} />}
            width={"!w-[250px]"}
          />
          <Input
            label="url"
            placeholder="https://www..."
            value={localItem.url}
            setValue={(e) =>
              setLocalItem({ ...localItem, url: e.target.value })
            }
            variant
            icon={<LuLink size={"20px"} />}
            width={"!w-[250px]"}
          />
          <div className="flex flex-col gap-2 w-[250px]">
            <IconAutocomplete
              value={localItem.icon}
              onChange={(value) => setLocalItem({ ...localItem, icon: value })}
            />

            {/* preview */}
            <div className="flex items-center gap-2 min-h-[24px]">
              {IconPreview ? (
                <>
                  <IconPreview size={20} />
                  <span className="text-xs text-gray-400">
                    {normalizeIconName(localItem.icon)}
                  </span>
                </>
              ) : localItem.icon ? (
                <span className="text-red-400 text-xs">Ícone inválido</span>
              ) : null}
              <div className="flex flex-col gap-1 justify-center items-center w-full">
                <a
                  href="https://lucide.dev/icons/"
                  target="_blank"
                  className="text-xs underline text-blue-400 text-center"
                >
                  Ver biblioteca completa
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button onClick={handleDeleteLink} isHoverInvalid>
              Excluir
            </Button>
          </Tooltip>
        )}
        <Button
          onClick={formType === "edit" ? handleEditLink : handleCreateLink}
        >
          {loading ? <Loader /> : formType === "edit" ? "Salvar" : "Criar"}
        </Button>
      </div>
    </>
  );
}
