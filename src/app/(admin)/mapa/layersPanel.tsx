"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { LuChevronRight, LuEye, LuEyeOff, LuLock, LuLockOpen, LuPencil, LuSearch, LuTrash2, LuX } from "react-icons/lu";
import { KINDS } from "@/floorplan/catalog";
import { boundsOf } from "@/floorplan/geometry";
import { buildLayers, kindsOnLevel, type LayerGroupBy } from "@/floorplan/layers";
import type { ElementKind, PlanElement } from "@/floorplan/types";
import { PlanDefs, Shape2D, U } from "./shapes2d";

const GROUPS: { id: LayerGroupBy; label: string }[] = [
  { id: "room", label: "Ambiente" },
  { id: "kind", label: "Tipo" },
  { id: "none", label: "Sem grupo" },
];

/** Miniatura do próprio objeto (sem girar), com o traço da planta. */
const LayerThumb = memo(function LayerThumb({ el }: { el: PlanElement }) {
  const flat: PlanElement = { ...el, id: `lt-${el.id}`, x: 0, y: 0, rot: 0, parent: undefined, hidden: undefined };
  const b = boundsOf([flat]);
  if (!b) return <span className="h-5 w-6" />;
  const linear = KINDS[el.kind].linear;
  const minSide = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.18;
  const halfH = Math.max((b.maxY - b.minY) / 2, minSide);
  const halfW = (b.maxX - b.minX) / 2 + (linear ? el.d / 2 : 0);
  const pad = Math.max(halfW, halfH) * 0.1;
  const vb = [(-halfW - pad) * U, (-halfH - pad) * U, (halfW + pad) * 2 * U, (halfH + pad) * 2 * U].join(" ");
  return (
    <svg viewBox={vb} width={24} height={20} preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="shrink-0">
      <PlanDefs />
      <Shape2D el={flat} />
    </svg>
  );
});

/**
 * Lista de camadas da planta (como no Figma): tudo o que está no andar, de
 * cima para baixo, agrupado por ambiente ou tipo, com busca. Tocar escolhe
 * no mapa; dá para renomear, esconder (olhinho), travar (cadeado) e excluir.
 */
