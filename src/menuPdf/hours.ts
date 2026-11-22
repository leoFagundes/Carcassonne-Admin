/**
 * Horário de funcionamento em poucas linhas, para o verso do PDF: dias
 * seguidos com o mesmo horário viram um grupo ("Terça a quinta · 18h às 0h").
 * A semana começa na segunda.
 */
import type { OpeningHours } from "@/types";
import { formatHour, WEEKDAYS } from "@/utils/generalSettings";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function hoursLines(hours: (OpeningHours | null)[]): { days: string; time: string }[] {
  if (!hours?.some(Boolean)) return [];
  const keyOf = (d: number) => {
    const h = hours[d];
    return h ? `${h.open}-${h.close}` : "fechado";
  };
  const groups: { days: number[]; key: string }[] = [];
  for (const d of ORDER) {
    const key = keyOf(d);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(d);
    else groups.push({ days: [d], key });
  }
  return groups.map(({ days, key }) => {
    const names = days.map((d) => WEEKDAYS[d]);
    const label =
      names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} e ${names[1]}` : `${names[0]} a ${names[names.length - 1]}`;
    const h = hours[days[0]];
    return { days: cap(label), time: key === "fechado" || !h ? "fechado" : `${formatHour(h.open)} às ${formatHour(h.close)}` };
  });
}
