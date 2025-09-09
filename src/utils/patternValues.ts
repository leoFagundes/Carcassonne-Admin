import {
  BoardgameType,
  MenuItemType,
  ComboType,
  InfoType,
  DescriptionTypeProps,
  GeneralConfigsType,
  CarcaImageType,
  TypeOrderType,
  PopupType,
} from "@/types";

export const longMonths: { [key: string]: string } = {
  "1": "janeiro",
  "01": "janeiro",
  "2": "fevereiro",
  "02": "fevereiro",
  "3": "março",
  "03": "março",
  "4": "abril",
  "04": "abril",
  "5": "maio",
  "05": "maio",
  "6": "junho",
  "06": "junho",
  "7": "julho",
  "07": "julho",
  "8": "agosto",
  "08": "agosto",
  "9": "setembro",
  "09": "setembro",
  "10": "outubro",
  "11": "novembro",
  "12": "dezembro",
};

export const daysMap: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terça: 2,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sábado: 6,
  sabado: 6,
};

export const daysArray = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const difficultiesOptions = [
  "Muito Leve",
  "Leve",
  "Médio",
  "Pesado",
  "Muito Pesado",
];

export const patternBoardgame: BoardgameType = {
  name: "",
  description: "",
  difficulty: "",
  minPlayers: 0,
  maxPlayers: 0,
  playTime: 0,
  featured: false,
  isVisible: true,
  image: "",
  types: [],
  isForSale: false,
  value: "",
};

export const patternMenuItem: MenuItemType = {
  name: "",
  description: "",
  value: "",
  type: "",
  subtype: "",
  observation: [],
  sideDish: [],
  image: "",
  isVegan: false,
  isFocus: false,
  isVisible: true,
};

export const patternCombo: ComboType = {
  name: "",
  description: "",
  value: "",
};

export const patternInfo: InfoType = {
  name: "",
  description: "",
  values: [],
};

export const patternDescriptionType: DescriptionTypeProps = {
  description: "",
  type: "",
};

export const patternGeneralConfigs: GeneralConfigsType = {
  clickEffect: false,
  followCursor: false,
  canvasCursor: false,
  maxCapacityInDay: 0,
  maxCapacityInReserve: 0,
  enabledTimes: [],
  disabledDays: [],
  maxMonthsInAdvance: 0,
  hoursToCloseReserve: 0,
  isMusicRecommendationEnable: false,
};

export const patternPopup: PopupType = {
  src: "",
  label: "",
  isActive: false,
};

export const patternCarcaImage: CarcaImageType = {
  src: "",
  description: "",
  width: "224px",
  height: "224px",
  left: "",
  top: "",
  rotate: "",
};

export const patternTypeOrder: TypeOrderType = {
  type: {
    name: "",
    order: 0,
    subtypes: [],
  },
};
