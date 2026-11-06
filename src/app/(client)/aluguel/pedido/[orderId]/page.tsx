"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiClock, FiInfo, FiXCircle } from "react-icons/fi";
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
import RentalHeader from "../../rentalHeader";

type Order = RentalOrderType & { id: string };
type Rental = RentalType & { id: string };

const CONFIRM_WAIT_MS = 20_000;
const card = "bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3";
const heading = "text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60";
const smallBtn =
  "h-8 px-3 rounded-full border border-primary-gold/40 text-xs text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";
const mainBtn =
  "h-11 px-4 rounded-xl bg-primary-gold text-primary-black font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";

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
    if (!window.confirm("Cancelar este pedido? As cópias reservadas serão liberadas.")) return;
    setBusy("cancel");
    setError(null);
    const result = await rentalApi.cancelPendingOrder(orderId);
    setBusy(null);
    if (!result.ok) setError(result.message);
  }

  function orderAgain() {
    if (!order) return;
    for (const id of order.gameIds) if (!cart.has(id)) cart.add(id);
    clearPendingOrder();
    router.push("/aluguel/pedido");
  }

  const dueByRental = new Map(rentals.map((r) => [r.id, r.dueDate]));

  let body;
  if (loading || !user || order === undefined) {
    body = <p className="text-sm text-primary-gold/55 text-center">Carregando...</p>;
  } else if (order === null || !view) {
    body = (
      <section className={`${card} items-center text-center`}>
        <FiInfo size={32} className="text-primary-gold/70" />
        <h2 className="font-cinzel text-lg">Pedido não encontrado</h2>
        <p className="text-sm text-primary-gold/70">
          Não encontramos este pedido na sua conta. Confira o link ou veja seus aluguéis.
        </p>
        <Link href="/aluguel/minha-conta" className={smallBtn}>
          Ver meus aluguéis
        </Link>
      </section>
    );
  } else {
    // Retorno recusado com a reserva ainda válida: mostra a tela de recusa já.
    const shown: OrderPaymentView =
      view.state === "awaiting" && returned === "rejected"
        ? { state: "rejected", msLeft: view.msLeft }
        : view;
    const banner = bannerFor(shown, order, confirming);
    const Icon = { ok: FiCheckCircle, wait: FiClock, bad: FiXCircle, info: FiInfo, spin: null }[
      banner.icon
    ];
    const tone =
      banner.icon === "ok"
        ? "text-green-400"
        : banner.icon === "bad"
          ? "text-red-300"
          : "text-primary-gold";
    const open = shown.state === "awaiting" || shown.state === "rejected";
    const canPay = open && !confirming;
    const unconfirmed = stalled && returned === "approved" && shown.state === "awaiting";
    body = (
      <>
        <section className={`${card} items-center text-center`} role="status" aria-live="polite">
          {Icon ? <Icon size={36} className={tone} /> : <Spinner />}
          <h2 className="font-cinzel text-lg">{banner.title}</h2>
          <p className="text-sm text-primary-gold/75 break-words">{banner.text}</p>
          {shown.state === "awaiting" && (
            <p className="text-sm text-primary-gold/75">
              Reserva válida por{" "}
              <span className="font-mono text-2xl tracking-widest text-primary-gold block">
                {formatCountdown(shown.msLeft)}
              </span>
            </p>
          )}
          <p className="text-xs text-primary-gold/60">Código do pedido</p>
          <p className="font-mono text-2xl tracking-widest">{order.code}</p>
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
            <button
              type="button"
              onClick={() => void verify()}
              disabled={verifying}
              className={`${smallBtn} self-start`}
            >
              {verifying ? "Verificando..." : "Verificar de novo"}
            </button>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="px-3 py-2 rounded-xl border border-red-400/40 bg-red-500/10 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        <section className={card}>
          <h2 className={heading}>Jogos</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {order.items.map((item) => {
              const due = dueByRental.get(item.rentalId);
              return (
                <li key={item.rentalId} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">
                    {item.gameName}
                    {shown.state === "paid" && due && (
                      <span className="block text-xs text-primary-gold/55">
                        Devolver até {formatDateBR(due, true)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">{formatBRL(item.price)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between border-t border-primary-gold/15 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatBRL(order.total)}</span>
          </div>
          {(shown.state === "paid" || shown.state === "counter" || shown.state === "review") && (
            <p className="text-xs text-primary-gold/70">
              Retirada em {formatDateBR(order.startDate, true)}
            </p>
          )}
        </section>

        <div className="flex flex-col gap-2">
          {canPay && (
            <button type="button" onClick={pay} disabled={busy !== null} className={mainBtn}>
              {busy === "pay"
                ? "Abrindo o pagamento..."
                : shown.state === "rejected"
                  ? "Tentar novamente"
                  : "Pagar agora"}
            </button>
          )}
          {(shown.state === "expired" || shown.state === "canceled") && (
            <button type="button" onClick={orderAgain} className={mainBtn}>
              Fazer o pedido de novo
            </button>
          )}
          {open && (
            <button type="button" onClick={cancelOrder} disabled={busy !== null} className={smallBtn}>
              {busy === "cancel" ? "Cancelando..." : "Cancelar pedido"}
            </button>
          )}
          {!open && shown.state !== "expired" && shown.state !== "canceled" && (
            <Link href="/aluguel/minha-conta" className={smallBtn}>
              Ver meus aluguéis
            </Link>
          )}
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
          <Link
            href="/aluguel/minha-conta"
            className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-colors"
          >
            <FiArrowLeft size={15} />
            <span className="text-sm font-medium">Meus aluguéis</span>
          </Link>
          <h1 className="font-cinzel text-xl sm:text-3xl text-center tracking-widest uppercase">
            Seu pedido
          </h1>
          {body}
        </main>
      </div>
    </>
  );
}

export default function PedidoStatusPage() {
  return (
    <Suspense fallback={null}>
      <OrderContent />
    </Suspense>
  );
}
