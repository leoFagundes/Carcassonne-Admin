import { Timestamp } from "firebase/firestore";
import { PopupScheduleType, PopupType } from "@/types";

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAY_FULL_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Um horário está ativo agora? (schedules vazio = sempre ativo) */
export function isScheduleActiveNow(
  schedules: PopupScheduleType[],
  now: Date = new Date(),
): boolean {
  if (schedules.length === 0) return true;
  const day = now.getDay();
  const prevDay = (day + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();

  return schedules.some((schedule) => {
    if (schedule.days.length === 0) return false;
    const startMin = toMinutes(schedule.startTime);
    const endMin = toMinutes(schedule.endTime);
    const wraps = endMin <= startMin;

    if (!wraps) {
      return (
        schedule.days.includes(day) && minutes >= startMin && minutes < endMin
      );
    }
    // Janela atravessa a meia-noite: ativa se ainda "no dia de início" (após
    // o horário inicial) ou já "no dia seguinte" (antes do horário final).
    return (
      (schedule.days.includes(day) && minutes >= startMin) ||
      (schedule.days.includes(prevDay) && minutes < endMin)
    );
  });
}

// Representa as ocorrências de um horário como intervalos absolutos (em
// minutos) dentro de uma semana "dobrada" (0–20160). Cada ocorrência ganha
// uma cópia na semana seguinte, o que permite comparar duas janelas quaisquer
// com uma simples sobreposição de intervalos, sem tratar a virada
// sábado->domingo como caso especial.
function scheduleIntervals(
  schedule: PopupScheduleType,
): { start: number; end: number }[] {
  const startMin = toMinutes(schedule.startTime);
  const endMin = toMinutes(schedule.endTime);
  const wraps = endMin <= startMin;

  const intervals: { start: number; end: number }[] = [];
  schedule.days.forEach((day) => {
    const start = day * 1440 + startMin;
    const end = (wraps ? day + 1 : day) * 1440 + endMin;
    intervals.push({ start, end });
    intervals.push({ start: start + 10080, end: end + 10080 });
  });
  return intervals;
}

/** Duas janelas de horário se sobrepõem em algum momento da semana? */
export function schedulesOverlap(
  a: PopupScheduleType,
  b: PopupScheduleType,
): boolean {
  const intervalsA = scheduleIntervals(a);
  const intervalsB = scheduleIntervals(b);
  return intervalsA.some((ia) =>
    intervalsB.some((ib) => ia.start < ib.end && ib.start < ia.end),
  );
}

/**
 * Dois popups ativos conflitam? Só quando AMBOS têm horário definido e esses
 * horários se sobrepõem — um popup "sempre ativo" (sem horário) funciona
 * como camada de base e nunca conflita com nada: quando um programado entra
 * na janela dele, é ele quem aparece (ver `pickActivePopup`); fora da
 * janela, o "sempre ativo" volta a aparecer sozinho. Não há ambiguidade,
 * então não há conflito a avisar.
 */
export function popupsConflict(
  a: Pick<PopupType, "isActive" | "schedules">,
  b: Pick<PopupType, "isActive" | "schedules">,
): boolean {
  if (!a.isActive || !b.isActive) return false;
  if (a.schedules.length === 0 || b.schedules.length === 0) return false;
  return a.schedules.some((sa) =>
    b.schedules.some((sb) => schedulesOverlap(sa, sb)),
  );
}

/**
 * Pra cada popup ATIVO, lista os ids dos outros popups ativos com horário
 * conflitante. Usado tanto na prévia ao vivo do formulário quanto nos
 * indicadores da galeria.
 */
export function findConflicts(
  popups: (PopupType & { id: string })[],
): Map<string, string[]> {
  const active = popups.filter((p) => p.isActive);
  const conflicts = new Map<string, string[]>();
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (popupsConflict(active[i], active[j])) {
        conflicts.set(active[i].id, [
          ...(conflicts.get(active[i].id) ?? []),
          active[j].id,
        ]);
        conflicts.set(active[j].id, [
          ...(conflicts.get(active[j].id) ?? []),
          active[i].id,
        ]);
      }
    }
  }
  return conflicts;
}

/**
 * Escolhe qual popup exibir agora pro cliente, entre os que estão ativos e
 * dentro do horário. Em caso de empate (não deveria acontecer se o admin
 * resolveu os avisos de conflito, mas o cliente precisa de um resultado
 * determinístico mesmo assim): horários específicos ganham de "sempre
 * ativo", e o mais antigo cadastrado desempata por último.
 */
export function pickActivePopup(
  popups: (PopupType & { id: string })[],
  now: Date = new Date(),
): (PopupType & { id: string }) | null {
  const eligible = popups.filter(
    (p) => p.isActive && isScheduleActiveNow(p.schedules, now),
  );
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    const aScheduled = a.schedules.length > 0 ? 0 : 1;
    const bScheduled = b.schedules.length > 0 ? 0 : 1;
    if (aScheduled !== bScheduled) return aScheduled - bScheduled;
    const aTime = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
    const bTime = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
    return aTime - bTime;
  });
  return sorted[0];
}

/** Texto curto pra resumir um horário, ex: "Seg, Qua, Sex · 18:00–20:00" */
export function formatScheduleSummary(schedule: PopupScheduleType): string {
  const days = [...schedule.days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ");
  return `${days || "—"} · ${schedule.startTime}–${schedule.endTime}`;
}
