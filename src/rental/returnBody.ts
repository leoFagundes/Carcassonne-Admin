import type { RentalReturnCondition } from "@/types";

export const RETURN_CONDITIONS: RentalReturnCondition[] = ["ok", "damaged", "missing_parts"];

export type ParsedCheck = { condition: RentalReturnCondition; note?: string; markUnitUnavailable: boolean };

/** Lê a conferência do corpo da requisição (estado, observação, tirar a cópia); null se inválida. */
export function parseCheck(raw: unknown): ParsedCheck | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { condition?: unknown; note?: unknown; markUnitUnavailable?: unknown };
  if (!RETURN_CONDITIONS.includes(body.condition as RentalReturnCondition)) return null;
  if (typeof body.markUnitUnavailable !== "boolean") return null;
  if (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 500)) return null;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  return {
    condition: body.condition as RentalReturnCondition,
    ...(note ? { note } : {}),
    markUnitUnavailable: body.markUnitUnavailable,
  };
}

/**
 * Corpo da devolução: `{ returnedOn, check: {...} | null }`. O formato antigo
 * (`{ condition, note, markUnitUnavailable }`, de uma tela aberta antes da
 * atualização) vale como devolvido hoje e já conferido.
 */
export function parseReturnBody(
  raw: unknown,
  today: string,
): { returnedOn: string; check: ParsedCheck | null } | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { returnedOn?: unknown; check?: unknown; condition?: unknown };
  if (body.returnedOn === undefined && body.condition !== undefined) {
    const check = parseCheck(raw);
    return check ? { returnedOn: today, check } : null;
  }
  if (typeof body.returnedOn !== "string") return null;
  if (body.check === null) return { returnedOn: body.returnedOn, check: null };
  const check = parseCheck(body.check);
  return check ? { returnedOn: body.returnedOn, check } : null;
}
