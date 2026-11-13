"use client";

import React, { useMemo, useState } from "react";
import { LuPlus, LuSearch, LuSparkles, LuTag, LuTrash2, LuTriangleAlert, LuX } from "react-icons/lu";
import {
  CATEGORY_COLORS,
  formatLocation,
  labelInfo,
  outOfLabel,
  sameLabel,
  searchGames,
  shelfSlots,
  suggestSlotLabel,
  type CatalogGame,
  type GameLocation,
  type ShelfCategory,
  type ShelfContent,
  type SlotLabel,
} from "@/floorplan/shelves";
import type { PlanElement } from "@/floorplan/types";
import { Btn, Section } from "./ui";
import { DRAG_MIME, type DragPayload } from "./shelfFront";

export interface ShelfActions {
  setLabel: (slotId: string, label: SlotLabel | undefined) => void;
  addGame: (slotId: string, game: { gameId?: string; name: string }) => void;
  removeGame: (slotId: string, key: string) => void;
  /** Move um jogo de um espaço (de qualquer armário) para outro. */
  moveGame: (from: { shelfId: string; slotId: string; key: string }, to: { shelfId: string; slotId: string }) => void;
  createCategory: (name: string, color: string) => ShelfCategory;
}

export interface ShelfRef {
  el: PlanElement;
  name: string;
  room: string;
}

