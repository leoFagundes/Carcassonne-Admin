import { addDays, diffDays, weekdayOf } from "./dates";
import type { RentalBooking, RentalGameType, RentalSettingsType } from "@/types";

export type GameLike = Pick<RentalGameType, "units" | "bookings" | "rentalDays">;

export type GameAvailability =
  | { state: "available" }
  | { state: "from"; start: string; returnDate?: string; daysUntilReturn?: number }
  | { state: "overdue" }
  /** Todas as cópias com alguém e a fila está desligada: só depois que uma voltar. */
  | { state: "rented"; returnDate?: string; daysUntilReturn?: number }
  | { state: "unavailable" };

/** Com a fila ligada: pode reservar antes de quem já reservou, depois de quem está com o jogo, ou os dois. */
export type QueueMode = "before" | "after" | "both";

export type AvailabilityOptions = {
  allowQueue?: boolean;
  /** Só vale com a fila ligada; ausente = "both". */
  queueMode?: QueueMode;
  /** Folga mínima entre a devolução e a próxima retirada da mesma cópia (1 = dia seguinte). */
  gapDays?: number;
  /** Dias da semana em que o pub atende (0 = domingo). A devolução que cair fora vai para o próximo dia aberto. */
  openWeekdays?: number[];
};

export const MAX_GAP_DAYS = 14;

/**
 * Pode reservar DEPOIS de outro cliente (atrás de quem está com a cópia ou já
 * a reservou)? Só com a fila ligada e o modo "depois" ou "os dois".
 */
export const allowsAfter = (opts?: AvailabilityOptions) =>
  opts?.allowQueue !== false && (opts?.queueMode ?? "both") !== "before";

/**
 * Pode reservar ANTES de uma reserva já marcada (devolvendo antes dela
 * começar)? Com a fila desligada continua podendo (ninguém fica atrás de
 * ninguém); ligada, só no modo "antes" ou "os dois".
 */
export const allowsBefore = (opts?: AvailabilityOptions) =>
  opts?.allowQueue === false || (opts?.queueMode ?? "both") !== "after";

/** Qualquer regra além de "antes e depois" (a busca pela próxima data muda). */
const restricted = (opts?: AvailabilityOptions) => !allowsAfter(opts) || !allowsBefore(opts);

const QUEUE_MODES: QueueMode[] = ["before", "after", "both"];
export const queueModeOf = (mode: unknown): QueueMode =>
  QUEUE_MODES.includes(mode as QueueMode) ? (mode as QueueMode) : "both";

/** Folga válida: inteiro de 1 a 14; ausente ou inválido = 1 (dia seguinte, como sempre). */
export function gapDaysOf(opts?: AvailabilityOptions): number {
  const g = opts?.gapDays;
  return typeof g === "number" && Number.isInteger(g) && g >= 1 && g <= MAX_GAP_DAYS ? g : 1;
}

/** Opções de disponibilidade a partir das configurações do aluguel. */
export const availabilityOptions = (
  s?: Pick<RentalSettingsType, "allowQueue" | "queueMode" | "queueGapDays" | "pickupWeekdays"> | null,
): AvailabilityOptions => ({
  allowQueue: s?.allowQueue,
  queueMode: queueModeOf(s?.queueMode),
  gapDays: s?.queueGapDays,
  openWeekdays: s?.pickupWeekdays,
});

/**
 * Data de devolução: retirada + prazo do jogo; se cair num dia em que o pub
 * não abre, passa para o próximo dia aberto (ex.: segunda e terça fechado →
 * quarta). Sem dias informados, fica a data do prazo.
 */
export function dueDateFor(start: string, rentalDays: number, opts?: AvailabilityOptions): string {
  let due = addDays(start, rentalDays);
  const open = opts?.openWeekdays;
  if (!open?.length) return due;
  for (let i = 0; i < 7 && !open.includes(weekdayOf(due)); i++) due = addDays(due, 1);
  return due;
}

/** Último dia em que a reserva ocupa a unidade (retirado e vencido conta até hoje). */
export function bookingEnd(b: RentalBooking, today: string): string {
  return b.status === "picked_up" && b.dueDate < today ? today : b.dueDate;
}

/**
 * Intervalos fechados: livre se nenhum booking da unidade chega perto de
 * [start, end]. Com folga G, entre a devolução de um e a retirada do outro
 * precisa haver G dias (G = 1: retirada no dia seguinte à devolução).
 */
export function isUnitFree(
  unitId: string,
  bookings: RentalBooking[],
  start: string,
  end: string,
  today: string,
  gapDays = 1,
): boolean {
  const extra = gapDays - 1;
  return !bookings.some(
    (b) =>
      b.unitId === unitId &&
      b.startDate <= addDays(end, extra) &&
      addDays(bookingEnd(b, today), extra) >= start,
  );
}

