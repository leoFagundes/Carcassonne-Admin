import type { SnakeMode } from "@/types";

export type Direction = "up" | "down" | "left" | "right";
export type { SnakeMode };

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  snake: Point[]; // cabeça no índice 0
  direction: Direction;
  food: Point;
  obstacles: Point[];
  score: number;
  gameOver: boolean;
  gridSize: number;
  mode: SnakeMode;
}

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// A cada N comidas, o modo obstáculos adiciona uma nova pedra na grade.
const OBSTACLE_EVERY_N_FOODS = 1;

// Raio (em células, distância de Chebyshev) ao redor da cabeça onde um novo
// obstáculo nunca pode nascer — sem isso, a pedra podia aparecer colada ou
// até em cima da cabeça, sem tempo nenhum de reação pro jogador desviar.
const OBSTACLE_SAFE_RADIUS = 3;

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

function keyOf(p: Point): string {
  return `${p.x},${p.y}`;
}

function pickFreeCell(gridSize: number, occupiedPoints: Point[]): Point | null {
  const occupied = new Set(occupiedPoints.map(keyOf));
  const free: Point[] = [];
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

/** Escolhe uma célula livre para a comida — nunca sorteia em cima da cobra ou de obstáculos. */
export function pickFoodCell(
  snake: Point[],
  gridSize: number,
  obstacles: Point[] = [],
): Point {
  // Grade cheia (vitória absoluta) — não deveria acontecer na prática.
  return pickFreeCell(gridSize, [...snake, ...obstacles]) ?? snake[0];
}

/**
 * Escolhe uma célula livre pra um novo obstáculo — nunca em cima da cobra,
 * comida, outro obstáculo, ou perto demais da cabeça (ver OBSTACLE_SAFE_RADIUS).
 * Se essa folga deixar a grade sem opção nenhuma (grade muito cheia), cai pro
 * sorteio sem a folga em vez de simplesmente não colocar o obstáculo.
 */
export function pickObstacleCell(
  snake: Point[],
  gridSize: number,
  obstacles: Point[],
  food: Point,
): Point | null {
  const head = snake[0];
  const nearHead: Point[] = [];
  for (let dx = -OBSTACLE_SAFE_RADIUS; dx <= OBSTACLE_SAFE_RADIUS; dx++) {
    for (let dy = -OBSTACLE_SAFE_RADIUS; dy <= OBSTACLE_SAFE_RADIUS; dy++) {
      nearHead.push({ x: head.x + dx, y: head.y + dy });
    }
  }
  const occupied = [...snake, ...obstacles, food, ...nearHead];
  return pickFreeCell(gridSize, occupied) ?? pickFreeCell(gridSize, [...snake, ...obstacles, food]);
}

export function createInitialState(gridSize: number, mode: SnakeMode): GameState {
  const mid = Math.floor(gridSize / 2);
  const snake: Point[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return {
    snake,
    direction: "right",
    food: pickFoodCell(snake, gridSize),
    obstacles: [],
    score: 0,
    gameOver: false,
    gridSize,
    mode,
  };
}

/**
 * Avança o jogo em um passo. Pura — recebe o estado atual e a direção
 * solicitada, devolve o novo estado. Reversões instantâneas (ex: indo para a
 * direita e pedindo esquerda) são ignoradas, mantendo a direção atual.
 */
export function step(
  state: GameState,
  requestedDirection: Direction
): GameState {
  if (state.gameOver) return state;

  const direction = isOpposite(state.direction, requestedDirection)
    ? state.direction
    : requestedDirection;

  const delta = DELTA[direction];
  const head = state.snake[0];
  const newHead: Point = { x: head.x + delta.x, y: head.y + delta.y };

  const hitWall =
    newHead.x < 0 ||
    newHead.x >= state.gridSize ||
    newHead.y < 0 ||
    newHead.y >= state.gridSize;

  if (hitWall) {
    return { ...state, direction, gameOver: true };
  }

  const eating = newHead.x === state.food.x && newHead.y === state.food.y;

  // Quando NÃO come, a cauda anda junto (o último segmento libera a célula
  // no mesmo instante) — por isso ela precisa ser excluída da checagem de
  // colisão, senão a cobra "morre" ao encostar no próprio rabo em movimento.
  const bodyToCheck = eating ? state.snake : state.snake.slice(0, -1);
  const hitSelf = bodyToCheck.some(
    (seg) => seg.x === newHead.x && seg.y === newHead.y
  );

  if (hitSelf) {
    return { ...state, direction, gameOver: true };
  }

  const hitObstacle = state.obstacles.some(
    (o) => o.x === newHead.x && o.y === newHead.y,
  );

  if (hitObstacle) {
    return { ...state, direction, gameOver: true };
  }

  const newSnake = eating
    ? [newHead, ...state.snake]
    : [newHead, ...state.snake.slice(0, -1)];
  const newScore = eating ? state.score + 1 : state.score;

  let obstacles = state.obstacles;
  const food = eating
    ? pickFoodCell(newSnake, state.gridSize, obstacles)
    : state.food;

  if (
    eating &&
    state.mode === "obstacles" &&
    newScore % OBSTACLE_EVERY_N_FOODS === 0
  ) {
    const newObstacle = pickObstacleCell(newSnake, state.gridSize, obstacles, food);
    if (newObstacle) obstacles = [...obstacles, newObstacle];
  }

  return {
    ...state,
    snake: newSnake,
    direction,
    score: newScore,
    food,
    obstacles,
  };
}

export const TICK_DURATION_BASE_MS = 110;
export const TICK_DURATION_FLOOR_MS = 50;
// Passo por ponto, em ms — só o modo normal acelera com a pontuação; o
// desafio do modo obstáculos já vem das pedras, então a velocidade fica
// fixa lá (ver tickDurationForScore abaixo).
const TICK_DURATION_STEP_MS = 2.5;

/**
 * Velocidade progressiva: só o modo "normal" acelera com a pontuação (com
 * piso de segurança); o modo "obstáculos" fica sempre na velocidade base,
 * sem rampa — a dificuldade ali cresce com as pedras, não com a velocidade.
 * Intervalo mais curto que o original — a virada só é aplicada no próximo
 * passo do grid, então um intervalo menor também reduz o atraso entre
 * apertar a tecla e a cobra realmente virar.
 */
export function tickDurationForScore(score: number, mode: SnakeMode): number {
  if (mode === "obstacles") return TICK_DURATION_BASE_MS;
  return Math.max(
    TICK_DURATION_FLOOR_MS,
    TICK_DURATION_BASE_MS - score * TICK_DURATION_STEP_MS,
  );
}

/** Multiplicador de velocidade em relação ao início (1x), pra exibir na tela. */
export function speedMultiplierForScore(score: number, mode: SnakeMode): number {
  return TICK_DURATION_BASE_MS / tickDurationForScore(score, mode);
}

/** Quão perto a velocidade atual está do teto (0 a 100), pra exibir uma barra. */
export function speedPercentForScore(score: number, mode: SnakeMode): number {
  const current = tickDurationForScore(score, mode);
  return Math.round(
    ((TICK_DURATION_BASE_MS - current) /
      (TICK_DURATION_BASE_MS - TICK_DURATION_FLOOR_MS)) *
      100,
  );
}
