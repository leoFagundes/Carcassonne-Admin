import type { AreaId } from "./types";

/** Áreas da Ajuda, na ordem em que aparecem (o ícone fica na página). */
export const AREAS: { id: AreaId; label: string; description: string; href?: string }[] = [
  { id: "reservas", label: "Reservas", description: "Reservas do dia, freelancers e impressão", href: "/myreserves" },
  { id: "mapa", label: "Mapa de mesas", description: "Mesas do dia, planta do pub e armários de jogos", href: "/mapa" },
  { id: "aluguel", label: "Aluguel", description: "Pedidos, retiradas, devoluções e pagamentos", href: "/aluguel-admin" },
  { id: "cardapio", label: "Cardápio", description: "Itens, categorias, popups e o PDF", href: "/menu" },
  { id: "colecao", label: "Coleção", description: "Os jogos do pub mostrados no site", href: "/collection" },
  { id: "eventos", label: "Eventos", description: "Quiz, bolão e votação de fantasias", href: "/eventos" },
  { id: "musicas", label: "Músicas", description: "Sugestões de música dos clientes", href: "/musicRecommendation" },
  { id: "links", label: "Links", description: "A página de links (linktree)", href: "/links" },
  { id: "usuarios", label: "Usuários", description: "Quem pode entrar no admin", href: "/usuarios" },
  { id: "configuracoes", label: "Configurações", description: "Regras do site, e-mails e estatísticas", href: "/carcassonne" },
  { id: "temas", label: "Temas", description: "Visual de datas especiais no site", href: "/carcassonne?tab=temas" },
  { id: "extras", label: "Atalhos e curiosidades", description: "Página Adicionar, segredos e o projeto" },
];

export const areaOf = (id: AreaId) => AREAS.find((a) => a.id === id)!;
