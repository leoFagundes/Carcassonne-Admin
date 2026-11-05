"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import type { RentalRulesType } from "@/types";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { RichText } from "@/components/richText";

/** Regras do aluguel de jogos, como cadastradas no painel. */
export default function RegrasPage() {
  const [rules, setRules] = useState<RentalRulesType | null>(null);

  useEffect(() => RentalConfigRepository.subscribeRules(setRules), []);

  const updated = rules?.updatedAt?.toDate?.();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        .hex-bg-rules {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="relative min-h-screen text-primary-gold flex flex-col items-center px-4 sm:px-8 pb-14 pt-6 gap-8">
        <div className="hex-bg-rules fixed inset-0 pointer-events-none z-0" />

        <Link
          href="/aluguel"
          className="self-start relative z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-colors backdrop-blur-sm bg-primary-black/30"
        >
          <FiArrowLeft size={15} />
          <span className="text-sm font-medium">Voltar</span>
        </Link>

        <div className="relative z-10 flex flex-col items-center gap-2 w-full max-w-2xl">
          <h1 className="font-cinzel text-xl sm:text-3xl text-center tracking-widest uppercase">
            Regras do Aluguel
          </h1>
          <div className="w-full max-w-xs h-px bg-gradient-to-r from-transparent via-primary-gold/40 to-transparent" />
          {rules && (
            <p className="text-xs text-primary-gold/45">
              Versão {rules.version}
              {updated
                ? ` · atualizada em ${updated.toLocaleDateString("pt-BR")}`
                : ""}
            </p>
          )}
        </div>

        <div className="relative z-10 flex flex-col gap-4 w-full max-w-2xl">
          {!rules ? (
            <p className="text-sm text-primary-gold/55 text-center">
              Carregando regras...
            </p>
          ) : rules.sections.length === 0 ? (
            <p className="text-sm text-primary-gold/55 text-center">
              As regras ainda não foram publicadas.
            </p>
          ) : (
            rules.sections.map((section) => (
              <section
                key={section.id}
                className="bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-2"
              >
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60">
                  {section.title}
                </h2>
                <p className="text-sm text-primary-gold/85 leading-relaxed">
                  <RichText text={section.body} />
                </p>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
