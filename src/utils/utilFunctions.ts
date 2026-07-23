/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Icons from "lucide-react";
import {
  subDays,
  addDays,
  startOfDay,
  isBefore,
  isAfter,
  isToday,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type BookingDate = { day: string; month: string; year: string };

export const truncateText = (text: string, maxLength: number): string => {
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

export const generateRandomNumber = (
  minNumber: number = 0,
  maxNumber: number,
): number => {
  return Math.floor(Math.random() * (maxNumber - minNumber + 1)) + minNumber;
};

export function highlightMatch(text: string, search: string = "") {
  if (!search) return text;
  const safeSearch = escapeRegExp(search);
  const regex = new RegExp(`(${safeSearch})`, "gi");
  return text.replace(regex, `<span class='text-secondary-gold'>$1</span>`);

  function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export function randomCodeGenerator(tamanho: number = 6) {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < tamanho; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres[indice];
  }
  return codigo;
}

export const openWhatsApp = (rawPhone: string) => {
  const cleanedPhone = rawPhone.replace(/\D/g, "");
  const url = `https://wa.me/${cleanedPhone}`;
  window.open(url, "_blank");
};

export const openEmail = (
  email: string,
  subjectProps: string,
  bodyProps: string,
) => {
  const subject = encodeURIComponent(subjectProps);
  const body = encodeURIComponent(bodyProps);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

  window.open(gmailUrl, "_blank");
};

export function normalizeIconName(name: string) {
  if (!name) return "";

  const cleaned = name.replace(/^Lucide/, "");

  // se já parece camelCase/PascalCase → NÃO mexe
  if (/^[A-Z][a-zA-Z]+$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export function getLucideIcon(name: string) {
  if (!name) return null;

  const cleaned = name.replace(/^Lucide/, "");

  const normalized = normalizeIconName(cleaned);

  return (
    (Icons as Record<string, any>)[cleaned] ||
    (Icons as Record<string, any>)[normalized] ||
    null
  );
}

export const iconNames = Object.keys(Icons);

export function bookingDateToDate(bookingDate: BookingDate): Date {
  return new Date(
    Number(bookingDate.year),
    Number(bookingDate.month) - 1,
    Number(bookingDate.day),
  );
}

export function formatBookingDate(bookingDate: BookingDate): string {
  const day = String(bookingDate.day).padStart(2, "0");
  const month = String(bookingDate.month).padStart(2, "0");
  return `${day}/${month}/${bookingDate.year}`;
}

export function formatBookingWeekday(bookingDate: BookingDate): string {
  return format(bookingDateToDate(bookingDate), "EEE", { locale: ptBR });
}

// Data de corte da "janela recente" (padrão: hoje - 7 dias).
export function getRecentWindowCutoff(daysBack: number = 7): Date {
  return startOfDay(subDays(new Date(), daysBack));
}

export function isWithinRecentWindow(
  bookingDate: BookingDate,
  daysBack: number = 7,
): boolean {
  return !isBefore(bookingDateToDate(bookingDate), getRecentWindowCutoff(daysBack));
}

export function isBookingToday(bookingDate: BookingDate): boolean {
  return isToday(bookingDateToDate(bookingDate));
}

// Hoje ou antes — usado para pendências de pagamento (dia futuro ainda não
// aconteceu, então não é "pendente", é só ainda não vencido).
export function isBookingUpToToday(bookingDate: BookingDate): boolean {
  return !isAfter(bookingDateToDate(bookingDate), startOfDay(new Date()));
}

// Janela de "hoje até daqui `days` dias" (inclusiva nas duas pontas).
export function isBookingWithinNextDays(
  bookingDate: BookingDate,
  days: number = 7,
): boolean {
  const target = bookingDateToDate(bookingDate);
  const start = startOfDay(new Date());
  const end = addDays(start, days - 1);
  return !isBefore(target, start) && !isAfter(target, end);
}
