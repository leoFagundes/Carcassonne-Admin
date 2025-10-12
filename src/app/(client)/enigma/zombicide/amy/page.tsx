"use client";

import { useRouter } from "next/navigation";
import { FiSkipBack } from "react-icons/fi";
import React from "react";

export default function AmyPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 items-center justify-center w-screen h-screen text-primary-gold text-center p-4">
      <span
        onClick={() => router.back()}
        className="absolute top-2 left-2 flex items-center w-full gap-1 cursor-pointer text-primary-gold"
      >
        <FiSkipBack size={"18px"} />{" "}
        <span className="font-semibold text-lg">Voltar</span>
      </span>
      <span>
        A primeira dos personagens, antes, curava{" "}
        <span className="animate-pulse">f</span>erimentos. Agora, costura
        cabeças — mas no chão. A estudante de medicina virou cirurgiã de
        zumbis...
      </span>
    </div>
  );
}
