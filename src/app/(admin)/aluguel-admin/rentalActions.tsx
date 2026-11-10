"use client";

import { useState } from "react";
import {
  LuCalendarClock,
  LuPackageCheck,
  LuPackageOpen,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import type {
  RentalOrderType,
  RentalReturnCondition,
  RentalType,
} from "@/types";
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
import { isRentalFinished, rentalDeletionBlock } from "@/rental/deletion";
import { AmountField, centsToInput } from "./refundForms";
import { STATUS_LABEL } from "./rentalShared";

type Order = RentalOrderType & { id: string };
type ActionKind = "pickup" | "return" | "dueDate" | "cancel" | "delete";

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
    ? Math.min(
        rentalPrice(order, rental.id),
        refundableLeft(order, `${order.id}:${rental.id}:cancel`),
      )
    : 0;
  // Reembolso deste cancelamento em andamento ou sem confirmação: o servidor só aceita o mesmo valor.
  const resumed = paid
    ? order?.payment?.pendingRefunds?.find(
        (p) => p.key === `${order.id}:${rental.id}:cancel`,
      )
    : undefined;
  // null = o admin ainda não mexeu: segue o padrão, mesmo se o pedido carregar depois.
  const [refundEdit, setRefundText] = useState<string | null>(null);
  const refundText = resumed
    ? centsToInput(resumed.amount)
    : (refundEdit ?? centsToInput(refundCap));
  const refundCents = parseBRL(refundText);
  const refundValid =
    !paid ||
    !!resumed ||
    refundCap === 0 ||
    (refundCents !== null && refundCents <= refundCap);
  const refundAmount = !paid
    ? undefined
    : resumed
      ? resumed.amount
      : refundCap === 0
        ? 0
        : (refundCents ?? 0);

  const run = async (
    request: () => Promise<ApiResult<unknown>>,
    success: string,
  ) => {
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

  // Exclusão (forçada: o admin pode apagar até o que está em andamento).
  // Reembolso/análise em aberto segura aqui; pedido online não pago o servidor
  // confere no Mercado Pago na hora.
  const deleteBlock =
    kind === "delete" ? rentalDeletionBlock(rental, order, Date.now(), { force: true, skipUnpaidGrace: true }) : null;
  const deletingActive = !isRentalFinished(rental);
  const removeRental = async () => {
    if (loading) return;
    setLoading(true);
    const result = await rentalApi.deleteRentals([rental.id], true);
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    if (result.data.deleted === 0) {
      addAlert(
        result.data.skipped[0]?.message ??
          "Não foi possível excluir este aluguel.",
      );
      return;
    }
    addAlert(`Aluguel ${rental.code} excluído`);
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
      submit: () =>
        run(() => rentalApi.pickup(rental.id), "Retirada registrada"),
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
        run(
          () => rentalApi.changeDueDate(rental.id, dueDate),
          "Data de devolução alterada",
        ),
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
      submit: () =>
        run(
          () => rentalApi.cancel(rental.id, reason.trim(), refundAmount),
          paid && refundAmount
            ? `Aluguel cancelado e ${formatBRL(refundAmount)} devolvidos`
            : "Aluguel cancelado",
        ),
    },
    delete: {
      title: "Excluir aluguel",
      icon: <LuTrash2 size={18} />,
      disabled: !!deleteBlock,
      submitLabel: "Excluir de vez",
      submit: removeRental,
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
          <div
            role="radiogroup"
            aria-label="Estado do jogo"
            className="flex flex-wrap gap-1.5"
          >
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
            labelSpace
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
            labelSpace
            type="date"
            min={rental.startDate}
            value={dueDate}
            setValue={(e) => setDueDate(e.target.value)}
            placeholder="Nova data de devolução"
            label="Nova data de devolução"
          />
        </>
      )}

      {kind === "delete" &&
        (deleteBlock ? (
          <p className="text-sm text-orange-300">{deleteBlock}</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-primary-gold/70">
            {deletingActive && (
              <p className="rounded-lg border border-orange-300/30 bg-orange-300/[0.06] px-3 py-2 text-xs text-orange-200">
                Este aluguel ainda está em andamento ({STATUS_LABEL[rental.status].toLowerCase()}). Excluir libera a cópia
                na hora
                {rental.status === "picked_up" ? ": confira se o jogo já voltou para o pub" : ""}. Se a ideia é só
                desistir, prefira Cancelar, que fica registrado.
              </p>
            )}
            <p>
              O aluguel de {rental.gameName} para {rental.customer.name} sai da
              lista e do histórico do cliente.{" "}
              <strong className="text-primary-gold">
                Não dá para desfazer.
              </strong>
            </p>
            {order && order.rentalIds.length > 1 && (
              <p className="text-xs text-primary-gold/50">
                Os outros jogos do pedido {order.code} continuam. O pedido só é
                apagado junto com o último deles.
              </p>
            )}
            {order?.paymentMode === "online" && (
              <p className="text-xs text-primary-gold/50">
                O registro do pagamento continua no painel do Mercado Pago.
              </p>
            )}
          </div>
        ))}

      {kind === "cancel" && (
        <>
          {rental.status === "picked_up" && (
            <p className="text-xs text-invalid-color/80">
              Este jogo foi retirado. Se ele já voltou, use &quot;Registrar
              devolução&quot; — cancelar libera a cópia imediatamente.
            </p>
          )}
          <Input
            labelSpace
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
              {resumed ? (
                <p className="text-xs text-orange-300">
                  Há um reembolso de {formatBRL(resumed.amount)} sem confirmação
                  deste aluguel — use &quot;Tentar de novo&quot; no detalhe do
                  pedido, ou confirme aqui com o mesmo valor (o reembolso não
                  sai em dobro). Não dá para cancelar sem reembolso nem mudar o
                  valor enquanto ele não for concluído.
                </p>
              ) : refundCap === 0 ? (
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
  compact = false,
}: {
  rental: RentalType & { id: string };
  order?: Order;
  /** Só a ação principal do dia — usado na agenda de hoje. */
  compact?: boolean;
}) {
  const [kind, setKind] = useState<ActionKind | null>(null);

  const reserved = rental.status === "reserved";
  const pickedUp = rental.status === "picked_up";
  const awaiting = rental.status === "awaiting_payment";
  const today = todaySP();
  const finished = isRentalFinished(rental);
  const pickupAvailable = reserved && canPickUp(rental, today);

  if (!reserved && !pickedUp && !awaiting && !finished) return null;

  const primary = `${buttonClass} border-primary-gold/50 bg-primary-gold/10 text-primary-gold hover:border-primary-gold/70 hover:bg-primary-gold/20 disabled:cursor-not-allowed disabled:opacity-40`;
  const secondary = `${buttonClass} border-primary-gold/15 bg-transparent text-primary-gold/60 hover:border-primary-gold/35 hover:bg-primary-gold/5 hover:text-primary-gold`;
  const danger = `${buttonClass} border-invalid-color/25 bg-transparent text-invalid-color/75 hover:border-invalid-color/40 hover:bg-invalid-color/10 hover:text-invalid-color`;

  const modal = (
    <Modal
      isOpen={!!kind}
      onClose={() => setKind(null)}
      noPadding
      isFixed
      patternCloseButton={false}
    >
      {kind && (
        <ActionModal
          rental={rental}
          order={order}
          kind={kind}
          onClose={() => setKind(null)}
        />
      )}
    </Modal>
  );

  if (compact) {
    const action: ActionKind | null = pickedUp
      ? "return"
      : pickupAvailable
        ? "pickup"
        : null;

    if (!action) return null;

    return (
      <>
        <button
          type="button"
          className={`${primary} shrink-0 whitespace-nowrap`}
          onClick={() => setKind(action)}
        >
          {action === "pickup" ? "Registrar retirada" : "Registrar devolução"}
        </button>

        {modal}
      </>
    );
  }

  if (finished) {
    return (
      <>
        <button
          type="button"
          aria-label="Excluir aluguel"
          title="Excluir aluguel"
          onClick={() => setKind("delete")}
          className="inline-flex items-center justify-center rounded-lg border border-transparent p-1.5 text-primary-gold/35 transition-colors hover:border-invalid-color/15 hover:bg-invalid-color/10 hover:text-invalid-color"
        >
          <LuTrash2 size={14} />
        </button>

        {modal}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {awaiting && (
            <>
              <button type="button" className={primary} disabled>
                Registrar retirada
              </button>

              <span className="text-[11px] text-primary-gold/45">
                Aguardando pagamento
              </span>
            </>
          )}

          {reserved && (
            <>
              <button
                type="button"
                className={primary}
                disabled={!pickupAvailable}
                onClick={() => setKind("pickup")}
              >
                Registrar retirada
              </button>

              {!pickupAvailable && (
                <span className="text-[11px] text-primary-gold/45">
                  Disponível em {formatDateBR(rental.startDate)}
                </span>
              )}
            </>
          )}

          {pickedUp && (
            <button
              type="button"
              className={primary}
              onClick={() => setKind("return")}
            >
              Registrar devolução
            </button>
          )}
        </div>

        {!awaiting && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={secondary}
              onClick={() => setKind("dueDate")}
            >
              Alterar devolução
            </button>

            <button
              type="button"
              className={danger}
              onClick={() => setKind("cancel")}
            >
              Cancelar
            </button>

            <button
              type="button"
              aria-label="Excluir aluguel"
              title="Excluir aluguel"
              onClick={() => setKind("delete")}
              className="inline-flex items-center justify-center rounded-lg border border-transparent p-1.5 text-primary-gold/35 transition-colors hover:border-invalid-color/15 hover:bg-invalid-color/10 hover:text-invalid-color"
            >
              <LuTrash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {modal}
    </>
  );
}
