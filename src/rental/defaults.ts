import type { RentalRulesType, RentalSettingsType } from "@/types";
import { clampFeePercent } from "./payments";
import { sanitizePromotion } from "./discounts";

export const DEFAULT_RENTAL_SETTINGS: RentalSettingsType = {
  isEnabled: false,
  pickupWeekdays: [0, 1, 2, 3, 4, 5, 6],
  maxAdvanceDays: 30,
  maxGamesPerOrder: 3,
  maxActiveGamesPerCustomer: 3,
  requireCpf: true,
  onlinePayment: { enabled: false, holdMinutes: 30, cancellationPolicy: "full", feePercent: 10 },
};

const MIN_HOLD_MINUTES = 15;
const MAX_HOLD_MINUTES = 60;

/** Número finito limitado a [min, max]; inválido (NaN, texto) → `fallback`. */
function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Mescla configurações salvas (doc ausente/parcial) com os padrões, inclusive
 * `onlinePayment`. Taxa limitada a 0–50% (inválida → 0) e tempo para pagar a
 * 15–60 min, como no formulário (inválido → 30), mesmo com o documento editado à mão.
 */
export function mergeRentalSettings(saved?: Partial<RentalSettingsType>): RentalSettingsType {
  const onlinePayment = { ...DEFAULT_RENTAL_SETTINGS.onlinePayment, ...saved?.onlinePayment };
  // Promoção editada à mão ou vazia: só fica o que é válido (nada útil = sem promoção).
  const promotion = sanitizePromotion(saved?.promotion);
  const { promotion: _rawPromotion, ...rest } = saved ?? {};
  void _rawPromotion;
  return {
    ...DEFAULT_RENTAL_SETTINGS,
    ...rest,
    ...(promotion ? { promotion } : {}),
    // Folga entre aluguéis da mesma cópia: 1 a 14 dias (inválida → 1).
    queueGapDays: clampNumber(Math.round(Number(saved?.queueGapDays ?? 1)), 1, 14, 1),
    onlinePayment: {
      ...onlinePayment,
      feePercent: clampFeePercent(onlinePayment.feePercent),
      holdMinutes: clampNumber(
        onlinePayment.holdMinutes,
        MIN_HOLD_MINUTES,
        MAX_HOLD_MINUTES,
        DEFAULT_RENTAL_SETTINGS.onlinePayment.holdMinutes,
      ),
    },
  };
}

const PLACEHOLDER = "A definir pelo Carcassonne Pub.";

export const DEFAULT_RENTAL_RULES: RentalRulesType = {
  version: 1,
  sections: [
    { id: "prazos", title: "Prazos e períodos de aluguel", body: PLACEHOLDER },
    { id: "retirada-devolucao", title: "Retirada e devolução", body: PLACEHOLDER },
    { id: "atrasos", title: "Atrasos", body: PLACEHOLDER },
    { id: "pagamento", title: "Formas de pagamento", body: PLACEHOLDER },
    { id: "danos", title: "Danos aos jogos", body: PLACEHOLDER },
    { id: "pecas", title: "Perda de peças ou componentes", body: PLACEHOLDER },
    { id: "furto", title: "Furto ou extravio", body: PLACEHOLDER },
    { id: "demais", title: "Demais condições", body: PLACEHOLDER },
  ],
};
