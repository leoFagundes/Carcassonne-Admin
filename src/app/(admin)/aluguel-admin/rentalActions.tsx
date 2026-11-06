"use client";

import { useState } from "react";
import { LuCalendarClock, LuPackageCheck, LuPackageOpen, LuX } from "react-icons/lu";
import type { RentalOrderType, RentalReturnCondition, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi, type ApiResult } from "@/services/rentalApi";
import { formatDateBR, todaySP } from "@/rental/dates";
import { canPickUp } from "@/rental/bookings";
import { formatBRL, parseBRL } from "@/rental/money";
import { isPaidOnline, refundableLeft, rentalPrice } from "@/rental/payments";
import { AmountField, centsToInput } from "./refundForms";

type Order = RentalOrderType & { id: string };
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
  order,
  onClose,
}: {
  rental: RentalType & { id: string };
  kind: ActionKind;
  order?: Order;
  onClose: VoidFunction;
}) {
  const { addAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState<RentalReturnCondition>("ok");
  const [note, setNote] = useState("");
  const [markUnavailable, setMarkUnavailable] = useState(false);
  const [dueDate, setDueDate] = useState(rental.dueDate);
  const [reason, setReason] = useState("");

  // Aluguel de pedido pago online: cancelar pergunta quanto devolver (padrão: o valor do jogo).
  const paid = isPaidOnline(order);
  // A chave é a do reembolso deste cancelamento no servidor: o que já está em andamento não conta contra ele.
  const refundCap = order
    ? Math.min(rentalPrice(order, rental.id), refundableLeft(order, `${order.id}:${rental.id}:cancel`))
    : 0;
  const resumed = order?.payment?.pendingRefunds?.find((p) => p.key === `${order.id}:${rental.id}:cancel`);
  const [refundText, setRefundText] = useState(centsToInput(resumed?.amount ?? refundCap));
  const refundCents = parseBRL(refundText);
  const refundValid = !paid || refundCap === 0 || (refundCents !== null && refundCents <= refundCap);
  const refundAmount = !paid ? undefined : refundCap === 0 ? 0 : (refundCents ?? 0);

  const run = async (request: () => Promise<ApiResult<unknown>>, success: string) => {
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
      icon: <LuX size={18} />,
      disabled: !reason.trim() || !refundValid,
      submitLabel:
        paid && refundAmount === 0
          ? "Cancelar sem reembolso"
          : paid
            ? `Cancelar e devolver ${formatBRL(refundAmount ?? 0)}`
            : "Cancelar aluguel",
      submit: () => run(
          () => rentalApi.cancel(rental.id, reason.trim(), refundAmount),
          paid && refundAmount ? `Aluguel cancelado e ${formatBRL(refundAmount)} devolvidos` : "Aluguel cancelado",
        ),
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
        <>
          {rental.status === "picked_up" && (
            <p className="text-xs text-invalid-color/80">
              Este jogo foi retirado. Se ele já voltou, use &quot;Registrar devolução&quot; —
              cancelar libera a cópia imediatamente.
            </p>
          )}
          <Input
            value={reason}
            setValue={(e) => setReason(e.target.value)}
            placeholder="Motivo do cancelamento (obrigatório)"
            label="Motivo"
            multiline
            rows={3}
          />
          {paid && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/20 p-3">
              <span className="text-xs font-semibold text-primary-gold">
                Este aluguel foi pago online. Quanto devolver ao cliente?
              </span>
              {refundCap === 0 ? (
                <p className="text-xs text-primary-gold/60">
                  Não há mais nada a devolver neste pedido.
                </p>
              ) : (
                <>
                  <AmountField
                    label="Valor a devolver"
                    value={refundText}
                    onChange={setRefundText}
                    cap={refundCap}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRefundText(centsToInput(refundCap))}
                      className="h-8 px-3 rounded-full border border-primary-gold/20 text-xs text-primary-gold/70 hover:border-primary-gold/50 cursor-pointer"
                    >
                      Devolver tudo ({formatBRL(refundCap)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundText("0,00")}
                      className="h-8 px-3 rounded-full border border-invalid-color/30 text-xs text-invalid-color/80 hover:bg-invalid-color/10 cursor-pointer"
                    >
                      Cancelar sem reembolso
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </FormCard>
  );
}

/** Botões de ação de uma linha de aluguel + o modal da ação escolhida. */
export default function RentalActions({
  rental,
  order,
}: {
  rental: RentalType & { id: string };
  order?: Order;
}) {
  const [kind, setKind] = useState<ActionKind | null>(null);
  const reserved = rental.status === "reserved";
  const pickedUp = rental.status === "picked_up";
  const awaiting = rental.status === "awaiting_payment";
  const today = todaySP();
  if (!reserved && !pickedUp && !awaiting) return null;

  const gold = `${buttonClass} border-primary-gold/50 bg-primary-gold/10 text-primary-gold hover:bg-primary-gold/20`;
  const neutral = `${buttonClass} border-primary-gold/15 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/40`;
  const danger = `${buttonClass} border-invalid-color/30 text-invalid-color/80 hover:bg-invalid-color/10`;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {awaiting && (
          <>
            <button type="button" className={gold} disabled>
              Registrar retirada
            </button>
            <span className="self-center text-xs text-primary-gold/55">Aguardando pagamento</span>
          </>
        )}
        {reserved && (
          <>
            <button
              type="button"
              className={gold}
              disabled={!canPickUp(rental, today)}
              onClick={() => setKind("pickup")}
            >
              Registrar retirada
            </button>
            {!canPickUp(rental, today) && (
              <span className="self-center text-xs text-primary-gold/55">
                Retirada a partir de {formatDateBR(rental.startDate)}
              </span>
            )}
          </>
        )}
        {pickedUp && (
          <button type="button" className={gold} onClick={() => setKind("return")}>
            Registrar devolução
          </button>
        )}
        {!awaiting && (
          <>
            <button type="button" className={neutral} onClick={() => setKind("dueDate")}>
              Alterar devolução
            </button>
            <button type="button" className={danger} onClick={() => setKind("cancel")}>
              Cancelar
            </button>
          </>
        )}
      </div>
      <Modal isOpen={!!kind} onClose={() => setKind(null)} noPadding isFixed patternCloseButton={false}>
        {kind && <ActionModal rental={rental} order={order} kind={kind} onClose={() => setKind(null)} />}
      </Modal>
    </>
  );
}
