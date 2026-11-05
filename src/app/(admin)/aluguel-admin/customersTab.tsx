"use client";

import { useEffect, useMemo, useState } from "react";
import { LuUsers } from "react-icons/lu";
import type { RentalCustomerType, RentalType } from "@/types";
import Modal from "@/components/modal";
import { CatalogEmpty, CatalogSearch } from "@/components/adminCatalog";
import { foldText, searchWords } from "@/components/showcase/search";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import { formatCpf } from "@/rental/cpf";
import { plural, useToday, whatsappLink } from "./rentalShared";
import { CustomerDetail, customerStats } from "./customerDetail";

type Rental = RentalType & { id: string };
type Customer = RentalCustomerType & { id: string };

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

  const statsOf = (id: string) => customerStats(byCustomer.get(id) ?? [], today);

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
                  {plural(s.total, "aluguel", "aluguéis")} · {s.open} em aberto ·{" "}
                  {plural(s.late, "atraso", "atrasos")}
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
