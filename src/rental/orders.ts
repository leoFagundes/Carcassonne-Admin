import { availabilityOptions, bookingEnd, dueDateFor, pickUnit, type GameLike } from "./availability";
import { sameRulesVersion } from "./rulesVersion";
import { isValidCpf } from "./cpf";
import { addDays, weekdayOf } from "./dates";
import type {
  RentalBooking,
  RentalCustomerType,
  RentalGameType,
  RentalOrderType,
  RentalSettingsType,
  RentalType,
} from "@/types";

export type OrderInput = {
  gameIds: string[];
  startDate: string;
  rulesVersion: number;
  /** Pagamento online: página do Mercado Pago (padrão) ou Pix na tela do site. */
  paymentChannel?: "checkout" | "pix";
};

export type OrderErrorCode =
  | "service_disabled"
  | "email_not_verified"
  | "profile_incomplete"
  | "customer_blocked"
  | "rules_outdated"
  | "empty_order"
  | "too_many_games"
  | "duplicate_game"
  | "date_out_of_range"
  | "weekday_not_allowed"
  | "active_limit"
  | "game_not_found"
  | "game_inactive"
  | "game_unavailable";

export type OrderContext = {
  today: string;
  settings: RentalSettingsType;
  rulesVersion: number;
  customer: RentalCustomerType | null;
  emailVerified: boolean;
  activeGamesCount: number;
  games: Record<string, RentalGameType & { id: string }>;
};

export type PlannedItem = {
  gameId: string;
  unitId: string;
  unitLabel: string;
  startDate: string;
  dueDate: string;
  price: number;
  rentalDays: number;
};

export type PlanResult =
  | { ok: true; items: PlannedItem[] }
  | { ok: false; code: OrderErrorCode; gameId?: string };

export const ORDER_ERROR_MESSAGES: Record<OrderErrorCode, string> = {
  service_disabled: "O aluguel de jogos está indisponível no momento.",
  email_not_verified: "Confirme seu e-mail para alugar jogos.",
  profile_incomplete: "Complete seu cadastro (nome, telefone e CPF) para alugar jogos.",
  customer_blocked: "Não foi possível concluir o aluguel. Fale com a equipe do Carcassonne Pub.",
  rules_outdated: "As regras de aluguel foram atualizadas. Leia e aceite novamente para continuar.",
  empty_order: "Adicione ao menos um jogo ao pedido.",
  too_many_games: "O pedido tem jogos demais. Reduza a quantidade e tente novamente.",
  duplicate_game: "O mesmo jogo aparece mais de uma vez no pedido.",
  date_out_of_range: "A data de retirada escolhida não é válida. Escolha outra data.",
  weekday_not_allowed: "Não fazemos retiradas neste dia da semana. Escolha outra data.",
  active_limit: "Você atingiu o limite de jogos alugados ao mesmo tempo.",
  game_not_found: "Um dos jogos do pedido não existe mais.",
  game_inactive: "Um dos jogos do pedido não está mais disponível para aluguel.",
  game_unavailable: "Este jogo não está mais disponível para a data escolhida.",
};

export function isProfileComplete(customer: RentalCustomerType | null, requireCpf: boolean): boolean {
  if (!customer) return false;
  if ((customer.name ?? "").trim().length < 3) return false;
  if ((customer.phone ?? "").replace(/\D/g, "").length < 10) return false;
  if (requireCpf && !isValidCpf(customer.cpf ?? "")) return false;
  return true;
}

const fail = (code: OrderErrorCode, gameId?: string): PlanResult =>
  gameId === undefined ? { ok: false, code } : { ok: false, code, gameId };

/** Valida e planeja o pedido inteiro (tudo ou nada). Checagens na ordem de `OrderErrorCode`. */
export function planOrder(input: OrderInput, ctx: OrderContext): PlanResult {
  const { settings, today } = ctx;
  const { gameIds, startDate } = input;

  if (!settings.isEnabled) return fail("service_disabled");
  if (!ctx.emailVerified) return fail("email_not_verified");
  if (!isProfileComplete(ctx.customer, settings.requireCpf)) return fail("profile_incomplete");
  if (ctx.customer?.isBlocked === true) return fail("customer_blocked");
  if (!sameRulesVersion(input.rulesVersion, ctx.rulesVersion)) return fail("rules_outdated");
  if (gameIds.length === 0) return fail("empty_order");
  if (gameIds.length > settings.maxGamesPerOrder) return fail("too_many_games");
  if (new Set(gameIds).size !== gameIds.length) return fail("duplicate_game");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    addDays(startDate, 0) !== startDate ||
    startDate < today ||
    startDate > addDays(today, settings.maxAdvanceDays)
  ) {
    return fail("date_out_of_range");
  }
  if (!settings.pickupWeekdays.includes(weekdayOf(startDate))) return fail("weekday_not_allowed");
  if (ctx.activeGamesCount + gameIds.length > settings.maxActiveGamesPerCustomer) {
    return fail("active_limit");
  }

  return planItems(gameIds, startDate, ctx);
}

/** Escolhe a cópia e a devolução de cada jogo (comum ao pedido do cliente e ao do balcão). */
export function planItems(
  gameIds: string[],
  startDate: string,
  ctx: Pick<OrderContext, "today" | "settings" | "games">,
): PlanResult {
  const { settings, today } = ctx;
  const items: PlannedItem[] = [];
  for (const gameId of gameIds) {
    const game = Object.prototype.hasOwnProperty.call(ctx.games, gameId) ? ctx.games[gameId] : undefined;
    if (!game) return fail("game_not_found", gameId);
    if (!game.isActive) return fail("game_inactive", gameId);
    const unitId = pickUnit(game, startDate, today, availabilityOptions(settings));
    if (unitId === null) return fail("game_unavailable", gameId);
    const unitLabel = game.units.find((u) => u.id === unitId)?.label ?? unitId;
    items.push({
      gameId,
      unitId,
      unitLabel,
      startDate,
      dueDate: dueDateFor(startDate, game.rentalDays, availabilityOptions(settings)),
      price: game.price,
      rentalDays: game.rentalDays,
    });
  }
  return { ok: true, items };
}

