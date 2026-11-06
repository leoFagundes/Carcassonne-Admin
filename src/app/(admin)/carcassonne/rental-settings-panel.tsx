"use client";

import { useRouter } from "next/navigation";
import ConstructionGate from "../aluguel-admin/constructionGate";
import SettingsForm from "../aluguel-admin/settingsForm";
import { AlsoInNote } from "./settings-ui";

/**
 * Configurações → Aluguel: o mesmo formulário de Aluguel → Regras (carrega e
 * salva sozinho). Fica atrás da tela "Em construção" enquanto o aluguel está em teste.
 */
export default function RentalSettingsPanel() {
  const router = useRouter();
  return (
    <ConstructionGate>
      <div className="flex flex-col gap-4 rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 sm:p-5">
        <AlsoInNote alsoIn={{ label: "Aluguel → Regras", href: "/aluguel-admin?tab=regras" }} />
        {/* As regras (texto) ficam só na página do aluguel. */}
        <SettingsForm onOpenRules={() => router.push("/aluguel-admin?tab=regras")} />
      </div>
    </ConstructionGate>
  );
}