/** Cria uma categoria do gerente: nome e cor. */
export function CategoryForm({ onCreate, onCancel }: { onCreate: (name: string, color: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[1]);
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-primary-gold/20 bg-primary-black/50 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) {
          onCreate(name.trim(), color);
          setName("");
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
      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Cor">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`Cor ${c}`}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#14110e]" : ""}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-1.5">
        {onCancel && (
          <Btn tone="ghost" onClick={onCancel}>
            Cancelar
          </Btn>
        )}
        <Btn tone="primary" type="submit" disabled={!name.trim()}>
          Criar
        </Btn>
      </div>
    </form>
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
  shelves,
  contents,
  selectedSlot,
  setSelectedSlot,
  selectedGame,
  setSelectedGame,
  loadingCatalog,
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
  shelves: ShelfRef[];
  contents: Map<string, ShelfContent>;
  selectedSlot: string | null;
  setSelectedSlot: (id: string | null) => void;
  selectedGame: string | null;
  setSelectedGame: (key: string | null) => void;
  loadingCatalog: boolean;
  actions: ShelfActions;
  onClose: () => void;
}) {
  const slots = shelfSlots(shelf.el);
  const slotDef = slots.find((s) => s.id === selectedSlot) ?? null;
  const slot = selectedSlot ? content?.slots[selectedSlot] : undefined;
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const results = useMemo(() => (q.trim() ? searchGames(catalog, q, 12) : []), [catalog, q]);
  const suggestion = suggestSlotLabel(slot, catalogById);
  const wrong = outOfLabel(slot, catalogById);
  const info = labelInfo(slot?.label, customs);

  const labelValue = !slot?.label ? "" : slot.label.kind === "type" ? `type:${slot.label.name}` : `custom:${slot.label.id}`;
  const otherTargets = shelves.flatMap((s) =>
    shelfSlots(s.el).map((sl) => ({ shelfId: s.el.id, slotId: sl.id, label: `${s.name} · ${sl.label}`, here: s.el.id === shelf.el.id })),
  );

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
        <ul className="flex flex-col divide-y divide-primary-gold/10">
          {slots.map((s) => {
            const sl = content?.slots[s.id];
            const li = labelInfo(sl?.label, customs);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedSlot(s.id)}
                  className={`flex w-full items-center gap-2 py-1.5 text-left text-xs transition-colors ${selectedSlot === s.id ? "text-primary-gold" : "text-primary-gold/75 hover:text-primary-gold"}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${selectedSlot === s.id ? "bg-primary-gold" : "bg-primary-gold/20"}`} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{s.label}</span>
                  {li && (
                    <span className="max-w-[45%] truncate rounded-full px-1.5 py-px text-[10px] font-bold text-[#14110e]" style={{ background: li.color }}>
                      {li.text}
                    </span>
                  )}
                  <span className="w-6 shrink-0 text-right text-[11px] text-primary-gold/50">{sl?.games.length ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      {!slotDef ? (
        <p className="rounded-xl border border-dashed border-primary-gold/20 px-3 py-4 text-center text-xs text-primary-gold/55">
          Toque num espaço do armário (ou na lista acima) para guardar jogos e escolher a etiqueta.
        </p>
      ) : (
        <Section title={slotDef.label} aside={<span className="text-[11px] text-primary-gold/50">{slot?.games.length ?? 0} jogos</span>}>
          {/* Etiqueta */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">
              <LuTag size={11} /> Etiqueta
            </span>
            <div className="flex items-center gap-1.5">
              {info && <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: info.color }} />}
              <select
                value={labelValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__new") {
                    setCreating(true);
                    return;
                  }
                  if (!v) actions.setLabel(slotDef.id, undefined);
                  else if (v.startsWith("type:")) actions.setLabel(slotDef.id, { kind: "type", name: v.slice(5) });
                  else actions.setLabel(slotDef.id, { kind: "custom", id: v.slice(7) });
                }}
                className="w-full min-w-0 rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-sm text-primary-gold outline-none focus:border-primary-gold/60"
                aria-label="Etiqueta do espaço"
              >
                <option value="" className="bg-primary-black">
                  Sem etiqueta
                </option>
                {customs.length > 0 && (
                  <optgroup label="Suas categorias">
                    {customs.map((c) => (
                      <option key={c.id} value={`custom:${c.id}`} className="bg-primary-black">
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Categorias da Coleção">
                  {types.map((t) => (
                    <option key={t.name} value={`type:${t.name}`} className="bg-primary-black">
                      {t.name} ({t.count})
                    </option>
                  ))}
                </optgroup>
                <option value="__new" className="bg-primary-black">
                  + Criar uma categoria nova…
                </option>
              </select>
            </div>
            {creating && (
              <CategoryForm
                onCancel={() => setCreating(false)}
                onCreate={(name, color) => {
                  const c = actions.createCategory(name, color);
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
              <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-200/85">
                <LuTriangleAlert size={12} className="mt-0.5 shrink-0 text-amber-300" />
                Fora da categoria: {wrong.map((g) => g.name).join(", ")}.
              </p>
            )}
          </div>

          {/* Jogos do espaço */}
          <ul className="flex flex-col gap-1">
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
                  <button type="button" className="flex items-center gap-2 text-left" onClick={() => setSelectedGame(sel ? null : g.key)}>
                    {cat?.image ? (
                      <img src={cat.image} alt="" className="h-9 w-7 shrink-0 rounded-[3px] object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded-[3px] bg-[#3a2a1e] text-[9px] font-bold text-primary-gold/70">?</span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="break-words font-semibold text-primary-gold/90">{g.name}</span>
                      <span className="truncate text-[10px] text-primary-gold/45">{cat ? cat.types.join(", ") || "Sem categoria" : "Jogo avulso (fora da Coleção)"}</span>
                    </span>
                  </button>
                  {sel && (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <select
                        value=""
                        onChange={(e) => {
                          const t = otherTargets.find((x) => `${x.shelfId}|${x.slotId}` === e.target.value);
                          if (t) {
                            actions.moveGame({ shelfId: shelf.el.id, slotId: slotDef.id, key: g.key }, { shelfId: t.shelfId, slotId: t.slotId });
                            setSelectedGame(null);
                          }
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1 text-[11px] text-primary-gold outline-none focus:border-primary-gold/60"
                        aria-label="Mover para"
                      >
                        <option value="">Mover para…</option>
                        <optgroup label="Neste armário">
                          {otherTargets
                            .filter((t) => t.here && t.slotId !== slotDef.id)
                            .map((t) => (
                              <option key={`${t.shelfId}|${t.slotId}`} value={`${t.shelfId}|${t.slotId}`} className="bg-primary-black">
                                {t.label.split(" · ").slice(1).join(" · ")}
                              </option>
                            ))}
                        </optgroup>
                        {shelves.length > 1 && (
                          <optgroup label="Outros armários">
                            {otherTargets
                              .filter((t) => !t.here)
                              .map((t) => (
                                <option key={`${t.shelfId}|${t.slotId}`} value={`${t.shelfId}|${t.slotId}`} className="bg-primary-black">
                                  {t.label}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      <Btn tone="danger" onClick={() => actions.removeGame(slotDef.id, g.key)} title="Tirar deste espaço">
                        <LuTrash2 size={13} />
                      </Btn>
                    </span>
                  )}
                </li>
              );
            })}
            {(slot?.games.length ?? 0) === 0 && <li className="text-xs text-primary-gold/50">Nenhum jogo aqui ainda.</li>}
          </ul>

          {/* Guardar um jogo */}
          <div className="flex flex-col gap-1.5 border-t border-primary-gold/10 pt-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Guardar um jogo aqui</span>
            <label className="relative flex items-center">
              <LuSearch size={14} className="pointer-events-none absolute left-2.5 text-primary-gold/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={loadingCatalog ? "Carregando a Coleção…" : "Buscar na Coleção"}
                aria-label="Buscar jogo na Coleção"
                className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 py-1.5 pl-8 pr-2 text-sm text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/60"
              />
            </label>
            {q.trim() && (
              <ul className="flex flex-col gap-1">
                {results.map((g) => {
                  const where = located.get(g.id) ?? [];
                  const already = where.some((l) => l.shelfId === shelf.el.id && l.slotId === slotDef.id);
                  return (
                    <li
                      key={g.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ gameId: g.id } satisfies DragPayload));
                        e.dataTransfer.effectAllowed = "copyMove";
                      }}
                      className="flex items-center gap-2 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1 text-xs"
                    >
                      {g.image ? (
                        <img src={g.image} alt="" className="h-8 w-6 shrink-0 rounded-[3px] object-cover" loading="lazy" />
                      ) : (
                        <span className="h-8 w-6 shrink-0 rounded-[3px] bg-[#3a2a1e]" />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold text-primary-gold/90">{g.name}</span>
                        <span className="truncate text-[10px] text-primary-gold/45">{where.length ? `Hoje em: ${where.map(formatLocation).join(" e ")}` : "Ainda sem lugar"}</span>
                      </span>
                      {already ? (
                        <span className="shrink-0 text-[10px] font-semibold text-emerald-300">Já está aqui</span>
                      ) : where.length === 1 ? (
                        <Btn
                          onClick={() => {
                            const from = where[0];
                            const key = contents.get(from.shelfId)?.slots[from.slotId]?.games.find((x) => x.gameId === g.id)?.key;
                            if (key) actions.moveGame({ shelfId: from.shelfId, slotId: from.slotId, key }, { shelfId: shelf.el.id, slotId: slotDef.id });
                          }}
                          title="Tirar de onde está e guardar aqui"
                        >
                          Mover para cá
                        </Btn>
                      ) : (
                        <Btn onClick={() => actions.addGame(slotDef.id, { gameId: g.id, name: g.name })} title="Guardar aqui">
                          <LuPlus size={13} /> Guardar
                        </Btn>
                      )}
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
            )}
            <span className="text-[11px] text-primary-gold/40">No computador, dá para arrastar o jogo da lista direto para o espaço no desenho.</span>
          </div>
        </Section>
      )}
    </div>
  );
}
