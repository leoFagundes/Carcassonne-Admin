"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { LuInfo, LuMaximize, LuMinus, LuPlus, LuRotateCcw, LuRotateCw, LuX } from "react-icons/lu";
import * as THREE from "three";
import { boundsOf } from "@/floorplan/geometry";
import { STATE_META } from "@/floorplan/day";
import type { PlanElement, PlanLevel, TableState } from "@/floorplan/types";
import { shelfModel } from "@/floorplan/shelves";
import { ElementModel, type BuildCtx } from "./models3d";

export interface Scene3DProps {
  elements: PlanElement[];
  levels: PlanLevel[];
  levelHeight: number;
  /** Andar mostrado, ou "all" para todos empilhados. */
  level: string | "all";
  tableStates?: ReadonlyMap<string, TableState>;
  selected: ReadonlySet<string>;
  /** Nome exibido sobre cada mesa (ex.: grupo "2/3"). */
  tableLabels?: ReadonlyMap<string, string>;
  highWalls: boolean;
  topView: boolean;
  showLabels: boolean;
  onPickTable?: (id: string) => void;
  /** Toque num armário de jogos. */
  onPickShelf?: (id: string) => void;
  /** Armário aberto: a câmera vai até a frente dele (e volta ao fechar). */
  focusShelf?: string | null;
  /** A câmera chegou na frente do armário. */
  onFocusArrive?: () => void;
  /** Nomes dos jogos de cada espaço de cada armário (para desenhar as caixas). */
  shelfGames?: ReadonlyMap<string, Record<string, string[]>>;
  /** Armários em destaque (filtro por categoria). */
  shelfHighlight?: ReadonlySet<string>;
  /** Botões no alto à esquerda (andares, de cima, paredes, nomes). */
  toolbar?: React.ReactNode;
  /** Botões extras na coluna da direita (ex.: tela cheia). */
  extraControls?: React.ReactNode;
}


const Placed = memo(function Placed({ el, ctx }: { el: PlanElement; ctx: BuildCtx }) {
  return (
    <group
      position={[el.x, 0, el.y]}
      rotation={[0, (-el.rot * Math.PI) / 180, 0]}
      onClick={el.kind === "gameshelf" ? ctx.onPick : undefined}
    >
      <ElementModel el={el} ctx={ctx} />
    </group>
  );
});

// ───────────────────────── câmera ─────────────────────────

const { ACTION } = CameraControlsImpl;

/** Posição que enquadra a planta inteira (de lado ou de cima). */
function framing(center: THREE.Vector3, radius: number, topView: boolean, fov: number, aspect: number) {
  const vFov = (fov * Math.PI) / 180;
  const fitH = radius / Math.tan(vFov / 2);
  const fitW = radius / (Math.tan(vFov / 2) * Math.min(1, aspect));
  const dist = Math.max(8, Math.max(fitH, fitW) * 1.3);
  return topView
    ? new THREE.Vector3(center.x, center.y + dist, center.z + 0.01)
    : new THREE.Vector3(center.x - dist * 0.42, center.y + dist * 0.72, center.z + dist * 0.55);
}

/**
 * Comanda a câmera: enquadra ao trocar de andar/vista, vai até a frente do
 * armário aberto (com transição suave) e volta para onde estava ao fechar.
 */
