"use client";

import React, { useState } from "react";
import {
  LuCalendar,
  LuDices,
  LuPizza,
  LuMusic,
  LuExternalLink,
  LuListPlus,
  LuSettings,
  LuTrophy,
  LuChevronDown,
  LuSearch,
  LuCircleHelp,
  LuEgg,
  LuCode,
  LuGithub,
} from "react-icons/lu";

interface HelpCard {
  title: string;
  description: string;
  category: string;
  link?: string;
  linkLabel?: string;
}

const categories = [
  { key: "todos", label: "Todos", icon: <LuCircleHelp size={14} /> },
  { key: "reservas", label: "Reservas", icon: <LuCalendar size={14} /> },
  { key: "colecao", label: "Coleção", icon: <LuDices size={14} /> },
  { key: "cardapio", label: "Cardápio", icon: <LuPizza size={14} /> },
  { key: "musicas", label: "Músicas", icon: <LuMusic size={14} /> },
  { key: "links", label: "Links", icon: <LuExternalLink size={14} /> },
  { key: "eventos", label: "Eventos", icon: <LuTrophy size={14} /> },
  { key: "adicionar", label: "Adicionar", icon: <LuListPlus size={14} /> },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: <LuSettings size={14} />,
  },
  { key: "easteregg", label: "Easter Egg", icon: <LuEgg size={14} /> },
  {
    key: "desenvolvedor",
    label: "Desenvolvedor",
    icon: <LuCode size={14} />,
  },
];

