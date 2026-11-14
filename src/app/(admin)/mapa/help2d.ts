/** Ajuda do botão "i" do mapa 2D, de acordo com o modo. */

type Row = { what: string; mouse: string; touch?: string };

const VIEW: Row[] = [
  { what: "Mover a vista", mouse: "arrastar o chão (fora dos objetos)", touch: "arrastar com um dedo" },
  { what: "Aproximar e afastar", mouse: "rodinha do mouse (vai na direção do ponteiro)", touch: "pinça com dois dedos" },
  { what: "Ver a planta inteira", mouse: "botão enquadrar, logo abaixo do −", touch: "botão enquadrar" },
];

export const HELP_DAY = {
  title: "Como mexer no mapa do dia",
  rows: [
    { what: "Ver uma mesa", mouse: "clicar na mesa: abre as reservas dela e as ações", touch: "tocar na mesa" },
    { what: "Juntar, sentar cliente sem reserva, mudar o estado", mouse: "escolha a mesa e use os botões do painel" },
    { what: "Mover mesas só neste dia", mouse: "ligue \"Mover mesas\" e arraste (os bancos vão junto)", touch: "ligue \"Mover mesas\" e arraste" },
    ...VIEW,
    { what: "Régua", mouse: "botão da régua: clique em dois pontos para medir", touch: "toque em dois pontos" },
    { what: "Tela cheia", mouse: "botão de tela cheia; Esc sai", touch: "botão de tela cheia" },
  ],
};

export const HELP_GAMES = {
  title: "Como mexer no mapa dos jogos",
  rows: [
    { what: "Abrir um armário", mouse: "clicar no armário: ele abre de frente com os jogos", touch: "tocar no armário" },
    { what: "Achar um jogo", mouse: "use \"Onde está?\" no painel: o armário acende no mapa" },
    { what: "Acender por categoria", mouse: "toque numa categoria no painel: os armários que têm ela acendem" },
    ...VIEW,
  ],
};

export const HELP_EDIT = {
  title: "Como mexer na planta",
  rows: [
    { what: "Escolher", mouse: "clicar no objeto; Shift ou Ctrl + clique soma à escolha", touch: "tocar no objeto" },
    { what: "Mover", mouse: "arrastar o objeto (segure Alt para sair da grade)", touch: "arrastar com o dedo" },
    { what: "Mudar o tamanho", mouse: "puxar as alças brancas (Alt ou Shift: sem grade)", touch: "puxar as alças brancas" },
    { what: "Girar", mouse: "puxar a bolinha dourada; R gira 90° (Shift + R para o outro lado)", touch: "puxar a bolinha dourada" },
    { what: "Ajuste fino", mouse: "setas movem 5 cm (Shift: 50 cm · Alt: 1 cm)" },
    { what: "Desfazer e refazer", mouse: "Ctrl + Z · Ctrl + Y (ou Ctrl + Shift + Z)" },
    { what: "Copiar, recortar, colar e duplicar", mouse: "Ctrl + C · Ctrl + X · Ctrl + V · Ctrl + D" },
    { what: "Excluir", mouse: "Delete ou Backspace (ou a lixeira no painel)" },
    { what: "Salvar a planta", mouse: "Ctrl + S ou o botão Salvar planta (nada vale antes disso)" },
    { what: "Tirar a escolha", mouse: "Esc, ou clicar no chão vazio" },
    { what: "Camadas", mouse: "botão de camadas: lista tudo, esconde (olhinho) e trava (cadeado)" },
    ...VIEW,
    { what: "Régua", mouse: "botão da régua: clique em dois pontos para medir", touch: "toque em dois pontos" },
  ],
};
