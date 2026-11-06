"use client";

import { useState } from "react";
import { LuCalendarOff, LuClock, LuPartyPopper, LuPlus, LuTrash, LuUsers } from "react-icons/lu";
import Checkbox from "@/components/checkbox";
import Input from "@/components/input";
import OptionsInput from "@/components/optionsInput";
import { useAlert } from "@/contexts/alertProvider";
import type { GeneralConfigsType } from "@/types";
import { daysArray, daysMap } from "@/utils/patternValues";
import { SettingsPanel, useGeneralConfigSection, type AlsoIn } from "./settings-ui";

const RESERVA_FIELDS = [
  "enabledTimes",
  "disabledDays",
  "maxCapacityInDay",
  "maxCapacityInReserve",
  "maxMonthsInAdvance",
  "hoursToCloseReserve",
  "blockedDates",
  "specialDates",
  "showDayOccupancy",
] as const satisfies readonly (keyof GeneralConfigsType)[];

const fieldWidth = "!w-[min(280px,100%)] sm:!w-[300px]";
const smallInput =
  "bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-1.5 text-xs text-primary-gold outline-none focus:border-primary-gold/40 transition-colors";
const addButton =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-gold/30 text-primary-gold/80 text-xs font-medium hover:border-primary-gold/60 hover:text-primary-gold hover:bg-primary-gold/5 transition-all cursor-pointer shrink-0";

function SectionTitle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
        {icon}
        {title}
      </span>
      <p className="text-xs text-primary-gold/40 -mt-1">{text}</p>
    </>
  );
}

