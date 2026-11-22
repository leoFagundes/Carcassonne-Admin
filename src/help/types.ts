/**
 * Conteúdo da Ajuda do admin: guias curtos, em passos, organizados por área.
 * Os textos aceitam **negrito** (nomes de botões, menus e abas).
 */

export type AreaId =
  | "reservas"
  | "mapa"
  | "colecao"
  | "aluguel"
  | "cardapio"
  | "eventos"
  | "musicas"
  | "links"
  | "usuarios"
  | "configuracoes"
  | "temas"
  | "extras";

export type Guide = {
  /** Endereço do guia (/ajuda?guia=id): só letras minúsculas, números e hífen. */
  id: string;
  area: AreaId;
  /** Grupo dentro da área (ex.: "Freelancers", "Pagamento online"). */
  section: string;
  /** Escrito como tarefa: "Cancelar um aluguel pago". */
  title: string;
  /** Uma frase: para que serve ou o resultado. */
  summary: string;
  /** Passos numerados, na ordem. */
  steps?: string[];
  /** Pontos soltos (para guias que explicam como algo funciona). */
  points?: string[];
  /** Algo que pode dar errado ou não tem volta. */
  warning?: string;
  /** Atalhos e jeitos mais rápidos. */
  tips?: string[];
  /** Outras palavras que alguém usaria para procurar (sinônimos, apelidos). */
  keywords?: string[];
  /** Botão "Abrir esta tela". Endereço interno (começa com /) ou externo (https). */
  link?: { href: string; label: string };
  /** Ids de outros guias. */
  related?: string[];
};
