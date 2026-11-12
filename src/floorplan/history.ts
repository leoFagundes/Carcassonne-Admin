/** Desfazer/refazer da edição da planta (puro, para testar e usar com useReducer). */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 100;

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Nova versão, que pode ser desfeita. */
export function pushHistory<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}

/** Troca a versão atual sem criar passo (durante um arrasto). */
export function previewHistory<T>(h: History<T>, next: T): History<T> {
  return next === h.present ? h : { ...h, present: next };
}

/** Fecha um arrasto: o passo desfeito volta para `base` (o estado de antes). */
export function commitHistory<T>(h: History<T>, base: T): History<T> {
  if (h.present === base) return h;
  return { past: [...h.past, base].slice(-HISTORY_LIMIT), present: h.present, future: [] };
}

export function undoHistory<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redoHistory<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}
