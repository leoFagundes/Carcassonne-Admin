import Link from "next/link";
import { LuCheck } from "react-icons/lu";

export type RentalStep = "jogos" | "pedido" | "pagamento" | "retirada" | "devolucao" | "concluido";

const LABELS: Record<Exclude<RentalStep, "concluido">, string> = {
  jogos: "Jogos",
  pedido: "Pedido",
  pagamento: "Pagamento",
  retirada: "Retirada",
  devolucao: "Devolução",
};

/**
 * Onde o cliente está no aluguel: Jogos → Pedido → (Pagamento) → Retirada → Devolução.
 * Etapas anteriores ficam marcadas; "concluido" marca todas.
 */
export default function RentalSteps({ current, online }: { current: RentalStep; online: boolean }) {
  const steps = (["jogos", "pedido", ...(online ? ["pagamento"] : []), "retirada", "devolucao"] as const).filter(
    Boolean,
  ) as Exclude<RentalStep, "concluido">[];
  const index = current === "concluido" ? steps.length : steps.indexOf(current as Exclude<RentalStep, "concluido">);

  return (
    <ol aria-label="Etapas do aluguel" className="flex items-start w-full">
      {steps.map((step, i) => {
        const done = i < index;
        const active = i === index;
        const dot = (
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full border text-[11px] font-bold transition-colors ${
              done
                ? "border-primary-gold bg-primary-gold text-primary-black"
                : active
                  ? "border-primary-gold bg-primary-gold/15 text-primary-gold ring-4 ring-primary-gold/10"
                  : "border-primary-gold/20 text-primary-gold/35"
            }`}
          >
            {done ? <LuCheck size={14} strokeWidth={3} /> : i + 1}
          </span>
        );
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-1 min-w-0"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-3.5 right-1/2 w-full h-px -z-0 ${done || active ? "bg-primary-gold/60" : "bg-primary-gold/15"}`}
              />
            )}
            <span className="relative z-[1] bg-primary-black rounded-full">
              {step === "jogos" && !active ? <Link href="/aluguel">{dot}</Link> : dot}
            </span>
            <span
              className={`text-[10px] sm:text-[11px] text-center truncate max-w-full ${
                active ? "text-primary-gold font-semibold" : done ? "text-primary-gold/70" : "text-primary-gold/35"
              }`}
            >
              {LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
