"use client";

import React, { useState } from "react";
import { LuCalendarPlus, LuChevronDown } from "react-icons/lu";
import { buildReserveEvent, googleCalendarUrl, icsFile, outlookCalendarUrl, type ReserveEventInput } from "@/utils/reserveCalendar";

/** Botão da reserva confirmada: adiciona no Google Agenda, Apple/iPhone ou Outlook. */
export default function AddToCalendar(props: ReserveEventInput) {
  const [open, setOpen] = useState(false);
  const event = buildReserveEvent(props);
  if (!event) return null;

  const downloadIcs = () => {
    const blob = new Blob([icsFile(event, props.code)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reserva-carcassonne-${props.code}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const option =
    "flex w-full items-center justify-center rounded-lg border border-primary-gold/25 bg-primary-black/40 px-3 py-2 text-sm font-semibold text-primary-gold transition-colors hover:border-primary-gold/60 hover:bg-primary-gold/10";

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary-gold/45 bg-primary-gold/10 px-4 py-2.5 text-sm font-semibold text-primary-gold transition-colors hover:bg-primary-gold/20"
      >
        <LuCalendarPlus size={17} /> Adicionar ao meu calendário
        <LuChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={option}>
            Google Agenda
          </a>
          <button type="button" onClick={downloadIcs} className={option}>
            iPhone / Apple
          </button>
          <a href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={option}>
            Outlook
          </a>
          <button type="button" onClick={downloadIcs} className="text-xs text-primary-gold/50 underline-offset-2 hover:underline sm:col-span-3">
            Outro calendário: baixar o arquivo (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
