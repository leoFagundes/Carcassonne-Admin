"use client";

import { useEffect, useMemo, useState } from "react";
import { LuBan, LuTrash2, LuUser } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import type { RentalCustomerType, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import { useAlert } from "@/contexts/alertProvider";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import { adminApi, rentalApi } from "@/services/rentalApi";
import { customerDeletionBlock } from "@/rental/deletion";
import { formatCpf } from "@/rental/cpf";
import { diffDays, formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { plural, useToday, whatsappLink } from "./rentalShared";

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
    open: rentals.filter((r) => r.status === "awaiting_payment" || r.status === "reserved" || r.status === "picked_up").length,
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

/** Situação de um aluguel, com cor, para o histórico do cliente. */
function situation(r: Rental, today: string): { label: string; tone: string } {
  switch (r.status) {
    case "awaiting_payment":
      return { label: "Aguardando pagamento", tone: "text-orange-300 border-orange-400/40" };
    case "reserved":
      return r.startDate < today
        ? { label: `Não retirado · desde ${formatDateBR(r.startDate)}`, tone: "text-orange-300 border-orange-400/40" }
        : { label: `Reservado · retira ${formatDateBR(r.startDate)}`, tone: "text-primary-gold border-primary-gold/40" };
    case "picked_up": {
      if (r.dueDate < today) {
        return {
          label: `Atrasado ${plural(diffDays(r.dueDate, today), "dia", "dias")}`,
          tone: "text-invalid-color border-invalid-color/50",
        };
      }
      const left = diffDays(today, r.dueDate);
      return {
        label: left === 0 ? "Com o cliente · devolve hoje" : `Com o cliente · devolve ${formatDateBR(r.dueDate)}`,
        tone: "text-sky-300 border-sky-300/40",
      };
    }
    case "returned": {
      const back = r.returnedAt?.toDate?.().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
      const late = back !== undefined && back > r.dueDate;
      return {
        label: back ? `Devolvido ${formatDateBR(back)}${late ? " · com atraso" : ""}` : "Devolvido",
        tone: late ? "text-orange-300 border-orange-400/30" : "text-emerald-300 border-emerald-400/30",
      };
    }
    case "canceled":
      return { label: "Cancelado", tone: "text-primary-gold/50 border-primary-gold/15" };
  }
}

const ACTIVE_STATUSES: RentalType["status"][] = ["awaiting_payment", "reserved", "picked_up"];

function RentalLine({ rental, today }: { rental: Rental; today: string }) {
  const s = situation(rental, today);
  const canceled = rental.status === "canceled";
  return (
    <li className="flex flex-col gap-1 rounded-lg border border-primary-gold/10 bg-primary-black/30 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm min-w-0 break-words ${canceled ? "line-through text-primary-gold/45" : "text-primary-gold"}`}>
          {rental.gameName}
        </span>
        <span className={`shrink-0 text-xs ${canceled ? "line-through text-primary-gold/40" : "text-primary-gold/75"}`}>
          {formatBRL(rental.price)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-primary-gold/55">
        <span className={`px-1.5 py-0.5 rounded-md border font-semibold ${s.tone}`}>{s.label}</span>
        <span>
          {formatDateBR(rental.startDate)} → {formatDateBR(rental.dueDate)}
        </span>
        <span className="ml-auto font-mono">{rental.code}</span>
      </div>
    </li>
  );
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
  const today = useToday();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const since = sinceText(customer);
  // Pedidos com dinheiro em aberto o servidor confere; aqui já avisa dos aluguéis em andamento.
  const deleteBlock = customerDeletionBlock(rentals, [], Date.now());

  const active = rentals
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const history = rentals.filter((r) => !ACTIVE_STATUSES.includes(r.status));
  const shownHistory = showAllHistory ? history : history.slice(0, 5);
  const spent = rentals.filter((r) => r.status !== "canceled").reduce((sum, r) => sum + r.price, 0);

  const removeAccount = async () => {
    if (loading) return;
    setLoading(true);
    const result = await adminApi.deleteAccount(customer.id);
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    addAlert(`Conta de ${customer.name} excluída`);
    onClose();
  };

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
    setBlocking(false);
  };

  const sectionTitle = "text-[10px] font-semibold uppercase tracking-widest text-primary-gold/50";

  return (
    <FormCard
      title={customer.name}
      subtitle={since ?? "Cliente de aluguel"}
      icon={<LuUser size={18} />}
      onClose={onClose}
      maxWidth="sm:max-w-[620px]"
      hideFooter
    >
      {customer.isBlocked && (
        <div className="flex items-start gap-2 rounded-xl border border-invalid-color/40 bg-invalid-color/10 px-3 py-2.5 text-xs text-invalid-color">
          <LuBan size={14} className="shrink-0 mt-0.5" />
          <span>
            <strong>Bloqueado</strong> — não consegue fazer novos pedidos
            {customer.blockedReason ? `. Motivo: ${customer.blockedReason}` : "."}
          </span>
        </div>
      )}

      {/* Contato */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-primary-gold/45">E-mail</span>
            <span className="break-all text-primary-gold/85">{customer.email}</span>
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-primary-gold/45">CPF</span>
            <span className="text-primary-gold/85">{customer.cpf ? formatCpf(customer.cpf) : "não informado"}</span>
          </span>
        </div>
        <a
          href={whatsappLink(customer.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 h-9 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
        >
          <FaWhatsapp size={15} /> Conversar no WhatsApp · {customer.phone}
        </a>
      </div>

      {/* Números */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Aluguéis", value: String(stats.total), tone: "text-primary-gold" },
          { label: "Em andamento", value: String(active.length), tone: active.length ? "text-sky-300" : "text-primary-gold" },
          { label: "Atrasos", value: String(stats.late), tone: stats.late ? "text-invalid-color" : "text-primary-gold" },
          { label: "Total gasto", value: formatBRL(spent), tone: "text-primary-gold" },
        ].map((t) => (
          <div key={t.label} className="flex flex-col gap-0.5 rounded-lg border border-primary-gold/15 bg-primary-black/30 px-2.5 py-2">
            <span className="text-[10px] uppercase tracking-wider text-primary-gold/45">{t.label}</span>
            <span className={`text-base font-semibold ${t.tone}`}>{t.value}</span>
          </div>
        ))}
      </div>

      {/* Em andamento */}
      <div className="flex flex-col gap-1.5">
        <span className={sectionTitle}>Em andamento ({active.length})</span>
        {active.length === 0 ? (
          <span className="text-xs text-primary-gold/50">Nada em andamento agora.</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {active.map((r) => (
              <RentalLine key={r.id} rental={r} today={today} />
            ))}
          </ul>
        )}
      </div>

      {/* Histórico */}
      <div className="flex flex-col gap-1.5">
        <span className={sectionTitle}>Histórico ({history.length})</span>
        {history.length === 0 ? (
          <span className="text-xs text-primary-gold/50">Nenhum aluguel encerrado ainda.</span>
        ) : (
          <>
            <ul className="flex flex-col gap-1.5">
              {shownHistory.map((r) => (
                <RentalLine key={r.id} rental={r} today={today} />
              ))}
            </ul>
            {history.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="self-start text-xs text-primary-gold/60 underline underline-offset-2 hover:text-primary-gold cursor-pointer"
              >
                {showAllHistory ? "Mostrar menos" : `Ver todos (${history.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Ações da conta */}
      <div className="flex flex-col gap-2 pt-2 border-t border-primary-gold/10">
        <span className={sectionTitle}>Conta</span>

        {customer.isBlocked ? (
          <button
            type="button"
            onClick={toggleBlock}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl border border-primary-gold/50 bg-primary-gold/10 text-xs font-semibold text-primary-gold cursor-pointer disabled:opacity-40"
          >
            <LuBan size={13} /> Desbloquear
          </button>
        ) : blocking ? (
          <div className="flex flex-col gap-2 rounded-xl border border-invalid-color/30 p-3">
            <p className="text-xs text-primary-gold/65">
              Cliente bloqueado não consegue fazer novos pedidos. Os aluguéis que já existem continuam.
            </p>
            <Input
              labelSpace
              value={reason}
              setValue={(e) => setReason(e.target.value)}
              placeholder="Motivo do bloqueio (obrigatório)"
              label="Motivo"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBlocking(false)}
                className="flex-1 h-9 rounded-xl border border-primary-gold/20 text-xs text-primary-gold/70 hover:border-primary-gold/50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={toggleBlock}
                disabled={loading || !reason.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-invalid-color/40 text-xs font-semibold text-invalid-color hover:bg-invalid-color/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <LuBan size={13} /> Bloquear
              </button>
            </div>
          </div>
        ) : null}

        {!blocking && !confirmDelete && (
          <div className="flex flex-wrap gap-2">
            {!customer.isBlocked && (
              <button
                type="button"
                onClick={() => setBlocking(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-xs text-primary-gold/70 hover:text-invalid-color hover:border-invalid-color/40 cursor-pointer"
              >
                <LuBan size={13} /> Bloquear cliente
              </button>
            )}
            <button
              type="button"
              onClick={() => (deleteBlock ? addAlert(deleteBlock) : setConfirmDelete(true))}
              title={deleteBlock ?? undefined}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-xs text-primary-gold/70 hover:text-invalid-color hover:border-invalid-color/40 cursor-pointer"
            >
              <LuTrash2 size={13} /> Excluir conta
            </button>
          </div>
        )}

        {confirmDelete && (
          <div className="flex flex-col gap-2 rounded-xl border border-invalid-color/30 p-3">
            <p className="text-xs text-invalid-color">
              Excluir de vez a conta de {customer.name}? Apaga o login, o cadastro e o histórico de{" "}
              {plural(rentals.length, "aluguel", "aluguéis")}. Não dá para desfazer.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={loading}
                className="flex-1 h-9 px-4 rounded-xl border border-primary-gold/20 text-xs text-primary-gold/70 hover:border-primary-gold/50 cursor-pointer disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={removeAccount}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-invalid-color/90 text-xs font-semibold text-primary-black hover:bg-invalid-color cursor-pointer disabled:opacity-40"
              >
                <LuTrash2 size={13} /> {loading ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
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
