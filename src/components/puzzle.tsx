"use client";

import React, { useState } from "react";
import Tooltip from "./Tooltip";
import Input from "./input";
import { LuLock } from "react-icons/lu";
import { FiArrowRight } from "react-icons/fi";
import { useAlert } from "@/contexts/alertProvider";

export default function Puzzle() {
  const [password, setPassword] = useState("");

  const { addAlert } = useAlert();

  const validatePuzzle = () => {
    if (password.toLowerCase() !== "klaus jürgen") {
      addAlert("Tente novamente, você errou!");
      setPassword("");
      return;
    }

    localStorage.setItem("carcaPuzzle", "true");
    window.location.reload();
  };

  return (
    <>
      <div className="absolute bottom-1/2 left-2">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <div className="flex flex-col items-center gap-1 text-primary-gold">
              <span className="text-primary-black italic">
                {"4 - 1 - 3 - espaço - 6 - 2 - 5"
                  .split("")
                  .map((char, index) => (
                    <span
                      key={index}
                      className={`inline-block transition-opacity duration-300 ${
                        char !== "-" ? "animate-spin" : ""
                      }`}
                      style={{
                        opacity: 0,
                        animationDelay: `${index * 0.05}s`,
                        animationFillMode: "forwards",
                        animationName: char !== "-" ? "fadeInSpin" : "fadeIn",
                        animationDuration: "0.6s",
                      }}
                    >
                      {char}
                    </span>
                  ))}
              </span>

              <div className="flex items-center w-full gap-2">
                <Input
                  value={password}
                  setValue={(e) => setPassword(e.target.value)}
                  placeholder="Senha do enigma"
                  variant
                  icon={<LuLock className="min-w-[16px]" size={"16px"} />}
                />
                <FiArrowRight
                  onClick={validatePuzzle}
                  className="text-primary-black min-w-[18px] cursor-pointer"
                  size={"18px"}
                />
              </div>
            </div>
          }
          direction="right"
        >
          <div className="h-1 w-1 bg-primary-black/60 rounded-full"></div>
        </Tooltip>
      </div>
      <div className="absolute bottom-1/3 left-6">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <p>
              1 - A cid<span className="font-bold text-primary-gold">A</span>de
              foi oficialmente declarada Patrimônio Mundial da Humanidade em
              1997, reconhecida por sua arquitet
              <span className="font-bold text-primary-gold">U</span>ra medieval
              incrivelmente preservada.
            </p>
          }
          direction="right"
        >
          <div className="h-1 w-1 bg-primary-black/60 rounded-full"></div>
        </Tooltip>
      </div>
      <div className="absolute bottom-1/4 left-1/3">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <p>
              2 - Ela possui duas muralhas concêntricas com cerca de 3 km de
              extensão e 52 torres, o que a to
              <span className="font-bold text-primary-gold">R</span>nava uma das
              estruturas defensivas mais formidáveis da Europa medieval,{" "}
              <span className="font-bold text-primary-gold">G</span>arantindo a
              segurança da cidade.
            </p>
          }
          direction="right"
        >
          <div className="h-1 w-1 bg-primary-black/80 rounded-full"></div>
        </Tooltip>
      </div>
      <div className="absolute bottom-1/2 right-1/3">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <p>
              3 - No século XIX, o arquiteto Eugène Viollet-le-Duc restaurou a
              cidade com base em sua vi
              <span className="font-bold text-primary-gold">S</span>ão do que
              seria a arquitetura medieval. Algumas decisões (como os telhados
              em cone das torres) foram questionadas por não seguirem exatamente
              a história original, mas ainda assim resultaram em um visual
              icônico.
            </p>
          }
          direction="left"
        >
          <div className="h-1 w-1 bg-primary-black/60 rounded-full"></div>
        </Tooltip>
      </div>
      <div className="absolute top-1/3 right-6">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <p>
              4 - Antes de ser uma fortaleza medieval, Carcassonne já era
              habitada pelos romanos e mais tarde pelos visigodos. Sua história
              remonta a mais de 2.000 anos, mar
              <span className="font-bold text-primary-gold">K</span>
              ada por muitas{" "}
              <span className="font-bold text-primary-gold">L</span>utas.
            </p>
          }
          direction="left"
        >
          <div className="h-1 w-1 bg-primary-black/40 rounded-full"></div>
        </Tooltip>
      </div>
      <div className="absolute top-10 right-1/3">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <p>
              5 - Segundo a lenda, durante um cerco, a dama Carcas enganou os
              inimigos jogando um porco b
              <span className="font-bold text-primary-gold">E</span>m alimentado
              pelas muralhas, dando a impressão de que ainda tinham comida de
              sobra. Os i<span className="font-bold text-primary-gold">N</span>
              imigos recuaram e a cidade foi salva — daí o nome Carcassonne.
            </p>
          }
          direction="bottom"
        >
          <div className="h-1 w-1 bg-primary-black/40 rounded-full"></div>
        </Tooltip>
      </div>
      <div className="absolute bottom-5 right-1/3">
        <Tooltip
          textWrap
          clickToStay
          contentNode={
            <p>
              6 - O <span className="font-bold text-primary-gold">J</span>ogo
              Carcassonne simula a construção de cidades medievais com muralhas,
              estradas, mosteiros e fazendas, remetendo diretamente à paisagem e
              estr<span className="font-bold text-primary-gold">Ü</span>tura da
              cidade real.
            </p>
          }
          direction="top"
        >
          <div className="h-1 w-1 bg-primary-black/80 rounded-full"></div>
        </Tooltip>
      </div>
    </>
  );
}
