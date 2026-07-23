"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LuArrowLeft,
  LuCalendarRange,
  LuSearch,
  LuUserPlus,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { FreelancerType, FreelancerBookingType } from "@/types";
import FreelancerRepository from "@/services/repositories/FreelancerRepository";
import FreelancerBookingRepository from "@/services/repositories/FreelancerBookingRepository";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Modal from "@/components/modal";
import Tooltip from "@/components/Tooltip";
import FreelancerAdminForms from "@/components/freelancerAdminForms";
import FreelancerCard from "@/components/freelancerCard";
import FreelancerBulkAssignForm from "@/components/freelancerBulkAssignForm";
import {
  bookingDateToDate,
  isBookingToday,
  isBookingUpToToday,
  isBookingWithinNextDays,
} from "@/utils/utilFunctions";

type FreelancerWithId = FreelancerType & { id: string };
type BookingWithId = FreelancerBookingType & { id: string };
type FilterMode = "all" | "today" | "week" | "unpaid";

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "Próximos 7 dias" },
  { key: "unpaid", label: "Pagamento pendente" },
];

export default function FreelancerAdminPage() {
  const router = useRouter();
  const { addAlert } = useAlert();

  const [freelancers, setFreelancers] = useState<FreelancerWithId[]>([]);
  const [bookingsByFreelancer, setBookingsByFreelancer] = useState<
    Record<string, BookingWithId[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [createModal, setCreateModal] = useState(false);
  const [bulkAssignModal, setBulkAssignModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [fetchedFreelancers, fetchedBookings] = await Promise.all([
        FreelancerRepository.getAll(),
        FreelancerBookingRepository.getAll(),
      ]);
      setFreelancers(fetchedFreelancers);

      const grouped: Record<string, BookingWithId[]> = {};
      fetchedBookings.forEach((booking) => {
        if (!grouped[booking.freelancerId]) grouped[booking.freelancerId] = [];
        grouped[booking.freelancerId].push(booking);
      });
      setBookingsByFreelancer(grouped);
    } catch (error) {
      addAlert("Erro ao carregar os freelancers.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function handleFreelancerUpdated(
    id: string,
    data: Partial<FreelancerType>,
  ) {
    setFreelancers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...data } : f)),
    );
  }

  function handleFreelancerDeleted(id: string) {
    setFreelancers((prev) => prev.filter((f) => f.id !== id));
    setBookingsByFreelancer((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleBookingsUpdated(
    freelancerId: string,
    bookings: BookingWithId[],
  ) {
    setBookingsByFreelancer((prev) => ({ ...prev, [freelancerId]: bookings }));
  }

  function requestConfirm(message: string, onConfirm: () => void) {
    setConfirmModal({ message, onConfirm });
  }

  const allBookings = Object.values(bookingsByFreelancer).flat();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Pendência de pagamento só conta dias de hoje pra trás — um dia futuro
  // ainda não aconteceu, então ainda não ter sido pago não é uma pendência.
  const totalUnpaid = allBookings.filter(
    (b) => !b.isPayed && b.status !== "canceled" && isBookingUpToToday(b.bookingDate),
  ).length;
  const totalUpcoming = allBookings.filter(
    (b) => b.status !== "canceled" && bookingDateToDate(b.bookingDate) >= today,
  ).length;

  // Timestamp do próximo dia agendado (não cancelado, hoje em diante) — usado
  // pra ordenar a lista com quem vai trabalhar em breve no topo.
  function getNextBookingTimestamp(freelancerId: string): number {
    const upcoming = (bookingsByFreelancer[freelancerId] ?? [])
      .filter(
        (b) => b.status !== "canceled" && bookingDateToDate(b.bookingDate) >= today,
      )
      .map((b) => bookingDateToDate(b.bookingDate).getTime());
    return upcoming.length > 0 ? Math.min(...upcoming) : Infinity;
  }

  function freelancerMatchesFilter(freelancerId: string, mode: FilterMode): boolean {
    const bookings = bookingsByFreelancer[freelancerId] ?? [];
    switch (mode) {
      case "today":
        return bookings.some(
          (b) => b.status !== "canceled" && isBookingToday(b.bookingDate),
        );
      case "week":
        return bookings.some(
          (b) => b.status !== "canceled" && isBookingWithinNextDays(b.bookingDate, 7),
        );
      case "unpaid":
        return bookings.some(
          (b) =>
            b.status !== "canceled" &&
            !b.isPayed &&
            isBookingUpToToday(b.bookingDate),
        );
      default:
        return true;
    }
  }

  const searchedFreelancers = freelancers.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const filterCounts: Record<FilterMode, number> = {
    all: searchedFreelancers.length,
    today: searchedFreelancers.filter((f) => freelancerMatchesFilter(f.id, "today"))
      .length,
    week: searchedFreelancers.filter((f) => freelancerMatchesFilter(f.id, "week"))
      .length,
    unpaid: searchedFreelancers.filter((f) => freelancerMatchesFilter(f.id, "unpaid"))
      .length,
  };

  const filteredFreelancers = searchedFreelancers
    .filter((f) => freelancerMatchesFilter(f.id, filterMode))
    .sort((a, b) => {
      const diff = getNextBookingTimestamp(a.id) - getNextBookingTimestamp(b.id);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col gap-5 w-full h-full overflow-y-auto">
      {loading && <LoaderFullscreen />}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full flex-wrap px-2">
          <Tooltip direction="bottom" content="Voltar para reservas">
            <button
              onClick={() => router.push("/myreserves")}
              className="p-2.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer shrink-0"
            >
              <LuArrowLeft size={16} />
            </button>
          </Tooltip>
          <div className="flex items-center gap-2 min-w-0">
            <LuUsers size={28} className="text-primary-gold/70 shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold text-primary-gold truncate">
                Freelancers
              </h1>
              <span className="text-xs text-primary-gold/40">
                {freelancers.length} cadastrado
                {freelancers.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <Tooltip direction="bottom" content="Cadastrar novo freelancer">
            <button
              onClick={() => setCreateModal(true)}
              className="p-2.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer shrink-0"
            >
              <LuUserPlus size={16} />
            </button>
          </Tooltip>
          <Tooltip direction="bottom" content="Atribuir freelancers a um ou mais dias">
            <button
              onClick={() => setBulkAssignModal(true)}
              className="p-2.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer shrink-0"
            >
              <LuCalendarRange size={16} />
            </button>
          </Tooltip>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />

        {/* Stats */}
        <div className="flex items-center justify-center gap-3 flex-wrap text-xs text-primary-gold/60">
          <span className="px-3 py-1 rounded-full bg-secondary-black/40 border border-primary-gold/15">
            {totalUpcoming} agendamento{totalUpcoming !== 1 ? "s" : ""} a partir de hoje
          </span>
          {totalUnpaid > 0 && (
            <span className="px-3 py-1 rounded-full bg-invalid-color/10 border border-invalid-color/30 text-invalid-color">
              {totalUnpaid} pagamento{totalUnpaid !== 1 ? "s" : ""} pendente
              {totalUnpaid !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="relative w-full max-w-sm mx-auto">
          <LuSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-gold/35 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar freelancer por nome..."
            className="w-full bg-secondary-black/40 border border-primary-gold/15 rounded-xl pl-8 pr-8 py-2 text-sm text-primary-gold placeholder:text-primary-gold/25 focus:outline-none focus:border-primary-gold/35 transition-colors"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-gold/35 hover:text-primary-gold/70 transition-colors cursor-pointer"
            >
              <LuX size={13} />
            </button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterMode(filter.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                filterMode === filter.key
                  ? "bg-primary-gold text-primary-black border-primary-gold font-semibold"
                  : "border-primary-gold/20 text-primary-gold/50 hover:border-primary-gold/50 hover:text-primary-gold"
              }`}
            >
              {filter.label} ({filterCounts[filter.key]})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 max-w-[720px] w-full mx-auto px-4 pb-6">
        {filteredFreelancers.length === 0 ? (
          <section className="flex flex-col items-center justify-center text-primary-gold p-6 w-full rounded-xl border border-primary-gold/15 bg-secondary-black/40">
            <img
              className="w-[140px] opacity-70"
              src="/images/mascote-triste.png"
              alt="mascote-triste"
            />
            <span className="text-base sm:text-lg text-center text-primary-gold/60 mt-2">
              {freelancers.length === 0
                ? "Nenhum freelancer cadastrado ainda"
                : "Nenhum freelancer encontrado"}
            </span>
          </section>
        ) : (
          filteredFreelancers.map((freelancer) => (
            <FreelancerCard
              key={freelancer.id}
              freelancer={freelancer}
              bookings={bookingsByFreelancer[freelancer.id] ?? []}
              onFreelancerUpdated={handleFreelancerUpdated}
              onFreelancerDeleted={handleFreelancerDeleted}
              onBookingsUpdated={handleBookingsUpdated}
              requestConfirm={requestConfirm}
            />
          ))
        )}
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)}>
        <FreelancerAdminForms
          onClose={() => setCreateModal(false)}
          onCreated={loadAll}
        />
      </Modal>

      <Modal isOpen={bulkAssignModal} onClose={() => setBulkAssignModal(false)}>
        <FreelancerBulkAssignForm
          freelancers={freelancers}
          bookingsByFreelancer={bookingsByFreelancer}
          onClose={() => setBulkAssignModal(false)}
          onAssigned={loadAll}
        />
      </Modal>

      {/* Modal de confirmação simples */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="bg-secondary-black border border-primary-gold/20 rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex flex-col gap-4">
              <p className="text-sm text-primary-gold/80">
                {confirmModal.message}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold hover:border-primary-gold/40 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-1.5 text-sm rounded-lg border border-invalid-color/40 text-invalid-color bg-invalid-color/10 hover:bg-invalid-color/20 transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
