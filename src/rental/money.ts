const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Centavos -> "R$ 45,00". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Texto -> centavos; null se vazio, negativo ou inválido. */
export function parseBRL(text: string): number | null {
  const clean = text.replace(/R\$/gi, "").replace(/\s/g, "");
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(clean) || /^\d+(,\d{1,2})?$/.test(clean)) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(clean)) {
    normalized = clean;
  } else {
    return null;
  }
  return Math.round(Number(normalized) * 100);
}
