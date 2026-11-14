"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuArrowRightLeft, LuFilter, LuPlus, LuSearch, LuSparkles, LuTriangleAlert, LuUndo2, LuX } from "react-icons/lu";
import {
  CATEGORY_COLORS,
  formatLocation,
  labelInfo,
  labelMatcher,
  outOfLabel,
  ruleSummary,
  sameLabel,
  searchGames,
  shelfSlots,
  suggestSlotLabel,
  type CatalogGame,
  type CategoryRule,
  type GameLocation,
  type ShelfCategory,
  type ShelfContent,
  type SlotLabel,
} from "@/floorplan/shelves";
import type { PlanElement } from "@/floorplan/types";
import { Btn, Section } from "./ui";
import { DRAG_MIME, type DragPayload } from "./shelfFront";
import LabelPicker from "./labelPicker";
import ColorPicker from "./colorPicker";
import RuleEditor, { playersFromName } from "./ruleEditor";

export interface ShelfActions {
  setLabel: (slotId: string, label: SlotLabel | undefined) => void;
  addGame: (slotId: string, game: { gameId?: string; name: string }) => void;
  removeGame: (slotId: string, key: string) => void;
  /** Move um jogo de um espaço (de qualquer armário) para outro. */
  moveGame: (from: { shelfId: string; slotId: string; key: string }, to: { shelfId: string; slotId: string }) => void;
  createCategory: (name: string, color: string, rule?: CategoryRule) => ShelfCategory;
  updateCategory: (c: ShelfCategory) => void;
  /** Exclui uma categoria sua (os espaços com ela ficam sem etiqueta). */
  deleteCategory: (id: string) => void;
}

export interface ShelfRef {
  el: PlanElement;
  name: string;
  room: string;
}

/** Cria uma categoria do gerente: nome, cor e, se quiser, um filtro dos jogos que combinam. */
export function CategoryForm({
  onCreate,
  onCancel,
  initialName = "",
  catalog = [],
  types = [],
  editing,
}: {
  onCreate: (name: string, color: string, rule?: CategoryRule) => void;
  onCancel?: () => void;
  initialName?: string;
  catalog?: CatalogGame[];
  types?: { name: string; count: number }[];
  /** Editar uma categoria que já existe (o botão vira "Salvar"). */
  editing?: ShelfCategory;
}) {
  const [name, setName] = useState(editing?.name ?? initialName);
  const [color, setColor] = useState(editing?.color ?? CATEGORY_COLORS[1]);
  const [rule, setRule] = useState<CategoryRule | undefined>(() => {
    if (editing) return editing.rule;
    const n = playersFromName(initialName);
    return n ? { players: n } : undefined;
  });
  const [showRule, setShowRule] = useState(() => (editing ? !!editing.rule : !!playersFromName(initialName)));
  const guess = playersFromName(name);
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-primary-gold/20 bg-primary-black/50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onCreate(name.trim(), color, rule);
          setName("");
          setRule(undefined);
        }
      }}
    >
      <input
        value={name}
        maxLength={40}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da categoria (ex.: Para crianças)"
        className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-sm text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/60"
      />
      <ColorPicker value={color} onChange={setColor} size={22} />
      {showRule ? (
        <RuleEditor rule={rule} onChange={setRule} catalog={catalog} types={types} />
      ) : (
        <button
          type="button"
          onClick={() => {
            setShowRule(true);
            if (guess && !rule) setRule({ players: guess });
          }}
          className="flex items-center gap-1.5 self-start text-[11px] text-primary-gold/65 underline-offset-2 hover:text-primary-gold hover:underline"
        >
          <LuFilter size={12} />
          {guess ? `Filtrar: jogos que dá para jogar com ${guess}` : "Adicionar filtro (jogadores, duração, categorias…)"}
        </button>
      )}
      <div className="flex justify-end gap-1.5">
        {onCancel && (
          <Btn tone="ghost" onClick={onCancel}>
            Cancelar
          </Btn>
        )}
        <Btn tone="primary" type="submit" disabled={!name.trim()}>
          {editing ? "Salvar" : "Criar"}
        </Btn>
      </div>
    </form>
  );
}

