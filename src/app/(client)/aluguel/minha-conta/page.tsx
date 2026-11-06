"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import type { RentalOrderType, RentalSettingsType, RentalType } from "@/types";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import { orderPaymentView } from "@/rental/payments";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { accountApi, rentalApi } from "@/services/rentalApi";
import { diffDays, formatDateBR, todaySP } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { isProfileComplete } from "@/rental/orders";
import { formatCpf, normalizeCpf } from "@/rental/cpf";
import { safeNextPath, withNext } from "@/rental/navigation";
import { useRentalCart } from "../useRentalCart";
import { useRentalCustomer } from "../useRentalCustomer";
import RentalHeader from "../rentalHeader";
import ProfileForm, { maskPhone } from "../profileForm";
import PaymentBadge from "../paymentBadge";

type Rental = RentalType & { id: string };
type Order = RentalOrderType & { id: string };

const card = "bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3";
const heading = "text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60";
const smallBtn =
  "h-8 px-3 rounded-full border border-primary-gold/40 text-xs text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/** "***.***.789-25": só os 5 últimos dígitos aparecem. */
function maskedCpf(cpf: string): string {
  const digits = normalizeCpf(cpf);
  if (digits.length !== 11) return "";
  return `***.***.${formatCpf(digits).slice(8)}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function statusInfo(rental: Rental, today: string): { label: string; detail: string; tone: string } {
  switch (rental.status) {
    case "awaiting_payment":
      return { label: "Aguardando pagamento", detail: "", tone: "text-primary-gold" };
    case "reserved":
      return {
        label: "Reservado",
        detail: `Retirar em ${formatDateBR(rental.startDate)}`,
        tone: "text-primary-gold",
      };
    case "picked_up": {
      const left = diffDays(today, rental.dueDate);
      if (left < 0) {
        return {
          label: "Atrasado",
          detail: `${plural(-left, "dia", "dias")} de atraso`,
          tone: "text-red-300",
        };
      }
      return {
        label: "Retirado",
        detail: `Devolver até ${formatDateBR(rental.dueDate)} · ${
          left === 0 ? "devolver hoje" : `faltam ${plural(left, "dia", "dias")}`
        }`,
        tone: "text-green-400",
      };
    }
    case "returned":
      return { label: "Devolvido", detail: "", tone: "text-primary-gold/60" };
    default:
      return { label: "Cancelado", detail: "", tone: "text-primary-gold/50" };
  }
}

/** Conta do cliente: cadastro, aluguéis agrupados por pedido e cancelamento. */
function MinhaContaContent() {
  const router = useRouter();
  const params = useSearchParams();
  // Quem veio do pedido para completar o cadastro volta para lá ao salvar.
  const nextPath = () => safeNextPath(params.get("next"), window.location.origin);
  const cart = useRentalCart();
  const { user, customer, loading, emailVerified, reloadUser } = useRentalCustomer();
  const [settings, setSettings] = useState<RentalSettingsType | null>(null);
  const [rentals, setRentals] = useState<Rental[] | null>(null);
  const [orderDocs, setOrderDocs] = useState<Order[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<{ id: string; message: string } | null>(null);
  const [today, setToday] = useState(() => todaySP());
  const [editing, setEditing] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ id: string; message: string } | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const uid = user?.uid;

  useEffect(() => RentalConfigRepository.subscribeSettings(setSettings), []);
  useEffect(() => {
    const id = setInterval(() => setToday(todaySP()), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!loading && !user) {
      const next = safeNextPath(params.get("next"), window.location.origin);
      router.replace(withNext("/aluguel/entrar", withNext("/aluguel/minha-conta", next)));
    }
  }, [loading, user, router, params]);
  useEffect(() => {
    if (!uid) return;
    return RentalRepository.subscribeToCustomer(uid, setRentals);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return RentalOrderRepository.subscribeToCustomer(uid, setOrderDocs);
  }, [uid]);

  const orderById = useMemo(() => new Map(orderDocs.map((o) => [o.id, o])), [orderDocs]);
  const anyOpen = orderDocs.some(
    (o) =>
      o.paymentMode === "online" &&
      (o.payment?.status === "pending" || o.payment?.status === "rejected"),
  );
  useEffect(() => {
    if (!anyOpen) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [anyOpen]);

  // Voltar do Mercado Pago pelo histórico restaura a página com o botão travado.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPayingId(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function payNow(orderId: string) {
    if (payingId) return;
    setPayingId(orderId);
    setPayError(null);
    const result = await rentalApi.reopenCheckout(orderId);
    if (result.ok) {
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setPayingId(null);
    setPayError({ id: orderId, message: result.message });
  }

  const orders = useMemo(() => {
    const groups = new Map<string, Rental[]>();
    for (const rental of rentals ?? []) {
      const list = groups.get(rental.orderId) ?? [];
      list.push(rental);
      groups.set(rental.orderId, list);
    }
    return [...groups.values()];
  }, [rentals]);

  async function cancel(rental: Rental) {
    if (cancelingId) return;
    if (!window.confirm(`Cancelar o aluguel de "${rental.gameName}"?`)) return;
    setCancelingId(rental.id);
    setCancelError(null);
    const result = await rentalApi.cancel(rental.id);
    setCancelingId(null);
    if (!result.ok) setCancelError({ id: rental.id, message: result.message });
  }

  async function resend() {
    setVerifyBusy(true);
    const result = await accountApi.sendVerification("aluguel");
    setVerifyMsg(result.ok ? "E-mail de confirmação enviado." : result.message);
    setVerifyBusy(false);
  }

  async function confirmedEmail() {
    setVerifyBusy(true);
    try {
      await reloadUser();
      setVerifyMsg(null);
    } catch {
      setVerifyMsg("Não foi possível verificar agora. Tente novamente.");
    }
    setVerifyBusy(false);
  }

  async function logout() {
    await signOut(auth);
    router.replace("/aluguel");
  }

  // Aberta direto (sem página anterior no histórico), volta para o catálogo.
  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/aluguel");
  }

  const cpfShown = customer ? maskedCpf(customer.cpf ?? "") : "";
  const initial = { name: customer?.name, phone: customer?.phone, cpf: customer?.cpf };

  let body;
  if (loading || !user || !settings) {
    body = <p className="text-sm text-primary-gold/55 text-center">Carregando...</p>;
  } else if (!isProfileComplete(customer, settings.requireCpf)) {
    body = (
      <section className={card}>
        <h2 className={heading}>Complete seu cadastro</h2>
        <p className="text-xs text-primary-gold/70">
          Precisamos de alguns dados para você alugar jogos.
        </p>
        <ProfileForm
          initial={initial}
          requireCpf={settings.requireCpf}
          requireTerms={!customer}
          onSaved={() => {
            // Sem destino, a própria página troca sozinha para a conta quando
            // o perfil salvo chega pelo snapshot.
            const next = nextPath();
            if (next) router.replace(next);
          }}
          submitLabel="Salvar cadastro"
        />
      </section>
    );
  } else {
    body = (
      <>
        {!emailVerified && (
          <div
            role="status"
            className="flex flex-col gap-2 px-3 py-2.5 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200"
          >
            <p className="break-words">
              Confirme seu e-mail para alugar jogos. Enviamos um link de confirmação para{" "}
              {user.email}.
            </p>
            {verifyMsg && <p>{verifyMsg}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={verifyBusy} onClick={resend} className={smallBtn}>
                Reenviar
              </button>
              <button
                type="button"
                disabled={verifyBusy}
                onClick={confirmedEmail}
                className={smallBtn}
              >
                Já confirmei
              </button>
            </div>
          </div>
        )}

        <section className={card}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={heading}>Meus dados</h2>
            {!editing && (
              <button type="button" className={smallBtn} onClick={() => setEditing(true)}>
                Editar
              </button>
            )}
          </div>
          {editing ? (
            <>
              <ProfileForm
                initial={initial}
                requireCpf={settings.requireCpf}
                requireTerms={false}
                onSaved={() => setEditing(false)}
              />
              <button type="button" className={smallBtn} onClick={() => setEditing(false)}>
                Cancelar edição
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-1 text-sm">
              <div className="break-words">{customer?.name}</div>
              <div className="text-primary-gold/75 break-words">{user.email}</div>
              <div className="text-primary-gold/75">{maskPhone(customer?.phone ?? "")}</div>
              {cpfShown && <div className="text-primary-gold/75">CPF {cpfShown}</div>}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={heading}>Meus aluguéis</h2>
          {rentals === null ? (
            <p className="text-sm text-primary-gold/55">Carregando...</p>
          ) : orders.length === 0 ? (
            <div className={`${card} items-center text-center`}>
              <p className="text-sm text-primary-gold/75">Você ainda não alugou nenhum jogo.</p>
              <Link href="/aluguel" className={`${smallBtn} flex items-center`}>
                Escolher jogos
              </Link>
            </div>
          ) : (
            orders.map((order) => {
              const orderId = order[0].orderId;
              const orderDoc = orderById.get(orderId);
              const view = orderDoc ? orderPaymentView(orderDoc, now) : null;
              const awaiting = view?.state === "awaiting" || view?.state === "rejected";
              return (
              <article key={orderId} className={card}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-primary-gold/60">Pedido</span>
                  <span className="font-mono text-lg tracking-widest">{order[0].code}</span>
                </div>
                {view && view.state !== "counter" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <PaymentBadge view={view} />
                    {awaiting && (
                      <button
                        type="button"
                        disabled={payingId !== null}
                        onClick={() => payNow(orderId)}
                        className={smallBtn}
                      >
                        {payingId === orderId ? "Abrindo..." : "Pagar agora"}
                      </button>
                    )}
                  </div>
                )}
                {payError?.id === orderId && (
                  <p role="alert" className="text-xs text-red-300">
                    {payError.message}
                  </p>
                )}
                <ul className="flex flex-col gap-2">
                  {order.map((rental) => {
                    const info =
                      rental.status === "awaiting_payment" && view?.state === "expired"
                        ? { label: "Expirado", detail: "", tone: "text-red-300" }
                        : statusInfo(rental, today);
                    return (
                      <li
                        key={rental.id}
                        className="flex flex-col gap-1 p-2.5 rounded-lg border border-primary-gold/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm min-w-0 break-words">{rental.gameName}</span>
                          <span className="shrink-0 text-xs">{formatBRL(rental.price)}</span>
                        </div>
                        <p className={`text-xs ${info.tone}`}>
                          <span className="font-semibold">{info.label}</span>
                          {info.detail && ` · ${info.detail}`}
                        </p>
                        {rental.status === "reserved" && (
                          <button
                            type="button"
                            disabled={cancelingId !== null}
                            onClick={() => cancel(rental)}
                            className={`${smallBtn} self-start`}
                          >
                            {cancelingId === rental.id ? "Cancelando..." : "Cancelar"}
                          </button>
                        )}
                        {cancelError?.id === rental.id && (
                          <p role="alert" className="text-xs text-red-300">
                            {cancelError.message}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link
                  href={`/aluguel/pedido/${encodeURIComponent(orderId)}`}
                  className="self-start text-xs text-primary-gold underline"
                >
                  Ver pedido
                </Link>
              </article>
              );
            })
          )}
        </section>

        <div className="flex items-center justify-center gap-2">
          <button type="button" onClick={goBack} className={smallBtn}>
            Voltar
          </button>
          <button type="button" onClick={logout} className={smallBtn}>
            Sair da conta
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}</style>
      <div className="relative min-h-screen text-primary-gold flex flex-col pb-14 pt-4 gap-5">
        <RentalHeader cartCount={cart.gameIds.length} />
        <main className="flex flex-col gap-4 w-full max-w-2xl mx-auto px-4">
          <h1 className="font-cinzel text-xl sm:text-3xl text-center tracking-widest uppercase">
            Minha conta
          </h1>
          {body}
        </main>
      </div>
    </>
  );
}

export default function MinhaContaPage() {
  return (
    <Suspense fallback={null}>
      <MinhaContaContent />
    </Suspense>
  );
}
