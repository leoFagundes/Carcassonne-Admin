"use client";

import { ReserveType } from "@/types";
import { useState, useEffect } from "react";
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
  LuCalendarCog,
} from "react-icons/lu";
import Input from "./input";
import { Calendar } from "@heroui/calendar";
import { today, getLocalTimeZone, CalendarDate } from "@internationalized/date";
import { useAlert } from "@/contexts/alertProvider";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import FormCard from "./formCard";

interface ReserveAdminFormsType {
  onClose: VoidFunction;
  reserve: ReserveType | undefined;
  type: "edit" | "add" | "";
  dateProps?: CalendarDate;
}

export default function ReserveAdminForms({
  onClose,
  reserve,
  type,
  dateProps,
}: ReserveAdminFormsType) {
  const [date, setDate] = useState(() =>
    dateProps ? dateProps : today(getLocalTimeZone()),
  );
  const [submitting, setSubmitting] = useState(false);
  const { addAlert } = useAlert();

  const [localReserve, setLocalReserve] = useState<ReserveType>(() =>
    type === "edit" && reserve
      ? reserve
      : {
          name: "",
          code: "",
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
        },
  );

  useEffect(() => {
    if (type !== "edit") {
      ReserveRepository.generateUniqueCode().then((code) =>
        setLocalReserve((prev) => ({ ...prev, code })),
      );
    }
  }, [type]);

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

  async function handleCreateReserve() {
    if (!isReserveFormValid() || submitting) return;

    setSubmitting(true);
    try {
      await ReserveRepository.create(localReserve);
      addAlert(`Reserva de ${localReserve.name} criada com sucesso!`);

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: localReserve.email,
          subject: `🍻 Sobre a sua reserva no Carcassonne Pub`,
          props: {
            name: localReserve.name,
            code: localReserve.code,
            bookingDate: localReserve.bookingDate,
            time: localReserve.time,
            adults: localReserve.adults,
            childs: localReserve.childs,
          },
          template: "client",
        }),
      });

      const res2 = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "carcassonnepub@gmail.com",
          subject: `Nova reserva recebida - Carcassonne Pub`,
          props: {
            name: localReserve.name,
            code: localReserve.code,
            bookingDate: localReserve.bookingDate,
            time: localReserve.time,
            adults: localReserve.adults,
            childs: localReserve.childs,
            email: localReserve.email,
            phone: localReserve.phone,
            observation: localReserve.observation,
          },
          template: "staff",
        }),
      });

      const data = await res.json();
      const data2 = await res2.json();

      if (!data.success) {
        addAlert(data.error);
      } else {
        addAlert("Email para o cliente enviado com sucesso!");
      }

      if (!data2.success) {
        addAlert(data2.error);
      } else {
        addAlert("Email interno enviado com sucesso!");
      }

      onClose();
    } catch (error) {
      addAlert("Erro ao criar uma nova reserva!");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditReserve() {
    if (!isReserveFormValid() || submitting) return;
    if (!localReserve.id) {
      addAlert(
        "Reserv não encontrada para edição, recarregue a página e tente novamente.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await ReserveRepository.update(localReserve.id, localReserve);
      addAlert(`Reserva de ${localReserve.name} editada com sucesso!`);
      onClose();
    } catch (error) {
      addAlert("Erro ao editar esta reserva!");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormCard
      title={type === "add" ? "Nova Reserva" : "Editar Reserva"}
      subtitle={
        type === "add"
          ? "Crie uma reserva em nome do cliente"
          : `Reserva #${localReserve.code} de ${localReserve.name}`
      }
      icon={
        type === "add" ? <LuCalendarPlus size={18} /> : <LuCalendarCog size={18} />
      }
      onClose={onClose}
      maxWidth="sm:max-w-[920px]"
      onSubmit={type === "add" ? handleCreateReserve : handleEditReserve}
      submitLabel={type === "add" ? "Criar reserva" : "Salvar alterações"}
      loading={submitting}
    >
      <div className="flex gap-6 flex-wrap justify-center text-primary-gold py-2">
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
    </FormCard>
  );
}
