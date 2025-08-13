"use client";

import { useEffect, useState } from "react";
import NumberPicker from "./numberPicker";
import Button from "@/components/button";
import Calendar from "react-calendar";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { GeneralConfigsType, ReserveType } from "@/types";
import { randomCodeGenerator } from "@/utils/utilFunctions";
import { longMonths, patternGeneralConfigs } from "@/utils/patternValues";
import {
  LuBadgeInfo,
  LuCalendar,
  LuCalendarOff,
  LuClock,
  LuCopy,
  LuUsers,
} from "react-icons/lu";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { useRouter } from "next/navigation";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function Reserve() {
  const [page, setPage] = useState(1);
  const [adults, setAdults] = useState(2);
  const [childs, setChilds] = useState(0);
  const [inLimit, setInLimit] = useState(false);
  const [date, setDate] = useState<Value>();
  const [allReserves, setAllReserves] = useState<ReserveType[]>([]);
  const [localGeneralConfigs, setLocalGeneralConfigs] =
    useState<GeneralConfigsType>(patternGeneralConfigs);
  const [reserve, setReserve] = useState<ReserveType>({
    name: "",
    code: randomCodeGenerator(),
    bookingDate: {
      day: "",
      month: "",
      year: "",
    },
    time: "",
    phone: "",
    email: "",
    observation: "",
    adults: 2,
    childs: 0,
    status: "confirmed",
    table: "",
  });

  const { width, height } = useWindowSize();

  const { addAlert } = useAlert();

  const router = useRouter();

  useEffect(() => {
    if (date instanceof Date) {
      setReserve((prev) => ({
        ...prev,
        childs,
        adults,
        bookingDate: {
          day: date
            .getDate()
            .toLocaleString("pt-BR", { minimumIntegerDigits: 2 }),
          month: (date.getMonth() + 1).toLocaleString("pt-BR", {
            minimumIntegerDigits: 2,
          }),
          year: date.getFullYear().toString(),
        },
      }));
    } else {
      const firstDate = date;
      if (firstDate instanceof Date) {
        setReserve((prev) => ({
          ...prev,
          bookingDate: {
            day: firstDate
              .getDate()
              .toLocaleString("pt-BR", { minimumIntegerDigits: 2 }),
            month: (firstDate.getMonth() + 1).toLocaleString("pt-BR", {
              minimumIntegerDigits: 2,
            }),
            year: firstDate.getFullYear().toString(),
          },
        }));
      }
    }
  }, [date, childs, adults]);

  useEffect(() => {
    async function fetchReserves() {
      try {
        const reserves = await ReserveRepository.getAll();
        setAllReserves(reserves);
        console.log(reserves);
      } catch (error) {
        console.error(error);
      }
    }

    fetchReserves();
  }, []);

  useEffect(() => {
    if (adults + childs >= localGeneralConfigs.maxCapacityInReserve) {
      setInLimit(true);
    } else {
      setInLimit(false);
    }
  }, [adults, childs, localGeneralConfigs]);

  useEffect(() => {
    const fetchGeneralConfigs = async () => {
      try {
        const generalConfigs = await GeneralConfigsRepository.get();

        if (!generalConfigs || !generalConfigs._id) {
          addAlert("ID Inválido.");
          return;
        }

        setLocalGeneralConfigs(generalConfigs);
      } catch (error) {
        addAlert(`Erro ao buscar configurações: ${error}`);
      }
    };

    fetchGeneralConfigs();
  }, []);

  // Function to sum total people booked on a specific date
  function getTotalPeopleOnDate(date: Date, bookings: ReserveType[]): number {
    // Filter confirmed bookings for the given date
    const bookingsOnDate = bookings.filter((booking) => {
      if (booking.status !== "confirmed") return false;

      const bDate = booking.bookingDate;
      // Compare year, month and day as numbers
      return (
        Number(bDate.year) === date.getFullYear() &&
        Number(bDate.month) === date.getMonth() + 1 &&
        Number(bDate.day) === date.getDate()
      );
    });

    // Sum adults + children
    let total = 0;
    bookingsOnDate.forEach((booking) => {
      total += (booking.adults || 0) + (booking.childs || 0);
    });

    return total;
  }

  function disableDate({ date, view }: { date: Date; view: string }): boolean {
    if (view !== "month") return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setMonth(
      maxDate.getMonth() + localGeneralConfigs.maxMonthsInAdvance
    );

    // Desabilita segundas (1) e terças (2)
    const dayOfWeek = date.getDay();
    // if (dayOfWeek === 1 || dayOfWeek === 2) return true;
    if (localGeneralConfigs.disabledDays.includes(dayOfWeek)) return true;

    if (date < today) return true;
    if (date > maxDate) return true;

    const totalBooked = getTotalPeopleOnDate(date, allReserves);
    const totalWithNewBooking = totalBooked + adults + childs;

    return totalWithNewBooking > localGeneralConfigs.maxCapacityInDay;
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone: string) {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reserve.name.trim()) {
      addAlert("Por favor, preencha o nome.");
      return;
    }

    if (!isValidEmail(reserve.email)) {
      addAlert("Por favor, insira um e-mail válido.");
      return;
    }

    if (!isValidPhone(reserve.phone)) {
      addAlert("Por favor, insira um telefone válido.");
      return;
    }

    try {
      await ReserveRepository.create(reserve);
      addAlert("Reserva realizada com sucesso.");

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: reserve.email,
          subject: `🍻 Sobre a sua reserva no Carcassonne Pub`,
          props: {
            name: reserve.name,
            code: reserve.code,
            bookingDate: reserve.bookingDate,
            time: reserve.time,
            adults: reserve.adults,
            childs: reserve.childs,
          },
          template: "client",
        }),
      });

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "carcassonnepub@gmail.com",
          subject: `Nova reserva recebida - Carcassonne Pub`,
          props: {
            name: reserve.name,
            code: reserve.code,
            bookingDate: reserve.bookingDate,
            time: reserve.time,
            adults: reserve.adults,
            childs: reserve.childs,
            email: reserve.email,
            phone: reserve.phone,
            observation: reserve.observation,
          },
          template: "staff",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        addAlert(data.error);
      } else {
        addAlert("Os detalhes da sua reserva foram enviados para o seu e-mail");
      }

      setPage(5);
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao realizar a reserva.`);
    }
  }

  return (
    <div className="flex flex-col items-center p-8 gap-4 ">
      <div className="flex flex-col gap-3 max-w-[400px]">
        <div className="flex sm:gap-8 gap-4 items-center justify-center">
          <img
            className="saturate-120 rounded bg-secondary-black/80 shadow-card-light sm:w-[150px] w-[120px]"
            src="images/real-logo.png"
            alt="logo"
          />
          <div className="flex flex-col gap-1 text-primary-gold max-w-[200px]">
            <span className="sm:text-xl text-lg font-bold">
              Carcassonne Pub
            </span>
            <span className="sm:text-sm text-xs italic">
              CLN 407 BLOCO E LOJA 37, ASA NORTE, BRASILIA - DF
            </span>
          </div>
        </div>
        {page <= 4 && (
          <span className="text-primary-gold text-center">
            Etapa <strong>{page}</strong> de <strong>4</strong>
          </span>
        )}
      </div>
      {page === 1 && (
        <div className="flex flex-col items-center gap-6">
          <span className="sm:text-2xl text-xl font-semibold text-primary-gold text-center">
            Informe a quantidade de pessoas
          </span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-primary-gold">
              Selecione a quantidade de adultos
            </span>
            <NumberPicker
              currentNumber={adults}
              setCurrentNumber={setAdults}
              initialNumber={1}
              inLimit={inLimit}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-primary-gold">
              Selecione a quantidade de crianças
            </span>
            <NumberPicker
              currentNumber={childs}
              setCurrentNumber={setChilds}
              initialNumber={0}
              inLimit={inLimit}
            />
          </div>
          {childs + adults === 1 && (
            <span className="text-invalid-color text-center">
              O grupo mínimo para reservas no nosso ambiente é de 2 pessoas.
            </span>
          )}
          {localGeneralConfigs.maxCapacityInReserve != 0 &&
            childs + adults >= localGeneralConfigs.maxCapacityInReserve && (
              <span className="text-invalid-color text-center">
                O grupo máximo para reservas no nosso ambiente é de{" "}
                {localGeneralConfigs.maxCapacityInReserve} pessoas.
              </span>
            )}
          <div>
            <Button
              disabled={childs + adults === 1 ? true : false}
              onClick={() => setPage(2)}
            >
              Continuar
            </Button>
          </div>
          <span
            onClick={() => router.push("/cancelreserve")}
            className="cursor-pointer text-invalid-color flex items-center gap-2 hover:underline"
          >
            <LuCalendarOff size={20} className="min-w-[20px]" /> Quero cancelar
            uma reserva
          </span>
        </div>
      )}
      {page === 2 && (
        <div className="flex flex-col items-center gap-6">
          <span className="sm:text-2xl text-xl font-semibold text-primary-gold ">
            Selecione a Data e o Horário
          </span>
          <Calendar
            onChange={setDate}
            value={date}
            tileDisabled={disableDate}
            tileClassName={({ date, view }) => {
              if (view === "month" && disableDate({ date, view })) {
                return "my-disabled-day";
              }
              return null;
            }}
          />
          {reserve.bookingDate.day &&
            reserve.bookingDate.month &&
            reserve.bookingDate.year && (
              <span className="text-primary-gold">
                {reserve.bookingDate.day}/{reserve.bookingDate.month}/
                {reserve.bookingDate.year}
              </span>
            )}
          <div className="flex gap-2 flex-wrap justify-center">
            {localGeneralConfigs.enabledTimes.map((time, index) => (
              <div
                onClick={() => setReserve({ ...reserve, time })}
                key={index}
                className={`py-3 px-6 rounded-full border border-transparent text-primary-gold bg-primary-black cursor-pointer
                ${time === reserve.time && "!border-primary-gold"}`}
              >
                {time}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPage(1)}>Voltar</Button>
            <Button
              disabled={
                !reserve.time ||
                !(
                  reserve.bookingDate.day &&
                  reserve.bookingDate.month &&
                  reserve.bookingDate.year
                )
              }
              onClick={() => setPage(3)}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}
      {page === 3 && (
        <div className="flex flex-col gap-5">
          <span className="sm:text-2xl text-xl font-semibold text-primary-gold text-center">
            Revise a sua reserva
          </span>
          <div className="text-primary-gold max-w-[400px] flex flex-col gap-2 border p-5 border-dashed rounded-[12px]">
            <span className="flex items-center gap-4">
              <LuCalendar size={20} className="min-w-[20px]" />
              {reserve.bookingDate.day} de{" "}
              {longMonths[reserve.bookingDate.month]} de{" "}
              {reserve.bookingDate.year}
            </span>
            <span className="flex items-center gap-4">
              <LuClock size={20} className="min-w-[20px]" />
              {reserve.time}h
            </span>
            <span className="flex items-center gap-4">
              <LuUsers size={20} className="min-w-[20px]" />
              {reserve.adults + reserve.childs} pessoas
            </span>
            <div className="flex gap-4">
              <LuBadgeInfo size={20} className="min-w-[20px]" />
              <div className="flex flex-col gap-2 text-sm sm:text-base">
                <span>
                  <strong>1 - Tolerância de 15 min de atraso</strong> de acordo
                  com o horário da sua reserva.{" "}
                  <strong>
                    Após esse horário ela é automaticamente cancelada.
                  </strong>
                </span>
                <span>
                  <strong>2 - Valor da entrada é de 25 reais por pessoa</strong>
                  , e dá acesso à casa e aos jogos.
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPage(2)}>Voltar</Button>
            <Button disabled={!reserve.time} onClick={() => setPage(4)}>
              Continuar
            </Button>
          </div>
        </div>
      )}
      {page === 4 && (
        <div className="flex flex-col items-center gap-6">
          <span className="sm:text-2xl text-xl font-semibold text-primary-gold text-center">
            Informe seus dados
          </span>
          <form
            onSubmit={(e) => handleSubmit(e)}
            className="flex flex-col gap-6"
          >
            <Input
              label="Reservar em nome de:"
              placeholder="Reservar em nome de:"
              value={reserve.name}
              setValue={(e) => setReserve({ ...reserve, name: e.target.value })}
            />
            <Input
              label="Email"
              placeholder="Email"
              value={reserve.email}
              setValue={(e) =>
                setReserve({ ...reserve, email: e.target.value })
              }
            />
            <Input
              label="Telefone"
              placeholder="Telefone"
              value={reserve.phone}
              setValue={(e) =>
                setReserve({ ...reserve, phone: e.target.value })
              }
            />
            <Input
              label="Observação"
              placeholder="Observação"
              value={reserve.observation || ""}
              setValue={(e) =>
                setReserve({ ...reserve, observation: e.target.value })
              }
              multiline
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={() => setPage(3)}>Voltar</Button>
              <Button
                type="submit"
                disabled={
                  !reserve.name.trim() ||
                  !reserve.email.trim() ||
                  !reserve.phone.trim()
                }
                onClick={() => setPage(4)}
              >
                Finalizar
              </Button>
            </div>
          </form>
        </div>
      )}
      {page === 5 && (
        <div className="flex flex-col items-center text-primary-gold p-1 gap-2 ">
          <div className="flex gap-2 flex-wrap justify-center">
            <span className="flex items-center gap-2 sm:text-lg text-base font-semiboldtext-center">
              Código da reserva:
            </span>
            <span
              onClick={() => {
                navigator.clipboard.writeText(reserve.code);
                addAlert("Código copiado!");
              }}
              className="font-bold flex items-center gap-2 sm:text-lg text-base underline cursor-pointer text-center"
            >
              #{reserve.code}
              <LuCopy />
            </span>
          </div>
          <img
            src="images/mascote-feliz.png"
            alt="Mascote feliz comemorando reserva realizada"
            className="w-48 max-w-full"
          />
          <div className="flex flex-col ">
            <span className="sm:text-2xl text-lg font-semibold mt-3 text-center">
              Reserva realizada com sucesso!
            </span>
            <span className="sm:text-lg text-sm mt-2 text-center">
              Esperamos por você 🍺
            </span>
          </div>
          <Confetti width={width} height={height} numberOfPieces={40} />
        </div>
      )}
    </div>
  );
}
