import "server-only";
import { FieldValue, type DocumentSnapshot } from "firebase-admin/firestore";
import { asBookings, removeBooking } from "@/rental/bookings";
import {
  customerDeletionBlock,
  isRentalFinished,
  paymentsAllowDeletion,
  rentalDeletionBlock,
  unpaidGraceApplies,
  type DeletionOptions,
} from "@/rental/deletion";
import { getPaymentProvider, paymentsStatus } from "./payments";
import type { RentalOrderType, RentalType } from "@/types";
import { ApiError, isDocId } from "./apiHelpers";
import { getAdminAuth, getAdminDb } from "./firebaseAdmin";

// Exclusão definitiva pelo admin. As regras (o que pode sair) ficam em
// `@/rental/deletion`; aqui cada exclusão relê tudo numa transação, então um
// aluguel que mudou de situação no meio do caminho não é apagado.

export const MAX_RENTALS_PER_DELETE = 200;
/** Folga abaixo do limite de 500 escritas por transação do Firestore. */
const MAX_ACCOUNT_DOCS = 450;

export interface DeleteRentalsResult {
  deleted: number;
  skipped: { id: string; message: string }[];
}

const unique = <T,>(list: T[]) => [...new Set(list)];

/** Consultas ao Mercado Pago por exclusão (o resto espera o prazo normal). */
const MAX_PROVIDER_CHECKS = 40;

/**
 * Pedidos online não pagos ainda no prazo: pergunta ao Mercado Pago se há
 * algum pagamento aprovado ou em andamento. Sem nenhum, o pedido pode sair já
 * (nada vai chegar depois). Erro na consulta → continua no prazo, por garantia.
 */
async function verifyUnpaidOrders(orders: { id: string; order: RentalOrderType }[]): Promise<Set<string>> {
  const verified = new Set<string>();
  if (!paymentsStatus().configured) return verified;
  const now = Date.now();
  const candidates = orders.filter((o) => unpaidGraceApplies(o.order, now)).slice(0, MAX_PROVIDER_CHECKS);
  for (const { id } of candidates) {
    try {
      const found = (await getPaymentProvider().findPaymentsByReference(id)).filter((p) => p.externalReference === id);
      if (paymentsAllowDeletion(found)) verified.add(id);
    } catch (error) {
      console.error(`Exclusão: não foi possível consultar o pedido ${id} no Mercado Pago; fica no prazo:`, error);
    }
  }
  return verified;
}

/**
 * Apaga aluguéis encerrados (devolvidos/cancelados) cujo pedido não tem
 * dinheiro em aberto. O que não pode sair volta em `skipped` com o motivo.
 * Quando o último aluguel de um pedido sai, o pedido (com os dados do
 * pagamento) sai junto.
 */
export async function deleteRentals(ids: string[], opts: DeletionOptions = {}): Promise<DeleteRentalsResult> {
  const db = getAdminDb();
  const rentalsCol = db.collection("rentals");
  const result: DeleteRentalsResult = { deleted: 0, skipped: [] };

  // Agrupa por pedido (uma transação por pedido); a situação é conferida de novo lá dentro.
  const snaps = await db.getAll(...ids.map((id) => rentalsCol.doc(id)));
  const groups = new Map<string, string[]>();
  for (const snap of snaps) {
    if (!snap.exists) {
      result.skipped.push({ id: snap.id, message: "Aluguel não encontrado (talvez já excluído)." });
      continue;
    }
    const orderId = String(snap.data()?.orderId ?? "");
    groups.set(orderId, [...(groups.get(orderId) ?? []), snap.id]);
  }

  // Pedido online não pago: o Mercado Pago confirma na hora se ainda pode chegar pagamento.
  const orderIds = [...groups.keys()].filter(isDocId);
  const orderSnaps = orderIds.length
    ? await db.getAll(...orderIds.map((id) => db.collection("rentalOrders").doc(id)))
    : [];
  const verifiedUnpaid = await verifyUnpaidOrders(
    orderSnaps.filter((s) => s.exists).map((s) => ({ id: s.id, order: s.data() as RentalOrderType })),
  );
  const withProvider: DeletionOptions = { ...opts, verifiedUnpaid };

  for (const [orderId, groupIds] of groups) {
    const outcome = await deleteRentalGroup(orderId, groupIds, withProvider);
    result.deleted += outcome.deleted;
    result.skipped.push(...outcome.skipped);
  }
  return result;
}

