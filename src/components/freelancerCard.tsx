"use client";

import { useState } from "react";
import { CalendarDate } from "@internationalized/date";
import {
  LuChevronDown,
  LuChevronUp,
  LuPencil,
  LuTrash,
  LuDollarSign,
  LuSquareCheckBig,
  LuSquareCheck,
  LuCheck,
  LuX,
  LuCalendarPlus,
} from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import {
  FreelancerBookingStatus,
  FreelancerBookingType,
  FreelancerType,
} from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import FreelancerRepository from "@/services/repositories/FreelancerRepository";
import FreelancerBookingRepository from "@/services/repositories/FreelancerBookingRepository";
import {
  bookingDateToDate,
  formatBookingDate,
  formatBookingWeekday,
  getRecentWindowCutoff,
  isBookingToday,
  isBookingUpToToday,
  isWithinRecentWindow,
  openWhatsApp,
} from "@/utils/utilFunctions";
import Tooltip from "./Tooltip";
import Input from "./input";
import MultiDatePicker from "./multiDatePicker";
import FreelancerPhotoPicker from "./freelancerPhotoPicker";

type FreelancerWithId = FreelancerType & { id: string };
type BookingWithId = FreelancerBookingType & { id: string };

const STATUS_ORDER: FreelancerBookingStatus[] = ["confirmed", "standby"];

const STATUS_META: Record<
  FreelancerBookingStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  confirmed: {
    label: "Confirmado",
    icon: <LuSquareCheckBig size={14} />,
    className: "border-green-700/50 text-green-700",
  },
  standby: {
    label: "Sobreaviso",
    icon: <LuSquareCheck size={14} />,
    className: "border-yellow-600/50 text-yellow-600",
  },
};

interface FreelancerCardProps {
  freelancer: FreelancerWithId;
  bookings: BookingWithId[];
  onFreelancerUpdated: (id: string, data: Partial<FreelancerType>) => void;
  onFreelancerDeleted: (id: string) => void;
  onBookingsUpdated: (freelancerId: string, bookings: BookingWithId[]) => void;
  requestConfirm: (message: string, onConfirm: () => void) => void;
}

