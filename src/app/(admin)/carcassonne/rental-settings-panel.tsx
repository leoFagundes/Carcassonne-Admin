"use client";

import { useRouter } from "next/navigation";
import SettingsForm from "../aluguel-admin/settingsForm";
import { AlsoInNote } from "./settings-ui";

/**
 * Configurações → Aluguel: o mesmo formulário de Aluguel → Regras (carrega e
 * salva sozinho). Fica atrás da tela "Em construção" enquanto o aluguel está em teste.
 */
export default function RentalSettingsPanel() {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <AlsoInNote
        alsoIn={{
          label: "Aluguel → Regras",
          href: "/aluguel-admin?tab=regras",
        }}
      />
      {/* As regras (texto) ficam só na página do aluguel. */}
      <SettingsForm
        onOpenRules={() => router.push("/aluguel-admin?tab=regras&view=regras")}
      />
    </div>
  );
}
