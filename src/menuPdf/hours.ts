/**
 * Horário de funcionamento em poucas linhas, para o verso do PDF: dias
 * seguidos com o mesmo horário viram um grupo ("Quarta a sexta · 17h às 23h").
 * A semana começa na segunda.
 */
import type { OpeningHours } from "@/types";
import { formatHour, WEEKDAYS } from "@/utils/generalSettings";

const ORDER = [1, 2, 3, 4, 5, 6, 0];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "18:00" → "18h"; meia-noite como "00h" (fica mais claro num cartaz do que "0h"). */
const clock = (hm: string) => (hm.startsWith("00:") ? `00h${hm.endsWith(":00") ? "" : hm.slice(3)}` : formatHour(hm));

export function hoursLines(
  hours: (OpeningHours | null)[],
  { closedLast = false }: { closedLast?: boolean } = {},
): { days: string; time: string }[] {
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
  // Os dias fechados podem ir para o fim (como no verso: primeiro quando abre)
  const ordered = closedLast ? [...groups.filter((g) => g.key !== "fechado"), ...groups.filter((g) => g.key === "fechado")] : groups;
  return ordered.map(({ days, key }) => {
    const names = days.map((d) => WEEKDAYS[d]);
    const label =
      names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} e ${names[1]}` : `${names[0]} a ${names[names.length - 1]}`;
    const h = hours[days[0]];
    return { days: cap(label), time: key === "fechado" || !h ? "Fechado" : `${clock(h.open)} às ${clock(h.close)}` };
  });
}