/** Data AAAA-MM-DD que existe no calendário. */
export function isRealDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
}

export type OrderRecordsMeta = {
  orderId: string;
  code: string;
  /** Um id de `rentals/{id}` por item, na mesma ordem. */
  rentalIds: string[];
  customerUid: string;
  customer: RentalType["customer"];
  gameNames: Record<string, string>;
  rulesVersion: number;
  /** "reserved" (balcão, padrão) ou "awaiting_payment" (pagamento online). */
  initialStatus?: "reserved" | "awaiting_payment";
  /** Fim da reserva temporária (ms); obrigatório com "awaiting_payment". */
  holdUntil?: number;
};

export type OrderRecords = {
  rentals: Omit<RentalType, "id" | "createdAt">[];
  /** Só os bookings novos de cada jogo (o chamador junta com os existentes). */
  bookingsByGame: Record<string, RentalBooking[]>;
};

/** Converte o plano aprovado nos docs de `rentals` e nos novos bookings de cada jogo. */
export function buildOrderRecords(items: PlannedItem[], meta: OrderRecordsMeta): OrderRecords {
  if (meta.rentalIds.length !== items.length) {
    throw new Error("buildOrderRecords: rentalIds e itens com tamanhos diferentes.");
  }
  const online = meta.initialStatus === "awaiting_payment";
  const holdUntil = meta.holdUntil;
  if (online && typeof holdUntil !== "number") {
    throw new Error("buildOrderRecords: awaiting_payment exige holdUntil.");
  }
  const rentals: OrderRecords["rentals"] = [];
  const bookingsByGame: OrderRecords["bookingsByGame"] = {};
  items.forEach((item, i) => {
    rentals.push({
      orderId: meta.orderId,
      code: meta.code,
      customerUid: meta.customerUid,
      customer: meta.customer,
      gameId: item.gameId,
      gameName: Object.prototype.hasOwnProperty.call(meta.gameNames, item.gameId)
        ? meta.gameNames[item.gameId]
        : item.gameId,
      unitId: item.unitId,
      unitLabel: item.unitLabel,
      price: item.price,
      rentalDays: item.rentalDays,
      startDate: item.startDate,
      dueDate: item.dueDate,
      status: online ? "awaiting_payment" : "reserved",
      rulesVersion: meta.rulesVersion,
    });
    (bookingsByGame[item.gameId] ??= []).push({
      rentalId: meta.rentalIds[i],
      unitId: item.unitId,
      startDate: item.startDate,
      dueDate: item.dueDate,
      ...(online ? { status: "held" as const, holdUntil } : { status: "reserved" as const }),
    });
  });
  return { rentals, bookingsByGame };
}

export type RentalOrderDocMeta = {
  code: string;
  customerUid: string;
  customer: RentalOrderType["customer"];
  /** Um id por rental, na mesma ordem. */
  rentalIds: string[];
};

/**
 * Doc de `rentalOrders/{orderId}` a partir dos rentals do pedido. Sem `online`
 * → pagamento no balcão (sem `payment`); com `online` → pagamento pendente, com
 * o checkout preenchido depois da transação.
 */
export function buildRentalOrderDoc(
  rentals: OrderRecords["rentals"],
  meta: RentalOrderDocMeta,
  online?: { holdUntil: number },
): Omit<RentalOrderType, "id" | "createdAt"> {
  if (meta.rentalIds.length !== rentals.length) {
    throw new Error("buildRentalOrderDoc: rentalIds e rentals com tamanhos diferentes.");
  }
  const items = rentals.map((r, i) => ({
    rentalId: meta.rentalIds[i],
    gameId: r.gameId,
    gameName: r.gameName,
    price: r.price,
  }));
  const base = {
    code: meta.code,
    customerUid: meta.customerUid,
    customer: meta.customer,
    rentalIds: [...meta.rentalIds],
    gameIds: rentals.map((r) => r.gameId),
    items,
    total: items.reduce((sum, item) => sum + item.price, 0),
    startDate: rentals[0]?.startDate ?? "",
  };
  if (!online) return { ...base, paymentMode: "counter" };
  return {
    ...base,
    paymentMode: "online",
    payment: {
      status: "pending",
      provider: "mercadopago",
      checkoutUrl: "",
      providerCheckoutId: "",
      holdUntil: online.holdUntil,
      refunds: [],
      refundedTotal: 0,
    },
  };
}

/** Nova devolução ≥ início e sem cruzar outro booking da mesma unidade. */
export function canChangeDueDate(game: GameLike, rentalId: string, newDue: string, today: string): boolean {
  const own = game.bookings.find((b) => b.rentalId === rentalId);
  if (!own || newDue < own.startDate) return false;
  return !game.bookings.some(
    (b) =>
      b !== own &&
      b.unitId === own.unitId &&
      b.startDate <= newDue &&
      bookingEnd(b, today) >= own.startDate
  );
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateOrderCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.min(CODE_ALPHABET.length - 1, Math.floor(random() * CODE_ALPHABET.length));
    code += CODE_ALPHABET[idx];
  }
  return code;
}
