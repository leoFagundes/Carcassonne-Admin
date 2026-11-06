export const PENDING_ORDER_KEY = "carcassonne-rental-pending-order";
export const PENDING_ORDER_TTL_MS = 2 * 60 * 60 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStore(): Store | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Guarda o pedido online recém-criado (o cliente está indo pagar). */
export function rememberPendingOrder(orderId: string, nowMs = Date.now(), store = defaultStore()) {
  try {
    store?.setItem(PENDING_ORDER_KEY, JSON.stringify({ orderId, at: nowMs }));
  } catch {
    // segue sem guardar
  }
}

/** Lê e apaga o ponteiro; null se não houver ou estiver vencido. */
export function takePendingOrder(nowMs = Date.now(), store = defaultStore()): string | null {
  try {
    const raw = store?.getItem(PENDING_ORDER_KEY);
    store?.removeItem(PENDING_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.orderId === "string" && nowMs - parsed.at < PENDING_ORDER_TTL_MS) {
      return parsed.orderId;
    }
  } catch {
    // ignora
  }
  return null;
}

export function clearPendingOrder(store = defaultStore()) {
  try {
    store?.removeItem(PENDING_ORDER_KEY);
  } catch {
    // ignora
  }
}

/** Na página do próprio pedido o ponteiro já cumpriu o papel: apaga se for este pedido. */
export function clearPendingOrderIf(orderId: string, store = defaultStore()) {
  try {
    const raw = store?.getItem(PENDING_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.orderId === orderId) store?.removeItem(PENDING_ORDER_KEY);
  } catch {
    // ignora
  }
}
