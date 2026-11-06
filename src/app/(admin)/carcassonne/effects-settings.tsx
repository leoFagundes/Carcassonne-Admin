"use client";

import Checkbox from "@/components/checkbox";
import type { GeneralConfigsType } from "@/types";
import { SettingsPanel, useGeneralConfigSection } from "./settings-ui";

const EFEITOS_FIELDS = ["clickEffect", "followCursor", "canvasCursor"] as const satisfies readonly (keyof GeneralConfigsType)[];

/** Efeitos de mouse do site (Configurações → Geral). */
export default function EffectsSettings({ className }: { className?: string }) {
  const { configs, set, loaded, dirty, saving, saved, save } = useGeneralConfigSection(EFEITOS_FIELDS);

  if (!loaded) return <p className="text-xs text-primary-gold/50 px-1">Carregando...</p>;

  return (
    <SettingsPanel title="Efeitos de mouse" dirty={dirty} saving={saving} saved={saved} onSave={save} className={className}>
      <div className="flex flex-col gap-2 -mt-3">
        <Checkbox
          checked={!!configs.clickEffect}
          setChecked={(e) => set({ clickEffect: e.target.checked })}
          label="Ativar efeito de clique"
          variant
        />
        <Checkbox
          checked={!!configs.followCursor}
          setChecked={(e) => set({ followCursor: e.target.checked })}
          label="Ativar destaque de cursor"
          variant
        />
        <Checkbox
          checked={!!configs.canvasCursor}
          setChecked={(e) => set({ canvasCursor: e.target.checked })}
          label="Ativar efeito de cursor"
          variant
        />
      </div>
    </SettingsPanel>
  );
}
