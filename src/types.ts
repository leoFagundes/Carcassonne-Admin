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
  orderPriority?: number;
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
  blockedDates: { date: string; reason?: string }[]; // date as "YYYY-MM-DD"
  specialDates: { date: string; description?: string }[]; // date as "YYYY-MM-DD"
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
  canceledAt?: string;
  canceledReason?: string;
  canceledBy?: "user" | "admin";
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
  isStandby: boolean;
  bookingDate: {
    day: string;
    month: string;
    year: string;
  };
}

export interface LinkType {
  id?: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  order?: number;
  clicks?: number;
  clicksByDay?: Record<string, number>;
  isVisible?: boolean;
}

export interface EventItemType {
  id?: string;
  name: string;
  description: string;
  icon: string;
  subtype: "bolao" | "quiz";
  isActive: boolean;
  createdAt?: Timestamp;
  // Quiz-specific
  quizStatus?: "waiting" | "running" | "finished";
  quizDuration?: number; // seconds (legacy)
  quizStartedAt?: Timestamp;
  quizPrize?: string;
  quizResultsVisible?: boolean;
  quizChampionId?: string; // participantId of the crowned champion
}

export interface QuizQuestionType {
  id?: string;
  eventId: string;
  text: string;
  type: "multiple_choice" | "text";
  options?: string[];
  correctOption?: number; // index (0-based)
  points: number;
  timeSeconds: number; // seconds the participant has to answer this question
  order?: number;
}

export interface QuizParticipantType {
  id?: string;
  eventId: string;
  participantId: string;
  name: string;
  mesa?: string;
  answers: Record<string, {
    answer: string | number;
    isCorrect?: boolean;
    pointsEarned?: number;
  }>;
  totalScore: number;
  timeTakenSeconds?: number; // sum of per-correct-question times in seconds (float, ms precision)
  questionTimes?: Record<string, number>; // ms spent per question, keyed by questionId
  submittedAt?: Timestamp;
}

export interface BolaoTeamType {
  id?: string;
  name: string;
  image: string;
  eventId: string;
}

export interface BolaoMatchType {
  id?: string;
  eventId: string;
  teamAId: string;
  teamBId: string;
  date?: string;
  order?: number;
}

export interface BolaoParticipantType {
  id?: string;
  eventId: string;
  participantId: string;
  name: string;
  predictions: Record<string, { scoreA: number; scoreB: number }>;
  createdAt?: Timestamp;
}
