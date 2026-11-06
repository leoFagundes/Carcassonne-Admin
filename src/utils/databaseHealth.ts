import type { LinkType, RentalGameType } from "@/types";

/**
 * "Saúde dos dados" (Configurações → Estatísticas → Banco de dados): o que
 * provavelmente está faltando ou sobrando, cada item com um atalho para resolver.
 */

export interface HealthItem {
  key: string;
  text: string;
  href: string;
  /** "warn" = algo faltando que o cliente vê; "info" = sugestão de arrumação. */
  tone: "warn" | "info";
}

export interface HealthInput {
  boardgamesNoImage: number;
  boardgamesNoDescription: number;
  menuNoPrice: number;
  rentalGamesNoCopies: number;
  rentalGamesNoImage: number;
  staleLinks: string[];
  pendingAdminRequests: number;
  finishedRentals: number;
}

/** A partir de quantos aluguéis encerrados vale sugerir a limpeza. */
export const FINISHED_RENTALS_HINT = 50;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Data "YYYY-MM-DD" `days` dias antes de `today`. */
export function daysBefore(today: string, days: number): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Links visíveis sem nenhum clique nos últimos `days` dias (pelo `clicksByDay`). */
export function staleLinks(
  links: Pick<LinkType, "name" | "isVisible" | "clicksByDay">[],
  today: string,
  days = 90,
): string[] {
  const cutoff = daysBefore(today, days);
  return links
    .filter((l) => l.isVisible !== false)
    .filter((l) => !Object.entries(l.clicksByDay ?? {}).some(([day, n]) => day >= cutoff && n > 0))
    .map((l) => l.name);
}

/** Jogos de aluguel ativos que o cliente vê sem cópia disponível ou sem foto. */
export function rentalGameGaps(games: Pick<RentalGameType, "isActive" | "units" | "image">[]): {
  noCopies: number;
  noImage: number;
} {
  const active = games.filter((g) => g.isActive);
  return {
    noCopies: active.filter((g) => !(g.units ?? []).some((u) => u.status === "active")).length,
    noImage: active.filter((g) => !g.image?.trim()).length,
  };
}

export function healthItems(input: HealthInput): HealthItem[] {
  const items: HealthItem[] = [];
  const add = (cond: boolean, item: HealthItem) => cond && items.push(item);

  add(input.boardgamesNoImage > 0, {
    key: "bg-image",
    text: `${plural(input.boardgamesNoImage, "jogo da ludoteca", "jogos da ludoteca")} sem imagem`,
    href: "/collection",
    tone: "warn",
  });
  add(input.boardgamesNoDescription > 0, {
    key: "bg-description",
    text: `${plural(input.boardgamesNoDescription, "jogo da ludoteca", "jogos da ludoteca")} sem descrição`,
    href: "/collection",
    tone: "warn",
  });
  add(input.menuNoPrice > 0, {
    key: "menu-price",
    text: `${plural(input.menuNoPrice, "item do cardápio", "itens do cardápio")} sem preço`,
    href: "/menu",
    tone: "warn",
  });
  add(input.rentalGamesNoCopies > 0, {
    key: "rental-copies",
    text: `${plural(input.rentalGamesNoCopies, "jogo ativo", "jogos ativos")} para aluguel sem nenhuma cópia ativa (aparece indisponível)`,
    href: "/aluguel-admin?tab=jogos",
    tone: "warn",
  });
  add(input.rentalGamesNoImage > 0, {
    key: "rental-image",
    text: `${plural(input.rentalGamesNoImage, "jogo ativo", "jogos ativos")} para aluguel sem imagem`,
    href: "/aluguel-admin?tab=jogos",
    tone: "warn",
  });
  add(input.pendingAdminRequests > 0, {
    key: "admin-requests",
    text: `${plural(input.pendingAdminRequests, "pedido", "pedidos")} de acesso ao admin esperando aprovação`,
    href: "/usuarios",
    tone: "warn",
  });
  add(input.staleLinks.length > 0, {
    key: "stale-links",
    text: `${plural(input.staleLinks.length, "link visível", "links visíveis")} sem cliques há 90 dias: ${input.staleLinks.slice(0, 3).join(", ")}${input.staleLinks.length > 3 ? "…" : ""}`,
    href: "/links",
    tone: "info",
  });
  add(input.finishedRentals >= FINISHED_RENTALS_HINT, {
    key: "finished-rentals",
    text: `${input.finishedRentals} aluguéis encerrados guardados — dá para limpar em "Excluir encerrados"`,
    href: "/aluguel-admin?tab=alugueis",
    tone: "info",
  });
  return items;
}
