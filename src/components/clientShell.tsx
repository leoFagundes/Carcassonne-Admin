"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { LuConstruction } from "react-icons/lu";
import { usePubInfo, useSiteConfig } from "@/contexts/siteConfigProvider";
import { todaySP } from "@/rental/dates";
import {
  AREAS,
  DEFAULT_AREA_MESSAGE,
  disabledAreaFor,
  noticeActive,
  whatsappUrl,
} from "@/utils/generalSettings";
import SiteNoticeBar from "./siteNoticeBar";

function AreaClosed({ label, message }: { label: string; message: string }) {
  const pub = usePubInfo();
  return (
    <main className="relative z-10 flex min-h-[70vh] w-full items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-primary-gold/20 bg-secondary-black/70 p-6 text-center">
        <LuConstruction size={40} className="text-primary-gold/70" />
        <h1 className="text-xl font-semibold text-primary-gold">{label} indisponível</h1>
        <p className="text-sm text-primary-gold/75 whitespace-pre-line">{message}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Link
            href="/linktree"
            className="flex-1 rounded-xl bg-primary-gold px-4 py-2.5 text-sm font-semibold text-primary-black"
          >
            Ver nossos links
          </Link>
          <a
            href={whatsappUrl(pub.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary-gold/30 px-4 py-2.5 text-sm text-primary-gold"
          >
            <FaWhatsapp size={15} /> Falar no WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * Em volta de todas as páginas do site (não do admin): faixa de aviso no topo
 * e, se a área da página estiver desligada em Configurações → Geral, uma
 * mensagem amigável no lugar dela.
 */
export default function ClientShell({ children }: { children: ReactNode }) {
  const configs = useSiteConfig();
  const pathname = usePathname();

  const area = configs ? disabledAreaFor(pathname, configs.disabledAreas) : null;
  // A recomendação de música tem a própria chave (também esconde o botão flutuante).
  const musicOff =
    configs?.isMusicRecommendationEnable === false && pathname.startsWith("/clientMusicRecommendation");
  const label = area ? AREAS.find((a) => a.key === area)!.label : musicOff ? "Recomendação de música" : null;
  const message = configs?.disabledAreaMessage?.trim() || DEFAULT_AREA_MESSAGE;

  return (
    <>
      {configs?.siteNotice && noticeActive(configs.siteNotice, todaySP()) && (
        <SiteNoticeBar notice={configs.siteNotice} />
      )}
      {label ? <AreaClosed label={label} message={message} /> : children}
    </>
  );
}
