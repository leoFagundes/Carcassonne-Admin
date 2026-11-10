"use client";

import { useEffect, useState } from "react";
import { LuUsers } from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import DayAttendanceRepository from "@/services/repositories/DayAttendanceRepository";
import { dateKeyOf } from "@/utils/attendance";

/**
 * "Quantas pessoas vieram hoje": a equipe anota o público real do dia (com e
 * sem reserva). Vazio = as estatísticas contam pelas reservas do dia.
 */
export default function DayAttendanceCard({
  date,
  reservedPeople,
}: {
  date: { day: number; month: number; year: number };
  /** Pessoas nas reservas confirmadas do dia (o padrão quando não há anotação). */
  reservedPeople: number;
}) {
  const { addAlert } = useAlert();
  const key = dateKeyOf(date);
  const [saved, setSaved] = useState<number | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setSaved(undefined);
    DayAttendanceRepository.get(key).then((people) => {
      if (!alive) return;
      setSaved(people);
      setText(people === null ? "" : String(people));
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const people = text.trim() === "" ? null : Number(text);
  const invalid = people !== null && (!Number.isInteger(people) || people < 0 || people > 5000);
  const changed = saved !== undefined && people !== saved;

  const save = async () => {
    if (invalid || saving) return;
    setSaving(true);
    const ok = await DayAttendanceRepository.set(key, people);
    setSaving(false);
    if (!ok) return addAlert("Não foi possível salvar. Tente novamente.");
    setSaved(people);
    addAlert(people === null ? "Público do dia apagado: conta pelas reservas." : `Público do dia salvo: ${people} pessoas.`);
  };

  return (
    <div className="flex flex-col gap-2 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3 max-w-[267.84px]">
      <span className="text-sm font-semibold text-primary-gold/70 flex items-center gap-1.5">
        <LuUsers size={14} /> Quantas pessoas vieram?
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label="Pessoas que vieram no dia"
          placeholder={String(reservedPeople)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={saved === undefined}
          className={`w-24 rounded-lg border bg-primary-black/50 px-2.5 py-1.5 text-sm text-primary-gold outline-none ${
            invalid ? "border-invalid-color/60" : "border-primary-gold/20 focus:border-primary-gold/50"
          }`}
        />
        <button
          type="button"
          onClick={save}
          disabled={!changed || invalid || saving}
          className="h-8 px-3 rounded-lg border border-primary-gold/40 text-xs font-semibold text-primary-gold hover:bg-primary-gold/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-primary-gold/45">
        Conte também quem veio sem reserva. {saved === null || text.trim() === ""
          ? `Vazio: as estatísticas usam as ${reservedPeople} pessoas das reservas.`
          : "Esse número substitui o das reservas nas estatísticas."}
      </p>
    </div>
  );
}
