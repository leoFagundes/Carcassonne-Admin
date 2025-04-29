"use client";

import { DescriptionTypeProps } from "@/types";
import React from "react";
import Input from "./input";
import Button from "./button";
import { LuSquareStack, LuText } from "react-icons/lu";
import { FiArrowRight } from "react-icons/fi";

interface DescriptionTypeFormsProps {
  currentDescriptionType: DescriptionTypeProps;
  setcurrentDescriptionType: React.Dispatch<
    React.SetStateAction<DescriptionTypeProps>
  >;
}

export default function DescriptionTypeForms({
  currentDescriptionType,
  setcurrentDescriptionType,
}: DescriptionTypeFormsProps) {
  const descriptionsType: DescriptionTypeProps[] = [
    {
      type: "Pizza",
      description: "THEY LOVE TRUTH, JUSTICOF PIZICE OF PIZZA",
    },
    {
      type: "Teste",
      description: "THEY LOVE TRUTH, JUSTICE, AND A SLICE OF PIZZA",
    },
    {
      type: "Pizza",
      description: "THEY LOVE TRUTH, JUSTICOF PIZICE OF PIZZA",
    },
    {
      type: "Teste",
      description: "THEY LOVE TRUTH, JUSTICE, AND A SLICE OF PIZZA",
    },
    {
      type: "Pizza",
      description: "THEY LOVE TRUTH, JUSTICOF PIZICE OF PIZZA",
    },
    {
      type: "Teste",
      description: "THEY LOVE TRUTH, JUSTICE, AND A SLICE OF PIZZA",
    },
  ];

  return (
    <div className="flex flex-col items-center overflow-y-scroll px-2">
      <h1 className="text-4xl text-gradient-gold text-center">
        Adicionar uma nova descrição
      </h1>

      <div className="flex flex-col gap-6 my-6 text-primary-gold">
        <Input
          label="Tipo"
          placeholder="Ex: Pizza, Entrada..."
          value={currentDescriptionType.type}
          setValue={(e) =>
            setcurrentDescriptionType({
              ...currentDescriptionType,
              type: e.target.value,
            })
          }
          variant
          icon={<LuSquareStack size={"18px"} />}
          width="!w-[250px]"
          options={["Peste", "Pizza", "Hambúrguer", "Bebidas", "Mais um teste"]}
        />
        <Input
          label="Descrição"
          placeholder="Descrição"
          value={currentDescriptionType.description}
          setValue={(e) =>
            setcurrentDescriptionType({
              ...currentDescriptionType,
              description: e.target.value,
            })
          }
          variant
          multiline
          icon={<LuText size={"20px"} />}
          width="!w-[250px]"
        />
      </div>
      <div className="flex gap-2 m-2">
        <Button>Adicionar</Button>
      </div>
      <section className="flex flex-col gap-2 mt-4">
        <span className="text-primary-gold font-semibold text-lg">
          Descrições atuais:
        </span>
        {descriptionsType.map((descriptionType, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 border rounded text-primary-gold cursor-pointer hover:text-invalid-color transition-all border-dashed"
          >
            <span>{descriptionType.type}</span>
            <FiArrowRight className="min-w-[16px]" size={"16px"} />{" "}
            <span className="text-xs">{descriptionType.description}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
