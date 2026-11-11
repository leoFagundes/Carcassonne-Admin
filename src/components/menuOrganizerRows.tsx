"use client";

import { useEffect, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { AnimatePresence, Reorder, motion, useDragControls, type DragControls } from "framer-motion";
import { LuChevronDown, LuGripVertical, LuPlus, LuTrash2, LuX } from "react-icons/lu";
import type { InfoType, MenuItemType, TypeOrderType } from "@/types";
import Input from "./input";
import {
  GENERAL_FALLBACK,
  IllustrationOptions,
  IllustrationThumb,
  fallbackFrom,
  withIllustration,
} from "./illustrationPicker";
import { missingSubtypes, nameError, subtypeKey, subtypeKeys } from "@/utils/menuOrganizer";

type Entry = TypeOrderType;
type Sub = TypeOrderType["type"]["subtypes"][number];

const DRAG_STYLE = { scale: 1.015, boxShadow: "0 14px 34px rgba(0,0,0,0.55)", zIndex: 10 };

/**
 * Abre e fecha animando a altura. As linhas da lista animam só a posição
 * (layout="position"): animar o tamanho delas esticava o conteúdo ao abrir.
 * O overflow só fica escondido durante a animação, para não cortar as
 * sugestões do campo de texto.
 */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse"
          initial={{ height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={{ height: { duration: 0.24, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.18 } }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Alça de arraste: só ela move o item (o resto da linha fica clicável). No
 * teclado, as setas para cima e para baixo também movem.
 */
function DragHandle({
  controls,
  label,
  onMove,
  small = false,
}: {
  controls: DragControls;
  label: string;
  onMove: (delta: -1 | 1) => void;
  small?: boolean;
}) {
  const start = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    controls.start(e);
  };
  const keys = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onMove(e.key === "ArrowUp" ? -1 : 1);
    }
  };
  return (
    <button
      type="button"
      aria-label={`${label}. Arraste, ou use as setas do teclado`}
      title="Arraste para mudar a ordem"
      onPointerDown={start}
      onKeyDown={keys}
      className={`flex shrink-0 touch-none items-center justify-center rounded-md text-primary-gold/35 hover:text-primary-gold/80 hover:bg-primary-gold/5 focus-visible:text-primary-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary-gold/60 cursor-grab active:cursor-grabbing ${
        small ? "h-7 w-5" : "h-9 w-6"
      }`}
    >
      <LuGripVertical size={small ? 14 : 16} />
    </button>
  );
}

/** Excluir com confirmação: o primeiro toque pergunta, o segundo exclui. */
function ConfirmDelete({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> | void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(t);
  }, [asking]);

  return (
    <button
      type="button"
      disabled={busy}
      aria-label={asking ? `Confirmar exclusão de ${label}` : `Excluir ${label}`}
      onClick={async () => {
        if (!asking) return setAsking(true);
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
          setAsking(false);
        }
      }}
      className={`flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 ${
        asking
          ? "border-invalid-color/50 bg-invalid-color/15 px-2.5 text-invalid-color"
          : "w-9 border-transparent text-primary-gold/35 hover:border-invalid-color/30 hover:text-invalid-color"
      }`}
    >
      <LuTrash2 size={14} />
      {asking && <span>Excluir?</span>}
    </button>
  );
}

/* ─── Categoria ─────────────────────────────────────────────────────────── */

export function CategoryRow({
  entry,
  position,
  itemCount,
  subtypeCounts,
  menuItems,
  onChange,
  onMove,
  onDelete,
  onError,
}: {
  entry: Entry;
  position: number;
  itemCount: number;
  subtypeCounts: Map<string, number>;
  menuItems: readonly MenuItemType[];
  onChange: (next: Entry) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const controls = useDragControls();
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const { name, subtypes } = entry.type;

  const setType = (patch: Partial<Entry["type"]>) => onChange({ ...entry, type: { ...entry.type, ...patch } });

  return (
    <Reorder.Item
      value={entry}
      layout="position"
      dragListener={false}
      dragControls={controls}
      whileDrag={DRAG_STYLE}
      className="relative list-none rounded-xl border border-primary-gold/15 bg-primary-black/50"
    >
      <div className="flex items-center gap-1.5 py-2 pl-1 pr-2 sm:gap-2">
        <DragHandle controls={controls} label={`Mover ${name}`} onMove={onMove} />
        <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-primary-gold/35">{position}</span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-1 py-0.5 text-left cursor-pointer"
        >
          <span className="w-full truncate text-sm font-semibold text-primary-gold">{name}</span>
          <span className="w-full truncate text-[11px] text-primary-gold/45">
            {plural(itemCount, "item", "itens")} · {plural(subtypes.length, "subcategoria", "subcategorias")}
          </span>
        </button>
        <IllustrationThumb
          value={entry.type.illustration}
          fallback={GENERAL_FALLBACK}
          name={name}
          open={picking}
          onToggle={() => setPicking((v) => !v)}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? `Fechar subcategorias de ${name}` : `Abrir subcategorias de ${name}`}
          className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-primary-gold/50 hover:bg-primary-gold/5 hover:text-primary-gold cursor-pointer"
        >
          <LuChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <ConfirmDelete label={name} onConfirm={onDelete} />
      </div>

      <Collapse open={picking}>
        <div className="px-2 pb-2">
          <IllustrationOptions
            value={entry.type.illustration}
            fallback={GENERAL_FALLBACK}
            name={name}
            onPick={(id) => {
              onChange({ ...entry, type: withIllustration(entry.type, id) });
              setPicking(false);
            }}
          />
        </div>
      </Collapse>

      <Collapse open={expanded}>
        <SubtypesPanel
          entry={entry}
          counts={subtypeCounts}
          menuItems={menuItems}
          onSubtypes={(next) => setType({ subtypes: next })}
          onError={onError}
        />
      </Collapse>
    </Reorder.Item>
  );
}

