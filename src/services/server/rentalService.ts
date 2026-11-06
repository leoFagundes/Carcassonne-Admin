import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FieldValue,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  asBookings,
  asUnits,
  markUnitUnavailable,
  removeBooking,
  updateBooking,
} from "@/rental/bookings";
import { isValidCpf, normalizeCpf } from "@/rental/cpf";
import { formatDateBR, todaySP } from "@/rental/dates";
import { DEFAULT_RENTAL_RULES, mergeRentalSettings } from "@/rental/defaults";
import {
  ORDER_ERROR_MESSAGES,
  buildOrderRecords,
  canChangeDueDate,
  generateOrderCode,
  planOrder,
  type OrderInput,
} from "@/rental/orders";
import type {
  RentalCustomerType,
  RentalGameType,
  RentalReturnCondition,
  RentalSettingsType,
  RentalType,
} from "@/types";
import { ApiError } from "./apiHelpers";
import { getAdminDb } from "./firebaseAdmin";
import { rentalRulesUrl, sendOrderConfirmation } from "./rentalEmails";

type ProfileBody = { name: string; phone: string; cpf: string; acceptTerms: boolean };

function invalid(message: string): never {
  throw new ApiError(400, "invalid_profile", message);
}

function settingsRef(db: Firestore) {
  return db.collection("rental-config").doc("settings");
}

/** Configurações salvas por cima dos padrões (doc ausente ou parcial). */
function readSettings(snap: DocumentSnapshot): RentalSettingsType {
  return mergeRentalSettings(snap.exists ? (snap.data() as Partial<RentalSettingsType>) : undefined);
}

/** Versão publicada das regras (doc ausente → versão padrão). */
function readRulesVersion(snap: DocumentSnapshot): number {
  const version = snap.exists ? snap.data()?.version : undefined;
  return typeof version === "number" ? version : DEFAULT_RENTAL_RULES.version;
}

/**
 * Grava o cadastro do cliente em rentalCustomers/{uid} e mantém o índice de
 * CPF (rentalCpfIndex/{cpf}) único, tudo na mesma transação.
 */