/**
 * A cópia aceita uma reserva em [start, end]? Livre nessas datas e dentro da
 * regra da fila: sem "depois", ninguém pode estar na frente (reserva começando
 * antes); sem "antes", ninguém pode estar atrás (reserva começando depois).
 */
export function unitAccepts(
  unitId: string,
  bookings: RentalBooking[],
  start: string,
  end: string,
  today: string,
  opts?: AvailabilityOptions,
): boolean {
  if (!isUnitFree(unitId, bookings, start, end, today, gapDaysOf(opts))) return false;
  const mine = bookings.filter((b) => b.unitId === unitId);
  if (!allowsAfter(opts) && mine.some((b) => b.startDate < start)) return false;
  if (!allowsBefore(opts) && mine.some((b) => b.startDate > start)) return false;
  return true;
}

/** Primeira data ≥ `from` em que alguma cópia ativa aceita a reserva (até 120 dias à frente). */
function firstAcceptedStart(game: GameLike, from: string, today: string, opts?: AvailabilityOptions): string | null {
  const active = game.units.filter((u) => u.status === "active");
  for (let i = 0; i <= 120; i++) {
    const day = addDays(from, i);
    const end = dueDateFor(day, game.rentalDays, opts);
    if (active.some((u) => unitAccepts(u.id, game.bookings, day, end, today, opts))) return day;
  }
  return null;
}

/** Menor início ≥ `lowerBound` (padrão: hoje) cuja janela [c, c+rentalDays] está livre. */
export function earliestStartForUnit(
  unitId: string,
  bookings: RentalBooking[],
  rentalDays: number,
  today: string,
  lowerBound: string = today,
  gapDays = 1,
  openWeekdays?: number[],
): { start: string; blocking: RentalBooking | null } {
  const min = lowerBound < today ? today : lowerBound;
  const candidates: { start: string; blocking: RentalBooking | null }[] = [
    { start: min, blocking: null },
  ];
  for (const b of bookings) {
    if (b.unitId !== unitId) continue;
    const c = addDays(bookingEnd(b, today), gapDays);
    if (c >= min) candidates.push({ start: c, blocking: b });
  }
  candidates.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  for (const c of candidates) {
    if (isUnitFree(unitId, bookings, c.start, dueDateFor(c.start, rentalDays, { openWeekdays }), today, gapDays)) return c;
  }
  // Inalcançável: o dia após o fim da última reserva sempre está livre.
  return candidates[candidates.length - 1];
}

export function gameAvailability(game: GameLike, today: string, opts?: AvailabilityOptions): GameAvailability {
  const active = game.units.filter((u) => u.status === "active");
  if (active.length === 0) return { state: "unavailable" };

  if (!allowsAfter(opts)) {
    const end = dueDateFor(today, game.rentalDays, opts);
    if (active.some((u) => unitAccepts(u.id, game.bookings, today, end, today, opts))) return { state: "available" };
    // Ninguém livre agora: informa a devolução mais próxima (não dá para reservar antes dela).
    const out = game.bookings
      .filter((b) => b.status === "picked_up" && active.some((u) => u.id === b.unitId))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    const next = out[0];
    if (next && next.dueDate < today && out.every((b) => b.dueDate < today)) return { state: "overdue" };
    const due = out.find((b) => b.dueDate >= today)?.dueDate;
    return due ? { state: "rented", returnDate: due, daysUntilReturn: diffDays(today, due) } : { state: "rented" };
  }

  if (restricted(opts)) {
    // Só "depois": a próxima data é depois da última reserva de alguma cópia.
    const end = dueDateFor(today, game.rentalDays, opts);
    if (active.some((u) => unitAccepts(u.id, game.bookings, today, end, today, opts))) return { state: "available" };
    const out = game.bookings.filter((b) => b.status === "picked_up" && active.some((u) => u.id === b.unitId));
    if (out.length && out.every((b) => b.dueDate < today) && out.length >= active.length) return { state: "overdue" };
    const first = firstAcceptedStart(game, today, today, opts);
    return first ? { state: "from", start: first } : { state: "unavailable" };
  }

  let best: { start: string; blocking: RentalBooking | null } | null = null;
  for (const u of active) {
    const e = earliestStartForUnit(u.id, game.bookings, game.rentalDays, today, today, gapDaysOf(opts), opts?.openWeekdays);
    if (e.start === today) return { state: "available" };
    if (!best || e.start < best.start) best = e;
  }
  const b = best!.blocking;
  if (b && b.status === "picked_up") {
    if (b.dueDate < today) return { state: "overdue" };
    return {
      state: "from",
      start: best!.start,
      returnDate: b.dueDate,
      daysUntilReturn: diffDays(today, b.dueDate),
    };
  }
  return { state: "from", start: best!.start };
}

