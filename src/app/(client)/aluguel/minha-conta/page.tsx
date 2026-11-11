"use client";

import { returnDayOf } from "@/rental/returns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import type { RentalOrderType, RentalSettingsType, RentalType } from "@/types";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import {
  cancelPreview,
  formatCountdown,
  orderPaymentView,
  type CancelOutcome,
  type CancelPreview,
} from "@/rental/payments";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { accountApi, rentalApi } from "@/services/rentalApi";
import { diffDays, formatDateBR, todaySP } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { isProfileComplete } from "@/rental/orders";
import { counterPaymentText } from "@/rental/adminOrders";
import { formatCpf, normalizeCpf } from "@/rental/cpf";
import { safeNextPath, withNext } from "@/rental/navigation";
import { useRentalCart } from "../useRentalCart";
import { useRentalCustomer } from "../useRentalCustomer";
import RentalPageShell from "../rentalPageShell";
import HelpWhatsapp from "../helpWhatsapp";
import ProfileForm, { maskPhone } from "../profileForm";
import PaymentBadge from "../paymentBadge";
import { STAGE_ORDER, orderHeadline, type OrderStage } from "@/rental/myAccount";

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

/** O que o cliente recebe se cancelar (spec §4.3), antes de confirmar. */
function cancelPreviewText(preview: CancelPreview): string {
  switch (preview.kind) {
    case "none":
      return "A cópia será liberada para outros clientes.";
    case "review":
      return "Seu cancelamento vai para análise do Carcassonne Pub, que decide o reembolso.";
    case "refund":
      if (preview.amount === 0) return "Este pedido não tem mais valor a devolver.";
      return preview.feePercent
        ? `Você vai receber ${formatBRL(preview.amount)} de volta (taxa de cancelamento de ${preview.feePercent}%).`
        : `Você vai receber ${formatBRL(preview.amount)} de volta.`;
  }
}

function cancelDoneText(outcome: CancelOutcome): string {
  switch (outcome.kind) {
    case "refunded":
      return `Reembolso de ${formatBRL(outcome.amount)} solicitado. Pix: na hora · cartão: conforme a operadora.`;
    case "review":
      return "Cancelamento enviado para análise. Avisaremos por e-mail se houver reembolso.";
    case "canceled":
      return "Aluguel cancelado.";
  }
}

