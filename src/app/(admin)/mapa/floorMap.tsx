"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LuArrowLeft,
  LuBox,
  LuCalendarDays,
  LuInfo,
  LuMap,
  LuPencilRuler,
  LuRedo2,
  LuRuler,
  LuSave,
  LuSquare,
  LuUndo2,
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
  newId,
  suggestTables,
  type SeatUnit,
} from "@/floorplan/day";
import {
  alignElements,
  attachTo,
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
import { createFromPalette, type PaletteItem } from "@/floorplan/palette";
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
import PlanCanvas, { BG_ID, type GroupOutline, type HandleId, type MeasureOverlay } from "./planCanvas";
import DayPanel, { unitTitle, type DayActions, type DayTool, type TimeScope } from "./dayPanel";
import EditPanel, { type EditActions, type EditTool } from "./editPanel";
import { printDay } from "./print";
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

type Mode = "day" | "edit";
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
  const changeMode = (m: Mode) => {
    if (m === mode) return;
    setRuler({ on: false });
    if (m === "edit") {
      resetEdit();
      setMode("edit");
    } else if (dirty) setConfirm("leave");
    else setMode("day");
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
    if (sel.includes(id)) ids = sel;
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
    else if (key.startsWith("arrow") && sel.length) {
      e.preventDefault();
      const n = (e.altKey ? 0.01 : 0.05) * (e.shiftKey ? 10 : 1);
      const dx = key === "arrowleft" ? -n : key === "arrowright" ? n : 0;
      const dy = key === "arrowup" ? -n : key === "arrowdown" ? n : 0;
      apply((p) => ({ ...p, elements: translate(p.elements, selectedRoots(p, sel), dx, dy) }));
    }
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

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
  const dayEff = useMemo(
    () => (dragPose ? { ...day, moves: { ...day.moves, [dragPose.id]: dragPose.pose } } : day),
    [day, dragPose],
  );
  const layout = useMemo(() => applyDay(savedPlan, dayEff), [savedPlan, dayEff]);
  const status = useMemo(
    () => computeDayStatus(savedPlan, dayEff, layout, reserves, { autoSync: settings.autoSync, at, stayMinutes: settings.stayMinutes }),
    [savedPlan, dayEff, layout, reserves, settings.autoSync, settings.stayMinutes, at],
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

  const writeMove = (id: string, pose: Pose) => {
    const base = baseById.get(id);
    const same = base && Math.abs(base.x - pose.x) < 0.005 && Math.abs(base.y - pose.y) < 0.005 && normRot(base.rot) === normRot(pose.rot);
    return FloorPlanRepository.setMove(date, id, same ? null : pose);
  };
  const layoutParts = () => ({ moves: day.moves, names: day.names, hidden: day.hidden, groups: day.groups });

  const dayActions: DayActions = {
    setManual: (unit, state: ManualState | null) => run(FloorPlanRepository.setManual(date, unit.key, state ? { state, at: Date.now() } : null)),
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
  const plan = mode === "edit" ? draft : savedPlan;
  const elements = mode === "edit" ? draft.elements : layout.elements;
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
    mode === "edit" && editTool.kind === "none" && !ruler.on && selection.length === 1 && (!lockStructure || !KINDS[selection[0].kind].structural)
      ? selection[0]
      : null;

  const hint = ruler.on
    ? ruler.a && !ruler.b
      ? "Toque no fim da medida"
      : "Régua: toque em dois pontos para medir"
    : calibrating
      ? "Marque os dois pontos da medida conhecida"
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
                {mode === "day"
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
          {dim === "3d" && (
            <div className="flex flex-wrap gap-1.5">
              <Btn active={allLevels} onClick={() => setAllLevels(!allLevels)}>Todos os andares</Btn>
              <Btn active={topView} onClick={() => setTopView(!topView)}>De cima</Btn>
              <Btn active={highWalls} onClick={() => setHighWalls(!highWalls)}>Paredes altas</Btn>
              <Btn active={labels3d} onClick={() => setLabels3d(!labels3d)}>Nomes</Btn>
            </div>
          )}
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
        <div className="relative h-[62dvh] min-h-[340px] lg:h-auto lg:min-h-0 lg:flex-1">
          {!loaded ? (
            <CanvasMessage>Carregando a planta…</CanvasMessage>
          ) : dim === "3d" ? (
            <Scene3D
              elements={elements}
              levels={plan.levels}
              levelHeight={plan.levelHeight}
              level={allLevels ? "all" : level}
              tableStates={mode === "day" ? tableStates : undefined}
              selected={selectedSet}
              highWalls={highWalls}
              topView={topView}
              showLabels={labels3d}
              onPickTable={(id) => (mode === "day" ? onTapDay(id) : selectIds([id]))}
            />
          ) : (
            <PlanCanvas
              elements={elements}
              level={level}
              mode={mode}
              selected={selectedSet}
              picking={pickingSet}
              tableStates={mode === "day" ? tableStates : undefined}
              tableBadges={mode === "day" ? tableBadges : undefined}
              tableNotes={mode === "day" ? tableNotes : undefined}
              groups={mode === "day" ? groupOutlines : undefined}
              isInteractive={mode === "day" ? (el) => el.kind === "table" : (el) => !lockStructure || !KINDS[el.kind].structural}
              handlesFor={handlesFor}
              showGrid={mode === "edit"}
              fitKey={`${mode}|${level}`}
              centerRef={centerRef}
              background={mode === "edit" ? currentBg : undefined}
              backgroundDraggable={mode === "edit" && editTool.kind === "bgMove"}
              pointMode={pointMode}
              onTapPoint={onTapPoint}
              measure={measure}
              hint={hint}
              extraControls={
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
              }
              onTap={mode === "day" ? (id) => onTapDay(id) : onTapEdit}
              onMoveStart={mode === "day" ? (id) => onMoveStartDay(id) : onMoveStartEdit}
              onMove={mode === "day" ? onMoveDay : onMoveEdit}
              onMoveEnd={mode === "day" ? onMoveEndDay : onMoveEndEdit}
              onHandleStart={onHandleStart}
              onHandle={onHandle}
              onHandleEnd={onHandleEnd}
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
              scope={scope}
              setScope={setScope}
              nowMinutes={nowMinutes}
              reservationTimes={reservationTimes}
              suggestionsFor={suggestionsFor}
              templates={templates}
              onPrint={() => void onPrint()}
              actions={dayActions}
            />
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
              setMode("day");
            },
          },
          { label: "Salvar e sair", tone: "primary", onClick: () => void save().then((ok) => ok && setMode("day")) },
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
