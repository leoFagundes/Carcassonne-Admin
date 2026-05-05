"use client";

import { useEffect, useState } from "react";
import NumberPicker from "./numberPicker";
import Button from "@/components/button";
import Calendar from "react-calendar";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { GeneralConfigsType, ReserveType } from "@/types";
import { randomCodeGenerator } from "@/utils/utilFunctions";
import {
  daysArray,
  longMonths,
  patternGeneralConfigs,
} from "@/utils/patternValues";
import {
  LuBadgeInfo,
  LuCalendar,
  LuCalendarOff,
  LuClock,
  LuCopy,
  LuMessageCircleWarning,
  LuUsers,
} from "react-icons/lu";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { useRouter } from "next/navigation";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Loader from "@/components/loader";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const STAR = (
  <svg
    width="7"
    height="7"
    viewBox="0 0 10 10"
    className="text-primary-gold/50 shrink-0"
  >
    <polygon
      points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
      fill="currentColor"
    />
  </svg>
);

export default function Reserve() {
  const [page, setPage] = useState(1);
  const [adults, setAdults] = useState(2);
  const [childs, setChilds] = useState(0);
  const [inLimit, setInLimit] = useState(false);
  const [date, setDate] = useState<Value>();
  const [allReserves, setAllReserves] = useState<ReserveType[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [componentLoading, setcomponentLoading] = useState(false);
  const [localGeneralConfigs, setLocalGeneralConfigs] =
    useState<GeneralConfigsType>(patternGeneralConfigs);
  const [reserve, setReserve] = useState<ReserveType>({
    name: "",
    code: randomCodeGenerator(),
    bookingDate: { day: "", month: "", year: "" },
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
      setPageLoading(true);
      try {
        const reserves = await ReserveRepository.getAll();
        setAllReserves(reserves);
      } catch (error) {
        console.error(error);
      } finally {
        setPageLoading(false);
      }
    }
    fetchReserves();
  }, []);

  useEffect(() => {
    setInLimit(adults + childs >= localGeneralConfigs.maxCapacityInReserve);
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

  function getTotalPeopleOnDate(date: Date, bookings: ReserveType[]): number {
    const bookingsOnDate = bookings.filter((booking) => {
      if (booking.status !== "confirmed") return false;
      const bDate = booking.bookingDate;
      return (
        Number(bDate.year) === date.getFullYear() &&
        Number(bDate.month) === date.getMonth() + 1 &&
        Number(bDate.day) === date.getDate()
      );
    });
    return bookingsOnDate.reduce(
      (t, b) => t + (b.adults || 0) + (b.childs || 0),
      0,
    );
  }

  function disableDate({ date, view }: { date: Date; view: string }): boolean {
    if (view !== "month") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setMonth(
      maxDate.getMonth() + localGeneralConfigs.maxMonthsInAdvance,
    );
    if (localGeneralConfigs.disabledDays.includes(date.getDay())) return true;
    const now = new Date();
    if (
      date.getTime() === today.getTime() &&
      now.getHours() >= localGeneralConfigs.hoursToCloseReserve
    )
      return true;
    if (date < today || date > maxDate) return true;
    return (
      getTotalPeopleOnDate(date, allReserves) + adults + childs >
      localGeneralConfigs.maxCapacityInDay
    );
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone: string) {
    const d = phone.replace(/\D/g, "");
    return d.length >= 8 && d.length <= 15;
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

    const freshConfigs = await GeneralConfigsRepository.get();
    if (!freshConfigs) {
      addAlert("Erro ao validar horário limite. Tente novamente.");
      setcomponentLoading(false);
      return;
    }

    const now = new Date();
    const limitDate = new Date();
    limitDate.setHours(freshConfigs.hoursToCloseReserve, 0, 0, 0);
    const isTodayBooking =
      Number(reserve.bookingDate.day) === now.getDate() &&
      Number(reserve.bookingDate.month) === now.getMonth() + 1 &&
      Number(reserve.bookingDate.year) === now.getFullYear();

    if (isTodayBooking && now > limitDate) {
      addAlert("O horário limite para reservar hoje já passou.");
      setcomponentLoading(false);
      return;
    }

    setcomponentLoading(true);
    try {
      const createdReserve = await ReserveRepository.create(reserve);
      if (!createdReserve || !createdReserve._id)
        throw new Error("Falha ao salvar reserva");

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

      addAlert("Reserva realizada com sucesso.");
      setPage(5);

      const data = await res.json();
      if (!data.success) {
        addAlert(
          "Erro ao enviar os detalhes por email, entre em contato pelo WhatsApp.",
        );
      } else {
        addAlert("Os detalhes da sua reserva foram enviados para o seu e-mail");
      }
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao realizar a reserva.`);
    } finally {
      setcomponentLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        @keyframes shimmer-gold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s linear infinite;
        }
        .hex-bg-reserve {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="relative flex flex-col items-center px-4 py-8 gap-6 min-h-screen text-primary-gold">
        {pageLoading && (
          <LoaderFullscreen
            messages={["Carregando Reservas", "Preparando o Ambiente"]}
          />
        )}

        <div className="hex-bg-reserve fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Header */}
        <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-[420px] mt-2">
          <div className="flex items-center gap-4">
            <img
              className="rounded-lg w-[60px] sm:w-[72px] shadow-card"
              src="images/real-logo.png"
              alt="logo"
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-cinzel text-base sm:text-lg font-semibold text-shimmer-gold tracking-wide">
                Carcassonne Pub
              </span>
              <span className="text-[10px] text-primary-gold/45 italic leading-relaxed">
                CLN 407 BLOCO E LOJA 37
                <br />
                ASA NORTE, BRASÍLIA - DF
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
            {STAR}
            <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-primary-gold/50 whitespace-nowrap">
              Reservas
            </span>
            {STAR}
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
          </div>

          {/* Step dots */}
          {page <= 4 && (
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === page
                      ? "w-6 bg-primary-gold"
                      : step < page
                        ? "w-1.5 bg-primary-gold/50"
                        : "w-1.5 bg-primary-gold/20"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Page 1 — pessoas */}
        {page === 1 && (
          <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[420px] bg-secondary-black/60 border border-primary-gold/20 rounded-xl p-6">
            <p className="text-lg sm:text-xl font-semibold text-center">
              Quantidade de pessoas
            </p>

            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-sm text-primary-gold/70">Adultos</span>
              <NumberPicker
                currentNumber={adults}
                setCurrentNumber={setAdults}
                initialNumber={1}
                inLimit={inLimit}
              />
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-sm text-primary-gold/70">Crianças</span>
              <NumberPicker
                currentNumber={childs}
                setCurrentNumber={setChilds}
                initialNumber={0}
                inLimit={inLimit}
              />
            </div>

            {childs + adults === 1 && (
              <p className="text-invalid-color text-center text-sm">
                O grupo mínimo para reservas é de 2 pessoas.
              </p>
            )}
            {localGeneralConfigs.maxCapacityInReserve !== 0 &&
              childs + adults >= localGeneralConfigs.maxCapacityInReserve && (
                <p className="text-invalid-color text-center text-sm">
                  O grupo máximo para reservas é de{" "}
                  {localGeneralConfigs.maxCapacityInReserve} pessoas.
                </p>
              )}

            <Button disabled={childs + adults === 1} onClick={() => setPage(2)}>
              Continuar
            </Button>

            <span
              onClick={() => router.push("/cancelreserve")}
              className="cursor-pointer text-invalid-color/70 hover:text-invalid-color flex items-center gap-2 text-sm transition-colors"
            >
              <LuCalendarOff size={16} className="min-w-[16px]" /> Cancelar uma
              reserva
            </span>
          </div>
        )}

        {/* Page 2 — data e horário */}
        {page === 2 && (
          <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[420px]">
            <div className="w-full bg-secondary-black/60 border border-primary-gold/20 rounded-xl p-5 flex flex-col items-center gap-4">
              <p className="text-lg sm:text-xl font-semibold text-center">
                Data e Horário
              </p>

              <Calendar
                onChange={setDate}
                value={date}
                tileDisabled={disableDate}
                tileClassName={({ date, view }) =>
                  view === "month" && disableDate({ date, view })
                    ? "my-disabled-day"
                    : null
                }
              />

              {reserve.bookingDate.day &&
                reserve.bookingDate.month &&
                reserve.bookingDate.year && (
                  <span className="text-sm text-primary-gold/70">
                    {reserve.bookingDate.day}/{reserve.bookingDate.month}/
                    {reserve.bookingDate.year}
                  </span>
                )}

              {/* Time pills */}
              <div className="flex gap-2 flex-wrap justify-center">
                {localGeneralConfigs.enabledTimes.map((time, index) => (
                  <div
                    key={index}
                    onClick={() => setReserve({ ...reserve, time })}
                    className={`py-2 px-5 rounded-lg border text-sm cursor-pointer transition-all duration-200 ${
                      time === reserve.time
                        ? "border-primary-gold bg-primary-gold/10 text-primary-gold"
                        : "border-primary-gold/20 bg-primary-black/40 text-primary-gold/70 hover:border-primary-gold/50"
                    }`}
                  >
                    {time}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setPage(1);
                    setDate(undefined);
                    setReserve({
                      ...reserve,
                      time: "",
                      bookingDate: { day: "", month: "", year: "" },
                    });
                  }}
                >
                  Voltar
                </Button>
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

            {/* Info box */}
            <div className="w-full bg-primary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-primary-gold/80">
                <LuMessageCircleWarning size={15} className="min-w-[15px]" />
                Datas indisponíveis se enquadram em:
              </span>
              <div className="flex flex-col text-xs text-primary-gold/60 gap-1 mt-1">
                <span>
                  • É{" "}
                  {localGeneralConfigs.disabledDays
                    .map((d) => daysArray[d])
                    .join(" ou ")}
                </span>
                <span>
                  • Limite de {localGeneralConfigs.maxCapacityInDay} pessoas no
                  dia atingido
                </span>
                <span>
                  • Passou do horário limite (
                  {localGeneralConfigs.hoursToCloseReserve}h) para hoje
                </span>
                <span>
                  • Além de {localGeneralConfigs.maxMonthsInAdvance}{" "}
                  {localGeneralConfigs.maxMonthsInAdvance === 1
                    ? "mês"
                    : "meses"}{" "}
                  de antecedência
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Page 3 — revisão */}
        {page === 3 && (
          <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[420px] bg-secondary-black/60 border border-primary-gold/20 rounded-xl p-6">
            <p className="text-lg sm:text-xl font-semibold text-center">
              Revise sua reserva
            </p>

            <div className="w-full flex flex-col gap-3 border border-primary-gold/20 rounded-xl p-4 bg-primary-black/30">
              <span className="flex items-center gap-3 text-sm">
                <LuCalendar
                  size={18}
                  className="min-w-[18px] text-primary-gold/60 shrink-0"
                />
                {reserve.bookingDate.day} de{" "}
                {longMonths[reserve.bookingDate.month]} de{" "}
                {reserve.bookingDate.year}
              </span>
              <span className="flex items-center gap-3 text-sm">
                <LuClock
                  size={18}
                  className="min-w-[18px] text-primary-gold/60 shrink-0"
                />
                {reserve.time}h
              </span>
              <span className="flex items-center gap-3 text-sm">
                <LuUsers
                  size={18}
                  className="min-w-[18px] text-primary-gold/60 shrink-0"
                />
                {reserve.adults + reserve.childs} pessoas
              </span>
              <div className="h-px w-full bg-primary-gold/10" />
              <div className="flex gap-3">
                <LuBadgeInfo
                  size={18}
                  className="min-w-[18px] text-primary-gold/60 shrink-0 mt-0.5"
                />
                <div className="flex flex-col gap-2 text-xs text-primary-gold/70">
                  <span>
                    <strong className="text-primary-gold/90">
                      Tolerância de 15 min de atraso
                    </strong>{" "}
                    — após esse horário não podemos garantir a disponibilidade
                    da mesa.
                  </span>
                  <span>
                    <strong className="text-primary-gold/90">
                      Valor da entrada:
                    </strong>{" "}
                    R$ 20 por pessoa às quartas-feiras e R$ 25 nos demais dias.
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

        {/* Page 4 — dados pessoais */}
        {page === 4 && (
          <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[420px] bg-secondary-black/60 border border-primary-gold/20 rounded-xl p-6">
            <p className="text-lg sm:text-xl font-semibold text-center">
              Seus dados
            </p>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 w-full"
            >
              <Input
                label="Reservar em nome de:"
                placeholder="Reservar em nome de:"
                value={reserve.name}
                setValue={(e) =>
                  setReserve({ ...reserve, name: e.target.value })
                }
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
                placeholder="Observação (opcional)"
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
                    !reserve.phone.trim() ||
                    componentLoading
                  }
                >
                  {componentLoading ? <Loader /> : "Finalizar"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Page 5 — sucesso */}
        {page === 5 && (
          <div className="relative z-10 flex flex-col items-center gap-4 text-primary-gold max-w-[400px] w-full">
            <Confetti width={width} height={height} numberOfPieces={40} />

            <div className="flex flex-col items-center gap-5 bg-secondary-black/60 border border-primary-gold/20 rounded-xl p-6 w-full text-center">
              <img
                src="images/mascote-feliz.png"
                alt="Mascote feliz"
                className="w-36 max-w-full"
              />

              <div className="flex flex-col gap-1">
                <p className="font-cinzel text-xl sm:text-2xl text-shimmer-gold font-semibold">
                  Reserva confirmada!
                </p>
                <p className="text-sm text-primary-gold/70 mt-1">
                  Esperamos por você 🍺
                </p>
              </div>

              <div className="h-px w-full bg-primary-gold/15" />

              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-primary-gold/50 uppercase tracking-widest">
                  Código da reserva
                </span>
                <span
                  onClick={() => {
                    navigator.clipboard.writeText(reserve.code);
                    addAlert("Código copiado!");
                  }}
                  className="font-cinzel font-bold text-xl flex items-center gap-2 cursor-pointer hover:text-primary-gold/80 transition-colors"
                >
                  #{reserve.code}
                  <LuCopy size={16} />
                </span>
                <p className="text-xs text-primary-gold/45 mt-1">
                  Os detalhes foram enviados para o seu e-mail.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
