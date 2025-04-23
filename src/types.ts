export interface BoardgameType {
  name: string;
  description: string;
  difficulty: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  image: string;
  type: string;
}

export interface MenuItemType {
  name: string;
  description: string;
  value: string;
  type: string;
  observation?: string[];
  extra?: string[];
  image: string;
  isVegan: boolean;
  isFocus: boolean;
  isVisible: boolean;
}

export interface CombosType {
  name: string;
  description: string;
  value: string;
  activeDay: (
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "everyDay"
  )[];
}

export interface InfoType {
  name: string;
  description: string;
  values: string[];
}
