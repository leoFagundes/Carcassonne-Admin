import type { RentalBooking, RentalGameType, RentalUnit } from "@/types";
import { DEFAULT_RENTAL_SETTINGS } from "../defaults";
import type { OrderContext } from "../orders";

export function unit(id: string, status: RentalUnit["status"] = "active"): RentalUnit {
  return { id, label: id, status };
}

export function bk(
  unitId: string,
  startDate: string,
  dueDate: string,
  status: RentalBooking["status"],
  rentalId = "r"
): RentalBooking {
  return { rentalId, unitId, startDate, dueDate, status };
}

export function makeGame(id: string): RentalGameType & { id: string } {
  return {
    id,
    name: `Jogo ${id}`,
    description: "",
    image: "",
    difficulty: "",
    minPlayers: 2,
    maxPlayers: 4,
    playTime: 30,
    types: [],
    price: 4500,
    rentalDays: 7,
    isActive: true,
    units: [unit("u1")],
    bookings: [],
  };
}

/** Contexto base válido (hoje = 2026-11-05, serviço ligado, cliente completo). */
export function makeCtx(): OrderContext {
  return {
    today: "2026-11-05",
    settings: { ...DEFAULT_RENTAL_SETTINGS, isEnabled: true },
    rulesVersion: 1,
    customer: { name: "Maria Silva", phone: "11987654321", cpf: "52998224725", email: "maria@example.com" },
    emailVerified: true,
    activeGamesCount: 0,
    games: { g1: makeGame("g1"), g2: makeGame("g2") },
  };
}

export function withBooking(ctx: OrderContext, gameId: string, booking: RentalBooking): OrderContext {
  const game = ctx.games[gameId];
  return { ...ctx, games: { ...ctx.games, [gameId]: { ...game, bookings: [...game.bookings, booking] } } };
}

export function withSettings(ctx: OrderContext, patch: Partial<OrderContext["settings"]>): OrderContext {
  return { ...ctx, settings: { ...ctx.settings, ...patch } };
}
