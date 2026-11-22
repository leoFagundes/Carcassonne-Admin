import type { AreaId, Guide } from "./types";
import { AREAS } from "./areas";
import { reservasGuides } from "./guides/reservas";
import { mapaGuides } from "./guides/mapa";
import { aluguelGuides } from "./guides/aluguel";
import { cardapioGuides } from "./guides/cardapio";
import { colecaoGuides } from "./guides/colecao";
import { eventosGuides } from "./guides/eventos";
import { musicasGuides, linksGuides } from "./guides/musicasLinks";
import { configuracoesGuides } from "./guides/configuracoes";
import { usuariosGuides, temasGuides, extrasGuides } from "./guides/usuariosTemasExtras";

export { AREAS, areaOf } from "./areas";
export type { AreaId, Guide } from "./types";

export const GUIDES: Guide[] = [
  ...reservasGuides,
  ...mapaGuides,
  ...aluguelGuides,
  ...cardapioGuides,
  ...colecaoGuides,
  ...eventosGuides,
  ...musicasGuides,
  ...linksGuides,
  ...usuariosGuides,
  ...configuracoesGuides,
  ...temasGuides,
  ...extrasGuides,
];

const BY_ID = new Map(GUIDES.map((g) => [g.id, g]));
export const guideById = (id: string | null | undefined) => (id ? BY_ID.get(id) : undefined);

/** As tarefas do dia a dia, na entrada da Ajuda. */
export const POPULAR: string[] = [
  "bloquear-dia-reservas",
  "reembolsar-pedido",
  "pdf-cardapio",
  "esconder-item-cardapio",
  "estado-da-mesa",
  "registrar-devolucao",
  "criar-reserva",
  "aluguel-balcao",
];

/** Guias de uma área, agrupados pela seção (na ordem em que aparecem). */
export function guidesByArea(area: AreaId): { section: string; guides: Guide[] }[] {
  const out: { section: string; guides: Guide[] }[] = [];
  for (const g of GUIDES.filter((x) => x.area === area)) {
    const last = out.find((s) => s.section === g.section);
    if (last) last.guides.push(g);
    else out.push({ section: g.section, guides: [g] });
  }
  return out;
}

export const countByArea = (area: AreaId) => GUIDES.filter((g) => g.area === area).length;

export const AREA_IDS = AREAS.map((a) => a.id);
