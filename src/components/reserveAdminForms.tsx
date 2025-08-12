"use client";

import { ReserveType } from "@/types";
import { useState } from "react";
import {
  LuClock,
  LuUser,
  LuPhone,
  LuMail,
  LuBookOpenText,
  LuUserRound,
  LuBaby,
  LuTable,
  LuCalendarPlus,
} from "react-icons/lu";
import Input from "./input";
import { randomCodeGenerator } from "@/utils/utilFunctions";
import { Calendar } from "@heroui/calendar";
import { today, getLocalTimeZone } from "@internationalized/date";
import Button from "./button";
import { useAlert } from "@/contexts/alertProvider";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import YelpRecentLoginEmail from "./react-email/clientResponseTemplate";

interface ReserveAdminFormsType {
  onClose: VoidFunction;
}

export default function ReserveAdminForms({ onClose }: ReserveAdminFormsType) {
  const [date, setDate] = useState(today(getLocalTimeZone()));

  const { addAlert } = useAlert();

  const [localReserve, setLocalReserve] = useState<ReserveType>({
    name: "",
    code: randomCodeGenerator(),
    bookingDate: {
      day: date.day.toString(),
      month: date.month.toString(),
      year: date.year.toString(),
    },
    time: "",
    phone: "",
    email: "",
    observation: "",
    adults: 0,
    childs: 0,
    status: "confirmed",
    table: "",
  });

  const isReserveFormValid = () => {
    if (!localReserve.name.trim()) {
      addAlert("O nome da reserva é obrigatório.");
      return false;
    }

    if (
      !localReserve.bookingDate.day ||
      !localReserve.bookingDate.month ||
      !localReserve.bookingDate.year
    ) {
      addAlert("A data da reserva é obrigatória.");
      return false;
    }

    if (!localReserve.time.trim()) {
      addAlert("O horário da reserva é obrigatório.");
      return false;
    }

    if (!localReserve.phone.trim()) {
      addAlert("O telefone é obrigatório.");
      return false;
    }

    if (!localReserve.email.trim()) {
      addAlert("O email é obrigatório.");
      return false;
    } else {
      // Validação simples de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(localReserve.email)) {
        addAlert("Email inválido.");
        return false;
      }
    }

    if (localReserve.adults <= 0 && localReserve.childs <= 0) {
      addAlert("Informe pelo menos uma pessoa (adulto ou criança).");
      return false;
    }

    return true;
  };

  async function handleCreateReserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReserveFormValid()) return;

    try {
      await ReserveRepository.create(localReserve);
      addAlert(`Reserva de ${localReserve.name} criada com sucesso!`);
      onClose();

      const clientSubject = `🍻 Sobre a sua reserva no Carcassonne Pub`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const clientMessage = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; font-size: 16px; color: #333;">
          <p>Olá <strong>${localReserve.name}</strong>!</p>

          <p>
            Recebemos sua solicitação de reserva no <strong>Carcassonne Pub</strong> e estamos muito felizes
            por você querer passar esse momento conosco!
          </p>

          <p>
            <strong>Código:</strong> #${localReserve.code}<br/>
            🗓️ <strong>Data:</strong> ${localReserve.bookingDate.day}/${
              localReserve.bookingDate.month
            }/${localReserve.bookingDate.year}<br/>
            ⏰ <strong>Horário:</strong> ${localReserve.time}h<br/>
            👥 <strong>Quantidade de pessoas:</strong> ${
              localReserve.childs + localReserve.adults
            } pessoas
          </p>

          <p style="color: #d9534f;">
            ⚠️ Lembramos que as reservas são válidas até <strong>19:30</strong>.
            Após esse horário, não conseguimos garantir a disponibilidade da mesa.
          </p>

          <p>
            Caso precise alterar ou cancelar sua reserva, por favor nos avise com antecedência respondendo a este e-mail.
          </p>

          <p>Nos vemos em breve! 🍺<br/>
          <strong>Equipe Carcassonne Pub</strong></p>
        </div>
      `;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const staffSubject = `📩 Nova reserva recebida - Carcassonne Pub`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const staffMessage = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; font-size: 16px; color: #333;">
    <h2>📢 Nova solicitação de reserva recebida!</h2>

    <p>
      <strong>Nome do cliente:</strong> ${localReserve.name}<br/>
      📧 <strong>Email:</strong> ${localReserve.email}<br/>
      📱 <strong>Telefone:</strong> ${localReserve.phone}
    </p>

    <p>
      <strong>Código da reserva:</strong> #${localReserve.code}<br/>
      🗓️ <strong>Data:</strong> ${localReserve.bookingDate.day}/${
        localReserve.bookingDate.month
      }/${localReserve.bookingDate.year}<br/>
      ⏰ <strong>Horário:</strong> ${localReserve.time}h<br/>
      👥 <strong>Quantidade de pessoas:</strong> ${
        localReserve.adults + localReserve.childs
      } 
        (Adultos: ${localReserve.adults} | Crianças: ${localReserve.childs})
    </p>

    ${
      localReserve.observation
        ? `<p>📝 <strong>Observações do cliente:</strong> ${localReserve.observation}</p>`
        : ""
    }

    <p>
      <strong>Enviado automaticamente pelo sistema de reservas</strong>
    </p>
  </div>
`;

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: localReserve.email,
          subject: clientSubject,
          react: (
            <YelpRecentLoginEmail
              userFirstName="Alan"
              loginDate={new Date("September 7, 2022, 10:58 am")}
              loginDevice="Chrome on Mac OS X"
              loginLocation="Upland, California, United States"
              loginIp="47.149.53.167"
            />
          ),
        }),
      });

      // const res2 = await fetch("/api/send-email", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     to: "carcassonnepub@gmail.com",
      //     subject: staffSubject,
      //     message: staffMessage,
      //   }),
      // });

      const data = await res.json();
      // const data2 = await res2.json();

      if (!data.success) {
        addAlert(data.error);
      } else {
        addAlert("Email para o cliente enviado com sucesso!");
      }

      // if (!data2.success) {
      //   addAlert(data2.error);
      // } else {
      //   addAlert("Email interno enviado com sucesso!");
      // }
    } catch (error) {
      addAlert("Erro ao criar uma nova reserva!");
      console.error(error);
    }
  }

  return (
    <div className="flex justify-center w-full h-full text-primary-gold">
      <form
        onSubmit={handleCreateReserve}
        className="flex flex-col items-center w-fit  rounded px-3 py-8 sm:p-10 gap-10 overflow-y-scroll max-h-[100%] max-w-[100%] sm:max-h-[90%] sm:max-w-[90%]"
      >
        <span className="flex items-center gap-2 font-semibold sm:text-2xl text-xl">
          <LuCalendarPlus size={"20px"} className="min-w-[16px]" />
          Criar uma nova Reserva
        </span>
        <div className="flex gap-6 flex-wrap justify-center">
          <section className="flex flex-col items-center gap-2">
            <Calendar
              aria-label="Date (Invalid on weekends)"
              value={date}
              onChange={(e) => {
                setDate(e);
                setLocalReserve({
                  ...localReserve,
                  bookingDate: {
                    day: e.day.toString(),
                    month: e.month.toString(),
                    year: e.year.toString(),
                  },
                });
              }}
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
            <span>
              {date.day < 10 ? `0${date.day}` : date.day}/
              {date.month < 10 ? `0${date.month}` : date.month}/{date.year}
            </span>
          </section>
          <section className="flex justify-center gap-6 flex-wrap">
            <div className="flex flex-col gap-6">
              <Input
                label="Horário"
                placeholder="HH:MM"
                value={localReserve.time}
                setValue={(e) =>
                  setLocalReserve({ ...localReserve, time: e.target.value })
                }
                variant
                icon={<LuClock size={"18px"} />}
                width="!w-[250px]"
                options={[
                  "17:00",
                  "17:30",
                  "18:00",
                  "18:30",
                  "19:00",
                  "19:30",
                  "20:00",
                ]}
              />
              <Input
                label="Nome"
                placeholder="Nome do Cliente"
                value={localReserve.name}
                setValue={(e) =>
                  setLocalReserve({ ...localReserve, name: e.target.value })
                }
                variant
                icon={<LuUser size={"20px"} />}
                width="!w-[250px]"
              />
              <Input
                label="Telefone"
                placeholder="(99) 99999-9999"
                value={localReserve.phone}
                setValue={(e) =>
                  setLocalReserve({ ...localReserve, phone: e.target.value })
                }
                variant
                icon={<LuPhone size={"18px"} />}
                width="!w-[250px]"
                options={["(61) 99968-4186"]}
              />
              <Input
                label="E-mail"
                placeholder="email@exemplo.com"
                value={localReserve.email}
                setValue={(e) =>
                  setLocalReserve({ ...localReserve, email: e.target.value })
                }
                variant
                icon={<LuMail size={"18px"} />}
                width="!w-[250px]"
                options={["carcassonnepub@gmail.com"]}
              />
              <Input
                label="Mesa"
                placeholder="Mesa"
                value={localReserve.table || ""}
                setValue={(e) =>
                  setLocalReserve({ ...localReserve, table: e.target.value })
                }
                variant
                icon={<LuTable size={"18px"} />}
                width="!w-[250px]"
              />
            </div>
            <div className="flex flex-col gap-6">
              <Input
                label="Adultos"
                type="number"
                placeholder="Ex: 2"
                value={String(localReserve.adults)}
                setValue={(e) =>
                  setLocalReserve({
                    ...localReserve,
                    adults: Number(e.target.value),
                  })
                }
                variant
                icon={<LuUserRound size={"18px"} />}
                width="!w-[250px]"
              />
              <Input
                label="Crianças"
                type="number"
                placeholder="Ex: 1"
                value={String(localReserve.childs)}
                setValue={(e) =>
                  setLocalReserve({
                    ...localReserve,
                    childs: Number(e.target.value),
                  })
                }
                variant
                icon={<LuBaby size={"18px"} />}
                width="!w-[250px]"
              />
              <Input
                label="Observação"
                placeholder="Observações"
                value={localReserve.observation || ""}
                setValue={(e) =>
                  setLocalReserve({
                    ...localReserve,
                    observation: e.target.value,
                  })
                }
                variant
                multiline
                rows={8}
                icon={<LuBookOpenText size={"20px"} />}
                width="!w-[250px]"
              />
            </div>
          </section>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onClose()}>Cancelar</Button>
          <Button type="submit">Criar</Button>
        </div>
      </form>
    </div>
  );
}
