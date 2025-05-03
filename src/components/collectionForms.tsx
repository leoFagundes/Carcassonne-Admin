"use client";

import React, { useState } from "react";
import {
  LuBookOpenText,
  LuImage,
  LuSquareStack,
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
import { patternBoardgame } from "@/utils/patternValues";
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

  const { addAlert } = useAlert();

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
    if (!isBoardgameValid(currentItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      if (!currentItem.id) {
        addAlert("ID inválido.");
        return;
      }

      await BoardgameRepository.update(currentItem.id, currentItem);
      setCurrentItem(currentItem);
      addAlert(`Jogo ${currentItem.name} editado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao editar jogo: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoardgame = async () => {
    if (!isBoardgameValid(currentItem)) {
      addAlert("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      await BoardgameRepository.create(currentItem);
      addAlert(`Jogo ${currentItem.name} criado com sucesso!`);
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
        {currentItem.name ? currentItem.name : "Jogo sem nome"}
      </h1>
      <div className="flex flex-wrap justify-center py-6 my-4 text-primary-gold gap-6 overflow-y-scroll px-4">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Nome"
            value={currentItem.name}
            setValue={(e) =>
              setCurrentItem({ ...currentItem, name: e.target.value })
            }
            variant
            icon={<LuDices size={"20px"} />}
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
          <Dropdown
            label="Dificuldade"
            options={["Fácil", "Médio", "Difícil"]}
            firstLabel="-"
            value={currentItem.difficulty}
            setValue={(e) =>
              setCurrentItem({
                ...currentItem,
                difficulty: e.target.value,
              })
            }
            variant
          />
          <Input
            label="Mínimo de jogadores"
            type="number"
            placeholder="Ex: 2"
            value={String(currentItem.minPlayers)}
            setValue={(e) =>
              setCurrentItem({
                ...currentItem,
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
            value={String(currentItem.maxPlayers)}
            setValue={(e) =>
              setCurrentItem({
                ...currentItem,
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
            value={String(currentItem.playTime)}
            setValue={(e) =>
              setCurrentItem({
                ...currentItem,
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
            value={currentItem.image}
            setValue={(e) =>
              setCurrentItem({ ...currentItem, image: e.target.value })
            }
            variant
            icon={<LuImage size={"18px"} />}
            width="!w-[250px]"
          />
          <OptionsInput
            values={currentItem.types}
            setValues={(values) =>
              setCurrentItem({ ...currentItem, types: values })
            }
            placeholder="Ex: Estratégia, Cooperativo..."
            label="Tipo"
            variant
            width="!w-[250px]"
          />

          <div className="relative">
            <Checkbox
              checked={currentItem.featured}
              setChecked={() =>
                setCurrentItem({
                  ...currentItem,
                  featured: !currentItem.featured,
                })
              }
              variant
              label={`Jogo ${currentItem.featured ? "é" : "não é"} destaque`}
            />
            {currentItem.featured && (
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