async function deleteRentalGroup(orderId: string, ids: string[], opts: DeletionOptions): Promise<DeleteRentalsResult> {
  const db = getAdminDb();
  const rentalsCol = db.collection("rentals");
  const orderRef = isDocId(orderId) ? db.collection("rentalOrders").doc(orderId) : null;

  return db.runTransaction(async (tx) => {
    const skipped: DeleteRentalsResult["skipped"] = [];
    const now = Date.now();

    const orderSnap = orderRef ? await tx.get(orderRef) : null;
    const order = orderSnap?.exists ? { ...(orderSnap.data() as RentalOrderType), id: orderSnap.id } : undefined;

    const allIds = unique([...ids, ...(order?.rentalIds ?? [])]);
    const rentalSnaps = await tx.getAll(...allIds.map((id) => rentalsCol.doc(id)));
    const byId = new Map(rentalSnaps.map((s) => [s.id, s]));

    const doomed: { id: string; rental: RentalType }[] = [];
    for (const id of ids) {
      const snap = byId.get(id);
      if (!snap?.exists) {
        skipped.push({ id, message: "Aluguel não encontrado (talvez já excluído)." });
        continue;
      }
      const rental = snap.data() as RentalType;
      const block = rentalDeletionBlock(rental, order, now, opts);
      if (block) skipped.push({ id, message: block });
      else doomed.push({ id, rental });
    }
    if (doomed.length === 0) return { deleted: 0, skipped };

    // A reserva do jogo sai junto (em andamento, na exclusão forçada, libera a cópia).
    const gameIds = unique(doomed.map((d) => d.rental.gameId).filter(isDocId));
    const gameSnaps: DocumentSnapshot[] = gameIds.length
      ? await tx.getAll(...gameIds.map((id) => db.collection("rentalGames").doc(id)))
      : [];

    // ---- escritas (todas as leituras acima) ----
    const doomedIds = new Set(doomed.map((d) => d.id));
    for (const gameSnap of gameSnaps) {
      if (!gameSnap.exists) continue;
      const before = asBookings(gameSnap.data()?.bookings);
      const after = [...doomedIds].reduce((list, id) => removeBooking(list, id), before);
      if (after.length !== before.length) {
        tx.update(gameSnap.ref, { bookings: after, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    for (const id of doomedIds) tx.delete(rentalsCol.doc(id));

    if (orderRef && order) {
      const orderEmpty = order.rentalIds.every((id) => doomedIds.has(id) || !byId.get(id)?.exists);
      if (orderEmpty) tx.delete(orderRef);
    }
    return { deleted: doomed.length, skipped };
  });
}

/**
 * Apaga o histórico de aluguéis de um cliente (a conta continua). Normal: só
 * os encerrados; forçado: também os em andamento, liberando as cópias.
 */
export async function deleteCustomerHistory(uid: string, opts: DeletionOptions = {}): Promise<DeleteRentalsResult> {
  const snap = await getAdminDb().collection("rentals").where("customerUid", "==", uid).get();
  const ids = snap.docs
    .filter((d) => opts.force || isRentalFinished(d.data() as RentalType))
    .map((d) => d.id);
  const result: DeleteRentalsResult = { deleted: 0, skipped: [] };
  for (let i = 0; i < ids.length; i += MAX_RENTALS_PER_DELETE) {
    const part = await deleteRentals(ids.slice(i, i + MAX_RENTALS_PER_DELETE), opts);
    result.deleted += part.deleted;
    result.skipped.push(...part.skipped);
  }
  return result;
}

/**
 * Apaga uma conta de vez: login (Firebase Auth), cadastro de cliente, índice
 * do CPF, acesso de admin/pedido de acesso e o histórico de aluguéis e pedidos.
 * Só se não houver aluguel em andamento nem dinheiro em aberto. Ninguém apaga
 * a própria conta (assim sempre sobra pelo menos um admin).
 */
export async function deleteAccount(
  uid: string,
  actorUid: string,
  opts: DeletionOptions = {},
): Promise<{ rentals: number }> {
  if (uid === actorUid) {
    throw new ApiError(400, "cannot_delete_self", "Você não pode excluir a sua própria conta.");
  }
  const db = getAdminDb();
  const customerRef = db.collection("rentalCustomers").doc(uid);
  const adminRef = db.collection("admins").doc(uid);
  const requestRef = db.collection("adminRequests").doc(uid);

  // Master só sai por outro master.
  const actorSnap = await adminRef.parent.doc(actorUid).get();
  const actorIsMaster = actorSnap.exists && actorSnap.data()?.role === "master";
  // Pedidos online não pagos: confere no Mercado Pago antes (fora da transação).
  const ownOrders = await db.collection("rentalOrders").where("customerUid", "==", uid).get();
  const verifiedUnpaid = await verifyUnpaidOrders(
    ownOrders.docs.map((d) => ({ id: d.id, order: d.data() as RentalOrderType })),
  );

  const rentalsDeleted = await db.runTransaction(async (tx) => {
    const rentalsSnap = await tx.get(db.collection("rentals").where("customerUid", "==", uid));
    const ordersSnap = await tx.get(db.collection("rentalOrders").where("customerUid", "==", uid));
    const [customerSnap, adminSnap, requestSnap] = await tx.getAll(customerRef, adminRef, requestRef);
    if (adminSnap.exists && adminSnap.data()?.role === "master" && !actorIsMaster) {
      throw new ApiError(403, "master_protected", "Esta conta é master: só outro master pode excluí-la.");
    }
    const cpf = String(customerSnap.data()?.cpf ?? "");
    const cpfRef = cpf && isDocId(cpf) ? db.collection("rentalCpfIndex").doc(cpf) : null;
    const cpfSnap = cpfRef ? await tx.get(cpfRef) : null;

    const rentals = rentalsSnap.docs.map((d) => d.data() as RentalType);
    const orders = ordersSnap.docs.map((d) => ({ ...(d.data() as RentalOrderType), id: d.id }));
    const block = customerDeletionBlock(rentals, orders, Date.now(), { ...opts, verifiedUnpaid });
    if (block) throw new ApiError(409, "account_busy", block);

    // Forçado com aluguel em andamento: a reserva sai do jogo e a cópia fica livre.
    const activeIds = new Set(rentalsSnap.docs.filter((d) => !isRentalFinished(d.data() as RentalType)).map((d) => d.id));
    const activeGameIds = unique(
      rentalsSnap.docs
        .filter((d) => activeIds.has(d.id))
        .map((d) => String((d.data() as RentalType).gameId))
        .filter(isDocId),
    );
    const gameSnaps = activeGameIds.length
      ? await tx.getAll(...activeGameIds.map((id) => db.collection("rentalGames").doc(id)))
      : [];

    const total = rentalsSnap.size + ordersSnap.size + 4;
    if (total > MAX_ACCOUNT_DOCS) {
      throw new ApiError(
        409,
        "account_too_large",
        "Esta conta tem histórico demais para apagar de uma vez. Exclua primeiro os aluguéis encerrados dela na aba Aluguéis.",
      );
    }

    // ---- escritas ----
    for (const game of gameSnaps) {
      if (!game.exists) continue;
      const before = asBookings(game.data()?.bookings);
      const after = [...activeIds].reduce((list, id) => removeBooking(list, id), before);
      if (after.length !== before.length) {
        tx.update(game.ref, { bookings: after, updatedAt: FieldValue.serverTimestamp() });
      }
    }
    for (const doc of rentalsSnap.docs) tx.delete(doc.ref);
    for (const doc of ordersSnap.docs) tx.delete(doc.ref);
    if (customerSnap.exists) tx.delete(customerRef);
    if (adminSnap.exists) tx.delete(adminRef);
    if (requestSnap.exists) tx.delete(requestRef);
    // O índice só sai se ainda aponta para esta conta.
    if (cpfRef && cpfSnap?.exists && cpfSnap.data()?.uid === uid) tx.delete(cpfRef);
    return rentalsSnap.size;
  });

  try {
    await getAdminAuth().deleteUser(uid);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== "auth/user-not-found") {
      console.error(`Exclusão de conta: dados apagados, mas o login ${uid} não foi removido:`, error);
      throw new ApiError(
        502,
        "auth_delete_failed",
        "Os dados foram apagados, mas não foi possível remover o login. Tente excluir de novo.",
      );
    }
  }
  return { rentals: rentalsDeleted };
}
