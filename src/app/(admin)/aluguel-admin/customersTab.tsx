"use client";

import { useEffect, useMemo, useState } from "react";
import { LuBan, LuUser, LuUsers } from "react-icons/lu";
import type { RentalCustomerType, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import { CatalogEmpty, CatalogSearch } from "@/components/adminCatalog";
import { foldText, searchWords } from "@/components/showcase/search";
import { useAlert } from "@/contexts/alertProvider";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import { rentalApi } from "@/services/rentalApi";
import { formatCpf } from "@/rental/cpf";
import { formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { STATUS_LABEL, useToday, whatsappLink } from "./rentalsTab";

type Rental = RentalType & { id: string };
type Customer = RentalCustomerType & { id: string };

interface Stats {
  total: number;
  open: number;
  late: number;
}

function CustomerDetail({
  customer,
  rentals,
  stats,
  onClose,
}: {
  customer: Customer;
  rentals: Rental[];
  stats: Stats;
  onClose: VoidFunction;
}) {
  const { addAlert } = useAlert();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

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
        <span>{customer.email}</span>
        <a
          href={whatsappLink(customer.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-primary-gold w-fit"
        >
          WhatsApp {customer.phone}
        </a>
        <span>CPF {formatCpf(customer.cpf)}</span>
        <span>
          {stats.total} aluguéis · {stats.open} em aberto · {stats.late} atrasos
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

export default function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const today = useToday();

  useEffect(() => {
    const unsubCustomers = RentalCustomerRepository.subscribeToAll((list) => {
      setCustomers(list);
      setLoading(false);
    });
    const unsubRentals = RentalRepository.subscribeToAll(setRentals);
    return () => {
      unsubCustomers();
      unsubRentals();
    };
  }, []);

  const byCustomer = useMemo(() => {
    const map = new Map<string, Rental[]>();
    for (const r of rentals) map.set(r.customerUid, [...(map.get(r.customerUid) ?? []), r]);
    return map;
  }, [rentals]);

  const statsOf = (id: string): Stats => {
    const list = byCustomer.get(id) ?? [];
    return {
      total: list.length,
      open: list.filter((r) => r.status === "reserved" || r.status === "picked_up").length,
      late: list.filter(
        (r) =>
          (r.status === "picked_up" && r.dueDate < today) ||
          (r.status === "returned" &&
            r.returnedAt !== undefined &&
            r.returnedAt.toDate().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) >
              r.dueDate),
      ).length,
    };
  };

  const words = useMemo(() => searchWords(search), [search]);
  const filtered = customers.filter((c) => {
    if (!words.length) return true;
    const text = foldText(`${c.name} ${c.email} ${c.phone} ${c.cpf}`);
    return words.every((w) => text.includes(w));
  });
  const open = customers.find((c) => c.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto">
      <div className="rounded-2xl border border-primary-gold/15 bg-secondary-black/50 p-3 sm:p-4">
        <CatalogSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail, WhatsApp ou CPF"
        />
      </div>

      {loading ? (
        <span className="text-xs text-primary-gold/50 px-1">Carregando clientes...</span>
      ) : filtered.length === 0 ? (
        <CatalogEmpty
          icon={LuUsers}
          title={customers.length ? "Nenhum cliente com essa busca." : "Nenhum cliente ainda."}
          onClear={search ? () => setSearch("") : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const s = statsOf(c.id);
            return (
              <article
                key={c.id}
                onClick={() => setOpenId(c.id)}
                className="flex flex-col gap-1 rounded-xl border border-primary-gold/15 bg-secondary-black/50 p-3 cursor-pointer hover:border-primary-gold/45 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold text-primary-gold">{c.name}</span>
                  {c.isBlocked && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-invalid-color/50 text-invalid-color">
                      Bloqueado
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-5 text-xs text-primary-gold/65">
                  <span className="break-all">{c.email}</span>
                  <a
                    href={whatsappLink(c.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="underline underline-offset-2 hover:text-primary-gold w-fit"
                  >
                    {c.phone}
                  </a>
                  <span>{formatCpf(c.cpf)}</span>
                </div>
                <span className="text-[11px] text-primary-gold/50">
                  {s.total} aluguéis · {s.open} em aberto · {s.late} atrasos
                </span>
              </article>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!open} onClose={() => setOpenId(null)} noPadding isFixed patternCloseButton={false}>
        {open && (
          <CustomerDetail
            key={open.id}
            customer={open}
            rentals={byCustomer.get(open.id) ?? []}
            stats={statsOf(open.id)}
            onClose={() => setOpenId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
