"use client";

import { useEffect, useRef, useState } from "react";
import {
  LuPlay,
  LuPause,
  LuChevronUp,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
} from "react-icons/lu";
import {
  createInitialState,
  isOpposite,
  step,
  tickDurationForScore,
  type Direction,
  type GameState,
  type Point,
} from "./gameLogic";

const MAX_QUEUED_DIRECTIONS = 2;
const SWIPE_THRESHOLD = 24; // px mínimos pra contar como um swipe, não um toque

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const GRID_SIZE = 20;
const CELL = 22;
const SIZE = GRID_SIZE * CELL;

const COLOR_BG = "#121111"; // primary-black
const COLOR_GRID = "rgba(230,197,107,0.06)"; // primary-gold bem apagado
const COLOR_FOOD = "#cc5826"; // invalid-color
const COLOR_SNAKE_HEAD = "#e6c56b"; // primary-gold
const COLOR_SNAKE_BODY = "#d4af37"; // secondary-gold

const KEY_TO_DIRECTION: Record<string, Direction> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};

type Status = "idle" | "playing" | "paused" | "over";

interface SnakeGameProps {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  /** Congela toda entrada (teclado/clique/toque) — usado enquanto o prompt de novo recorde está aberto. */
  inputDisabled?: boolean;
}

