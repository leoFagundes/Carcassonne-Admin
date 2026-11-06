"use client";

import { useMemo, useState } from "react";
import { LuTrash2 } from "react-icons/lu";
import type { RentalOrderType, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import { useAlert } from "@/contexts/alertProvider";
import { rentalApi } from "@/services/rentalApi";
import { isRentalFinished, rentalDeletionBlock, rentalEndedAt } from "@/rental/deletion";
import { plural } from "./rentalShared";

type Rental = RentalType & { id: string };
type Order = RentalOrderType & { id: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const CHUNK = 200;

const PERIODS = [
  { days: 0, label: "Todos" },
  { days: 30, label: "Há mais de 30 dias" },
  { days: 90, label: "Há mais de 90 dias" },
] as const;

function BulkDeleteForm({
  rentals,
  orderById,
  onClose,
}: {
  rentals: Rental[];
  orderById: Map<string, Order>;
  onClose: VoidFunction;
}) {
  const { addAlert } = useAlert();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);

  const { deletable, blocked } = useMemo(() => {
    const now = Date.now();
    const finished = rentals.filter(
      (r) => isRentalFinished(r) && (days === 0 || rentalEndedAt(r) <= now - days * DAY_MS),
    );
    const ok: Rental[] = [];
    let held = 0;
    for (const r of finished) {
      if (rentalDeletionBlock(r, orderById.get(r.orderId), now)) held++;
      else ok.push(r);
    }
    return { deletable: ok, blocked: held };
  }, [rentals, orderById, days]);

  const submit = async () => {
    if (loading || deletable.length === 0) return;
    setLoading(true);
    let deleted = 0;
    let skipped = 0;
    const ids = deletable.map((r) => r.id);
    for (let i = 0; i < ids.length; i += CHUNK) {
      const result = await rentalApi.deleteRentals(ids.slice(i, i + CHUNK));
      if (!result.ok) {
        setLoading(false);
        addAlert(deleted ? `${plural(deleted, "aluguel excluído", "aluguéis excluídos")}. ${result.message}` : result.message);
        return;
      }
      deleted += result.data.deleted;
      skipped += result.data.skipped.length;
    }
    setLoading(false);
    addAlert(
      skipped
        ? `${plural(deleted, "aluguel excluído", "aluguéis excluídos")}; ${skipped} mudaram de situação e ficaram.`
        : plural(deleted, "aluguel excluído", "aluguéis excluídos"),
    );
    onClose();
  };

  return (
    <FormCard
      title="Excluir aluguéis encerrados"
      subtitle="Devolvidos e cancelados"
      icon={<LuTrash2 size={18} />}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={deletable.length ? `Excluir ${deletable.length} de vez` : "Nada para excluir"}
      submitDisabled={deletable.length === 0}
      loading={loading}
    >
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-primary-gold/70">Encerrados</span>
        <div role="radiogroup" aria-label="Período" className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              role="radio"
              aria-checked={days === p.days}
              onClick={() => setDays(p.days)}
              className={`h-8 px-3 rounded-full border text-xs transition-colors cursor-pointer ${
                days === p.days
                  ? "border-primary-gold/60 bg-primary-gold/15 text-primary-gold font-semibold"
                  : "border-primary-gold/15 text-primary-gold/60 hover:border-primary-gold/40"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm text-primary-gold/70">
        <p>
          {deletable.length
            ? `${plural(deletable.length, "aluguel encerrado vai", "aluguéis encerrados vão")} sair da lista e do histórico dos clientes.`
            : "Nenhum aluguel encerrado neste período."}{" "}
          {deletable.length > 0 && <strong className="text-primary-gold">Não dá para desfazer.</strong>}
        </p>
        <p className="text-xs text-primary-gold/50">
          Aluguéis em andamento nunca entram. Pedidos pagos online continuam registrados no painel do
          Mercado Pago.
        </p>
        {blocked > 0 && (
          <p className="text-xs text-orange-300">
            {plural(blocked, "encerrado fica", "encerrados ficam")} por enquanto: o pedido tem reembolso
            pendente ou um pagamento online que ainda pode ser confirmado.
          </p>
        )}
      </div>
    </FormCard>
  );
}

/** Botão "Excluir encerrados" da aba Aluguéis + o modal de confirmação. */
export default function BulkDelete({
  rentals,
  orderById,
}: {
  rentals: Rental[];
  orderById: Map<string, Order>;
}) {
  const [open, setOpen] = useState(false);
  const hasFinished = rentals.some(isRentalFinished);
  if (!hasFinished) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-end flex items-center gap-1.5 text-xs text-primary-gold/50 hover:text-invalid-color transition-colors cursor-pointer"
      >
        <LuTrash2 size={12} /> Excluir encerrados…
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} noPadding isFixed patternCloseButton={false}>
        {open && <BulkDeleteForm rentals={rentals} orderById={orderById} onClose={() => setOpen(false)} />}
      </Modal>
    </>
  );
}
