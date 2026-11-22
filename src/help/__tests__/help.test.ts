import { describe, expect, it } from "vitest";
import { AREAS, GUIDES, POPULAR, guideById, guidesByArea } from "../index";
import { concepts, normalize, searchGuides } from "../search";

describe("conteúdo da Ajuda", () => {
  it("ids únicos e no formato de endereço", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("todo guia tem título, resumo e algum conteúdo; área existe", () => {
    const areaIds = new Set(AREAS.map((a) => a.id));
    for (const g of GUIDES) {
      expect(g.title.trim(), g.id).not.toBe("");
      expect(g.summary.trim(), g.id).not.toBe("");
      expect((g.steps?.length ?? 0) + (g.points?.length ?? 0), g.id).toBeGreaterThan(0);
      expect(areaIds.has(g.area), g.id).toBe(true);
      for (const t of [...(g.steps ?? []), ...(g.points ?? []), ...(g.tips ?? [])]) expect(t.trim(), g.id).not.toBe("");
    }
  });

  it("relacionados e mais procurados apontam para guias que existem", () => {
    for (const g of GUIDES) for (const r of g.related ?? []) expect(guideById(r), `${g.id} → ${r}`).toBeTruthy();
    for (const id of POPULAR) expect(guideById(id), id).toBeTruthy();
  });

  it("links internos começam com / e externos com https", () => {
    for (const g of GUIDES) if (g.link) expect(g.link.href, g.id).toMatch(/^(\/[^/]|https:\/\/)/);
  });

  it("negrito sempre fechado (pares de **)", () => {
    for (const g of GUIDES) {
      for (const t of [g.title, g.summary, g.warning ?? "", ...(g.steps ?? []), ...(g.points ?? []), ...(g.tips ?? [])]) {
        expect((t.match(/\*\*/g) ?? []).length % 2, `${g.id}: ${t}`).toBe(0);
      }
    }
  });

  it("toda área tem guias, agrupados por seção", () => {
    for (const a of AREAS) expect(guidesByArea(a.id).length, a.id).toBeGreaterThan(0);
  });
});

describe("busca da Ajuda", () => {
  const top = (q: string) => searchGuides(GUIDES, q).slice(0, 3).map((g) => g.id);

  it("ignora acento, maiúscula e palavras como 'como'", () => {
    expect(normalize("Reservás  CARDÁPIO")).toBe("reservas cardapio");
    expect(concepts("como eu faço para cancelar")).toEqual([expect.arrayContaining(["cancelar"])]);
  });

  it("sinônimos: estornar e devolver dinheiro acham o reembolso", () => {
    expect(top("estornar")[0]).toBe("reembolsar-pedido");
    expect(top("devolver dinheiro do aluguel")).toContain("reembolsar-pedido");
  });

  it("tarefas comuns aparecem no topo", () => {
    expect(top("bloquear um dia")).toContain("bloquear-dia-reservas");
    expect(top("feriado")).toContain("bloquear-dia-reservas");
    expect(top("pdf do cardápio")[0]).toBe("pdf-cardapio");
    expect(top("esconder item do cardapio")).toContain("esconder-item-cardapio");
    expect(top("freela")).toContain("freelancers");
    expect(top("juntar mesas")[0]).toBe("juntar-mesas");
    expect(top("qr code")).toContain("pdf-qr-code");
  });

  it("começo de palavra também acha; busca vazia não acha nada", () => {
    expect(top("reemb")).toContain("reembolsar-pedido");
    expect(searchGuides(GUIDES, "  ")).toEqual([]);
    expect(searchGuides(GUIDES, "como o de")).toEqual([]);
  });

  it("sem guia com todas as palavras, mostra os que têm mais", () => {
    expect(searchGuides(GUIDES, "cancelar xyzqw").length).toBeGreaterThan(0);
  });
});
