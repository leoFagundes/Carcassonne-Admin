"use client";

import Button from "@/components/button";
import Input from "@/components/input";
import Loader from "@/components/loader";
import { useAlert } from "@/contexts/alertProvider";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { ReserveType } from "@/types";
import { normalizeReserveCode } from "@/utils/utilFunctions";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LuCalendar,
  LuCheck,
  LuClock,
  LuRefreshCw,
  LuWifiOff,
  LuX,
} from "react-icons/lu";
import { FiSkipBack } from "react-icons/fi";

// Códigos antigos têm 6 caracteres e os novos 8 — antes disso nem vale buscar.
const MIN_CODE_LENGTH = 6;

type Lookup =
  | { status: "idle" }
  | { status: "searching" }
  | { status: "found"; reserve: ReserveType & { id: string } }
  | { status: "notFound" }
  | { status: "error" };

export default function CancelReserve() {
  const [code, setCode] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [retryCount, setRetryCount] = useState(0);
  const [canceling, setCanceling] = useState(false);
  const lookupIdRef = useRef(0);

  const { addAlert } = useAlert();
  const router = useRouter();

  const normalizedCode = normalizeReserveCode(code);

  // Busca a reserva enquanto o cliente digita (esperando ele parar um
  // instante). Só a busca mais recente pode atualizar a tela.
  useEffect(() => {
    const lookupId = ++lookupIdRef.current;
    if (normalizedCode.length < MIN_CODE_LENGTH) {
      setLookup({ status: "idle" });
      return;
    }
    setLookup({ status: "searching" });
    const timeout = setTimeout(async () => {
      try {
        const found = await ReserveRepository.findByCode(normalizedCode);
        if (lookupId !== lookupIdRef.current) return;
        setLookup(
          found ? { status: "found", reserve: found } : { status: "notFound" }
        );
      } catch (error) {
        console.error(error);
        if (lookupId !== lookupIdRef.current) return;
        setLookup({ status: "error" });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [normalizedCode, retryCount]);

  const canCancel =
    lookup.status === "found" && lookup.reserve.status === "confirmed";

  async function handleCancelReserve() {
    if (canceling || !canCancel) return;

    setCanceling(true);
    try {
      // Confere de novo direto no banco — a reserva mostrada na tela pode
      // estar desatualizada (ex: já cancelada pelo admin nesse meio tempo).
      let fresh: (ReserveType & { id: string }) | null;
      try {
        fresh = await ReserveRepository.findByCode(normalizedCode);
      } catch (error) {
        console.error(error);
        addAlert(
          "Não foi possível verificar sua reserva agora. Confira sua conexão e tente novamente."
        );
        return;
      }

      if (!fresh) {
        setLookup({ status: "notFound" });
        addAlert("Nenhuma reserva encontrada com esse código.");
        return;
      }
      if (fresh.status === "canceled") {
        setLookup({ status: "found", reserve: fresh });
        addAlert("Essa reserva já está cancelada.");
        return;
      }

      const canceledReason = cancelReason.trim();
      // Só os campos que mudam — nunca espalhar a reserva inteira aqui.
      const ok = await ReserveRepository.update(fresh.id, {
        status: "canceled",
        canceledAt: new Date().toISOString(),
        canceledBy: "user",
        ...(canceledReason ? { canceledReason } : {}),
      });

      // ReserveRepository.update não lança erro: retorna false quando a
      // escrita falha (permissão, rede instável...).
      if (!ok) {
        addAlert(
          "Não foi possível cancelar a reserva agora. Confira sua conexão e tente novamente, ou fale conosco pelo WhatsApp."
        );
        return;
      }

      setLookup({ status: "found", reserve: { ...fresh, status: "canceled" } });
      setCancelReason("");
      addAlert("Reserva cancelada com sucesso.");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        @keyframes shimmer-gold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s linear infinite;
        }
        .hex-bg-cancel {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34zm0 0l28 16v34l-28 16L0 116V82z' fill='none' stroke='%23e6c56b' stroke-opacity='0.03' stroke-width='1'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="relative w-full min-h-screen flex flex-col items-center justify-center text-primary-gold px-4 py-10">
        <div className="hex-bg-cancel fixed inset-0 pointer-events-none z-0" />
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(230,197,107,0.06) 0%, transparent 70%)",
          }}
        />

        <button
          onClick={() => router.push("/reserve")}
          className="absolute top-4 left-4 flex items-center gap-1.5 z-10 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-all duration-200 backdrop-blur-sm bg-primary-black/30"
        >
          <FiSkipBack size={15} />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-[400px]">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 w-full">
            <h1 className="font-cinzel text-xl sm:text-2xl text-center text-shimmer-gold tracking-widest uppercase">
              Cancelar Reserva
            </h1>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
              <svg width="7" height="7" viewBox="0 0 10 10" className="text-primary-gold/50 shrink-0">
                <polygon points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5" fill="currentColor" />
              </svg>
              <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-primary-gold/50 whitespace-nowrap">
                Carcassonne Pub
              </span>
              <svg width="7" height="7" viewBox="0 0 10 10" className="text-primary-gold/50 shrink-0">
                <polygon points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5" fill="currentColor" />
              </svg>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
            </div>
          </div>

          {/* Card */}
          <div className="w-full bg-secondary-black/60 border border-primary-gold/20 rounded-xl p-6 flex flex-col gap-5">
            <p className="text-center text-xs text-primary-gold/60 leading-relaxed">
              Digite o código da reserva que você recebeu por e-mail.{" "}
              <span className="text-primary-gold/40">Ex: h4kw9tmz</span>
            </p>

            <Input
              label="Código da reserva"
              placeholder="Código da reserva"
              value={code}
              setValue={(e) => setCode(e.target.value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />

            {lookup.status === "searching" && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-primary-gold/50">
                <Loader /> Buscando reserva...
              </div>
            )}

            {lookup.status === "notFound" && (
              <p className="text-sm text-primary-gold/50 text-center">
                Nenhuma reserva encontrada com esse código. Confira se digitou
                igual ao do e-mail.
              </p>
            )}

            {lookup.status === "error" && (
              <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-invalid-color/30 bg-invalid-color/5 text-center">
                <span className="flex items-center gap-2 text-sm text-invalid-color">
                  <LuWifiOff size={16} className="shrink-0" />
                  Não conseguimos consultar sua reserva agora.
                </span>
                <span className="text-xs text-primary-gold/50">
                  Confira sua conexão com a internet e tente de novo.
                </span>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="flex items-center gap-1.5 mt-1 px-3.5 py-2 rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 text-xs font-medium transition-all cursor-pointer"
                >
                  <LuRefreshCw size={13} /> Tentar novamente
                </button>
              </div>
            )}

            {lookup.status === "found" && (
              <div className="flex flex-col gap-2.5 p-4 border border-primary-gold/20 rounded-xl bg-primary-black/30">
                <span className="font-mono text-sm font-semibold tracking-[0.15em] text-primary-gold/80">
                  {lookup.reserve.code.toLowerCase()}
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <LuCalendar size={16} className="min-w-[16px] text-primary-gold/60" />
                  Reserva de {lookup.reserve.name}
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <LuClock size={16} className="min-w-[16px] text-primary-gold/60" />
                  {lookup.reserve.bookingDate.day}/
                  {lookup.reserve.bookingDate.month}/
                  {lookup.reserve.bookingDate.year} — {lookup.reserve.time}h
                </span>
                <div className="pt-1">
                  {lookup.reserve.status === "canceled" ? (
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-invalid-color/40 bg-invalid-color/10 text-invalid-color w-fit">
                      <LuX size={12} /> Reserva Cancelada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-primary-gold/40 bg-primary-gold/10 text-primary-gold w-fit">
                      <LuCheck size={12} /> Reserva Ativa
                    </span>
                  )}
                </div>

                {/* Motivo — só para reservas ativas */}
                {lookup.reserve.status === "confirmed" && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="text-xs text-primary-gold/50">
                      Motivo do cancelamento{" "}
                      <span className="text-primary-gold/30">(opcional)</span>
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Ex: Não poderei comparecer..."
                      rows={2}
                      className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/40 text-primary-gold text-sm px-3 py-2 resize-none placeholder:text-primary-gold/25 focus:outline-none focus:border-primary-gold/50 transition-all"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleCancelReserve}
                disabled={canceling || !canCancel}
              >
                {canceling ? <Loader /> : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
