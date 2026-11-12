/**
 * Mapa do pub: a planta (fixa, editada no modo "Planta") e o que muda em cada
 * dia (mesas movidas, juntadas, renomeadas e o estado de cada uma).
 *
 * Coordenadas em metros, vistas de cima: x para a direita, y para baixo.
 * Cada elemento é um retângulo pelo centro (x, y), com largura `w` (eixo x do
 * próprio elemento), profundidade `d` (eixo y do elemento) e giro `rot` em
 * graus no sentido horário. No 3D, o y da planta vira o z da cena.
 */

export type ElementKind =
  // Estrutura
  | "room"
  | "block"
  | "wall"
  | "door"
  | "arch"
  | "window"
  | "curtain"
  | "stair"
  // Lugares
  | "table"
  | "bench"
  | "sofa"
  | "pouf"
  // Móveis e equipamentos
  | "shelf"
  | "cabinet"
  | "counter"
  | "steel"
  | "fridge"
  | "freezer"
  | "sink"
  | "toilet"
  | "elevator"
  | "barrel"
  | "keg"
  | "plant"
  | "deco"
  | "text";

export interface PlanElement {
  id: string;
  level: string;
  kind: ElementKind;
  x: number;
  y: number;
  w: number;
  d: number;
  rot: number;
  /** Nome: da mesa ("12"), do ambiente ("Salas") ou do objeto. */
  label?: string;
  /** Lugares (só mesas). */
  seats?: number;
  /** Variação visual do tipo (madeira/preta, com encosto, cor do vitral…). */
  variant?: string;
  /** Quantidade (pufes lado a lado, degraus, arcos pintados). */
  count?: number;
  /** Preso a outro elemento (banco preso à mesa): acompanha quando ele move. */
  parent?: string;
  /** Ambiente sem o nome escrito no mapa. */
  hideLabel?: boolean;
  /** Posição do nome do ambiente em relação ao centro (eixos do ambiente). */
  lx?: number;
  ly?: number;
}

export interface PlanLevel {
  id: string;
  name: string;
  /** 0 = mais baixo. */
  order: number;
}

export interface FloorPlan {
  levels: PlanLevel[];
  elements: PlanElement[];
  /** Pé-direito usado para empilhar os andares no 3D. */
  levelHeight: number;
}

/** Planta salva no banco, com versão para não sobrescrever a edição de outra pessoa. */
export interface StoredFloorPlan extends FloorPlan {
  version: number;
  updatedAt?: number;
}

export interface Pose {
  x: number;
  y: number;
  rot: number;
}

export type TableState = "free" | "reserved" | "occupied" | "blocked";
export type ManualState = Exclude<TableState, "reserved">;

export interface ManualMark {
  state: ManualState;
  /** Quando foi marcado (ms). */
  at: number;
}

export interface TableGroup {
  tables: string[];
  name?: string;
}

/** O que muda num dia: /floorPlanDays/{YYYY-MM-DD}. */
export interface DayPlan {
  date: string;
  moves: Record<string, Pose>;
  names: Record<string, string>;
  hidden: Record<string, boolean>;
  groups: Record<string, TableGroup>;
  /** Estado marcado à mão, por mesa ou por grupo. */
  manual: Record<string, ManualMark>;
}

/** O pedaço de uma reserva que o mapa usa. */
export interface MapReserve {
  id: string;
  name: string;
  time: string;
  table?: string;
  adults: number;
  childs: number;
  status: "confirmed" | "canceled";
  isArrived?: boolean;
  observation?: string;
}