const helpCards: HelpCard[] = [
  // ── RESERVAS ──────────────────────────────────────────────────
  {
    category: "reservas",
    title: "Visão geral da página de Reservas",
    description:
      "A página é dividida em dois painéis. À esquerda fica o Carcarlendário (calendário de seleção de data) e o resumo do dia: número de pessoas confirmadas, freelancers escalados, reservas ativas e reservas canceladas. À direita ficam listadas todas as reservas do dia selecionado, agrupadas por horário.",
  },
  {
    category: "reservas",
    title: "Como navegar entre datas",
    description:
      "Clique em qualquer data no Carcarlendário para carregar as reservas daquele dia. A lista da direita e o resumo de estatísticas atualizam automaticamente. Para ver o mês inteiro com um resumo visual (quantas pessoas, reservas ativas e canceladas por dia), clique no ícone de lupa ao lado do título 'Carcarlendário' para abrir o calendário expandido.",
  },
  {
    category: "reservas",
    title: "Como criar uma nova reserva manualmente",
    description:
      "Clique no ícone de calendário com + (tooltip: 'Criar uma nova reserva') no cabeçalho da página. Um formulário abrirá em modal com a data já preenchida com o dia selecionado. Preencha nome, telefone, e-mail, horário, adultos, crianças e observação. Outra forma de chegar no mesmo formulário é pela página Adicionar → 'Adicionar Reserva'.",
  },
  {
    category: "reservas",
    title: "Como confirmar ou cancelar uma reserva",
    description:
      "Cada reserva exibe um ícone de status no canto esquerdo — ícone verde significa confirmada, ícone vermelho significa cancelada. Clique nesse ícone para abrir o menu de ações da reserva. O menu mostra as opções: 'confirmar reserva', 'cancelar reserva', 'excluir reserva' e 'editar reserva'. Apenas a opção oposta ao status atual aparece (se está confirmada, só aparece 'cancelar'; se está cancelada, só aparece 'confirmar').",
  },
  {
    category: "reservas",
    title: "Como editar uma reserva existente",
    description:
      "Clique no ícone de status da reserva (verde ou vermelho) para abrir o menu de ações e escolha 'editar reserva'. O mesmo formulário de criação abrirá com os dados já preenchidos para alteração.",
  },
  {
    category: "reservas",
    title: "Como atribuir uma mesa a uma reserva",
    description:
      "Reservas confirmadas mostram um campo de texto 'mesa' no canto direito do card. Digite o código ou número da mesa diretamente nesse campo — a alteração é salva automaticamente no banco de dados ao digitar.",
  },
  {
    category: "reservas",
    title: "Como entrar em contato com o cliente pela reserva",
    description:
      "No detalhe da reserva aparece o telefone e o e-mail. Clique no telefone para abrir o WhatsApp com o número preenchido. Clique no e-mail para abrir o cliente de e-mail com um modelo de mensagem já formatado com os dados da reserva (data, horário, número de pessoas).",
  },
  {
    category: "reservas",
    title: "Como imprimir a lista de reservas do dia",
    description:
      "Clique no ícone de impressora no cabeçalho (disponível em telas maiores). Abrirá um modal com visualização de impressão e opções de configuração: incluir horário, incluir checkboxes de presença, incluir observações, posição do layout, marca d'água, tamanho da fonte e separar adultos de crianças. Depois de configurar, use Ctrl+P do navegador para imprimir ou salvar como PDF.",
  },
  {
    category: "reservas",
    title: "Como gerenciar os freelancers",
    description:
      "Clique no ícone de pessoas (tooltip: 'Gerenciar freelancers') no cabeçalho, ou vá em Adicionar → 'Gerenciar Freelancers'. Isso abre a página /myreserves/freelancer, onde cada freelancer é cadastrado uma única vez e pode ser escalado em um ou vários dias de uma vez, sem precisar digitar o nome de novo a cada agendamento. Clique num freelancer da lista para expandir e ver os dias agendados dele, adicionar novos dias, mudar o status (confirmado ou sobreaviso) e o status de pagamento de cada dia, tudo na mesma tela — sem precisar navegar dia a dia no calendário. Por padrão só aparecem os agendamentos dos últimos 7 dias em diante; use 'Ver todos os agendamentos antigos' para revelar o histórico completo, e 'Excluir agendamentos antigos' para limpar tudo que passou desse período de uma vez.",
  },
  {
    category: "reservas",
    title: "Como os freelancers aparecem na página de Reservas",
    description:
      "Os freelancers escalados para o dia selecionado continuam aparecendo no painel esquerdo de /myreserves, na seção 'Freelas', com os mesmos controles rápidos de status e pagamento.",
  },
  {
    category: "reservas",
    title: "Como excluir reservas em lote",
    description:
      "Para excluir todas as reservas do dia selecionado, clique no botão 'Excluir reservas de hoje' que aparece no rodapé do painel esquerdo quando há reservas. Para excluir todas as reservas de um mês inteiro, abra o calendário expandido (ícone de lupa) e clique em 'Excluir reservas de MM/AAAA' no rodapé do modal — o mês exibido é o mês atualmente visível no calendário.",
  },
  {
    category: "reservas",
    title: "O que significa reserva cancelada vs excluída",
    description:
      "Cancelar mantém o registro com status 'cancelada', registrando quem cancelou (usuário ou admin) e a data. A reserva fica visível com destaque vermelho. Excluir remove permanentemente o documento do banco de dados, sem possibilidade de recuperação.",
  },
  {
    category: "reservas",
    title: "Como ver a visão do cliente",
    description:
      "Clique no ícone de link externo (tooltip: 'Ir para visão do cliente') no cabeçalho para abrir a página de reservas que os clientes utilizam em uma nova aba.",
  },

  // ── COLEÇÃO ───────────────────────────────────────────────────
  {
    category: "colecao",
    title: "Visão geral da página de Coleção",
    description:
      "Exibe todos os jogos de tabuleiro cadastrados no sistema. No topo há uma barra de busca por nome ou descrição, filtros por tipo e por dificuldade, e três checkboxes de filtro rápido: mostrar só jogos em destaque, só jogos ocultos, e só jogos à venda. A lista atualiza em tempo real conforme os filtros mudam.",
  },
  {
    category: "colecao",
    title: "Como adicionar um novo jogo",
    description:
      "Para adicionar um jogo à coleção vá em Adicionar → 'Adicionar Jogo'. Preencha nome, descrição, dificuldade, número mínimo e máximo de jogadores, tempo de jogo, tipos (pode ser mais de um), e defina se está visível, em destaque e à venda. A imagem pode ser adicionada via URL.",
  },
  {
    category: "colecao",
    title: "Como editar um jogo existente",
    description:
      "Na página Coleção, clique no card do jogo para abrir o formulário de edição em modal. Todos os campos podem ser alterados. Salve para aplicar as mudanças instantaneamente no site.",
  },
  {
    category: "colecao",
    title: "Como destacar um jogo",
    description:
      "No formulário de edição do jogo, ative a opção 'Em destaque'. Jogos destacados aparecem com prioridade na vitrine do site. Use o filtro 'Só em destaque' na página Coleção para visualizar apenas os jogos destacados.",
  },
  {
    category: "colecao",
    title: "Como ocultar um jogo sem excluí-lo",
    description:
      "No formulário de edição do jogo, desative a opção 'Visível'. O jogo permanece no banco de dados mas não aparece para os clientes no site. É possível visualizar jogos ocultos pelo filtro 'Só ocultos' na página Coleção.",
  },
  {
    category: "colecao",
    title: "Como marcar um jogo como à venda",
    description:
      "No formulário de edição, ative a opção 'À venda'. Jogos à venda são exibidos com uma indicação especial no site. Use o filtro 'Só à venda' na página Coleção para visualizar apenas esses jogos.",
  },

  // ── CARDÁPIO ──────────────────────────────────────────────────
  {
    category: "cardapio",
    title: "Visão geral do Cardápio",
    description:
      "A página Cardápio exibe todos os itens cadastrados (pratos, bebidas etc.), organizados por tipo e subtipo. No topo há filtros por tipo, subtipo e busca por nome. As categorias e sua ordem são gerenciadas pela opção 'Ordenar Tipos' na página Adicionar.",
  },
  {
    category: "cardapio",
    title: "Como adicionar um item ao cardápio",
    description:
      "Vá em Adicionar → 'Adicionar Item'. Preencha nome, descrição, valor, tipo e subtipo, se é vegano e se é item em foco. O item só aparece no site quando a opção 'Visível' estiver ativada. Avisos e complementos opcionais também podem ser adicionados no formulário.",
  },
  {
    category: "cardapio",
    title: "Como adicionar uma descrição a um tipo",
    description:
      "Vá em Adicionar → 'Adicionar Descrição'. Isso permite adicionar um texto descritivo a uma categoria existente do cardápio, como uma explicação sobre um tipo de prato. Esse texto aparece acima dos itens daquela categoria no site.",
  },
  {
    category: "cardapio",
    title: "Como adicionar um combo",
    description:
      "Vá em Adicionar → 'Adicionar Combo'. Preencha nome, descrição e valor do combo. Combos aparecem em uma seção própria no cardápio do site, separada dos itens comuns.",
  },
  {
    category: "cardapio",
    title: "Como adicionar um aviso ao cardápio",
    description:
      "Vá em Adicionar → 'Adicionar Aviso'. Um aviso (Info) é um bloco de texto institucional que aparece no cardápio, como um aviso sobre taxas, políticas ou informações especiais. Você pode adicionar múltiplos valores/linhas por aviso.",
  },
  {
    category: "cardapio",
    title: "Como reordenar tipos e subtipos do cardápio",
    description:
      "Vá em Adicionar → 'Ordenar Tipos'. Aqui você cria, edita e reordena os tipos (ex: 'Pratos Quentes') e subtipos (ex: 'Massas') que organizam o cardápio. A ordem definida aqui reflete diretamente na exibição do site.",
  },
  {
    category: "cardapio",
    title: "Como exportar o cardápio em PDF",
    description:
      "Na página Cardápio, clique no botão 'PDF' no cabeçalho. Uma versão formatada do cardápio abrirá em uma nova aba, pronta para impressão. Use Ctrl+P no navegador para salvar como PDF ou imprimir diretamente.",
  },

  // ── MÚSICAS ───────────────────────────────────────────────────
  {
    category: "musicas",
    title: "Visão geral da página de Músicas",
    description:
      "Exibe todas as recomendações de músicas enviadas pelos clientes pelo site, ordenadas da mais recente para a mais antiga. Cada card mostra a data/hora do envio e o nome da música sugerida. A página verifica novas recomendações automaticamente a cada 10 segundos.",
  },
  {
    category: "musicas",
    title: "Como copiar o nome de uma música",
    description:
      "Clique em qualquer card de recomendação para copiar o nome da música para a área de transferência. Uma notificação confirma a cópia. Isso facilita pesquisar a música no Spotify ou YouTube sem precisar digitar.",
  },
  {
    category: "musicas",
    title: "Como deletar uma recomendação",
    description:
      "Clique no ícone de lixeira no canto direito do card da recomendação. Uma confirmação será solicitada antes de excluir. A remoção é permanente.",
  },
  {
    category: "musicas",
    title: "Como controlar a visibilidade do ícone de música para clientes",
    description:
      "No topo da página há um checkbox que controla se o ícone de sugestão de música fica visível para os clientes no site (nas páginas do cardápio e do acervo de jogos). Quando desativado, os clientes não veem a opção de sugerir músicas, mas as sugestões existentes permanecem no banco.",
  },
  {
    category: "musicas",
    title: "Como funciona o badge de notificação de músicas",
    description:
      "Quando um cliente envia uma nova sugestão de música enquanto você está em outra página do admin, aparece um badge dourado com o número de novas sugestões ao lado de 'Músicas' na sidebar. Ao entrar na página de Músicas, o badge some automaticamente. O controle das sugestões já vistas é feito por localStorage no navegador.",
  },

  // ── LINKS ─────────────────────────────────────────────────────
  {
    category: "links",
    title: "Visão geral da página de Links",
    description:
      "Gerencia os links que aparecem na página de linktree do Carcassonne. Cada link tem nome, URL, ícone, descrição e um contador de cliques. Os links são exibidos no site na ordem definida aqui.",
  },
  {
    category: "links",
    title: "Como adicionar um link",
    description:
      "Clique no ícone de + no cabeçalho da página Links, ou vá em Adicionar → 'Adicionar um Link'. Preencha o nome exibido, a URL de destino, uma descrição curta e escolha um ícone da biblioteca de ícones disponível. O link é criado como visível por padrão.",
  },
  {
    category: "links",
    title: "Como reordenar os links",
    description:
      "Cada card de link tem duas setas (cima e baixo) no lado esquerdo. Clique nelas para mover o link uma posição para cima ou para baixo. A nova ordem é salva automaticamente no banco de dados após cada movimento (uma mensagem 'Salvando nova ordem...' aparece brevemente).",
  },
  {
    category: "links",
    title: "Como ocultar um link sem excluí-lo",
    description:
      "Clique no ícone de olho no card do link para alternar entre visível e oculto. Links ocultos ficam com opacidade reduzida na lista do admin e não aparecem na página de linktree dos clientes. O contador de cliques continua sendo mantido.",
  },
  {
    category: "links",
    title: "Como editar um link",
    description:
      "Clique no ícone de lápis no card do link para abrir o formulário de edição. Você pode alterar nome, URL, descrição e ícone. A URL que aparece no card é clicável e abre a página de destino em nova aba.",
  },
  {
    category: "links",
    title: "Como ver a página de linktree do cliente",
    description:
      "Clique no ícone de link externo (tooltip: 'Ir para visão do cliente') no cabeçalho da página Links. A página de linktree que os clientes acessam abrirá em uma nova aba.",
  },

  // ── EVENTOS ───────────────────────────────────────────────────
  {
    category: "eventos",
    title: "Visão geral da página de Eventos",
    description:
      "Gerencia todos os eventos do Carcassonne. Cada evento tem um subtipo: Quiz (perguntas com pontuação) ou Bolão (palpites de partidas). Eventos inativos não aparecem para os clientes. Ao selecionar um evento na lista, um painel de gerenciamento abre à direita com abas específicas para o tipo de evento.",
  },
  {
    category: "eventos",
    title: "Como criar um novo evento",
    description:
      "Clique no ícone de + no cabeçalho, ou vá em Adicionar → 'Adicionar Evento'. Preencha nome, descrição, escolha um ícone e defina o subtipo (Quiz ou Bolão). O evento começa inativo. Para que os clientes vejam, ative-o pelo toggle de ativo/inativo no painel do evento.",
  },
  {
    category: "eventos",
    title: "Como configurar as perguntas do Quiz",
    description:
      "Com o evento de Quiz selecionado, clique na aba 'Perguntas'. Clique em '+ Nova pergunta' para adicionar. Cada pergunta tem: texto, tipo (múltipla escolha ou texto livre), alternativas (para MC), opção correta, pontuação e tempo em segundos para responder. Use os steppers +/- para ajustar tempo (incrementos de 5s) e pontos (incrementos de 1). Edição de perguntas é bloqueada enquanto o quiz estiver rodando.",
  },
  {
    category: "eventos",
    title: "Como iniciar e encerrar um Quiz",
    description:
      "Na aba do Quiz, clique em 'Iniciar Quiz' (o quiz precisa ter ao menos uma pergunta). O cronômetro começa para todos os clientes que estão na página do evento. Um banner de aviso aparece indicando que o quiz está rodando. Ao final, clique em 'Encerrar Quiz' para marcar o status como finalizado.",
  },
  {
    category: "eventos",
    title: "Como liberar os resultados para os clientes",
    description:
      "Após encerrar o quiz, clique em 'Liberar Resultados'. Somente depois disso os clientes verão sua pontuação e o placar geral. Isso permite que o admin corrija questões de texto antes de tornar os resultados públicos.",
  },
  {
    category: "eventos",
    title: "Como corrigir questões de texto",
    description:
      "Na aba 'Participantes', clique em um participante para expandir seus detalhes. Para cada resposta de texto, aparecerão botões 'Certo' e 'Errado'. Ao corrigir, a pontuação total e o tempo de tiebreaker do participante são recalculados e atualizados imediatamente em tempo real, inclusive na tela do cliente se os resultados já foram liberados.",
  },
  {
    category: "eventos",
    title: "Como funciona o tempo de tiebreaker",
    description:
      "O tempo exibido no placar ao lado da pontuação representa a soma do tempo que o participante gastou apenas nas questões respondidas corretamente (em formato mm:ss.mmm com milissegundos). Em caso de empate na pontuação, quem tem menor tempo fica em posição melhor. Para questões de texto, o tempo só é contabilizado se o admin marcar como correta. O tooltip ao passar o mouse sobre o tempo explica esse critério.",
  },
  {
    category: "eventos",
    title: "Como ver o tempo de cada questão de um participante",
    description:
      "Na aba 'Participantes', expanda um participante. Abaixo das respostas, para cada questão aparece o tempo que aquele participante gastou nela (em segundos com milissegundos, ex: 3.456s). Isso permite analisar em qual pergunta o participante demorou mais.",
  },
  {
    category: "eventos",
    title: "Como coroar o campeão do Quiz",
    description:
      "Na aba 'Participantes', há um ícone de coroa ao lado do nome de cada participante. Clique na coroa do vencedor para coroá-lo como campeão. Clicar novamente remove a coroa. Quando os resultados são liberados, a tela do campeão exibe uma animação especial com confetti. Os outros participantes veem a tela de resultados normalmente.",
  },
  {
    category: "eventos",
    title: "Como reiniciar um Quiz",
    description:
      "Clique em 'Reiniciar Quiz'. Uma confirmação alertará que todos os participantes e respostas serão permanentemente excluídos. Após confirmar, o quiz volta para o status 'aguardando' e todos os clientes que estavam na página do evento retornam automaticamente à tela inicial de cadastro de nome, sem precisar recarregar a página.",
  },
  {
    category: "eventos",
    title: "O que o cliente vê durante o Quiz",
    description:
      "O cliente acessa a página do evento e cadastra seu nome. Enquanto o quiz não começou, vê uma tela de espera. Quando o quiz inicia, as questões aparecem uma por vez com countdown. Ao responder, vê uma tela 'Respondido!' com o tempo que levou para responder. Na última questão, a tela de espera permanece até o admin encerrar. Após encerramento e liberação dos resultados, o cliente vê sua pontuação e o placar geral.",
  },
  {
    category: "eventos",
    title: "Como funciona o Bolão",
    description:
      "Crie um evento do tipo Bolão. Na aba 'Times', adicione os times participantes (nome e imagem). Na aba 'Partidas', crie os confrontos definindo time A, time B e data. Os clientes acessam a página do evento, cadastram seu nome e preenchem os palpites de placar para cada partida.",
  },

  // ── ADICIONAR ─────────────────────────────────────────────────
  {
    category: "adicionar",
    title: "Visão geral da página Adicionar",
    description:
      "Hub central de criação de conteúdo. Agrupa atalhos para todos os formulários de cadastro do sistema em cards visuais. Alguns abrem um modal diretamente na página; outros redirecionam para a página correspondente já com o modal de criação aberto.",
  },
  {
    category: "adicionar",
    title: "O que cada card faz na página Adicionar",
    description:
      "Adicionar Jogo → abre formulário de novo jogo (modal). Adicionar Item → abre formulário de item do cardápio (modal). Adicionar Descrição → descrição de tipo de item existente (modal). Adicionar Combo → formulário de combo (modal). Adicionar Aviso → texto de aviso para o cardápio (modal). Adicionar Popup → popup do site (modal). Ordenar Tipos → gerencia tipos e subtipos do cardápio (modal). Adicionar Reserva → vai para Reservas com formulário aberto. Gerenciar Freelancers → vai para a página de gestão de freelancers (/myreserves/freelancer). Adicionar uma Música → vai para a página de recomendação de música do cliente. Adicionar um Link → vai para Links com formulário aberto. Adicionar Evento → vai para Eventos com formulário aberto.",
  },

  // ── CONFIGURAÇÕES ─────────────────────────────────────────────
  {
    category: "configuracoes",
    title: "Visão geral da página Configurações",
    description:
      "Centraliza estatísticas do sistema e as configurações globais do site. Está dividida em seções: estatísticas de reservas do mês atual, gráficos de distribuição de reservas por dia da semana, ranking de cliques nos links, informações do banco de dados, configurações gerais de reservas, efeitos visuais do site, e o editor do painel decorativo (mural).",
  },
  {
    category: "configuracoes",
    title: "Como interpretar as estatísticas de reservas",
    description:
      "Os 4 cards de KPI no topo mostram para o mês atual: total de reservas (com breakdown confirmadas/canceladas), total de pessoas confirmadas (com média por reserva), taxa de cancelamento em % (fica vermelho se passar de 20%) e o horário mais popular seguido do dia da semana mais popular. Abaixo há um gráfico de barras com reservas por dia da semana, alternável entre 'últimos 30 dias' e 'total histórico', e um gráfico de pizza mostrando a proporção confirmadas vs canceladas.",
  },
  {
    category: "configuracoes",
    title: "Como ver o ranking de cliques nos links",
    description:
      "Na seção de estatísticas existe um gráfico de barras com o ranking de cliques em cada link, ordenado do mais clicado para o menos. Cada clique de cliente na página de linktree é registrado automaticamente.",
  },
  {
    category: "configuracoes",
    title: "Como configurar a capacidade de reservas",
    description:
      "Na seção de configurações gerais há dois campos numéricos: 'Capacidade máxima por dia' (total de pessoas aceitas por dia) e 'Capacidade máxima por reserva' (máximo de pessoas em uma única reserva). O site bloqueia novos agendamentos quando o limite diário é atingido.",
  },
  {
    category: "configuracoes",
    title: "Como configurar horários disponíveis para reserva",
    description:
      "Na seção de configurações gerais, o campo 'Horários disponíveis' permite adicionar e remover os horários que os clientes podem escolher ao fazer uma reserva (ex: 18:00, 19:30, 21:00). Clique no campo, digite o horário no formato HH:MM e pressione Enter para adicionar.",
  },
  {
    category: "configuracoes",
    title: "Como bloquear dias da semana para reservas",
    description:
      "Na seção de configurações gerais, o campo 'Dias desabilitados' permite selecionar dias da semana em que o sistema não aceita reservas (ex: Domingo e Segunda). Os dias bloqueados ficam desabilitados no calendário de reservas do site.",
  },
  {
    category: "configuracoes",
    title: "Como definir o prazo máximo de antecedência para reservas",
    description:
      "O campo 'Meses de antecedência' define até quantos meses à frente os clientes podem fazer reservas. O campo 'Horas para fechar reserva' define quantas horas antes do horário marcado o sistema para de aceitar novas reservas para aquele horário.",
  },
  {
    category: "configuracoes",
    title: "Como controlar os efeitos visuais do site",
    description:
      "Na seção de efeitos visuais há três toggles: 'Efeito de clique' (faíscas ao clicar), 'Seguir cursor' (elemento que acompanha o mouse) e 'Canvas cursor' (efeito canvas no cursor). As mudanças entram em vigor para todos os visitantes após salvar.",
  },
  {
    category: "configuracoes",
    title: "Como salvar as configurações gerais",
    description:
      "Após alterar qualquer configuração geral (capacidade, horários, dias, antecedência, efeitos), clique no botão 'Salvar' no rodapé da seção. A página recarrega automaticamente para aplicar as mudanças.",
  },
  {
    category: "configuracoes",
    title: "Como editar o painel decorativo (mural)",
    description:
      "No final da página Configurações há o editor do mural — o painel visual decorativo exibido na página inicial do site. Você pode reposicionar, redimensionar e rotacionar cada elemento arrastando-os na visualização. As alterações são salvas ao clicar em salvar.",
  },
  {
    category: "configuracoes",
    title: "Como adicionar um popup no site",
    description:
      "Vá em Adicionar → 'Adicionar Popup'. Um popup é um banner que aparece automaticamente para os clientes ao entrar no site. Você define a imagem, o label e se está ativo. Apenas popups com 'ativo' habilitado são exibidos.",
  },

  // ── EASTER EGG ────────────────────────────────────────────────
  {
    category: "easteregg",
    title: "Como desbloquear o easter egg da página de login",
    description: `Na página de login existem 7 pontos minúsculos (bolinhas pretas de 1px) espalhados pela tela — são quase invisíveis, mas estão lá. Clicar em qualquer um deles abre um tooltip que fica fixo na tela.

6 dos pontos contêm curiosidades numeradas de 1 a 6 sobre a cidade medieval de Carcassonne, na França. Em cada curiosidade, uma ou duas letras aparecem destacadas em dourado no meio do texto.

O 7º ponto (lado esquerdo da tela, na altura do meio) é diferente: revela a dica da sequência — "4 - 1 - 3 - espaço - 6 - 2 - 5" — e um campo de texto para digitar a resposta.

Para montar a senha, leia as letras douradas de cada curiosidade na ordem indicada pela dica:
• Curiosidade 4 → K, L
• Curiosidade 1 → A, U
• Curiosidade 3 → S
• [espaço]
• Curiosidade 6 → J, Ü
• Curiosidade 2 → R, G
• Curiosidade 5 → E, N

Resultado: "Klaus Jürgen". Digite exatamente isso no campo do 7º ponto e pressione a seta →.

Ao acertar, a página é desbloqueada: o fundo muda para a arte do jogo de tabuleiro Carcassonne e dois cards aparecem nos cantos da tela (só em desktop) — um com a foto e a biografia de Klaus-Jürgen Wrede, o designer alemão que criou o jogo em 2000, e outro com a foto e a história de Fábio Almeida e Salimar Morais, os fundadores do Carcassonne Pub em 2013. Para voltar à visão padrão, clique em "Voltar à visão padrão" no rodapé.`,
  },
  {
    category: "easteregg",
    title: "Como desbloquear o Snake escondido",
    description:
      "Clique 5 vezes bem rápido (menos de 1 segundo entre cada clique) na logo do Carcassonne no topo da barra lateral. Ao completar os 5 cliques, você é levado direto para a página /snake — um joguinho da cobrinha com tema dourado/preto do painel. Jogue com as setas do teclado ou WASD (ou arraste/use os botões na tela no celular), e aperte espaço ou toque na tela pra pausar/continuar. Existe um placar global: toda vez que alguém supera o recorde atual, um campo aparece na hora para digitar um nome e salvar aquela pontuação no placar — pontuações que não batem o recorde não entram na lista, só recordes reais ficam registrados.",
  },

  // ── DESENVOLVEDOR ─────────────────────────────────────────────
  {
    category: "desenvolvedor",
    title: "Tecnologias usadas no projeto",
    description:
      "O Carcassonne Admin é construído em Next.js (App Router) com React e TypeScript. O estilo visual usa Tailwind CSS, com componentes de UI do HeroUI e Radix, ícones do Lucide (via react-icons) e animações com Framer Motion. Os dados são armazenados no Firebase (Firestore) e o Firebase Admin cuida das operações protegidas no servidor. Calendários usam FullCalendar e react-calendar, gráficos usam Recharts, e o envio de e-mails é feito com Resend e React Email.",
  },
  {
    category: "desenvolvedor",
    title: "Repositório do projeto no GitHub",
    description:
      "O código-fonte do Carcassonne Admin está hospedado no GitHub. Acesse o link abaixo para ver o repositório, o histórico de commits e a documentação técnica.",
    link: "https://github.com/leoFagundes/Carcassonne-Admin",
    linkLabel: "github.com/leoFagundes/Carcassonne-Admin",
  },
];

