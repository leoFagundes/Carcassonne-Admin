import type { RentalRulesType, RentalSettingsType } from "@/types";

export const DEFAULT_RENTAL_SETTINGS: RentalSettingsType = {
  isEnabled: false,
  pickupWeekdays: [0, 1, 2, 3, 4, 5, 6],
  maxAdvanceDays: 30,
  maxGamesPerOrder: 3,
  maxActiveGamesPerCustomer: 3,
  requireCpf: true,
};

const PLACEHOLDER = "A definir pelo Carcassonne Pub.";

export const DEFAULT_RENTAL_RULES: RentalRulesType = {
  version: 1,
  sections: [
    { id: "prazos", title: "Prazos e períodos de aluguel", body: PLACEHOLDER },
    { id: "retirada-devolucao", title: "Retirada e devolução", body: PLACEHOLDER },
    { id: "atrasos", title: "Atrasos", body: PLACEHOLDER },
    { id: "pagamento", title: "Formas de pagamento", body: PLACEHOLDER },
    { id: "danos", title: "Danos aos jogos", body: PLACEHOLDER },
    { id: "pecas", title: "Perda de peças ou componentes", body: PLACEHOLDER },
    { id: "furto", title: "Furto ou extravio", body: PLACEHOLDER },
    { id: "demais", title: "Demais condições", body: PLACEHOLDER },
  ],
};
