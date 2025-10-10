"use client";

import { useRouter } from "next/navigation";
import { FiSkipBack } from "react-icons/fi";
import React from "react";

export default function NedPage() {
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
        O segundo dos personagens, diziam que ele era louco com suas teorias e
        seu porão cheio de latas. Hoje, é o único que ri — porque os zumbis não
        batem na porta, eles <strong className="text-primary-white">a</strong>
        rrombam.
      </span>
    </div>
  );
}
