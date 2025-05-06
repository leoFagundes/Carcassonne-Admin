import {
  BoardgameType,
  MenuItemType,
  ComboType,
  InfoType,
  DescriptionTypeProps,
  GeneralConfigsType,
} from "@/types";

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
  image: "",
  types: [],
};

export const patternMenuItem: MenuItemType = {
  name: "",
  description: "",
  value: "",
  type: "",
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
  popUpImage: "",
};
