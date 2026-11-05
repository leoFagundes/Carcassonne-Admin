import type { GameAvailability } from "@/rental/availability";
import { formatDateBR } from "@/rental/dates";

export function availabilityLabel(availability: GameAvailability) {
  switch (availability.state) {
    case "available":
      return "Disponível";
    case "from":
      if (availability.daysUntilReturn !== undefined) {
        const days = availability.daysUntilReturn;
        if (days === 0) return "Volta hoje";
        return `Volta em ${days} ${days === 1 ? "dia" : "dias"}`;
      }
      return `Disponível a partir de ${formatDateBR(availability.start)}`;
    case "overdue":
      return "Retorno atrasado";
    default:
      return "Indisponível";
  }
}

const TONE: Record<GameAvailability["state"], string> = {
  available: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  from: "bg-primary-gold/15 text-primary-gold border-primary-gold/40",
  overdue: "bg-orange-500/20 text-orange-300 border-orange-400/40",
  unavailable: "bg-red-500/20 text-red-300 border-red-400/40",
};

export default function AvailabilityBadge({
  availability,
  className = "",
}: {
  availability: GameAvailability;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold backdrop-blur-sm whitespace-nowrap ${TONE[availability.state]} ${className}`}
    >
      {availabilityLabel(availability)}
    </span>
  );
}
