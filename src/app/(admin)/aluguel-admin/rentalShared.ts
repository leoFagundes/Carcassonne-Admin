"use client";

import { useEffect, useState } from "react";
import type { RentalStatus } from "@/types";
import { todaySP } from "@/rental/dates";

// Compartilhado pelas abas Aluguéis e Clientes (e pelo detalhe do cliente).

export const STATUS_LABEL: Record<RentalStatus, string> = {
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
