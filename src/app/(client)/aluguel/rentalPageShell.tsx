"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowLeft } from "react-icons/fi";
import RentalHeader from "./rentalHeader";

/**
 * Moldura das páginas internas do aluguel (pedido, conta, regras): fundo do
 * catálogo, atalhos, "voltar" e título. Cada página só cuida do conteúdo.
 */
export default function RentalPageShell({
  title,
  cartCount,
  back = { href: "/aluguel", label: "Voltar aos jogos" },
  aside,
  top,
  children,
}: {
  title: string;
  cartCount: number;
  back?: { href: string; label: string };
  /** Atalho extra ao lado do "voltar" (ex.: Meus aluguéis). */
  aside?: ReactNode;
  /** Acima do conteúdo, logo abaixo do título (ex.: as etapas). */
  top?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        .hex-bg-rental {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>
      <div className="relative min-h-screen text-primary-gold flex flex-col pb-14 pt-4 gap-5">
        <div className="hex-bg-rental fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] max-w-full h-[300px] pointer-events-none z-0"
          style={{ background: "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)" }}
        />
        <div className="relative z-10">
          <RentalHeader cartCount={cartCount} />
        </div>
        <main className="relative z-10 flex flex-col gap-4 w-full max-w-2xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={back.href}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-colors bg-primary-black/30"
            >
              <FiArrowLeft size={15} />
              <span className="text-sm font-medium">{back.label}</span>
            </Link>
            {aside}
          </div>
          <h1 className="font-cinzel text-xl sm:text-3xl text-center tracking-widest uppercase">{title}</h1>
          {top}
          {children}
        </main>
      </div>
    </>
  );
}