export async function saveCustomerProfile(
  uid: string,
  email: string,
  body: ProfileBody,
): Promise<void> {
  const db = getAdminDb();

  const settings = readSettings(await settingsRef(db).get());

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 3) invalid("Informe seu nome completo (mínimo 3 letras).");

  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phone.length < 10 || phone.length > 11) {
    invalid("Informe um WhatsApp válido com DDD.");
  }

  const cpf = typeof body?.cpf === "string" ? normalizeCpf(body.cpf) : "";
  if ((settings.requireCpf || cpf) && !isValidCpf(cpf)) invalid("CPF inválido.");

  const customerRef = db.collection("rentalCustomers").doc(uid);

  await db.runTransaction(async (tx) => {
    const customerSnap = await tx.get(customerRef);
    const exists = customerSnap.exists;
    const oldCpf = exists ? String(customerSnap.data()?.cpf ?? "") : "";

    if (!exists && body?.acceptTerms !== true) {
      invalid("É preciso aceitar as regras do aluguel.");
    }

    const newIndexRef = cpf && cpf !== oldCpf ? db.collection("rentalCpfIndex").doc(cpf) : null;
    if (newIndexRef) {
      const indexSnap = await tx.get(newIndexRef);
      if (indexSnap.exists && indexSnap.data()?.uid !== uid) {
        throw new ApiError(409, "cpf_in_use", "Este CPF já está cadastrado em outra conta.");
      }
    }

    if (newIndexRef) tx.set(newIndexRef, { uid });
    if (oldCpf && oldCpf !== cpf) {
      tx.delete(db.collection("rentalCpfIndex").doc(oldCpf));
    }

    if (exists) {
      tx.update(customerRef, { name, phone, cpf, email });
    } else {
      tx.set(customerRef, {
        name,
        phone,
        cpf,
        email,
        acceptedTermsAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

const ACTIVE_STATUSES: RentalType["status"][] = ["reserved", "picked_up"];
const MAX_CODE_ATTEMPTS = 5;

/**
 * Cria o pedido inteiro (tudo ou nada) numa transação: relê tudo do banco,
 * replaneja com `planOrder` e só então grava os `rentals` e os bookings dos
 * jogos. Em conflito (ex.: dois clientes pegando a última cópia) o Firestore
 * repete a função com leituras novas, e o perdedor recebe `game_unavailable`.
 */
export async function createOrder(
  token: DecodedIdToken,
  input: OrderInput,
): Promise<{ orderId: string; code: string }> {
  const db = getAdminDb();
  const uid = token.uid;
  const rentalsCol = db.collection("rentals");
  const gamesCol = db.collection("rentalGames");
  // Repetidos são recusados pelo planOrder (duplicate_game); aqui só não lê duas vezes.
  const gameIds = [...new Set(input.gameIds)];

  const order = await db.runTransaction(async (tx) => {
    // 1) Leituras — o Admin SDK exige todas antes de qualquer escrita.
    const [settingsSnap, rulesSnap, customerSnap, rentalsSnap, ...gameSnaps] =
      await Promise.all([
        tx.get(settingsRef(db)),
        tx.get(db.collection("rental-config").doc("rules")),
        tx.get(db.collection("rentalCustomers").doc(uid)),
        tx.get(rentalsCol.where("customerUid", "==", uid)),
        ...gameIds.map((id) => tx.get(gamesCol.doc(id))),
      ]);

    const settings = readSettings(settingsSnap);
    const rulesVersion = readRulesVersion(rulesSnap);
    const customer = customerSnap.exists
      ? (customerSnap.data() as RentalCustomerType)
      : null;
    const activeGamesCount = rentalsSnap.docs.filter((d) =>
      ACTIVE_STATUSES.includes(d.data().status),
    ).length;

    const games: Record<string, RentalGameType & { id: string }> = {};
    for (const snap of gameSnaps) {
      if (!snap.exists) continue;
      const data = snap.data() as RentalGameType;
      games[snap.id] = {
        ...data,
        id: snap.id,
        units: Array.isArray(data.units) ? data.units : [],
        bookings: Array.isArray(data.bookings) ? data.bookings : [],
      };
    }

    // 2) Planejamento (puro, tudo ou nada).
    const plan = planOrder(input, {
      today: todaySP(),
      settings,
      rulesVersion,
      customer,
      emailVerified: token.email_verified === true,
      activeGamesCount,
      games,
    });
    if (!plan.ok) {
      throw new ApiError(
        409,
        plan.code,
        ORDER_ERROR_MESSAGES[plan.code],
        plan.gameId === undefined ? undefined : { gameId: plan.gameId },
      );
    }
    // planOrder já recusa cliente ausente (profile_incomplete).
    if (!customer) throw new Error("Pedido aprovado sem cadastro do cliente.");

    // Código curto do balcão: não repete o de outro pedido (ainda é leitura).
    let code = "";
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !code; attempt++) {
      const candidate = generateOrderCode();
      const clash = await tx.get(rentalsCol.where("code", "==", candidate).limit(1));
      if (clash.empty) code = candidate;
    }
    if (!code) throw new Error("Não foi possível gerar um código de pedido único.");

    // 3) Escritas.
    const orderId = rentalsCol.doc().id;
    const rentalRefs = plan.items.map(() => rentalsCol.doc());
    const customerInfo = {
      name: customer.name,
      email: token.email ?? customer.email,
      phone: customer.phone,
    };
    const { rentals, bookingsByGame } = buildOrderRecords(plan.items, {
      orderId,
      code,
      rentalIds: rentalRefs.map((ref) => ref.id),
      customerUid: uid,
      customer: customerInfo,
      gameNames: Object.fromEntries(Object.values(games).map((g) => [g.id, g.name])),
      rulesVersion,
    });

    rentals.forEach((rental, i) => {
      tx.set(rentalRefs[i], { ...rental, createdAt: FieldValue.serverTimestamp() });
    });
    for (const [gameId, newBookings] of Object.entries(bookingsByGame)) {
      tx.update(gamesCol.doc(gameId), {
        bookings: [...games[gameId].bookings, ...newBookings],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return { orderId, code, rentals, customer: customerInfo, staffEmail: settings.staffEmail };
  });

  // Fora da transação: falha no e-mail não desfaz o pedido.
  try {
    await sendOrderConfirmation(
      order.customer.email,
      {
        customerName: order.customer.name,
        code: order.code,
        items: order.rentals.map((r) => ({
          gameName: r.gameName,
          startDate: r.startDate,
          dueDate: r.dueDate,
          price: r.price,
        })),
        total: order.rentals.reduce((sum, r) => sum + r.price, 0),
        rulesUrl: rentalRulesUrl(),
      },
      order.staffEmail,
    );
  } catch (error) {
    console.error(`Erro ao enviar a confirmação do pedido ${order.orderId}:`, error);
  }

  return { orderId: order.orderId, code: order.code };
}

const MAX_CANCEL_REASON = 500;

/**
 * Cancela um aluguel e libera a unidade (remove o booking do jogo), tudo numa
 * transação. Cliente: só o próprio e só `reserved`. Admin: `reserved` ou
 * `picked_up`.
 */
export async function cancelRental(
  rentalId: string,
  actor: { uid: string; isAdmin: boolean },
  reason?: string,
): Promise<void> {
  const db = getAdminDb();
  const rentalRef = db.collection("rentals").doc(rentalId);
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, MAX_CANCEL_REASON) : "";

  await db.runTransaction(async (tx) => {
    const rentalSnap = await tx.get(rentalRef);
    if (!rentalSnap.exists) {
      throw new ApiError(404, "not_found", "Aluguel não encontrado.");
    }
    const rental = rentalSnap.data() as RentalType;

    if (!actor.isAdmin && rental.customerUid !== actor.uid) {
      throw new ApiError(403, "forbidden", "Você não tem permissão para esta ação.");
    }
    const cancelable: RentalType["status"][] = actor.isAdmin
      ? ["reserved", "picked_up"]
      : ["reserved"];
    if (!cancelable.includes(rental.status)) {
      throw new ApiError(409, "not_cancelable", "Este aluguel não pode mais ser cancelado.");
    }

    // Leitura antes de qualquer escrita.
    const gameRef = db.collection("rentalGames").doc(rental.gameId);
    const gameSnap = await tx.get(gameRef);

    tx.update(rentalRef, {
      status: "canceled",
      canceledAt: FieldValue.serverTimestamp(),
      canceledBy: actor.isAdmin ? "admin" : "customer",
      ...(cleanReason ? { cancelReason: cleanReason } : {}),
    });

    if (gameSnap.exists) {
      tx.update(gameRef, {
        bookings: removeBooking(asBookings(gameSnap.data()?.bookings), rentalId),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

const invalidStatus = () =>
  new ApiError(409, "invalid_status", "Este aluguel está em outro status. Atualize a página.");

/** Lê o aluguel e depois o jogo, na transação; 404 se o aluguel não existir. */
async function readRentalAndGame(db: Firestore, tx: Transaction, rentalId: string) {
  const rentalRef = db.collection("rentals").doc(rentalId);
  const rentalSnap = await tx.get(rentalRef);
  if (!rentalSnap.exists) {
    throw new ApiError(404, "not_found", "Aluguel não encontrado.");
  }
  const rental = rentalSnap.data() as RentalType;
  const gameRef = db.collection("rentalGames").doc(rental.gameId);
  const gameSnap = await tx.get(gameRef);
  return { rentalRef, rental, gameRef, gameSnap };
}

/** Registra a retirada (reserved para picked_up). */
export async function pickupRental(rentalId: string, adminUid: string): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const { rentalRef, rental, gameRef, gameSnap } = await readRentalAndGame(db, tx, rentalId);
    if (rental.status !== "reserved") throw invalidStatus();
    if (rental.startDate > todaySP()) {
      throw new ApiError(
        409,
        "too_early",
        `A retirada só pode ser registrada a partir de ${formatDateBR(rental.startDate)}.`,
      );
    }

    tx.update(rentalRef, {
      status: "picked_up",
      pickedUpAt: FieldValue.serverTimestamp(),
      pickedUpBy: adminUid,
    });
    if (gameSnap.exists) {
      tx.update(gameRef, {
        bookings: updateBooking(asBookings(gameSnap.data()?.bookings), rentalId, {
          status: "picked_up",
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

const DEFAULT_UNAVAILABLE_NOTES: Record<RentalReturnCondition, string> = {
  ok: "Devolvido",
  damaged: "Devolvido com avaria",
  missing_parts: "Devolvido com peças faltando",
};

/** Registra a devolução (picked_up para returned); opcionalmente tira a unidade de circulação. */
export async function returnRental(
  rentalId: string,
  adminUid: string,
  input: { condition: RentalReturnCondition; note?: string; markUnitUnavailable: boolean },
): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const { rentalRef, rental, gameRef, gameSnap } = await readRentalAndGame(db, tx, rentalId);
    if (rental.status !== "picked_up") throw invalidStatus();

    tx.update(rentalRef, {
      status: "returned",
      returnedAt: FieldValue.serverTimestamp(),
      returnedBy: adminUid,
      returnCondition: input.condition,
      ...(input.note ? { returnNote: input.note } : {}),
    });
    if (gameSnap.exists) {
      const data = gameSnap.data();
      tx.update(gameRef, {
        bookings: removeBooking(asBookings(data?.bookings), rentalId),
        ...(input.markUnitUnavailable
          ? {
              units: markUnitUnavailable(
                asUnits(data?.units),
                rental.unitId,
                input.note || DEFAULT_UNAVAILABLE_NOTES[input.condition],
              ),
            }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

/** Altera a devolução de um aluguel ativo, sem cruzar outra reserva da mesma cópia. */
export async function changeDueDate(rentalId: string, dueDate: string): Promise<void> {
  const db = getAdminDb();
  await db.runTransaction(async (tx) => {
    const { rentalRef, rental, gameRef, gameSnap } = await readRentalAndGame(db, tx, rentalId);
    if (rental.status !== "reserved" && rental.status !== "picked_up") throw invalidStatus();
    if (dueDate < rental.startDate) {
      throw new ApiError(400, "invalid_body", "Corpo da requisição inválido.");
    }

    if (gameSnap.exists) {
      const data = gameSnap.data();
      const bookings = asBookings(data?.bookings);
      const game = {
        units: asUnits(data?.units),
        bookings,
        rentalDays: Number(data?.rentalDays ?? 0),
      };
      if (!canChangeDueDate(game, rentalId, dueDate, todaySP())) {
        throw new ApiError(
          409,
          "due_date_conflict",
          "A nova data cruza com outra reserva desta cópia.",
        );
      }
      tx.update(gameRef, {
        bookings: updateBooking(bookings, rentalId, { dueDate }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(rentalRef, { dueDate });
  });
}

/** Bloqueia ou desbloqueia um cliente (o cadastro precisa existir). */
export async function setCustomerBlocked(
  uid: string,
  blocked: boolean,
  reason?: string,
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("rentalCustomers").doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "not_found", "Cliente não encontrado.");
    tx.update(ref, {
      isBlocked: blocked,
      blockedReason: blocked ? reason : FieldValue.delete(),
    });
  });
}
