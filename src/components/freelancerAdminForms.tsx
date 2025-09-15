"use client";

import { FreelancerControllType } from "@/types";
import { useState } from "react";
import { LuUser, LuUserPlus } from "react-icons/lu";
import Input from "./input";
import { Calendar } from "@heroui/calendar";
import { today, getLocalTimeZone, CalendarDate } from "@internationalized/date";
import Button from "./button";
import { useAlert } from "@/contexts/alertProvider";
import { patternFreelancer } from "@/utils/patternValues";
import FreelancerRepository from "@/services/repositories/FreelancerRepository";
import Checkbox from "./checkbox";

interface ReserveAdminFormsType {
  onClose: VoidFunction;
  dateProps?: CalendarDate;
}

export default function FreelancerAdminForms({
  onClose,
  dateProps,
}: ReserveAdminFormsType) {
  const [date, setDate] = useState(() =>
    dateProps ? dateProps : today(getLocalTimeZone())
  );

  const { addAlert } = useAlert();

  const [currentFreelancer, setCurrentFreelancer] =
    useState<FreelancerControllType>({
      ...patternFreelancer,
      bookingDate: {
        day: date.day.toString(),
        month: date.month.toString(),
        year: date.year.toString(),
      },
    });

  const isFreelancerValid = () => {
    if (!currentFreelancer.name.trim()) {
      addAlert("O nome é obrigatório.");
      return false;
    }

    if (
      !currentFreelancer.bookingDate.day ||
      !currentFreelancer.bookingDate.month ||
      !currentFreelancer.bookingDate.year
    ) {
      addAlert("A data do freelancer é obrigatória.");
      return false;
    }

    return true;
  };

  async function handleCreateFreelancer(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!isFreelancerValid()) return;

    try {
      await FreelancerRepository.create(currentFreelancer);
      addAlert(`Freelancer criado com sucesso!`);

      onClose();
    } catch (error) {
      addAlert("Erro ao criar uma nova reserva!");
      console.error(error);
    }
  }

  return (
    <div className="flex justify-center w-full h-full text-primary-gold">
      <form
        onSubmit={(e) => handleCreateFreelancer(e)}
        className="flex flex-col items-center w-fit  rounded px-3 py-8 sm:p-10 gap-10 overflow-y-scroll max-h-[100%] max-w-[100%] sm:max-h-[90%] sm:max-w-[90%]"
      >
        <span className="flex items-center gap-2 font-semibold sm:text-2xl text-xl">
          <LuUserPlus size={"20px"} className="min-w-[16px]" />
          Criar um novo freelancer
        </span>
        <div className="flex gap-6 flex-wrap justify-center">
          <section className="flex flex-col items-center gap-2">
            <Calendar
              aria-label="Date (Invalid on weekends)"
              value={date}
              onChange={(e) => {
                setDate(e);
                setCurrentFreelancer({
                  ...currentFreelancer,
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
                label="Nome"
                placeholder="Nome do Freelancer"
                value={currentFreelancer.name}
                setValue={(e) =>
                  setCurrentFreelancer({
                    ...currentFreelancer,
                    name: e.target.value,
                  })
                }
                variant
                icon={<LuUser size={"20px"} />}
                width="!w-[250px]"
              />
              <Checkbox
                label="Freela está pago?"
                variant
                checked={currentFreelancer.isPayed}
                setChecked={() =>
                  setCurrentFreelancer({
                    ...currentFreelancer,
                    isPayed: !currentFreelancer.isPayed,
                  })
                }
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
