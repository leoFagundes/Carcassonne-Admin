const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Dias da semana num texto curto: "Todos os dias", "Ter a Dom" (3+ seguidos) ou "Seg, Qua, Sex". */
export function weekdaysText(days: number[]): string {
  const sorted = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (sorted.length === 7) return "Todos os dias";
  if (sorted.length === 0) return "Nenhum dia";
  if (sorted.length >= 3) {
    // Sequência circular: começa num dia marcado cujo anterior não está marcado.
    for (const start of sorted) {
      if (sorted.includes((start + 6) % 7)) continue;
      const run = Array.from({ length: sorted.length }, (_, i) => (start + i) % 7);
      if (run.every((d) => sorted.includes(d))) return `${WEEKDAYS[run[0]]} a ${WEEKDAYS[run[run.length - 1]]}`;
    }
  }
  return sorted.map((d) => WEEKDAYS[d]).join(", ");
}
