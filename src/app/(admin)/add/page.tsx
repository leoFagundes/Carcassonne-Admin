"use client";

import React, { ReactNode } from "react";
import {
  LuBoxes,
  LuCalendarPlus,
  LuClipboardPenLine,
  LuDices,
  LuExternalLink,
  LuGroup,
  LuListOrdered,
  LuMailCheck,
  LuMusic,
  LuPackage,
  LuPizza,
  LuPlus,
  LuText,
  LuTrophy,
  LuUserPlus,
} from "react-icons/lu";
import Card from "./card";

interface Shortcut {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  destination: string;
}

const icon = (Icon: typeof LuDices) => <Icon size={"32px"} className="min-w-[32px]" />;

/**
 * Atalhos para criar qualquer coisa no site. Cada um leva para a página
 * onde aquilo vive, com o formulário já aberto — nada é criado aqui.
 */
const GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "Reservas",
    shortcuts: [
      {
        title: "Nova Reserva",
        description: "Crie uma reserva manualmente.",
        icon: icon(LuCalendarPlus),
        href: "/myreserves?createreserve=true",
        destination: "Reservas",
      },
      {
        title: "Freelancers",
        description: "Cadastre freelancers e escale eles em um ou vários dias.",
        icon: icon(LuUserPlus),
        href: "/myreserves/freelancer",
        destination: "Freelancers",
      },
    ],
  },
  {
    title: "Jogos",
    shortcuts: [
      {
        title: "Jogo da Coleção",
        description: "Adicione um jogo ao acervo do pub (ludoteca).",
        icon: icon(LuDices),
        href: "/collection?createjogo=true",
        destination: "Coleção",
      },
      {
        title: "Jogo para Aluguel",
        description: "Cadastre um jogo no acervo de aluguel, com preço, prazo e cópias.",
        icon: icon(LuPackage),
        href: "/aluguel-admin?tab=jogos&createjogo=true",
        destination: "Aluguel",
      },
    ],
  },
  {
    title: "Cardápio",
    shortcuts: [
      {
        title: "Item",
        description: "Adicione um prato, bebida ou petisco ao cardápio.",
        icon: icon(LuPizza),
        href: "/menu?createitem=true",
        destination: "Cardápio",
      },
      {
        title: "Combo",
        description: "Adicione um combo ao cardápio.",
        icon: icon(LuBoxes),
        href: "/menu?createcombo=true",
        destination: "Cardápio",
      },
      {
        title: "Aviso",
        description: "Adicione um aviso ao cardápio.",
        icon: icon(LuClipboardPenLine),
        href: "/menu?createaviso=true",
        destination: "Cardápio",
      },
      {
        title: "Descrição de Tipo",
        description: "Escreva a descrição de um tipo de item já criado.",
        icon: icon(LuText),
        href: "/menu?createdescricao=true",
        destination: "Cardápio",
      },
      {
        title: "Ordenar Tipos",
        description: "Adicione e ordene os tipos e subtipos dos itens.",
        icon: icon(LuListOrdered),
        href: "/menu?createtipos=true",
        destination: "Cardápio",
      },
      {
        title: "Popup",
        description: "Crie e agende os banners que aparecem ao abrir o cardápio.",
        icon: icon(LuGroup),
        href: "/menu?createpopup=true",
        destination: "Cardápio",
      },
    ],
  },
  {
    title: "Site e eventos",
    shortcuts: [
      {
        title: "Evento",
        description: "Crie um quiz, bolão ou votação de fantasias.",
        icon: icon(LuTrophy),
        href: "/eventos?createevento=true",
        destination: "Eventos",
      },
      {
        title: "Link",
        description: "Adicione um link ao linktree do Carcassonne.",
        icon: icon(LuExternalLink),
        href: "/links?createlink=true",
        destination: "Links",
      },
      {
        title: "Música",
        description: "Recomende uma música pela página dos clientes.",
        icon: icon(LuMusic),
        href: "/clientMusicRecommendation",
        destination: "página do cliente",
      },
    ],
  },
  {
    title: "Configurações",
    shortcuts: [
      {
        title: "E-mail de Reserva",
        description: "Personalize o e-mail que o cliente recebe ao fazer uma reserva.",
        icon: icon(LuMailCheck),
        href: "/carcassonne?tab=emails",
        destination: "Configurações → E-mails",
      },
    ],
  },
];

export default function AddPage() {
  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          <LuPlus size={32} className="text-primary-gold/70 shrink-0" />
          <h1 className="text-3xl font-semibold text-primary-gold">Adicionar</h1>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
        <p className="text-center text-xs text-primary-gold/45 px-6">
          Atalhos para criar qualquer coisa no site. Cada card leva para a página certa, com o
          formulário já aberto.
        </p>
      </div>

      <div className="flex flex-col gap-7 pb-6 px-6">
        {GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-3">
            <h2 className="text-center text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              {group.title}
            </h2>
            <div className="flex justify-center flex-wrap gap-4">
              {group.shortcuts.map((shortcut) => (
                <Card key={shortcut.href} {...shortcut} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
