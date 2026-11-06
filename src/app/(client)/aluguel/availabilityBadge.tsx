import type { GameAvailability } from "@/rental/availability";
import { formatDateBR } from "@/rental/dates";

/** `short`: versão curta para o card (cabe em telas pequenas). */
export function availabilityLabel(availability: GameAvailability, short = false) {
  switch (availability.state) {
    case "available":
      return "Disponível";
    case "from":
      if (availability.daysUntilReturn !== undefined) {
        const days = availability.daysUntilReturn;
        if (days === 0) return "Volta hoje";
        return `Volta em ${days} ${days === 1 ? "dia" : "dias"}`;
      }
      return `${short ? "A partir de" : "Disponível a partir de"} ${formatDateBR(availability.start)}`;
    case "overdue":
      return "Retorno atrasado";
    default:
      return "Indisponível";
  }
}

// Fundo escuro quase opaco: o selo fica por cima da capa do jogo, e com fundo
// translúcido o texto sumia em fotos claras. A cor do status vai no texto, na
// borda e no pontinho.
const TONE: Record<GameAvailability["state"], { text: string; dot: string }> = {
  available: { text: "text-emerald-300 border-emerald-400/60", dot: "bg-emerald-400" },
  from: { text: "text-primary-gold border-primary-gold/60", dot: "bg-primary-gold" },
  overdue: { text: "text-orange-300 border-orange-400/60", dot: "bg-orange-400" },
  unavailable: { text: "text-red-300 border-red-400/60", dot: "bg-red-400" },
};

export default function AvailabilityBadge({
  availability,
  className = "",
  short = false,
}: {
  availability: GameAvailability;
  className?: string;
  /** Texto curto (card); se ainda não couber, termina em "…" em vez de vazar. */
  short?: boolean;
}) {
  const tone = TONE[availability.state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-primary-black/90 shadow-[0_1px_6px_rgba(0,0,0,0.6)] text-[10px] font-semibold whitespace-nowrap max-w-full min-w-0 ${tone.text} ${className}`}
    >
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
      <span className="truncate">{availabilityLabel(availability, short)}</span>
    </span>
  );
}
