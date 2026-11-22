import type { Guide } from "../types";

const COL = { href: "/collection", label: "Abrir a Coleção" };

export const colecaoGuides: Guide[] = [
  {
    id: "conhecer-colecao",
    area: "colecao",
    section: "Jogos do pub",
    title: "Conhecer a página da Coleção",
    summary: "Todos os jogos de tabuleiro do pub mostrados no site.",
    points: [
      "Busca por nome, descrição ou categoria, sem precisar de acento (**/** vai direto a ela, **Esc** limpa).",
      "Filtros com a quantidade: **Situação** (todos, ocultos, destaques, à venda), **Categoria** e **Dificuldade**.",
      "Ao lado da busca, alterne entre grade (com foto) e lista; a escolha fica guardada.",
      "Jogos ocultos aparecem apagados, com borda tracejada e a etiqueta **Oculto**.",
    ],
    keywords: ["ludoteca", "jogos", "acervo", "boardgame"],
    link: COL,
    related: ["adicionar-jogo-colecao", "ocultar-destacar-jogo"],
  },
  {
    id: "adicionar-jogo-colecao",
    area: "colecao",
    section: "Jogos do pub",
    title: "Adicionar um jogo à Coleção",
    summary: "Jogo novo que chegou no pub.",
    steps: [
      "Toque no **+** (**Adicionar jogo**) no topo da Coleção.",
      "Preencha nome, descrição, dificuldade, jogadores (mínimo e máximo), tempo de jogo e tipos (pode ser mais de um).",
      "Coloque a imagem (por URL) e marque se está visível, em destaque e à venda.",
      "Salve.",
    ],
    tips: ["Também pelo atalho **Jogo da Coleção** da página Adicionar."],
    keywords: ["novo jogo", "cadastrar jogo", "jogo novo"],
    link: { href: "/collection?createjogo=true", label: "Adicionar um jogo" },
  },
  {
    id: "editar-jogo-colecao",
    area: "colecao",
    section: "Jogos do pub",
    title: "Editar um jogo da Coleção",
    summary: "As mudanças valem na hora no site.",
    steps: ["Toque no card do jogo, altere o que precisar e salve."],
    keywords: ["alterar jogo", "mudar foto", "corrigir"],
    link: COL,
  },
  {
    id: "ocultar-destacar-jogo",
    area: "colecao",
    section: "Jogos do pub",
    title: "Esconder, destacar ou pôr um jogo à venda",
    summary: "Direto no card, sem abrir o jogo.",
    steps: [
      "**Esconder**: toque no **olho** embaixo do card (ou desligue **Visível** no formulário).",
      "**Destacar**: toque no **brilho (✦)** (ou ligue **Em destaque**). Destaques aparecem primeiro no site.",
      "**À venda**: ligue **À venda** no formulário. O jogo ganha uma indicação especial no site.",
    ],
    points: [
      "Jogo escondido continua cadastrado; só some do site.",
      "Em **Situação**, as pílulas **Ocultos**, **Destaques** e **À venda** mostram só esses.",
      "Se der erro ao salvar pelo botão do card, ele volta como estava.",
    ],
    keywords: ["esconder", "ocultar", "destaque", "vender", "à venda"],
    link: COL,
  },
];
