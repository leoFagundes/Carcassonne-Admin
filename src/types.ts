import { Timestamp } from "firebase/firestore";

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
  clickEffect: boolean;
  followCursor: boolean;
  canvasCursor: boolean;
  maxCapacityInDay: number;
  maxCapacityInReserve: number;
  enabledTimes: string[];
  disabledDays: number[];
  maxMonthsInAdvance: number;
  hoursToCloseReserve: number;
  isMusicRecommendationEnable: boolean;
}

export interface PopupType {
  id?: string;
  src: string;
  label: string;
  isActive: boolean;
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

export interface ReserveType {
  id?: string;
  code: string;
  bookingDate: {
    day: string;
    month: string;
    year: string;
  };
  time: string;
  name: string;
  phone: string;
  email: string;
  observation?: string;
  adults: number;
  childs: number;
  status: "confirmed" | "canceled";
  table?: string;
  createdAt?: Timestamp;
}

export interface TableType {
  id?: string;
  code: string;
  capacity: number;
  combinableWith?: string[];
  priority: number;
}

export interface MusicRecommendationType {
  id?: string;
  name: string;
  createdAt?: Date | Timestamp;
}

export interface FreelancerControllType {
  id?: string;
  name: string;
  isPayed: boolean;
  bookingDate: {
    day: string;
    month: string;
    year: string;
  };
}