export default function FreelancerCard({
  freelancer,
  bookings,
  onFreelancerUpdated,
  onFreelancerDeleted,
  onBookingsUpdated,
  requestConfirm,
}: FreelancerCardProps) {
  const { addAlert } = useAlert();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    name: freelancer.name,
    phone: freelancer.phone ?? "",
    notes: freelancer.notes ?? "",
    photoUrl: freelancer.photoUrl ?? "",
    photoSource: freelancer.photoSource ?? "",
  });
  const [newDates, setNewDates] = useState<CalendarDate[]>([]);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [savingDates, setSavingDates] = useState(false);

  const sortedBookings = [...bookings].sort(
    (a, b) =>
      bookingDateToDate(a.bookingDate).getTime() -
      bookingDateToDate(b.bookingDate).getTime(),
  );
  const recentBookings = sortedBookings.filter((b) =>
    isWithinRecentWindow(b.bookingDate),
  );
  const oldBookings = sortedBookings.filter(
    (b) => !isWithinRecentWindow(b.bookingDate),
  );
  const visibleBookings = showAllBookings ? sortedBookings : recentBookings;
  // Só conta como "pendente" dias de hoje pra trás — um dia futuro ainda não
  // aconteceu, então ainda não pagar por ele não é uma pendência.
  const pendingPaymentCount = bookings.filter(
    (b) => !b.isPayed && isBookingUpToToday(b.bookingDate),
  ).length;

  const disabledCalendarDates = bookings.map(
    (b) =>
      new CalendarDate(
        Number(b.bookingDate.year),
        Number(b.bookingDate.month),
        Number(b.bookingDate.day),
      ),
  );

  async function refreshBookings() {
    const refreshed = await FreelancerBookingRepository.getByFreelancerId(
      freelancer.id,
    );
    onBookingsUpdated(freelancer.id, refreshed as BookingWithId[]);
  }

  async function handleStatusClick(booking: BookingWithId) {
    const next =
      STATUS_ORDER[
        (STATUS_ORDER.indexOf(booking.status) + 1) % STATUS_ORDER.length
      ];
    const ok = await FreelancerBookingRepository.update(booking.id, {
      status: next,
    });
    if (!ok) {
      addAlert("Erro ao atualizar o status do agendamento.");
      return;
    }
    await refreshBookings();
  }

  async function handlePaymentClick(booking: BookingWithId) {
    const ok = await FreelancerBookingRepository.update(booking.id, {
      isPayed: !booking.isPayed,
    });
    if (!ok) {
      addAlert("Erro ao atualizar o status de pagamento.");
      return;
    }
    await refreshBookings();
  }

  function handleDeleteBooking(booking: BookingWithId) {
    requestConfirm(
      `Excluir o agendamento de ${formatBookingDate(booking.bookingDate)}?`,
      async () => {
        const ok = await FreelancerBookingRepository.delete(booking.id);
        if (!ok) {
          addAlert("Erro ao excluir agendamento.");
          return;
        }
        await refreshBookings();
      },
    );
  }

  function handleDeleteOldBookings() {
    requestConfirm(
      `Excluir os ${oldBookings.length} agendamento(s) antigo(s) de ${freelancer.name}? Esta ação não pode ser desfeita.`,
      async () => {
        const ok = await FreelancerBookingRepository.deleteOlderThan(
          freelancer.id,
          getRecentWindowCutoff(),
        );
        if (!ok) {
          addAlert("Erro ao excluir agendamentos antigos.");
          return;
        }
        addAlert("Agendamentos antigos excluídos com sucesso.");
        await refreshBookings();
      },
    );
  }

  function handleDeleteFreelancer() {
    requestConfirm(
      `Excluir o freelancer ${freelancer.name}? Isso vai remover também ${bookings.length} agendamento(s) dele.`,
      async () => {
        const ok = await FreelancerRepository.delete(freelancer.id);
        if (!ok) {
          addAlert("Erro ao excluir freelancer.");
          return;
        }
        addAlert(`Freelancer ${freelancer.name} excluído com sucesso.`);
        onFreelancerDeleted(freelancer.id);
      },
    );
  }

  async function handleSaveEdit() {
    if (!editDraft.name.trim()) {
      addAlert("O nome é obrigatório.");
      return;
    }
    const data = {
      name: editDraft.name.trim(),
      phone: editDraft.phone.trim(),
      notes: editDraft.notes.trim(),
      photoUrl: editDraft.photoUrl,
      photoSource: editDraft.photoSource,
    };
    const ok = await FreelancerRepository.update(freelancer.id, data);
    if (!ok) {
      addAlert("Erro ao atualizar freelancer.");
      return;
    }
    onFreelancerUpdated(freelancer.id, data);
    if (data.name !== freelancer.name) {
      await refreshBookings();
    }
    addAlert("Freelancer atualizado com sucesso.");
    setEditing(false);
  }

  async function handleSaveDates() {
    if (newDates.length === 0 || savingDates) return;
    setSavingDates(true);
    try {
      const ok = await FreelancerBookingRepository.createMany(
        newDates.map((date) => ({
          freelancerId: freelancer.id,
          freelancerName: freelancer.name,
          status: "confirmed" as const,
          isPayed: false,
          bookingDate: {
            day: date.day.toString(),
            month: date.month.toString(),
            year: date.year.toString(),
          },
        })),
      );
      if (!ok) {
        addAlert("Erro ao agendar dias.");
        return;
      }
      addAlert(
        `${newDates.length} dia${newDates.length !== 1 ? "s" : ""} agendado${newDates.length !== 1 ? "s" : ""} para ${freelancer.name}.`,
      );
      setNewDates([]);
      await refreshBookings();
    } finally {
      setSavingDates(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-primary-gold/15 bg-secondary-black/40 transition-all">
      {/* Header */}
      <div
        onClick={() => setExpanded((prev) => !prev)}
        className={`flex items-center justify-between gap-2 px-4 py-3 rounded-t-xl cursor-pointer hover:bg-primary-gold/5 transition-colors flex-wrap ${
          !expanded && "rounded-b-xl"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <LuChevronUp size={16} className="text-primary-gold/50 shrink-0" />
          ) : (
            <LuChevronDown
              size={16}
              className="text-primary-gold/50 shrink-0"
            />
          )}
          {freelancer.photoUrl && (
            <img
              src={freelancer.photoUrl}
              alt={freelancer.name}
              className="w-12 h-12 rounded-full object-cover border border-primary-gold/25 shrink-0"
            />
          )}
          <span className="font-semibold text-primary-gold truncate">
            {freelancer.name}
          </span>
          {freelancer.phone && (
            <Tooltip content="Abrir WhatsApp" direction="top">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openWhatsApp(freelancer.phone!);
                }}
                className="p-1 rounded-md text-primary-gold/40 hover:text-green-600 transition-colors cursor-pointer"
              >
                <FaWhatsapp size={13} />
              </button>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60">
            {bookings.length} dia{bookings.length !== 1 ? "s" : ""}
          </span>
          {pendingPaymentCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-invalid-color/10 border border-invalid-color/30 text-invalid-color">
              {pendingPaymentCount} não pago
              {pendingPaymentCount !== 1 ? "s" : ""}
            </span>
          )}
          <Tooltip content="Editar freelancer" direction="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
                setExpanded(true);
              }}
              className="p-1.5 rounded-lg border border-primary-gold/15 hover:border-primary-gold/50 text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuPencil size={13} />
            </button>
          </Tooltip>
          <Tooltip content="Excluir freelancer" direction="top">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFreelancer();
              }}
              className="p-1.5 rounded-lg border border-primary-gold/15 hover:border-invalid-color/50 hover:text-invalid-color text-primary-gold/40 transition-all cursor-pointer"
            >
              <LuTrash size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 px-4 pb-4 border-t border-primary-gold/10 pt-3">
          {editing ? (
            <div className="flex flex-col gap-3 items-center bg-primary-black/30 rounded-lg p-3">
              <FreelancerPhotoPicker
                photoUrl={editDraft.photoUrl}
                onChange={(photo) =>
                  setEditDraft({
                    ...editDraft,
                    photoUrl: photo?.url ?? "",
                    photoSource: photo?.source ?? "",
                  })
                }
              />
              <Input
                label="Nome"
                placeholder="Nome do Freelancer"
                value={editDraft.name}
                setValue={(e) =>
                  setEditDraft({ ...editDraft, name: e.target.value })
                }
                variant
                width="!w-[min(240px,100%)]"
              />
              <Input
                label="WhatsApp"
                placeholder="Número de WhatsApp"
                value={editDraft.phone}
                setValue={(e) =>
                  setEditDraft({ ...editDraft, phone: e.target.value })
                }
                variant
                width="!w-[min(240px,100%)]"
              />
              <Input
                label="Observações"
                placeholder="Observações"
                value={editDraft.notes}
                setValue={(e) =>
                  setEditDraft({ ...editDraft, notes: e.target.value })
                }
                variant
                width="!w-[min(240px,100%)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditDraft({
                      name: freelancer.name,
                      phone: freelancer.phone ?? "",
                      notes: freelancer.notes ?? "",
                      photoUrl: freelancer.photoUrl ?? "",
                      photoSource: freelancer.photoSource ?? "",
                    });
                    setEditing(false);
                  }}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
                >
                  <LuX size={14} /> Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-primary-gold/40 text-primary-gold hover:bg-primary-gold/10 transition-all cursor-pointer"
                >
                  <LuCheck size={14} /> Salvar
                </button>
              </div>
            </div>
          ) : (
            freelancer.notes && (
              <p className="text-xs italic text-primary-gold/45">
                {freelancer.notes}
              </p>
            )
          )}

          {/* Adicionar dias */}
          <div className="flex flex-col items-center gap-2 bg-primary-black/30 rounded-lg p-3">
            <span className="text-xs font-semibold text-primary-gold/60 flex items-center gap-1.5">
              <LuCalendarPlus size={13} /> Agendar novo(s) dia(s)
            </span>
            <MultiDatePicker
              dates={newDates}
              setDates={setNewDates}
              disabledDates={disabledCalendarDates}
            />
            {newDates.length > 0 && (
              <button
                onClick={handleSaveDates}
                disabled={savingDates}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-primary-gold/40 text-primary-gold hover:bg-primary-gold/10 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                Salvar {newDates.length} dia{newDates.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* Lista de agendamentos */}
          <div className="flex flex-col gap-2">
            {visibleBookings.length === 0 ? (
              <span className="text-xs text-primary-gold/35 italic text-center py-2">
                Nenhum dia agendado.
              </span>
            ) : (
              visibleBookings.map((booking) => {
                const meta = STATUS_META[booking.status];
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 bg-primary-black/40 border border-primary-gold/10 rounded-lg flex-wrap"
                  >
                    <span className="text-sm text-primary-gold/80 capitalize flex items-center gap-1.5 flex-wrap">
                      {formatBookingWeekday(booking.bookingDate)}{" "}
                      {formatBookingDate(booking.bookingDate)}
                      {isBookingToday(booking.bookingDate) && (
                        <span className="text-[10px] normal-case font-semibold px-1.5 py-0.5 rounded-full bg-primary-gold text-primary-black">
                          Hoje
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Tooltip content={meta.label} direction="top">
                        <button
                          onClick={() => handleStatusClick(booking)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer bg-primary-black/60 ${meta.className}`}
                        >
                          {meta.icon}
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={booking.isPayed ? "Pago" : "Não pago"}
                        direction="top"
                      >
                        <button
                          onClick={() => handlePaymentClick(booking)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer bg-primary-black/60 ${
                            booking.isPayed
                              ? "border-green-700/50 text-green-700"
                              : "border-invalid-color/50 text-invalid-color"
                          }`}
                        >
                          <LuDollarSign size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Excluir agendamento" direction="top">
                        <button
                          onClick={() => handleDeleteBooking(booking)}
                          className="p-1.5 rounded-lg border border-primary-gold/15 hover:border-invalid-color/50 hover:text-invalid-color text-primary-gold/40 bg-primary-black/60 transition-all cursor-pointer"
                        >
                          <LuTrash size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {oldBookings.length > 0 && (
            <div className="flex items-center justify-between text-xs flex-wrap gap-2 border-t border-primary-gold/10 pt-2">
              <button
                onClick={() => setShowAllBookings((prev) => !prev)}
                className="text-primary-gold/40 hover:text-primary-gold italic transition-colors cursor-pointer"
              >
                {showAllBookings
                  ? "Ocultar agendamentos antigos"
                  : `Ver todos os agendamentos antigos (${oldBookings.length})`}
              </button>
              <button
                onClick={handleDeleteOldBookings}
                className="flex items-center gap-1 text-primary-gold/40 hover:text-invalid-color italic transition-colors cursor-pointer"
              >
                <LuTrash size={12} /> Excluir agendamentos antigos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
