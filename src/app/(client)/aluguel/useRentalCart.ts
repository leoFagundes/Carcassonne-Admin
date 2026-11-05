"use client";

import { useCallback, useEffect, useState } from "react";

export const RENTAL_CART_KEY = "carcassonne-rental-cart";

function readCart(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RENTAL_CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeCart(ids: string[]) {
  try {
    localStorage.setItem(RENTAL_CART_KEY, JSON.stringify(ids));
  } catch {
    // segue sem guardar
  }
}

/** Carrinho do aluguel, guardado no aparelho e sincronizado entre abas. */
export function useRentalCart() {
  const [gameIds, setGameIds] = useState<string[]>([]);

  useEffect(() => {
    setGameIds(readCart());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === RENTAL_CART_KEY) setGameIds(readCart());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((change: (current: string[]) => string[]) => {
    // Lê do armazenamento para não sobrescrever o que outra aba mudou
    const next = change(readCart());
    writeCart(next);
    setGameIds(next);
  }, []);

  const add = useCallback(
    (id: string) => update((current) => (current.includes(id) ? current : [...current, id])),
    [update],
  );
  const remove = useCallback(
    (id: string) => update((current) => current.filter((item) => item !== id)),
    [update],
  );
  const clear = useCallback(() => update(() => []), [update]);
  const has = useCallback((id: string) => gameIds.includes(id), [gameIds]);

  return { gameIds, add, remove, clear, has };
}