function CameraDirector({
  ctrl,
  center,
  radius,
  topView,
  fitKey,
  focus,
  onArrive,
  refitRef,
}: {
  ctrl: React.RefObject<CameraControlsImpl | null>;
  center: THREE.Vector3;
  radius: number;
  topView: boolean;
  fitKey: string;
  focus: { key: string; pos: THREE.Vector3; look: THREE.Vector3 } | null;
  onArrive?: () => void;
  /** Recebe a função de reenquadrar (botão "enquadrar"). */
  refitRef: React.MutableRefObject<() => void>;
}) {
  const { camera, size } = useThree();
  const first = useRef(true);
  const saved = useRef<{ p: THREE.Vector3; t: THREE.Vector3 } | null>(null);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const fit = (animate: boolean) => {
    const c = ctrl.current;
    if (!c) return;
    const p = framing(center, radius, topView, (camera as THREE.PerspectiveCamera).fov, size.width / Math.max(1, size.height));
    void c.setLookAt(p.x, p.y, p.z, center.x, center.y, center.z, animate && !reduce);
  };
  refitRef.current = () => fit(true);

  useEffect(() => {
    if (focus) return;
    fit(!first.current);
    first.current = false;
  }, [fitKey, topView, ctrl.current]);

  useEffect(() => {
    const c = ctrl.current;
    if (!c) return;
    if (focus) {
      if (!saved.current) saved.current = { p: c.getPosition(new THREE.Vector3()), t: c.getTarget(new THREE.Vector3()) };
      c.enabled = false;
      c.smoothTime = 0.45;
      void c.setLookAt(focus.pos.x, focus.pos.y, focus.pos.z, focus.look.x, focus.look.y, focus.look.z, !reduce).then(() => {
        c.smoothTime = 0.2;
        arrive.current?.();
      });
    } else if (saved.current) {
      const back = saved.current;
      saved.current = null;
      c.smoothTime = 0.4;
      void c.setLookAt(back.p.x, back.p.y, back.p.z, back.t.x, back.t.y, back.t.z, !reduce).then(() => {
        c.smoothTime = 0.2;
        c.enabled = true;
      });
    }
  }, [focus?.key]);
  return null;
}

