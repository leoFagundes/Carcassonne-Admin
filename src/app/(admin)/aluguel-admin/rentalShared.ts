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

/** Agora em ms, atualizado a cada 30 s (contagem regressiva do pagamento e reservas vencidas). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
