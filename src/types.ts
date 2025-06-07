export interface User {
  id?: string;
  email: string;
  password: string;
}

export interface BoardgameType {
  id?: string;
  name: string;
  description: string;
  difficulty: string;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  featured: boolean;
  isVisible: boolean;
  image: string;
  types: string[];
  isForSale: boolean;
  value?: string;
}

export interface MenuItemType {
  id?: string;
  name: string;
  description: string;
  value: string;
  type: string;
  subtype?: string;
  observation?: string[];
  sideDish?: string[];
  image?: string;
  isVegan: boolean;
  isFocus: boolean;
  isVisible: boolean;
}

export interface ComboType {
  id?: string;
  name: string;
  description: string;
  value: string;
}

export interface InfoType {
  id?: string;
  name: string;
  description: string;
  values: string[];
}

export interface DescriptionTypeProps {
  id?: string;
  type: string;
  description: string;
}

export interface GeneralConfigsType {
  _id?: string;
  popUpImage: string;
  clickEffect: boolean;
  followCursor: boolean;
  canvasCursor: boolean;
}

export interface CarcaImageType {
  id?: string;
  src: string;
  description: string;
  top: string;
  left: string;
  width: string;
  height: string;
  rotate: string;
}

export interface TypeOrderType {
  id?: string;
  type: {
    name: string;
    order: number;
    subtypes: {
      name: string;
      order: number;
    }[];
  };
}
