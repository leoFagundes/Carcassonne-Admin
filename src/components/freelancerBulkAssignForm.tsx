"use client";

import { useMemo, useState } from "react";
import { CalendarDate } from "@internationalized/date";
import { LuCalendarRange, LuSearch } from "react-icons/lu";
import { FreelancerBookingType, FreelancerType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import FreelancerBookingRepository from "@/services/repositories/FreelancerBookingRepository";
import MultiDatePicker from "./multiDatePicker";
import Button from "./button";

type FreelancerWithId = FreelancerType & { id: string };
type BookingWithId = FreelancerBookingType & { id: string };

interface FreelancerBulkAssignFormProps {
  freelancers: FreelancerWithId[];
  bookingsByFreelancer: Record<string, BookingWithId[]>;
  onClose: VoidFunction;
  onAssigned: VoidFunction;
}

function isSameCalendarDate(
  date: CalendarDate,
  bookingDate: { day: string; month: string; year: string },
) {
  return (
    date.day === Number(bookingDate.day) &&
    date.month === Number(bookingDate.month) &&
    date.year === Number(bookingDate.year)
  );
}

export default function FreelancerBulkAssignForm({
  freelancers,
  bookingsByFreelancer,
  onClose,
  onAssigned,
}: FreelancerBulkAssignFormProps) {
  const { addAlert } = useAlert();
  const [selectedDates, setSelectedDates] = useState<CalendarDate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visibleFreelancers = useMemo(
    () =>
      freelancers.filter((f) =>
        f.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [freelancers, search],
  );

  function toggleFreelancer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedDates.length === 0) {
      addAlert("Selecione ao menos um dia.");
      return;
    }
    if (selectedIds.size === 0) {
      addAlert("Selecione ao menos um freelancer.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const toCreate: FreelancerBookingType[] = [];
      let skipped = 0;

      selectedIds.forEach((freelancerId) => {
        const freelancer = freelancers.find((f) => f.id === freelancerId);
        if (!freelancer) return;
        const existing = bookingsByFreelancer[freelancerId] ?? [];

        selectedDates.forEach((date) => {
          const alreadyBooked = existing.some((b) =>
            isSameCalendarDate(date, b.bookingDate),
          );
          if (alreadyBooked) {
            skipped += 1;
            return;
          }
          toCreate.push({
            freelancerId,
            freelancerName: freelancer.name,
            status: "confirmed" as const,
            isPayed: false,
            bookingDate: {
              day: date.day.toString(),
              month: date.month.toString(),
              year: date.year.toString(),
            },
          });
        });
      });

      if (toCreate.length === 0) {
        addAlert(
          "Todos os freelancers selecionados já estavam agendados nesses dias.",
        );
        return;
      }

      const ok = await FreelancerBookingRepository.createMany(toCreate);
      if (!ok) {
        addAlert("Erro ao atribuir os freelancers.");
        return;
      }

      addAlert(
        `${toCreate.length} agendamento${toCreate.length !== 1 ? "s" : ""} criado${
          toCreate.length !== 1 ? "s" : ""
        }${
          skipped > 0
            ? ` · ${skipped} já existia${skipped !== 1 ? "m" : ""} e foi${
                skipped !== 1 ? "ram" : ""
              } ignorado${skipped !== 1 ? "s" : ""}`
            : ""
        }`,
      );
      onAssigned();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex justify-center w-full h-full text-primary-gold">
      <div className="flex flex-col items-center w-fit rounded px-3 py-6 sm:p-8 gap-6 overflow-y-auto max-h-[100%] max-w-[100%] sm:max-h-[90%] sm:max-w-[90%]">
        <div className="w-full text-center">
          <h1 className="text-xl sm:text-2xl text-gradient-gold flex items-center justify-center gap-2">
            <LuCalendarRange size={20} className="shrink-0" />
            Atribuir freelancers a dia(s)
          </h1>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent mt-2" />
        </div>

        <div className="flex gap-6 flex-wrap justify-center w-full">
          <MultiDatePicker
            dates={selectedDates}
            setDates={setSelectedDates}
            label="1. Escolha o(s) dia(s)"
          />

          <section className="flex flex-col gap-2 w-full sm:w-[260px]">
            <span className="text-sm font-semibold text-primary-gold/70 text-center">
              2. Escolha o(s) freelancer(s)
            </span>
            <div className="relative">
              <LuSearch
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-gold/35 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar freelancer..."
                className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg pl-7 pr-2 py-1.5 text-sm text-primary-gold placeholder:text-primary-gold/25 focus:outline-none focus:border-primary-gold/40 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-0.5 max-h-[220px] overflow-y-auto pr-1 border border-primary-gold/10 rounded-lg bg-primary-black/20 p-1.5">
              {visibleFreelancers.length === 0 ? (
                <span className="text-xs text-primary-gold/35 italic text-center py-2">
                  Nenhum freelancer encontrado.
                </span>
              ) : (
                visibleFreelancers.map((freelancer) => (
                  <label
                    key={freelancer.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-primary-gold/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(freelancer.id)}
                      onChange={() => toggleFreelancer(freelancer.id)}
                      className="accent-primary-gold cursor-pointer shrink-0"
                    />
                    {freelancer.photoUrl && (
                      <img
                        src={freelancer.photoUrl}
                        alt={freelancer.name}
                        className="w-5 h-5 rounded-full object-cover shrink-0"
                      />
                    )}
                    <span className="text-sm truncate">{freelancer.name}</span>
                  </label>
                ))
              )}
            </div>
            {selectedIds.size > 0 && (
              <span className="text-[11px] text-primary-gold/40 text-center">
                {selectedIds.size} freelancer{selectedIds.size !== 1 ? "s" : ""}{" "}
                selecionado{selectedIds.size !== 1 ? "s" : ""}
              </span>
            )}
          </section>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => onClose()} type="button">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} type="button" disabled={submitting}>
            Atribuir
          </Button>
        </div>
      </div>
    </div>
  );
}
