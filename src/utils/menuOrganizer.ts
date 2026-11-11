import type { InfoType, MenuItemType, TypeOrderType } from "@/types";

/**
 * Regras do modal "Categorias e avisos": ordem de categorias, subcategorias e
 * avisos. Tudo aqui é puro (sem Firestore) para poder ser testado.
 */

type Entry = TypeOrderType;
type TypeData = TypeOrderType["type"];

/** Posição de cada categoria e subcategoria = posição na lista. */
export function normalizeTypes(list: readonly Entry[]): Entry[] {
  return list.map((entry, index) => ({
    ...entry,
    type: {
      ...entry.type,
      order: index,
      subtypes: entry.type.subtypes.map((sub, subIndex) => ({ ...sub, order: subIndex })),
    },
  }));
}

/** JSON com as chaves em ordem: dois objetos iguais dão o mesmo texto. */
export function stableKey(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

/** A lista mudou desde a última vez que foi salva (ou carregada)? */
export function typesChanged(current: readonly Entry[], baseline: readonly Entry[]): boolean {
  return stableKey(normalizeTypes(current)) !== stableKey(normalizeTypes(baseline));
}

/**
 * O que gravar: cada categoria (com id) cuja versão normalizada difere do que
 * está no banco. `saved` é o que veio do banco, sem normalizar, então uma
 * ordem antiga repetida (0, 0, 0) também é corrigida ao salvar.
 */
export function typesToSave(
  current: readonly Entry[],
  saved: readonly Entry[],
): { id: string; type: TypeData }[] {
  const byId = new Map(saved.filter((e) => e.id).map((e) => [e.id as string, stableKey(e.type)]));
  return normalizeTypes(current)
    .filter((e): e is Entry & { id: string } => !!e.id)
    .filter((e) => byId.get(e.id) !== stableKey(e.type))
    .map((e) => ({ id: e.id, type: e.type }));
}

/** Avisos na ordem em que o site mostra (sem prioridade contam como 0). */
export function sortInfos<T extends Pick<InfoType, "orderPriority">>(infos: readonly T[]): T[] {
  return [...infos].sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0));
}

/** Prioridade de cada aviso = posição na lista. */
export function normalizeInfos<T extends InfoType>(list: readonly T[]): T[] {
  return list.map((info, index) => ({ ...info, orderPriority: index }));
}

export function infosChanged(current: readonly InfoType[], baseline: readonly InfoType[]): boolean {
  const ids = (list: readonly InfoType[]) => list.map((i) => i.id ?? i.name).join("\u0000");
  return ids(current) !== ids(baseline);
}

/** Avisos (com id) cuja prioridade no banco é diferente da posição atual. */
export function infosToSave(
  current: readonly InfoType[],
  saved: readonly InfoType[],
): { id: string; orderPriority: number }[] {
  const byId = new Map(saved.filter((i) => i.id).map((i) => [i.id as string, i.orderPriority]));
  return current
    .map((info, index) => ({ id: info.id, orderPriority: index }))
    .filter((i): i is { id: string; orderPriority: number } => !!i.id && byId.get(i.id) !== i.orderPriority);
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

export function sameName(a: string, b: string): boolean {
  return fold(a) === fold(b);
}

/** Erro ao adicionar um nome (vazio ou repetido), ou null se pode. */
export function nameError(name: string, existing: readonly string[], what: string): string | null {
  if (!name.trim()) return `Escreva o nome da ${what}.`;
  const twin = existing.find((n) => sameName(n, name));
  if (twin === undefined) return null;
  return twin.trim() === name.trim()
    ? `"${twin}" já está na lista.`
    : `Já existe "${twin}" na lista (só muda acento ou maiúscula).`;
}

/**
 * Categorias usadas nos itens do cardápio que ainda não estão na lista. Compara
 * o nome exato, como o site faz ao montar as seções.
 */
export function missingTypes(items: readonly Pick<MenuItemType, "type">[], list: readonly Entry[]): string[] {
  const names = new Set(list.map((e) => e.type.name));
  const out = new Set<string>();
  for (const item of items) {
    if (item.type && item.type.trim() && !names.has(item.type)) out.add(item.type);
  }
  return [...out].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Subcategorias usadas nos itens desta categoria que ainda não foram adicionadas (nome exato). */
export function missingSubtypes(
  items: readonly Pick<MenuItemType, "type" | "subtype">[],
  entry: Entry,
): string[] {
  const names = new Set(entry.type.subtypes.map((s) => s.name));
  const out = new Set<string>();
  for (const item of items) {
    if (item.type !== entry.type.name || !item.subtype || !item.subtype.trim()) continue;
    if (!names.has(item.subtype)) out.add(item.subtype);
  }
  return [...out].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Quantos itens do cardápio há em cada categoria e subcategoria. */
export function countItems(items: readonly Pick<MenuItemType, "type" | "subtype">[]) {
  const byType = new Map<string, number>();
  const bySubtype = new Map<string, number>();
  for (const item of items) {
    if (!item.type) continue;
    byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
    if (item.subtype) {
      const key = subtypeKey(item.type, item.subtype);
      bySubtype.set(key, (bySubtype.get(key) ?? 0) + 1);
    }
  }
  return { byType, bySubtype };
}

export function subtypeKey(type: string, subtype: string): string {
  return `${type}\u0000${subtype}`;
}

/** Chaves estáveis para subcategorias com o mesmo nome (dados antigos). */
export function subtypeKeys(subtypes: readonly { name: string }[]): string[] {
  const seen = new Map<string, number>();
  return subtypes.map((s) => {
    const n = seen.get(s.name) ?? 0;
    seen.set(s.name, n + 1);
    return `${s.name}#${n}`;
  });
}
