"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { FiCheckCircle, FiClock, FiInfo, FiXCircle } from "react-icons/fi";
import type { RentalOrderType, RentalType } from "@/types";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import RentalRepository from "@/services/repositories/RentalRepository";
import { rentalApi } from "@/services/rentalApi";
import { checkoutReturnFlag } from "@/rental/checkoutReturn";
import { formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { withNext } from "@/rental/navigation";
import { clearPendingOrder, clearPendingOrderIf } from "@/rental/pendingOrder";
import { formatCountdown, orderPaymentView, type OrderPaymentView } from "@/rental/payments";
import { useRentalCart } from "../../useRentalCart";
import { useRentalCustomer } from "../../useRentalCustomer";
import RentalPageShell from "../../rentalPageShell";
import RentalSteps, { type RentalStep } from "../../rentalSteps";
import { CopyCode, NextSteps } from "../../orderBits";

type Order = RentalOrderType & { id: string };
type Rental = RentalType & { id: string };

const CONFIRM_WAIT_MS = 20_000;
const card = "bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3";
const heading = "text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60";
const smallBtn =
  "h-8 px-3 rounded-full border border-primary-gold/40 text-xs text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";
const mainBtn =
  "h-11 px-4 rounded-xl bg-primary-gold text-primary-black font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";
const ghostBtn =
  "h-11 px-4 rounded-xl border border-primary-gold/40 text-primary-gold text-sm font-semibold hover:bg-primary-gold/10 transition-colors inline-flex items-center justify-center";

function dayMonth(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="w-8 h-8 rounded-full border-2 border-primary-gold/25 border-t-primary-gold animate-spin"
    />
  );
}

interface Banner {
  icon: "ok" | "wait" | "bad" | "info" | "spin";
  title: string;
  text: string;
}

function bannerFor(view: OrderPaymentView, order: Order, confirming: boolean): Banner {
  if (confirming) {
    return {
      icon: "spin",
      title: "Confirmando seu pagamento…",
      text: "Você voltou do Mercado Pago. Isso leva só alguns segundos.",
    };
  }
  switch (view.state) {
    case "counter":
      return {
        icon: "ok",
        title: "Aluguel confirmado!",
        text: "Retire os jogos no balcão do Carcassonne Pub e pague na retirada.",
      };
    case "awaiting":
      return {
        icon: "wait",
        title: "Aguardando seu pagamento",
        text: "Suas cópias estão reservadas. Conclua o pagamento antes que o tempo acabe.",
      };
    case "rejected":
      return {
        icon: "bad",
        title: "Pagamento não aprovado",
        text: `O pagamento foi recusado (por exemplo, cartão recusado) e nada foi cobrado. Tente de novo com outro cartão ou pelo Pix. Sua reserva vale por mais ${formatCountdown(view.msLeft)}.`,
      };
    case "expired":
      return {
        icon: "bad",
        title: "Pagamento expirado",
        text: "O tempo para pagar acabou e as cópias foram liberadas. Se quiser, é só fazer o pedido de novo.",
      };
    case "canceled":
      return { icon: "info", title: "Pedido cancelado", text: "Você cancelou este pedido." };
    case "paid":
      return {
        icon: "ok",
        title: "Pagamento aprovado!",
        text: `Pagamento online via ${view.method === "pix" ? "Pix" : view.method === "card" ? "cartão" : "Mercado Pago"}. Retire os jogos no balcão do Carcassonne Pub na data abaixo.`,
      };
    case "refunded":
    case "partially_refunded": {
      const last = order.payment?.refunds.at(-1)?.at;
      return {
        icon: "info",
        title: view.state === "refunded" ? "Pedido reembolsado" : "Reembolso parcial",
        text: `Reembolso de ${formatBRL(view.amount)} enviado${last ? ` em ${dayMonth(last)}` : ""}. O Pix costuma cair na hora; no cartão, depende da operadora e pode levar algumas faturas.`,
      };
    }
    case "review":
      return {
        icon: "info",
        title: "Cancelamento em análise",
        text: "Recebemos seu pedido de cancelamento; o Carcassonne Pub vai analisar o reembolso.",
      };
  }
}

function OrderContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { orderId } = useParams<{ orderId: string }>();
  const cart = useRentalCart();
  const { user, loading } = useRentalCustomer();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const verified = useRef(false);

  const returned = checkoutReturnFlag(params);
  const uid = user?.uid;

  useEffect(() => {
    if (!loading && !user) {
      const here = `/aluguel/pedido/${encodeURIComponent(orderId)}${window.location.search}`;
      router.replace(withNext("/aluguel/entrar", here));
    }
  }, [loading, user, router, orderId]);

  useEffect(() => {
    if (!uid) return;
    return RentalOrderRepository.subscribe(orderId, setOrder);
  }, [uid, orderId]);

  useEffect(() => {
    if (!uid) return;
    return RentalRepository.subscribeToCustomer(uid, (list) =>
      setRentals(list.filter((r) => r.orderId === orderId)),
    );
  }, [uid, orderId]);

  const view = useMemo(() => (order ? orderPaymentView(order, now) : null), [order, now]);

  // Contagem regressiva de 1 s; para sozinha quando a reserva acaba (a view vira "expired").
  const ticking = view?.state === "awaiting" || view?.state === "rejected";
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  // Voltou aprovado do Mercado Pago e o aviso ainda não chegou.
  const confirming = view?.state === "awaiting" && returned === "approved" && !stalled;
  const waiting = view?.state === "awaiting" && returned === "approved";

  async function verify() {
    setVerifying(true);
    const result = await rentalApi.verifyOrder(orderId);
    setVerifying(false);
    // Se o pagamento foi confirmado, a assinatura em tempo real troca a tela sozinha.
    setVerifyNote(
      result.ok ? null : result.message || "Não foi possível verificar agora. Tente de novo.",
    );
    setStalled(true);
  }

  useEffect(() => {
    if (!waiting || verified.current) return;
    const t = setTimeout(() => {
      verified.current = true;
      void verify();
    }, CONFIRM_WAIT_MS);
    return () => clearTimeout(t);
  }, [waiting, orderId]);

  // Voltar do Mercado Pago pelo histórico restaura a página com os botões travados.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Chegou à página do pedido: o ponteiro guardado no checkout já cumpriu o papel.
  useEffect(() => clearPendingOrderIf(orderId), [orderId]);

  async function pay() {
    if (busy) return;
    setBusy("pay");
    setError(null);
    const result = await rentalApi.reopenCheckout(orderId);
    if (result.ok) {
      window.location.assign(result.data.checkoutUrl);
      return;
    }
    setBusy(null);
    setError(result.message);
  }

  async function cancelOrder() {
    if (busy) return;
    setBusy("cancel");
    setError(null);
    const result = await rentalApi.cancelPendingOrder(orderId);
    setBusy(null);
    setConfirmingCancel(false);
    if (!result.ok) setError(result.message);
  }

  function orderAgain() {
    if (!order) return;
    for (const id of order.gameIds) if (!cart.has(id)) cart.add(id);
    clearPendingOrder();
    router.push("/aluguel/pedido");
  }

  const rentalById = new Map(rentals.map((r) => [r.id, r]));

  let body;
  let step: RentalStep | null = null;
  if (loading || !user || order === undefined) {
    body = <p className="text-sm text-primary-gold/55 text-center">Carregando...</p>;
  } else if (order === null || !view) {
    body = (
      <section className={`${card} items-center text-center py-8`}>
        <FiInfo size={32} className="text-primary-gold/70" />
        <h2 className="font-cinzel text-lg">Pedido não encontrado</h2>
        <p className="text-sm text-primary-gold/70">
          Não encontramos este pedido na sua conta. Confira o link ou veja seus aluguéis.
        </p>
        <Link href="/aluguel/minha-conta" className={mainBtn}>
          Ver meus aluguéis
        </Link>
      </section>
    );
  } else {
    // Retorno recusado com a reserva ainda válida: mostra a tela de recusa já.
    const shown: OrderPaymentView =
      view.state === "awaiting" && returned === "rejected" ? { state: "rejected", msLeft: view.msLeft } : view;
    const banner = bannerFor(shown, order, confirming);
    const Icon = { ok: FiCheckCircle, wait: FiClock, bad: FiXCircle, info: FiInfo, spin: null }[banner.icon];
    const tone =
      banner.icon === "ok" ? "text-emerald-400" : banner.icon === "bad" ? "text-red-300" : "text-primary-gold";
    const open = shown.state === "awaiting" || shown.state === "rejected";
    const canPay = open && !confirming;
    const unconfirmed = stalled && returned === "approved" && shown.state === "awaiting";

    // Etapa e próximos passos (só para pedido confirmado: pago ou no balcão).
    const live = rentals.filter((r) => r.status !== "canceled");
    const confirmed = shown.state === "paid" || shown.state === "counter";
    const pickedUp = live.filter((r) => r.status === "picked_up");
    const allReturned = live.length > 0 && live.every((r) => r.status === "returned");
    const dues = live.map((r) => r.dueDate).sort();
    if (open || confirming) step = "pagamento";
    else if (confirmed) step = allReturned ? "concluido" : pickedUp.length ? "devolucao" : "retirada";
    const payAtCounter = live.reduce((sum, r) => sum + r.price, 0);

    body = (
      <>
        <section
          className={`${card} items-center text-center py-6 ${
            banner.icon === "bad" ? "border-red-400/30" : banner.icon === "ok" ? "border-emerald-400/25" : ""
          }`}
          role="status"
          aria-live="polite"
        >
          {Icon ? <Icon size={44} className={tone} /> : <Spinner />}
          <h2 className="font-cinzel text-xl">{banner.title}</h2>
          <p className="text-sm text-primary-gold/75 break-words max-w-md">{banner.text}</p>
          {shown.state === "awaiting" && !confirming && (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-orange-400/40 bg-orange-500/10 px-5 py-2">
              <span className="text-[11px] uppercase tracking-widest text-orange-200/80">Tempo para pagar</span>
              <span className="font-mono text-3xl tracking-widest text-orange-100">{formatCountdown(shown.msLeft)}</span>
            </div>
          )}
          <CopyCode code={order.code} />
        </section>

        {unconfirmed && (
          <div
            role="status"
            className="flex flex-col gap-2 px-3 py-2.5 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200"
          >
            <p>
              Ainda não recebemos a confirmação do pagamento.
              {verifyNote ? ` ${verifyNote}` : " Se você já pagou, é só aguardar: esta página atualiza sozinha."}
            </p>
            <button type="button" onClick={() => void verify()} disabled={verifying} className={`${smallBtn} self-start`}>
              {verifying ? "Verificando..." : "Verificar de novo"}
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="px-3 py-2 rounded-xl border border-red-400/40 bg-red-500/10 text-sm text-red-200">
            {error}
          </p>
        )}

        {/* Ação principal logo abaixo do aviso */}
        {(canPay || shown.state === "expired" || shown.state === "canceled") && (
          <div className="flex flex-col gap-2">
            {canPay && (
              <button type="button" onClick={pay} disabled={busy !== null} className={mainBtn}>
                {busy === "pay"
                  ? "Abrindo o pagamento..."
                  : shown.state === "rejected"
                    ? `Tentar de novo · ${formatBRL(order.total)}`
                    : `Pagar ${formatBRL(order.total)} agora`}
              </button>
            )}
            {(shown.state === "expired" || shown.state === "canceled") && (
              <button type="button" onClick={orderAgain} className={mainBtn}>
                Fazer o pedido de novo
              </button>
            )}
          </div>
        )}

        {confirmed && !allReturned && live.length > 0 && (
          <NextSteps
            mode={pickedUp.length ? "return" : "pickup"}
            startDate={order.startDate}
            dueDate={dues[0]}
            code={order.code}
            payAtCounter={shown.state === "counter" ? payAtCounter : undefined}
          />
        )}

        <section className={card}>
          <h2 className={heading}>Jogos</h2>
          <ul className="flex flex-col divide-y divide-primary-gold/10">
            {order.items.map((item) => {
              const rental = rentalById.get(item.rentalId);
              const canceled = rental?.status === "canceled";
              return (
                <li key={item.rentalId} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="min-w-0 break-words">
                    <span className={`text-sm ${canceled ? "line-through text-primary-gold/45" : ""}`}>{item.gameName}</span>
                    {rental && (
                      <span className="block text-xs text-primary-gold/55">
                        {canceled
                          ? "Cancelado"
                          : rental.status === "returned"
                            ? "Devolvido"
                            : rental.status === "picked_up"
                              ? `Com você · devolver até ${formatDateBR(rental.dueDate)}`
                              : `Devolução até ${formatDateBR(rental.dueDate)}`}
                      </span>
                    )}
                  </span>
                  <span className={`shrink-0 text-sm ${canceled ? "line-through text-primary-gold/40" : ""}`}>
                    {formatBRL(item.price)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between border-t border-primary-gold/15 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatBRL(order.total)}</span>
          </div>
          <p className="text-xs text-primary-gold/55">
            Retirada a partir de {formatDateBR(order.startDate, true)} ·{" "}
            {order.paymentMode === "online" ? "pagamento online" : "pagamento no balcão, na retirada"}
          </p>
        </section>

        <div className="flex flex-col gap-2">
          {open &&
            (confirmingCancel ? (
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-orange-400/40 bg-orange-500/10">
                <p className="text-sm text-orange-100">
                  Cancelar este pedido? As cópias reservadas serão liberadas e nada será cobrado.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={cancelOrder} disabled={busy !== null} className={smallBtn}>
                    {busy === "cancel" ? "Cancelando..." : "Sim, cancelar"}
                  </button>
                  <button type="button" onClick={() => setConfirmingCancel(false)} disabled={busy !== null} className={smallBtn}>
                    Manter pedido
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                disabled={busy !== null}
                className="self-center text-xs text-primary-gold/55 underline underline-offset-2 hover:text-primary-gold cursor-pointer"
              >
                Cancelar pedido
              </button>
            ))}
          {!open && (
            <Link href="/aluguel/minha-conta" className={ghostBtn}>
              Ver meus aluguéis
            </Link>
          )}
        </div>
      </>
    );
  }

  return (
    <RentalPageShell
      title="Seu pedido"
      cartCount={cart.gameIds.length}
      aside={
        <Link
          href="/aluguel/minha-conta"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-colors bg-primary-black/30"
        >
          <span className="text-sm font-medium">Meus aluguéis</span>
        </Link>
      }
      top={step ? <RentalSteps current={step} online={order?.paymentMode === "online"} /> : null}
    >
      {body}
    </RentalPageShell>
  );
}

export default function PedidoStatusPage() {
  return (
    <Suspense fallback={null}>
      <OrderContent />
    </Suspense>
  );
}