function AccordionCard({
  card,
  isOpen,
  onToggle,
}: {
  card: HelpCard;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cat = categories.find((c) => c.key === card.category);

  return (
    <div
      className={`border rounded-lg transition-all duration-200 cursor-pointer select-none ${
        isOpen
          ? "border-primary-gold/30 bg-primary-gold/5"
          : "border-primary-gold/10 bg-primary-black/30 hover:border-primary-gold/20 hover:bg-primary-gold/[0.03]"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-primary-gold/40 text-xs shrink-0">
            <span>{cat?.icon}</span>
            <span className="hidden sm:inline">{cat?.label}</span>
          </div>
          <span
            className={`text-sm font-medium transition-colors truncate ${isOpen ? "text-primary-gold" : "text-primary-gold/75"}`}
          >
            {card.title}
          </span>
        </div>
        <LuChevronDown
          size={16}
          className={`shrink-0 text-primary-gold/40 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary-gold/60" : ""}`}
        />
      </div>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-primary-gold/60 leading-relaxed border-t border-primary-gold/10 pt-3 whitespace-pre-line">
          {card.description}
          {card.link && (
            <a
              href={card.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex items-center gap-2 w-fit text-primary-gold/80 hover:text-primary-gold underline underline-offset-2 transition-colors"
            >
              <LuGithub size={14} />
              {card.linkLabel ?? card.link}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function AjudaPage() {
  const [activeCategory, setActiveCategory] = useState("todos");
  const [search, setSearch] = useState("");
  const [openCard, setOpenCard] = useState<number | null>(null);

  const filtered = helpCards.filter((card) => {
    const matchCategory =
      activeCategory === "todos" || card.category === activeCategory;
    const matchSearch =
      search.trim() === "" ||
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary-gold">
          <LuCircleHelp size={22} />
          <h1 className="text-2xl font-semibold">Central de Ajuda</h1>
        </div>
        <p className="text-sm text-primary-gold/45">
          Encontre explicações sobre todas as funcionalidades do sistema.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <LuSearch
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-gold/35 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Buscar por palavra-chave..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpenCard(null);
          }}
          className="w-full bg-primary-black/40 border border-primary-gold/15 rounded-lg pl-9 pr-4 py-2.5 text-sm text-primary-gold placeholder:text-primary-gold/30 focus:outline-none focus:border-primary-gold/35 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const count =
            cat.key === "todos"
              ? helpCards.length
              : helpCards.filter((c) => c.category === cat.key).length;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => {
                setActiveCategory(cat.key);
                setOpenCard(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                isActive
                  ? "bg-primary-gold/15 border-primary-gold/40 text-primary-gold"
                  : "bg-transparent border-primary-gold/15 text-primary-gold/50 hover:border-primary-gold/25 hover:text-primary-gold/75"
              }`}
            >
              {cat.icon}
              {cat.label}
              <span
                className={`text-[10px] ${isActive ? "text-primary-gold/60" : "text-primary-gold/30"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-xs text-primary-gold/30">
        {filtered.length}{" "}
        {filtered.length === 1 ? "artigo encontrado" : "artigos encontrados"}
      </p>

      {/* Cards */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-primary-gold/30 text-sm">
            Nenhum artigo encontrado para &quot;{search}&quot;
          </div>
        ) : (
          filtered.map((card) => {
            const globalIdx = helpCards.indexOf(card);
            return (
              <AccordionCard
                key={globalIdx}
                card={card}
                isOpen={openCard === globalIdx}
                onToggle={() =>
                  setOpenCard(openCard === globalIdx ? null : globalIdx)
                }
              />
            );
          })
        )}
      </div>
    </div>
  );
}
