"use client";

import React, { useEffect, useRef, useState } from "react";
import { Calendar } from "@heroui/react";
import { today, getLocalTimeZone, CalendarDate } from "@internationalized/date";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { FreelancerControllType, ReserveType } from "@/types";
import {
  LuBookCheck,
  LuBookX,
  LuCalendar,
  LuCalendarCheck,
  LuCalendarCog,
  LuCalendarPlus,
  LuCalendarSearch,
  LuCalendarX,
  LuDollarSign,
  LuLink,
  LuPrinter,
  LuSquareCheck,
  LuSquareCheckBig,
  LuTrash,
  LuUserPlus,
  LuUserRoundCheck,
  LuX,
} from "react-icons/lu";
import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { openEmail, openWhatsApp } from "@/utils/utilFunctions";
import Input from "@/components/input";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import Modal from "@/components/modal";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import ReserveAdminForms from "@/components/reserveAdminForms";
import { useRouter } from "next/navigation";
import interactionPlugin from "@fullcalendar/interaction";
import FreelancerRepository from "@/services/repositories/FreelancerRepository";
import FreelancerAdminForms from "@/components/freelancerAdminForms";
import PrintModal from "./printModal";
import { FiX } from "react-icons/fi";

type EventFullCalendar = {
  title: string;
  start: string;
  extendedProps?: { status?: "confirmed" | "canceled"; type?: "freelancer" };
};

export type PrintProps = {
  printTime: boolean;
  printIncludeChecks: boolean;
  printIncludeObservation: boolean;
  printPosition: "top" | "center";
  printWaterMark: boolean;
  printWaterMarkOpacity: number;
  printFontSize: "small" | "medium" | "large";
  printSeparateByAge: boolean;
};

const TODAY = today(getLocalTimeZone());

