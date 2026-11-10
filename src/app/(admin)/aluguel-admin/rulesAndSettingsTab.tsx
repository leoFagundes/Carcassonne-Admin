"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { LuFileText, LuSlidersHorizontal } from "react-icons/lu";
import RulesTab from "./rulesTab";
import SettingsForm from "./settingsForm";
import { AlsoInNote } from "../carcassonne/settings-ui";

type View = "configuracoes" | "regras";

const VIEWS: { key: View; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    key: "configuracoes",
    label: "Configurações do serviço",
    hint: "Como o aluguel funciona: dias, fila, limites e pagamento.",
    icon: <LuSlidersHorizontal size={16} />,
  },
  {
    key: "regras",
    label: "Texto das regras",
    hint: "O que o cliente lê e aceita antes de alugar.",
    icon: <LuFileText size={16} />,
  },
];

/**
 * Aba Regras do aluguel: as configurações do serviço e o texto das regras
 * separados em duas partes. As duas ficam montadas (só escondidas), então
 * trocar de parte não perde o que ainda não foi salvo.
 */
export default function RulesAndSettingsTab() {
  // ?view=regras abre direto no texto das regras (ex.: vindo de Configurações → Aluguel).
  const initial = useSearchParams().get("view") === "regras" ? "regras" : "configuracoes";
  const [view, setView] = useState<View>(initial);
  const openRules = () => {
    setView("regras");
    requestAnimationFrame(() =>
      document.getElementById("editor-de-regras")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <div role="tablist" aria-label="Regras do aluguel" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VIEWS.map((v) => {
          const on = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setView(v.key)}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors cursor-pointer ${
                on
                  ? "border-primary-gold/60 bg-primary-gold/[0.08]"
                  : "border-primary-gold/15 bg-secondary-black/40 hover:border-primary-gold/35"
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${on ? "text-primary-gold" : "text-primary-gold/50"}`}>{v.icon}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-sm font-semibold ${on ? "text-primary-gold" : "text-primary-gold/75"}`}>{v.label}</span>
                <span className="text-xs text-primary-gold/45">{v.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-hidden={view !== "configuracoes"} className={`${view === "configuracoes" ? "flex" : "hidden"} flex-col gap-3`}>
        <AlsoInNote alsoIn={{ label: "Configurações → Aluguel", href: "/carcassonne?tab=configuracoes&section=aluguel" }} />
        <SettingsForm onOpenRules={openRules} />
      </div>

      <div
        role="tabpanel"
        aria-hidden={view !== "regras"}
        id="editor-de-regras"
        className={`${view === "regras" ? "block" : "hidden"} rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-4 sm:p-5 scroll-mt-4`}
      >
        <RulesTab />
      </div>
    </div>
  );
}
