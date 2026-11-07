"use client";

import { useEffect, useState } from "react";
import type { RentalStatus } from "@/types";
import { todaySP } from "@/rental/dates";

// Compartilhado pelas abas Aluguéis e Clientes (e pelo detalhe do cliente).

export const STATUS_LABEL: Record<RentalStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  reserved: "Reservado",
  picked_up: "Retirado",
  returned: "Devolvido",
  canceled: "Cancelado",
};

/** Hoje (fuso de São Paulo), recalculado a cada minuto. */
export function useToday() {
  const [today, setToday] = useState(() => todaySP());
  useEffect(() => {
    const id = setInterval(() => setToday(todaySP()), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

export function whatsappLink(phone: string) {
  return `https://wa.me/55${phone.replace(/\D/g, "")}`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "06/11 às 14:32" (fuso de São Paulo); sem data → "". */
export function formatStamp(stamp?: { toMillis?: () => number } | null): string {
  const ms = stamp?.toMillis?.();
  if (ms === undefined) return "";
  const d = new Date(ms);
  const date = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}

/** Agora em ms, atualizado a cada 30 s (contagem regressiva do pagamento e reservas vencidas). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