/** Ajuda dos controles do 3D (mouse e toque). */
function ControlsHelp({ onClose }: { onClose: () => void }) {
  const rows = [
    ["Girar a vista", "arrastar com o botão esquerdo", "arrastar com um dedo"],
    ["Mover para os lados", "arrastar com o botão direito", "arrastar com dois dedos"],
    ["Aproximar e afastar", "rodinha do mouse (vai na direção do ponteiro)", "pinça com dois dedos"],
    ["Ir até um ponto", "dois cliques no chão", "dois toques no chão"],
    ["Voltar ao começo", "botão enquadrar", "botão enquadrar"],
  ];
  return (
    <div className="absolute right-14 top-2 z-10 w-[min(320px,calc(100%-4.5rem))] rounded-xl border border-primary-gold/25 bg-primary-black/95 p-3 text-xs text-primary-gold/80 shadow-card" role="dialog" aria-label="Como mexer no 3D">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-primary-gold">Como mexer no 3D</span>
        <button type="button" onClick={onClose} aria-label="Fechar a ajuda" className="text-primary-gold/60 hover:text-primary-gold">
          <LuX size={14} />
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([what, mouse, touch]) => (
          <li key={what} className="flex flex-col">
            <span className="font-semibold text-primary-gold">{what}</span>
            <span className="text-[11px] text-primary-gold/60">
              Mouse: {mouse} · Toque: {touch}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── nomes sobre a cena ─────────────────────────

interface Label3D {
  key: string;
  pos: [number, number, number];
  text: string;
  tableId?: string;
  state?: TableState;
  /** Andar de baixo na vista com todos: fica mais apagado. */
  dim?: boolean;
}

/**
 * Reposiciona os nomes (DOM comum, fora do canvas) a cada quadro desenhado.
 * Sem uma raiz React por nome: troca de vista e de andar sem erro ao desmontar.
 */
function LabelProjector({ labels, nodes }: { labels: Label3D[]; nodes: React.RefObject<Map<string, HTMLElement>> }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [labels, invalidate]);
  useFrame(({ camera, size }) => {
    for (const l of labels) {
      const node = nodes.current?.get(l.key);
      if (!node) continue;
      v.set(l.pos[0], l.pos[1], l.pos[2]).project(camera);
      const onScreen = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      node.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      node.style.visibility = onScreen ? "visible" : "hidden";
      // Mais perto da câmera fica por cima
      node.style.zIndex = String(Math.round((1 - v.z) * 1000));
    }
  });
  return null;
}

// ───────────────────────── cena ─────────────────────────

export default function Scene3D({
  elements,
  levels,
  levelHeight,
  level,
  tableStates,
  selected,
  tableLabels,
  highWalls,
  topView,
  showLabels,
  onPickTable,
  onPickShelf,
  focusShelf,
  onFocusArrive,
  shelfGames,
  shelfHighlight,
  toolbar,
  extraControls,
}: Scene3DProps) {
  const ctrlRef = useRef<CameraControlsImpl | null>(null);
  const refitRef = useRef<() => void>(() => {});
  const [help, setHelp] = React.useState(false);
  // Mostra a ajuda sozinha na primeira vez
  useEffect(() => {
    try {
      if (!localStorage.getItem("fp-3d-help")) {
        setHelp(true);
        localStorage.setItem("fp-3d-help", "1");
      }
    } catch {
      /* sem armazenamento: não mostra sozinha */
    }
  }, []);
  const wallH = highWalls ? 2.8 : 1.3;
  const gap = level === "all" ? levelHeight + 3.2 : 0;
  const shown = useMemo(() => {
    const ids = level === "all" ? levels.map((l) => l.id) : [level];
    return levels.filter((l) => ids.includes(l.id));
  }, [level, levels]);
  const offsetOf = useCallback(
    (id: string) => {
      const idx = shown.findIndex((l) => l.id === id);
      return idx < 0 ? 0 : idx * gap;
    },
    [shown, gap],
  );
  const visible = useMemo(
    () => elements.filter((e) => shown.some((l) => l.id === e.level) && e.kind !== "text"),
    [elements, shown],
  );

  const { center, radius } = useMemo(() => {
    const b = boundsOf(visible);
    if (!b) return { center: new THREE.Vector3(0, 0, 0), radius: 10 };
    const midY = level === "all" ? ((shown.length - 1) * gap) / 2 : 0;
    return {
      center: new THREE.Vector3((b.minX + b.maxX) / 2, midY, (b.minY + b.maxY) / 2),
      radius: Math.max(b.maxX - b.minX, b.maxY - b.minY, level === "all" ? gap * 1.5 : 0) / 2,
    };
    // Reenquadra ao trocar de andar, não a cada mesa movida
  }, [level, shown.length, gap]);

  const pick = useRef(onPickTable);
  pick.current = onPickTable;
  const pickShelf = useRef(onPickShelf);
  pickShelf.current = onPickShelf;
  const tableIdsKey = visible
    .filter((e) => e.kind === "table" || e.kind === "gameshelf")
    .map((e) => `${e.kind === "table" ? "t" : "s"}:${e.id}`)
    .join("|");
  const pickers = useMemo(() => {
    const m = new Map<string, (e: ThreeEvent<MouseEvent>) => void>();
    for (const k of tableIdsKey.split("|")) {
      if (!k) continue;
      const id = k.slice(2);
      const isShelf = k.startsWith("s:");
      m.set(id, (e) => {
        e.stopPropagation();
        if (e.delta > 6) return; // foi um arrasto da câmera
        (isShelf ? pickShelf.current : pick.current)?.(id);
      });
    }
    return m;
  }, [tableIdsKey]);

  // Frente do armário aberto: centro na meia altura, câmera afastada o bastante para caber
  const focusTarget = useMemo(() => {
    const el = focusShelf ? visible.find((e) => e.id === focusShelf) : undefined;
    if (!el) return null;
    const H = shelfModel(el).height;
    const y0 = offsetOf(el.level);
    const a = (el.rot * Math.PI) / 180;
    const dir = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)); // frente (+y local) na cena
    const look = new THREE.Vector3(el.x, y0 + (H + 0.3) / 2, el.y);
    const dist = Math.max(1.6, ((H + 0.6) / 2 / Math.tan((22.5 * Math.PI) / 180)) * 1.08, (el.w / 2 / Math.tan((22.5 * Math.PI) / 180)) * 1.6);
    return { key: el.id, look, pos: look.clone().add(dir.multiplyScalar(dist)) };
  }, [focusShelf, visible, offsetOf]);

  const labels: Label3D[] = useMemo(() => {
    if (!showLabels || focusShelf) return [];
    const out: Label3D[] = [];
    const top = shown[shown.length - 1]?.id;
    for (const el of visible) {
      const y0 = offsetOf(el.level);
      const dim = level === "all" && el.level !== top;
      if (el.kind === "table")
        out.push({ key: `t-${el.id}`, pos: [el.x, y0 + 1.25, el.y], text: tableLabels?.get(el.id) ?? el.label ?? "", tableId: el.id, state: tableStates?.get(el.id), dim });
      else if (el.kind === "gameshelf")
        out.push({ key: `g-${el.id}`, pos: [el.x, y0 + shelfModel(el).height + 0.45, el.y], text: el.label ?? "Armário", dim });
      else if (el.kind === "room" && el.label && !el.hideLabel && level !== "all")
        out.push({ key: `r-${el.id}`, pos: [el.x + (el.lx ?? 0), y0 + 2.6, el.y + (el.ly ?? 0)], text: el.label });
    }
    return out;
  }, [visible, showLabels, tableLabels, tableStates, offsetOf, shown, level, focusShelf]);
  const nodes = useRef(new Map<string, HTMLElement>());

  const fitKey = `${level}|${visible.length > 0}`;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-primary-gold/15 bg-[#14110e]">
      <Canvas
        shadows="percentage"
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 30, 30] }}
        gl={{ antialias: true }}
        style={{ touchAction: "none" }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color(0x14110e);
          scene.fog = new THREE.Fog(0x14110e, 70, 180);
        }}
      >
        <hemisphereLight args={[0xfff1d6, 0x2a2018, 0.8]} />
        {/* De perto (armário aberto) o interior fica escuro: um pouco de luz geral ajuda */}
        <ambientLight intensity={focusShelf ? 0.55 : 0.12} />
        <directionalLight
          position={[center.x - 12, center.y + 28, center.z + 18]}
          intensity={0.85}
          color={0xffe2b0}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-radius - 6}
          shadow-camera-right={radius + 6}
          shadow-camera-top={radius + 6}
          shadow-camera-bottom={-radius - 6}
          shadow-camera-near={1}
          shadow-camera-far={120}
        >
          <object3D attach="target" position={[center.x, center.y, center.z]} />
        </directionalLight>

        {shown.map((l) => (
          <group
            key={l.id}
            position={[0, offsetOf(l.id), 0]}
            onDoubleClick={(e) => {
              const c = ctrlRef.current;
              if (!c || focusShelf) return;
              e.stopPropagation();
              void c.moveTo(e.point.x, e.point.y, e.point.z, true);
              void c.dollyTo(Math.max(4, c.distance * 0.6), true);
            }}
          >
            {visible
              .filter((e) => e.level === l.id)
              .map((el) => (
                <Placed
                  key={el.id}
                  el={el}
                  ctx={{
                    wallH,
                    levelHeight: level === "all" ? gap : levelHeight,
                    state: el.kind === "table" ? tableStates?.get(el.id) : undefined,
                    selected: (el.kind === "table" || el.kind === "gameshelf") && (selected.has(el.id) || !!shelfHighlight?.has(el.id)),
                    onPick: el.kind === "table" || el.kind === "gameshelf" ? pickers.get(el.id) : undefined,
                    shelfGames: el.kind === "gameshelf" ? shelfGames?.get(el.id) : undefined,
                  }}
                />
              ))}
          </group>
        ))}

        <CameraControls
          ref={ctrlRef}
          makeDefault
          smoothTime={0.2}
          draggingSmoothTime={0.09}
          azimuthRotateSpeed={0.85}
          polarRotateSpeed={0.75}
          dollySpeed={0.7}
          truckSpeed={1.6}
          dollyToCursor
          minDistance={1.5}
          maxDistance={140}
          minPolarAngle={0}
          maxPolarAngle={Math.PI * 0.48}
          mouseButtons={{ left: ACTION.ROTATE, middle: ACTION.DOLLY, right: ACTION.TRUCK, wheel: ACTION.DOLLY }}
          touches={{ one: ACTION.TOUCH_ROTATE, two: ACTION.TOUCH_DOLLY_TRUCK, three: ACTION.TOUCH_TRUCK }}
        />
        <CameraDirector
          ctrl={ctrlRef}
          center={center}
          radius={radius}
          topView={topView}
          fitKey={fitKey}
          focus={focusTarget}
          onArrive={onFocusArrive}
          refitRef={refitRef}
        />
        <LabelProjector labels={labels} nodes={nodes} />
      </Canvas>

      {toolbar && !focusShelf && <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5">{toolbar}</div>}
      {!focusShelf && (
        <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
          {[
            { icon: <LuPlus size={16} />, label: "Aproximar", on: () => void ctrlRef.current?.dolly(Math.max(1, (ctrlRef.current?.distance ?? 10) * 0.25), true) },
            { icon: <LuMinus size={16} />, label: "Afastar", on: () => void ctrlRef.current?.dolly(-Math.max(1, (ctrlRef.current?.distance ?? 10) * 0.3), true) },
            { icon: <LuRotateCcw size={15} />, label: "Girar para a esquerda", on: () => void ctrlRef.current?.rotate(-Math.PI / 4, 0, true) },
            { icon: <LuRotateCw size={15} />, label: "Girar para a direita", on: () => void ctrlRef.current?.rotate(Math.PI / 4, 0, true) },
            { icon: <LuMaximize size={15} />, label: "Enquadrar tudo", on: () => refitRef.current() },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              title={btn.label}
              aria-label={btn.label}
              onClick={btn.on}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary-gold/20 bg-primary-black/85 text-primary-gold/80 transition-colors hover:border-primary-gold/50 hover:text-primary-gold"
            >
              {btn.icon}
            </button>
          ))}
          <button
            type="button"
            title="Como mexer no 3D"
            aria-label="Como mexer no 3D"
            aria-pressed={help}
            onClick={() => setHelp(!help)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
              help ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/20 bg-primary-black/85 text-primary-gold/80 hover:border-primary-gold/50 hover:text-primary-gold"
            }`}
          >
            <LuInfo size={15} />
          </button>
          {extraControls}
        </div>
      )}
      {help && !focusShelf && <ControlsHelp onClose={() => setHelp(false)} />}

      {/* Nomes: DOM comum por cima do canvas */}
      <div className="pointer-events-none absolute inset-0">
        {labels.map((l) => {
          const ref = (n: HTMLElement | null) => {
            if (n) nodes.current.set(l.key, n);
            else nodes.current.delete(l.key);
          };
          const style: React.CSSProperties = { position: "absolute", left: 0, top: 0, transform: "translate(-9999px, 0)" };
          if (!l.tableId)
            return (
              <span
                key={l.key}
                ref={ref}
                style={style}
                className="whitespace-nowrap rounded-full bg-primary-black/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-gold/85"
              >
                {l.text}
              </span>
            );
          const color = l.state ? STATE_META[l.state].color : "#d6b268";
          const ink = l.state ? STATE_META[l.state].ink : "#15110d";
          const isSel = selected.has(l.tableId);
          return (
            <button
              key={l.key}
              ref={ref}
              type="button"
              onClick={() => onPickTable?.(l.tableId!)}
              style={{ ...style, background: color, color: ink, opacity: l.dim ? 0.5 : 1 }}
              className={`pointer-events-auto whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-extrabold shadow-card ${isSel ? "outline outline-2 outline-white" : ""}`}
              aria-label={`Mesa ${l.text}`}
            >
              {l.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
