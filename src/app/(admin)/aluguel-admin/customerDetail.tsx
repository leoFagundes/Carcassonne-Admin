"use client";

import { isCheckPending, returnDayOf, returnedLate } from "@/rental/returns";
import { useEffect, useMemo, useState } from "react";
import { LuBan, LuEraser, LuPencil, LuTrash2, LuUser } from "react-icons/lu";
import { FaWhatsapp } from "react-icons/fa";
import type { RentalCustomerType, RentalType } from "@/types";
import Modal from "@/components/modal";
import FormCard from "@/components/formCard";
import Input from "@/components/input";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import { adminApi, rentalApi } from "@/services/rentalApi";
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
        returnedLate(r),
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
      const back = returnDayOf(r);
      const late = returnedLate(r);
      const check = isCheckPending(r) ? " · para conferir" : "";
      return {
        label: back ? `Devolvido ${formatDateBR(back)}${late ? " · com atraso" : ""}${check}` : `Devolvido${check}`,
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
  const [panel, setPanel] = useState<"edit" | "history" | null>(null);
  const [includeActive, setIncludeActive] = useState(false);
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone,
    cpf: customer.cpf ? formatCpf(customer.cpf) : "",
    email: customer.email ?? "",
  });
  const [showAllHistory, setShowAllHistory] = useState(false);
  const since = sinceText(customer);

  const active = rentals
    .filter((r) => ACTIVE_STATUSES.includes(r.status))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const history = rentals.filter((r) => !ACTIVE_STATUSES.includes(r.status));
  const shownHistory = showAllHistory ? history : history.slice(0, 5);
  const spent = rentals.filter((r) => r.status !== "canceled").reduce((sum, r) => sum + r.price, 0);
  // Com aluguel em andamento, excluir exige marcar "incluir os em andamento" (libera as cópias).
  const needsForce = active.length > 0;

  const removeAccount = async () => {
    if (loading || (needsForce && !includeActive)) return;
    setLoading(true);
    const result = await adminApi.deleteAccount(customer.id, includeActive);
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    addAlert(`Conta de ${customer.name} excluída`);
    onClose();
  };

  const clearHistory = async () => {
    if (loading) return;
    setLoading(true);
    const result = await rentalApi.deleteCustomerHistory(customer.id, includeActive);
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    const { deleted, skipped } = result.data;
    addAlert(
      skipped.length
        ? deleted
          ? `${plural(deleted, "aluguel apagado", "aluguéis apagados")}; ${plural(skipped.length, "ficou", "ficaram")}: ${skipped[0].message}`
          : `Nada foi apagado: ${skipped[0].message}`
        : deleted
          ? `${plural(deleted, "aluguel apagado", "aluguéis apagados")} do histórico de ${customer.name}`
          : "Nada para apagar.",
    );
    setPanel(null);
    setIncludeActive(false);
  };

  const saveProfile = async () => {
    if (loading) return;
    setLoading(true);
    const result = await rentalApi.updateCustomer(customer.id, {
      name: form.name,
      phone: form.phone,
      cpf: form.cpf,
      ...(customer.guest ? { email: form.email } : {}),
    });
    setLoading(false);
    if (!result.ok) {
      addAlert(result.message);
      return;
    }
    addAlert(`Cadastro de ${form.name.trim()} atualizado`);
    setPanel(null);
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

      {customer.guest && (
        <p className="rounded-xl border border-primary-gold/15 bg-primary-gold/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-primary-gold/60">
          <strong className="text-primary-gold/80">Cliente sem conta</strong>: cadastrado no balcão. Se criar conta no site
          com o mesmo CPF e WhatsApp, este histórico passa para a conta dele.
        </p>
      )}

      {/* Contato */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="flex flex-col min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-primary-gold/45">E-mail</span>
            <span className="break-all text-primary-gold/85">{customer.email || "não informado"}</span>
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

        {!blocking && !confirmDelete && !panel && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPanel("edit")}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-xs text-primary-gold/70 hover:text-primary-gold hover:border-primary-gold/50 cursor-pointer"
            >
              <LuPencil size={13} /> Editar dados
            </button>
            {!customer.isBlocked && (
              <button
                type="button"
                onClick={() => setBlocking(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-xs text-primary-gold/70 hover:text-invalid-color hover:border-invalid-color/40 cursor-pointer"
              >
                <LuBan size={13} /> Bloquear cliente
              </button>
            )}
            {rentals.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIncludeActive(false);
                  setPanel("history");
                }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-xs text-primary-gold/70 hover:text-invalid-color hover:border-invalid-color/40 cursor-pointer"
              >
                <LuEraser size={13} /> Apagar histórico
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIncludeActive(false);
                setConfirmDelete(true);
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-xs text-primary-gold/70 hover:text-invalid-color hover:border-invalid-color/40 cursor-pointer"
            >
              <LuTrash2 size={13} /> Excluir conta
            </button>
          </div>
        )}

        {panel === "edit" && (
          <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/20 p-3">
            <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
              <Input
                labelSpace
                label="Nome"
                placeholder="Nome completo"
                value={form.name}
                setValue={(e) => setForm({ ...form, name: e.target.value })}
                width="!w-full !max-w-none !min-w-0"
              />
              <Input
                labelSpace
                label="WhatsApp"
                placeholder="WhatsApp com DDD"
                value={form.phone}
                setValue={(e) => setForm({ ...form, phone: e.target.value })}
                width="!w-full !max-w-none !min-w-0"
              />
              <Input
                labelSpace
                label="CPF"
                placeholder="CPF"
                value={form.cpf}
                setValue={(e) => setForm({ ...form, cpf: e.target.value })}
                width="!w-full !max-w-none !min-w-0"
              />
              {customer.guest ? (
                <Input
                  labelSpace
                  label="E-mail (opcional)"
                  placeholder="E-mail (opcional)"
                  value={form.email}
                  setValue={(e) => setForm({ ...form, email: e.target.value })}
                  width="!w-full !max-w-none !min-w-0"
                />
              ) : (
                <p className="mt-2 self-center text-[11px] leading-relaxed text-primary-gold/45">
                  O e-mail é o do login da conta e não muda por aqui.
                </p>
              )}
            </div>
            <p className="text-[11px] text-primary-gold/45">
              Os aluguéis e pedidos deste cliente passam a mostrar os dados novos.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPanel(null)}
                disabled={loading}
                className="flex-1 h-9 rounded-xl border border-primary-gold/20 text-xs text-primary-gold/70 hover:border-primary-gold/50 cursor-pointer disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={loading}
                className="flex-1 h-9 rounded-xl bg-primary-gold text-xs font-semibold text-primary-black hover:bg-primary-gold/90 cursor-pointer disabled:opacity-40"
              >
                {loading ? "Salvando..." : "Salvar dados"}
              </button>
            </div>
          </div>
        )}

        {panel === "history" && (
          <div className="flex flex-col gap-2 rounded-xl border border-invalid-color/30 p-3">
            <p className="text-xs text-primary-gold/70">
              Apaga de vez {plural(history.length, "aluguel encerrado", "aluguéis encerrados")} de {customer.name}. A conta
              e o cadastro continuam. Não dá para desfazer.
            </p>
            {active.length > 0 && (
              <Checkbox
                withoutBackground
                width="!w-full !max-w-none !min-w-0"
                checked={includeActive}
                setChecked={(e) => setIncludeActive(e.target.checked)}
                label={`Incluir também ${plural(active.length, "aluguel em andamento", "aluguéis em andamento")} (as cópias ficam livres)`}
              />
            )}
            <p className="text-[11px] text-primary-gold/45">
              Pedidos com reembolso ou análise em aberto ficam até serem resolvidos. Pagamentos online continuam
              registrados no painel do Mercado Pago.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPanel(null)}
                disabled={loading}
                className="flex-1 h-9 rounded-xl border border-primary-gold/20 text-xs text-primary-gold/70 hover:border-primary-gold/50 cursor-pointer disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={clearHistory}
                disabled={loading || (history.length === 0 && !includeActive)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-invalid-color/90 text-xs font-semibold text-primary-black hover:bg-invalid-color cursor-pointer disabled:opacity-40"
              >
                <LuEraser size={13} /> {loading ? "Apagando..." : "Apagar histórico"}
              </button>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="flex flex-col gap-2 rounded-xl border border-invalid-color/30 p-3">
            <p className="text-xs text-invalid-color">
              Excluir de vez a conta de {customer.name}? Apaga {customer.guest ? "" : "o login, "}o cadastro e o histórico
              de {plural(rentals.length, "aluguel", "aluguéis")}. Não dá para desfazer.
            </p>
            {needsForce && (
              <Checkbox
                withoutBackground
                width="!w-full !max-w-none !min-w-0"
                checked={includeActive}
                setChecked={(e) => setIncludeActive(e.target.checked)}
                label={`Excluir mesmo com ${plural(active.length, "aluguel em andamento", "aluguéis em andamento")} (as cópias ficam livres; confira se os jogos voltaram)`}
              />
            )}
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
                disabled={loading || (needsForce && !includeActive)}
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
