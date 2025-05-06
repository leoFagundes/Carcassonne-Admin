"use client";

import React, { useEffect, useState } from "react";
import {
  LuBookOpenText,
  LuImage,
  LuClock,
  LuDices,
  LuUserRoundMinus,
  LuUserRoundPlus,
  LuStar,
} from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { BoardgameType } from "@/types";
import Dropdown from "./dropdown";
import Checkbox from "./checkbox";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import { difficultiesOptions, patternBoardgame } from "@/utils/patternValues";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import Tooltip from "./Tooltip";
import OptionsInput from "./optionsInput";

interface CollectionFormsType {
  currentItem: BoardgameType;
  setCurrentItem: React.Dispatch<React.SetStateAction<BoardgameType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

export default function CollectionForms({
  currentItem,
  setCurrentItem,
  formType,
  closeForms,
}: CollectionFormsType) {
  const [loading, setLoading] = useState(false);
  const [boardgamesTypes, setBoardgamesTypes] = useState<string[]>([]);
  const [localItem, setLocalItem] = useState<BoardgameType>(currentItem);

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentItem);
  }, [currentItem]);

  useEffect(() => {
    const fetchBoardgames = async () => {
      setLoading(true);
      try {
        const fetchedBoardgames = await BoardgameRepository.getAll();

        const boardgameTypes = Array.from(
          new Set(fetchedBoardgames.flatMap((b) => b.types))
        );

        setBoardgamesTypes(boardgameTypes);
      } catch (error) {
        addAlert(`Erro ao carregar os tipos dos jogos: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBoardgames();
  }, []);

  const isBoardgameValid = (boardgame: BoardgameType) => {
    const requiredFields = [
      boardgame.name,
      boardgame.description,
      boardgame.difficulty,
    ];

    const playerNumbersValid =
      boardgame.minPlayers > 0 && boardgame.maxPlayers > 0;
    const playTimeValid = boardgame.playTime > 0;

    return (
      requiredFields.every((field) => field.trim() !== "") &&
      playerNumbersValid &&
      playTimeValid
    );
  };

  const handleEditBoardgame = async () => {
    if (!isBoardgameValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      if (!localItem.id) {
        addAlert("ID inválido.");
        return;
      }

      await BoardgameRepository.update(localItem.id, localItem);
      setCurrentItem(localItem);
      addAlert(`Jogo ${localItem.name} editado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao editar jogo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoardgame = async () => {
    if (!isBoardgameValid(localItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await BoardgameRepository.create(localItem);
      addAlert(`Jogo ${localItem.name} criado com sucesso!`);
      setCurrentItem(patternBoardgame);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar novo jogo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoardgame = async () => {
    setLoading(true);
    try {
      if (!currentItem.id) {
        addAlert("ID inválido.");
        return;
      }

      await BoardgameRepository.delete(currentItem.id);
      addAlert(`Jogo ${currentItem.name} deletado com sucesso!`);
      setCurrentItem(patternBoardgame);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar jogo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-4xl text-gradient-gold text-center">
        {localItem.name ? localItem.name : "Jogo sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 my-4 text-primary-gold gap-6 overflow-y-scroll px-4">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={localItem.name}
            setValue={(e) =>
              setLocalItem({ ...localItem, name: e.target.value })
            }
            variant
            icon={<LuDices size={"20px"} />}
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
          <Dropdown
            label="Dificuldade"
            options={difficultiesOptions}
            firstLabel="-"
            value={localItem.difficulty}
            setValue={(e) =>
              setLocalItem({
                ...localItem,
                difficulty: e.target.value,
              })
            }
            variant
          />
          <Input
            label="Mínimo de jogadores"
            type="number"
            placeholder="Ex: 2"
            value={String(localItem.minPlayers)}
            setValue={(e) =>
              setLocalItem({
                ...localItem,
                minPlayers: Number(e.target.value),
              })
            }
            variant
            icon={<LuUserRoundMinus size={"18px"} />}
            width="!w-[250px]"
          />
        </div>
        <div className="flex flex-col gap-6">
          <Input
            label="Máximo de jogadores"
            type="number"
            placeholder="Ex: 4"
            value={String(localItem.maxPlayers)}
            setValue={(e) =>
              setLocalItem({
                ...localItem,
                maxPlayers: Number(e.target.value),
              })
            }
            variant
            icon={<LuUserRoundPlus size={"18px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Tempo de jogo (min)"
            type="number"
            placeholder="Ex: 60"
            value={String(localItem.playTime)}
            setValue={(e) =>
              setLocalItem({
                ...localItem,
                playTime: Number(e.target.value),
              })
            }
            variant
            icon={<LuClock size={"18px"} />}
            width="!w-[250px]"
          />
          <Input
            label="Link da imagem"
            placeholder="URL da imagem"
            value={localItem.image}
            setValue={(e) =>
              setLocalItem({ ...localItem, image: e.target.value })
            }
            variant
            icon={<LuImage size={"18px"} />}
            width="!w-[250px]"
          />
          <OptionsInput
            values={localItem.types}
            setValues={(values) =>
              setLocalItem({ ...localItem, types: values })
            }
            placeholder="Ex: Estratégia, Cooperativo..."
            label="Tipo"
            variant
            width="!w-[250px]"
            options={boardgamesTypes}
          />

          <div className="relative">
            <Checkbox
              checked={localItem.featured}
              setChecked={() =>
                setLocalItem({
                  ...localItem,
                  featured: !localItem.featured,
                })
              }
              variant
              label={`Jogo ${localItem.featured ? "é" : "não é"} destaque`}
            />
            {localItem.featured && (
              <div className="absolute -bottom-2 -right-2 p-1 bg-primary-black">
                <LuStar size={"16px"} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button onClick={handleDeleteBoardgame} isHoverInvalid>
              Excluir
            </Button>
          </Tooltip>
        )}
        <Button
          onClick={
            formType === "edit" ? handleEditBoardgame : handleCreateBoardgame
          }
        >
          {loading ? <Loader /> : formType === "edit" ? "Salvar" : "Criar"}
        </Button>
      </div>
    </>
  );
}
