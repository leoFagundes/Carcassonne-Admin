"use client";

import RulesTab from "./rulesTab";
import SettingsForm from "./settingsForm";

export default function RulesAndSettingsTab() {
  // Configurações e regras ficam na mesma aba: "ir para as regras" rola até o editor.
  const openRules = () =>
    document.getElementById("editor-de-regras")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <div className="rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-4 sm:p-5">
        <SettingsForm onOpenRules={openRules} />
      </div>
      <div
        id="editor-de-regras"
        className="rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-4 sm:p-5 scroll-mt-4"
      >
        <RulesTab />
      </div>
    </div>
  );
}
