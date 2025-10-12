"use client";

import { useRouter } from "next/navigation";
import { FiSkipBack } from "react-icons/fi";
import React, { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
import reifelipe from "../../../../../../public/images/reifelipe.png";
import reigabriel from "../../../../../../public/images/reigabriel.png";

export default function FinalPage() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize(); // pega os valores iniciais
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative flex flex-col gap-2 items-center justify-center w-screen h-screen text-primary-gold text-center p-4">
      <div className="absolute top-0 left-0">
        <ReactConfetti
          numberOfPieces={150}
          width={windowSize.width}
          height={windowSize.height}
        />
      </div>
      <div className="flex flex-col gap-3 text-start border p-3 rounded shadow-lg max-w-[400px] bg-primary-black z-100 max-h-[80%] overflow-y-auto">
        <span
          onClick={() => router.back()}
          className="absolute top-2 left-2 flex items-center w-full gap-1 cursor-pointer text-primary-gold"
        >
          <FiSkipBack size={"18px"} />{" "}
          <span className="font-semibold text-lg">Voltar</span>
        </span>

        <span>
          <strong>SEJA RÁPIDO</strong> — apenas um conquistará a vitória!
        </span>

        <span>
          Há rumores de dois reis em Carcassonne: <strong>Gabriel</strong> e{" "}
          <strong>Felipe</strong>. Encontre um deles e repita sua frase
          preferida... então, reclame sua recompensa.
        </span>

        <div className="flex gap-4 flex-col justify-center">
          <div className="flex gap-2 items-center">
            <img
              src={reifelipe.src}
              alt="reifelipe"
              className="w-[120px] rounded shadow-card"
            />
            <span>
              <strong>Felipe:</strong> “O silêncio das muralhas fala mais do que
              mil guerreiros. Entre sangue e pedra, apenas a astúcia sobrevive.”
            </span>
          </div>

          <div className="flex gap-2 items-center">
            <img
              src={reigabriel.src}
              alt="reigabriel"
              className="w-[120px] rounded shadow-card"
            />
            <span>
              <strong>Gabriel:</strong> “Nem todo aliado é digno do trono, e nem
              todo inimigo cai sem lutar.”
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
