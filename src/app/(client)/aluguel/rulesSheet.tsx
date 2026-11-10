"use client";

import { MouseEvent, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LuScrollText } from "react-icons/lu";
import type { RentalRulesType } from "@/types";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import PanelSheet from "@/components/showcase/panelSheet";
import { RichText } from "@/components/richText";
import { formatRulesVersion } from "@/rental/rulesVersion";

/** Regras do aluguel num painel por cima da página (o cliente não sai dela). */
function RulesSheet({ onClosed }: { onClosed: () => void }) {
  const [rules, setRules] = useState<RentalRulesType | null>(null);

  useEffect(() => RentalConfigRepository.subscribeRules(setRules), []);

  const updated = rules?.updatedAt?.toDate?.();

  return (
    <PanelSheet
      title="Regras do aluguel"
      subtitle={
        rules
          ? `Versão ${formatRulesVersion(rules.version)}${updated ? ` · atualizada em ${updated.toLocaleDateString("pt-BR")}` : ""}`
          : undefined
      }
      icon={<LuScrollText size={17} />}
      className="sm:w-[600px]"
      onClosed={onClosed}
      footer={(close) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={close}
            className="h-10 px-5 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 text-sm transition-colors cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={close}
            className="flex-1 h-10 rounded-lg border border-primary-gold bg-primary-gold text-primary-black text-sm font-semibold hover:bg-primary-gold/90 transition-colors cursor-pointer"
          >
            Entendi
          </button>
        </div>
      )}
    >
      <div className="flex flex-col gap-3 p-3">
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
              data-sheet-item
              className="bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-2"
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60">
                {section.title}
              </h3>
              <RichText text={section.body} className="text-sm text-primary-gold/85 leading-relaxed" />
            </section>
          ))
        )}
      </div>
    </PanelSheet>
  );
}

/**
 * Texto clicável que abre as regras num painel. Vai em portal para o body:
 * dentro do <label> do aceite, um clique no painel marcaria o checkbox, e
 * dentro de um <form> os botões poderiam enviá-lo.
 */
export function RulesLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const openSheet = (event: MouseEvent<HTMLButtonElement>) => {
    // Não marca/desmarca o checkbox do <label> em volta.
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <button type="button" onClick={openSheet} className={className}>
        {children}
      </button>
      {open &&
        createPortal(
          <RulesSheet onClosed={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}
