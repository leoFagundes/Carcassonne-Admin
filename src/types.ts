export interface User {
  email: string;
  password: string;
}

export interface BoardgameType {
  name: string;
  description: string;
  difficulty: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  featured: boolean;
  image: string;
  type: string;
}

export interface MenuItemType {
  name: string;
  description: string;
  value: string;
  type: string;
  observation?: string[];
  sideDish?: string[];
  image: string;
  isVegan: boolean;
  isFocus: boolean;
  isVisible: boolean;
}

export interface ComboType {
  name: string;
  description: string;
  value: string;
}

export interface InfoType {
  name: string;
  description: string;
  values: string[];
}

export interface DescriptionTypeProps {
  type: string;
  description: string;
}
