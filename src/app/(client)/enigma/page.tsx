import React from "react";

export default function EnigmaPage() {
  return (
    <div className="flex flex-col gap-2 items-center justify-center w-screen h-screen text-primary-gold text-center p-4">
      <span>
        Um jogo <strong>Muito Pesado</strong> e <strong>Cooperativo</strong> =
        ???
      </span>
      <span>
        <i>/enigma/???</i>
      </span>
      <div className="absolute bottom-1 opacity-30">
        Dica: Veja o acervo de jogos
      </div>
    </div>
  );
}