export default function Rerserve() {
  const [date, setDate] = useState(TODAY);
  const [fullCalendarDate, setFullCalendarDate] = useState(
    today(getLocalTimeZone()),
  );
  const [reserves, setReserves] = useState<ReserveType[]>([]);
  const [freelancers, setFrelancers] = useState<FreelancerControllType[]>([]);
  const [allReserves, setAllReserves] = useState<ReserveType[]>([]);
  const [allFreelancers, setAllFreelancers] = useState<
    FreelancerControllType[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [expandedCalendarModal, setExpandedCalendarModal] = useState(false);
  const [freelancerFormsModal, setFreelancerFormsModal] = useState(false);
  const [calendarFormsModal, setCalendarFormsModal] = useState(false);
  const [currentFormsType, setCurrentFormsType] = useState<"edit" | "add" | "">(
    "",
  );
  const [currentReserve, setCurrentReserve] = useState<ReserveType>();
  const [printModal, setPrintModal] = useState(false);

  const [printConfigs, setPrintConfigs] = useState<PrintProps>({
    printTime: false,
    printIncludeChecks: false,
    printIncludeObservation: false,
    printPosition: "top",
    printWaterMark: true,
    printWaterMarkOpacity: 0.1,
    printFontSize: "small",
    printSeparateByAge: false,
  });

  const isLargeScreen = useIsLargeScreen();
  const { addAlert } = useAlert();

  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return; // garante que roda só no client

    const params = new URLSearchParams(window.location.search);
    const createreserve = params.get("createreserve");
    const createfreela = params.get("createfreela");

    if (createreserve === "true") {
      setCalendarFormsModal(true);
      setCurrentFormsType("add");
    }

    if (createfreela === "true") {
      setFreelancerFormsModal(true);
    }
  }, []);

  const events = transformToFullCalendarEvents(
    allReserves as (ReserveType & { id: string })[],
    allFreelancers as (FreelancerControllType & { id: string })[],
  );

  function transformToFullCalendarEvents(
    reserves: (ReserveType & { id: string })[],
    freelancers: (FreelancerControllType & { id: string })[],
  ): EventFullCalendar[] {
    const confirmedReserves = reserves.filter((r) => r.status === "confirmed");
    const canceledReserves = reserves.filter((r) => r.status === "canceled");

    const groupedByDateConfirmed: Record<
      string,
      { totalPeople: number; totalReserves: number }
    > = {};
    const groupedByDateCanceled: Record<
      string,
      { totalPeople: number; totalReserves: number }
    > = {};
    const groupedByDateFreelancers: Record<string, number> = {};

    confirmedReserves.forEach((r) => {
      const { year, month, day } = r.bookingDate;
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const totalPeople = (r.adults ?? 0) + (r.childs ?? 0);

      if (!groupedByDateConfirmed[dateKey])
        groupedByDateConfirmed[dateKey] = { totalPeople: 0, totalReserves: 0 };
      groupedByDateConfirmed[dateKey].totalPeople += totalPeople;
      groupedByDateConfirmed[dateKey].totalReserves += 1;
    });

    canceledReserves.forEach((r) => {
      const { year, month, day } = r.bookingDate;
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const totalPeople = (r.adults ?? 0) + (r.childs ?? 0);

      if (!groupedByDateCanceled[dateKey])
        groupedByDateCanceled[dateKey] = { totalPeople: 0, totalReserves: 0 };
      groupedByDateCanceled[dateKey].totalPeople += totalPeople;
      groupedByDateCanceled[dateKey].totalReserves += 1;
    });

    freelancers.forEach((f) => {
      const { year, month, day } = f.bookingDate;
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      groupedByDateFreelancers[dateKey] =
        (groupedByDateFreelancers[dateKey] ?? 0) + 1;
    });

    const events: EventFullCalendar[] = [];

    Object.entries(groupedByDateConfirmed).forEach(
      ([date, { totalPeople, totalReserves }]) => {
        events.push({
          title: `${totalPeople} ${isLargeScreen ? "Pessoas" : "P"}`,
          start: `${date}T09:00:00`,
        });
        events.push({
          title: `${totalReserves} ${isLargeScreen ? "Reservas Ati." : "ra"}`,
          start: `${date}T10:00:00`,
        });
      },
    );

    Object.entries(groupedByDateCanceled).forEach(
      ([date, { totalReserves }]) => {
        events.push({
          title: `${totalReserves} ${isLargeScreen ? "Reservas Can." : "rc"}`,
          start: `${date}T12:00:00`,
          extendedProps: { status: "canceled" },
        });
      },
    );

    Object.entries(groupedByDateFreelancers).forEach(([date, totalFreelas]) => {
      events.push({
        title: `${totalFreelas} ${isLargeScreen ? "Freelas" : "F"}`,
        start: `${date}T14:00:00`,
        extendedProps: { type: "freelancer" },
      });
    });

    return events;
  }

  function useIsLargeScreen() {
    const [isLargeScreen, setIsLargeScreen] = useState(false);

    useEffect(() => {
      function handleResize() {
        setIsLargeScreen(window.innerWidth > 1200);
      }

      handleResize();

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isLargeScreen;
  }

  useEffect(() => {
    async function getReserves() {
      setLoading(true);
      try {
        const dataBusca = new Date(date.year, date.month - 1, date.day); // mês é 0-indexado (7 = agosto)
        const fetchedReserves = await ReserveRepository.getByDate(dataBusca);
        console.log(
          `Reservas para ${dataBusca.toLocaleDateString()}:`,
          fetchedReserves,
        );
        setReserves(fetchedReserves);
      } catch (error) {
        addAlert("Erro ao carregar as reservas desse dia.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    async function getFrelancers() {
      setLoading(true);
      try {
        const dataBusca = new Date(date.year, date.month - 1, date.day); // mês é 0-indexado (7 = agosto)
        const fetchedFreelancers =
          await FreelancerRepository.getByDate(dataBusca);
        console.log(
          `Freelancers para ${dataBusca.toLocaleDateString()}:`,
          fetchedFreelancers,
        );
        setFrelancers(fetchedFreelancers);
      } catch (error) {
        addAlert("Erro ao carregar os freelancers desse dia.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    getReserves();
    getFrelancers();
  }, [date, calendarFormsModal, freelancerFormsModal]);

  useEffect(() => {
    async function getAllReserves() {
      try {
        const allReserves = await ReserveRepository.getAll();
        setAllReserves(allReserves);
      } catch (error) {
        addAlert("Erro ao carregar as reservas.");
        console.error(error);
      }
    }

    async function getAllFreelancers() {
      try {
        const allFreelasFecthed = await FreelancerRepository.getAll();
        setAllFreelancers(allFreelasFecthed);
      } catch (error) {
        addAlert("Erro ao carregar as freelancers.");
        console.error(error);
      }
    }

    getAllFreelancers();

    getAllReserves();
  }, [expandedCalendarModal]);

  async function changeReserveStatus(
    id: string | undefined,
    newStatus: "confirmed" | "canceled",
    reserve: ReserveType,
  ) {
    try {
      if (id) {
        const reserveWithNewStatus = {
          ...reserve,
          status: newStatus,
          ...(newStatus === "canceled" && {
            canceledAt: new Date().toISOString(),
            canceledBy: "admin" as const,
          }),
        };
        await ReserveRepository.update(id, reserveWithNewStatus);

        const reservesUpdated = reserves.map((reserve) =>
          reserve.id === reserveWithNewStatus.id
            ? reserveWithNewStatus
            : reserve,
        );
        setReserves(reservesUpdated);

        addAlert(`Status da reserva #${reserve.code} alterada com sucesso.`);
      } else {
        addAlert("Erro ao buscar ID da reserva");
      }
    } catch (error) {
      addAlert("Erro ao alterar o status da reserva");
      console.error(error);
    }
  }

  async function deleteTodayReserves() {
    const confirmed = window.confirm(
      "Tem certeza que deseja deletar todas as reservas de hoje?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      reserves.map(async (reserve) => {
        if (!reserve.id) return;
        return await ReserveRepository.delete(reserve.id);
      });
      setReserves([]);
      addAlert("Reservas de hoje foram deletadas com sucesso.");
    } catch (error) {
      addAlert(`Erro ao deletar reservas do dia atual.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteThisMonthReserves(year: number, month: number) {
    const confirmed = window.confirm(
      "Tem certeza que deseja deletar todas as reservas deste mês?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await ReserveRepository.deleteByMonth(year, month);
      const allReserves = await ReserveRepository.getAll();
      setAllReserves(allReserves);
      addAlert("Reservas deste mês foram deletadas com sucesso.");
    } catch (error) {
      addAlert(`Erro ao deletar reservas do dia atual.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReserve(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja deletar essa reserva?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await ReserveRepository.delete(id);
      const dataBusca = new Date(date.year, date.month - 1, date.day); // mês é 0-indexado (7 = agosto)
      const fetchedReserves = await ReserveRepository.getByDate(dataBusca);

      setReserves(fetchedReserves);
      addAlert("Reserva deletada com sucesso.");
    } catch (error) {
      addAlert(`Erro ao deletar reservas do dia atual.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const groupedReservesByTime = reserves.reduce(
    (groups, reserve) => {
      const time = reserve.time;

      if (!groups[time]) {
        groups[time] = [];
      }

      groups[time].push(reserve);

      return groups;
    },
    {} as Record<string, ReserveType[]>,
  );

  const confirmedPeople = reserves
    .filter((reserve) => reserve.status !== "canceled")
    .reduce((total, reserve) => total + reserve.adults + reserve.childs, 0);
  const confirmedReserves = reserves.filter(
    (reserve) => reserve.status === "confirmed",
  ).length;
  const canceledReserves = reserves.filter(
    (reserve) => reserve.status === "canceled",
  ).length;
  const activeFreelancers = freelancers.length;

  const handleTableChange = async (id: string, newTable: string) => {
    setReserves((prev) =>
      prev.map((r) => (r.id === id ? { ...r, table: newTable } : r)),
    );

    try {
      await ReserveRepository.update(id, { table: newTable });
    } catch (error) {
      console.error("Erro ao atualizar mesa:", error);
    }
  };

  async function handleFreelaStandByStatus(freela: FreelancerControllType) {
    if (!freela.id) {
      addAlert("Erro: Freelancer sem ID.");
      return;
    }

    try {
      const updatedFreela = { ...freela, isStandby: !freela.isStandby };
      await FreelancerRepository.update(freela.id, updatedFreela);

      setFrelancers((prev) =>
        prev.map((f) => (f.id === freela.id ? updatedFreela : f)),
      );

      addAlert(
        `Freelancer ${freela.name} agora está ${
          updatedFreela.isStandby ? "sobreaviso" : "confirmado"
        }.`,
      );
    } catch (error) {
      console.error("Erro ao atualizar sobreaviso:", error);
      addAlert("Erro ao atualizar o status de sobreaviso do freelancer.");
    }
  }

  async function handleFreelaPaymentStatus(freela: FreelancerControllType) {
    if (!freela.id) {
      addAlert("Erro: Freelancer sem ID.");
      return;
    }

    try {
      const updatedFreela = { ...freela, isPayed: !freela.isPayed };
      await FreelancerRepository.update(freela.id, updatedFreela);

      setFrelancers((prev) =>
        prev.map((f) => (f.id === freela.id ? updatedFreela : f)),
      );

      addAlert(
        `Pagamento de ${freela.name} marcado como ${
          updatedFreela.isPayed ? "Pago ✅" : "Não Pago ❌"
        }.`,
      );
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      addAlert("Erro ao atualizar o status de pagamento do freelancer.");
    }
  }

  async function handleDeleteFreela(freela: FreelancerControllType) {
    if (!freela.id) {
      addAlert("Erro: Freelancer sem ID.");
      return;
    }

    try {
      const confirmDelete = window.confirm(
        `Tem certeza que deseja deletar o freelancer ${freela.name}?`,
      );

      if (!confirmDelete) return;

      const success = await FreelancerRepository.delete(freela.id);
      if (success) {
        setFrelancers((prev) => prev.filter((f) => f.id !== freela.id));
        addAlert(`Freelancer ${freela.name} deletado com sucesso`);
      } else {
        addAlert("Erro ao deletar freelancer.");
      }
    } catch (error) {
      console.error("Erro ao deletar freelancer:", error);
      addAlert("Erro ao deletar freelancer.");
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full h-full overflow-y-auto">
      {loading && <LoaderFullscreen />}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <LuCalendar size={32} className="text-primary-gold/70 shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-3xl font-semibold text-primary-gold">
                Reservas
              </h1>
              <span className="text-xs text-primary-gold/40">
                {date.day < 10 ? `0${date.day}` : date.day}/
                {date.month < 10 ? `0${date.month}` : date.month}/{date.year}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip direction="bottom" content="Criar uma nova reserva">
              <button
                onClick={() => {
                  setCalendarFormsModal(true);
                  setCurrentFormsType("add");
                }}
                className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              >
                <LuCalendarPlus size={14} />
              </button>
            </Tooltip>
            <Tooltip direction="bottom" content="Adicionar um novo freelancer">
              <button
                onClick={() => setFreelancerFormsModal(true)}
                className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              >
                <LuUserPlus size={14} />
              </button>
            </Tooltip>
            <Tooltip direction="bottom" content="Ir para visão do cliente">
              <button
                onClick={() => router.push("/reserve")}
                className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              >
                <LuLink size={14} />
              </button>
            </Tooltip>
            <Tooltip direction="bottom" content="Abrir área de impressão">
              <button
                onClick={() => setPrintModal(true)}
                className="p-2 sm:flex hidden rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              >
                <LuPrinter size={14} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>
      <div className="flex gap-4 flex-wrap sm:flex-nowrap items-start py-2 px-6">
        {/* Left panel */}
        <section className="flex flex-col gap-3 shrink-0">
          {/* Calendar header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary-gold/70 flex items-center gap-1.5">
              <LuCalendar size={15} /> Carcarlendário
            </span>
            <Tooltip direction="bottom" content="Expandir calendário">
              <button
                onClick={() => setExpandedCalendarModal(true)}
                className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              >
                <LuCalendarSearch size={13} />
              </button>
            </Tooltip>
          </div>

          <Calendar
            aria-label="Date (Invalid on weekends)"
            value={date}
            onChange={setDate}
            className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl shadow-card"
            classNames={{
              cell: "text-primary-gold",
              cellButton:
                "hover:bg-dark-black cursor-pointer data-[selected=true]:bg-primary-gold data-[selected=true]:text-primary-black data-[selected=true]:font-semibold data-[outside-month=true]:text-gray-400",
              header: "bg-transparent",
              title: "text-primary-gold font-bold",
              gridHeaderCell: "text-primary-gold font-semibold",
              prevButton: "text-primary-gold hover:text-secondary-gold",
              nextButton: "text-primary-gold hover:text-secondary-gold",
              errorMessage: "text-primary-gold text-sm italic",
            }}
          />

          {/* Stats */}
          <div className="flex flex-col gap-1.5 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3 text-sm">
            <span className="flex items-center gap-2 text-primary-gold/80">
              <LuUserRoundCheck
                size={14}
                className="text-primary-gold/50 shrink-0"
              />
              {confirmedPeople}{" "}
              {confirmedPeople === 1
                ? "pessoa confirmada"
                : "pessoas confirmadas"}
            </span>
            <span className="flex items-center gap-2 text-primary-gold/80">
              <LuUserRoundCheck
                size={14}
                className="text-primary-gold/50 shrink-0"
              />
              {activeFreelancers}{" "}
              {activeFreelancers === 1 ? "freelancer" : "freelancers"}
            </span>
            <div className="h-px w-full bg-primary-gold/10 my-0.5" />
            <span className="flex items-center gap-2 text-primary-gold/80">
              <LuBookCheck size={14} className="text-green-600 shrink-0" />
              {confirmedReserves}{" "}
              {confirmedReserves === 1 ? "reserva ativa" : "reservas ativas"}
            </span>
            <span className="flex items-center gap-2 text-primary-gold/80">
              <LuBookX size={14} className="text-invalid-color shrink-0" />
              {canceledReserves}{" "}
              {canceledReserves === 1
                ? "reserva cancelada"
                : "reservas canceladas"}
            </span>
          </div>

          {/* Freelancers */}
          {freelancers.length > 0 && (
            <div className="flex flex-col gap-2 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-primary-gold/70">
                  Freelas
                </span>
                <span className="text-xs text-primary-gold/35">
                  {date.day < 10 ? `0${date.day}` : date.day}/
                  {date.month < 10 ? `0${date.month}` : date.month}/{date.year}
                </span>
              </div>
              {freelancers.map((freela, index) => (
                <div
                  className="flex w-full items-center justify-between py-2 px-3 bg-primary-black/40 border border-primary-gold/10 rounded-lg"
                  key={freela.id ?? index}
                >
                  <span className="text-sm text-primary-gold/80">
                    {freela.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Tooltip
                      direction="top"
                      content={freela.isStandby ? "Sobreaviso" : "Confirmado"}
                    >
                      <button
                        onClick={() => handleFreelaStandByStatus(freela)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${freela.isStandby ? "border-yellow-600/50 text-yellow-600" : "border-green-700/50 text-green-700"} bg-primary-black/60`}
                      >
                        {freela.isStandby ? (
                          <LuSquareCheck size={14} />
                        ) : (
                          <LuSquareCheckBig size={14} />
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip
                      direction="top"
                      content={freela.isPayed ? "Pago" : "Não Pago"}
                    >
                      <button
                        onClick={() => handleFreelaPaymentStatus(freela)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${freela.isPayed ? "border-green-700/50 text-green-700" : "border-invalid-color/50 text-invalid-color"} bg-primary-black/60`}
                      >
                        <LuDollarSign size={14} />
                      </button>
                    </Tooltip>
                    <Tooltip direction="top" content={`Excluir ${freela.name}`}>
                      <button
                        onClick={() => handleDeleteFreela(freela)}
                        className="p-1.5 rounded-lg border border-primary-gold/15 hover:border-invalid-color/50 hover:text-invalid-color text-primary-gold/40 bg-primary-black/60 transition-all cursor-pointer"
                      >
                        <LuTrash size={14} />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete today */}
          {reserves.length > 0 && (
            <button
              onClick={() => deleteTodayReserves()}
              className="flex items-center gap-2 text-primary-gold/40 hover:text-invalid-color border border-primary-gold/10 hover:border-invalid-color/30 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200"
            >
              <LuTrash size={14} className="shrink-0" />
              <span className="italic">Excluir reservas de hoje</span>
            </button>
          )}
        </section>
        {reserves.length === 0 ? (
          <section className="flex flex-col items-center justify-center text-primary-gold p-6 w-full rounded-xl border border-primary-gold/15 bg-secondary-black/40">
            <img
              className="w-[160px] opacity-70"
              src="images/mascote-triste.png"
              alt="mascote-triste"
            />
            <span className="text-lg sm:text-xl text-center text-primary-gold/60 mt-2">
              Sem reservas para o dia{" "}
              {date.day < 10 ? `0${date.day}` : date.day}
            </span>
          </section>
        ) : (
          <section className="flex flex-col text-primary-gold w-full gap-4">
            {Object.entries(groupedReservesByTime)
              .sort(([timeA], [timeB]) => {
                const [hA, mA] = timeA.split(":").map(Number);
                const [hB, mB] = timeB.split(":").map(Number);
                return hA * 60 + mA - (hB * 60 + mB);
              })
              .map(([time, reserves]) => (
                <div key={time} className="flex flex-col w-full gap-2">
                  {/* Time group header */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm px-2 py-0.5 rounded-md bg-primary-gold/10 border border-primary-gold/25 text-primary-gold">
                      {time}h
                    </span>
                    <span className="text-primary-gold/45 text-xs">
                      {reserves.reduce((t, r) => t + r.adults + r.childs, 0)}{" "}
                      pessoas · {reserves.length}{" "}
                      {reserves.length === 1 ? "reserva" : "reservas"}
                    </span>
                    <div className="flex-1 h-px bg-primary-gold/10" />
                  </div>

                  <div className="flex flex-col gap-2 w-full pl-2">
                    {reserves.map((reserve) => (
                      <div
                        className={`flex justify-between border rounded-xl p-3 w-full gap-2 flex-wrap transition-all duration-200 ${
                          reserve.status === "canceled"
                            ? "border-invalid-color/20 bg-invalid-color/5"
                            : "border-primary-gold/15 bg-secondary-black/40"
                        }`}
                        key={reserve.id}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex sm:flex-row flex-col gap-1 sm:gap-2 text-sm items-start sm:items-center mb-2 sm:mb-0">
                            <div className="flex items-center gap-1">
                              <ReserveActionsMenu
                                reserve={reserve}
                                onConfirm={() =>
                                  changeReserveStatus(
                                    reserve.id,
                                    "confirmed",
                                    reserve,
                                  )
                                }
                                onCancel={() =>
                                  changeReserveStatus(
                                    reserve.id,
                                    "canceled",
                                    reserve,
                                  )
                                }
                                onDelete={() => {
                                  if (reserve.id) deleteReserve(reserve.id);
                                  else
                                    addAlert(
                                      "Recarregue a página e tente novamente",
                                    );
                                }}
                                onEdit={() => {
                                  setCalendarFormsModal(true);
                                  setCurrentFormsType("edit");
                                  setCurrentReserve(reserve);
                                }}
                              />
                              <span className="font-semibold text-center">
                                #{reserve.code}
                              </span>{" "}
                            </div>
                            <span className="hidden sm:block">-</span>
                            <span className="flex gap-1 font-semibold text-center">
                              <span className="block sm:hidden">-</span>
                              {reserve.name}
                            </span>{" "}
                            <span className="hidden sm:block">-</span>
                            <span className="flex gap-1 font-semibold text-center">
                              <span className="block sm:hidden">-</span>
                              {reserve.adults + reserve.childs} pessoas
                            </span>
                          </div>
                          <div className="text-xs flex flex-col gap-1 text-primary-gold/90">
                            <div>
                              <span className="font-semibold">telefone: </span>
                              <span
                                onClick={() => openWhatsApp(reserve.phone)}
                                className="cursor-pointer hover:underline"
                              >
                                {reserve.phone}{" "}
                              </span>
                              <span className="font-semibold">email: </span>
                              <span
                                onClick={() =>
                                  openEmail(
                                    reserve.email,
                                    "Sobre a sua reserva no Carcassonne Pub 🍻",
                                    `Olá!

Recebemos sua solicitação de reserva no Carcassonne Pub e estamos muito felizes por você querer passar esse momento conosco!

🗓️ Data: ${reserve.bookingDate.day}/${reserve.bookingDate.month}/${
                                      reserve.bookingDate.year
                                    }
⏰ Horário: ${reserve.time}h
👥 Quantidade de pessoas: ${reserve.childs + reserve.adults} pessoas

Caso precise alterar ou cancelar sua reserva, por favor nos avise com antecedência respondendo a este e-mail.

Nos vemos em breve! 🍺
Equipe Carcassonne Pub`,
                                  )
                                }
                                className="cursor-pointer hover:underline"
                              >
                                {reserve.email}
                              </span>
                            </div>
                            {reserve.observation && (
                              <div>
                                <span className="font-semibold">
                                  observação:{" "}
                                </span>
                                <span>{reserve.observation}</span>
                              </div>
                            )}
                            {reserve.createdAt && (
                              <div>
                                <span className="font-semibold">
                                  Reserva criada em{" "}
                                </span>
                                {reserve.createdAt
                                  .toDate()
                                  .toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                              </div>
                            )}
                            {reserve.status === "canceled" && (
                              <div className="mt-1 flex flex-col gap-0.5 border-t border-invalid-color/15 pt-1">
                                {reserve.canceledBy && (
                                  <span className="text-invalid-color/90 font-semibold">
                                    {reserve.canceledBy === "user"
                                      ? "Cancelada pelo usuário"
                                      : "Cancelada pelo Administrador"}
                                  </span>
                                )}
                                {reserve.canceledAt && (
                                  <span className="text-invalid-color/70">
                                    <span className="font-semibold">Em: </span>
                                    {new Date(
                                      reserve.canceledAt,
                                    ).toLocaleString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                                {reserve.canceledReason && (
                                  <span className="text-invalid-color/70">
                                    <span className="font-semibold">
                                      Motivo:{" "}
                                    </span>
                                    {reserve.canceledReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {reserve.status !== "canceled" && (
                          <div className="flex sm:flex-col items-center gap-1">
                            <span>mesa</span>
                            <Input
                              placeholder="-"
                              value={reserve.table ? reserve.table : ""}
                              setValue={(e) =>
                                handleTableChange(
                                  reserve.id ? reserve.id : "",
                                  e.target.value,
                                )
                              }
                              width="!w-[40px] !min-w-[80px] !py-1 !px-0"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </section>
        )}
      </div>
      <Modal
        isOpen={expandedCalendarModal}
        onClose={() => setExpandedCalendarModal(false)}
        noPadding
        patternCloseButton={false}
      >
        <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-2xl w-[95vw] max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-primary-gold/10 shrink-0">
            <span className="text-sm font-semibold text-primary-gold/70 flex items-center gap-2">
              <LuCalendarSearch size={15} /> Calendário de Reservas
            </span>
            <button
              onClick={() => setExpandedCalendarModal(false)}
              className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuX size={15} />
            </button>
          </div>

          {/* Calendar */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={events}
              dateClick={(info) => {
                const clickedDate = new CalendarDate(
                  info.date.getFullYear(),
                  info.date.getMonth() + 1,
                  info.date.getDate(),
                );
                setDate(clickedDate);
                setExpandedCalendarModal(false);
              }}
              eventContent={(arg) => {
                const status = arg.event.extendedProps.status;
                const isCanceled = status === "canceled";
                return (
                  <div
                    className={`min-w-[30px] flex items-center justify-center w-full text-xs font-semibold rounded px-1 my-0.5 ${
                      isCanceled
                        ? "bg-invalid-color text-white"
                        : "bg-primary-gold text-primary-black"
                    }`}
                  >
                    {arg.event.title}
                  </div>
                );
              }}
              locale={ptBrLocale}
              datesSet={(info) => {
                const data = info.view.currentStart;
                setFullCalendarDate(
                  new CalendarDate(
                    data.getFullYear(),
                    data.getMonth() + 1,
                    data.getDate(),
                  ),
                );
              }}
              headerToolbar={{
                left: "",
                center: "title",
                right: "prev,next",
              }}
            />
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-primary-gold/10 px-5 py-3">
            <button
              onClick={() =>
                deleteThisMonthReserves(
                  fullCalendarDate.year,
                  fullCalendarDate.month,
                )
              }
              className="flex items-center gap-2 text-primary-gold/35 hover:text-invalid-color text-sm italic cursor-pointer transition-all duration-200"
            >
              <LuTrash size={13} className="shrink-0" />
              Excluir reservas de {fullCalendarDate.month}/
              {fullCalendarDate.year}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={calendarFormsModal}
        onClose={() => setCalendarFormsModal(false)}
      >
        <ReserveAdminForms
          dateProps={date}
          type={currentFormsType}
          reserve={currentReserve}
          onClose={() => setCalendarFormsModal(false)}
        />
      </Modal>
      <Modal
        isOpen={freelancerFormsModal}
        onClose={() => setFreelancerFormsModal(false)}
      >
        <FreelancerAdminForms
          dateProps={date}
          onClose={() => setFreelancerFormsModal(false)}
        />
      </Modal>
      <PrintModal
        isOpen={printModal}
        onClose={() => setPrintModal(false)}
        printConfigs={printConfigs}
        setPrintConfigs={setPrintConfigs}
      >
        <div
          className={`p-6 rounded-md w-full ${printConfigs.printFontSize === "small" ? "text-sm" : printConfigs.printFontSize === "large" ? "text-lg" : "texxt-base"} font-mono flex flex-col items-center max-w-[800px]`}
        >
          {/* Data */}
          <div className="text-center mb-4 font-semibold text-lg">
            {date.day < 10 ? `0${date.day}` : date.day}/
            {date.month < 10 ? `0${date.month}` : date.month}/{date.year}
          </div>

          {/* Cabeçalho */}
          <div
            className={`grid items-center w-full gap-2 font-semibold border-b border-gray-400 pb-1 mb-2 ${
              printConfigs.printIncludeChecks
                ? "grid-cols-[40px_1fr_100px_60px_60px]"
                : "grid-cols-[40px_1fr_100px_60px]"
            }`}
          >
            <div className="text-right">ㅤ</div>
            <div>Nome</div>
            {printConfigs.printIncludeChecks && (
              <div className="text-center">Check</div>
            )}
            <div className="text-center">Pessoas</div>
            <div className="text-center">Mesa</div>
          </div>

          {/* Lista de reservas */}
          <div className="flex flex-col gap-6 w-full">
            {reserves
              .filter((reserve) => reserve.status !== "canceled")
              .sort((a, b) => {
                const [ah, am] = a.time.split(":").map(Number);
                const [bh, bm] = b.time.split(":").map(Number);
                return ah * 60 + am - (bh * 60 + bm);
              })
              .map((reserve, index) => (
                <div
                  key={index}
                  className={`grid w-full gap-2 ${
                    printConfigs.printIncludeChecks
                      ? "grid-cols-[40px_1fr_100px_60px_60px]"
                      : "grid-cols-[40px_1fr_100px_60px]"
                  }`}
                >
                  {/* Número */}
                  <div className="text-right font-semibold">
                    {index < 9 ? `0${index + 1}` : index + 1}.
                  </div>

                  {/* Nome */}
                  <div className="flex flex-col gap-1">
                    <span>{reserve.name}</span>
                    {printConfigs.printIncludeObservation &&
                      reserve.observation && (
                        <span>
                          <span className="font-semibold">Observação:</span>{" "}
                          {reserve.observation}
                        </span>
                      )}
                  </div>

                  {/* Check */}
                  {printConfigs.printIncludeChecks && (
                    <div className="flex justify-center gap-1 flex-wrap">
                      {Array.from({
                        length: reserve.adults + reserve.childs,
                      }).map((_, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-[2px] border"
                        ></div>
                      ))}
                    </div>
                  )}

                  {/* Pessoas */}
                  <div className="text-center">
                    {!printConfigs.printSeparateByAge ? (
                      `${reserve.adults + reserve.childs}`
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex gap-1 justify-center">
                          <span>{reserve.adults}a</span>
                          <span>|</span>
                          <span>{reserve.childs}c</span>
                        </div>
                        <span>({reserve.adults + reserve.childs})</span>
                      </div>
                    )}
                  </div>

                  {/* Mesa */}
                  <div className="text-center">{reserve.table}</div>
                </div>
              ))}
          </div>
        </div>
      </PrintModal>
    </div>
  );
}

function ReserveActionsMenu({
  reserve,
  onConfirm,
  onCancel,
  onDelete,
  onEdit,
}: {
  reserve: ReserveType;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer p-2 -m-2"
      >
        {reserve.status === "confirmed" ? (
          <LuCalendarCheck className="text-green-600 min-w-[16px]" />
        ) : (
          <LuCalendarX className="text-red-900 min-w-[16px]" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-50 bg-secondary-black border border-primary-gold/20 rounded-lg shadow-xl p-1 flex flex-col gap-0.5 min-w-[250px]">
          <div className="flex items-center justify-between p-2 border-b border-primary-gold/60 w-full">
            <span className="text-center font-semibold">
              Reserva #{reserve.code}
            </span>
            <div
              className=" p-1 border border-primary-gold/20 hover:border-primary-gold/50 rounded text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <FiX />
            </div>
          </div>
          <button
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            className="flex items-center gap-2 text-base font-medium px-3 py-3.5 rounded hover:bg-primary-gold/10 text-left cursor-pointer transition-colors"
          >
            <LuCalendarCheck className="text-green-600 min-w-[16px]" />
            confirmar reserva
          </button>
          <button
            onClick={() => {
              onCancel();
              setOpen(false);
            }}
            className="flex items-center gap-2 text-base font-medium px-3 py-3.5 rounded hover:bg-primary-gold/10 text-left cursor-pointer transition-colors"
          >
            <LuCalendarX className="text-red-900 min-w-[16px]" />
            cancelar reserva
          </button>
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="flex items-center gap-2 text-base font-medium px-3 py-3.5 rounded hover:bg-primary-gold/10 text-left cursor-pointer transition-colors"
          >
            <LuTrash className="text-red-900 min-w-[16px]" />
            excluir reserva
          </button>
          <button
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="flex items-center gap-2 text-base font-medium px-3 py-3.5 rounded hover:bg-primary-gold/10 text-left cursor-pointer transition-colors"
          >
            <LuCalendarCog className="text-primary-gold/80 min-w-[16px]" />
            editar reserva
          </button>
        </div>
      )}
    </div>
  );
}