export function availabilityFor(
  game: GameLike,
  start: string,
  today: string,
  opts?: AvailabilityOptions,
): { ok: true } | { ok: false; nextStart: string | null } {
  const end = dueDateFor(start, game.rentalDays, opts);
  const active = game.units.filter((u) => u.status === "active");
  if (active.some((u) => unitAccepts(u.id, game.bookings, start, end, today, opts))) return { ok: true };
  // Sem fila, a próxima data pode até ser antes da escolhida (antes de quem já reservou).
  if (restricted(opts)) return { ok: false, nextStart: firstAcceptedStart(game, today, today, opts) };
  let next: string | null = null;
  for (const u of active) {
    const e = earliestStartForUnit(u.id, game.bookings, game.rentalDays, today, start, gapDaysOf(opts), opts?.openWeekdays);
    if (next === null || e.start < next) next = e.start;
  }
  return { ok: false, nextStart: next };
}

/** Unidade ativa e livre com o encaixe mais justo antes de `start`; empate → ordem de `units`. */
export function pickUnit(game: GameLike, start: string, today: string, opts?: AvailabilityOptions): string | null {
  const end = dueDateFor(start, game.rentalDays, opts);
  let bestId: string | null = null;
  let bestGap = Infinity;
  for (const u of game.units) {
    if (u.status !== "active") continue;
    if (!unitAccepts(u.id, game.bookings, start, end, today, opts)) continue;
    let prev: string | null = null;
    for (const b of game.bookings) {
      if (b.unitId !== u.id) continue;
      const e = bookingEnd(b, today);
      if (e < start && (prev === null || e > prev)) prev = e;
    }
    const gap = prev === null ? Infinity : diffDays(prev, start);
    if (bestId === null || gap < bestGap) {
      bestId = u.id;
      bestGap = gap;
    }
  }
  return bestId;
}

/** Por que o jogo não pode ser retirado nessa data (para explicar ao cliente). */
export type BlockReason =
  | { kind: "no_copies" }
  /** A cópia está com outro cliente até `until` (mais a folga). */
  | { kind: "with_customer"; until: string; copies: number }
  /** Já reservada por outro cliente nesse período (contando a folga). */
  | { kind: "reserved"; from: string; to: string; copies: number }
  /** Sem fila: seria depois de outro cliente, e o pub não permite. */
  | { kind: "behind"; from: string; to: string; copies: number }
  /** Só "depois": seria antes de outra reserva já marcada, e o pub não permite. */
  | { kind: "ahead"; from: string; to: string; copies: number };

export function blockReason(
  game: GameLike,
  start: string,
  today: string,
  opts?: AvailabilityOptions,
): BlockReason | null {
  const active = game.units.filter((u) => u.status === "active");
  if (active.length === 0) return { kind: "no_copies" };
  const end = dueDateFor(start, game.rentalDays, opts);
  if (active.some((u) => unitAccepts(u.id, game.bookings, start, end, today, opts))) return null;

  const gap = gapDaysOf(opts);
  const extra = gap - 1;
  let best: { reason: BlockReason; ends: string } | null = null;
  for (const u of active) {
    const mine = game.bookings
      .filter((b) => b.unitId === u.id)
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    const clash = mine.find(
      (b) => b.startDate <= addDays(end, extra) && addDays(bookingEnd(b, today), extra) >= start,
    );
    let reason: BlockReason | null = null;
    let ends = "";
    if (clash) {
      ends = bookingEnd(clash, today);
      reason =
        clash.status === "picked_up"
          ? { kind: "with_customer", until: ends, copies: active.length }
          : { kind: "reserved", from: clash.startDate, to: clash.dueDate, copies: active.length };
    } else {
      // Livre nas datas, mas atrás de outro cliente (sem "depois") ou na frente (sem "antes").
      const ahead = allowsAfter(opts) ? undefined : [...mine].reverse().find((b) => b.startDate < start);
      const behind = allowsBefore(opts) ? undefined : mine.find((b) => b.startDate > start);
      if (!ahead && behind) {
        ends = bookingEnd(behind, today);
        reason = { kind: "ahead", from: behind.startDate, to: behind.dueDate, copies: active.length };
      } else if (ahead) {
        ends = bookingEnd(ahead, today);
        reason =
          ahead.status === "picked_up"
            ? { kind: "with_customer", until: ends, copies: active.length }
            : { kind: "behind", from: ahead.startDate, to: ahead.dueDate, copies: active.length };
      }
    }
    if (reason && (!best || ends < best.ends)) best = { reason, ends };
  }
  return best?.reason ?? null;
}

/** Onde a regra deixa encaixar um aluguel em volta de outra reserva (para os textos). */
export function queueWindows(opts?: AvailabilityOptions): "before" | "after" | "both" {
  const before = allowsBefore(opts);
  const after = allowsAfter(opts);
  return before && after ? "both" : after ? "after" : "before";
}
