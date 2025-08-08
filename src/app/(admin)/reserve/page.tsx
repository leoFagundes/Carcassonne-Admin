"use client";

import React, { useEffect, useState } from "react";
import { Calendar } from "@heroui/react";
import { today, getLocalTimeZone, getDayOfWeek } from "@internationalized/date";
import { useLocale } from "@react-aria/i18n";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { ReserveType } from "@/types";
import { randomCodeGenerator } from "@/utils/utilFunctions";
import {
  LuCalendar,
  LuCalendarCheck,
  LuCalendarPlus,
  LuCalendarX,
} from "react-icons/lu";
import Tooltip from "@/components/Tooltip";

export default function Rerserve() {
  const [date, setDate] = useState(today(getLocalTimeZone()));
  const [reserves, setReserves] = useState<ReserveType[]>([]);
  const { locale } = useLocale();

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
      try {
        const dataBusca = new Date(date.year, date.month - 1, date.day); // mês é 0-indexado (7 = agosto)
        const fetchedReserves = await ReserveRepository.getByDate(dataBusca);
        console.log(
          `Reservas para ${dataBusca.toLocaleDateString()}:`,
          fetchedReserves
        );
        setReserves(fetchedReserves);
        // const sucesso = await ReserveRepository.create(novaReserva);
      } catch (error) {
        console.log(error);
      }
    }

    getReserves();
  }, [date]);

  const groupedReservesByTime = reserves.reduce((groups, reserve) => {
    const time = reserve.time;

    if (!groups[time]) {
      groups[time] = [];
    }

    groups[time].push(reserve);

    return groups;
  }, {} as Record<string, ReserveType[]>);

  return (
    <div className="flex flex-col gap-4 w-full h-full px-3 overflow-y-scroll">
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
            <span>
              {reserves
                .filter((reserve) => reserve.status !== "canceled")
                .reduce(
                  (total, reserve) => total + reserve.adults + reserve.childs,
                  0
                )}{" "}
              pessoas confirmadas
            </span>
            <span>
              {
                reserves.filter((reserve) => reserve.status === "confirmed")
                  .length
              }{" "}
              reservas ativas
            </span>
            <span>
              {
                reserves.filter((reserve) => reserve.status === "canceled")
                  .length
              }{" "}
              reservas canceladas
            </span>
          </div>
        </section>
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
                    <span className="font-bold text-lg">{time}h</span>
                    <span className="text-primary-gold/50">
                      -{" "}
                      {reserves.reduce((total, reserve) => {
                        return total + reserve.adults + reserve.childs;
                      }, 0)}{" "}
                      pessoas -
                    </span>
                    <span className="text-primary-gold/50">
                      ({reserves.length}{" "}
                      {reserves.length === 1 ? "reserva" : "reservas"})
                    </span>
                  </div>
                  <div className="ml-4 flex flex-col gap-2 w-full">
                    {reserves.map((reserve) => (
                      <div
                        className="flex flex-col gap-1 bg-secondary-black/30 shadow-card-light p-2 rounded w-full"
                        key={reserve.id}
                      >
                        <div className="flex gap-2 text-sm items-center">
                          {reserve.status === "confirmed" ? (
                            <LuCalendarCheck className="text-green-600 min-w-[16px]" />
                          ) : (
                            <LuCalendarX className="text-red-900 min-w-[16px]" />
                          )}
                          <span className="font-semibold text-center">
                            #{reserve.code}
                          </span>{" "}
                          -<span className="text-center">{reserve.name}</span> -
                          <span className="font-semibold text-center">
                            {reserve.adults + reserve.childs} pessoas
                          </span>
                        </div>
                        <div className="text-xs flex flex-col gap-1 opacity-85">
                          <div>
                            <span className="font-semibold">telefone: </span>
                            <span>{reserve.phone} </span>
                            <span className="font-semibold">email: </span>
                            <span>{reserve.email}</span>
                          </div>
                          <div>
                            <span className="font-semibold">observação: </span>
                            <span>{reserve.observation}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