/* ─── Subcategorias ─────────────────────────────────────────────────────── */

function SubtypesPanel({
  entry,
  counts,
  menuItems,
  onSubtypes,
  onError,
}: {
  entry: Entry;
  counts: Map<string, number>;
  menuItems: readonly MenuItemType[];
  onSubtypes: (next: Sub[]) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const { name, subtypes, illustration } = entry.type;
  const keys = subtypeKeys(subtypes);
  const suggestions = missingSubtypes(menuItems, entry);
  const fallback = fallbackFrom(illustration);

  const add = (raw: string) => {
    const error = nameError(raw, subtypes.map((s) => s.name), "subcategoria");
    if (error) return onError(error);
    onSubtypes([...subtypes, { name: raw.trim(), order: subtypes.length }]);
    setDraft("");
  };
  const move = (index: number, delta: -1 | 1) => {
    const to = index + delta;
    if (to < 0 || to >= subtypes.length) return;
    const next = [...subtypes];
    [next[index], next[to]] = [next[to], next[index]];
    onSubtypes(next);
  };

  return (
    <div className="flex flex-col gap-2 border-t border-primary-gold/10 px-2 pb-3 pt-2.5 sm:pl-9">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-gold/40">
        Subcategorias de {name}
      </span>

      {subtypes.length === 0 ? (
        <p className="text-xs text-primary-gold/45">Sem subcategorias: os itens de {name} aparecem todos juntos.</p>
      ) : (
        <Reorder.Group axis="y" values={subtypes} onReorder={onSubtypes} className="flex flex-col gap-1.5">
          {subtypes.map((sub, index) => (
            <SubtypeRow
              key={keys[index]}
              sub={sub}
              count={counts.get(subtypeKey(name, sub.name)) ?? 0}
              fallback={fallback}
              onChange={(next) => onSubtypes(subtypes.map((s, i) => (i === index ? next : s)))}
              onRemove={() => onSubtypes(subtypes.filter((_, i) => i !== index))}
              onMove={(delta) => move(index, delta)}
            />
          ))}
        </Reorder.Group>
      )}

      <div className="flex items-center gap-2">
        <Input
          label="Nova subcategoria"
          placeholder="Nova subcategoria"
          value={draft}
          setValue={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          options={suggestions}
          variant
          smallInput
          width="!w-full !max-w-none"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="mt-2 flex h-[34px] shrink-0 items-center gap-1 rounded-lg border border-primary-gold/35 bg-primary-gold/10 px-3 text-xs font-semibold text-primary-gold hover:bg-primary-gold/20 cursor-pointer"
        >
          <LuPlus size={13} /> Adicionar
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-primary-gold/40">Usadas nos itens:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="flex items-center gap-1 rounded-full border border-dashed border-primary-gold/30 px-2.5 py-0.5 text-[11px] text-primary-gold/70 hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer"
            >
              <LuPlus size={11} /> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubtypeRow({
  sub,
  count,
  fallback,
  onChange,
  onRemove,
  onMove,
}: {
  sub: Sub;
  count: number;
  fallback: ReturnType<typeof fallbackFrom>;
  onChange: (next: Sub) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const [picking, setPicking] = useState(false);

  return (
    <Reorder.Item
      value={sub}
      layout="position"
      dragListener={false}
      dragControls={controls}
      whileDrag={DRAG_STYLE}
      className="relative list-none rounded-lg border border-primary-gold/10 bg-secondary-black/60"
    >
      <div className="flex items-center gap-1.5 py-1.5 pl-1 pr-1.5">
        <DragHandle controls={controls} label={`Mover ${sub.name}`} onMove={onMove} small />
        <span className="min-w-0 flex-1 truncate text-[13px] text-primary-gold/90">{sub.name}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-primary-gold/40">{plural(count, "item", "itens")}</span>
        <IllustrationThumb
          value={sub.illustration}
          fallback={fallback}
          name={sub.name}
          open={picking}
          onToggle={() => setPicking((v) => !v)}
          size="sm"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Tirar ${sub.name}`}
          title="Tirar da lista"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-gold/35 hover:text-invalid-color cursor-pointer"
        >
          <LuX size={14} />
        </button>
      </div>
      <Collapse open={picking}>
        <div className="px-1.5 pb-1.5">
          <IllustrationOptions
            value={sub.illustration}
            fallback={fallback}
            name={sub.name}
            onPick={(id) => {
              onChange(withIllustration(sub, id));
              setPicking(false);
            }}
          />
        </div>
      </Collapse>
    </Reorder.Item>
  );
}

/* ─── Aviso ─────────────────────────────────────────────────────────────── */

export function InfoRow({
  info,
  position,
  onMove,
}: {
  info: InfoType;
  position: number;
  onMove: (delta: -1 | 1) => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={info}
      layout="position"
      dragListener={false}
      dragControls={controls}
      whileDrag={DRAG_STYLE}
      className="relative list-none rounded-xl border border-primary-gold/15 bg-primary-black/50"
    >
      <div className="flex items-start gap-2 py-2.5 pl-1 pr-3">
        <DragHandle controls={controls} label={`Mover ${info.name}`} onMove={onMove} />
        <span className="mt-2 w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-primary-gold/35">{position}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
          <span className="truncate text-sm font-semibold text-primary-gold">{info.name}</span>
          {info.description && (
            <span className="line-clamp-2 text-xs leading-relaxed text-primary-gold/50">{info.description}</span>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}
