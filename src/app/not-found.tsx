"use client";

import { useRouter } from "next/navigation";
import { FiSkipBack } from "react-icons/fi";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center text-primary-gold">
      <span
        onClick={() => router.back()}
        className="absolute top-2 left-2 flex items-center w-full gap-1 cursor-pointer text-primary-gold"
      >
        <FiSkipBack size={"18px"} />{" "}
        <span className="font-semibold text-lg">Voltar</span>
      </span>
      <h1 className="text-4xl font-bold mb-4">Página não encontrada!</h1>
      <p className="text-lg max-w-md">
        Parece que os zumbis comeram esse conteúdo... tente voltar ao abrigo
        antes que escureça!
      </p>
    </div>
  );
}