function DateList({
  items,
  empty,
  onRemove,
}: {
  items: { date: string; text?: string }[];
  empty: string;
  onRemove: (date: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {items.map((item) => {
        const [y, m, d] = item.date.split("-");
        return (
          <div
            key={item.date}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-black/30 border border-primary-gold/10"
          >
            <span className="text-xs font-mono text-primary-gold/70 shrink-0">
              {d}/{m}/{y}
            </span>
            <span className="text-xs text-primary-gold/45 flex-1 truncate italic">{item.text || empty}</span>
            <button
              onClick={() => onRemove(item.date)}
              aria-label="Remover data"
              className="p-1 rounded-md hover:bg-invalid-color/10 text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer shrink-0"
            >
              <LuTrash size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Configurações de reserva — usado em Configurações → Reservas e na página Reservas. */
export default function ReserveSettings({ alsoIn, className }: { alsoIn?: AlsoIn; className?: string }) {
  const { addAlert } = useAlert();
  const { configs, set, loaded, dirty, saving, saved, save } = useGeneralConfigSection(RESERVA_FIELDS);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [newSpecialDate, setNewSpecialDate] = useState("");
  const [newSpecialDescription, setNewSpecialDescription] = useState("");

  const addBlockedDate = () => {
    if (!newBlockedDate) return addAlert("Selecione uma data.");
    const existing = configs.blockedDates ?? [];
    if (existing.some((b) => b.date === newBlockedDate)) return addAlert("Essa data já está bloqueada.");
    set({
      blockedDates: [
        ...existing,
        { date: newBlockedDate, ...(newBlockedReason.trim() && { reason: newBlockedReason.trim() }) },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    });
    setNewBlockedDate("");
    setNewBlockedReason("");
  };

  const addSpecialDate = () => {
    if (!newSpecialDate) return addAlert("Selecione uma data.");
    const existing = configs.specialDates ?? [];
    if (existing.some((s) => s.date === newSpecialDate)) return addAlert("Essa data já está marcada como especial.");
    set({
      specialDates: [
        ...existing,
        {
          date: newSpecialDate,
          ...(newSpecialDescription.trim() && { description: newSpecialDescription.trim() }),
        },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    });
    setNewSpecialDate("");
    setNewSpecialDescription("");
  };

  const setDisabledDays = (values: (string | number)[]) => {
    const valid = values
      .map((v) => {
        if (typeof v === "string") {
          const lower = v.toLowerCase();
          if (Object.prototype.hasOwnProperty.call(daysMap, lower)) return daysMap[lower];
          addAlert(`Dia digitado é inválido: "${v}"`);
          return null;
        }
        return v >= 0 && v <= 6 ? v : null;
      })
      .filter((v): v is number => v !== null);
    set({ disabledDays: valid });
  };

  if (!loaded) {
    return <p className="text-xs text-primary-gold/50 px-1">Carregando configurações de reserva...</p>;
  }

  return (
    <SettingsPanel
      title="Configurações de reserva"
      alsoIn={alsoIn}
      dirty={dirty}
      saving={saving}
      saved={saved}
      onSave={save}
      className={className}
    >
      {/* Horários e disponibilidade */}
      <div className="flex flex-col gap-3">
        <SectionTitle
          icon={<LuClock size={13} />}
          title="Horários e disponibilidade"
          text="Horários que os clientes podem escolher ao reservar e os dias da semana em que o Carcassonne Pub não aceita reservas."
        />
        <div className="flex gap-8 text-primary-gold mt-6 flex-wrap">
          <OptionsInput
            label="Horários disponíveis"
            placeholder="Horários disponíveis"
            values={configs.enabledTimes}
            setValues={(values) => set({ enabledTimes: values as string[] })}
            withIndex={false}
            variant
            width={fieldWidth}
          />
          <OptionsInput
            label="Dias da semana inválidos"
            placeholder="Dias da semana inválidos"
            values={configs.disabledDays.map((day) => daysArray[day])}
            options={daysArray}
            setValues={setDisabledDays}
            withIndex={false}
            variant
            width={fieldWidth}
          />
        </div>
      </div>

      {/* Capacidade e antecedência */}
      <div className="flex flex-col gap-3 pt-2 border-t border-primary-gold/10">
        <SectionTitle
          icon={<LuUsers size={13} />}
          title="Capacidade e antecedência"
          text="Limites de pessoas por dia e por reserva, e até quando os clientes podem agendar."
        />
        <div className="flex flex-wrap gap-6 mt-6 text-primary-gold">
          {(
            [
              ["maxCapacityInDay", "Capacidade máxima em um dia"],
              ["maxCapacityInReserve", "Capacidade máxima em uma reserva"],
              ["maxMonthsInAdvance", "Permitido fazer reserva em até (meses)"],
              ["hoursToCloseReserve", "Aceitar reservas até (hora cheia)"],
            ] as const
          ).map(([field, label]) => (
            <Input
              key={field}
              placeholder={label}
              label={label}
              value={String(configs[field] ?? "")}
              setValue={(e) => set({ [field]: Number(e.target.value) })}
              variant
              width={fieldWidth}
            />
          ))}
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <Checkbox
            checked={!!configs.showDayOccupancy}
            setChecked={(e) => set({ showDayOccupancy: e.target.checked })}
            label="Mostrar a lotação de cada dia no calendário"
            variant
          />
          <p className="text-[11px] text-primary-gold/40 leading-relaxed">
            O cliente vê, embaixo de cada dia, quantos lugares já foram reservados do total do dia (ex: 45/
            {configs.maxCapacityInDay || 75}). A contagem fica laranja quando o dia está quase cheio e vermelha
            quando lota.
          </p>
        </div>
      </div>

      {/* Datas bloqueadas */}
      <div className="flex flex-col gap-3 pt-2 border-t border-primary-gold/10">
        <SectionTitle
          icon={<LuCalendarOff size={13} />}
          title="Datas bloqueadas"
          text="Datas específicas em que o Carcassonne Pub não vai aceitar reservas. O cliente ainda pode clicar na data, mas verá o motivo e não conseguirá continuar."
        />
        <div className="flex items-end gap-2 flex-wrap">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            className={smallInput}
          />
          <input
            type="text"
            placeholder="Motivo (opcional)"
            value={newBlockedReason}
            onChange={(e) => setNewBlockedReason(e.target.value)}
            className={`flex-1 min-w-[160px] placeholder:text-primary-gold/30 ${smallInput}`}
          />
          <button onClick={addBlockedDate} className={addButton}>
            <LuPlus size={13} /> Adicionar
          </button>
        </div>
        <DateList
          items={(configs.blockedDates ?? []).map((b) => ({ date: b.date, text: b.reason }))}
          empty="Sem motivo especificado"
          onRemove={(date) => set({ blockedDates: (configs.blockedDates ?? []).filter((b) => b.date !== date) })}
        />
      </div>

      {/* Datas especiais */}
      <div className="flex flex-col gap-3 pt-2 border-t border-primary-gold/10">
        <SectionTitle
          icon={<LuPartyPopper size={13} />}
          title="Datas especiais"
          text="Datas de eventos ou ocasiões especiais. Elas continuam abertas para reservas — o cliente só vê a data destacada em verde e a descrição do evento."
        />
        <div className="flex items-end gap-2 flex-wrap">
          <input
            type="date"
            value={newSpecialDate}
            onChange={(e) => setNewSpecialDate(e.target.value)}
            className={smallInput}
          />
          <input
            type="text"
            placeholder="Descrição do evento (opcional)"
            value={newSpecialDescription}
            onChange={(e) => setNewSpecialDescription(e.target.value)}
            className={`flex-1 min-w-[160px] placeholder:text-primary-gold/30 ${smallInput}`}
          />
          <button onClick={addSpecialDate} className={addButton}>
            <LuPlus size={13} /> Adicionar
          </button>
        </div>
        <DateList
          items={(configs.specialDates ?? []).map((s) => ({ date: s.date, text: s.description }))}
          empty="Sem descrição especificada"
          onRemove={(date) => set({ specialDates: (configs.specialDates ?? []).filter((s) => s.date !== date) })}
        />
      </div>
    </SettingsPanel>
  );
}
