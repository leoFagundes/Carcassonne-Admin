"use client";

import { useEffect, useState } from "react";
import { usePubInfo, useSiteConfig } from "@/contexts/siteConfigProvider";
import { openStatus } from "@/utils/generalSettings";

/**
 * Selo "Aberto agora · fecha às 2h" / "Fechado · abre amanhã às 18h".
 * Só aparece com a opção ligada e o horário de funcionamento preenchido.
 */
export default function OpenNowBadge({ className = "" }: { className?: string }) {
  const configs = useSiteConfig();
  const { hours } = usePubInfo();
  const [now, setNow] = useState<number | null>(null);

  // Hora só no navegador (evita diferença entre servidor e cliente) e a cada minuto.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!configs?.showOpenNow || now === null) return null;
  const status = openStatus(hours, now);
  if (status.state === "unknown") return null;
  const open = status.state === "open";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold bg-primary-black/80 ${
        open ? "border-emerald-400/50 text-emerald-300" : "border-primary-gold/30 text-primary-gold/70"
      } ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${open ? "bg-emerald-400 animate-pulse" : "bg-primary-gold/50"}`} />
      {status.text}
    </span>
  );
}
