"use client";

import RulesTab from "./rulesTab";
import SettingsForm from "./settingsForm";

export default function RulesAndSettingsTab() {
  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <div className="rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-4 sm:p-5">
        <SettingsForm />
      </div>
      <div className="rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-4 sm:p-5">
        <RulesTab />
      </div>
    </div>
  );
}
