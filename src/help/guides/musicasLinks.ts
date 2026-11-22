import type { Guide } from "../types";

const MUS = { href: "/musicRecommendation", label: "Abrir Músicas" };
const LINKS = { href: "/links", label: "Abrir Links" };

export const musicasGuides: Guide[] = [
  {
    id: "conhecer-musicas",
    area: "musicas",
    section: "Sugestões de música",
    title: "Ver as músicas sugeridas pelos clientes",
    summary: "Da mais recente para a mais antiga, atualizando sozinha.",
    points: [
      "Cada card mostra a data e hora do envio e a música sugerida.",
      "A página procura sugestões novas a cada 10 segundos.",
      "Fora da página, um selo dourado em **Músicas** no menu conta as novas; some ao abrir a página.",
    ],
    keywords: ["música", "sugestão", "playlist", "pedido de música"],
    link: MUS,
    related: ["copiar-musica", "esconder-botao-musica"],
  },
  {
    id: "copiar-musica",
    area: "musicas",
    section: "Sugestões de música",
    title: "Copiar o nome de uma música",
    summary: "Para buscar no Spotify ou YouTube sem digitar.",
    steps: ["Toque no card da sugestão: o nome vai para a área de transferência."],
    keywords: ["copiar", "spotify", "youtube"],
    link: MUS,
  },
  {
    id: "apagar-musica",
    area: "musicas",
    section: "Sugestões de música",
    title: "Apagar uma sugestão de música",
    summary: "Depois de tocar a música, por exemplo.",
    steps: ["Toque na **lixeira** do card e confirme."],
    warning: "Não tem como desfazer.",
    keywords: ["apagar", "excluir", "deletar"],
    link: MUS,
  },
  {
    id: "esconder-botao-musica",
    area: "musicas",
    section: "Sugestões de música",
    title: "Esconder o botão de sugerir música no site",
    summary: "Os clientes param de ver a opção; as sugestões continuam salvas.",
    steps: ["No topo de Músicas, desmarque **Ícone visível para clientes** (passa a mostrar \"Ícone invisível para clientes\")."],
    points: ["O ícone aparece nas páginas do cardápio e da ludoteca."],
    tips: ["Também dá para desligar a área inteira em Configurações → Geral → **Áreas do site**."],
    keywords: ["esconder", "desligar", "botão de música"],
    link: MUS,
  },
];

export const linksGuides: Guide[] = [
  {
    id: "conhecer-links",
    area: "links",
    section: "Página de links",
    title: "Conhecer a página de Links",
    summary: "Os botões da página de links (linktree) do Carcassonne.",
    points: [
      "Cada link tem nome, endereço, ícone, descrição e um contador de cliques.",
      "A ordem aqui é a ordem no site.",
      "O **link externo** no topo (**Ir para visão do cliente**) abre a página de links numa aba nova.",
    ],
    keywords: ["linktree", "links", "instagram"],
    link: LINKS,
    related: ["adicionar-link", "ordenar-links"],
  },
  {
    id: "adicionar-link",
    area: "links",
    section: "Página de links",
    title: "Adicionar um link",
    summary: "Um botão novo na página de links.",
    steps: [
      "Toque no **+** no topo de Links (ou no atalho **Link** da página Adicionar).",
      "Preencha o nome, o endereço, uma descrição curta e escolha um ícone.",
      "Salve. O link já entra visível.",
    ],
    keywords: ["novo link", "botão"],
    link: { href: "/links?createlink=true", label: "Adicionar um link" },
  },
  {
    id: "editar-link",
    area: "links",
    section: "Página de links",
    title: "Editar ou esconder um link",
    summary: "Sem perder o contador de cliques.",
    steps: [
      "**Editar**: toque no **lápis** do card e mude nome, endereço, descrição ou ícone.",
      "**Esconder**: toque no **olho**. O link fica apagado no admin e some do site.",
    ],
    keywords: ["editar", "esconder", "ocultar", "mudar link"],
    link: LINKS,
  },
  {
    id: "ordenar-links",
    area: "links",
    section: "Página de links",
    title: "Mudar a ordem dos links",
    summary: "Salva sozinho a cada movimento.",
    steps: ["Use as **setas** (cima e baixo) à esquerda de cada link."],
    keywords: ["ordem", "reordenar", "subir", "descer"],
    link: LINKS,
  },
];
