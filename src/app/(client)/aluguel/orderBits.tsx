"use client";

import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { LuCheck, LuCopy, LuMapPin } from "react-icons/lu";
import { usePubInfo } from "@/contexts/siteConfigProvider";
import { formatDateBR, weekdayOf } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { whatsappUrl } from "@/utils/generalSettings";

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** "sexta, 14/11". */
export const dayLabel = (date: string) => `${WEEKDAY_NAMES[weekdayOf(date)]}, ${formatDateBR(date)}`;

/** Código do pedido grande, com botão de copiar. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: o código continua visível
    }
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] uppercase tracking-widest text-primary-gold/55">Código do pedido</span>
      <button
        type="button"
        onClick={copy}
        title="Copiar o código"
        className="group flex items-center gap-2 rounded-xl border border-primary-gold/25 bg-primary-black/40 px-4 py-2 hover:border-primary-gold/50 transition-colors cursor-pointer"
      >
        <span className="font-mono text-2xl tracking-[0.3em] text-primary-gold">{code}</span>
        {copied ? (
          <LuCheck size={16} className="text-emerald-300" />
        ) : (
          <LuCopy size={15} className="text-primary-gold/45 group-hover:text-primary-gold" />
        )}
      </button>
      <span className="text-[11px] text-primary-gold/45" aria-live="polite">
        {copied ? "Copiado!" : "Mostre este código no balcão"}
      </span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary-gold/15 border border-primary-gold/40 text-[11px] font-bold text-primary-gold">
        {n}
      </span>
      <div className="flex flex-col gap-0.5 pt-0.5 text-sm text-primary-gold/85 min-w-0">{children}</div>
    </li>
  );
}

/**
 * O que fazer a seguir: retirar (onde, quando, com o código e, no balcão, o
 * valor) ou devolver (até quando). Com endereço, mapa e WhatsApp.
 */
export function NextSteps({
  mode,
  startDate,
  dueDate,
  code,
  payAtCounter,
}: {
  mode: "pickup" | "return";
  startDate: string;
  dueDate?: string;
  code: string;
  /** Valor a pagar na retirada (pedido no balcão). */
  payAtCounter?: number;
}) {
  const pub = usePubInfo();
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary-gold/20 bg-secondary-black/60 p-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60">Próximos passos</h2>
      <ol className="flex flex-col gap-3">
        {mode === "pickup" ? (
          <>
            <Step n={1}>
              <span>
                Vá ao Carcassonne a partir de <strong className="text-primary-gold">{dayLabel(startDate)}</strong>.
              </span>
              <a
                href={pub.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 text-xs text-primary-gold/60 underline underline-offset-2 hover:text-primary-gold"
              >
                <LuMapPin size={13} className="shrink-0 mt-0.5" /> {pub.address}
              </a>
            </Step>
            <Step n={2}>
              <span>
                Informe o código <strong className="font-mono tracking-widest text-primary-gold">{code}</strong> no balcão
                {payAtCounter !== undefined ? (
                  <>
                    {" "}e pague <strong className="text-primary-gold">{formatBRL(payAtCounter)}</strong>.
                  </>
                ) : (
                  " — já está pago."
                )}
              </span>
            </Step>
            {dueDate && (
              <Step n={3}>
                <span>
                  Devolva até <strong className="text-primary-gold">{dayLabel(dueDate)}</strong>, no mesmo lugar.
                </span>
              </Step>
            )}
          </>
        ) : (
          <Step n={1}>
            <span>
              Devolva até <strong className="text-primary-gold">{dueDate ? dayLabel(dueDate) : "o prazo combinado"}</strong> no
              Carcassonne, com todas as peças.
            </span>
            <a
              href={pub.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 text-xs text-primary-gold/60 underline underline-offset-2 hover:text-primary-gold"
            >
              <LuMapPin size={13} className="shrink-0 mt-0.5" /> {pub.address}
            </a>
          </Step>
        )}
      </ol>
      <a
        href={whatsappUrl(pub.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 self-start text-xs text-primary-gold/55 hover:text-primary-gold"
      >
        <FaWhatsapp size={14} /> Dúvidas sobre a retirada? Fale com a gente no WhatsApp
      </a>
    </section>
  );
}
