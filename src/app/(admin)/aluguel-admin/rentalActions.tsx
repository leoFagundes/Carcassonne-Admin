"use client";

import { useState } from "react";
import { LuCalendarClock, LuPackageCheck, LuPackageOpen, LuX } from "react-icons/lu";
import type { RentalReturnCondition, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi, type ApiResult } from "@/services/rentalApi";
import { formatDateBR } from "@/rental/dates";

type ActionKind = "pickup" | "return" | "dueDate" | "cancel";

const CONDITIONS: { value: RentalReturnCondition; label: string }[] = [
  { value: "ok", label: "OK" },
  { value: "damaged", label: "Com avaria" },
  { value: "missing_parts", label: "Peça faltando" },
];

const buttonClass =
  "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-40";

function ActionModal({
  rental,
  kind,
  onClose,
}: {
  rental: RentalType & { id: string };
  kind: ActionKind;
  onClose: VoidFunction;
}) {
  const { addAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState<RentalReturnCondition>("ok");
  const [note, setNote] = useState("");
  const [markUnavailable, setMarkUnavailable] = useState(false);
  const [dueDate, setDueDate] = useState(rental.dueDate);
  const [reason, setReason] = useState("");

  const run = async (request: () => Promise<ApiResult<null>>, success: string) => {
    if (loading) return;
    setLoading(true);
    const result = await request();
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    addAlert(success);
    onClose();
  };

  const pickChoice = (value: RentalReturnCondition) => {
    setCondition(value);
    setMarkUnavailable(value !== "ok");
  };

  const config = {
    pickup: {
      title: "Registrar retirada",
      submitLabel: "Registrar retirada",
      icon: <LuPackageOpen size={18} />,
      disabled: false,
      submit: () => run(() => rentalApi.pickup(rental.id), "Retirada registrada"),
    },
    return: {
      title: "Registrar devolução",
      submitLabel: "Registrar devolução",
      icon: <LuPackageCheck size={18} />,
      disabled: false,
      submit: () =>
        run(
          () =>
            rentalApi.returnRental(rental.id, {
              condition,
              note: note.trim() || undefined,
              markUnitUnavailable: markUnavailable,
            }),
          "Devolução registrada",
        ),
    },
    dueDate: {
      title: "Alterar devolução",
      submitLabel: "Salvar data",
      icon: <LuCalendarClock size={18} />,
      disabled: !dueDate || dueDate < rental.startDate,
      submit: () =>
        run(() => rentalApi.changeDueDate(rental.id, dueDate), "Data de devolução alterada"),
    },
    cancel: {
      title: "Cancelar aluguel",
      submitLabel: "Cancelar aluguel",
      icon: <LuX size={18} />,
      disabled: !reason.trim(),
      submit: () => run(() => rentalApi.cancel(rental.id, reason.trim()), "Aluguel cancelado"),
    },
  }[kind];

  return (
    <FormCard
      title={config.title}
      subtitle={`${rental.code} · ${rental.gameName} (${rental.unitLabel})`}
      icon={config.icon}
      onClose={onClose}
      onSubmit={config.submit}
      submitLabel={config.submitLabel}
      submitDisabled={config.disabled}
      loading={loading}
    >
      {kind === "pickup" && (
        <p className="text-sm text-primary-gold/70">
          Confirma que {rental.customer.name} retirou {rental.gameName}?
        </p>
      )}

      {kind === "return" && (
        <>
          <div role="radiogroup" aria-label="Estado do jogo" className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={condition === c.value}
                onClick={() => pickChoice(c.value)}
                className={`h-8 px-3 rounded-full border text-xs transition-colors cursor-pointer ${
                  condition === c.value
                    ? "border-primary-gold/60 bg-primary-gold/15 text-primary-gold font-semibold"
                    : "border-primary-gold/15 text-primary-gold/60 hover:border-primary-gold/40"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Input
            value={note}
            setValue={(e) => setNote(e.target.value)}
            placeholder="Observação (opcional)"
            label="Observação"
            multiline
            rows={3}
          />
          <Checkbox
            checked={markUnavailable}
            setChecked={(e) => setMarkUnavailable(e.target.checked)}
            label="Marcar cópia como indisponível"
            variant
          />
        </>
      )}

      {kind === "dueDate" && (
        <>
          <p className="text-xs text-primary-gold/55">
            Retirada em {formatDateBR(rental.startDate, true)} · devolução atual{" "}
            {formatDateBR(rental.dueDate, true)}
          </p>
          <Input
            type="date"
            min={rental.startDate}
            value={dueDate}
            setValue={(e) => setDueDate(e.target.value)}
            placeholder="Nova data de devolução"
            label="Nova data de devolução"
          />
        </>
      )}

      {kind === "cancel" && (
        <Input
          value={reason}
          setValue={(e) => setReason(e.target.value)}
          placeholder="Motivo do cancelamento (obrigatório)"
          label="Motivo"
          multiline
          rows={3}
        />
      )}
    </FormCard>
  );
}

/** Botões de ação de uma linha de aluguel + o modal da ação escolhida. */
export default function RentalActions({ rental }: { rental: RentalType & { id: string } }) {
  const [kind, setKind] = useState<ActionKind | null>(null);
  const reserved = rental.status === "reserved";
  const pickedUp = rental.status === "picked_up";
  if (!reserved && !pickedUp) return null;

  const gold = `${buttonClass} border-primary-gold/50 bg-primary-gold/10 text-primary-gold hover:bg-primary-gold/20`;
  const neutral = `${buttonClass} border-primary-gold/15 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/40`;
  const danger = `${buttonClass} border-invalid-color/30 text-invalid-color/80 hover:bg-invalid-color/10`;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {reserved && (
          <button type="button" className={gold} onClick={() => setKind("pickup")}>
            Registrar retirada
          </button>
        )}
        {pickedUp && (
          <button type="button" className={gold} onClick={() => setKind("return")}>
            Registrar devolução
          </button>
        )}
        <button type="button" className={neutral} onClick={() => setKind("dueDate")}>
          Alterar devolução
        </button>
        <button type="button" className={danger} onClick={() => setKind("cancel")}>
          Cancelar
        </button>
      </div>
      <Modal isOpen={!!kind} onClose={() => setKind(null)} noPadding isFixed patternCloseButton={false}>
        {kind && <ActionModal rental={rental} kind={kind} onClose={() => setKind(null)} />}
      </Modal>
    </>
  );
}
