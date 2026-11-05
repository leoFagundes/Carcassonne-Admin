"use client";

import { useEffect, useState } from "react";
import type { RentalSettingsType } from "@/types";
import Input from "@/components/input";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { DEFAULT_RENTAL_SETTINGS } from "@/rental/defaults";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Draft = Omit<RentalSettingsType, "staffEmail"> & { staffEmail: string };

export default function SettingsForm() {
  const { addAlert } = useAlert();
  const [local, setLocal] = useState<Draft>({ ...DEFAULT_RENTAL_SETTINGS, staffEmail: "" });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let first = true;
    const unsub = RentalConfigRepository.subscribeSettings((s) => {
      if (!first) return;
      first = false;
      setLocal({ ...s, staffEmail: s.staffEmail ?? "" });
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setLocal((prev) => ({ ...prev, [key]: value }));

  const toggleDay = (day: number) =>
    set(
      "pickupWeekdays",
      local.pickupWeekdays.includes(day)
        ? local.pickupWeekdays.filter((d) => d !== day)
        : [...local.pickupWeekdays, day].sort((a, b) => a - b),
    );

  const intIn = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

  const save = async () => {
    const email = local.staffEmail.trim();
    if (local.pickupWeekdays.length === 0) {
      addAlert("Escolha pelo menos um dia de retirada.");
      return;
    }
    if (!intIn(local.maxAdvanceDays, 0, 90)) {
      addAlert("A antecedência máxima deve ser de 0 a 90 dias.");
      return;
    }
    if (!intIn(local.maxGamesPerOrder, 1, 10) || !intIn(local.maxActiveGamesPerCustomer, 1, 10)) {
      addAlert("Os limites de jogos devem ser números inteiros de 1 a 10.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addAlert("Informe um e-mail da equipe válido.");
      return;
    }

    // Firestore recusa `undefined`: staffEmail só entra quando preenchido
    const payload: RentalSettingsType = {
      isEnabled: local.isEnabled,
      pickupWeekdays: local.pickupWeekdays,
      maxAdvanceDays: local.maxAdvanceDays,
      maxGamesPerOrder: local.maxGamesPerOrder,
      maxActiveGamesPerCustomer: local.maxActiveGamesPerCustomer,
      requireCpf: local.requireCpf,
      ...(email ? { staffEmail: email } : {}),
    };

    setSaving(true);
    try {
      const ok = await RentalConfigRepository.saveSettings(payload);
      addAlert(ok ? "Configurações salvas!" : "Não foi possível salvar as configurações. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <h2 className="text-lg font-semibold text-primary-gold">Configurações do serviço</h2>

      <Checkbox
        checked={local.isEnabled}
        setChecked={() => set("isEnabled", !local.isEnabled)}
        variant
        label="Serviço de aluguel ativo"
      />

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/70">
          Dias de retirada
        </span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((name, day) => (
            <Checkbox
              key={day}
              checked={local.pickupWeekdays.includes(day)}
              setChecked={() => toggleDay(day)}
              variant
              label={name}
              width="!min-w-0 !w-auto"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <Input
          label="Antecedência máxima (dias)"
          type="number"
          placeholder="Antecedência máxima (0 a 90 dias)"
          value={String(local.maxAdvanceDays)}
          setValue={(e) => set("maxAdvanceDays", Number(e.target.value))}
          variant
          width="!w-full sm:!w-[250px] !min-w-0"
        />
        <Input
          label="Máx. de jogos por pedido"
          type="number"
          placeholder="Máx. de jogos por pedido (1 a 10)"
          value={String(local.maxGamesPerOrder)}
          setValue={(e) => set("maxGamesPerOrder", Number(e.target.value))}
          variant
          width="!w-full sm:!w-[250px] !min-w-0"
        />
        <Input
          label="Máx. de jogos ativos por cliente"
          type="number"
          placeholder="Máx. de jogos ativos por cliente (1 a 10)"
          value={String(local.maxActiveGamesPerCustomer)}
          setValue={(e) => set("maxActiveGamesPerCustomer", Number(e.target.value))}
          variant
          width="!w-full sm:!w-[250px] !min-w-0"
        />
      </div>

      <Checkbox
        checked={local.requireCpf}
        setChecked={() => set("requireCpf", !local.requireCpf)}
        variant
        label="Exigir CPF"
      />

      <Input
        label="E-mail da equipe (opcional)"
        type="email"
        placeholder="E-mail da equipe (opcional)"
        value={local.staffEmail}
        setValue={(e) => set("staffEmail", e.target.value)}
        variant
        width="!w-full sm:!w-[320px] !min-w-0"
      />

      <button
        type="button"
        onClick={save}
        disabled={saving || !loaded}
        className="self-start text-sm px-5 py-2 rounded-xl bg-primary-gold text-primary-black font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </div>
  );
}
