"use client";

import { FreelancerType } from "@/types";
import { useState } from "react";
import { LuUser, LuNotebookPen, LuUserPlus } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import { CalendarDate } from "@internationalized/date";
import Input from "./input";
import Button from "./button";
import { useAlert } from "@/contexts/alertProvider";
import { patternFreelancerType } from "@/utils/patternValues";
import FreelancerRepository from "@/services/repositories/FreelancerRepository";
import FreelancerBookingRepository from "@/services/repositories/FreelancerBookingRepository";
import MultiDatePicker from "./multiDatePicker";
import FreelancerPhotoPicker from "./freelancerPhotoPicker";

interface FreelancerAdminFormsType {
  onClose: VoidFunction;
  onCreated: VoidFunction;
}

export default function FreelancerAdminForms({
  onClose,
  onCreated,
}: FreelancerAdminFormsType) {
  const { addAlert } = useAlert();

  const [currentFreelancer, setCurrentFreelancer] = useState<FreelancerType>({
    ...patternFreelancerType,
  });
  const [selectedDates, setSelectedDates] = useState<CalendarDate[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function isFreelancerValid() {
    if (!currentFreelancer.name.trim()) {
      addAlert("O nome é obrigatório.");
      return false;
    }
    return true;
  }

  async function handleCreateFreelancer(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!isFreelancerValid() || submitting) return;

    setSubmitting(true);
    try {
      const freelancerId = await FreelancerRepository.create(currentFreelancer);

      if (!freelancerId) {
        addAlert("Erro ao criar freelancer.");
        return;
      }

      if (selectedDates.length > 0) {
        await FreelancerBookingRepository.createMany(
          selectedDates.map((date) => ({
            freelancerId,
            freelancerName: currentFreelancer.name,
            status: "confirmed",
            isPayed: false,
            bookingDate: {
              day: date.day.toString(),
              month: date.month.toString(),
              year: date.year.toString(),
            },
          })),
        );
      }

      addAlert(`Freelancer ${currentFreelancer.name} criado com sucesso!`);
      onCreated();
      onClose();
    } catch (error) {
      addAlert("Erro ao criar um novo freelancer!");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex justify-center w-full h-full text-primary-gold">
      <form
        onSubmit={(e) => handleCreateFreelancer(e)}
        className="flex flex-col items-center w-fit rounded px-3 py-6 sm:p-8 gap-8 overflow-y-auto max-h-[100%] max-w-[100%] sm:max-h-[90%] sm:max-w-[90%]"
      >
        <div className="w-full text-center">
          <span className="text-xl sm:text-2xl text-gradient-gold flex items-center justify-center gap-2">
            <LuUserPlus size={20} className="shrink-0" />
            Novo freelancer
          </span>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent mt-2" />
        </div>
        <div className="flex gap-6 flex-wrap justify-center">
          <MultiDatePicker
            dates={selectedDates}
            setDates={setSelectedDates}
            label="Já escalar em algum dia? (opcional)"
          />
          <section className="flex flex-col gap-6 w-full sm:w-auto">
            <div className="flex items-center gap-4 flex-wrap">
              <FreelancerPhotoPicker
                photoUrl={currentFreelancer.photoUrl}
                onChange={(photo) =>
                  setCurrentFreelancer({
                    ...currentFreelancer,
                    photoUrl: photo?.url ?? "",
                    photoSource: photo?.source ?? "",
                  })
                }
              />
              <span className="text-xs text-primary-gold/40 max-w-[150px]">
                Foto opcional, aparece ao lado do nome na lista.
              </span>
            </div>
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
              width="!w-[min(250px,100%)]"
            />
            <Input
              label="WhatsApp (opcional)"
              placeholder="Número de WhatsApp"
              value={currentFreelancer.phone ?? ""}
              setValue={(e) =>
                setCurrentFreelancer({
                  ...currentFreelancer,
                  phone: e.target.value,
                })
              }
              variant
              icon={<FaWhatsapp size={"20px"} />}
              width="!w-[min(250px,100%)]"
            />
            <Input
              label="Observações (opcional)"
              placeholder="Ex: bom de bar, atrasa às vezes..."
              value={currentFreelancer.notes ?? ""}
              setValue={(e) =>
                setCurrentFreelancer({
                  ...currentFreelancer,
                  notes: e.target.value,
                })
              }
              variant
              icon={<LuNotebookPen size={"20px"} />}
              width="!w-[min(250px,100%)]"
            />
          </section>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onClose()} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            Criar
          </Button>
        </div>
      </form>
    </div>
  );
}
