/**
 * Valida o destino de redirecionamento (?next=). Só aceita caminhos do
 * próprio site; devolve null para qualquer outra coisa.
 */
export function safeNextPath(next: string | null, origin: string): string | null {
  if (!next || !next.startsWith("/")) return null;
  // Controles (tab, quebra de linha...) e barra invertida são descartados
  // pelo navegador ao interpretar a URL e podem virar "//dominio".
  if (/[\x00-\x1F\x7F\\]/.test(next)) return null;
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Repassa o destino (?next=) para a próxima página do fluxo de conta. */
export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
