"use client";

import { useEffect, useState } from "react";
import { LuInfo, LuPartyPopper, LuTriangleAlert, LuX } from "react-icons/lu";
import type { SiteNotice } from "@/types";

const TONE = {
  info: { box: "bg-primary-gold/15 border-primary-gold/30 text-primary-gold", icon: LuInfo },
  warning: { box: "bg-orange-500/15 border-orange-400/40 text-orange-200", icon: LuTriangleAlert },
  celebration: { box: "bg-emerald-500/15 border-emerald-400/35 text-emerald-200", icon: LuPartyPopper },
} as const;

/** Chave por texto: um aviso novo aparece mesmo para quem fechou o anterior. */
const dismissKey = (text: string) => `carcassonne-notice-dismissed:${text.trim().slice(0, 120)}`;

/** O visual da faixa (também usado como prévia no admin). */
export function NoticeBarView({ notice, onClose }: { notice: SiteNotice; onClose?: VoidFunction }) {
  const tone = TONE[notice.tone] ?? TONE.info;
  const Icon = tone.icon;
  return (
    <div role="status" className={`relative z-40 w-full border-b ${tone.box}`}>
      <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-2 text-sm">
        <Icon size={16} className="shrink-0" />
        <p className="flex-1 min-w-0 leading-snug">
          {notice.text}
          {notice.linkUrl && (
            <>
              {" "}
              <a
                href={notice.linkUrl}
                target={notice.linkUrl.startsWith("/") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                {notice.linkLabel?.trim() || "Saiba mais"}
              </a>
            </>
          )}
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aviso"
            className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-black/20 transition cursor-pointer"
          >
            <LuX size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Faixa de aviso no topo do site (Configurações → Geral → Aviso no site). */
export default function SiteNoticeBar({ notice }: { notice: SiteNotice }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(dismissKey(notice.text)) === "1";
    } catch {
      // sem armazenamento: mostra
    }
    setHidden(dismissed);
  }, [notice.text]);

  if (hidden) return null;

  const close = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(dismissKey(notice.text), "1");
    } catch {
      // fecha só nesta visita
    }
  };

  return <NoticeBarView notice={notice} onClose={close} />;
}