/** Cor do cartão do pedido conforme o que falta fazer. */
const STAGE_TONE: Record<OrderStage, { box: string; title: string }> = {
  pay: { box: "border-orange-400/45 bg-orange-500/[0.07]", title: "text-orange-200" },
  late: { box: "border-red-400/50 bg-red-500/[0.07]", title: "text-red-300" },
  with_you: { box: "border-sky-300/35 bg-sky-400/[0.05]", title: "text-sky-200" },
  pickup: { box: "border-primary-gold/40 bg-primary-gold/[0.05]", title: "text-primary-gold" },
  done: { box: "border-primary-gold/15 bg-secondary-black/60", title: "text-primary-gold/70" },
};

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
    case "returned": {
      const day = returnDayOf(rental);
      return { label: "Devolvido", detail: day ? `em ${formatDateBR(day)}` : "", tone: "text-primary-gold/60" };
    }
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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState<{ id: string; message: string } | null>(null);
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

  function askCancel(rental: Rental) {
    if (cancelingId) return;
    setCancelError(null);
    setCancelDone(null);
    setConfirmingId(rental.id);
  }

  async function confirmCancel(rental: Rental) {
    if (cancelingId) return;
    setCancelingId(rental.id);
    setCancelError(null);
    const result = await rentalApi.cancelAsCustomer(rental.id);
    setCancelingId(null);
    if (!result.ok) {
      setCancelError({ id: rental.id, message: result.message });
      return;
    }
    setConfirmingId(null);
    setCancelDone({ id: rental.id, message: cancelDoneText(result.data) });
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
    const firstName = (customer?.name ?? "").trim().split(/\s+/)[0];
    const groups = orders.map((list) => {
      const orderId = list[0].orderId;
      const orderDoc = orderById.get(orderId);
      const view = orderDoc ? orderPaymentView(orderDoc, now) : null;
      return { orderId, list, orderDoc, view, headline: orderHeadline(list, view?.state ?? null, today) };
    });
    const active = groups
      .filter((g) => g.headline.stage !== "done")
      .sort(
        (a, b) =>
          STAGE_ORDER[a.headline.stage] - STAGE_ORDER[b.headline.stage] ||
          (a.list[0].startDate < b.list[0].startDate ? -1 : 1),
      );
    const history = groups
      .filter((g) => g.headline.stage === "done")
      .sort((a, b) => (a.list[0].startDate > b.list[0].startDate ? -1 : 1));

    body = (
      <>
        {firstName && <p className="-mt-2 text-center text-sm text-primary-gold/60">Olá, {firstName}!</p>}

        {!emailVerified && (
          <div
            role="status"
            className="flex flex-col gap-2 px-3 py-2.5 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200"
          >
            <p className="break-words">
              Confirme seu e-mail para alugar jogos. Enviamos um link de confirmação para {user.email}.
            </p>
            {verifyMsg && <p>{verifyMsg}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={verifyBusy} onClick={resend} className={smallBtn}>
                Reenviar
              </button>
              <button type="button" disabled={verifyBusy} onClick={confirmedEmail} className={smallBtn}>
                Já confirmei
              </button>
            </div>
          </div>
        )}

        {/* ── Em andamento: o que fazer agora ── */}
        <section className="flex flex-col gap-3">
          <h2 className={heading}>Em andamento</h2>
          {rentals === null ? (
            <p className="text-sm text-primary-gold/55">Carregando...</p>
          ) : active.length === 0 ? (
            <div className={`${card} items-center text-center`}>
              <p className="text-sm text-primary-gold/75">Nenhum aluguel em andamento.</p>
              <Link
                href="/aluguel"
                className="h-10 px-5 rounded-full bg-primary-gold text-primary-black text-sm font-semibold flex items-center"
              >
                Escolher jogos
              </Link>
            </div>
          ) : (
            active.map(({ orderId, list, orderDoc, view, headline }) => {
              const tone = STAGE_TONE[headline.stage];
              const total = list.filter((r) => r.status !== "canceled").reduce((sum, r) => sum + r.price, 0);
              const mixed = new Set(list.map((r) => r.status)).size > 1;
              const counter = !orderDoc || orderDoc.paymentMode !== "online";
              return (
                <article key={orderId} className={`rounded-xl border p-4 flex flex-col gap-3 ${tone.box}`}>
                  {/* Manchete: o que fazer agora */}
                  <div className="flex flex-col gap-1">
                    <span className={`text-base font-semibold ${tone.title}`}>{headline.title}</span>
                    <p className="text-sm text-primary-gold/80">{headline.detail}</p>
                  </div>

                  {headline.stage === "pay" && (view?.state === "awaiting" || view?.state === "rejected") && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        disabled={payingId !== null}
                        onClick={() =>
                          orderDoc?.payment?.pix?.qrCode
                            ? router.push(`/aluguel/pedido/${encodeURIComponent(orderId)}`)
                            : payNow(orderId)
                        }
                        className="h-11 rounded-xl bg-primary-gold text-primary-black text-sm font-semibold cursor-pointer disabled:opacity-60"
                      >
                        {payingId === orderId
                          ? "Abrindo o pagamento..."
                          : orderDoc?.payment?.pix?.qrCode
                            ? `Ver o Pix · ${formatBRL(total)}`
                            : `Pagar ${formatBRL(total)} agora`}
                      </button>
                      <span className="text-center text-xs text-orange-200">
                        Tempo restante: {formatCountdown(view.msLeft)}
                      </span>
                    </div>
                  )}
                  {payError?.id === orderId && (
                    <p role="alert" className="text-xs text-red-300">
                      {payError.message}
                    </p>
                  )}

                  {/* Jogos do pedido */}
                  <ul className="flex flex-col divide-y divide-primary-gold/10 rounded-lg border border-primary-gold/10 bg-primary-black/30">
                    {list.map((rental) => {
                      const info = statusInfo(rental, today);
                      const canceled = rental.status === "canceled";
                      return (
                        <li key={rental.id} className="flex flex-col gap-1.5 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-sm min-w-0 break-words ${canceled ? "line-through text-primary-gold/45" : ""}`}>
                              {rental.gameName}
                            </span>
                            <span className={`shrink-0 text-xs ${canceled ? "line-through text-primary-gold/40" : "text-primary-gold/70"}`}>
                              {!canceled && rental.listPrice !== undefined && rental.listPrice > rental.price && (
                                <span className="mr-1 text-[10px] text-primary-gold/40 line-through">
                                  {formatBRL(rental.listPrice)}
                                </span>
                              )}
                              {formatBRL(rental.price)}
                            </span>
                          </div>
                          {mixed && <span className={`text-[11px] ${info.tone}`}>{info.label}</span>}

                          {rental.status === "reserved" && confirmingId !== rental.id && (
                            <button
                              type="button"
                              disabled={cancelingId !== null}
                              onClick={() => askCancel(rental)}
                              className="self-start text-[11px] text-primary-gold/50 underline underline-offset-2 hover:text-primary-gold cursor-pointer disabled:opacity-50"
                            >
                              Cancelar este jogo
                            </button>
                          )}
                          {rental.status === "reserved" && confirmingId === rental.id && (
                            <div
                              role="group"
                              aria-label={`Confirmar o cancelamento de ${rental.gameName}`}
                              className="flex flex-col gap-2 p-2.5 rounded-lg border border-orange-400/40 bg-orange-500/10"
                            >
                              <p className="text-xs font-semibold text-orange-200 break-words">
                                Cancelar o aluguel de &ldquo;{rental.gameName}&rdquo;?
                              </p>
                              <p className="text-xs text-orange-100/90">
                                {cancelPreviewText(cancelPreview(orderDoc, rental.id, settings.onlinePayment))}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={cancelingId !== null}
                                  onClick={() => confirmCancel(rental)}
                                  className={smallBtn}
                                >
                                  {cancelingId === rental.id ? "Cancelando..." : "Sim, cancelar"}
                                </button>
                                <button
                                  type="button"
                                  disabled={cancelingId !== null}
                                  onClick={() => {
                                    setConfirmingId(null);
                                    setCancelError(null);
                                  }}
                                  className={smallBtn}
                                >
                                  Manter aluguel
                                </button>
                              </div>
                            </div>
                          )}
                          {cancelError?.id === rental.id && (
                            <p role="alert" className="text-xs text-red-300">
                              {cancelError.message}
                            </p>
                          )}
                          {cancelDone?.id === rental.id && (
                            <p role="status" className="text-xs text-emerald-300">
                              {cancelDone.message}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Rodapé: pagamento e detalhes */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-primary-gold/60">
                    {counter ? (
                      <span>
                        {(orderDoc && counterPaymentText(orderDoc)) ?? "Pagamento no balcão, na retirada"} ·{" "}
                        {formatBRL(total)}
                      </span>
                    ) : (
                      view && headline.stage !== "pay" && <PaymentBadge view={view} />
                    )}
                    <Link
                      href={`/aluguel/pedido/${encodeURIComponent(orderId)}`}
                      className="ml-auto underline underline-offset-2 hover:text-primary-gold"
                    >
                      Pedido {list[0].code} · ver detalhes
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* ── Histórico (recolhido) ── */}
        {history.length > 0 && (
          <details className="group rounded-xl border border-primary-gold/15 bg-secondary-black/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
              <span className={heading}>Histórico</span>
              <span className="text-xs text-primary-gold/50">
                {plural(history.length, "pedido", "pedidos")}
                <span className="ml-1.5 inline-block transition-transform group-open:rotate-180">▾</span>
              </span>
            </summary>
            <ul className="flex flex-col divide-y divide-primary-gold/10 border-t border-primary-gold/10">
              {history.map(({ orderId, list, view, headline }) => (
                <li key={orderId}>
                  <Link
                    href={`/aluguel/pedido/${encodeURIComponent(orderId)}`}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-primary-gold/[0.04] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm min-w-0 break-words text-primary-gold/85">
                        {list.map((r) => r.gameName).join(", ")}
                      </span>
                      <span className="shrink-0 text-xs text-primary-gold/50">{formatDateBR(list[0].startDate)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-primary-gold/55">
                      <span>{headline.title}</span>
                      {view && view.state !== "counter" && view.state !== "expired" && view.state !== "canceled" && (
                        <PaymentBadge view={view} />
                      )}
                      <span className="ml-auto font-mono">{list[0].code}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* ── Meus dados ── */}
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
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["Nome", customer?.name],
                ["E-mail", user.email],
                ["WhatsApp", maskPhone(customer?.phone ?? "")],
                ...(cpfShown ? [["CPF", cpfShown]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col min-w-0">
                  <dt className="text-[10px] uppercase tracking-wider text-primary-gold/45">{label}</dt>
                  <dd className="break-words text-primary-gold/85">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <div className="flex items-center justify-center gap-2">
          {/* Link fixo: o histórico pode apontar para o Mercado Pago ou para um pedido. */}
          <Link href="/aluguel" className={`${smallBtn} flex items-center`}>
            Voltar aos jogos
          </Link>
          <button type="button" onClick={logout} className={smallBtn}>
            Sair da conta
          </button>
        </div>
      </>
    );
  }

  return (
    <RentalPageShell title="Minha conta" cartCount={cart.gameIds.length}>
      {body}
      <HelpWhatsapp />
    </RentalPageShell>
  );
}

export default function MinhaContaPage() {
  return (
    <Suspense fallback={null}>
      <MinhaContaContent />
    </Suspense>
  );
}
