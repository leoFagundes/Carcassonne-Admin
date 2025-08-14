"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "@heroui/react";
import { today, getLocalTimeZone, CalendarDate } from "@internationalized/date";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { ReserveType } from "@/types";
import {
  LuBookCheck,
  LuBookX,
  LuCalendar,
  LuCalendarCheck,
  LuCalendarPlus,
  LuCalendarSearch,
  LuCalendarX,
  LuLink,
  LuTrash,
  LuUserRoundCheck,
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

type EventFullCalendar = {
  title: string;
  start: string;
  extendedProps?: { status: "confirmed" | "canceled" };
};

const TODAY = today(getLocalTimeZone());

export default function Rerserve() {
  const [date, setDate] = useState(TODAY);
  const [fullCalendarDate, setFullCalendarDate] = useState(
    today(getLocalTimeZone())
  );
  const [reserves, setReserves] = useState<ReserveType[]>([]);
  const [allReserves, setAllReserves] = useState<ReserveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCalendarModal, setExpandedCalendarModal] = useState(false);
  const [calendarFormsModal, setCalendarFormsModal] = useState(false);
  const [currentFormsType, setCurrentFormsType] = useState<"edit" | "add" | "">(
    ""
  );
  const [currentReserve, setCurrentReserve] = useState<ReserveType>();
  const isLargeScreen = useIsLargeScreen();
  const { addAlert } = useAlert();

  const router = useRouter();

  const events = transformToFullCalendarEvents(
    allReserves as (ReserveType & { id: string })[]
  );

  function transformToFullCalendarEvents(
    reserves: (ReserveType & { id: string })[]
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

    // Agrupa reservas confirmadas
    confirmedReserves.forEach((r) => {
      const { year, month, day } = r.bookingDate;
      const dateKey = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      const totalPeople = (r.adults ?? 0) + (r.childs ?? 0);

      if (!groupedByDateConfirmed[dateKey]) {
        groupedByDateConfirmed[dateKey] = { totalPeople: 0, totalReserves: 0 };
      }
      groupedByDateConfirmed[dateKey].totalPeople += totalPeople;
      groupedByDateConfirmed[dateKey].totalReserves += 1;
    });

    // Agrupa reservas canceladas
    canceledReserves.forEach((r) => {
      const { year, month, day } = r.bookingDate;
      const dateKey = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      const totalPeople = (r.adults ?? 0) + (r.childs ?? 0);

      if (!groupedByDateCanceled[dateKey]) {
        groupedByDateCanceled[dateKey] = { totalPeople: 0, totalReserves: 0 };
      }
      groupedByDateCanceled[dateKey].totalPeople += totalPeople;
      groupedByDateCanceled[dateKey].totalReserves += 1;
    });

    const events: EventFullCalendar[] = [];

    // Eventos das reservas confirmadas
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
      }
    );

    // Eventos das reservas canceladas
    Object.entries(groupedByDateCanceled).forEach(
      ([date, { totalReserves }]) => {
        events.push({
          title: `${totalReserves} ${isLargeScreen ? "Reservas Can." : "rc"}`,
          start: `${date}T12:00:00`,
          extendedProps: { status: "canceled" },
        });
      }
    );

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
          fetchedReserves
        );
        setReserves(fetchedReserves);
      } catch (error) {
        addAlert("Erro ao carregar as reservas desse dia.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    getReserves();
  }, [date, calendarFormsModal]);

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

    getAllReserves();
  }, [expandedCalendarModal]);

  async function changeReserveStatus(
    id: string | undefined,
    newStatus: "confirmed" | "canceled",
    reserve: ReserveType
  ) {
    try {
      if (id) {
        const reserveWithNewStatus = { ...reserve, status: newStatus };
        await ReserveRepository.update(id, reserveWithNewStatus);

        const reservesUpdated = reserves.map((reserve) =>
          reserve.id === reserveWithNewStatus.id
            ? reserveWithNewStatus
            : reserve
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
      "Tem certeza que deseja deletar todas as reservas de hoje?"
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
      "Tem certeza que deseja deletar todas as reservas deste mês?"
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
      "Tem certeza que deseja deletar essa reserva?"
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
    {} as Record<string, ReserveType[]>
  );

  const confirmedPeople = reserves
    .filter((reserve) => reserve.status !== "canceled")
    .reduce((total, reserve) => total + reserve.adults + reserve.childs, 0);
  const confirmedReserves = reserves.filter(
    (reserve) => reserve.status === "confirmed"
  ).length;
  const canceledReserves = reserves.filter(
    (reserve) => reserve.status === "canceled"
  ).length;

  const handleTableChange = async (id: string, newTable: string) => {
    setReserves((prev) =>
      prev.map((r) => (r.id === id ? { ...r, table: newTable } : r))
    );

    try {
      await ReserveRepository.update(id, { table: newTable });
    } catch (error) {
      console.error("Erro ao atualizar mesa:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full px-3 overflow-y-scroll">
      {loading && <LoaderFullscreen />}
      <section className="flex w-full justify-center items-center gap-3 text-primary-gold">
        <div className="flex flex-col items-center gap-1">
          <h2 className="sm:text-5xl text-3xl text-primary-gold text-center">
            Reservas
          </h2>{" "}
          <div className="flex items-center gap-3">
            <span>
              {date.day < 10 ? `0${date.day}` : date.day}/
              {date.month < 10 ? `0${date.month}` : date.month}/{date.year}
            </span>
            <Tooltip direction="bottom" content="Criar uma nova reserva">
              <div
                onClick={() => {
                  setCalendarFormsModal(true);
                  setCurrentFormsType("add");
                }}
                className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer"
              >
                <LuCalendarPlus size={"16px"} className="min-w-[16px]" />
              </div>
            </Tooltip>
            <Tooltip direction="bottom" content="Ir para visão do cliente">
              <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
                <LuLink
                  onClick={() => router.push("/reserve")}
                  size={"16px"}
                  className="min-w-[16px]"
                />
              </div>
            </Tooltip>
          </div>
        </div>
      </section>
      <div className="flex gap-6 flex-wrap sm:flex-nowrap justify-center sm:justify-start">
        <section className="flex flex-col gap-2 p-2">
          <div className="text-primary-gold flex items-center gap-2 w-full justify-center">
            <LuCalendar size={20} className="min-w-[20px]" />
            <span className="font-semibold text-xl">Carcarlendário</span>
            <Tooltip direction="bottom" content="Expandir">
              <div
                onClick={() => setExpandedCalendarModal(true)}
                className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer"
              >
                <LuCalendarSearch
                  onClick={() => ""}
                  size={"16px"}
                  className="min-w-[16px]"
                />
              </div>
            </Tooltip>
          </div>
          <Calendar
            aria-label="Date (Invalid on weekends)"
            value={date}
            onChange={setDate}
            className=" bg-secondary-black/30 shadow-card-light"
            classNames={{
              cell: "text-primary-gold",
              cellButton:
                "hover:bg-dark-black cursor-pointer data-[selected=true]:bg-primary-gold data-[selected=true]:text-primary-black data-[selected=true]:font-semibold data-[outside-month=true]:text-gray-400",
              header: "bg-transparent ",
              title: "text-primary-gold font-bold",
              gridHeaderCell: "text-primary-gold font-semibold",
              prevButton: "text-primary-gold hover:text-secondary-gold",
              nextButton: "text-primary-gold hover:text-secondary-gold",
              errorMessage: "text-primary-gold text-sm italic",
            }}
          />
          <div className="flex flex-col text-primary-gold gap-1 shadow-card-light p-2 bg-secondary-black/30">
            <span className="flex items-center gap-1">
              <LuUserRoundCheck className="min-w-[16px]" />
              {confirmedPeople}{" "}
              {confirmedReserves === 1
                ? "pessoa confirmada"
                : "pessoas confirmadas"}
            </span>
            <span className="flex items-center gap-1">
              <LuBookCheck className="min-w-[16px]" />
              {confirmedReserves}{" "}
              {confirmedReserves === 1 ? "reserva ativa" : "reservas ativas"}
            </span>
            <span className="flex items-center gap-1">
              <LuBookX className="min-w-[16px]" />
              {canceledReserves}{" "}
              {canceledReserves === 1
                ? "reserva cancelada"
                : "reservas canceladas"}
            </span>
          </div>
          {reserves.length > 0 && (
            <div
              onClick={() => deleteTodayReserves()}
              className="flex items-center gap-3 text-primary-gold bg-secondary-black/30 p-2 rounded shadow-card-light hover:text-invalid-color cursor-pointer transition-all duration-300"
            >
              <div className=" p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
                <LuTrash
                  onClick={() => ""}
                  size={"16px"}
                  className="min-w-[16px]"
                />
              </div>{" "}
              <span className="flex items-center gap-1 text-sm italic">
                Excluir reservas de hoje
              </span>
            </div>
          )}
        </section>
        {reserves.length === 0 ? (
          <section className="flex flex-col items-center justify-center text-primary-gold p-3 w-full mr-5 rounded shadow-card-light bg-secondary-black/30">
            <img
              className="w-[200px]"
              src="images/mascote-triste.png"
              alt="mascote-triste"
            />
            <span className="text-xl sm:text-2xl text-center">
              Sem reservas para o dia{" "}
              {date.day < 10 ? `0${date.day}` : date.day}
            </span>
          </section>
        ) : (
          <section className="flex flex-col text-primary-gold p-2 w-full mr-5">
            <div className="w-full flex flex-col gap-4">
              {Object.entries(groupedReservesByTime)
                .sort(([timeA], [timeB]) => {
                  const [hA, mA] = timeA.split(":").map(Number);
                  const [hB, mB] = timeB.split(":").map(Number);
                  return hA * 60 + mA - (hB * 60 + mB); // ordena em minutos
                })
                .map(([time, reserves]) => (
                  <div key={time} className="flex flex-col w-full">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold sm:text-lg text-sm">
                        {time}h
                      </span>
                      <span className="text-primary-gold/50 sm:text-lg text-sm whitespace-nowrap">
                        -{" "}
                        {reserves.reduce((total, reserve) => {
                          return total + reserve.adults + reserve.childs;
                        }, 0)}{" "}
                        pessoas
                      </span>
                      <span className="text-primary-gold/50 sm:text-lg text-sm whitespace-nowrap">
                        - ({reserves.length}{" "}
                        {reserves.length === 1 ? "reserva" : "reservas"})
                      </span>
                    </div>
                    <div className="sm:ml-4 flex flex-col gap-2 w-full">
                      {reserves.map((reserve) => (
                        <div
                          className="flex justify-between bg-secondary-black/30 shadow-card-light p-2 rounded w-full min-w-[250px] gap-2 flex-wrap"
                          key={reserve.id}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex sm:flex-row flex-col gap-1 sm:gap-2 text-sm items-start sm:items-center mb-2 sm:mb-0">
                              <div className="flex items-center gap-1">
                                <Tooltip
                                  direction="right"
                                  contentNode={
                                    <div className="flex flex-col gap-1">
                                      <span
                                        onClick={() =>
                                          changeReserveStatus(
                                            reserve.id,
                                            "confirmed",
                                            reserve
                                          )
                                        }
                                        className="flex items-center gap-1 font-medium border border-transparent transition-all duration-100 ease-in border-dashed rounded p-1 cursor-pointer hover:border-primary-black"
                                      >
                                        <LuCalendarCheck className="text-green-600 min-w-[16px]" />{" "}
                                        confirmar reserva
                                      </span>
                                      <span
                                        onClick={() =>
                                          changeReserveStatus(
                                            reserve.id,
                                            "canceled",
                                            reserve
                                          )
                                        }
                                        className="flex items-center gap-1 font-medium border border-transparent transition-all duration-100 ease-in border-dashed rounded p-1 cursor-pointer hover:border-primary-black"
                                      >
                                        <LuCalendarX className="text-red-900 min-w-[16px]" />{" "}
                                        cancelar reserva
                                      </span>
                                      <span
                                        onClick={() => {
                                          if (reserve.id) {
                                            deleteReserve(reserve.id);
                                          } else {
                                            addAlert(
                                              "Recarregue a página e tente novamente"
                                            );
                                          }
                                        }}
                                        className="flex items-center gap-1 font-medium border border-transparent transition-all duration-100 ease-in border-dashed rounded p-1 cursor-pointer hover:border-primary-black"
                                      >
                                        <LuTrash className="text-red-900 min-w-[16px]" />{" "}
                                        excluir reserva
                                      </span>
                                      <span
                                        onClick={() => {
                                          setCalendarFormsModal(true);
                                          setCurrentFormsType("edit");
                                          setCurrentReserve(reserve);
                                        }}
                                        className="flex items-center gap-1 font-medium border border-transparent transition-all duration-100 ease-in border-dashed rounded p-1 cursor-pointer hover:border-primary-black"
                                      >
                                        <LuCalendarX className="text-primary-black min-w-[16px]" />{" "}
                                        editar reserva
                                      </span>
                                    </div>
                                  }
                                >
                                  {reserve.status === "confirmed" ? (
                                    <LuCalendarCheck className="text-green-600 min-w-[16px]" />
                                  ) : (
                                    <LuCalendarX className="text-red-900 min-w-[16px]" />
                                  )}
                                </Tooltip>
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
                                <span className="font-semibold">
                                  telefone:{" "}
                                </span>
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
Equipe Carcassonne Pub`
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
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center gap-1">
                            <span>mesa</span>
                            <Input
                              placeholder="-"
                              value={reserve.table ? reserve.table : ""}
                              setValue={(e) =>
                                handleTableChange(
                                  reserve.id ? reserve.id : "",
                                  e.target.value
                                )
                              }
                              width="!w-[40px] !min-w-[80px] !py-1 !px-0"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
      <Modal
        isOpen={expandedCalendarModal}
        onClose={() => setExpandedCalendarModal(false)}
        backgroundTransparent
      >
        <div className="flex flex-col gap-3 items-center justify-center w-full h-full max-h-screen ">
          <div className="p-4 sm:max-w-[80%] max-w-[100%] max-h-[80%] overflow-y-auto">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={events}
              dateClick={(info) => {
                const clickedDate = new CalendarDate(
                  info.date.getFullYear(),
                  info.date.getMonth() + 1, // meses no CalendarDate são 1-based
                  info.date.getDate()
                );

                setDate(clickedDate);
                setExpandedCalendarModal(false);
              }}
              eventContent={(arg) => {
                const status = arg.event.extendedProps.status;
                const isCanceled = status === "canceled";

                return (
                  <div
                    className={`min-w-[30px] flex items-center justify-center w-full font-semibold rounded my-1 ${
                      isCanceled
                        ? "bg-invalid-color text-white outline outline-invalid-color"
                        : "bg-primary-gold text-primary-black outline outline-primary-gold"
                    }`}
                  >
                    {arg.event.title}
                  </div>
                );
              }}
              locale={ptBrLocale}
              datesSet={(info) => {
                const data = info.view.currentStart;
                const year = data.getFullYear();
                const month = data.getMonth() + 1;
                const day = data.getDate();

                setFullCalendarDate(new CalendarDate(year, month, day));
              }}
              headerToolbar={{
                left: "",
                center: "title",
                right: "prev,next",
              }}
            />
          </div>

          <div
            onClick={() =>
              deleteThisMonthReserves(
                fullCalendarDate.year,
                fullCalendarDate.month
              )
            }
            className="flex items-center gap-3 text-primary-gold p-2 rounded hover:text-invalid-color cursor-pointer transition-all duration-300"
          >
            <div className=" p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
              <LuTrash
                onClick={() => ""}
                size={"16px"}
                className="min-w-[16px]"
              />
            </div>{" "}
            <span className="flex items-center gap-1 text-sm italic">
              Excluir reservas deste mês/ano: {fullCalendarDate.month}/
              {fullCalendarDate.year}
            </span>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={calendarFormsModal}
        onClose={() => setCalendarFormsModal(false)}
      >
        <ReserveAdminForms
          type={currentFormsType}
          reserve={currentReserve}
          onClose={() => setCalendarFormsModal(false)}
        />
      </Modal>
    </div>
  );
}