export default function SnakeGame({
  onScoreChange,
  onGameOver,
  inputDisabled = false,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatusState] = useState<Status>("idle");
  const [displayScore, setDisplayScore] = useState(0);

  const initialState = createInitialState(GRID_SIZE);
  const statusRef = useRef<Status>("idle");
  const stateRef = useRef<GameState>(initialState);
  const prevSnakeRef = useRef<Point[]>(initialState.snake);
  const directionQueueRef = useRef<Direction[]>([]);
  const lastTickRef = useRef<number | null>(null);
  const lastReportedScoreRef = useRef(0);
  const rafRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const onScoreChangeRef = useRef(onScoreChange);
  const onGameOverRef = useRef(onGameOver);
  const inputDisabledRef = useRef(inputDisabled);
  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
    onGameOverRef.current = onGameOver;
    inputDisabledRef.current = inputDisabled;
  }, [onScoreChange, onGameOver, inputDisabled]);

  function queueDirection(dir: Direction) {
    const queue = directionQueueRef.current;
    const effectiveCurrent =
      queue.length > 0 ? queue[queue.length - 1] : stateRef.current.direction;
    if (dir === effectiveCurrent || isOpposite(effectiveCurrent, dir)) return;
    if (queue.length >= MAX_QUEUED_DIRECTIONS) return;
    queue.push(dir);
  }

  function reportScore(newScore: number) {
    lastReportedScoreRef.current = newScore;
    setDisplayScore(newScore);
    onScoreChangeRef.current(newScore);
  }

  function setStatus(next: Status) {
    statusRef.current = next;
    setStatusState(next);
  }

  function startGame() {
    setStatus("playing");
    lastTickRef.current = null;
  }

  function pauseGame() {
    if (statusRef.current !== "playing") return;
    directionQueueRef.current = [];
    setStatus("paused");
  }

  function resumeGame() {
    if (statusRef.current !== "paused") return;
    prevSnakeRef.current = stateRef.current.snake;
    setStatus("playing");
    lastTickRef.current = null;
  }

  function restartGame() {
    stateRef.current = createInitialState(GRID_SIZE);
    prevSnakeRef.current = stateRef.current.snake;
    directionQueueRef.current = [];
    lastTickRef.current = null;
    reportScore(0);
    setStatus("playing");
  }

  function handlePrimaryAction() {
    if (inputDisabledRef.current) return;
    switch (statusRef.current) {
      case "idle":
        startGame();
        break;
      case "playing":
        pauseGame();
        break;
      case "paused":
        resumeGame();
        break;
      case "over":
        restartGame();
        break;
    }
  }

  /** Botão de direção (D-pad), teclado ou swipe — também (re)inicia o jogo se ele não estiver rodando. */
  function handleDirectionInput(dir: Direction) {
    if (inputDisabledRef.current) return;
    if (statusRef.current === "idle") {
      startGame();
    } else if (statusRef.current === "over") {
      restartGame();
    }
    queueDirection(dir);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    const dir: Direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up";
    handleDirectionInput(dir);
  }

  // ── Loop principal (rAF único, com acumulador de tempo) ──
  useEffect(() => {
    function draw(progress: number, timestamp: number) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const s = stateRef.current;
      const prevSnake = prevSnakeRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Grid sutil
      ctx.strokeStyle = COLOR_GRID;
      ctx.lineWidth = 1;
      for (let i = 1; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL, 0);
        ctx.lineTo(i * CELL, SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL);
        ctx.lineTo(SIZE, i * CELL);
        ctx.stroke();
      }

      // Comida — com leve pulso
      const pulse =
        statusRef.current === "playing" ? Math.sin(timestamp / 260) : 0;
      const fx = s.food.x * CELL + CELL / 2;
      const fy = s.food.y * CELL + CELL / 2;
      ctx.save();
      ctx.shadowColor = "rgba(204,88,38,0.65)";
      ctx.shadowBlur = 8 + pulse * 3;
      ctx.fillStyle = COLOR_FOOD;
      ctx.beginPath();
      ctx.arc(fx, fy, CELL * 0.24 + pulse * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cobra — cada segmento desliza suavemente da posição anterior até a atual
      s.snake.forEach((seg, i) => {
        const from = prevSnake[i] ?? prevSnake[prevSnake.length - 1] ?? seg;
        const gx = lerp(from.x, seg.x, progress);
        const gy = lerp(from.y, seg.y, progress);
        const x = gx * CELL + 1.5;
        const y = gy * CELL + 1.5;
        const w = CELL - 3;
        const isHead = i === 0;

        ctx.fillStyle = isHead ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, w, w, isHead ? 7 : 5);
        } else {
          ctx.rect(x, y, w, w);
        }
        ctx.fill();
      });
    }

    function loop(timestamp: number) {
      rafRef.current = requestAnimationFrame(loop);

      let progress = 1;

      if (statusRef.current === "playing" && !inputDisabledRef.current) {
        if (lastTickRef.current === null) lastTickRef.current = timestamp;
        const elapsed = timestamp - lastTickRef.current;
        const tickDuration = tickDurationForScore(stateRef.current.score);
        progress = Math.min(elapsed / tickDuration, 1);

        if (elapsed >= tickDuration) {
          lastTickRef.current = timestamp;
          prevSnakeRef.current = stateRef.current.snake;
          const nextDirection =
            directionQueueRef.current.shift() ?? stateRef.current.direction;
          stateRef.current = step(stateRef.current, nextDirection);
          progress = 0;

          if (stateRef.current.score !== lastReportedScoreRef.current) {
            reportScore(stateRef.current.score);
          }

          if (stateRef.current.gameOver) {
            progress = 1;
            setStatus("over");
            onGameOverRef.current(stateRef.current.score);
          }
        }
      } else if (statusRef.current === "playing") {
        // input travado (prompt de recorde aberto) — segura o relógio do tick
        lastTickRef.current = timestamp;
      }

      draw(progress, timestamp);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Teclado ──
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (inputDisabledRef.current) return;
      if (!e.key) return;
      const key = e.key.toLowerCase();

      if (key in KEY_TO_DIRECTION) {
        e.preventDefault();
        handleDirectionInput(KEY_TO_DIRECTION[key]);
        return;
      }

      if (key === " ") {
        e.preventDefault();
        handlePrimaryAction();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Pausa automática ao sair da aba ──
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) pauseGame();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          width: "100%",
          maxWidth: SIZE,
          aspectRatio: "1 / 1",
          backgroundColor: COLOR_BG,
          border: "1px solid rgba(230,197,107,0.2)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
          cursor: inputDisabled ? "default" : "pointer",
        }}
        onClick={handlePrimaryAction}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {status !== "playing" && !inputDisabled && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6"
            style={{ backgroundColor: "rgba(18,17,17,0.85)" }}
          >
            {status === "idle" && (
              <>
                <LuPlay size={26} className="text-primary-gold" />
                <p className="text-sm font-semibold text-primary-gold">
                  Toque, arraste ou use as setas pra começar
                </p>
                <p className="text-xs text-primary-gold/50">
                  Setas/WASD no teclado · swipe ou os botões no celular
                </p>
              </>
            )}
            {status === "paused" && (
              <>
                <LuPause size={26} className="text-primary-gold" />
                <p className="text-sm font-semibold text-primary-gold">
                  Pausado
                </p>
                <p className="text-xs text-primary-gold/50">
                  Espaço ou toque para continuar
                </p>
              </>
            )}
            {status === "over" && (
              <>
                <p className="text-lg font-bold text-primary-gold tracking-wide">
                  Fim de jogo
                </p>
                <p className="text-sm text-primary-gold/60">
                  Pontuação: {displayScore}
                </p>
                <p className="text-xs mt-1 text-primary-gold/50">
                  Espaço ou toque para jogar novamente
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cruzeta de toque — só em telas pequenas, teclado já cobre o desktop */}
      {!inputDisabled && (
        <div className="grid grid-cols-3 gap-3 w-60 lg:hidden">
          <div />
          <DPadButton
            icon={<LuChevronUp size={26} />}
            onPress={() => handleDirectionInput("up")}
          />
          <div />
          <DPadButton
            icon={<LuChevronLeft size={26} />}
            onPress={() => handleDirectionInput("left")}
          />
          <DPadButton
            icon={<LuChevronDown size={26} />}
            onPress={() => handleDirectionInput("down")}
          />
          <DPadButton
            icon={<LuChevronRight size={26} />}
            onPress={() => handleDirectionInput("right")}
          />
        </div>
      )}
    </div>
  );
}

function DPadButton({
  icon,
  onPress,
}: {
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPress();
      }}
      aria-label="Mover"
      className="flex items-center justify-center h-16 rounded-xl bg-secondary-black border border-primary-gold/20 text-primary-gold/70 active:bg-primary-gold/10 active:scale-95 transition-transform duration-100 touch-manipulation cursor-pointer"
    >
      {icon}
    </button>
  );
}
