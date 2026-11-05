"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuLink, LuPackage } from "react-icons/lu";
import Tooltip from "@/components/Tooltip";
import GamesTab from "./gamesTab";
import RentalsTab from "./rentalsTab";
import CustomersTab from "./customersTab";
import RulesAndSettingsTab from "./rulesAndSettingsTab";

const TABS = [
  { key: "alugueis", label: "Aluguéis" },
  { key: "jogos", label: "Jogos" },
  { key: "clientes", label: "Clientes" },
  { key: "regras", label: "Regras" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AluguelAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const param = useSearchParams().get("tab");
  const tab: TabKey = TABS.find((t) => t.key === param)?.key ?? "alugueis";

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto py-2 px-0 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <LuPackage size={30} className="text-primary-gold/70 shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-semibold text-primary-gold">Aluguel de Jogos</h1>
          </div>
          <Tooltip direction="bottom" content="Ir para visão do cliente">
            <button
              onClick={() => window.open("/aluguel", "_blank", "noopener,noreferrer")}
              className="p-2.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuLink size={16} />
            </button>
          </Tooltip>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`${pathname}?tab=${t.key}`)}
            className={`text-xs px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
              tab === t.key
                ? "bg-primary-gold text-primary-black border-primary-gold font-semibold"
                : "border-primary-gold/20 text-primary-gold/50 hover:border-primary-gold/50 hover:text-primary-gold"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "alugueis" && <RentalsTab />}
      {tab === "jogos" && <GamesTab />}
      {tab === "clientes" && <CustomersTab />}
      {tab === "regras" && <RulesAndSettingsTab />}
    </section>
  );
}

export default function AluguelAdminPage() {
  return (
    <Suspense fallback={null}>
      <AluguelAdmin />
    </Suspense>
  );
}
