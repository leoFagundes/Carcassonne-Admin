import React from "react";

export default function ZombicidePage() {
  return (
    <div className="flex flex-col gap-2 items-center justify-center w-screen h-screen text-primary-gold text-center p-4">
      <span>
        Os <strong>personagens</strong> do <strong>Zombicide</strong> são
        sobreviventes destemidos, cada um com habilidades únicas para enfrentar
        o caos do apocalipse zumbi. Apenas <strong>3 sobreviveram</strong> até
        agora.
      </span>
      <span>
        <i>/enigma/zombicide/???</i>
      </span>
      <div className="absolute bottom-4 opacity-30">
        Dica: A primeira letra é a que mais se destaca
      </div>
    </div>
  );
}
