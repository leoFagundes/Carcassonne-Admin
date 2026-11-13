/**
 * O mapa está em desenvolvimento: fica atrás da senha de testes
 * (`ConstructionGate`). A mesma chave vale para a página e para o atalho em
 * Reservas, então liberar um libera o outro até fechar a aba.
 * Para liberar de vez, tire o `<ConstructionGate>` de mapa/page.tsx e de
 * myreserves/page.tsx.
 */
export const MAP_GATE_KEY = "carcassonne-mapa-unlocked";
