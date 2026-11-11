"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FaWhatsapp } from "react-icons/fa";
import { LuCheck, LuCopy, LuLoader, LuQrCode, LuTriangleAlert, LuX } from "react-icons/lu";
import type { RentalOrderType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import { rentalApi } from "@/services/rentalApi";
import { formatBRL } from "@/rental/money";
import { formatCountdown, orderPaymentView } from "@/rental/payments";
import { todaySP } from "@/rental/dates";

type Order = RentalOrderType & { id: string };

/** Relógio de 1 s só enquanto o pagamento está aberto (contagem regressiva). */
function useSecondTick(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const waLink = (phone: string, text: string) =>
  `https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/**
 * Cobrança do balcão pelo Mercado Pago: QR Code na tela (Pix direto ou link
 * do checkout), copiar / mandar no WhatsApp e o status ao vivo — quando o
 * pagamento cai, vira "Pago" sozinho e oferece registrar a retirada.
 */
export default function CounterPaymentPanel({
  orderId,
  initial,
  compact = false,
}: {
  orderId: string;
  /** Pedido já conhecido (evita a tela vazia até a primeira leitura). */
  initial?: Order;
  /** Dentro do detalhe do pedido: QR recolhido até pedir para mostrar. */
  compact?: boolean;
}) {
  const { addAlert } = useAlert();
  const [order, setOrder] = useState<Order | null>(initial ?? null);
  const [showQr, setShowQr] = useState(!compact);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"abort" | "pickup" | null>(null);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [pickedUp, setPickedUp] = useState(false);
  // Regra "só avisar": cópia ainda sem conferir pede confirmação antes de entregar.
  const [checkWarning, setCheckWarning] = useState<{ ids: string[]; message: string } | null>(null);

  useEffect(() => RentalOrderRepository.subscribe(orderId, (o) => o && setOrder(o)), [orderId]);

  const p = order?.payment;
  const open = !!order && !!p && (p.status === "pending" || p.status === "rejected");
  const now = useSecondTick(open);
  useEffect(() => {
    if (!confirmAbort) return;
    const t = setTimeout(() => setConfirmAbort(false), 4000);
    return () => clearTimeout(t);
  }, [confirmAbort]);

  if (!order || !p) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-xs text-primary-gold/50">
        <LuLoader className="animate-spin" size={14} /> Carregando pagamento...
      </div>
    );
  }

  const view = orderPaymentView(order, now);
  const pix = p.channel === "pix" && p.pix?.qrCode ? p.pix.qrCode : null;
  const target = pix ?? p.checkoutUrl;
  const awaiting = view.state === "awaiting" || view.state === "rejected";
  const paid = view.state === "paid";
  const canPickupToday = paid && order.startDate <= todaySP() && !pickedUp;

  const copy = async () => {
    if (!target) return;
    if (await copyText(target)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      addAlert("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };

  const abort = async () => {
    if (!confirmAbort) return setConfirmAbort(true);
    setBusy("abort");
    const r = await rentalApi.abortOrder(order.id);
    setBusy(null);
    setConfirmAbort(false);
    if (!r.ok) addAlert(r.message);
  };

  const pickupAll = async (ids: string[] = order.rentalIds, ignorePendingCheck = false) => {
    setBusy("pickup");
    const results = await Promise.all(ids.map((id) => rentalApi.pickup(id, ignorePendingCheck)));
    setBusy(null);
    const warned = ids.filter((_, i) => {
      const r = results[i];
      return !r.ok && r.code === "pending_check_warn";
    });
    const failed = results.find((r) => !r.ok && r.code !== "pending_check_warn");
    if (failed && !failed.ok) addAlert(failed.message);
    if (warned.length > 0) {
      const first = results[ids.indexOf(warned[0])];
      setCheckWarning({ ids: warned, message: !first.ok ? first.message : "" });
    } else {
      setCheckWarning(null);
      if (!failed) setPickedUp(true);
    }
  };

  const message = pix
    ? `Pix copia e cola do aluguel no Carcassonne Pub (pedido ${order.code}, ${formatBRL(order.total)}):\n\n${pix}`
    : `Olá! Este é o link para pagar o aluguel no Carcassonne Pub (pedido ${order.code}, ${formatBRL(order.total)}):\n${p.checkoutUrl}`;

  const btn =
    "flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-3">
      {/* Status ao vivo */}
      {paid ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-3">
          <LuCheck className="mt-0.5 shrink-0 text-emerald-300" size={18} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-300">Pagamento aprovado</p>
            <p className="text-[11px] leading-relaxed text-emerald-200/70">
              {formatBRL(order.total)}
              {view.method === "pix" ? " via Pix" : view.method === "card" ? " no cartão" : ""}. Os jogos estão reservados.
              {pickedUp && " Retirada registrada."}
            </p>
          </div>
        </div>
      ) : awaiting ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary-gold/25 bg-primary-gold/[0.05] p-3">
          <LuLoader className="mt-0.5 shrink-0 animate-spin text-primary-gold/70" size={16} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary-gold">
              {view.state === "rejected" ? "Pagamento recusado. O cliente pode tentar de novo" : "Aguardando o pagamento"}
            </p>
            <p className="text-[11px] leading-relaxed text-primary-gold/55">
              {formatBRL(order.total)} · expira em <strong>{formatCountdown(view.msLeft)}</strong>. Esta tela atualiza
              sozinha quando o pagamento cair.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary-gold/15 bg-primary-black/30 p-3">
          <LuX className="mt-0.5 shrink-0 text-primary-gold/50" size={16} />
          <p className="text-xs leading-relaxed text-primary-gold/60">
            {view.state === "canceled" || p.closedBy === "customer" || (p.status === "expired" && p.holdUntil > now)
              ? "Pedido cancelado antes do pagamento. As cópias foram liberadas."
              : view.state === "expired"
                ? "O tempo para pagar acabou e as cópias foram liberadas. Crie um novo aluguel se o cliente ainda quiser."
                : "Este pedido não está mais aguardando pagamento."}
          </p>
        </div>
      )}

      {/* QR Code */}
      {awaiting && target && (
        <>
          {compact && !showQr ? (
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className={`${btn} border-primary-gold/25 text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold`}
            >
              <LuQrCode size={14} /> Mostrar QR Code para o cliente
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-primary-gold/15 bg-primary-black/30 p-4">
              <div className="rounded-xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                <QRCodeSVG value={target} size={208} level="M" marginSize={0} bgColor="#ffffff" fgColor="#111111" />
              </div>
              <p className="max-w-[320px] text-center text-[11px] leading-relaxed text-primary-gold/60">
                {pix
                  ? "Peça para o cliente abrir o app do banco, escolher Pix → Ler QR Code e apontar para a tela."
                  : "O cliente aponta a câmera do celular para o QR e paga na página do Mercado Pago, com Pix ou cartão."}
              </p>
              {pix && (
                <code className="block w-full max-h-16 overflow-y-auto break-all rounded-lg border border-primary-gold/10 bg-primary-black/50 px-2.5 py-2 text-[10px] leading-relaxed text-primary-gold/55 select-all">
                  {pix}
                </code>
              )}
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={copy}
                  className={`${btn} border-primary-gold/25 text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold`}
                >
                  {copied ? <LuCheck size={14} /> : <LuCopy size={14} />}
                  {copied ? "Copiado!" : pix ? "Copiar Pix copia e cola" : "Copiar link"}
                </button>
                <a
                  href={waLink(order.customer.phone, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btn} border-emerald-400/30 text-emerald-300/90 hover:border-emerald-400/60 hover:text-emerald-300`}
                >
                  <FaWhatsapp size={14} /> Mandar no WhatsApp
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Ações */}
      {awaiting && (
        <button
          type="button"
          onClick={abort}
          disabled={busy !== null}
          className={`${btn} ${
            confirmAbort
              ? "border-invalid-color/60 text-invalid-color"
              : "border-primary-gold/15 text-primary-gold/50 hover:border-invalid-color/40 hover:text-invalid-color"
          }`}
        >
          {confirmAbort ? <LuTriangleAlert size={14} /> : <LuX size={14} />}
          {busy === "abort"
            ? "Cancelando..."
            : confirmAbort
              ? "Clique de novo para cancelar o pedido"
              : "Cliente desistiu: cancelar pedido"}
        </button>
      )}
      {canPickupToday && checkWarning && (
        <div className="flex flex-col gap-2 rounded-xl border border-orange-400/35 bg-orange-400/[0.06] p-3">
          <p className="text-xs leading-relaxed text-orange-200">{checkWarning.message}</p>
          <button
            type="button"
            onClick={() => pickupAll(checkWarning.ids, true)}
            disabled={busy !== null}
            className={`${btn} border-orange-400/50 text-orange-200 hover:bg-orange-400/10`}
          >
            {busy === "pickup" ? "Registrando..." : "Entregar mesmo assim"}
          </button>
        </div>
      )}
      {canPickupToday && !checkWarning && (
        <button
          type="button"
          onClick={() => pickupAll()}
          disabled={busy !== null}
          className={`${btn} border-primary-gold bg-primary-gold text-primary-black font-semibold hover:bg-primary-gold/90`}
        >
          {busy === "pickup" ? "Registrando..." : "Cliente já está levando: registrar retirada"}
        </button>
      )}
    </div>
  );
}
