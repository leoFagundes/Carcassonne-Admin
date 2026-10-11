"use client";

import { FiArrowRight } from "react-icons/fi";
import { LuChevronRight, LuMegaphone, LuPencil } from "react-icons/lu";
import type { InfoType } from "@/types";
import { Highlight } from "@/components/showcase/search";
import type { CatalogView } from "@/components/adminCatalog";

/** Valores do aviso: "de → por" quando são dois, como no cardápio do cliente. */
function Values({ values }: { values: string[] }) {
  if (!values.length) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs">
      {values.map((value, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && values.length === 2 && <FiArrowRight size={11} className="text-primary-gold/50" />}
          <span
            className={
              values.length === 2 && index === 0
                ? "text-primary-gold/45 line-through"
                : "font-semibold text-primary-gold"
            }
          >
            {value}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Aviso do cardápio no admin. Tocar abre a edição. */
export default function InfoCard({
  info,
  view,
  words,
  onEdit,
}: {
  info: InfoType;
  view: CatalogView;
  words: string[];
  onEdit: () => void;
}) {
  const icon = (
    <span className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg border border-primary-gold/25 bg-primary-gold/10 text-primary-gold">
      <LuMegaphone size={17} />
    </span>
  );

  if (view === "list") {
    return (
      <article
        onClick={onEdit}
        className="group flex items-center gap-3 p-2 pr-3 rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer transition-colors hover:border-primary-gold/45 hover:bg-secondary-black/80"
      >
        {icon}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-semibold text-primary-gold truncate">
            <Highlight text={info.name} words={words} />
          </span>
          <span className="text-[11px] text-primary-gold/55 truncate">{info.description}</span>
        </div>
        <span className="hidden sm:block shrink-0">
          <Values values={info.values} />
        </span>
        <LuChevronRight size={16} className="text-primary-gold/30 group-hover:text-primary-gold/70 shrink-0" />
      </article>
    );
  }

  return (
    <article
      onClick={onEdit}
      className="group flex flex-col gap-2.5 p-3 rounded-xl border border-primary-gold/15 bg-secondary-black/50 cursor-pointer transition-colors hover:border-primary-gold/45"
    >
      <div className="flex items-start gap-2.5">
        {icon}
        <span className="text-sm font-semibold leading-snug text-primary-gold line-clamp-2 pt-0.5">
          <Highlight text={info.name} words={words} />
        </span>
      </div>
      {info.description && (
        <p className="text-[11px] text-primary-gold/55 leading-relaxed line-clamp-3">{info.description}</p>
      )}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <Values values={info.values} />
        <LuPencil
          size={11}
          className="ml-auto shrink-0 text-primary-gold/30 group-hover:text-primary-gold/70 transition-colors"
        />
      </div>
    </article>
  );
}
