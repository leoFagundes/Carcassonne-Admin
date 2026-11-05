"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuPackage } from "react-icons/lu";
import GamesTab from "./gamesTab";

const TABS = [
  { key: "alugueis", label: "Aluguéis" },
  { key: "jogos", label: "Jogos" },
  { key: "clientes", label: "Clientes" },
  { key: "regras", label: "Regras" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Placeholder({ title }: { title: string }) {
  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-8 text-center">
      <p className="text-primary-gold/70">{title}</p>
      <p className="text-xs text-primary-gold/40 mt-1">Em breve</p>
    </div>
  );
}

function AluguelAdmin() {
  const router = useRouter();
  const pathname = usePathname();
  const param = useSearchParams().get("tab");
  const tab: TabKey = TABS.find((t) => t.key === param)?.key ?? "alugueis";

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto py-2 px-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 w-full">
          <LuPackage size={30} className="text-primary-gold/70 shrink-0" />
          <h1 className="text-3xl font-semibold text-primary-gold">Aluguel de Jogos</h1>
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

      {tab === "alugueis" && <Placeholder title="Aluguéis" />}
      {tab === "jogos" && <GamesTab />}
      {tab === "clientes" && <Placeholder title="Clientes" />}
      {tab === "regras" && <Placeholder title="Regras" />}
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
