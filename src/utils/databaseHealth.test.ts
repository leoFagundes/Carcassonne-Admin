import { describe, expect, it } from "vitest";
import type { LinkType } from "@/types";
import {
  FINISHED_RENTALS_HINT,
  daysBefore,
  healthItems,
  rentalGameGaps,
  staleLinks,
  type HealthInput,
} from "@/utils/databaseHealth";

const clean: HealthInput = {
  boardgamesNoImage: 0,
  boardgamesNoDescription: 0,
  menuNoPrice: 0,
  rentalGamesNoCopies: 0,
  rentalGamesNoImage: 0,
  staleLinks: [],
  pendingAdminRequests: 0,
  finishedRentals: 0,
};

describe("daysBefore", () => {
  it("volta os dias pelo calendário", () => {
    expect(daysBefore("2026-03-01", 1)).toBe("2026-02-28");
    expect(daysBefore("2026-11-30", 90)).toBe("2026-09-01");
  });
});

describe("staleLinks", () => {
  it("visível sem clique recente entra; oculto e com clique recente não", () => {
    const links: Pick<LinkType, "name" | "isVisible" | "clicksByDay">[] = [
      { name: "Instagram", clicksByDay: { "2026-11-20": 3 } },
      { name: "Antigo", clicksByDay: { "2026-01-01": 9 } },
      { name: "Nunca clicado" },
      { name: "Oculto", isVisible: false },
      { name: "Zerado", clicksByDay: { "2026-11-20": 0 } },
    ];
    expect(staleLinks(links, "2026-11-30")).toEqual(["Antigo", "Nunca clicado", "Zerado"]);
  });
});

describe("rentalGameGaps", () => {
  it("só conta jogos ativos; cópia indisponível não vale", () => {
    const unit = (status: "active" | "unavailable") => ({ id: "u", label: "C", status });
    expect(
      rentalGameGaps([
        { isActive: true, image: "x", units: [unit("active")] },
        { isActive: true, image: "", units: [unit("unavailable")] },
        { isActive: true, image: " ", units: [] },
        { isActive: false, image: "", units: [] },
      ]),
    ).toEqual({ noCopies: 2, noImage: 2 });
  });
});

describe("healthItems", () => {
  it("tudo em ordem: lista vazia", () => {
    expect(healthItems(clean)).toEqual([]);
  });

  it("monta o texto no singular/plural com o atalho certo", () => {
    const items = healthItems({ ...clean, boardgamesNoImage: 1, menuNoPrice: 3, rentalGamesNoCopies: 2 });
    expect(items.map((i) => [i.text, i.href])).toEqual([
      ["1 jogo da ludoteca sem imagem", "/collection"],
      ["3 itens do cardápio sem preço", "/menu"],
      ["2 jogos ativos para aluguel sem nenhuma cópia ativa (aparece indisponível)", "/aluguel-admin?tab=jogos"],
    ]);
  });

  it("links parados mostram até 3 nomes", () => {
    const [item] = healthItems({ ...clean, staleLinks: ["A", "B", "C", "D"] });
    expect(item.text).toBe("4 links visíveis sem cliques há 90 dias: A, B, C…");
    expect(item.tone).toBe("info");
  });

  it("encerrados só aparecem a partir do limite", () => {
    expect(healthItems({ ...clean, finishedRentals: FINISHED_RENTALS_HINT - 1 })).toEqual([]);
    expect(healthItems({ ...clean, finishedRentals: FINISHED_RENTALS_HINT })).toHaveLength(1);
  });
});
