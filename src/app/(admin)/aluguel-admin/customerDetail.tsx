"use client";

import { useEffect, useMemo, useState } from "react";
import { LuBan, LuUser } from "react-icons/lu";
import type { RentalCustomerType, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import { rentalApi } from "@/services/rentalApi";
import { formatCpf } from "@/rental/cpf";
import { formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { STATUS_LABEL, plural, useToday, whatsappLink } from "./rentalShared";

type Rental = RentalType & { id: string };
type Customer = RentalCustomerType & { id: string };

export interface CustomerStats {
  total: number;
  open: number;
  late: number;
}

/** Atrasos = retirados vencidos agora + devolvidos depois do prazo. */
export function customerStats(rentals: Rental[], today: string): CustomerStats {
  return {
    total: rentals.length,
    open: rentals.filter((r) => r.status === "reserved" || r.status === "picked_up").length,
    late: rentals.filter(
      (r) =>
        (r.status === "picked_up" && r.dueDate < today) ||
        (r.status === "returned" &&
          r.returnedAt !== undefined &&
          r.returnedAt.toDate().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) >
            r.dueDate),
    ).length,
  };
}

function sinceText(customer: Customer) {
  const created = customer.createdAt?.toDate?.();
  return created ? `Cliente desde ${created.toLocaleDateString("pt-BR")}` : null;
}

export function CustomerDetail({
  customer,
  rentals,
  stats,
  onClose,
}: {
  customer: Customer;
  rentals: Rental[];
  stats: CustomerStats;
  onClose: VoidFunction;
}) {
  const { addAlert } = useAlert();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const since = sinceText(customer);

  const toggleBlock = async () => {
    if (loading) return;
    const blocked = !customer.isBlocked;
    setLoading(true);
    const result = await rentalApi.setBlocked(customer.id, blocked, blocked ? reason.trim() : undefined);
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    addAlert(blocked ? `${customer.name} foi bloqueado` : `${customer.name} foi desbloqueado`);
    setReason("");
  };

  return (
    <FormCard
      title={customer.name}
      subtitle={customer.isBlocked ? "Bloqueado" : "Cliente de aluguel"}
      icon={<LuUser size={18} />}
      onClose={onClose}
      maxWidth="sm:max-w-[620px]"
      hideFooter
    >
      <div className="flex flex-col gap-0.5 text-xs text-primary-gold/70">
        <span className="break-all">{customer.email}</span>
        <a
          href={whatsappLink(customer.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary-gold w-fit"
        >
          WhatsApp {customer.phone}
        </a>
        <span>CPF {customer.cpf ? formatCpf(customer.cpf) : "não informado"}</span>
        {since && <span>{since}</span>}
        <span>
          {plural(stats.total, "aluguel", "aluguéis")} · {stats.open} em aberto ·{" "}
          {plural(stats.late, "atraso", "atrasos")}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/15 p-3">
        {customer.isBlocked && (
          <span className="text-xs text-invalid-color">
            Bloqueado{customer.blockedReason ? `: ${customer.blockedReason}` : ""}
          </span>
        )}
        {!customer.isBlocked && (
          <Input
            value={reason}
            setValue={(e) => setReason(e.target.value)}
            placeholder="Motivo do bloqueio (obrigatório)"
            label="Motivo"
          />
        )}
        <button
          type="button"
          onClick={toggleBlock}
          disabled={loading || (!customer.isBlocked && !reason.trim())}
          className={`flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            customer.isBlocked
              ? "border-primary-gold/50 bg-primary-gold/10 text-primary-gold"
              : "border-invalid-color/40 text-invalid-color hover:bg-invalid-color/10"
          }`}
        >
          <LuBan size={13} /> {customer.isBlocked ? "Desbloquear" : "Bloquear"}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/40">
          Histórico
        </span>
        {rentals.length === 0 ? (
          <span className="text-xs text-primary-gold/50">Nenhum aluguel.</span>
        ) : (
          rentals.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-primary-gold/10 px-3 py-2 text-xs text-primary-gold/70"
            >
              <span className="font-semibold text-primary-gold">{r.code}</span>
              <span>{r.gameName}</span>
              <span>
                {formatDateBR(r.startDate)} a {formatDateBR(r.dueDate)}
              </span>
              <span className="ml-auto">
                {STATUS_LABEL[r.status]} · {formatBRL(r.price)}
              </span>
            </div>
          ))
        )}
      </div>
    </FormCard>
  );
}

/**
 * Detalhe do cliente aberto a partir de um aluguel. Lê o perfil ao vivo
 * (bloqueio reflete na hora); se o perfil não existir mais, mostra os dados
 * copiados no aluguel.
 */
export function CustomerModal({
  rental,
  rentals,
  onClose,
}: {
  rental: Rental | null;
  /** Todos os aluguéis carregados — o histórico é filtrado por cliente. */
  rentals: Rental[];
  onClose: VoidFunction;
}) {
  const today = useToday();
  const uid = rental?.customerUid ?? null;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCustomer(null);
    setLoaded(false);
    if (!uid) return;
    return RentalCustomerRepository.subscribeToOwn(uid, (c) => {
      setCustomer(c);
      setLoaded(true);
    });
  }, [uid]);

  const history = useMemo(() => rentals.filter((r) => r.customerUid === uid), [rentals, uid]);

  // Perfil apagado: usa o que foi copiado no aluguel.
  const shown: Customer | null =
    customer ??
    (rental && loaded
      ? { id: rental.customerUid, ...rental.customer, cpf: "" }
      : null);

  return (
    <Modal isOpen={!!rental} onClose={onClose} noPadding isFixed patternCloseButton={false}>
      {shown ? (
        <CustomerDetail
          key={shown.id}
          customer={shown}
          rentals={history}
          stats={customerStats(history, today)}
          onClose={onClose}
        />
      ) : (
        <span className="text-xs text-primary-gold/60">Carregando cliente...</span>
      )}
    </Modal>
  );
}
