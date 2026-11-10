"use client";

import { useEffect, useState } from "react";
import type { RentalRulesType } from "@/types";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { RichText } from "@/components/richText";
import { formatRulesVersion } from "@/rental/rulesVersion";
import RentalPageShell from "../rentalPageShell";
import { useRentalCart } from "../useRentalCart";

/** Regras do aluguel de jogos, como cadastradas no painel. */
export default function RegrasPage() {
  const [rules, setRules] = useState<RentalRulesType | null>(null);
  const cart = useRentalCart();

  useEffect(() => RentalConfigRepository.subscribeRules(setRules), []);

  const updated = rules?.updatedAt?.toDate?.();

  return (
    <RentalPageShell title="Regras do aluguel" cartCount={cart.gameIds.length}>
      {rules && (
        <p className="-mt-2 text-center text-xs text-primary-gold/45">
          Versão {formatRulesVersion(rules.version)}
          {updated
            ? ` · atualizada em ${updated.toLocaleDateString("pt-BR")}`
            : ""}
        </p>
      )}
      {!rules ? (
        <p className="text-sm text-primary-gold/55 text-center">
          Carregando regras...
        </p>
      ) : rules.sections.length === 0 ? (
        <p className="text-sm text-primary-gold/55 text-center">
          As regras ainda não foram publicadas.
        </p>
      ) : (
        <>
          {/* Índice: pular direto para uma seção */}
          {rules.sections.length > 3 && (
            <nav
              aria-label="Seções"
              className="flex flex-wrap justify-center gap-1.5"
            >
              {rules.sections.map((section) => (
                <a
                  key={section.id}
                  href={`#regra-${section.id}`}
                  className="h-7 px-2.5 flex items-center rounded-full border border-primary-gold/20 text-[11px] text-primary-gold/70 hover:border-primary-gold/50 hover:text-primary-gold"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          )}
          {rules.sections.map((section, i) => (
            <section
              key={section.id}
              id={`regra-${section.id}`}
              className="scroll-mt-4 min-w-0 overflow-hidden bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-2"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-primary-gold">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-gold/15 border border-primary-gold/30 text-[11px]">
                  {i + 1}
                </span>
                {section.title}
              </h2>
              <RichText text={section.body} className="text-sm text-primary-gold/85 leading-relaxed" />
            </section>
          ))}
        </>
      )}
    </RentalPageShell>
  );
}
