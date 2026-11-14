"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LuArrowLeft,
  LuBox,
  LuCalendarDays,
  LuClipboardPaste,
  LuInfo,
  LuLibrary,
  LuMap,
  LuMaximize2,
  LuMinimize2,
  LuPencilRuler,
  LuRedo2,
  LuRuler,
  LuSave,
  LuSquare,
  LuUndo2,
  LuLayers,
} from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import { formatDateBR, RENTAL_TZ, todaySP, weekdayOf } from "@/rental/dates";
import { KINDS, tableTitle } from "@/floorplan/catalog";
import {
  applyDay,
  computeDayStatus,
  dayHasLayoutChanges,
  DEFAULT_SETTINGS,
  emptyDay,
  formatMinutes,
  STATE_META,
  newId,
  suggestTables,
  syncChangeFor,
  syncEnabledOn,
  withSyncChange,
  type SeatUnit,
} from "@/floorplan/day";
import {
  alignElements,
  attachTo,
  copyElements,
  pasteElements,
  type PlanClipboard,
  deleteElements,
  detach,
  duplicateElements,
  planProblems,
  planSummary,
  setPolygon,
  updateElement,
} from "@/floorplan/editing";
import {
  boundsOf,
  cm,
  toWorld,
  formatMeters,
  insertVertex,
  moveVertex,
  normRot,
  placeWithChildren,
  removeVertex,
  resizeTo,
  rotationToward,
  snap,
  translate,
  withDescendants,
  type Handle,
  type Pt,
} from "@/floorplan/geometry";
import { commitHistory, initHistory, previewHistory, pushHistory, redoHistory, undoHistory } from "@/floorplan/history";
import { createFromPalette, gameShelfName, type PaletteItem } from "@/floorplan/palette";
import { SEED_PLAN } from "@/floorplan/seed";
import type {
  DayPlan,
  DayTemplate,
  FloorPlan,
  LevelBackground,
  ManualState,
  MapReserve,
  MapSettings,
  PlanElement,
  Pose,
  StoredFloorPlan,
  TableState,
} from "@/floorplan/types";
import FloorPlanRepository, { PlanConflictError } from "@/services/repositories/FloorPlanRepository";
import ShelfRepository from "@/services/repositories/ShelfRepository";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import {
  addGameToSlot,
  gameShelves,
  locateGames,
  removeGameFromSlot,
  shelfColors,
  shelfCount,
  shelfHasCategory,
  unplacedGames,
  type CatalogGame,
  type ShelfCategory,
  type ShelfContent,
  type ShelfSlot,
  type SlotLabel,
} from "@/floorplan/shelves";
import ShelfFront, { type DragPayload } from "./shelfFront";
import ShelfPanel, { type ShelfActions } from "./shelfPanel";
import GamesPanel from "./gamesPanel";
import PlanCanvas, { BG_ID, type GroupOutline, type HandleId, type MeasureOverlay } from "./planCanvas";
import DayPanel, { unitTitle, type DayActions, type DayTool, type TimeScope } from "./dayPanel";
import EditPanel, { type EditActions, type EditTool } from "./editPanel";
import { printDay } from "./print";
import LayersPanel from "./layersPanel";
import QuickUnitBar from "./quickUnitBar";
import { releaseUnit, seatWalkin, setUnitState } from "./walkinActions";
import { Btn, ConfirmDialog, Seg } from "./ui";

const Scene3D = dynamic(() => import("./scene3d"), {
  ssr: false,
  loading: () => <CanvasMessage>Carregando o 3D…</CanvasMessage>,
});

function CanvasMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl border border-primary-gold/15 bg-[#14110e] p-6 text-center text-sm text-primary-gold/60">
      {children}
    </div>
  );
}

/** Andar com mais mesas (abre nele). */
function defaultLevel(plan: FloorPlan): string {
  const counts = planSummary(plan);
  return [...counts].sort((a, b) => b.tables - a.tables)[0]?.level ?? plan.levels[0].id;
}

/** Minuto atual em Brasília. */
function nowSP(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: RENTAL_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** Tamanho natural da imagem (para manter a proporção). */
function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
    img.onerror = reject;
    img.src = url;
  });
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

type Mode = "day" | "games" | "edit";
type Confirm = null | "leave" | "discard" | "conflict";

const ERR = "Não foi possível salvar. Confira a internet e tente de novo.";

