import "./showcase.css";
import { GiFleurDeLys } from "react-icons/gi";
import { Ink } from "@/components/siteTheme/ink";

/**
 * Título de seção do cardápio com um ornamento gravado (flor-de-lis entre
 * dois traços riscados) que se desenha quando a seção aparece na tela.
 */
export default function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div data-reveal className="flex flex-col items-center w-full">
      <h2 className="cm-section-heading text-3xl sm:text-4xl w-full text-center">{title}</h2>
      <div aria-hidden="true" className="cm-ornament">
        <span className="cm-ornament-line cm-ornament-line-left" />
        <span className="cm-ornament-motif">
          <Ink icon={GiFleurDeLys} coarse />
        </span>
        <span className="cm-ornament-line cm-ornament-line-right" />
      </div>
      <span className="text-xs mb-4 text-center w-full italic text-primary-gold/65">
        {description}
      </span>
    </div>
  );
}
