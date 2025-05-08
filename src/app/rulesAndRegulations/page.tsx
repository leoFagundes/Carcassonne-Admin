"use client";

import Button from "@/components/button";
import { useRouter } from "next/navigation";
import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiClipboard,
  FiFacebook,
  FiInstagram,
  FiMapPin,
  FiSkipBack,
} from "react-icons/fi";

export default function RulesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-primary-black text-primary-gold flex flex-col items-center p-6 space-y-8 font-sans">
      <span
        onClick={() => router.back()}
        className="flex items-center w-full gap-1 cursor-pointer text-primary-gold"
      >
        <FiSkipBack size={"18px"} />{" "}
        <span className="font-semibold text-lg">Voltar</span>
      </span>

      <h1 className="text-3xl font-bold border-b border-pritext-primary-gold pb-2">
        Contato
      </h1>

      <div className="flex flex-col max-w-4xl space-y-3 text-sm md:text-base text-justify mt-2 gap-2">
        <a
          href="https://wa.me/5561999684186"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline border border-primary-gold/80 rounded px-3 py-2 sm:hover:border-primary-gold"
        >
          <FaWhatsapp /> (61) 99968-4186
        </a>

        <a
          href="https://widget.ireserve.com.br/v2/reserva/375"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline border border-primary-gold/80 rounded px-3 py-2 sm:hover:border-primary-gold"
        >
          <FiClipboard className="min-w-[16px]" size={"16px"} /> Faça sua
          reserva
        </a>

        <a
          href="https://www.facebook.com/CARCASSONNEPUB"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline border border-primary-gold/80 rounded px-3 py-2 sm:hover:border-primary-gold"
        >
          <FiFacebook className="min-w-[16px]" size={"16px"} /> /CARCASSONNEPUB
        </a>

        <a
          href="https://www.instagram.com/CARCASSONNEPUB"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline border border-primary-gold/80 rounded px-3 py-2 sm:hover:border-primary-gold"
        >
          <FiInstagram className="min-w-[16px]" size={"16px"} /> @CARCASSONNEPUB
        </a>

        <a
          href="https://www.google.com/maps/place/CLN+407+Bloco+E+-+Loja+37+-+Asa+Norte,+Brasília+-+DF"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline border border-primary-gold/80 rounded px-3 py-2 sm:hover:border-primary-gold"
        >
          <FiMapPin className="min-w-[16px]" size={"16px"} /> Endereço: CLN 407
          BLOCO E LOJA 37 - ASA NORTE
        </a>
      </div>

      <h1 className="text-3xl font-bold border-b border-pritext-primary-gold pb-2">
        Avisos Legais & Políticas
      </h1>

      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-sm md:text-base text-justify">
        {/* Proibição de fumar */}
        <div className="space-y-4">
          <p>
            É proibido o uso de cigarros, cigarrilhas, charutos, cachimbos ou
            qualquer outro produto fumígeno, derivado ou não do tabaco, em
            recinto coletivo fechado, privado ou público.
          </p>
          <p className="text-xs">Lei 9.294/1996 Art. 2º</p>
        </div>

        {/* Proibição de bebida para menores */}
        <div className="space-y-4">
          <p>
            É proibido vender, fornecer, servir, ministrar ou entregar, ainda
            que gratuitamente, de qualquer forma, a criança ou o adolescente,
            bebida alcoólica ou, sem justa causa, outros produtos cujos
            componentes possam causar dependência física ou psíquica.
          </p>
          <p className="text-xs">Lei 8.069/1990, Art. 243</p>
        </div>

        {/* Formas de pagamento */}
        <div className="space-y-4">
          <span className="font-semibold text-primary-gold">
            Formas de pagamento:
          </span>
          <ul className="list-disc list-inside space-y-1">
            <li>Dinheiro</li>
            <li>Cartões de crédito e débito (Mastercard, Visa, Elo)</li>
          </ul>
          <p>Não aceitamos cheque.</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-3 text-sm md:text-base text-justify">
        <p>Cobramos taxa de rolha. Contate um de nossos atendentes.</p>
        <p>
          Proibido o consumo de produtos alimentícios não fornecidos pela casa.
        </p>
        <p>Os preços praticados são em Reais (BRL, R$).</p>
        <p>Se beber, não dirija. Disque Saúde: 136.</p>
      </div>

      <footer className="text-primary-gold font-semibold">PROCON 151</footer>

      <div className="flex justify-center fixed bottom-0 py-2 w-full backdrop-blur-[4px] bg-primary-black/60">
        <div className="w-fit bg-primary-black">
          <Button onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>
    </div>
  );
}
