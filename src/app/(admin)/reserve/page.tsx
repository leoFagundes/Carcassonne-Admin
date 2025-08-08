"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "@heroui/react";
import { today, getLocalTimeZone, getDayOfWeek } from "@internationalized/date";
import { useLocale } from "@react-aria/i18n";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { ReserveType } from "@/types";
import {
  LuBookCheck,
  LuBookX,
  LuCalendar,
  LuCalendarCheck,
  LuCalendarPlus,
  LuCalendarX,
  LuUserRoundCheck,
} from "react-icons/lu";
import Tooltip from "@/components/Tooltip";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { openEmail, openWhatsApp } from "@/utils/utilFunctions";
import Input from "@/components/input";

export default function Rerserve() {
  const [date, setDate] = useState(today(getLocalTimeZone()));
  const [reserves, setReserves] = useState<ReserveType[]>([]);
  const [loading, setLoading] = useState(false);
  const { locale } = useLocale();

  const { addAlert } = useAlert();

  // const novaReserva: ReserveType = {
  //   bookingDate: {
  //     day: "15",
  //     month: "08",
  //     year: "2025",
  //   },
  //   time: "11:30",
  //   name: "Natalia Adeodato",
  //   phone: "(61) 99999-9999",
  //   email: "leonardo@email.com",
  //   observation: "Prefiro mesa perto da janela, prefiro as salas também!",
  //   adults: 5,
  //   childs: 2,
  //   status: "confirmed",
  //   code: randomCodeGenerator(),
  // };

  // segunda-feira = 0
  // terça-feira = 1
  // quarta-feira = 2
  // quinta-feira = 3
  // sexta-feira = 4
  // sábado = 5
  // domingo = 6
  const dayOfWeek = getDayOfWeek(date, locale);
  const isInvalid = dayOfWeek === 0 || dayOfWeek === 1;

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
        // const sucesso = await ReserveRepository.create(novaReserva);
        // await TableRepository.create({
        //   code: "11",
        //   capacity: 2,
        //   priority: 1,
        // });
      } catch (error) {
        addAlert("Erro ao carregar as reservas desse dia.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    getReserves();
  }, [date]);

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

  const groupedReservesByTime = reserves.reduce((groups, reserve) => {
    const time = reserve.time;

    if (!groups[time]) {
      groups[time] = [];
    }

    groups[time].push(reserve);

    return groups;
  }, {} as Record<string, ReserveType[]>);

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
            <Tooltip direction="bottom" content="Adicionar uma nova reserva">
              <div className="p-2 flex items-center justify-center rounded-full bg-secondary-black shadow-card cursor-pointer">
                <LuCalendarPlus
                  onClick={() => ""}
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
          </div>
          <Calendar
            aria-label="Date (Invalid on weekends)"
            errorMessage={
              isInvalid ? "⚠️ Estamos fechados esse dia!" : undefined
            }
            isInvalid={isInvalid}
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
        </section>
        {reserves.length === 0 ? (
          <section className="flex flex-col items-center justify-center text-primary-gold p-2 w-full mr-5">
            <img
              className="w-[200px]"
              src="images/mascote-triste.png"
              alt="mascote-triste"
            />
            <span className="text-lg text-center">
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
                    <div className="ml-4 flex flex-col gap-2 w-full">
                      {reserves.map((reserve) => (
                        <div
                          className="flex bg-secondary-black/30 shadow-card-light p-2 rounded w-full min-w-[300px]"
                          key={reserve.id}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-2 text-sm items-center">
                              <Tooltip
                                direction="right"
                                clickToStay
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
                                      className="flex items-center gap-1 font-medium border border-transparent border-dashed rounded p-1 cursor-pointer hover:border-primary-black"
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
                                      className="flex items-center gap-1 font-medium border border-transparent border-dashed rounded p-1 cursor-pointer hover:border-primary-black"
                                    >
                                      <LuCalendarX className="text-red-900 min-w-[16px]" />{" "}
                                      cancelar reserva
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
                              -
                              <span className="text-center">
                                {reserve.name}
                              </span>{" "}
                              -
                              <span className="font-semibold text-center">
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
                              <div>
                                <span className="font-semibold">
                                  observação:{" "}
                                </span>
                                <span>{reserve.observation}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end flex-1 px-1 gap-1">
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
                              width="!w-[40px] !min-w-[20px] !py-1 !px-0"
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
    </div>
  );
}
