"use client";

import { useState } from "react";
import { Calendar } from "@heroui/calendar";
import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date";
import { LuX } from "react-icons/lu";

interface MultiDatePickerProps {
  dates: CalendarDate[];
  setDates: (dates: CalendarDate[]) => void;
  disabledDates?: CalendarDate[];
  label?: string;
}

const calendarClassNames = {
  cell: "text-primary-gold",
  cellButton:
    "hover:bg-dark-black cursor-pointer data-[selected=true]:bg-primary-gold data-[selected=true]:text-primary-black data-[selected=true]:font-semibold data-[outside-month=true]:text-gray-400 data-[unavailable=true]:line-through data-[unavailable=true]:opacity-40 data-[unavailable=true]:cursor-not-allowed",
  header: "bg-transparent",
  title: "text-primary-gold font-bold",
  gridHeaderCell: "text-primary-gold font-semibold",
  prevButton: "text-primary-gold hover:text-secondary-gold",
  nextButton: "text-primary-gold hover:text-secondary-gold",
  errorMessage: "text-primary-gold text-sm italic",
};

export default function MultiDatePicker({
  dates,
  setDates,
  disabledDates = [],
  label,
}: MultiDatePickerProps) {
  const [cursorDate, setCursorDate] = useState(() => today(getLocalTimeZone()));

  const isSameDate = (a: CalendarDate, b: CalendarDate) => a.compare(b) === 0;
  const isAlreadyPicked = (date: CalendarDate) =>
    dates.some((d) => isSameDate(d, date));
  const isDisabled = (date: CalendarDate) =>
    disabledDates.some((d) => isSameDate(d, date));

  // Cada clique num dia do calendário alterna ele dentro/fora da seleção —
  // não existe seleção múltipla nativa na lib de calendário usada, então
  // tratamos todo clique como toggle em vez de exigir um botão "adicionar".
  function handleCalendarClick(clickedDate: CalendarDate) {
    setCursorDate(clickedDate);
    if (isAlreadyPicked(clickedDate)) {
      setDates(dates.filter((d) => !isSameDate(d, clickedDate)));
      return;
    }
    setDates([...dates, clickedDate].sort((a, b) => a.compare(b)));
  }

  function handleRemoveDate(date: CalendarDate) {
    setDates(dates.filter((d) => !isSameDate(d, date)));
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="text-sm font-semibold text-primary-gold/70">
          {label}
        </span>
      )}
      <Calendar
        aria-label="Selecionar dias para agendar"
        value={cursorDate}
        onChange={handleCalendarClick}
        isDateUnavailable={(date) => isDisabled(date as CalendarDate)}
        className="bg-secondary-black/30 shadow-card-light"
        classNames={calendarClassNames}
      />
      <span className="text-[11px] text-primary-gold/40 italic text-center">
        Clique em um dia para adicionar ou remover da lista
        {dates.length > 0 &&
          ` · ${dates.length} dia${dates.length !== 1 ? "s" : ""} selecionado${dates.length !== 1 ? "s" : ""}`}
      </span>

      {dates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px]">
          {dates.map((date) => (
            <span
              key={date.toString()}
              className="flex items-center gap-1 text-xs bg-primary-gold/10 border border-primary-gold/25 text-primary-gold rounded-full pl-2.5 pr-1.5 py-1"
            >
              {date.day < 10 ? `0${date.day}` : date.day}/
              {date.month < 10 ? `0${date.month}` : date.month}/{date.year}
              <button
                type="button"
                onClick={() => handleRemoveDate(date)}
                className="cursor-pointer hover:text-invalid-color transition-colors"
              >
                <LuX size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