export default function LayersPanel({
  elements,
  level,
  levelName,
  selected,
  onSelect,
  onUpdate,
  onUpdateMany,
  onDelete,
  onClose,
}: {
  elements: PlanElement[];
  level: string;
  levelName: string;
  selected: ReadonlySet<string>;
  /** Escolher pela lista (com Ctrl/Shift soma à escolha). */
  onSelect: (id: string, additive: boolean) => void;
  onUpdate: (id: string, patch: Partial<PlanElement>) => void;
  /** Vários de uma vez (um passo só no desfazer). */
  onUpdateMany: (ids: string[], patch: Partial<PlanElement>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState<LayerGroupBy>(() => {
    try {
      const v = localStorage.getItem("fp-layers-group");
      return v === "kind" || v === "none" ? v : "room";
    } catch {
      return "room";
    }
  });
  const [kind, setKind] = useState<ElementKind | null>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem("fp-layers-group", groupBy);
    } catch {
      /* sem armazenamento */
    }
  }, [groupBy]);

  const groups = useMemo(() => buildLayers(elements, level, { groupBy, q, kind }), [elements, level, groupBy, q, kind]);
  const kinds = useMemo(() => kindsOnLevel(elements, level), [elements, level]);
  const onLevel = useMemo(() => elements.filter((e) => e.level === level), [elements, level]);
  const hiddenCount = onLevel.filter((e) => e.hidden).length;
  const lockedCount = onLevel.filter((e) => e.locked).length;
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  // Escolheu no mapa: mostra o item na lista (abre o grupo e rola até ele)
  const selKey = [...selected].join("|");
  useEffect(() => {
    const id = [...selected][0];
    if (!id) return;
    const g = groups.find((x) => x.items.some((i) => i.el.id === id));
    if (g && closed.has(g.key)) setClosed((s) => new Set([...s].filter((k) => k !== g.key)));
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-layer="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" }));
  }, [selKey]);

  const toggleGroup = (key: string) => setClosed((s) => (s.has(key) ? new Set([...s].filter((k) => k !== key)) : new Set([...s, key])));

  return (
    <aside
      className="fp-layers-in absolute bottom-2 left-2 top-2 z-20 flex w-[min(300px,calc(100%-4.5rem))] flex-col overflow-hidden rounded-xl border border-primary-gold/25 bg-[#16120e]/95 shadow-card backdrop-blur-sm"
      aria-label="Camadas"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes fpLayersIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        .fp-layers-in { animation: fpLayersIn 180ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .fp-layers-in { animation: none; } }
      `}</style>
      <header className="flex items-center gap-2 border-b border-primary-gold/15 px-3 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-primary-gold">Camadas</h3>
          <p className="truncate text-[10.5px] text-primary-gold/50">
            {levelName} · {onLevel.length} {onLevel.length === 1 ? "item" : "itens"} · de cima para baixo
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar camadas"
          title="Fechar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-gold/20 text-primary-gold/70 hover:border-primary-gold/50 hover:text-primary-gold"
        >
          <LuX size={15} />
        </button>
      </header>

      <div className="flex flex-col gap-2 border-b border-primary-gold/10 px-3 py-2">
        <label className="relative flex items-center">
          <LuSearch size={13} className="pointer-events-none absolute left-2.5 text-primary-gold/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar: mesa 12, parede, TV…"
            aria-label="Buscar na lista de camadas"
            className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 py-1.5 pl-8 pr-7 text-xs text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/60"
          />
          {q && (
            <button type="button" aria-label="Limpar busca" onClick={() => setQ("")} className="absolute right-2 text-primary-gold/50 hover:text-primary-gold">
              <LuX size={13} />
            </button>
          )}
        </label>
        <div role="group" aria-label="Agrupar por" className="grid grid-cols-3 rounded-lg border border-primary-gold/15 bg-primary-black/60 p-0.5">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={groupBy === g.id}
              onClick={() => setGroupBy(g.id)}
              className={`rounded-md py-1 text-[11px] font-semibold ${groupBy === g.id ? "bg-primary-gold text-primary-black" : "text-primary-gold/60 hover:text-primary-gold"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {kinds.length > 1 && (
          <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filtrar por tipo">
            <button
              type="button"
              aria-pressed={!kind}
              onClick={() => setKind(null)}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${!kind ? "border-primary-gold bg-primary-gold/15 text-primary-gold" : "border-primary-gold/15 text-primary-gold/55 hover:text-primary-gold"}`}
            >
              Todos
            </button>
            {kinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                aria-pressed={kind === k.kind}
                onClick={() => setKind(kind === k.kind ? null : k.kind)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                  kind === k.kind ? "border-primary-gold bg-primary-gold/15 text-primary-gold" : "border-primary-gold/15 text-primary-gold/55 hover:text-primary-gold"
                }`}
              >
                {k.label} <span className="text-primary-gold/40">{k.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-1" role="tree" aria-label="Itens da planta">
        {total === 0 && <p className="px-3 py-4 text-center text-xs text-primary-gold/50">{q || kind ? "Nada encontrado." : "Nada neste andar ainda."}</p>}
        {groups.map((g) => {
          const open = !closed.has(g.key);
          return (
            <div key={g.key} role="group">
              {groupBy !== "none" && (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  aria-expanded={open}
                  className="sticky top-0 z-[1] flex w-full items-center gap-1 bg-[#16120e]/95 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-primary-gold/55 backdrop-blur-sm hover:text-primary-gold"
                >
                  <LuChevronRight size={12} className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <span className="font-semibold tracking-normal text-primary-gold/35">{g.items.length}</span>
                </button>
              )}
              {open &&
                g.items.map(({ el, name, depth }) => {
                  const on = selected.has(el.id);
                  const asking = confirmDel === el.id;
                  return (
                    <div
                      key={el.id}
                      data-layer={el.id}
                      role="treeitem"
                      aria-selected={on}
                      tabIndex={0}
                      onClick={(e) => {
                        if (renaming === el.id) return;
                        onSelect(el.id, e.shiftKey || e.ctrlKey || e.metaKey);
                      }}
                      onDoubleClick={() => setRenaming(el.id)}
                      onKeyDown={(e) => {
                        if (renaming === el.id) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(el.id, e.shiftKey || e.ctrlKey || e.metaKey);
                        } else if (e.key === "F2") setRenaming(el.id);
                      }}
                      className={`group mx-1 flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary-gold/60 ${
                        on ? "bg-primary-gold/20 text-primary-gold" : "text-primary-gold/80 hover:bg-primary-gold/[0.07]"
                      }`}
                      style={{ paddingLeft: 6 + depth * 14 }}
                    >
                      {depth > 0 && <span className="-ml-1 h-px w-2 shrink-0 bg-primary-gold/25" aria-hidden="true" />}
                      <span className={el.hidden ? "opacity-35" : ""}>
                        <LayerThumb el={el} />
                      </span>
                      {renaming === el.id ? (
                        <input
                          autoFocus
                          defaultValue={el.label ?? ""}
                          placeholder={KINDS[el.kind].label}
                          maxLength={60}
                          aria-label="Novo nome"
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (el.label ?? "")) onUpdate(el.id, { label: v || undefined });
                            setRenaming(null);
                          }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            else if (e.key === "Escape") {
                              (e.target as HTMLInputElement).value = el.label ?? "";
                              setRenaming(null);
                            }
                          }}
                          className="min-w-0 flex-1 rounded border border-primary-gold/50 bg-primary-black px-1 py-0.5 text-xs text-primary-gold outline-none"
                        />
                      ) : (
                        <span className={`flex min-w-0 flex-1 flex-col leading-tight ${el.hidden ? "opacity-45" : ""}`}>
                          <span className={`truncate font-semibold ${el.hidden ? "line-through decoration-primary-gold/40" : ""}`}>{name}</span>
                          {(groupBy !== "kind" || el.label) && <span className="truncate text-[9.5px] text-primary-gold/40">{KINDS[el.kind].label}</span>}
                        </span>
                      )}
                      {asking ? (
                        <span className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(null)}
                            className="rounded border border-primary-gold/25 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-gold/75"
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDel(null);
                              onDelete(el.id);
                            }}
                            className="rounded border border-invalid-color/50 bg-invalid-color/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-invalid-color"
                          >
                            Excluir
                          </button>
                        </span>
                      ) : (
                        renaming !== el.id && (
                          <span className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                            {/* Renomear e excluir aparecem ao passar o mouse (ou com o item escolhido) */}
                            <span className={`items-center ${on ? "flex" : "hidden group-hover:flex group-focus-within:flex [@media(hover:none)]:flex"}`}>
                              <IconBtn label={`Renomear ${name}`} onClick={() => setRenaming(el.id)}>
                                <LuPencil size={12} />
                              </IconBtn>
                              <IconBtn label={`Excluir ${name}`} danger onClick={() => setConfirmDel(el.id)}>
                                <LuTrash2 size={12} />
                              </IconBtn>
                            </span>
                            <IconBtn
                              label={el.locked ? `Destravar ${name}` : `Travar ${name}`}
                              active={!!el.locked}
                              persistent={!!el.locked}
                              onClick={() => onUpdate(el.id, { locked: el.locked ? undefined : true })}
                            >
                              {el.locked ? <LuLock size={12} /> : <LuLockOpen size={12} />}
                            </IconBtn>
                            <IconBtn
                              label={el.hidden ? `Mostrar ${name}` : `Esconder ${name}`}
                              active={!!el.hidden}
                              persistent={!!el.hidden}
                              onClick={() => onUpdate(el.id, { hidden: el.hidden ? undefined : true })}
                            >
                              {el.hidden ? <LuEyeOff size={12} /> : <LuEye size={12} />}
                            </IconBtn>
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {(hiddenCount > 0 || lockedCount > 0) && (
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-primary-gold/15 px-3 py-2 text-[11px] text-primary-gold/60">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => onUpdateMany(onLevel.filter((e) => e.hidden).map((e) => e.id), { hidden: undefined })}
              className="flex items-center gap-1 hover:text-primary-gold"
            >
              <LuEye size={12} /> Mostrar {hiddenCount === 1 ? "o escondido" : `os ${hiddenCount} escondidos`}
            </button>
          )}
          {lockedCount > 0 && (
            <button
              type="button"
              onClick={() => onUpdateMany(onLevel.filter((e) => e.locked).map((e) => e.id), { locked: undefined })}
              className="flex items-center gap-1 hover:text-primary-gold"
            >
              <LuLockOpen size={12} /> Destravar {lockedCount === 1 ? "o travado" : `os ${lockedCount} travados`}
            </button>
          )}
        </footer>
      )}
    </aside>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  active,
  persistent,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  /** Fica à mostra mesmo sem passar o mouse (escondido/travado). */
  persistent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
        active ? "text-primary-gold" : "text-primary-gold/35"
      } ${danger ? "hover:bg-invalid-color/15 hover:text-invalid-color" : "hover:bg-primary-gold/15 hover:text-primary-gold"} ${persistent ? "" : "group-hover:text-primary-gold/60"}`}
    >
      {children}
    </button>
  );
}
