"use client";

import React from "react";
import {
  LuBookOpenText,
  LuImage,
  LuSquareStack,
  LuClock,
  LuDices,
  LuUserRoundMinus,
  LuUserRoundPlus,
} from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { BoardgameType } from "@/types";
import Dropdown from "./dropdown";
import Checkbox from "./checkbox";

interface CollectionFormsType {
  currentItem: BoardgameType;
  setCurrentItem: React.Dispatch<React.SetStateAction<BoardgameType>>;
  formType: "edit" | "add";
}

export default function CollectionForms({
  currentItem,
  setCurrentItem,
  formType,
}: CollectionFormsType) {
  return (
    <>
      <h1 className="text-4xl text-gradient-gold">
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
          <Input
            label="Tipo"
            placeholder="Ex: Estratégia, Cooperativo..."
            value={currentItem.type}
            setValue={(e) =>
              setCurrentItem({ ...currentItem, type: e.target.value })
            }
            variant
            icon={<LuSquareStack size={"18px"} />}
            width="!w-[250px]"
          />
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
        </div>
      </div>
      <div className="flex gap-2 m-2">
        {formType === "edit" && <Button isHoverInvalid>Excluir</Button>}
        <Button>{formType === "edit" ? "Salvar" : "Criar"}</Button>
      </div>
    </>
  );
}