/** Filtro da sua categoria escolhida no espaço: resumo, e editar na hora. */
function RuleBar({
  category,
  catalog,
  types,
  onSave,
}: {
  category: ShelfCategory;
  catalog: CatalogGame[];
  types: { name: string; count: number }[];
  onSave: (c: ShelfCategory) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CategoryRule | undefined>(category.rule);
  const summary = ruleSummary(category.rule);
  if (editing)
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-primary-gold/60">
          Filtro de <strong className="text-primary-gold/85">{category.name}</strong>: ajuda a achar os jogos e avisa quem não combina.
        </span>
        <RuleEditor rule={draft} onChange={setDraft} catalog={catalog} types={types} />
        <span className="flex justify-end gap-1.5">
          <Btn
            tone="ghost"
            onClick={() => {
              setDraft(category.rule);
              setEditing(false);
            }}
          >
            Cancelar
          </Btn>
          <Btn
            tone="primary"
            onClick={() => {
              const { rule: _old, ...rest } = category;
              void _old;
              onSave(draft ? { ...rest, rule: draft } : rest);
              setEditing(false);
            }}
          >
            Salvar filtro
          </Btn>
        </span>
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => {
        const n = playersFromName(category.name);
        setDraft(category.rule ?? (n ? { players: n } : undefined));
        setEditing(true);
      }}
      className="flex items-start gap-1.5 self-start text-left text-[11px] text-primary-gold/60 underline-offset-2 hover:text-primary-gold hover:underline"
    >
      <LuFilter size={12} className="mt-px shrink-0" />
      {summary ? (
        <span>
          Filtro: <strong className="font-semibold text-primary-gold/85">{summary}</strong> (editar)
        </span>
      ) : (
        <span>Adicionar filtro a {category.name} (jogadores, duração, categorias…)</span>
      )}
    </button>
  );
}

