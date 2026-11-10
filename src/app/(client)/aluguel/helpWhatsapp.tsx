"use client";

import { FaWhatsapp } from "react-icons/fa";
import { usePubInfo } from "@/contexts/siteConfigProvider";
import { formatPhoneBR, whatsappUrl } from "@/utils/generalSettings";

/** "Teve algum problema? Nos chame no WhatsApp" — no fluxo do aluguel. */
export default function HelpWhatsapp({ context }: { context?: string }) {
  const pub = usePubInfo();
  // Já abre a conversa com o assunto (ex.: o código do pedido).
  const text = encodeURIComponent(`Olá! Preciso de ajuda com o aluguel de jogos${context ? ` (${context})` : ""}.`);
  return (
    <a
      href={`${whatsappUrl(pub.whatsapp)}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-3 py-2.5 text-xs text-emerald-200/90 hover:bg-emerald-500/10 transition-colors"
    >
      <FaWhatsapp size={16} className="shrink-0" />
      <span>
        Teve algum problema? <strong className="text-emerald-200">Nos chame no WhatsApp</strong>
        <span className="text-emerald-200/60"> · {formatPhoneBR(pub.whatsapp)}</span>
      </span>
    </a>
  );
}
