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
  | "pillar"
  | "stage"
  // Lugares
  | "table"
  | "bench"
  | "sofa"
  | "pouf"
  | "chair"
  // Móveis e equipamentos
  | "gameshelf"
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

export interface LocalPt {
  x: number;
  y: number;
}

/** Formato da mesa: retangular (padrão) ou redonda/oval. */
export type TableShape = "rect" | "round";

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
  /** Mesa redonda/oval (o tamanho vira os diâmetros). */
  shape?: TableShape;
  /**
   * Ambiente ou área fechada com formato livre: pontos nos eixos do elemento
   * (relativos ao centro). Sem isso, é o retângulo w × d.
   */
  points?: LocalPt[];
  /** Ambiente sem o nome escrito no mapa. */
  hideLabel?: boolean;
  /** Posição do nome do ambiente em relação ao centro (eixos do ambiente). */
  lx?: number;
  ly?: number;
}

/** Imagem de fundo do andar (foto ou planta), para desenhar por cima. */
export interface LevelBackground {
  url: string;
  /** Caminho no Storage (para apagar ao trocar). */
  path?: string;
  /** Canto superior esquerdo e tamanho, em metros. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0 a 1. */
  opacity: number;
}

export interface PlanLevel {
  id: string;
  name: string;
  /** 0 = mais baixo. */
  order: number;
  bg?: LevelBackground;
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
  /** Clientes sem reserva que sentaram numa mesa (opcional; o estado sozinho também vale). */
  walkins: Record<string, Walkin>;
}

/** Cliente sem reserva numa mesa (ou em mesas juntas). */
export interface Walkin {
  tables: string[];
  name?: string;
  people: number;
  /** Quando sentou (ms). */
  at: number;
  /** Quando a mesa foi liberada (ms); sem isso, ainda está lá. */
  leftAt?: number;
}

/** A partir de `from` (AAAA-MM-DD), a sincronização fica ligada ou desligada. */
export interface SyncChange {
  from: string;
  on: boolean;
}

/** Configurações do mapa: /floorPlan/settings. */
export interface MapSettings {
  /**
   * Mudanças da sincronização com o campo "mesa" ("8, 9" junta a 8 e a 9),
   * em ordem. Cada uma vale do dia dela em diante; sem nenhuma, fica ligada.
   */
  syncHistory: SyncChange[];
  /** Quanto tempo uma reserva costuma ocupar a mesa (para ver por horário). */
  stayMinutes: number;
}

/** Arrumação guardada para reusar (ex.: "Noite de evento"). */
export interface DayTemplate {
  id: string;
  name: string;
  moves: Record<string, Pose>;
  names: Record<string, string>;
  hidden: Record<string, boolean>;
  groups: Record<string, TableGroup>;
  createdAt: number;
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