export default function FloorMap() {
  const { addAlert } = useAlert();

  // ───────────── planta salva ─────────────
  const [stored, setStored] = useState<StoredFloorPlan | null | undefined>(undefined);
  const [planError, setPlanError] = useState(false);
  useEffect(
    () =>
      FloorPlanRepository.subscribePlan(
        (p) => {
          setStored(p);
          setPlanError(false);
        },
        () => {
          // Sem acesso à planta salva: segue com a inicial em vez de ficar carregando
          setStored((s) => (s === undefined ? null : s));
          setPlanError(true);
        },
      ),
    [],
  );
  const savedPlan: FloorPlan = useMemo(() => stored ?? SEED_PLAN, [stored]);
  const savedVersion = stored?.version ?? 0;
  const loaded = stored !== undefined;

  // ───────────── configurações e modelos ─────────────
  const [settings, setSettingsState] = useState<MapSettings>(DEFAULT_SETTINGS);
  useEffect(() => FloorPlanRepository.subscribeSettings(setSettingsState), []);
  const [templates, setTemplates] = useState<DayTemplate[]>([]);
  useEffect(() => FloorPlanRepository.subscribeTemplates(setTemplates), []);

  // ───────────── modo e vista ─────────────
  const [mode, setMode] = useState<Mode>("day");
  const [dim, setDim] = useState<"2d" | "3d">("2d");
  const [level, setLevel] = useState(() => defaultLevel(SEED_PLAN));
  const [allLevels, setAllLevels] = useState(false);
  const [highWalls, setHighWalls] = useState(false);
  const [topView, setTopView] = useState(false);
  const [labels3d, setLabels3d] = useState(true);
  const centerRef = useRef<Pt>({ x: 0, y: 0 });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [ruler, setRuler] = useState<{ on: boolean; a?: Pt; b?: Pt }>({ on: false });
  const [full, setFull] = useState(false);
  /** Lista de camadas (modo planta): fechada até a pessoa abrir. */
  const [layersOpen, setLayersOpen] = useState(false);
  useEffect(() => {
    if (!full) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [full]);

  useEffect(() => {
    if (!savedPlan.levels.some((l) => l.id === level)) setLevel(defaultLevel(savedPlan));
  }, [savedPlan, level]);

  // ───────────── edição da planta ─────────────
  const [hist, setHist] = useState(() => initHistory<FloorPlan>(SEED_PLAN));
  const [editBase, setEditBase] = useState<{ plan: FloorPlan; version: number }>({ plan: SEED_PLAN, version: 0 });
  const [sel, setSel] = useState<string[]>([]);
  const [snapOn, setSnapOn] = useState(true);
  const [lockStructure, setLockStructure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [remoteNewer, setRemoteNewer] = useState(false);
  const [editTool, setEditTool] = useState<EditTool>({ kind: "none" });
  const draft = hist.present;
  const dirty = mode === "edit" && draft !== editBase.plan;
  const step = snapOn ? 0.05 : 0.01;
  const drag = useRef<{ base: FloorPlan; ids: string[] } | { base: FloorPlan; bg: LevelBackground } | null>(null);
  const handleDrag = useRef<{ base: FloorPlan; el: PlanElement; vertex?: number; moved: boolean; h: HandleId } | null>(null);
  const lastVertexTap = useRef<{ id: string; i: number; t: number } | null>(null);

  // Outra pessoa salvou enquanto a planta está aberta para edição
  useEffect(() => {
    if (mode !== "edit" || savedVersion === editBase.version) return;
    if (hist.present === editBase.plan) {
      setHist(initHistory(savedPlan));
      setEditBase({ plan: savedPlan, version: savedVersion });
    } else setRemoteNewer(true);
  }, [savedPlan, savedVersion]);

  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  const resetEdit = () => {
    setHist(initHistory(savedPlan));
    setEditBase({ plan: savedPlan, version: savedVersion });
    setSel([]);
    setRemoteNewer(false);
    setEditTool({ kind: "none" });
  };
  const leaveTo = useRef<Mode>("day");
  const changeMode = (m: Mode) => {
    if (m === mode) return;
    setRuler({ on: false });
    if (m === "edit") {
      resetEdit();
      setMode("edit");
    } else if (dirty) {
      leaveTo.current = m;
      setConfirm("leave");
    } else setMode(m);
  };

  const elById = useMemo(() => new Map(draft.elements.map((e) => [e.id, e])), [draft]);
  const selection = useMemo(() => sel.map((id) => elById.get(id)).filter((e): e is PlanElement => !!e), [sel, elById]);
  const problems = useMemo(() => (mode === "edit" ? planProblems(draft) : []), [draft, mode]);
  const apply = useCallback((fn: (p: FloorPlan) => FloorPlan) => setHist((h) => pushHistory(h, fn(h.present))), []);
  const currentBg = draft.levels.find((l) => l.id === level)?.bg;

  const setLevelBg = (p: FloorPlan, bg: LevelBackground | undefined): FloorPlan => ({
    ...p,
    levels: p.levels.map((l) => {
      if (l.id !== level) return l;
      const next = { ...l };
      if (bg) next.bg = bg;
      else delete next.bg;
      return next;
    }),
  });

  // Mostra o andar do que foi escolhido
  const selectIds = useCallback(
    (ids: string[]) => {
      setSel(ids);
      const first = ids.map((id) => elById.get(id)).find(Boolean);
      if (first && first.level !== level) setLevel(first.level);
    },
    [elById, level],
  );

  /** Só os escolhidos que não estão presos a outro escolhido (estes vão junto). */
  const selectedRoots = useCallback(
    (plan: FloorPlan, ids: string[]) => ids.filter((id) => !ids.some((o) => o !== id && withDescendants(plan.elements, [o]).has(id))),
    [],
  );

  const editActions: EditActions = {
    add: (item: PaletteItem) => {
      const el = createFromPalette(item, level, centerRef.current, draft.elements);
      apply((p) => ({ ...p, elements: [...p.elements, el] }));
      setSel([el.id]);
    },
    update: (id, patch) => apply((p) => updateElement(p, id, patch)),
    remove: () => {
      if (!sel.length) return;
      apply((p) => deleteElements(p, sel));
      setSel([]);
    },
    duplicate: () => {
      if (!sel.length) return;
      const r = duplicateElements(draft, sel);
      setHist((h) => pushHistory(h, r.plan));
      setSel(r.ids);
    },
    align: (m) => apply((p) => alignElements(p, sel, m)),
    attach: () => {
      const table = selection.find((e) => e.kind === "table");
      if (!table) return;
      apply((p) => attachTo(p, sel.filter((id) => id !== table.id), table.id));
    },
    detach: () => apply((p) => detach(p, sel)),
    rotate: (delta) =>
      apply((p) => {
        let els = p.elements;
        for (const id of selectedRoots(p, sel)) {
          const e = els.find((x) => x.id === id);
          if (e) els = placeWithChildren(els, id, { x: e.x, y: e.y, rot: normRot(e.rot + delta) });
        }
        return { ...p, elements: els };
      }),
    select: selectIds,
    organizeShelf: (id) => {
      if (dirty) {
        addAlert("Salve a planta antes de organizar os jogos do armário.");
        return;
      }
      openShelfAt(id);
    },
    toGameShelf: (id, as) => {
      const el = elById.get(id);
      if (!el) return;
      if (as === "pouf1" && el.kind === "pouf") {
        // Cada pufe vira um pufe-baú de 1 lugar, no mesmo lugar
        const n = Math.max(1, el.count ?? 3);
        const pw = el.w / n;
        apply((p) => {
          const rest = p.elements.filter((e) => e.id !== id);
          const made: PlanElement[] = [];
          for (let i = 0; i < n; i++) {
            const c = toWorld(el, -el.w / 2 + pw * (i + 0.5), 0);
            made.push({
              id: newId("gameshelf"),
              level: el.level,
              kind: "gameshelf",
              variant: "pouf1",
              x: cm(c.x),
              y: cm(c.y),
              w: cm(Math.max(0.3, pw - 0.04)),
              d: el.d,
              rot: el.rot,
              label: gameShelfName([...rest, ...made], "pouf1"),
            });
          }
          return { ...p, elements: [...rest, ...made] };
        });
        return;
      }
      const variant = as ?? "hutch-open";
      const keep = el.label && !["Armário", "Pufes", "Pufe"].includes(el.label) ? el.label : undefined;
      apply((p) => updateElement(p, id, { kind: "gameshelf", variant, label: keep ?? gameShelfName(p.elements, variant), count: undefined }));
    },
    setPolygon: (id, on) => apply((p) => setPolygon(p, id, on)),
    uploadBackground: async (file) => {
      setUploading(true);
      try {
        const { url, path } = await FloorPlanRepository.uploadBackground(file);
        const { w: nw, h: nh } = await imageSize(url);
        const b = boundsOf(draft.elements.filter((e) => e.level === level));
        const w = b ? Math.max(4, b.maxX - b.minX) : 15;
        const old = currentBg;
        const bg: LevelBackground = {
          url,
          path,
          x: old ? old.x : cm(b?.minX ?? 0),
          y: old ? old.y : cm(b?.minY ?? 0),
          w: old ? old.w : w,
          h: (old ? old.w : w) * (nh / nw),
          opacity: old?.opacity ?? 0.5,
        };
        apply((p) => setLevelBg(p, bg));
        addAlert(old ? "Imagem trocada. Salve a planta para manter." : "Imagem adicionada. Agora acerte a escala com uma medida conhecida.");
        if (!old) setEditTool({ kind: "calibrate" });
      } catch (error) {
        console.error("Erro ao enviar a imagem de fundo:", error);
        addAlert(error instanceof Error && error.message.includes("HEIC") ? error.message : "Não foi possível enviar a imagem. Tente outra.");
      } finally {
        setUploading(false);
      }
    },
    updateBackground: (patch) => {
      if (!currentBg) return;
      // A transparência muda direto (sem um passo de desfazer a cada movimento)
      if (Object.keys(patch).length === 1 && "opacity" in patch) setHist((h) => previewHistory(h, setLevelBg(h.present, { ...currentBg, ...patch })));
      else apply((p) => setLevelBg(p, { ...currentBg, ...patch }));
    },
    removeBackground: () => {
      apply((p) => setLevelBg(p, undefined));
      setEditTool({ kind: "none" });
    },
    calibrate: (meters) => {
      if (editTool.kind !== "calibrate" || !editTool.a || !editTool.b || !currentBg) return;
      const { a, b } = editTool;
      const measured = Math.hypot(b.x - a.x, b.y - a.y);
      if (measured < 0.01) return;
      const f = meters / measured;
      // A ponta "a" fica parada; a imagem estica em volta dela
      const bg: LevelBackground = {
        ...currentBg,
        x: cm(a.x - (a.x - currentBg.x) * f),
        y: cm(a.y - (a.y - currentBg.y) * f),
        w: currentBg.w * f,
        h: currentBg.h * f,
      };
      apply((p) => setLevelBg(p, bg));
      setEditTool({ kind: "none" });
      addAlert(`Escala acertada: a imagem agora tem ${formatMeters(bg.w)} de largura.`);
    },
  };

  // Gestos no 2D (modo planta)
  const onTapEdit = (id: string | null, { additive }: { additive: boolean }) => {
    if (!id) {
      if (!additive) setSel([]);
      return;
    }
    if (additive) {
      setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
      return;
    }
    // Tocar no piso com algo escolhido só limpa a escolha
    if (elById.get(id)?.kind === "room" && sel.length && !sel.includes(id)) {
      setSel([]);
      return;
    }
    setSel([id]);
  };
  const onMoveStartEdit = (id: string, { additive }: { additive: boolean }) => {
    if (id === BG_ID) {
      if (!currentBg) return false;
      drag.current = { base: hist.present, bg: currentBg };
      return true;
    }
    const el = elById.get(id);
    if (!el) return false;
    let ids: string[];
    // Travados (cadeado) não se movem junto
    if (sel.includes(id)) ids = sel.filter((x) => !elById.get(x)?.locked);
    else {
      if (el.kind === "room") return false; // arrastar o piso = mover a planta
      ids = additive ? [...sel, id] : [id];
      setSel(ids);
    }
    drag.current = { base: hist.present, ids };
    return true;
  };
  const onMoveEdit = (dx: number, dy: number, { free }: { free: boolean }) => {
    const d = drag.current;
    if (!d) return;
    const st = free ? 0.01 : step;
    const sx = snap(dx, st);
    const sy = snap(dy, st);
    if ("bg" in d) {
      setHist((h) => previewHistory(h, setLevelBg(d.base, { ...d.bg, x: cm(d.bg.x + sx), y: cm(d.bg.y + sy) })));
      return;
    }
    const next = sx || sy ? { ...d.base, elements: translate(d.base.elements, d.ids, sx, sy) } : d.base;
    setHist((h) => previewHistory(h, next));
  };
  const onMoveEndEdit = (cancel: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    setHist((h) => (cancel ? { ...h, present: d.base } : commitHistory(h, d.base)));
  };
  const onHandleStart = (h: HandleId) => {
    const el = selection.length === 1 ? selection[0] : null;
    if (!el) {
      handleDrag.current = null;
      return;
    }
    const base = hist.present;
    if (h.startsWith("m")) {
      // "+" no meio do lado: cria o ponto e já arrasta ele
      const i = Number(h.slice(1));
      const withPt = insertVertex(el, i);
      setHist((hs) => previewHistory(hs, { ...base, elements: base.elements.map((e) => (e.id === el.id ? withPt : e)) }));
      handleDrag.current = { base, el: withPt, vertex: i + 1, moved: true, h };
      return;
    }
    handleDrag.current = { base, el, vertex: h.startsWith("v") ? Number(h.slice(1)) : undefined, moved: false, h };
  };
  const onHandle = (h: HandleId, p: Pt, { free }: { free: boolean }) => {
    const d = handleDrag.current;
    if (!d) return;
    d.moved = true;
    const { el, base } = d;
    let next: PlanElement[];
    if (d.vertex !== undefined) {
      const moved = moveVertex(el, d.vertex, p, free ? 0.01 : step);
      next = base.elements.map((e) => (e.id === el.id ? moved : e));
    } else if (h === "rot") next = placeWithChildren(base.elements, el.id, { x: el.x, y: el.y, rot: rotationToward(el, p, free ? 0 : 15) });
    else next = base.elements.map((e) => (e.id === el.id ? resizeTo(el, h as Handle, p, free ? 0.01 : step) : e));
    setHist((hs) => previewHistory(hs, { ...base, elements: next }));
  };
  const onHandleEnd = (cancel: boolean) => {
    const d = handleDrag.current;
    handleDrag.current = null;
    if (!d) return;
    // Dois toques num ponto (sem arrastar) apagam o ponto
    if (!cancel && !d.moved && d.vertex !== undefined) {
      const now = Date.now();
      const last = lastVertexTap.current;
      if (last && last.id === d.el.id && last.i === d.vertex && now - last.t < 450) {
        lastVertexTap.current = null;
        if ((d.el.points?.length ?? 0) <= 3) {
          addAlert("O formato precisa de pelo menos 3 pontos.");
          return;
        }
        const less = removeVertex(d.el, d.vertex);
        setHist((h) => pushHistory(h, { ...d.base, elements: d.base.elements.map((e) => (e.id === d.el.id ? less : e)) }));
        return;
      }
      lastVertexTap.current = { id: d.el.id, i: d.vertex, t: now };
      return;
    }
    setHist((h) => (cancel ? { ...h, present: d.base } : commitHistory(h, d.base)));
  };

  // Atalhos do teclado (modo planta)
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if (mode !== "edit" || confirm) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === "z") {
      e.preventDefault();
      setHist((h) => (e.shiftKey ? redoHistory(h) : undoHistory(h)));
    } else if (mod && key === "y") {
      e.preventDefault();
      setHist(redoHistory);
    } else if (mod && (key === "c" || key === "x") && sel.length) {
      e.preventDefault();
      const c = copyElements(draft, selectedRoots(draft, sel));
      if (c) {
        setClip(c);
        pasteCount.current = 0;
        if (key === "x") editActions.remove();
        addAlert(`${key === "x" ? "Recortado" : "Copiado"}: ${c.roots.length} ${c.roots.length === 1 ? "item" : "itens"}. Ctrl+V cola.`);
      }
    } else if (mod && key === "v" && clip) {
      e.preventDefault();
      pasteClip();
    } else if (mod && key === "d") {
      e.preventDefault();
      editActions.duplicate();
    } else if (mod && key === "s") {
      e.preventDefault();
      void save();
    } else if ((key === "delete" || key === "backspace") && sel.length) {
      e.preventDefault();
      editActions.remove();
    } else if (key === "escape") {
      setSel([]);
      setEditTool({ kind: "none" });
      setRuler({ on: false });
    } else if (key === "r" && !mod && sel.length) editActions.rotate(e.shiftKey ? -90 : 90);
    // No 3D as setas andam pela cena (não movem o objeto)
    else if (key.startsWith("arrow") && sel.length && dim === "2d") {
      e.preventDefault();
      const n = (e.altKey ? 0.01 : 0.05) * (e.shiftKey ? 10 : 1);
      const dx = key === "arrowleft" ? -n : key === "arrowright" ? n : 0;
      const dy = key === "arrowup" ? -n : key === "arrowdown" ? n : 0;
      apply((p) => ({ ...p, elements: translate(p.elements, selectedRoots(p, sel).filter((id) => !elById.get(id)?.locked), dx, dy) }));
    }
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  // Área de transferência da planta (Ctrl+C / Ctrl+X / Ctrl+V)
  const [clip, setClip] = useState<PlanClipboard | null>(null);
  const pasteCount = useRef(0);
  const pasteClip = () => {
    if (!clip) return;
    pasteCount.current += 1;
    const r = pasteElements(draft, clip, level, { offset: cm(0.3 * pasteCount.current), at: centerRef.current });
    setHist((h) => pushHistory(h, r.plan));
    setSel(r.ids);
  };

  /** true = salvou. */
  async function save(force = false): Promise<boolean> {
    if (!dirty || saving) return !dirty;
    const probs = planProblems(draft);
    if (probs.length) {
      setConfirm(null);
      addAlert(probs[0].message);
      selectIds(probs[0].ids);
      return false;
    }
    setSaving(true);
    try {
      const before = editBase.plan;
      const version = await FloorPlanRepository.savePlan(draft, force ? savedVersion : editBase.version);
      // Imagens de fundo trocadas ou removidas: apaga as antigas do Storage
      const kept = new Set(draft.levels.map((l) => l.bg?.path).filter(Boolean));
      for (const l of before.levels) if (l.bg?.path && !kept.has(l.bg.path)) void FloorPlanRepository.deleteStorageFile(l.bg.path);
      setEditBase({ plan: draft, version });
      setRemoteNewer(false);
      setConfirm(null);
      addAlert("Planta salva.");
      return true;
    } catch (error) {
      if (error instanceof PlanConflictError) setConfirm("conflict");
      else {
        console.error("Erro ao salvar a planta:", error);
        addAlert("Não foi possível salvar a planta. Confira a internet e tente de novo.");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ───────────── dia a dia ─────────────
  const [date, setDateRaw] = useState(todaySP);
  const [day, setDay] = useState<DayPlan>(() => emptyDay(todaySP()));
  const [reserves, setReserves] = useState<MapReserve[]>([]);
  const [loadingReserves, setLoadingReserves] = useState(true);
  const [selUnit, setSelUnit] = useState<string | null>(null);
  const [tool, setTool] = useState<DayTool>({ kind: "select" });
  const [moveTables, setMoveTables] = useState(false);
  const [scope, setScope] = useState<TimeScope>("day");
  const [nowMinutes, setNowMinutes] = useState(nowSP);
  const [dragPose, setDragPose] = useState<{ id: string; pose: Pose } | null>(null);
  const dragPoseRef = useRef(dragPose);
  dragPoseRef.current = dragPose;
  const dayDrag = useRef<{ id: string; base: Pose } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNowMinutes(nowSP()), 30_000);
    return () => clearInterval(t);
  }, []);

  const setDate = (d: string) => {
    setDateRaw(d);
    setSelUnit(null);
    setTool({ kind: "select" });
    if (scope === "now" && d !== todaySP()) setScope("day");
  };

  // Aberto pelo cabeçalho de Reservas: /mapa?data=AAAA-MM-DD
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("data");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))) setDateRaw(d);
  }, []);

  useEffect(() => {
    setDay(emptyDay(date));
    return FloorPlanRepository.subscribeDay(date, setDay);
  }, [date]);
  useEffect(() => {
    setLoadingReserves(true);
    setReserves([]);
    return FloorPlanRepository.subscribeReservesOfDay(
      date,
      (r) => {
        setReserves(r);
        setLoadingReserves(false);
      },
      () => {
        setLoadingReserves(false);
        addAlert("Não foi possível carregar as reservas do dia.");
      },
    );
  }, [date]);

  const at = scope === "day" ? null : scope === "now" ? nowMinutes : scope;
  // A sincronização que valia neste dia (mudanças só valem do dia delas em diante)
  const syncOn = syncEnabledOn(settings.syncHistory, date);
  const dayEff = useMemo(
    () => (dragPose ? { ...day, moves: { ...day.moves, [dragPose.id]: dragPose.pose } } : day),
    [day, dragPose],
  );
  const layout = useMemo(() => applyDay(savedPlan, dayEff), [savedPlan, dayEff]);
  const status = useMemo(
    () => computeDayStatus(savedPlan, dayEff, layout, reserves, { autoSync: syncOn, at, stayMinutes: settings.stayMinutes }),
    [savedPlan, dayEff, layout, reserves, syncOn, settings.stayMinutes, at],
  );
  const selectedUnit: SeatUnit | null = selUnit ? status.unitByKey.get(selUnit) ?? null : null;
  const reservationTimes = useMemo(
    () => [...new Set(reserves.filter((r) => r.status === "confirmed" && /^\d{1,2}:\d{2}$/.test(r.time)).map((r) => r.time.padStart(5, "0")))].sort(),
    [reserves],
  );
  const suggestionsFor = useCallback(
    (r: MapReserve) => suggestTables(status, layout, r, settings.stayMinutes),
    [status, layout, settings.stayMinutes],
  );

  const tableStates = useMemo(() => {
    const m = new Map<string, TableState>();
    for (const u of status.units) for (const id of u.tableIds) m.set(id, u.state);
    return m;
  }, [status]);
  const tableBadges = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of status.units) if (!u.isGroup) m.set(u.tableIds[0], u.reservations.length);
    return m;
  }, [status]);
  const tableNotes = useMemo(() => {
    const m = new Map<string, string>();
    if (at === null) return m;
    for (const u of status.units) if (u.upcoming[0]) m.set(u.tableIds[0], u.upcoming[0].time);
    return m;
  }, [status, at]);
  const groupOutlines: GroupOutline[] = useMemo(
    () =>
      status.units
        .filter((u) => u.isGroup)
        .map((u) => ({
          key: u.key,
          tableIds: u.tableIds,
          state: u.state,
          label: `${u.isAuto ? "↻ " : ""}${u.name} · ${u.seats} lug.${u.reservations.length ? ` · ${u.reservations.length} res.` : ""}`,
        })),
    [status],
  );
  const baseById = useMemo(() => new Map(savedPlan.elements.map((e) => [e.id, e])), [savedPlan]);
  const hiddenTables = useMemo(
    () => Object.keys(day.hidden).map((id) => baseById.get(id)).filter((e): e is PlanElement => e?.kind === "table"),
    [day.hidden, baseById],
  );
  const movedTables = useMemo(() => new Set(Object.keys(day.moves)), [day.moves]);
  const baseNameOf = useCallback((id: string) => baseById.get(id)?.label ?? "", [baseById]);
  const levelName = useCallback((id: string) => savedPlan.levels.find((l) => l.id === id)?.name ?? "", [savedPlan]);

  const run = useCallback(
    (p: Promise<unknown>, ok?: string) =>
      p.then(
        () => ok && addAlert(ok),
        (error) => {
          console.error("Erro no mapa do dia:", error);
          addAlert(ERR);
        },
      ),
    [addAlert],
  );

  const setSettings = (patch: Partial<MapSettings>) => {
    setSettingsState((s) => ({ ...s, ...patch }));
    run(FloorPlanRepository.saveSettings(patch));
  };

  /** Liga/desliga a partir de hoje (os dias anteriores ficam como estavam). */
  const setSync = (on: boolean) => {
    const history = withSyncChange(settings.syncHistory, todaySP(), on);
    setSettings({ syncHistory: history });
    addAlert(on ? "Sincronização ligada a partir de hoje." : "Sincronização desligada a partir de hoje. Os dias anteriores continuam como estavam.");
  };

  const writeMove = (id: string, pose: Pose) => {
    const base = baseById.get(id);
    const same = base && Math.abs(base.x - pose.x) < 0.005 && Math.abs(base.y - pose.y) < 0.005 && normRot(base.rot) === normRot(pose.rot);
    return FloorPlanRepository.setMove(date, id, same ? null : pose);
  };
  const layoutParts = () => ({ moves: day.moves, names: day.names, hidden: day.hidden, groups: day.groups });

  const dayActions: DayActions = {
    setManual: (unit, state: ManualState | null) => run(setUnitState(date, unit, state)),
    seatWalkin: (unit, name, n) => run(seatWalkin(date, unit, name, n)),
    release: (unit) => run(releaseUnit(date, unit)),
    renameTable: (id, name) => {
      const base = baseNameOf(id);
      run(FloorPlanRepository.setName(date, id, name && name !== base ? name : null));
    },
    renameGroup: (unit, name) => run(FloorPlanRepository.setGroup(date, unit.key, { tables: unit.tableIds, ...(name ? { name } : {}) })),
    hideTable: (id) => {
      setSelUnit(null);
      run(FloorPlanRepository.patchDay(date, { hidden: { [id]: true }, manual: { [id]: null }, moves: { [id]: null } }));
    },
    unhideTable: (id) => run(FloorPlanRepository.setHidden(date, id, false)),
    resetPose: (id) => run(FloorPlanRepository.setMove(date, id, null)),
    rotateTable: (id, delta) => {
      const el = layout.elements.find((e) => e.id === id);
      if (el) run(writeMove(id, { x: el.x, y: el.y, rot: normRot(el.rot + delta) }));
    },
    split: (unit) => {
      setSelUnit(unit.tableIds[0]);
      run(FloorPlanRepository.patchDay(date, { groups: { [unit.key]: null }, manual: { [unit.key]: null } }));
    },
    assign: (r, unit) =>
      run(FloorPlanRepository.setReserveTable(r.id, unit.reserveName), `Reserva de ${r.name || "cliente"} na ${unitTitle(unit).replace(/^Mesas?/, (m) => m.toLowerCase())}.`),
    assignName: (r, name) =>
      run(FloorPlanRepository.setReserveTable(r.id, name), `Reserva de ${r.name || "cliente"} na ${name.includes(",") ? `mesas ${name}` : `mesa ${name}`}.`),
    unassign: (r) => run(FloorPlanRepository.setReserveTable(r.id, "")),
    setArrived: (r, v) => run(FloorPlanRepository.setReserveArrived(r.id, v)),
    resetDay: () => {
      setSelUnit(null);
      run(FloorPlanRepository.resetDayLayout(date), "As mesas do dia voltaram para a planta.");
    },
    copyFrom: async (from) => {
      try {
        const parts = await FloorPlanRepository.getDayLayout(from);
        if (!dayHasLayoutChanges(parts)) {
          addAlert(`${formatDateBR(from, true)} não tem mudança de arrumação para copiar.`);
          return;
        }
        await FloorPlanRepository.replaceDayLayout(date, parts);
        setSelUnit(null);
        addAlert(`Arrumação de ${formatDateBR(from, true)} copiada.`);
      } catch (error) {
        console.error("Erro ao copiar a arrumação:", error);
        addAlert(ERR);
      }
    },
    applyTemplate: (t) => {
      setSelUnit(null);
      run(FloorPlanRepository.replaceDayLayout(date, t), `Modelo "${t.name}" aplicado.`);
    },
    saveTemplate: (name) => run(FloorPlanRepository.saveTemplate(name, layoutParts()), `Modelo "${name}" salvo.`),
    deleteTemplate: (t) => run(FloorPlanRepository.deleteTemplate(t.id)),
  };

  const confirmJoin = () => {
    if (tool.kind !== "join" || tool.tables.length < 2) return;
    const tables = tool.tables;
    const gid = newId("g");
    const groups: Record<string, unknown> = { [gid]: { tables } };
    const manual: Record<string, unknown> = {};
    for (const u of status.units) {
      if (!u.tableIds.some((t) => tables.includes(t))) continue;
      manual[u.key] = null;
      if (u.isGroup && !u.isAuto) groups[u.key] = null;
    }
    setTool({ kind: "select" });
    setSelUnit(gid);
    run(FloorPlanRepository.patchDay(date, { groups, manual }));
  };

  const onTapDay = (id: string | null) => {
    if (!id) {
      if (tool.kind === "select") setSelUnit(null);
      return;
    }
    // Armário de jogos: vai direto para ele (modo Jogos, armário aberto)
    if (shelvesList.some((sh) => sh.el.id === id)) {
      if (tool.kind === "select") openShelfAt(id);
      return;
    }
    const unit = status.unitOfTable.get(id);
    if (!unit) return;
    if (tool.kind === "join") {
      const all = unit.tableIds.every((t) => tool.tables.includes(t));
      setTool({
        kind: "join",
        tables: all ? tool.tables.filter((t) => !unit.tableIds.includes(t)) : [...new Set([...tool.tables, ...unit.tableIds])],
      });
      return;
    }
    if (tool.kind === "assign") {
      dayActions.assign(tool.reserve, unit);
      setTool({ kind: "select" });
      setSelUnit(unit.key);
      return;
    }
    setSelUnit(unit.key);
  };
  const onMoveStartDay = (id: string) => {
    if (!moveTables || tool.kind !== "select") return false;
    const el = layout.elements.find((e) => e.id === id);
    if (!el || el.kind !== "table") return false;
    dayDrag.current = { id, base: { x: el.x, y: el.y, rot: el.rot } };
    setSelUnit(status.unitOfTable.get(id)?.key ?? null);
    return true;
  };
  const onMoveDay = (dx: number, dy: number, { free }: { free: boolean }) => {
    const d = dayDrag.current;
    if (!d) return;
    const st = free ? 0.01 : 0.05;
    setDragPose({ id: d.id, pose: { x: cm(d.base.x + snap(dx, st)), y: cm(d.base.y + snap(dy, st)), rot: d.base.rot } });
  };
  const onMoveEndDay = (cancel: boolean) => {
    const d = dayDrag.current;
    dayDrag.current = null;
    const pose = dragPoseRef.current;
    if (!d || cancel || !pose) {
      setDragPose(null);
      return;
    }
    writeMove(d.id, pose.pose)
      .catch((error) => {
        console.error("Erro ao mover a mesa:", error);
        addAlert(ERR);
      })
      .finally(() => setDragPose(null));
  };

  // Esc no modo dia cancela a ferramenta
  useEffect(() => {
    if (mode !== "day") return;
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ruler.on) setRuler({ on: false });
      else if (tool.kind !== "select") setTool({ kind: "select" });
      else setSelUnit(null);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [mode, tool.kind, ruler.on]);

  const scopeLabel = at === null ? "Dia todo" : scope === "now" ? `Agora (${formatMinutes(at)})` : `Às ${formatMinutes(at)}`;
  const onPrint = async () => {
    const ok = await printDay({
      levels: savedPlan.levels,
      elements: layout.elements,
      status,
      dateLabel: `${WEEKDAYS[weekdayOf(date)]}, ${formatDateBR(date, true)}`,
      scopeLabel,
    });
    if (!ok) addAlert("O navegador bloqueou a janela de impressão. Permita janelas para este site e tente de novo.");
  };

  // ───────────── armários de jogos ─────────────
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const catalogLoaded = useRef(false);
  useEffect(() => {
    if (mode !== "games" || catalogLoaded.current) return;
    catalogLoaded.current = true;
    setLoadingCatalog(true);
    BoardgameRepository.getAll()
      .then((list) =>
        setCatalog(
          list.map((g) => ({
            id: g.id,
            name: g.name,
            image: g.image || undefined,
            types: Array.isArray(g.types) ? g.types : [],
            minPlayers: Number(g.minPlayers) || undefined,
            maxPlayers: Number(g.maxPlayers) || undefined,
            playTime: Number(g.playTime) || undefined,
            difficulty: typeof g.difficulty === "string" && g.difficulty ? g.difficulty : undefined,
          })),
        ),
      )
      .finally(() => setLoadingCatalog(false));
  }, [mode]);
  const [contents, setContents] = useState<Map<string, ShelfContent>>(new Map());
  useEffect(() => ShelfRepository.subscribeAll(setContents), []);
  const [customs, setCustoms] = useState<ShelfCategory[]>([]);
  useEffect(() => ShelfRepository.subscribeCategories(setCustoms), []);
  const [openShelf, setOpenShelf] = useState<string | null>(null);
  const [shelfReady, setShelfReady] = useState(false);
  const [selSlot, setSelSlot] = useState<string | null>(null);
  const [selGame, setSelGame] = useState<string | null>(null);
  const [highlightGame, setHighlightGame] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<SlotLabel | null>(null);

  const catalogById = useMemo(() => new Map(catalog.map((g) => [g.id, g])), [catalog]);
  const shelvesList = useMemo(() => gameShelves(savedPlan), [savedPlan]);
  const located = useMemo(() => locateGames(savedPlan, contents), [savedPlan, contents]);
  const unplaced = useMemo(() => unplacedGames(catalog, located), [catalog, located]);
  const typesList = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of catalog) for (const t of g.types) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  }, [catalog]);
  const shelfColorsMap = useMemo(() => new Map(shelvesList.map((sh) => [sh.el.id, shelfColors(contents.get(sh.el.id), customs)])), [shelvesList, contents, customs]);
  const shelfBadgesMap = useMemo(
    () => new Map(shelvesList.map((sh) => { const n = shelfCount(contents.get(sh.el.id)); return [sh.el.id, `${n} ${n === 1 ? "jogo" : "jogos"}`]; })),
    [shelvesList, contents],
  );
  const shelfGamesMap = useMemo(
    () =>
      new Map(
        shelvesList.map((sh) => [
          sh.el.id,
          Object.fromEntries(Object.entries(contents.get(sh.el.id)?.slots ?? {}).map(([k, v]) => [k, v.games.map((g) => g.name)])),
        ]),
      ),
    [shelvesList, contents],
  );
  const shelfHighlight = useMemo(
    () => new Set(catFilter ? shelvesList.filter((sh) => shelfHasCategory(contents.get(sh.el.id), catFilter, catalogById)).map((sh) => sh.el.id) : []),
    [catFilter, shelvesList, contents, catalogById],
  );
  const openShelfRef = openShelf ? shelvesList.find((sh) => sh.el.id === openShelf) ?? null : null;

  // Aberto pela Coleção: /mapa?jogo=ID abre o armário onde o jogo está
  const wantedGame = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (wantedGame.current === undefined) {
      wantedGame.current = new URLSearchParams(window.location.search).get("jogo");
      if (wantedGame.current) setMode("games");
    }
    const id = wantedGame.current;
    if (!id || !loaded) return;
    const where = located.get(id);
    if (!where?.length) return;
    wantedGame.current = null;
    openShelfAt(where[0].shelfId, where[0].slotId, id);
  }, [located, loaded]);

  const openShelfAt = (id: string, slotId?: string, gameId?: string) => {
    const sh = shelvesList.find((x) => x.el.id === id);
    if (!sh) return;
    if (mode !== "games") setMode("games");
    if (sh.el.level !== level && !allLevels) setLevel(sh.el.level);
    setSelSlot(slotId ?? null);
    setSelGame(null);
    setHighlightGame(gameId ?? null);
    setRuler({ on: false });
    // No 3D a vista de frente aparece quando a câmera chega; no 2D, na hora
    setShelfReady(dim === "2d");
    setOpenShelf(id);
  };
  const closeShelf = () => {
    setOpenShelf(null);
    setShelfReady(false);
    setSelSlot(null);
    setSelGame(null);
    setHighlightGame(null);
  };
  useEffect(() => {
    if (mode !== "games" && openShelf) closeShelf();
  }, [mode]);

  // Sempre o conteúdo mais novo (o "desfazer" roda segundos depois)
  const contentsRef = useRef(contents);
  contentsRef.current = contents;
  const slotOf = (shelfId: string, slotId: string): ShelfSlot | undefined => contentsRef.current.get(shelfId)?.slots[slotId];
  const [undoInfo, setUndoInfo] = useState<{ text: string; run: () => void } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerUndo = (info: { text: string; run: () => void }) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoInfo(info);
    undoTimer.current = setTimeout(() => setUndoInfo(null), 7000);
  };
  const shelfActions: ShelfActions = {
    setLabel: (slotId, label) => {
      if (!openShelf) return;
      const cur = slotOf(openShelf, slotId) ?? { games: [] };
      run(ShelfRepository.saveSlot(openShelf, slotId, { ...cur, label }));
    },
    addGame: (slotId, g) => {
      if (!openShelf) return;
      run(ShelfRepository.saveSlot(openShelf, slotId, addGameToSlot(slotOf(openShelf, slotId), g)));
    },
    removeGame: (slotId, key) => {
      if (!openShelf) return;
      const shelfId = openShelf;
      const cur = slotOf(shelfId, slotId);
      const idx = cur?.games.findIndex((g) => g.key === key) ?? -1;
      const game = idx >= 0 ? cur!.games[idx] : undefined;
      if (!game) return;
      if (selGame === key) setSelGame(null);
      run(ShelfRepository.saveSlot(shelfId, slotId, removeGameFromSlot(cur, key)));
      offerUndo({
        text: `Tirou ${game.name}.`,
        run: () => {
          const now = slotOf(shelfId, slotId) ?? { games: [] };
          if (game.gameId && now.games.some((g) => g.gameId === game.gameId)) return setUndoInfo(null);
          const games = [...now.games];
          games.splice(Math.min(idx, games.length), 0, game);
          run(ShelfRepository.saveSlot(shelfId, slotId, { ...now, games }));
          setUndoInfo(null);
        },
      });
    },
    moveGame: (from, to) => {
      if (from.shelfId === to.shelfId && from.slotId === to.slotId) return;
      const src = slotOf(from.shelfId, from.slotId);
      const game = src?.games.find((g) => g.key === from.key);
      if (!game) return;
      const dst = slotOf(to.shelfId, to.slotId) ?? { games: [] };
      const moved: ShelfSlot = { ...dst, games: [...dst.games.filter((g) => !(game.gameId && g.gameId === game.gameId)), game] };
      run(
        ShelfRepository.saveSlots([
          { shelfId: from.shelfId, slotId: from.slotId, slot: removeGameFromSlot(src, from.key) },
          { shelfId: to.shelfId, slotId: to.slotId, slot: moved },
        ]),
      );
    },
    createCategory: (name, color, rule) => {
      const c: ShelfCategory = rule ? { id: newId("cat"), name, color, rule } : { id: newId("cat"), name, color };
      const list = [...customs, c];
      setCustoms(list);
      run(ShelfRepository.saveCategories(list), `Categoria "${name}" criada.`);
      return c;
    },
    updateCategory: (c) => {
      const list = customs.map((x) => (x.id === c.id ? c : x));
      setCustoms(list);
      run(ShelfRepository.saveCategories(list));
    },
    deleteCategory: (id) => {
      const gone = customs.find((x) => x.id === id);
      const list = customs.filter((x) => x.id !== id);
      setCustoms(list);
      if (catFilter?.kind === "custom" && catFilter.id === id) setCatFilter(null);
      run(ShelfRepository.saveCategories(list), gone ? `Categoria "${gone.name}" excluída.` : undefined);
    },
  };
  const onShelfDrop = (payload: DragPayload, toSlot: string) => {
    if (!openShelf) return;
    if ("key" in payload) {
      shelfActions.moveGame({ shelfId: openShelf, slotId: payload.from, key: payload.key }, { shelfId: openShelf, slotId: toSlot });
      return;
    }
    const g = catalogById.get(payload.gameId);
    if (!g) return;
    const where = located.get(g.id) ?? [];
    if (where.length === 1) {
      const key = slotOf(where[0].shelfId, where[0].slotId)?.games.find((x) => x.gameId === g.id)?.key;
      if (key) {
        shelfActions.moveGame({ shelfId: where[0].shelfId, slotId: where[0].slotId, key }, { shelfId: openShelf, slotId: toSlot });
        return;
      }
    }
    shelfActions.addGame(toSlot, { gameId: g.id, name: g.name });
  };

  // ───────────── pontos no mapa (régua e calibração) ─────────────
  const calibrating = mode === "edit" && editTool.kind === "calibrate";
  const pointMode = ruler.on || calibrating;
  const onTapPoint = (p: Pt) => {
    if (calibrating && editTool.kind === "calibrate") {
      setEditTool(!editTool.a || editTool.b ? { kind: "calibrate", a: p } : { kind: "calibrate", a: editTool.a, b: p });
      return;
    }
    setRuler((r) => (!r.a || r.b ? { on: true, a: p } : { on: true, a: r.a, b: p }));
  };
  const measure: MeasureOverlay | undefined = calibrating
    ? editTool.kind === "calibrate"
      ? { a: editTool.a, b: editTool.b, label: editTool.a && editTool.b ? formatMeters(Math.hypot(editTool.b.x - editTool.a.x, editTool.b.y - editTool.a.y)) : undefined }
      : undefined
    : ruler.on
      ? { a: ruler.a, b: ruler.b, label: ruler.a && ruler.b ? formatMeters(Math.hypot(ruler.b.x - ruler.a.x, ruler.b.y - ruler.a.y)) : undefined }
      : undefined;

  // ───────────── o que mostrar ─────────────
  // Celular: ao tocar numa mesa, uma barra no mapa já resolve o estado (sem rolar a tela)
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const bottomBar =
    narrow && mode === "day" && selectedUnit && tool.kind === "select" && !full ? (
      <QuickUnitBar
        unit={selectedUnit}
        onSet={(st) => dayActions.setManual(selectedUnit, st)}
        onSeatWalkin={(name, n) => dayActions.seatWalkin(selectedUnit, name, n)}
        onRelease={() => dayActions.release(selectedUnit)}
        onClose={() => setSelUnit(null)}
        extra={
          <button
            type="button"
            onClick={() => document.getElementById("fp-unit-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="shrink-0 rounded-lg border border-primary-gold/30 px-2 py-1 text-[11px] font-semibold text-primary-gold/85"
          >
            Detalhes
          </button>
        }
      />
    ) : null;
  const fullButton = (
    <button
      type="button"
      title={full ? "Sair da tela cheia (Esc)" : "Mapa em tela cheia"}
      aria-label={full ? "Sair da tela cheia" : "Mapa em tela cheia"}
      aria-pressed={full}
      onClick={() => setFull(!full)}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        full ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/20 bg-primary-black/85 text-primary-gold/80 hover:border-primary-gold/50 hover:text-primary-gold"
      }`}
    >
      {full ? <LuMinimize2 size={15} /> : <LuMaximize2 size={15} />}
    </button>
  );
  // Botão das camadas (só no modo planta), na coluna de botões do mapa
  const layersButton =
    mode === "edit" ? (
      <button
        type="button"
        title={layersOpen ? "Fechar a lista de camadas" : "Camadas: tudo o que está na planta"}
        aria-label={layersOpen ? "Fechar a lista de camadas" : "Abrir a lista de camadas"}
        aria-pressed={layersOpen}
        onClick={() => setLayersOpen(!layersOpen)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          layersOpen ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/20 bg-primary-black/85 text-primary-gold/80 hover:border-primary-gold/50 hover:text-primary-gold"
        }`}
      >
        <LuLayers size={15} />
      </button>
    ) : null;
  const plan = mode === "edit" ? draft : savedPlan;
  const elements = mode === "edit" ? draft.elements : mode === "games" ? savedPlan.elements : layout.elements;
  // Escondidos (olhinho na lista de camadas) não são desenhados no 2D nem no 3D
  const drawn = useMemo(() => elements.filter((e) => !e.hidden), [elements]);
  const levelsDesc = [...plan.levels].sort((a, b) => b.order - a.order);
  const selectedSet = useMemo(() => new Set(mode === "edit" ? sel : selectedUnit?.tableIds ?? []), [mode, sel, selectedUnit]);
  const pickingSet = useMemo(() => {
    if (tool.kind === "join") return new Set(tool.tables);
    if (tool.kind === "assign") return new Set(suggestionsFor(tool.reserve)[0]?.tableIds ?? []);
    return new Set<string>();
  }, [tool, suggestionsFor]);
  const summary = planSummary(plan);
  const levelSummary = summary.find((s) => s.level === level);
  const handlesFor =
    mode === "edit" && editTool.kind === "none" && !ruler.on && selection.length === 1 && !selection[0].locked && (!lockStructure || !KINDS[selection[0].kind].structural)
      ? selection[0]
      : null;

  const hint = ruler.on
    ? ruler.a && !ruler.b
      ? "Toque no fim da medida"
      : "Régua: toque em dois pontos para medir"
    : calibrating
      ? "Marque os dois pontos da medida conhecida"
      : mode === "games"
        ? shelvesList.length
          ? "Toque num armário para abrir e organizar os jogos"
          : "Ainda não há armário de jogos: adicione em Planta"
        : mode === "edit"
        ? editTool.kind === "bgMove"
          ? "Arraste a imagem de fundo"
          : sel.length
            ? undefined
            : "Toque para escolher · arraste o piso para mover a vista"
        : tool.kind === "join"
          ? "Toque nas mesas para juntar"
          : tool.kind === "assign"
            ? `Toque na mesa de ${tool.reserve.name || "a reserva"} (a sugerida está marcada)`
            : moveTables
              ? "Arraste uma mesa para mudá-la de lugar neste dia"
              : "Toque numa mesa · arraste para mover a vista";

  return (
    <div className="flex min-h-full flex-col gap-3 lg:h-full">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/myreserves"
              title="Voltar para Reservas"
              aria-label="Voltar para Reservas"
              onClick={(e) => {
                if (dirty && !window.confirm("A planta tem mudanças não salvas. Sair mesmo assim?")) e.preventDefault();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-gold/25 text-primary-gold/70 transition-colors hover:border-primary-gold/60 hover:text-primary-gold"
            >
              <LuArrowLeft size={17} />
            </Link>
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-gold/25 bg-primary-gold/10 text-primary-gold sm:flex">
              <LuMap size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-primary-gold">Mapa do pub</h1>
              <p className="truncate text-[11px] text-primary-gold/55">
                {mode === "games"
                  ? `Onde fica cada jogo · ${shelvesList.length} ${shelvesList.length === 1 ? "armário" : "armários"} de jogos`
                  : mode === "day"
                  ? `Mesas livres, reservadas e ocupadas · ${scopeLabel.toLowerCase()}`
                  : `Editando a planta · ${summary.reduce((s, x) => s + x.tables, 0)} mesas, ${summary.reduce((s, x) => s + x.seats, 0)} lugares`}
              </p>
            </div>
          </div>
          <Seg
            label="Modo"
            value={mode}
            onChange={changeMode}
            options={[
              { id: "day", label: <><LuCalendarDays size={14} /> Dia a dia</> },
              { id: "games", label: <><LuLibrary size={14} /> Jogos</> },
              { id: "edit", label: <><LuPencilRuler size={14} /> Planta</> },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!(dim === "3d" && allLevels) && (
            <Seg label="Andar" size="sm" value={level} onChange={setLevel} options={levelsDesc.map((l) => ({ id: l.id, label: l.name }))} />
          )}
          <Seg
            label="Vista"
            size="sm"
            value={dim}
            onChange={(v) => {
              setDim(v);
              setRuler({ on: false });
              if (mode === "edit") setEditTool({ kind: "none" });
            }}
            options={[
              { id: "2d", label: <><LuSquare size={12} /> 2D</>, title: "Planta vista de cima (para editar e marcar)" },
              { id: "3d", label: <><LuBox size={12} /> 3D</>, title: "Vista em 3D" },
            ]}
          />
          {levelSummary && !(dim === "3d" && allLevels) && (
            <span className="text-[11px] text-primary-gold/50">
              {levelSummary.tables} mesas · {levelSummary.seats} lugares neste andar
            </span>
          )}

          {mode === "edit" && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <span className={`text-[11px] ${dirty ? "text-amber-200/90" : "text-primary-gold/45"}`}>
                {saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Tudo salvo"}
              </span>
              <Btn tone="ghost" title="Desfazer (Ctrl+Z)" disabled={!hist.past.length} onClick={() => setHist(undoHistory)}>
                <LuUndo2 size={15} />
              </Btn>
              <Btn tone="ghost" title="Refazer (Ctrl+Shift+Z)" disabled={!hist.future.length} onClick={() => setHist(redoHistory)}>
                <LuRedo2 size={15} />
              </Btn>
              {clip && (
                <Btn tone="ghost" title="Colar o que foi copiado (Ctrl+V)" onClick={pasteClip}>
                  <LuClipboardPaste size={14} /> Colar
                </Btn>
              )}
              <Btn tone="ghost" disabled={!dirty} onClick={() => setConfirm("discard")}>
                Descartar
              </Btn>
              <Btn tone="primary" disabled={!dirty || saving} onClick={() => void save()}>
                <LuSave size={14} /> Salvar planta
              </Btn>
            </div>
          )}
        </div>

        {loaded && stored === null && (
          <p className="flex items-start gap-2 rounded-xl border border-primary-gold/20 bg-primary-gold/[0.05] px-3 py-2 text-xs leading-relaxed text-primary-gold/75">
            <LuInfo size={14} className="mt-0.5 shrink-0 text-primary-gold/60" />
            <span>
              Esta é a planta inicial, feita a partir do modelo 3D e do PDF, com medidas estimadas. Em <strong>Planta</strong> dá para
              acertar tamanhos, posições e nomes (e desenhar por cima de uma foto da planta); depois de salvar, ela passa a valer para
              todo mundo. A mesa 9 foi colocada entre a 8 e a 10 porque aparece nas reservas: confira o lugar dela.
            </span>
          </p>
        )}
        {mode === "edit" && remoteNewer && (
          <p className="rounded-xl border border-amber-300/35 bg-amber-300/[0.07] px-3 py-2 text-xs text-amber-100/90">
            Outra pessoa salvou a planta enquanto você editava. Ao salvar, você vai escolher entre manter a sua versão ou a dela.
          </p>
        )}
        {planError && (
          <p className="rounded-xl border border-invalid-color/30 bg-invalid-color/[0.06] px-3 py-2 text-xs text-invalid-color">
            Não foi possível carregar a planta salva. Mostrando a planta inicial.
          </p>
        )}
      </header>

      {/* Mapa e painel */}
      <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div
          className={
            full
              ? "fixed inset-0 z-[70] bg-primary-black p-2 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))] [padding-top:max(0.5rem,env(safe-area-inset-top))]"
              : "relative h-[62dvh] min-h-[340px] lg:h-auto lg:min-h-0 lg:flex-1"
          }
        >
          {!loaded ? (
            <CanvasMessage>Carregando a planta…</CanvasMessage>
          ) : dim === "3d" ? (
            <Scene3D
              elements={drawn}
              levels={plan.levels}
              levelHeight={plan.levelHeight}
              level={allLevels ? "all" : level}
              tableStates={mode === "day" ? tableStates : undefined}
              selected={selectedSet}
              highWalls={highWalls}
              topView={topView}
              showLabels={labels3d}
              onPickTable={(id) => (mode === "day" ? onTapDay(id) : mode === "edit" ? selectIds([id]) : undefined)}
              onPickShelf={(id) => (mode === "edit" ? selectIds([id]) : openShelfAt(id))}
              focusShelf={mode === "games" ? openShelf : null}
              onFocusArrive={() => setShelfReady(true)}
              shelfGames={shelfGamesMap}
              shelfHighlight={mode === "games" ? shelfHighlight : undefined}
              toolbar={
                <>
                  {[
                    { on: allLevels, set: () => setAllLevels(!allLevels), label: "Todos os andares" },
                    { on: topView, set: () => setTopView(!topView), label: "De cima" },
                    { on: highWalls, set: () => setHighWalls(!highWalls), label: "Paredes altas" },
                    { on: labels3d, set: () => setLabels3d(!labels3d), label: "Nomes" },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      aria-pressed={t.on}
                      onClick={t.set}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition-colors ${
                        t.on ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/25 bg-primary-black/75 text-primary-gold/75 hover:text-primary-gold"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </>
              }
              extraControls={
                <>
                  {layersButton}
                  {fullButton}
                </>
              }
            />
          ) : (
            <PlanCanvas
              elements={drawn}
              level={level}
              mode={mode === "edit" ? "edit" : "day"}
              selected={mode === "games" ? new Set(openShelf ? [openShelf] : []) : selectedSet}
              picking={mode === "games" ? shelfHighlight : pickingSet}
              shelfColors={shelfColorsMap}
              shelfBadges={mode === "games" ? shelfBadgesMap : undefined}
              tableStates={mode === "day" ? tableStates : undefined}
              tableBadges={mode === "day" ? tableBadges : undefined}
              tableNotes={mode === "day" ? tableNotes : undefined}
              groups={mode === "day" ? groupOutlines : undefined}
              isInteractive={
                mode === "day"
                  ? (el) => el.kind === "table" || (el.kind === "gameshelf" && tool.kind === "select")
                  : mode === "games"
                    ? (el) => el.kind === "gameshelf"
                    : (el) => !el.locked && (!lockStructure || !KINDS[el.kind].structural)
              }
              handlesFor={handlesFor}
              showGrid={mode === "edit"}
              fitKey={`${mode}|${level}`}
              centerRef={centerRef}
              background={mode === "edit" ? currentBg : undefined}
              backgroundDraggable={mode === "edit" && editTool.kind === "bgMove"}
              pointMode={pointMode}
              onTapPoint={onTapPoint}
              measure={measure}
              hint={bottomBar ? undefined : hint}
              legend={mode === "day" ? (["free", "reserved", "occupied", "blocked"] as TableState[]).map((st) => ({ color: STATE_META[st].color, label: STATE_META[st].label })) : undefined}
              bottomOverlay={bottomBar}
              extraControls={
                <>
                {layersButton}
                {fullButton}
                <button
                  type="button"
                  title="Régua: medir distâncias"
                  aria-label="Régua"
                  aria-pressed={ruler.on}
                  onClick={() => {
                    setRuler((r) => ({ on: !r.on }));
                    if (mode === "edit") setEditTool({ kind: "none" });
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                    ruler.on
                      ? "border-primary-gold bg-primary-gold text-primary-black"
                      : "border-primary-gold/20 bg-primary-black/85 text-primary-gold/80 hover:border-primary-gold/50 hover:text-primary-gold"
                  }`}
                >
                  <LuRuler size={15} />
                </button>
                </>
              }
              onTap={mode === "day" ? (id) => onTapDay(id) : mode === "games" ? (id) => (id ? openShelfAt(id) : closeShelf()) : onTapEdit}
              onMoveStart={mode === "day" ? (id) => onMoveStartDay(id) : mode === "games" ? () => false : onMoveStartEdit}
              onMove={mode === "day" ? onMoveDay : mode === "games" ? () => {} : onMoveEdit}
              onMoveEnd={mode === "day" ? onMoveEndDay : mode === "games" ? () => {} : onMoveEndEdit}
              onHandleStart={onHandleStart}
              onHandle={onHandle}
              onHandleEnd={onHandleEnd}
            />
          )}
          {mode === "edit" && layersOpen && loaded && (
            <LayersPanel
              elements={draft.elements}
              level={level}
              levelName={draft.levels.find((l) => l.id === level)?.name ?? ""}
              selected={selectedSet}
              onSelect={(id, additive) => {
                if (additive) setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
                else selectIds([id]);
              }}
              onUpdate={(id, patch) => editActions.update(id, patch)}
              onUpdateMany={(ids, patch) =>
                apply((p) => ({ ...p, elements: p.elements.map((e) => (ids.includes(e.id) ? { ...e, ...patch } : e)) }))
              }
              onDelete={(id) => {
                apply((p) => deleteElements(p, [id]));
                setSel((s) => s.filter((x) => x !== id));
              }}
              onClose={() => setLayersOpen(false)}
            />
          )}
          {full && (
            <button
              type="button"
              onClick={() => setFull(false)}
              className={`absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary-gold bg-primary-gold px-4 py-2 text-sm font-bold text-primary-black shadow-card transition-transform hover:scale-[1.03] ${
                mode === "games" && openShelf ? "top-4" : "bottom-4 [margin-bottom:env(safe-area-inset-bottom)]"
              }`}
            >
              <LuMinimize2 size={16} /> Sair da tela cheia
            </button>
          )}
          {mode === "games" && openShelfRef && shelfReady && (
            <ShelfFront
              key={openShelfRef.el.id}
              el={openShelfRef.el}
              name={openShelfRef.name}
              subtitle={openShelfRef.room}
              content={contents.get(openShelfRef.el.id)}
              catalogById={catalogById}
              customs={customs}
              selectedSlot={selSlot}
              selectedGame={selGame}
              highlightGame={highlightGame}
              onSelectSlot={(id) => {
                setSelSlot(id);
                setSelGame(null);
              }}
              onSelectGame={(slotId, key) => {
                setSelSlot(slotId);
                setSelGame(key || null);
              }}
              onDrop={onShelfDrop}
              onClose={closeShelf}
              onRemove={(slotId, key) => shelfActions.removeGame(slotId, key)}
              onMove={(slotId, key, toSlot) => {
                shelfActions.moveGame({ shelfId: openShelfRef.el.id, slotId, key }, { shelfId: openShelfRef.el.id, slotId: toSlot });
                setSelSlot(toSlot);
              }}
              undo={undoInfo}
            />
          )}
        </div>

        <aside className="flex flex-col gap-3 lg:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:pr-1">
          {mode === "day" ? (
            <DayPanel
              date={date}
              setDate={setDate}
              status={status}
              selected={selectedUnit}
              onSelect={(key) => {
                setSelUnit(key);
                const u = key ? status.unitByKey.get(key) : null;
                if (u && u.level !== level) setLevel(u.level);
              }}
              tool={tool}
              setTool={setTool}
              onConfirmJoin={confirmJoin}
              moveTables={moveTables}
              setMoveTables={setMoveTables}
              hasLayoutChanges={dayHasLayoutChanges(day)}
              hiddenTables={hiddenTables}
              movedTables={movedTables}
              baseNameOf={baseNameOf}
              levelName={levelName}
              loadingReserves={loadingReserves}
              settings={settings}
              setSettings={setSettings}
              syncOn={syncOn}
              syncSince={syncChangeFor(settings.syncHistory, date)?.from ?? null}
              setSync={setSync}
              scope={scope}
              setScope={setScope}
              nowMinutes={nowMinutes}
              reservationTimes={reservationTimes}
              suggestionsFor={suggestionsFor}
              templates={templates}
              onPrint={() => void onPrint()}
              actions={dayActions}
              dayWalkins={day.walkins}
            />
          ) : mode === "games" ? (
            openShelfRef ? (
              <ShelfPanel
                shelf={openShelfRef}
                content={contents.get(openShelfRef.el.id)}
                catalog={catalog}
                catalogById={catalogById}
                types={typesList}
                customs={customs}
                located={located}
                unplaced={unplaced}
                undo={undoInfo}
                shelves={shelvesList}
                contents={contents}
                selectedSlot={selSlot}
                setSelectedSlot={(id) => {
                  setSelSlot(id);
                  setSelGame(null);
                }}
                selectedGame={selGame}
                setSelectedGame={setSelGame}
                loadingCatalog={loadingCatalog}
                actions={shelfActions}
                onClose={closeShelf}
              />
            ) : (
              <GamesPanel
                shelves={shelvesList}
                contents={contents}
                catalog={catalog}
                located={located}
                unplaced={unplaced}
                types={typesList}
                customs={customs}
                filter={catFilter}
                setFilter={setCatFilter}
                loadingCatalog={loadingCatalog}
                onOpen={openShelfAt}
                onCreateCategory={(n, c, r) => shelfActions.createCategory(n, c, r)}
                onUpdateCategory={shelfActions.updateCategory}
                onDeleteCategory={shelfActions.deleteCategory}
              />
            )
          ) : (
            <EditPanel
              plan={draft}
              level={level}
              selection={selection}
              problems={problems}
              snap={snapOn}
              setSnap={setSnapOn}
              lockStructure={lockStructure}
              setLockStructure={setLockStructure}
              tool={editTool}
              setTool={(t) => {
                setEditTool(t);
                setRuler({ on: false });
                if (t.kind !== "none") setSel([]);
              }}
              uploading={uploading}
              actions={editActions}
            />
          )}
        </aside>
      </div>

      {/* Celular: salvar sempre à mão enquanto há mudança na planta */}
      {mode === "edit" && dirty && narrow && !full && (
        <div className="fixed inset-x-3 bottom-3 z-[60] flex items-center gap-2 rounded-xl border border-amber-300/40 bg-primary-black/95 p-2 shadow-card backdrop-blur [margin-bottom:env(safe-area-inset-bottom)]">
          <span className="min-w-0 flex-1 truncate pl-1 text-xs font-semibold text-amber-200">Alterações não salvas</span>
          <Btn tone="ghost" title="Desfazer" disabled={!hist.past.length} onClick={() => setHist(undoHistory)}>
            <LuUndo2 size={15} />
          </Btn>
          <Btn tone="primary" disabled={saving} onClick={() => void save()}>
            <LuSave size={14} /> {saving ? "Salvando…" : "Salvar"}
          </Btn>
        </div>
      )}

      <ConfirmDialog
        open={confirm === "leave"}
        title="Sair sem salvar a planta?"
        onClose={() => setConfirm(null)}
        actions={[
          {
            label: "Sair sem salvar",
            tone: "danger",
            onClick: () => {
              resetEdit();
              setConfirm(null);
              setMode(leaveTo.current);
            },
          },
          { label: "Salvar e sair", tone: "primary", onClick: () => void save().then((ok) => ok && setMode(leaveTo.current)) },
        ]}
      >
        As mudanças feitas na planta ainda não foram salvas.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "discard"}
        title="Descartar as mudanças?"
        onClose={() => setConfirm(null)}
        actions={[
          {
            label: "Descartar",
            tone: "danger",
            onClick: () => {
              resetEdit();
              setConfirm(null);
            },
          },
        ]}
      >
        A planta volta para a última versão salva.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === "conflict"}
        title="Outra pessoa salvou a planta"
        onClose={() => setConfirm(null)}
        actions={[
          {
            label: "Ficar com a versão dela",
            onClick: () => {
              resetEdit();
              setConfirm(null);
            },
          },
          { label: "Salvar a minha por cima", tone: "danger", onClick: () => void save(true) },
        ]}
      >
        Enquanto você editava, a planta foi salva em outro aparelho. Escolha qual versão fica: a dela (as suas mudanças se perdem) ou a
        sua (substitui a dela).
      </ConfirmDialog>
      <span className="sr-only" aria-live="polite">
        {selectedUnit ? `${tableTitle(selectedUnit.name)} escolhida` : ""}
      </span>
    </div>
  );
}
