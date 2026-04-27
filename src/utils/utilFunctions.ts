/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Icons from "lucide-react";

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
  const caracteres =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