function Cover({ g, size = "md" }: { g?: CatalogGame; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-8 w-6" : "h-9 w-7";
  return g?.image ? (
    <img src={g.image} alt="" className={`${cls} shrink-0 rounded-[3px] object-cover`} loading="lazy" draggable={false} />
  ) : (
    <span className={`${cls} flex shrink-0 items-center justify-center rounded-[3px] bg-[#3a2a1e] text-[9px] font-bold text-primary-gold/60`}>?</span>
  );
}

export default function ShelfPanel({
  shelf,
  content,
  catalog,
  catalogById,
  types,
  customs,
  located,
  unplaced,
  shelves,
  contents,
  selectedSlot,
  setSelectedSlot,
  selectedGame,
  setSelectedGame,
  loadingCatalog,
  undo,
  actions,
  onClose,
}: {
  shelf: ShelfRef;
  content?: ShelfContent;
  catalog: CatalogGame[];
  catalogById: Map<string, CatalogGame>;
  /** Categorias da Coleção (com quantos jogos cada). */
  types: { name: string; count: number }[];
  customs: ShelfCategory[];
  located: Map<string, GameLocation[]>;
  /** Jogos da Coleção que ainda não têm lugar (para guardar com um toque). */
  unplaced: CatalogGame[];
  shelves: ShelfRef[];
  contents: Map<string, ShelfContent>;
  selectedSlot: string | null;
  setSelectedSlot: (id: string | null) => void;
  selectedGame: string | null;
  setSelectedGame: (key: string | null) => void;
  loadingCatalog: boolean;
  undo?: { text: string; run: () => void } | null;
  actions: ShelfActions;
  onClose: () => void;
}) {
  const slots = shelfSlots(shelf.el);
  const slotDef = slots.find((s) => s.id === selectedSlot) ?? null;
  const slot = selectedSlot ? content?.slots[selectedSlot] : undefined;
  const [q, setQ] = useState("");
  /** Formulário de categoria nova: aberto (com o nome já digitado na busca, se houver). */
  const [creating, setCreating] = useState<string | boolean>(false);
  /** Categoria sua sendo editada (nome, cor e filtro). */
  const [editingCat, setEditingCat] = useState<ShelfCategory | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const matcher = useMemo(() => labelMatcher(slot?.label, customs), [slot?.label, customs]);
  const results = useMemo(() => {
    if (!q.trim()) return [];
    const found = searchGames(catalog, q, 40);
    // Com filtro na etiqueta, os que combinam vêm primeiro
    const sorted = matcher ? [...found.filter(matcher), ...found.filter((g) => !matcher(g))] : found;
    return sorted.slice(0, 12);
  }, [catalog, q, matcher]);
  const suggestion = suggestSlotLabel(slot, catalogById);
  const wrong = outOfLabel(slot, catalogById, customs);
  const customCat = slot?.label?.kind === "custom" ? customs.find((c) => c.id === (slot.label as { id: string }).id) : undefined;
  const wrongKeys = new Set(wrong.map((g) => g.key));
  const info = labelInfo(slot?.label, customs);

  // Ao escolher um espaço no computador, já deixa a busca pronta para digitar
  useEffect(() => {
    setQ("");
    setMoving(null);
    if (selectedSlot && typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches) searchRef.current?.focus();
  }, [selectedSlot]);

  // Sem lugar: com etiqueta (categoria ou filtro), só os que combinam; se nenhum combina, todos
  const matched = useMemo(() => (matcher ? unplaced.filter(matcher) : null), [unplaced, matcher]);
  const quick = (matched && matched.length ? matched : unplaced).slice(0, 12);

  const targets = shelves.flatMap((s) =>
    shelfSlots(s.el).map((sl) => ({ shelfId: s.el.id, slotId: sl.id, label: s.el.id === shelf.el.id ? sl.label : `${s.name} · ${sl.label}`, here: s.el.id === shelf.el.id })),
  );

  const place = (g: CatalogGame) => {
    if (!slotDef) return;
    const where = located.get(g.id) ?? [];
    if (where.some((l) => l.shelfId === shelf.el.id && l.slotId === slotDef.id)) return;
    if (where.length === 1) {
      const key = contents.get(where[0].shelfId)?.slots[where[0].slotId]?.games.find((x) => x.gameId === g.id)?.key;
      if (key) {
        actions.moveGame({ shelfId: where[0].shelfId, slotId: where[0].slotId, key }, { shelfId: shelf.el.id, slotId: slotDef.id });
        return;
      }
    }
    actions.addGame(slotDef.id, { gameId: g.id, name: g.name });
  };

  return (
    <div className="flex flex-col gap-3">
      <Section
        title={shelf.name}
        aside={
          <Btn tone="ghost" onClick={onClose} title="Fechar o armário">
            <LuX size={15} />
          </Btn>
        }
      >
        <p className="-mt-1 text-[11px] text-primary-gold/55">{shelf.room}</p>
        <div className="grid grid-cols-2 gap-1">
          {slots.map((s) => {
            const sl = content?.slots[s.id];
            const li = labelInfo(sl?.label, customs);
            const on = selectedSlot === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSlot(s.id)}
                className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors ${
                  on ? "border-primary-gold bg-primary-gold/15 text-primary-gold" : "border-primary-gold/10 text-primary-gold/75 hover:border-primary-gold/40"
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: li?.color ?? "rgba(230,197,107,0.2)" }} />
                <span className="min-w-0 flex-1 truncate font-semibold">{s.label}</span>
                <span className="shrink-0 text-primary-gold/50">{sl?.games.length ?? 0}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {undo && (
        <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-primary-gold/25 bg-primary-black/80 px-3 py-2 text-xs text-primary-gold/80">
          <span className="min-w-0 truncate">{undo.text}</span>
          <button type="button" onClick={undo.run} className="flex shrink-0 items-center gap-1 font-bold text-primary-gold hover:underline">
            <LuUndo2 size={13} /> Desfazer
          </button>
        </div>
      )}

      {!slotDef ? (
        <p className="rounded-xl border border-dashed border-primary-gold/20 px-3 py-4 text-center text-xs text-primary-gold/55">
          Toque num espaço do armário (no desenho ou acima) para guardar jogos e escolher a etiqueta.
        </p>
      ) : (
        <Section title={slotDef.label} aside={<span className="text-[11px] text-primary-gold/50">{slot?.games.length ?? 0} jogos</span>}>
          {/* Etiqueta */}
          <div className="flex flex-col gap-1.5">
            <LabelPicker
              key={slotDef.id}
              value={slot?.label}
              customs={customs}
              types={types}
              suggestion={suggestion}
              onChange={(label) => actions.setLabel(slotDef.id, label)}
              onCreate={(name) => {
                setEditingCat(null);
                setCreating(name || true);
              }}
              onEdit={(c) => {
                setCreating(false);
                setEditingCat(c);
              }}
              onDelete={(c) => {
                if (editingCat?.id === c.id) setEditingCat(null);
                actions.deleteCategory(c.id);
              }}
            />
            {editingCat && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Editar {editingCat.name}</span>
                <CategoryForm
                  key={editingCat.id}
                  editing={editingCat}
                  catalog={catalog}
                  types={types}
                  onCancel={() => setEditingCat(null)}
                  onCreate={(name, color, rule) => {
                    const { rule: _old, ...rest } = editingCat;
                    void _old;
                    actions.updateCategory(rule ? { ...rest, name, color, rule } : { ...rest, name, color });
                    setEditingCat(null);
                  }}
                />
              </div>
            )}
            {customCat && !editingCat && <RuleBar key={customCat.id} category={customCat} catalog={catalog} types={types} onSave={actions.updateCategory} />}
            {creating !== false && (
              <CategoryForm
                initialName={typeof creating === "string" ? creating : ""}
                catalog={catalog}
                types={types}
                onCancel={() => setCreating(false)}
                onCreate={(name, color, rule) => {
                  const c = actions.createCategory(name, color, rule);
                  actions.setLabel(slotDef.id, { kind: "custom", id: c.id });
                  setCreating(false);
                }}
              />
            )}
            {suggestion && !sameLabel(slot?.label, { kind: "type", name: suggestion }) && (
              <button
                type="button"
                onClick={() => actions.setLabel(slotDef.id, { kind: "type", name: suggestion })}
                className="flex items-center gap-1.5 self-start text-[11px] text-primary-gold/60 underline-offset-2 hover:text-primary-gold hover:underline"
              >
                <LuSparkles size={12} /> A maioria aqui é {suggestion}: usar como etiqueta
              </button>
            )}
            {wrong.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWrong(!showWrong)}
                className="flex items-center gap-1.5 self-start text-[11px] text-amber-200/85 hover:text-amber-100"
              >
                <LuTriangleAlert size={12} className="shrink-0 text-amber-300" />
                {customCat
                  ? `${wrong.length} ${wrong.length === 1 ? "jogo não combina" : "jogos não combinam"} com o filtro de ${info?.text}`
                  : `${wrong.length} ${wrong.length === 1 ? "jogo não é" : "jogos não são"} da categoria ${info?.text}`}
                {showWrong ? "" : " (ver)"}
              </button>
            )}
            {showWrong && wrong.length > 0 && <p className="text-[11px] leading-snug text-amber-100/70">{wrong.map((g) => g.name).join(", ")}.</p>}
          </div>

          {/* Guardar: busca no alto, Enter guarda o primeiro */}
          <div className="flex flex-col gap-1.5 border-t border-primary-gold/10 pt-2.5">
            <form
              className="relative flex items-center"
              onSubmit={(e) => {
                e.preventDefault();
                if (results[0]) {
                  place(results[0]);
                  setQ("");
                } else if (q.trim()) {
                  actions.addGame(slotDef.id, { name: q.trim() });
                  setQ("");
                }
              }}
            >
              <LuSearch size={14} className="pointer-events-none absolute left-2.5 text-primary-gold/40" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={loadingCatalog ? "Carregando a Coleção…" : "Guardar aqui: digite o nome e Enter"}
                aria-label="Buscar jogo para guardar aqui"
                enterKeyHint="done"
                className="w-full rounded-lg border border-primary-gold/30 bg-primary-black/70 py-2 pl-8 pr-2 text-sm text-primary-gold outline-none placeholder:text-primary-gold/35 focus:border-primary-gold/70"
              />
            </form>
            {q.trim() ? (
              <ul className="flex flex-col gap-1">
                {results.map((g, i) => {
                  const where = located.get(g.id) ?? [];
                  const already = where.some((l) => l.shelfId === shelf.el.id && l.slotId === slotDef.id);
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        disabled={already}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ gameId: g.id } satisfies DragPayload));
                          e.dataTransfer.effectAllowed = "copyMove";
                        }}
                        onClick={() => {
                          place(g);
                          setQ("");
                          searchRef.current?.focus();
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs transition-colors disabled:opacity-60 ${
                          i === 0 ? "border-primary-gold/40 bg-primary-gold/[0.06]" : "border-primary-gold/10 bg-primary-black/40"
                        } hover:border-primary-gold/60`}
                      >
                        <Cover g={g} size="sm" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex min-w-0 items-center gap-1">
                            <span className="truncate font-semibold text-primary-gold/90">{g.name}</span>
                            {matcher?.(g) && (
                              <span className="shrink-0 rounded-sm px-1 text-[9px] font-bold uppercase tracking-wide text-[#14110e]" style={{ background: info?.color }}>
                                combina
                              </span>
                            )}
                          </span>
                          <span className="truncate text-[10px] text-primary-gold/45">
                            {already ? "Já está aqui" : where.length ? `Vai sair de: ${where.map(formatLocation).join(" e ")}` : "Sem lugar ainda"}
                          </span>
                        </span>
                        {!already && <LuPlus size={14} className="shrink-0 text-primary-gold/70" />}
                      </button>
                    </li>
                  );
                })}
                {!results.some((g) => g.name.toLowerCase() === q.trim().toLowerCase()) && (
                  <li>
                    <Btn
                      tone="ghost"
                      onClick={() => {
                        actions.addGame(slotDef.id, { name: q.trim() });
                        setQ("");
                      }}
                      className="w-full"
                    >
                      <LuPlus size={13} /> Guardar &quot;{q.trim()}&quot; como jogo avulso
                    </Btn>
                  </li>
                )}
              </ul>
            ) : (
              quick.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/45">
                    {matched && matched.length
                      ? `Sem lugar que combinam com ${info?.text} (${matched.length}): toque para guardar`
                      : matched
                        ? `Nenhum jogo sem lugar combina com ${info?.text}. Todos sem lugar:`
                        : "Sem lugar: toque para guardar"}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {quick.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => place(g)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ gameId: g.id } satisfies DragPayload));
                          e.dataTransfer.effectAllowed = "copyMove";
                        }}
                        title={`Guardar ${g.name} aqui`}
                        className="flex max-w-full items-center gap-1 rounded-full border border-primary-gold/20 bg-primary-black/50 py-0.5 pl-0.5 pr-2 text-[11px] text-primary-gold/80 transition-colors hover:border-primary-gold/60 hover:text-primary-gold"
                      >
                        {g.image ? (
                          <img src={g.image} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" loading="lazy" draggable={false} />
                        ) : (
                          <span className="h-5 w-5 shrink-0 rounded-full bg-[#3a2a1e]" />
                        )}
                        <span className="truncate">{g.name}</span>
                        <LuPlus size={11} className="shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Jogos do espaço: tirar e mover sempre à mão */}
          <ul className="flex flex-col gap-1 border-t border-primary-gold/10 pt-2.5">
            {(slot?.games ?? []).map((g) => {
              const cat = g.gameId ? catalogById.get(g.gameId) : undefined;
              const sel = selectedGame === g.key;
              return (
                <li
                  key={g.key}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ key: g.key, from: slotDef.id } satisfies DragPayload));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={`flex flex-col gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${sel ? "border-primary-gold/60 bg-primary-gold/[0.07]" : "border-primary-gold/10 bg-primary-black/40"}`}
                >
                  <span className="flex items-center gap-2">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setSelectedGame(sel ? null : g.key)}>
                      <Cover g={cat} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1 break-words font-semibold text-primary-gold/90">
                          {wrongKeys.has(g.key) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" title="Fora da categoria" />}
                          {g.name}
                        </span>
                        <span className="truncate text-[10px] text-primary-gold/45">{cat ? cat.types.join(", ") || "Sem categoria" : "Jogo avulso (fora da Coleção)"}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoving(moving === g.key ? null : g.key)}
                      title="Mover para outro espaço"
                      aria-label={`Mover ${g.name}`}
                      aria-expanded={moving === g.key}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                        moving === g.key ? "border-primary-gold bg-primary-gold/15 text-primary-gold" : "border-primary-gold/15 text-primary-gold/60 hover:text-primary-gold"
                      }`}
                    >
                      <LuArrowRightLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => actions.removeGame(slotDef.id, g.key)}
                      title="Tirar deste espaço"
                      aria-label={`Tirar ${g.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-invalid-color/30 text-invalid-color/80 transition-colors hover:border-invalid-color/70 hover:text-invalid-color"
                    >
                      <LuX size={15} />
                    </button>
                  </span>
                  {moving === g.key && (
                    <span className="flex flex-wrap gap-1">
                      {targets
                        .filter((t) => !(t.here && t.slotId === slotDef.id))
                        .sort((a, b) => Number(b.here) - Number(a.here))
                        .map((t) => (
                          <button
                            key={`${t.shelfId}|${t.slotId}`}
                            type="button"
                            onClick={() => {
                              actions.moveGame({ shelfId: shelf.el.id, slotId: slotDef.id, key: g.key }, { shelfId: t.shelfId, slotId: t.slotId });
                              setMoving(null);
                              setSelectedGame(null);
                            }}
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors hover:border-primary-gold/60 hover:text-primary-gold ${
                              t.here ? "border-primary-gold/30 text-primary-gold/80" : "border-primary-gold/15 text-primary-gold/55"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                    </span>
                  )}
                </li>
              );
            })}
            {(slot?.games.length ?? 0) === 0 && <li className="text-xs text-primary-gold/50">Nenhum jogo aqui ainda.</li>}
          </ul>
        </Section>
      )}
    </div>
  );
}
