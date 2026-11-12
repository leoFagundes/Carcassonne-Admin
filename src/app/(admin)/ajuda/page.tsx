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
  LuPackage,
  LuUsers,
  LuPalette,
  LuMap,
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
  { key: "mapa", label: "Mapa", icon: <LuMap size={14} /> },
  { key: "colecao", label: "Coleção", icon: <LuDices size={14} /> },
  { key: "aluguel", label: "Aluguel", icon: <LuPackage size={14} /> },
  { key: "cardapio", label: "Cardápio", icon: <LuPizza size={14} /> },
  { key: "musicas", label: "Músicas", icon: <LuMusic size={14} /> },
  { key: "links", label: "Links", icon: <LuExternalLink size={14} /> },
  { key: "eventos", label: "Eventos", icon: <LuTrophy size={14} /> },
  { key: "adicionar", label: "Adicionar", icon: <LuListPlus size={14} /> },
  { key: "usuarios", label: "Usuários", icon: <LuUsers size={14} /> },
  { key: "temas", label: "Temas", icon: <LuPalette size={14} /> },
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
      "Clique no ícone de calendário com + (tooltip: 'Criar uma nova reserva') no cabeçalho da página. Um formulário abrirá em modal com a data já preenchida com o dia selecionado. Preencha nome, telefone, e-mail, horário, quantidade de pessoas e observação. Outra forma de chegar no mesmo formulário é pelo atalho 'Nova Reserva' da página Adicionar.",
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
      "Clique no ícone de impressora no cabeçalho (disponível em telas maiores). Abrirá um modal com visualização de impressão e opções de configuração: incluir horário, incluir checkboxes de presença, incluir observações, posição do layout, marca d'água e tamanho da fonte. Depois de configurar, use Ctrl+P do navegador para imprimir ou salvar como PDF.",
  },
  {
    category: "reservas",
    title: "Como gerenciar os freelancers",
    description:
      "Clique no ícone de pessoas (tooltip: 'Gerenciar freelancers') no cabeçalho de /myreserves, ou use o atalho 'Freelancers' da página Adicionar. Isso abre a página /myreserves/freelancer, onde cada freelancer é cadastrado uma única vez — com nome, WhatsApp e observações opcionais, e uma foto opcional (enviada na hora ou escolhida do mural de fotos do Carcassonne) — e pode ser escalado em um ou vários dias sem precisar digitar o nome de novo a cada agendamento. Use a busca por nome e os filtros rápidos (Hoje, Próximos 7 dias, Pagamento pendente — cada um já mostra quantos resultados dá) pra achar rápido quem precisa de atenção; a lista vem ordenada com quem tem o próximo dia mais próximo no topo. Clique num freelancer pra expandir o card e ver os dias agendados dele, agendar novos dias, mudar status e pagamento de cada dia, editar os dados ou excluir o freelancer (isso remove também todos os agendamentos dele). Por padrão só aparecem os agendamentos de 7 dias atrás em diante; um agendamento mais antigo que isso só aparece clicando em 'Ver todos os agendamentos antigos', e pode ser limpo de uma vez com 'Excluir agendamentos antigos'.",
  },
  {
    category: "reservas",
    title: "Como agendar dias para um freelancer",
    description:
      "Dentro do card expandido de um freelancer, use o calendário em 'Agendar novo(s) dia(s)': cada clique num dia alterna ele na seleção (clique de novo pra tirar), sem precisar de um botão separado pra cada dia escolhido. Dias em que esse freelancer já está agendado aparecem riscados e não podem ser selecionados de novo, evitando duplicar. Depois de escolher os dias, clique em 'Salvar' pra criar todos os agendamentos de uma vez, já como confirmados e não pagos por padrão.",
  },
  {
    category: "reservas",
    title: "Como atribuir vários freelancers a um ou mais dias de uma vez",
    description:
      "No cabeçalho de /myreserves/freelancer, clique no ícone de calendário com intervalo (tooltip: 'Atribuir freelancers a um ou mais dias'). É o caminho inverso do agendamento dentro do card: em vez de escolher os dias de UM freelancer, você escolhe um ou mais dias primeiro e depois marca um ou mais freelancers numa lista com busca. Ao confirmar, é criado um agendamento pra cada combinação dia × freelancer — combinações que já existem são puladas automaticamente, e o resultado mostra quantos agendamentos foram criados e quantos já existiam.",
  },
  {
    category: "reservas",
    title: "Status de escala vs. status de pagamento dos freelancers",
    description:
      "Cada dia agendado tem dois status independentes. O status de escala alterna entre confirmado (vai trabalhar) e sobreaviso (só entra se precisar) — clique no ícone de status pra alternar. Pagamento (pago/não pago) só é cobrado de dias confirmados: sobreaviso não entra na contagem de 'pagamento pendente', nem no card do freelancer nem no resumo do topo da página, porque sobreaviso não significa que ele efetivamente trabalhou. A pendência também só considera dias de hoje pra trás — um dia confirmado no futuro ainda não é uma pendência, já que ainda não aconteceu.",
  },
  {
    category: "reservas",
    title: "Como os freelancers aparecem na página de Reservas",
    description:
      "Os freelancers escalados para o dia selecionado continuam aparecendo no painel esquerdo de /myreserves, na seção 'Freelas', com os mesmos controles rápidos de status e pagamento — seguindo a mesma regra de que só dias confirmados geram pendência de pagamento.",
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

  // ── MAPA ──────────────────────────────────────────────────────
  {
    category: "mapa",
    title: "Visão geral do Mapa do pub",
    description:
      "Abre pelo ícone de mapa no topo da página de Reservas, já no dia que estiver aberto lá. O Mapa mostra a planta do pub (térreo e subsolo) com cada mesa colorida pelo estado no dia escolhido: verde livre, amarelo reservada, vermelho ocupada e cinza indisponível. Tem dois modos: Dia a dia (para usar durante o expediente) e Planta (para acertar o desenho). Dá para ver em 2D, de cima, ou em 3D, girando com o dedo ou o mouse.",
  },
  {
    category: "mapa",
    title: "Como o mapa sabe quais mesas estão reservadas",
    description:
      "O mapa lê as reservas confirmadas do dia e o campo Mesa de cada uma, do jeito que a equipe já escreve: \"5\", \"3/8\", \"2,7,12\" ou \"salas\" (o nome de um ambiente marca todas as mesas dentro dele). Reserva que chegou deixa a mesa ocupada. Reservas sem mesa, ou com uma mesa que não existe no mapa, aparecem em \"Precisa de mesa\", com sugestões e o botão Escolher no mapa.",
  },
  {
    category: "mapa",
    title: "Como colocar uma reserva numa mesa pelo mapa",
    description:
      "Em \"Precisa de mesa\", toque em Escolher mesa e depois na mesa no mapa. Também dá para tocar na mesa e usar \"Colocar uma reserva nesta mesa\". A mesa é gravada na própria reserva, então aparece igual em Reservas. Para trocar, faça de novo; para tirar, use Tirar da mesa.",
  },
  {
    category: "mapa",
    title: "Como marcar uma mesa como ocupada, livre ou indisponível",
    description:
      "Toque na mesa e escolha o estado. No Automático, ela segue as reservas (reservada quando tem reserva, ocupada quando a reserva chega). Ocupada serve para cliente sem reserva; Livre, para quando a mesa vagou; Indisponível, para mesa quebrada ou guardada. A marcação vale só para aquele dia.",
  },
  {
    category: "mapa",
    title: "Como juntar mesas num dia",
    description:
      "Toque em Juntar mesas, depois nas mesas que vão ficar juntas, e confirme. Elas passam a valer como uma mesa só naquele dia: um estado, os lugares somados e as mesmas reservas. A reserva colocada no grupo fica com as mesas no formato \"2/3\". Para desfazer, toque no grupo e em Separar as mesas.",
  },
  {
    category: "mapa",
    title: "Como mudar mesas de lugar ou de nome só num dia",
    description:
      "Ligue Mover mesas e arraste a mesa (os bancos vão junto). Ao tocar numa mesa dá para girar, mudar o nome só naquele dia e retirá-la do mapa (ela fica em \"Retiradas neste dia\" para devolver). \"Desfazer mudanças do dia\" volta tudo para a planta. Os outros dias não mudam.",
  },
  {
    category: "mapa",
    title: "Como corrigir a planta (tamanhos, posições e nomes)",
    description:
      "No modo Planta, toque num item para escolher: arraste para mover, puxe as alças brancas para mudar o tamanho e a bolinha dourada para girar. No painel dá para digitar as medidas exatas em metros, o nome e os lugares da mesa, o tipo e o andar. Adicionar coloca mesas, bancos, paredes, portas e móveis novos. Nada vale até tocar em Salvar planta; Ctrl+Z desfaz.",
  },
  {
    category: "mapa",
    title: "Bancos presos às mesas",
    description:
      "Bancos e sofás podem ficar presos a uma mesa: quando ela se move ou gira, eles vão junto, na planta e no dia a dia. Para prender, escolha a mesa e os bancos (com Shift ou Ctrl) e toque em Prender à mesa. Para soltar, escolha o banco e toque em Soltar. Excluir uma mesa exclui os bancos presos a ela.",
  },
  {
    category: "mapa",
    title: "Duas pessoas editando a planta ao mesmo tempo",
    description:
      "Se outra pessoa salvar a planta enquanto você edita, o mapa avisa e, ao salvar, pergunta qual versão fica: a sua ou a dela. Nada é sobrescrito sem você escolher. As mudanças do dia a dia (estados, junções e mesas movidas) aparecem na hora para todo mundo.",
  },

  {
    category: "mapa",
    title: "Sincronizar as mesas com o campo \"mesa\" das reservas",
    description:
      "Em Dia a dia → Reservas e mesas, ligue \"Sincronizar com o campo mesa\". Assim o mapa segue o que está escrito em cada reserva: \"8, 9\" aparece como a 8 e a 9 juntas (uma mesa só, com os lugares somados) e \"salas\" junta as mesas que ficam dentro do ambiente Salas (24 e 42). Para separar, mude a mesa na reserva ou desligue a sincronização. Ela vem ligada; ligar ou desligar vale a partir do dia em que foi mudado, e os dias anteriores continuam como estavam (num dia que já passou, a opção aparece travada). Juntar à mão continua valendo, por exemplo para cliente sem reserva.",
  },
  {
    category: "mapa",
    title: "Ver as mesas por horário",
    description:
      "No painel do dia, em Horário, escolha Dia todo, Agora ou um dos horários das reservas (ou digite outro). O mapa passa a mostrar só quem está na mesa naquela hora, contando cada reserva da chegada até o tempo escolhido em \"Uma reserva costuma ficar\". A etiqueta embaixo da mesa mostra a próxima reserva.",
  },
  {
    category: "mapa",
    title: "Conflitos de mesa e sugestão de mesa",
    description:
      "Se duas reservas caem na mesma mesa no mesmo horário, o painel mostra em \"Conflitos de mesa\" com o botão Trocar. Para reserva sem mesa, o mapa sugere as mesas livres naquele horário que comportam o grupo (e duas vizinhas para juntar, quando nenhuma sozinha cabe); tocar na sugestão grava a mesa na reserva.",
  },
  {
    category: "mapa",
    title: "Copiar a arrumação de outro dia e usar modelos",
    description:
      "Em Arrumação do dia, escolha uma data e toque em Copiar para trazer as posições, nomes, mesas retiradas e mesas juntadas à mão daquele dia. Para reusar sempre, arrume as mesas e salve como modelo (ex.: \"Noite de evento\"); depois é só Aplicar. Os estados e as reservas do dia não mudam.",
  },
  {
    category: "mapa",
    title: "Imprimir o mapa do dia",
    description:
      "No painel do dia, toque em Imprimir. Abre uma folha clara com cada andar, as mesas coloridas pelo estado (no horário escolhido) e a lista de reservas com hora, nome, pessoas e mesa.",
  },
  {
    category: "mapa",
    title: "Régua: medir distâncias",
    description:
      "No canto do mapa (abaixo do zoom) fica a régua. Ligue e toque em dois pontos para ver a distância em metros. Toque de novo para começar outra medida; Esc desliga.",
  },
  {
    category: "mapa",
    title: "Desenhar a planta por cima de uma foto",
    description:
      "No modo Planta, em \"Fundo do andar\", escolha uma imagem (foto, print da planta ou do PDF). Depois toque em Acertar a escala, marque o começo e o fim de uma medida que você conhece (ex.: uma parede) e digite quanto ela mede de verdade: a imagem fica na escala certa. Dá para mover a imagem e mudar a transparência. Ela só aparece no modo Planta.",
  },
  {
    category: "mapa",
    title: "Formatos: mesa redonda e ambiente em L",
    description:
      "Ao escolher uma mesa, em Formato, troque entre Retangular e Redonda/oval (o tamanho vira os diâmetros). Ambientes, áreas fechadas e palco podem ter formato Livre: arraste os pontos brancos, toque no + no meio de um lado para criar um ponto e toque duas vezes num ponto para apagar.",
  },
  {
    category: "mapa",
    title: "O que dá para adicionar na planta",
    description:
      "Em Planta → Adicionar há miniaturas de tudo, com busca: mesas (retangular, quadrada, redonda, oval, preta e alta), bancos, sofá, pufes, cadeira, banqueta e poltrona; estantes, balcão, caixa, chopeira, geladeiras e pias; paredes, portas (simples, dupla e de correr), janela, cortina, escada, coluna e palco; TV, caixa de som, alvo de dardos, ar-condicionado, ventilador, luminárias, quadros, vitrais, plantas, lixeira, cabideiro, extintor e texto.",
  },

  // ── COLEÇÃO ───────────────────────────────────────────────────
  {
    category: "colecao",
    title: "Visão geral da página de Coleção",
    description:
      "Exibe todos os jogos de tabuleiro cadastrados no sistema. No quadro de cima há a busca (por nome, descrição ou categoria, sem precisar de acento — aperte '/' para ir direto a ela e Esc para limpar) e os filtros em pílulas, cada uma com a quantidade de jogos: Situação (todos, ocultos, destaques, à venda), Categoria e Dificuldade. Ao lado da busca dá para alternar entre grade (com foto) e lista (mais compacta); a escolha fica guardada. Em cada jogo, os botões de baixo mostram/ocultam no site e destacam na hora, sem abrir o jogo — se der erro ao salvar, o botão volta como estava. Jogos ocultos aparecem apagados, com borda tracejada e a etiqueta 'Oculto'.",
  },
  {
    category: "colecao",
    title: "Como adicionar um novo jogo",
    description:
      "Na página Coleção, clique no ícone de + (tooltip: 'Adicionar jogo') no cabeçalho — ou use o atalho 'Jogo da Coleção' da página Adicionar. Preencha nome, descrição, dificuldade, número mínimo e máximo de jogadores, tempo de jogo, tipos (pode ser mais de um), e defina se está visível, em destaque e à venda. A imagem pode ser adicionada via URL.",
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
      "Na página Coleção, toque no botão de brilho (✦) embaixo do card do jogo — ou ative 'Em destaque' no formulário de edição. Jogos destacados aparecem com prioridade na vitrine do site. Use a pílula 'Destaques' em Situação para ver só os jogos destacados.",
  },
  {
    category: "colecao",
    title: "Como ocultar um jogo sem excluí-lo",
    description:
      "Na página Coleção, toque no botão de olho embaixo do card do jogo — ou desative 'Visível' no formulário de edição. O jogo permanece no banco de dados mas não aparece para os clientes no site. Para ver os jogos ocultos, use a pílula 'Ocultos' em Situação.",
  },
  {
    category: "colecao",
    title: "Como marcar um jogo como à venda",
    description:
      "No formulário de edição, ative a opção 'À venda'. Jogos à venda são exibidos com uma indicação especial no site. Use a pílula 'À venda' em Situação, na página Coleção, para ver só esses jogos.",
  },

  // ── ALUGUEL ───────────────────────────────────────────────────
  {
    category: "aluguel",
    title: "Visão geral do Aluguel de Jogos",
    description:
      "O aluguel tem um acervo próprio, separado dos jogos usados no pub (o que você cadastra aqui não aparece na Coleção, e vice-versa). Acesse pelo item 'Aluguel' do menu lateral. A página tem quatro abas: 'Aluguéis' (o dia a dia: retiradas, devoluções e atrasos), 'Jogos' (cadastro e estoque de cópias), 'Clientes' (contas de quem aluga) e 'Regras' (texto das regras e configurações do serviço). O ícone de link ao lado do título ('Ir para visão do cliente') abre o catálogo de aluguel numa nova aba.",
  },
  {
    category: "aluguel",
    title: "Como ligar o serviço de aluguel e configurar as regras de funcionamento",
    description:
      "Em Aluguel → aba 'Regras', parte 'Configurações do serviço' (o resumo no topo mostra como está tudo e leva a cada seção; o 'i' ao lado de cada título explica a seção): 'Aluguel aberto para os clientes' liga o catálogo para os clientes (desligado, eles veem 'Aluguel de jogos em breve'; você, logado como admin, continua vendo o catálogo com o aviso 'Serviço desativado'). Ali também ficam: os dias da semana em que dá para retirar, quantos dias à frente o cliente pode marcar a retirada (0 = só no próprio dia), o máximo de jogos por pedido, o máximo de jogos ativos (reservados + retirados) por cliente, se o CPF é obrigatório no cadastro e um e-mail da equipe para receber uma cópia de cada pedido (opcional). Clique em salvar para aplicar. Em 'Retirada', a opção 'Permitir reservar um jogo que está com outro cliente': ligada, o cliente pode reservar para depois da devolução de quem está com o jogo; desligada, com todas as cópias fora o jogo aparece como 'Alugado' (com a previsão de volta) e só pode ser alugado quando uma cópia voltar — ninguém fica na fila atrás de outro cliente, então um atraso não prejudica o próximo (mas ainda dá para pegar uma cópia livre agora que tem reserva mais para frente, se devolver antes). Ligada, escolha em 'Em volta de uma reserva já marcada, o cliente pode alugar': 'Antes e depois' (padrão), 'Só antes' (igual a desligada) ou 'Só depois' (ninguém pega a cópia antes de uma reserva marcada, só depois dela). Os dias marcados em 'Retirada' também valem para a devolução: se o prazo do jogo terminar num dia sem atendimento, a devolução passa sozinha para o próximo dia marcado (ex.: prazo terminando na segunda, com segunda e terça desmarcadas, a devolução fica para quarta) — o cliente vê a data certa no pedido. Logo abaixo, a 'Folga entre aluguéis da mesma cópia (dias)' é uma margem de segurança contra atrasos: com 2 dias, se a cópia volta dia 23 o próximo cliente só retira a partir do dia 25 (com 1, no dia seguinte, como sempre). A folga também vale para quem pega a cópia antes de uma reserva já marcada.",
  },
  {
    category: "aluguel",
    title: "Como editar e publicar as regras do aluguel",
    description:
      "Em Aluguel → aba 'Regras', parte 'Texto das regras': cada seção tem um título e um texto (use **texto** para negrito e quebre linhas normalmente). Você pode adicionar, remover e mover seções para cima ou para baixo; a prévia ao lado mostra como fica para o cliente. As regras já vêm com os tópicos da especificação (prazos, retirada e devolução, atrasos, pagamento, danos, perda de peças, furto ou extravio e demais condições) para você completar. As mudanças só valem depois de 'Publicar regras' — cada publicação gera uma nova versão, e o cliente precisa aceitar a versão atual no próximo pedido. Cada pedido guarda a versão que o cliente aceitou.",
  },
  {
    category: "aluguel",
    title: "Como cadastrar um jogo para aluguel",
    description:
      "Em Aluguel → aba 'Jogos', clique em adicionar. Preencha nome, descrição, imagem, dificuldade, número de jogadores, duração e tipos (os mesmos campos da Coleção), mais o preço do aluguel (em reais, cobrado pelo período) e o prazo em dias (de 1 a 60). Para não redigitar, use 'Importar do acervo do pub': escolha um jogo da Coleção e os dados dele são copiados para o formulário — depois disso os dois cadastros são independentes. O jogo só aparece no catálogo enquanto estiver 'Ativo'; use o toggle na lista para ativar ou inativar (jogos inativos somem do catálogo).",
  },
  {
    category: "aluguel",
    title: "Como funcionam as cópias e o estoque",
    description:
      "Cada jogo de aluguel tem uma ou mais cópias (ex.: 'Cópia 1', 'Cópia 2'), editadas no formulário do jogo: dá para adicionar, renomear, escrever uma observação e marcar cada cópia como ativa ou indisponível (manutenção, perdida...). Cópias indisponíveis não são alugadas. Ao lado de cada cópia aparece a situação dela: livre, reservada (com as datas), alugada até dd/mm, atrasada ou indisponível. No topo da aba aparecem os totais de cópias, livres, alugadas e indisponíveis, e o filtro 'Esgotados' mostra os jogos sem cópia disponível hoje. Não é possível remover uma cópia com reserva em aberto nem excluir um jogo com aluguéis em aberto.",
  },
  {
    category: "aluguel",
    title: "Como funciona um aluguel, do pedido à devolução",
    description:
      "O cliente escolhe os jogos e a data de retirada (dentro dos dias e da antecedência configurados) e confirma — se houver cópia livre para o período, o aluguel é confirmado na hora, sem aprovação. A devolução é a data de retirada + o prazo do jogo (cada jogo do pedido tem o seu prazo). Entre um aluguel e o próximo da mesma cópia o sistema deixa um dia de folga para conferir o jogo. Um pedido com vários jogos é tudo ou nada: se um deles ficar indisponível no meio do caminho, nada é reservado. Se o pagamento online estiver desligado, o pagamento é feito no balcão, na retirada; se estiver ligado, o cliente paga pelo site (Pix ou cartão) e o aluguel só é confirmado depois do pagamento aprovado (veja 'Como ligar o pagamento online'). O cliente recebe um e-mail com o código do pedido, os jogos, as datas e o endereço. Depois, no balcão, você registra a retirada e a devolução na aba 'Aluguéis'.",
  },
  {
    category: "aluguel",
    title: "Como criar um aluguel no balcão (botão +)",
    description:
      "No topo da página de Aluguel, o botão '+' (ao lado do link da visão do cliente) abre 'Novo aluguel no balcão', em 3 passos. 1) Cliente: busque um cliente cadastrado (nome, WhatsApp, CPF ou e-mail) ou use 'Sem conta: cadastrar agora' com nome, WhatsApp, CPF e e-mail opcional. O cliente sem conta fica salvo na aba Clientes com a etiqueta 'Sem conta'; se depois a pessoa criar conta no site com o mesmo CPF e o mesmo WhatsApp, o histórico passa sozinho para a conta dela. 2) Jogos e data: escolha a retirada (hoje por padrão) e os jogos; cada jogo mostra se tem cópia livre naquela data e quando devolve. Você pode passar dos limites do site (jogos por pedido, antecedência, dia sem retirada, jogos ao mesmo tempo): aparece um aviso e você marca 'Liberar para este aluguel'. Cópia ocupada nunca é liberada. 3) Pagamento: 'Pago no balcão' (dinheiro, cartão ou Pix na chave do pub), 'Pix QR Code' (o Mercado Pago gera o QR e o cliente paga no app do banco), 'Link de pagamento' (QR ou link do Mercado Pago, com Pix ou cartão), 'Paga na retirada' ou 'Cortesia' (sai de graça, com motivo). Pago no balcão e cortesia, começando hoje, permitem marcar 'O cliente já está levando agora', que já registra a retirada. É preciso confirmar que o cliente leu e aceitou as regras. No Pix e no link, o QR aparece na hora com 'Copiar' e 'Mandar no WhatsApp'; a tela vira 'Pagamento aprovado' sozinha quando o pagamento cai, e dá para registrar a retirada ali mesmo. O cliente tem pelo menos 31 minutos para pagar; depois as cópias voltam a ficar livres. 'Cliente desistiu: cancelar pedido' libera as cópias na hora. O QR também fica no detalhe do pedido enquanto ele aguarda pagamento. O Pix direto só funciona com a conta do Mercado Pago em produção e com chave Pix cadastrada (no modo de teste, use o link). Os aluguéis criados assim aparecem com a etiqueta 'Balcão' (passe o mouse para ver quem criou), e as estatísticas mostram quantos pedidos vieram do site e do balcão, e quanto saiu em cortesias.",
  },
  {
    category: "aluguel",
    title: "Visão geral da aba Aluguéis",
    description:
      "No topo, o quadro 'Hoje' mostra só o que pede ação: 'Atrasados' (com os dias de atraso), 'Devoluções de hoje', 'Retiradas de hoje', 'Não retirados' (a data passou e o cliente não apareceu) e 'Para conferir' (devolvidos cujas peças ainda não foram contadas) — cada linha com o jogo, o cliente, o WhatsApp e o botão 'Registrar retirada', 'Registrar devolução' ou 'Conferir' direto. Sem pendências, aparece 'Nada pendente para hoje'. Abaixo, a lista de aluguéis abre em 'Em andamento', dos pedidos mais recentes para os mais antigos; os filtros mudam para Aguardando pagamento, Reservados, Retirados, Devolvidos, Cancelados ou Todos, e a busca acha por cliente, código ou jogo. Cada cartão mostra o jogo, uma situação colorida, o cliente, as datas, o valor, o pagamento (quando online) e o código do pedido. A aba 'Aluguéis' tem um selo laranja com as pendências do dia, igual ao contador do menu lateral.",
  },
  {
    category: "aluguel",
    title: "Como registrar a retirada de um jogo",
    description:
      "Na aba 'Aluguéis', no aluguel reservado, clique em 'Registrar retirada' quando o cliente buscar o jogo. A retirada só pode ser registrada a partir da data marcada — antes disso o botão fica desabilitado com 'Retirada a partir de dd/mm' (isso evita entregar uma cópia que está reservada para outra pessoa antes). Se o cliente quiser retirar antes, cancele e peça um novo pedido para a data de hoje.",
  },
  {
    category: "aluguel",
    title: "Como registrar a devolução, conferir as peças e marcar avarias",
    description:
      "Na aba 'Aluguéis', no aluguel retirado, clique em 'Registrar devolução'. Primeiro informe 'Devolvido em': vem com hoje, mas se o cliente devolveu outro dia (e alguém esqueceu de marcar), escolha a data certa — o atraso é contado por ela, tanto para o cliente quanto no histórico e nas estatísticas. Depois escolha 'Conferir agora' ou 'Conferir depois'. Conferir agora: informe o estado do jogo (OK, Com avaria ou Peça faltando) e uma observação opcional; quando o estado não é OK, 'Marcar cópia como indisponível' já vem marcada, e a cópia sai do estoque até você reativá-la no cadastro do jogo. Conferir depois: o aluguel vai para 'Para conferir' no quadro Hoje (e entra no contador do menu); quando a equipe contar as peças, clique em 'Conferir' e informe o estado. Nos dois casos o cliente já vê o aluguel como devolvido (ele não vê a conferência) e a cópia volta a aceitar reservas. Enquanto a cópia não for conferida, a próxima retirada dela segue a regra 'Cópia devolvida e ainda não conferida' (Regras → Retirada e devolução): 'Bloquear a próxima retirada' (padrão) só deixa entregar depois da conferência, com o botão 'Conferir agora' na própria tela da retirada; 'Só avisar' mostra o aviso e deixa entregar mesmo assim. No cadastro do jogo, a cópia aparece com o selo 'Para conferir'.",
  },
  {
    category: "aluguel",
    title: "Como colocar jogos em promoção",
    description:
      "Num jogo só: em Aluguel → Jogos, abra o jogo e ligue 'Em promoção' (abaixo do preço). Escolha % (1 a 90) ou R$ (valor que sai do preço), e se quiser uma data em 'Vale até' — depois desse dia a promoção some sozinha. A prévia mostra o preço de/por. Em todos os jogos: em Aluguel → Regras → Configurações do serviço → 'Promoção', ligue 'Desconto em todos os jogos'. Ali também fica a 'Mensagem no topo da página de jogos', um aviso que o cliente vê no alto do catálogo (ex.: 'Semana do jogo de cartas: 20% em todos'); o 'Vale até' dessa seção vale para a mensagem e para o desconto geral. Os descontos não se somam: quando o jogo tem promoção própria e há desconto geral, o cliente paga o que deixar o jogo mais barato. Nenhum jogo fica abaixo de R$ 1,00. O cliente vê o preço cheio riscado, o novo preço e o selo com o desconto no catálogo, no detalhe, no carrinho e no pedido. O desconto vale para os pedidos feitos enquanto a promoção estiver ativa (também no aluguel pelo balcão); aluguéis já feitos mantêm o preço pago, e na lista de aluguéis o preço cheio aparece riscado ao lado do valor pago.",
  },
  {
    category: "aluguel",
    title: "Como alterar a data de devolução (estender o prazo)",
    description:
      "Na aba 'Aluguéis', use 'Alterar devolução' num aluguel reservado ou retirado para combinar um prazo diferente com o cliente. A nova data não pode ser anterior à retirada nem cruzar a próxima reserva da mesma cópia — nesse caso aparece 'A nova data cruza com outra reserva desta cópia.'.",
  },
  {
    category: "aluguel",
    title: "Como cancelar um aluguel",
    description:
      "Na aba 'Aluguéis', clique em 'Cancelar' e informe o motivo (obrigatório). Cancelar libera a cópia na hora. Atenção com aluguéis já retirados: se o jogo já voltou, use 'Registrar devolução' em vez de cancelar — o próprio diálogo avisa. O cliente também pode cancelar sozinho em 'Minha conta', mas só enquanto o aluguel ainda não foi retirado.",
  },
  {
    category: "aluguel",
    title: "Como ver os dados de um cliente",
    description:
      "Na aba 'Aluguéis', clique no nome do cliente para abrir um modal com os dados da conta: e-mail, WhatsApp, CPF, data de cadastro, total de aluguéis, quantos estão em aberto e quantos atrasaram, além do histórico completo e do botão de bloquear. O ícone do WhatsApp ao lado do nome abre a conversa direto. A aba 'Clientes' lista todas as contas, com busca por nome, e-mail, WhatsApp ou CPF; clicar num cliente abre o mesmo detalhe.",
  },
  {
    category: "aluguel",
    title: "Como bloquear um cliente",
    description:
      "No detalhe do cliente (clicando no nome na aba 'Aluguéis' ou na aba 'Clientes'), escreva o motivo e clique em 'Bloquear'. Um cliente bloqueado não consegue fazer novos pedidos; os aluguéis que já existem continuam normalmente. Para liberar, abra o detalhe e clique em 'Desbloquear'.",
  },
  {
    category: "aluguel",
    title: "Como excluir aluguéis e contas de cliente",
    description:
      "Cada aluguel tem o botão de lixeira na aba 'Aluguéis', inclusive os em andamento (reservado ou retirado): excluir um em andamento libera a cópia na hora, então confira se o jogo voltou; para só desistir, prefira 'Cancelar', que fica registrado. 'Excluir encerrados…' (abaixo dos filtros) apaga vários encerrados de uma vez, todos ou só os de mais de 30 ou 90 dias. Seguram a exclusão: reembolso em andamento ou análise de cancelamento pendente, até serem resolvidos, e um pedido online não pago com pagamento ainda em andamento no Mercado Pago (ex.: cartão em análise). Nesse último caso o sistema pergunta ao Mercado Pago na hora de excluir: sem nenhum pagamento em andamento, apaga já; com pagamento em andamento (ou se não der para consultar), espera até 7 dias depois do prazo para pagar, porque se esse pagamento for aprovado ele só é devolvido sozinho com o pedido guardado. O pedido é apagado junto com o último jogo dele. No detalhe do cliente: 'Apagar histórico' apaga os aluguéis encerrados dele e mantém a conta (marque 'Incluir também os em andamento' para apagar tudo); 'Excluir conta' apaga o login, o cadastro e o histórico (com aluguel em andamento, marque a confirmação para excluir mesmo assim); 'Editar dados' corrige nome, WhatsApp e CPF (e o e-mail do cliente sem conta) e atualiza os aluguéis dele. Para apenas impedir novos aluguéis, prefira 'Bloquear'. Exclusões não podem ser desfeitas. Pedido 'paga na retirada': no detalhe do pedido, escolha a forma (dinheiro, cartão ou Pix) e clique em 'Registrar … recebidos' quando o cliente pagar ('Desfazer' corrige um registro feito por engano).",
  },
  {
    category: "aluguel",
    title: "O que o cliente vê no aluguel",
    description:
      "Em /aluguel o cliente vê o catálogo no mesmo estilo da ludoteca, com o preço e um selo em cada jogo: 'Disponível', 'Volta em N dias' (quando todas as cópias estão alugadas — ex.: prazo de 7 dias retirado há 4 dias = volta em 3 dias), 'Disponível a partir de dd/mm' (há reserva marcada), 'Retorno atrasado' ou 'Indisponível'. Para alugar ele cria uma conta (nome, WhatsApp, CPF, e-mail e senha), confirma o e-mail e aceita as regras. As regras abrem num painel sem sair da página, pelo botão 'Regras' ou pelo link no aceite. Em 'Minha conta' ele acompanha os pedidos (Reservado, Retirado com os dias que faltam, Atrasado, Devolvido, Cancelado) e pode cancelar os que ainda não retirou.",
  },

  {
    category: "aluguel",
    title: "Como ligar o pagamento online (Mercado Pago)",
    description:
      "Em Aluguel → aba 'Regras', na seção 'Pagamento online', veja primeiro a 'Situação da integração (Mercado Pago)': 'Não configurado' significa que as credenciais ainda não foram colocadas no servidor (o interruptor fica desabilitado — peça a quem cuida do sistema); 'Modo de teste' significa que os pagamentos não são reais, ótimo para experimentar, mas troque pela credencial de produção antes de abrir ao público; 'Produção' significa que está valendo dinheiro de verdade. Com a integração pronta, ligue 'Exigir pagamento online nos pedidos'. A partir daí todo pedido novo precisa ser pago pelo site (Pix ou cartão, à vista — não há boleto nem pagamento no balcão). Ao ligar, o sistema lembra de revisar a seção de pagamento no texto das regras, com o atalho 'Ir para as regras'; o texto não é trocado sozinho. Desligar o interruptor faz os pedidos novos voltarem ao pagamento no balcão; pedidos que já aguardam pagamento seguem até vencer.",
  },
  {
    category: "aluguel",
    title: "Reserva de 30 minutos: o que acontece se o cliente não pagar",
    description:
      "Com o pagamento online ligado, ao clicar em 'Ir para o pagamento' o cliente tem as cópias reservadas por um tempo (padrão 30 minutos; ajuste em 'Tempo para pagar (minutos)', de 15 a 60). Nesse período ninguém mais consegue alugar aquelas cópias. Se o pagamento for aprovado, o aluguel vira 'Reservado' e o cliente recebe o e-mail de confirmação. Se o tempo acabar sem pagamento, as cópias voltam para o catálogo na mesma hora e o cliente já vê 'Pagamento expirado' na página do pedido. Já no painel, o pedido só é marcado como expirado e o aluguel cancelado pelo sistema ('Pagamento não concluído') quando a limpeza automática roda ou quando o cliente tenta pagar de novo — até lá ele ainda pode aparecer como 'Aguardando pagamento'. Nenhum e-mail é enviado nesse caso; a página do pedido já avisa o cliente. Se alguém pagar só depois de o tempo vencer e a cópia já tiver sido pega por outra pessoa, o sistema devolve o valor inteiro automaticamente (pedido 'Reembolsado · tempo esgotado').",
  },
  {
    category: "aluguel",
    title: "Política de cancelamento e reembolso automático",
    description:
      "Em Aluguel → 'Regras' → 'Pagamento online' você escolhe o que acontece quando o cliente cancela um aluguel já pago, antes da retirada: 'Reembolso integral automático' (o cliente recebe tudo de volta na hora), 'Reembolso com taxa' (recebe o valor menos a taxa; informe a 'Taxa de cancelamento (%)', de 0 a 50) ou 'Análise manual' (o cancelamento fica pendente até você decidir quanto devolver). Uma prévia embaixo mostra um exemplo com valores. Antes de confirmar o cancelamento, em 'Minha conta', o cliente lê o resultado: 'Você vai receber R$ X de volta', 'Você vai receber R$ X de volta (taxa de cancelamento de N%)' ou 'Seu cancelamento vai para análise do Carcassonne Pub, que decide o reembolso'. Se o pedido tem vários jogos e o cliente cancela um só, o reembolso é só do valor daquele jogo, e a soma devolvida nunca passa do que foi pago.",
  },
  {
    category: "aluguel",
    title: "Como reembolsar um pedido pelo detalhe do pedido",
    description:
      "Na aba 'Aluguéis', clique no código do pedido para abrir o detalhe: jogos, cliente, pagamento (forma, data, valor e número no Mercado Pago) e histórico de reembolsos. Em pedidos aguardando pagamento, recusados ou expirados, o botão 'Consultar no Mercado Pago' busca o pagamento lá e, se houver um aprovado (o aviso automático pode se perder), confirma o pedido — ou devolve o valor, se as cópias já tiverem sido liberadas. Na seção 'Reembolsar', informe o 'Valor a devolver' (já vem preenchido com o que falta devolver), um motivo opcional e clique em 'Reembolsar'. Se aparecer um erro, o botão vira 'Tentar de novo' — pode clicar com tranquilidade, o reembolso não sai em dobro. Ao cancelar pelo admin um aluguel pago, o diálogo também pergunta quanto devolver (padrão: integral). O cliente recebe um e-mail avisando do reembolso: no Pix costuma cair na hora; no cartão depende da operadora.",
  },
  {
    category: "aluguel",
    title: "Reembolsos a decidir (análise manual)",
    description:
      "Quando a política é 'Análise manual', os cancelamentos de aluguéis pagos aparecem na faixa 'Reembolsos a decidir' no topo da aba 'Aluguéis' (e entram no contador da sidebar). Abra o pedido e escolha: 'Aprovar reembolso' (informe o valor a devolver) ou 'Recusar reembolso' (o motivo é obrigatório; o cancelamento segue, mas sem devolução). O cliente vê 'Cancelamento em análise' em 'Minha conta' até você decidir. Se a decisão falhar por um erro de conexão, o botão vira 'Tentar de novo'.",
  },
  {
    category: "aluguel",
    title: "Avisos de atenção nos pedidos (reembolsos que falharam)",
    description:
      "No detalhe do pedido podem aparecer avisos que pedem sua ajuda. 'Pagamento chegou tarde e a devolução falhou': o cliente pagou depois do tempo e o reembolso automático não foi concluído — clique em 'Tentar de novo'; se continuar falhando, devolva pelo painel do Mercado Pago. 'Pagamento em duplicidade ... sem devolução': o cliente pagou duas vezes e a devolução automática do pagamento extra falhou; o Mercado Pago tenta de novo quando reenvia o aviso, mas se demorar devolva esse pagamento pelo painel do Mercado Pago. 'Reembolso de R$ X sem confirmação': o Mercado Pago não respondeu a tempo e o dinheiro pode ou não ter saído — 'Tentar de novo' é seguro quando o botão aparece; sem o botão, confira no painel do Mercado Pago antes de devolver de novo. Enquanto esse reembolso não for concluído, o sistema não deixa cancelar o aluguel sem reembolso nem aprovar a análise com outro valor (isso deixaria o dinheiro sem registro). Esses avisos também aparecem na faixa 'Reembolsos a decidir'.",
  },
  {
    category: "aluguel",
    title: "Retirada bloqueada enquanto o pedido não está pago",
    description:
      "Em pedidos com pagamento online, o botão 'Registrar retirada' fica desabilitado, com o aviso 'Aguardando pagamento' ao lado, até o pagamento ser aprovado. Assim ninguém leva um jogo sem ter pago. Na aba 'Aluguéis' há também um selo de pagamento em cada aluguel (Pago online, Aguardando pagamento, Pagamento expirado, Reembolsado, Cancelamento em análise) e o filtro 'Pagamento' (Todos, Pagos online, Aguardando, Expirados, Reembolsados). Pedidos feitos com o pagamento no balcão aparecem como 'Pagamento no balcão' e só entram no filtro 'Todos'.",
  },
  {
    category: "aluguel",
    title: "O que o cliente vê com o pagamento online",
    description:
      "No pedido, com 'Oferecer Pix aqui na tela' ligado (Aluguel → Regras → Configurações do serviço, seção Pagamento online), o cliente escolhe entre 'Pix aqui na tela' e 'Cartão ou Pix' (a página do Mercado Pago). No Pix aqui na tela, a página do pedido mostra o QR Code e o 'copia e cola' (com 'Copiar código Pix') e muda sozinha para 'Pagamento aprovado!' quando o Pix cai; se ele preferir, 'Prefiro pagar com cartão' abre o Mercado Pago para o mesmo pedido. Nesse caso as cópias ficam reservadas por pelo menos 31 minutos (mínimo do Pix do Mercado Pago). Se o Pix não puder ser gerado (conta de teste ou sem chave Pix cadastrada), o cliente segue para o Mercado Pago normalmente. No Mercado Pago, o cliente paga e volta para a página do pedido, que se atualiza sozinha: 'Aguardando seu pagamento' (com contagem regressiva e os botões 'Pagar agora' e 'Cancelar pedido'), 'Confirmando seu pagamento…' (alguns segundos, até o aviso chegar), 'Pagamento aprovado!', 'Pagamento não aprovado' (com 'Tentar novamente' enquanto a reserva vale), 'Pagamento expirado' (com 'Fazer o pedido de novo', que devolve os jogos ao carrinho) e reembolsos. Em 'Minha conta' cada pedido tem um selo de pagamento, e pedidos aguardando mostram 'Pagar agora'.",
  },

  // ── CARDÁPIO ──────────────────────────────────────────────────
  {
    category: "cardapio",
    title: "Visão geral do Cardápio",
    description:
      "A página Cardápio exibe avisos, combos e todos os itens (pratos, bebidas etc.), separados em seções por categoria, na mesma ordem do cardápio do cliente — clique no título de uma seção para recolher ou abrir. No quadro de cima há a busca (por nome, descrição ou categoria, sem precisar de acento — '/' vai direto a ela e Esc limpa), a Situação (todos, ocultos, destaques, veganos) e a Categoria, cada pílula com a sua quantidade. Dá para alternar entre grade e lista ao lado da busca. Em cada item, os botões de baixo mostram/ocultam, destacam e marcam como vegano na hora, sem abrir o item. No cabeçalho, o ícone de + (tooltip: 'Adicionar') cria um Item, um Combo ou um Aviso, e o ícone de ajustes (tooltip: 'Organizar e popups') abre as Descrições dos tipos, a ordem dos tipos e subtipos (que define as categorias e sua ordem) e os Popups.",
  },
  {
    category: "cardapio",
    title: "Como adicionar um item ao cardápio",
    description:
      "Na página Cardápio, clique no ícone de + (tooltip: 'Adicionar') no cabeçalho e escolha 'Item' — ou use o atalho 'Item' da página Adicionar. Preencha nome, descrição, valor, tipo e subtipo, se é vegano e se é item em foco. O item só aparece no site quando a opção 'Visível' estiver ativada. Avisos e complementos opcionais também podem ser adicionados no formulário.",
  },
  {
    category: "cardapio",
    title: "Como adicionar uma descrição a um tipo",
    description:
      "Na página Cardápio, clique no ícone de ajustes (tooltip: 'Organizar e popups') no cabeçalho e escolha 'Descrições dos tipos'. Isso permite adicionar um texto descritivo a uma categoria existente do cardápio, como uma explicação sobre um tipo de prato. Esse texto aparece acima dos itens daquela categoria no site.",
  },
  {
    category: "cardapio",
    title: "Como adicionar um combo",
    description:
      "Na página Cardápio, clique no ícone de + (tooltip: 'Adicionar') no cabeçalho e escolha 'Combo'. Preencha nome, descrição e valor do combo. Combos aparecem em uma seção própria no cardápio do site, separada dos itens comuns.",
  },
  {
    category: "cardapio",
    title: "Como adicionar um aviso ao cardápio",
    description:
      "Na página Cardápio, clique no ícone de + (tooltip: 'Adicionar') no cabeçalho e escolha 'Aviso'. Um aviso (Info) é um bloco de texto institucional que aparece no cardápio, como um aviso sobre taxas, políticas ou informações especiais. Você pode adicionar múltiplos valores/linhas por aviso.",
  },
  {
    category: "cardapio",
    title: "Como criar e ordenar categorias e avisos do cardápio",
    description:
      "Na página Cardápio, clique no ícone de ajustes (tooltip: 'Organizar e popups') no cabeçalho e escolha 'Categorias e avisos'. O modal tem duas abas. Em 'Categorias' você adiciona tipos (ex: 'Pratos Quentes'), arrasta pela alça (⋮⋮) para mudar a ordem e toca no nome para abrir os subtipos (ex: 'Massas'), que também se arrastam. Categorias usadas nos itens mas fora da lista aparecem como sugestões para adicionar com um toque. Em 'Avisos' você arrasta os avisos. Adicionar e excluir um tipo vale na hora; o resto só vale depois de 'Salvar' (o rodapé mostra 'Alterações não salvas' e pergunta antes de sair sem salvar). Excluir um tipo pede confirmação e não apaga os itens. A ordem definida aqui reflete diretamente na exibição do site.",
  },
  {
    category: "cardapio",
    title: "Como escolher a imagem dos itens sem foto",
    description:
      "Na página Cardápio, abra 'Categorias e avisos' (ícone de ajustes no cabeçalho). Em cada tipo e subtipo há uma miniatura com a ilustração atual (tracejada quando é a padrão): toque nela e escolha uma das oito (chope, drinks, vinhos, sem álcool, pizzas, porções, lanches, sobremesas) ou 'Padrão'. Depois clique em 'Salvar'. A ilustração aparece nos itens sem foto, no site, no admin e no PDF. A do subtipo vale antes da do tipo; sem nenhuma, fica a imagem geral do cardápio. Só aparecem aqui os tipos já adicionados nessa lista. Os jogos sem foto usam sempre a mesma ilustração (um peão).",
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
      "Clique no ícone de + no cabeçalho da página Links, ou use o atalho 'Link' da página Adicionar. Preencha o nome exibido, a URL de destino, uma descrição curta e escolha um ícone da biblioteca de ícones disponível. O link é criado como visível por padrão.",
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
      "Gerencia todos os eventos do Carcassonne. Cada evento tem um subtipo: Quiz (perguntas com pontuação), Bolão (palpites de partidas) ou Votação (concurso de fantasias com fotos). Eventos inativos não aparecem para os clientes. Ao selecionar um evento na lista, um painel de gerenciamento abre à direita com abas específicas para o tipo de evento. O item 'Eventos' do menu lateral mostra quantos eventos estão ativos.",
  },
  {
    category: "eventos",
    title: "Como criar um novo evento",
    description:
      "Clique no ícone de + no cabeçalho, ou use o atalho 'Evento' da página Adicionar. Preencha nome, descrição, escolha um ícone e defina o subtipo (Quiz, Bolão ou Votação). O evento começa inativo. Para que os clientes vejam, ative-o pelo toggle de ativo/inativo no painel do evento.",
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
  {
    category: "eventos",
    title: "Como funciona a Votação de fantasias",
    description:
      "Crie um evento do tipo Votação. Ele passa por três fases, mostradas no selo ao lado do nome: 'Cadastro' (você — e, se permitir, os clientes — cadastra as fantasias), 'Votação aberta' (os clientes votam) e 'Encerrada' (votos fechados, aguardando você liberar o resultado). Os botões no topo do painel avançam as fases: 'Abrir Votação', 'Encerrar Votação', 'Liberar Resultado' e 'Reiniciar'. A contagem de votos só aparece para o público depois que você encerrar e liberar o resultado.",
  },
  {
    category: "eventos",
    title: "Como cadastrar as fantasias da Votação",
    description:
      "Com o evento de Votação selecionado, clique em '+ Nova fantasia'. Informe o nome e adicione uma ou mais fotos — dá para fotografar vários ângulos, selecionar tudo de uma vez e recortar cada foto do seu jeito (fotos de iPhone em HEIC são convertidas automaticamente). Clique em 'Salvar fantasia'; o formulário fica pronto para cadastrar a próxima. Quando terminar, use 'Abrir Votação' no topo.",
  },
  {
    category: "eventos",
    title: "Como deixar os clientes enviarem a própria fantasia",
    description:
      "No painel da Votação, ligue 'Clientes podem enviar fotos'. Durante a fase de Cadastro, a página do evento mostra para o público um formulário para cadastrar a própria fantasia (nome + fotos), e o cliente pode editar a fantasia que enviou. Por padrão cada dispositivo envia só uma fantasia; ligue 'Permitir várias fantasias por cliente' para liberar mais de uma. Com a opção desligada (padrão), só você cadastra.",
  },
  {
    category: "eventos",
    title: "Como o cliente vota e como sai o resultado",
    description:
      "Com a votação aberta, o cliente vê todas as fantasias (com as fotos em carrossel e em tela cheia), escolhe exatamente 2 favoritas e toca em 'Votar'. Depois de confirmar, o voto fica travado — não dá para trocar — e ele vê as escolhas e a mensagem 'Voto registrado!'. Cada dispositivo vota uma vez. Depois que você encerra e libera o resultado, o público vê o pódio com medalhas e o ranking com a contagem de votos, incluindo empates. 'Reiniciar' apaga todos os votos e volta o evento para a fase de Cadastro.",
  },
  {
    category: "eventos",
    title: "Como resolver um empate no 1º lugar da Votação",
    description:
      "Se, com a votação encerrada, duas ou mais fantasias empatarem em primeiro, aparece o quadro 'Empate no 1º lugar' no painel. Clique na coroa da fantasia que deve vencer para coroá-la campeã — ela passa a aparecer em 1º no resultado. Clicar de novo remove a coroa.",
  },

  // ── ADICIONAR ─────────────────────────────────────────────────
  {
    category: "adicionar",
    title: "Visão geral da página Adicionar",
    description:
      "Página de atalhos para criar qualquer coisa no site. Nada é criado nela: cada card leva para a página onde aquilo vive, já com o formulário aberto, e mostra no rodapé para onde vai (ex.: 'Em Cardápio →'). Os cards ficam agrupados por área — Reservas, Jogos, Cardápio, Site e eventos, Configurações. Tudo o que tem atalho aqui também pode ser criado direto na própria página.",
  },
  {
    category: "adicionar",
    title: "O que cada card faz na página Adicionar",
    description:
      "Reservas: Nova Reserva → Reservas com o formulário aberto; Freelancers → página de freelancers. Jogos: Jogo da Coleção → Coleção com o formulário de novo jogo; Jogo para Aluguel → Aluguel → Jogos com o formulário aberto. Cardápio: Item, Combo e Aviso → Cardápio com o formulário certo aberto; Descrição de Tipo, Categorias e Avisos e Popup → Cardápio com o organizador correspondente aberto. Site e eventos: Evento → Eventos com o formulário aberto; Link → Links com o formulário aberto; Música → página de recomendação de música dos clientes. Configurações: E-mail de Reserva → Configurações → aba 'E-mails' com o editor aberto.",
  },
  {
    category: "configuracoes",
    title: "Como editar os outros e-mails automáticos",
    description:
      "Em Configurações → aba 'E-mails', em 'Outros e-mails automáticos', cada e-mail tem 'Editar': confirmação do aluguel, reembolso do aluguel, confirmação de e-mail e redefinição de senha. Dá para mudar o assunto, o texto de prévia, o título e os textos (use **texto** para negrito). As variáveis, como {nome}, {codigo}, {jogos}, {total}, {valor} e {motivo}, são trocadas pelos dados de cada envio; na confirmação do aluguel, {regras} vira o link para as regras. Os dados do pedido (jogos, datas, valores, pagamento, endereço) e o botão com o link entram sozinhos e não podem ser removidos. A prévia ao lado atualiza enquanto você digita. Salve (ou Ctrl + S) e use 'Enviar teste' para receber o e-mail de exemplo. Os próximos envios saem com a versão nova em até 1 minuto. 'Restaurar padrão' volta ao texto original (também precisa salvar).",
  },
  {
    category: "configuracoes",
    title: "Como personalizar o e-mail de reserva",
    description:
      "Em Configurações → aba 'E-mails', clique em 'Editar e-mail' (ou use o atalho 'E-mail de Reserva' da página Adicionar). Ali você edita o e-mail de confirmação que o cliente recebe: assunto, texto de prévia, imagens do topo e do rodapé, título, mensagens, aviso, endereço, bloco de cancelamento e assinatura. As variáveis ({nome}, {codigo}, {data}, {data_curta}, {dia_semana}, {horario}, {pessoas}) são trocadas pelos dados de cada reserva — clique em um campo e depois na variável para inseri-la. Use **texto** para negrito. A pré-visualização ao lado atualiza enquanto você digita (com visão de computador e de celular). O código da reserva e o link de cancelamento sempre aparecem e não podem ser removidos. As mudanças só valem depois de 'Salvar alterações' (ou Ctrl + S); depois de salvar, use 'Enviar um teste' para receber o e-mail de verdade. 'Restaurar padrão' volta ao conteúdo original (também precisa salvar).",
  },

  // ── USUÁRIOS ──────────────────────────────────────────────────
  {
    category: "usuarios",
    title: "Visão geral da página Usuários",
    description:
      "Controla quem tem acesso ao admin. Só entra no admin quem está na lista de administradores — estar logado não basta. A página tem duas listas: 'Pedidos de acesso' (contas criadas em /signup esperando aprovação, com e-mail e data do pedido) e 'Administradores' (quem já tem acesso, com a etiqueta 'você' na sua conta). O item 'Usuários' do menu lateral mostra um contador quando há pedidos esperando.",
  },
  {
    category: "usuarios",
    title: "Como um novo administrador ganha acesso",
    description:
      "A pessoa cria a conta em /signup (link 'Criar conta' na tela de login) com e-mail e senha — não existe mais token de criação. Ela recebe um e-mail para confirmar o endereço, e o pedido aparece em Usuários → 'Pedidos de acesso'. Até alguém aprovar, ao tentar entrar ela vê 'Seu acesso está aguardando a aprovação de um administrador.'. Clique em 'Aprovar' para liberar o acesso (ou 'Recusar' para descartar o pedido). Só aprove quem você conhece.",
  },
  {
    category: "usuarios",
    title: "Como remover o acesso de um administrador",
    description:
      "Em Usuários → 'Administradores', clique em 'Remover acesso' ao lado da pessoa. Ninguém consegue remover o próprio acesso (para nunca ficar sem administradores). Remover o acesso ou recusar um pedido não apaga a conta — a pessoa só deixa de entrar no admin.",
  },
  {
    category: "usuarios",
    title: "Como excluir uma conta de vez",
    description:
      "Em Usuários, o botão de lixeira ao lado de um administrador ou de um pedido de acesso apaga a conta de vez: o login e todos os dados dela. Se a pessoa também alugou jogos, o histórico de aluguéis encerrados sai junto; com aluguel em andamento ou reembolso pendente a exclusão é recusada com o motivo. Ninguém exclui a própria conta. Não pode ser desfeito. Contas master (marcadas com a coroa) são protegidas: só outro master remove o acesso ou exclui — para um admin normal aparece 'Protegido'. Quem é master é definido direto no banco (campo role = 'master' no documento do admin).",
  },
  {
    category: "usuarios",
    title: "Contas de cliente do aluguel x contas de administrador",
    description:
      "Os clientes do aluguel também têm conta (criada em /aluguel/cadastro), mas ela não dá acesso ao admin: se um cliente tentar entrar pela tela de login do admin, aparece 'Esta conta não tem acesso à área do administrador.'. Um administrador pode alugar jogos com a própria conta — basta completar o perfil de cliente (nome, WhatsApp e CPF) no aluguel.",
  },
  {
    category: "usuarios",
    title: "E-mails de confirmação e de redefinição de senha",
    description:
      "Os e-mails de confirmação de e-mail e de redefinição de senha (do admin e do aluguel) saem com o visual do Carcassonne Pub. O link abre uma página do próprio site (/conta/acao), onde a pessoa confirma o e-mail ou cria a nova senha e depois volta para o login certo. O link de nova senha vale por 1 hora. Por segurança, 'Esqueci minha senha' sempre mostra a mesma mensagem — mesmo para e-mails que não existem — e cada endereço recebe no máximo um e-mail por minuto.",
  },

  // ── CONFIGURAÇÕES ─────────────────────────────────────────────
  {
    category: "configuracoes",
    title: "Visão geral da página Configurações",
    description:
      "Centraliza estatísticas do sistema e as configurações globais do site. Está dividida em seções: a aba 'Estatísticas' (com as subabas 'Reservas', 'Aluguel', 'Links' e 'Banco de dados'), a aba 'Configurações' (com as subabas 'Reservas', 'Aluguel' e 'Geral', onde ficam os efeitos de mouse), temas sazonais do site (aba 'Temas'), os e-mails enviados pelo site (aba 'E-mails', com o editor do e-mail de reserva) e o editor do painel decorativo (mural).",
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
      "Em Estatísticas → 'Links' existe um gráfico de barras com o ranking de cliques em cada link, no período escolhido (o mesmo seletor de período das reservas), ordenado do mais clicado para o menos. Cada clique de cliente na página de linktree é registrado automaticamente.",
  },
  {
    category: "configuracoes",
    title: "Banco de dados e saúde dos dados",
    description:
      "Em Estatísticas → 'Banco de dados'. No topo, 'Saúde dos dados' lista o que provavelmente precisa de atenção, cada item com 'Resolver →' levando à página certa: jogos da ludoteca sem imagem ou sem descrição, itens do cardápio sem preço, jogos de aluguel ativos sem cópia ativa ou sem imagem, pedidos de acesso ao admin esperando, links visíveis sem cliques há 90 dias e, a partir de 50, aluguéis encerrados que dá para limpar. Se nada aparecer, está tudo em ordem. Abaixo, um card por área (Ludoteca, Cardápio, Reservas, Aluguel, Eventos, Site e Equipe) com os números principais; clicar no card abre a página da área. Os números são contados direto no Firebase (sem baixar tudo), e o botão 'Atualizar' conta de novo.",
  },
  {
    category: "configuracoes",
    title: "Exportar estatísticas (PDF ou Excel)",
    description:
      "Em Configurações → Estatísticas, acima de cada subaba há 'Exportar …: PDF / Excel'. O PDF sai como a subaba aparece na tela (gráficos incluídos). O Excel (.xlsx) traz uma aba por tabela da subaba aberta — ex.: em Aluguel, resumo, jogos mais alugados, formas de pagamento e aluguéis por mês; valores em reais como número, prontos para somar.",
  },
  {
    category: "configuracoes",
    title: "Estatísticas de e-mails (Resend)",
    description:
      "Em Estatísticas → 'E-mails': quantos e-mails o site mandou hoje e no mês (com a barra do limite do plano), problemas (voltaram, falharam, marcados como spam), o gráfico dos últimos 30 dias, a situação de cada envio, quem enviou (Reservas, Aluguel) e os últimos e-mails. Precisa de uma chave do Resend com 'Full access' na Vercel como RESEND_STATS_API_KEY — a chave de envio não tem permissão de leitura; sem ela a página explica o que fazer.",
  },
  {
    category: "configuracoes",
    title: "Clientes por mês e público do dia",
    description:
      "Na página de Reservas, cada dia tem 'Quantas pessoas vieram?': anote o público real, contando quem veio sem reserva. Em Estatísticas → Reservas, o gráfico 'Clientes por mês' usa esse número nos dias anotados e, nos outros, as pessoas das reservas confirmadas. O balão de cada mês mostra quantos dias foram anotados.",
  },
  {
    category: "configuracoes",
    title: "Taxas do Mercado Pago",
    description:
      "Cada pagamento online aprovado guarda a taxa cobrada pelo Mercado Pago e o líquido que caiu na conta. O detalhe do pedido mostra 'Taxa do Mercado Pago' e 'Líquido recebido'; Estatísticas → Aluguel mostra o total pago online, as taxas (com a % do valor) e o líquido no período. Pedidos pagos antes dessa função não têm a taxa: abra o pedido e use 'Consultar no Mercado Pago' para completar.",
  },
  {
    category: "configuracoes",
    title: "Estatísticas do aluguel",
    description:
      "Em Estatísticas → 'Aluguel'. O bloco 'Agora' mostra quantas cópias estão fora (alugadas) do total ativo, os atrasados e as retiradas e devoluções de hoje. O bloco 'Por período' (30 dias, 3 meses, 6 meses, 1 ano ou Total, contado pela data de retirada) mostra: aluguéis (sem os cancelados), receita (soma dos aluguéis não cancelados) e quanto foi reembolsado, % de devoluções atrasadas, clientes que alugaram e contas novas; os jogos mais alugados; a situação dos aluguéis (devolvidos, em andamento, cancelados); como pagaram (balcão, Pix, cartão, saldo do Mercado Pago); quem cancelou (cliente, admin ou prazo de pagamento esgotado) e os clientes que mais alugaram. No fim, o gráfico de aluguéis por mês, com troca de ano.",
  },
  {
    category: "configuracoes",
    title: "Onde ficam as configurações de reserva e de aluguel",
    description:
      "Em Configurações → aba 'Configurações' há três subabas: 'Reservas' (horários, dias sem reserva, capacidade, antecedência, lotação no calendário, datas bloqueadas e especiais), 'Aluguel' (o mesmo quadro de Aluguel → Regras: serviço ativo, dias de retirada, limites, CPF e pagamento online; enquanto o aluguel estiver em teste, pede a senha) e 'Geral' (informações do pub, aviso no site, áreas do site, prévia ao compartilhar, e-mails da equipe, sessão do admin e efeitos de mouse). As mesmas configurações também abrem na página de cada área: em Reservas, pelo botão de engrenagem no topo; no Aluguel, na aba 'Regras'. É a mesma configuração nos dois lugares — salvar em um muda no outro. Cada quadro tem o próprio botão 'Salvar' e só grava os próprios campos.",
  },
  {
    category: "configuracoes",
    title: "Informações do pub e horário de funcionamento",
    description:
      "Em Configurações → 'Configurações' → 'Geral' → 'Informações do pub': endereço, link do mapa, WhatsApp, e-mail, Instagram, Facebook e site. Eles aparecem na página de reserva, no regulamento, no PDF do cardápio e no e-mail de confirmação do aluguel — mudou o telefone, muda aqui e vale em todo lugar. Campo vazio volta ao valor padrão. Logo abaixo, o horário de funcionamento de cada dia (se fechar depois da meia-noite, use o horário da madrugada, ex.: 18:00 às 02:00) e a opção de mostrar o selo 'Aberto agora · fecha às 2h' / 'Fechado · abre amanhã às 18h' no linktree e na página de reserva.",
  },
  {
    category: "configuracoes",
    title: "Aviso no site",
    description:
      "Em 'Geral' → 'Aviso no site': escreva o texto, escolha o estilo (Informação, Atenção ou Festa), o período (de/até — vazio = desde já / até desligar) e, se quiser, um link. A faixa aparece no topo de todas as páginas do site enquanto estiver no período; o painel mostra se está 'No ar agora', 'Agendado' ou 'Encerrado', com a prévia. O cliente pode fechar a faixa; um aviso com texto novo aparece de novo.",
  },
  {
    category: "configuracoes",
    title: "Ligar e desligar áreas do site",
    description:
      "Em 'Geral' → 'Áreas do site': desligue Reservas, Ludoteca, Cardápio, Eventos ou a Recomendação de música (que também esconde o botão flutuante). Quem abrir uma área desligada vê a mensagem que você escrever (ou a padrão) com botões para o linktree e o WhatsApp. O aluguel tem a própria chave em Configurações → Aluguel.",
  },
  {
    category: "configuracoes",
    title: "Prévia ao compartilhar o link",
    description:
      "Em 'Geral' → 'Prévia ao compartilhar': título, descrição e imagem (ideal 1200 × 630) que aparecem quando alguém manda o link do site no WhatsApp, Instagram ou Facebook. O painel mostra como fica. A mudança pode levar alguns minutos, e o WhatsApp guarda a prévia antiga por um tempo.",
  },
  {
    category: "configuracoes",
    title: "E-mails da equipe",
    description:
      "Em 'Geral' → 'E-mails da equipe': os e-mails que recebem o aviso de nova reserva (um por linha ou separados por vírgula). Vazio = vai para o e-mail de contato do pub. O destino é decidido pelo servidor. O aviso de novo aluguel usa o e-mail da equipe definido em Configurações → Aluguel.",
  },
  {
    category: "configuracoes",
    title: "Sessão do admin",
    description:
      "Em 'Geral' → 'Sessão do admin': depois de quanto tempo sem usar o admin é preciso entrar de novo — 8 horas, 1 dia, 3 dias ou 7 dias. Vale para todos os administradores.",
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
    title: "Como mostrar a lotação de cada dia no calendário de reservas",
    description:
      "Em Configurações, na seção 'Capacidade e antecedência', marque 'Mostrar a lotação de cada dia no calendário' e clique em 'Salvar'. A partir daí, no calendário da página de reservas, cada dia aberto mostra embaixo do número quantos lugares já foram reservados do total do dia — por exemplo 45/75, usando a 'Capacidade máxima em um dia' como total e somando só as reservas confirmadas. A contagem fica laranja quando o dia passa de 80% e vermelha quando lota; ao escolher um dia, aparece também '45 de 75 lugares reservados'. Dias fechados (dia da semana sem reserva, datas bloqueadas, passados ou além do prazo) não mostram contagem. Desmarque a opção e salve para esconder de novo.",
  },
  {
    category: "configuracoes",
    title: "Como controlar os efeitos visuais do site",
    description:
      "Em Configurações → aba 'Configurações' → subaba 'Geral' → 'Efeitos de mouse' há três toggles: 'Efeito de clique' (faíscas ao clicar), 'Destaque de cursor' (elemento que acompanha o mouse) e 'Efeito de cursor' (rastro no cursor). Eles aparecem nas telas do admin. Dá para escolher a intensidade do clique (Suave, Normal, Forte) e, por padrão, os efeitos ficam desligados no celular/tablet e para quem ativou 'reduzir movimento' no sistema — as duas opções podem ser desmarcadas.",
  },
  {
    category: "temas",
    title: "Como trocar o tema do site (Halloween, Natal, Carnaval e outros)",
    description:
      "Em Configurações → aba 'Temas', escolha um dos 12 temas: Padrão, Carnaval, St. Patrick's Day, Páscoa, Aniversário do Carcassonne, Dia dos Namorados, Festa Junina, Oktoberfest, Halloween, Natal, Réveillon e Noite de Torneio (para dias de campeonato). O tema muda o visual do site dos clientes (links, cardápio, reservas, ludoteca, aluguel, eventos, músicas, regras) e também do admin. Só o login e o cadastro do admin e a página de confirmação de e-mail/nova senha mantêm sempre o visual padrão. O preto e o dourado do Carcassonne continuam, e o tema soma decorações animadas em estilo de gravura medieval (traço com hachura): a silhueta da Cité de Carcassonne no rodapé e os elementos de cada data — por exemplo, bandeirinhas, fogueira e balões na Festa Junina; canecas brindando e lúpulo na Oktoberfest; fogos atrás da Cité e taças no Réveillon; estandartes, troféu e holofotes na Noite de Torneio — além de um enfeite nos logos, um brilho na cor do tema nos títulos e decoração no cabeçalho do cardápio e no menu lateral do admin. Ao clicar num card, a lista 'O que aparece no site' mostra tudo o que aquele tema traz e o celular ao lado mostra a prévia ao vivo; o site só muda depois de 'Aplicar no site'. A troca é em tempo real: quem estiver com qualquer página aberta vê o tema mudar na hora, sem recarregar. O selo 'No ar' indica o tema que está valendo. Para voltar ao normal, escolha 'Padrão' e aplique. Quem usa 'reduzir movimento' no celular vê o tema sem animação.",
  },
  {
    category: "temas",
    title: "Versão completa ou minimalista de um tema",
    description:
      "Cada tema tem duas versões. Em Configurações → aba 'Temas', clique no card do tema e escolha em 'Versão do tema': 'Completa' é o tema com todas as decorações e animações (a Cité no rodapé, os enfeites de cada data e as coisas passando pela tela); 'Minimalista' deixa o site mais limpo — fica só a decoração do topo (varal, guirlanda ou estandartes, ou a lua no Halloween), poucas partículas, o enfeite nos logos e a cor de destaque, sem a muralha no rodapé e sem nada passando pela tela. Na versão minimalista, o cabeçalho do cardápio e o menu lateral do admin ficam só com a faixa do tema, e os botões flutuantes do cardápio e da ludoteca voltam para o lugar de sempre. A escolha fica salva em cada tema: se o tema está no ar, o site muda na hora; se não está, ela vale quando ele for aplicado. A lista 'O que aparece no site' e a prévia do celular mostram a versão escolhida, e o card do tema ganha o selo 'Minimalista'.",
  },
  {
    category: "temas",
    title: "Como criar um aviso para lembrar de ativar um tema",
    description:
      "Cada tema pode ter um aviso com período. Em Configurações → aba 'Temas', clique no card do tema e, no quadro 'Aviso para ativar', escolha as datas 'De' e 'Até' e clique em 'Criar aviso'. Por padrão o aviso se repete todo ano ('Repetir todo ano' ligado), então você escolhe só o dia e o mês — o período pode até atravessar a virada do ano, como 26/12 a 02/01. Desligando 'Repetir todo ano', as datas passam a ter ano e o aviso vale só para aquele período (bom para datas que mudam de um ano para outro, como Carnaval e Páscoa). Durante esse período, se o tema não estiver no ar, aparece um selo laranja piscando no item 'Configurações' do menu lateral (passando o mouse, ele mostra quais temas estão esperando; no celular, um pontinho laranja aparece no botão do menu) e um contador na aba 'Temas'. Enquanto houver aviso, clicar em Configurações no menu já abre direto a aba Temas, onde o topo lista os temas para ativar com os botões 'Ver prévia', 'Aplicar agora' e 'Silenciar'. O aviso some sozinho quando o tema é aplicado ou quando o período termina. O botão 'Notificações ligadas/desligadas' liga e desliga os avisos daquele tema sem perder o período salvo; 'Salvar período' troca as datas e 'Remover' apaga o aviso. Nos cards, um sininho com as datas mostra quais temas têm aviso (com o símbolo de repetição quando é todo ano): laranja = avisando agora, verde = no período e já no ar, dourado = agendado, apagado = silenciado ou encerrado. Os avisos valem para todos os admins e atualizam em tempo real.",
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
    category: "cardapio",
    title: "Como adicionar e agendar um popup no site",
    description:
      "Na página Cardápio, clique no ícone de ajustes (tooltip: 'Organizar e popups') no cabeçalho e escolha 'Popups' — lá ficam a lista e o formulário. Um popup é um banner que aparece automaticamente para os clientes ao entrar no cardápio. Você define a imagem e, opcionalmente, um nome interno (só aparece aqui no admin, pra te ajudar a identificar o popup), um título e uma descrição (esses dois aparecem pro cliente, abaixo da imagem). Cada popup pode ter um ou mais horários — dias da semana + hora de início e fim — em que fica visível; sem nenhum horário definido, ele fica ativo o dia inteiro, todos os dias, enquanto o toggle 'ativo' estiver ligado. Se dois popups ativos tiverem horários que se sobrepõem, o sistema mostra um aviso de conflito (na lista e ao editar) — nesse caso, só um deles é exibido por vez.",
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
