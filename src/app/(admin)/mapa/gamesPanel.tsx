"use client";

import React, { useMemo, useState } from "react";
import { LuChevronDown, LuMapPin, LuPencil, LuPlus, LuSearch, LuTrash2, LuTriangleAlert } from "react-icons/lu";
import {
  CATEGORY_COLORS,
  formatLocation,
  searchGames,
  shelfColors,
  shelfCount,
  typeColor,
  type CatalogGame,
  type GameLocation,
  type ShelfCategory,
  type ShelfContent,
  type SlotLabel,
} from "@/floorplan/shelves";
import { Btn, Section } from "./ui";
import { CategoryForm, type ShelfRef } from "./shelfPanel";

export default function GamesPanel({
  shelves,
  contents,
  catalog,
  located,
  unplaced,
  types,
  customs,
  filter,
  setFilter,
  loadingCatalog,
  onOpen,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: {
  shelves: ShelfRef[];
  contents: Map<string, ShelfContent>;
  catalog: CatalogGame[];
  located: Map<string, GameLocation[]>;
  unplaced: CatalogGame[];
  types: { name: string; count: number }[];
  customs: ShelfCategory[];
  filter: SlotLabel | null;
  setFilter: (f: SlotLabel | null) => void;
  loadingCatalog: boolean;
  /** Abre o armário (e, se vier, o espaço e o jogo em destaque). */
  onOpen: (shelfId: string, slotId?: string, gameId?: string) => void;
  onCreateCategory: (name: string, color: string) => void;
  onUpdateCategory: (c: ShelfCategory) => void;
  onDeleteCategory: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [showUnplaced, setShowUnplaced] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const results = useMemo(() => (q.trim() ? searchGames(catalog, q, 8) : []), [catalog, q]);
  const avulsos = useMemo(() => {
    if (!q.trim()) return [];
    const words = q.trim().toLowerCase();
    return [...located.entries()].filter(([k]) => k.startsWith("nome:") && k.slice(5).includes(words)).slice(0, 5);
  }, [located, q]);
  const placedCount = catalog.length - unplaced.length;
  const duplicates = useMemo(
    () => catalog.filter((g) => (located.get(g.id)?.length ?? 0) > 1).map((g) => ({ g, where: located.get(g.id)! })),
    [catalog, located],
  );
  const isFilter = (l: SlotLabel) => !!filter && filter.kind === l.kind && (l.kind === "type" ? l.name === (filter as { name: string }).name : l.id === (filter as { id: string }).id);

  return (
    <div className="flex flex-col gap-3">
      <Section title="Onde está?">
        <label className="relative flex items-center">
          <LuSearch size={14} className="pointer-events-none absolute left-2.5 text-primary-gold/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={loadingCatalog ? "Carregando a Coleção…" : "Nome do jogo (ex.: Catan)"}
            aria-label="Procurar jogo"
            className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 py-1.5 pl-8 pr-2 text-sm text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/60"
          />
        </label>
        {q.trim() && (
          <ul className="flex flex-col gap-1">
            {results.map((g) => {
              const where = located.get(g.id) ?? [];
              return (
                <li key={g.id} className="flex items-start gap-2 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-xs">
                  {g.image ? (
                    <img src={g.image} alt="" className="h-10 w-7 shrink-0 rounded-[3px] object-cover" loading="lazy" />
                  ) : (
                    <span className="h-10 w-7 shrink-0 rounded-[3px] bg-[#3a2a1e]" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold text-primary-gold/90">{g.name}</span>
                    {where.length ? (
                      where.map((l) => (
                        <button
                          key={`${l.shelfId}${l.slotId}`}
                          type="button"
                          onClick={() => onOpen(l.shelfId, l.slotId, g.id)}
                          className="flex items-center gap-1 text-left text-[11px] font-semibold text-emerald-300 underline-offset-2 hover:underline"
                        >
                          <LuMapPin size={11} className="shrink-0" /> {formatLocation(l)}
                        </button>
                      ))
                    ) : (
                      <span className="text-[11px] text-amber-200/80">Sem lugar ainda</span>
                    )}
                  </span>
                </li>
              );
            })}
            {avulsos.map(([k, where]) => (
              <li key={k} className="rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-xs">
                <span className="font-semibold text-primary-gold/90">{k.slice(5)}</span> <span className="text-primary-gold/45">(avulso)</span>
                {where.map((l) => (
                  <button key={`${l.shelfId}${l.slotId}`} type="button" onClick={() => onOpen(l.shelfId, l.slotId)} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:underline">
                    <LuMapPin size={11} /> {formatLocation(l)}
                  </button>
                ))}
              </li>
            ))}
            {!results.length && !avulsos.length && <li className="text-xs text-primary-gold/50">Nenhum jogo com esse nome.</li>}
          </ul>
        )}
        <p className="text-[11px] text-primary-gold/55">
          <strong className="text-primary-gold">{placedCount}</strong> de {catalog.length} jogos da Coleção guardados em {shelves.length}{" "}
          {shelves.length === 1 ? "armário" : "armários"}.
        </p>
      </Section>

      <Section title="Categorias">
        <span className="-mt-1 text-[11px] text-primary-gold/50">Toque numa categoria para acender, no mapa, os armários que têm ela.</span>
        <div className="flex flex-wrap gap-1">
          {customs.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={isFilter({ kind: "custom", id: c.id })}
              onClick={() => setFilter(isFilter({ kind: "custom", id: c.id }) ? null : { kind: "custom", id: c.id })}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                isFilter({ kind: "custom", id: c.id }) ? "border-white text-white" : "border-primary-gold/20 text-primary-gold/75 hover:text-primary-gold"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} /> {c.name}
            </button>
          ))}
          {types.map((t) => (
            <button
              key={t.name}
              type="button"
              aria-pressed={isFilter({ kind: "type", name: t.name })}
              onClick={() => setFilter(isFilter({ kind: "type", name: t.name }) ? null : { kind: "type", name: t.name })}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                isFilter({ kind: "type", name: t.name }) ? "border-white text-white" : "border-primary-gold/15 text-primary-gold/60 hover:text-primary-gold"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: typeColor(t.name) }} /> {t.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-primary-gold/10 pt-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Suas categorias</span>
          <span className="text-[11px] leading-snug text-primary-gold/45">
            Criadas por você para uma prateleira ou gaveta (ex.: &quot;Para crianças&quot;, &quot;Mais pedidos&quot;). Aparecem antes das categorias da
            Coleção na hora de escolher a etiqueta.
          </span>
          <ul className="flex flex-col gap-1">
            {customs.map((c) => (
              <li key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-primary-gold/85">{c.name}</span>
                  {confirmDel === c.id ? (
                    <>
                      <Btn tone="ghost" onClick={() => setConfirmDel(null)}>
                        Não
                      </Btn>
                      <Btn
                        tone="danger"
                        onClick={() => {
                          setConfirmDel(null);
                          onDeleteCategory(c.id);
                        }}
                      >
                        Excluir
                      </Btn>
                    </>
                  ) : (
                    <>
                      <Btn tone="ghost" title="Renomear ou trocar a cor" onClick={() => setEditing(editing === c.id ? null : c.id)}>
                        <LuPencil size={13} />
                      </Btn>
                      <Btn tone="ghost" title="Excluir a categoria (os espaços ficam sem etiqueta)" onClick={() => setConfirmDel(c.id)}>
                        <LuTrash2 size={13} />
                      </Btn>
                    </>
                  )}
                </span>
                {editing === c.id && (
                  <span className="flex flex-col gap-1.5">
                    <input
                      defaultValue={c.name}
                      maxLength={40}
                      onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && onUpdateCategory({ ...c, name: e.target.value.trim() })}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1 text-sm text-primary-gold outline-none focus:border-primary-gold/60"
                      aria-label="Nome da categoria"
                    />
                    <span className="flex flex-wrap gap-1.5">
                      {CATEGORY_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          aria-label={`Cor ${col}`}
                          onClick={() => onUpdateCategory({ ...c, color: col })}
                          className={`h-5 w-5 rounded-full ${c.color === col ? "ring-2 ring-white" : ""}`}
                          style={{ background: col }}
                        />
                      ))}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {creating ? (
            <CategoryForm
              onCancel={() => setCreating(false)}
              onCreate={(n, col) => {
                onCreateCategory(n, col);
                setCreating(false);
              }}
            />
          ) : (
            <Btn onClick={() => setCreating(true)} className="self-start">
              <LuPlus size={13} /> Nova categoria
            </Btn>
          )}
        </div>
      </Section>

      <Section title={`Armários de jogos (${shelves.length})`}>
        {shelves.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-primary-gold/55">
            Nenhum armário de jogos na planta ainda. Em <strong>Planta</strong>, adicione um (Móveis → Armário de jogos) ou escolha uma
            estante e toque em &quot;Transformar em armário de jogos&quot;.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {shelves.map((s) => {
              const c = contents.get(s.el.id);
              const cols = shelfColors(c, customs);
              return (
                <li key={s.el.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(s.el.id)}
                    className="flex w-full items-center gap-2 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-left text-xs transition-colors hover:border-primary-gold/40"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold text-primary-gold/90">{s.name}</span>
                      <span className="truncate text-[11px] text-primary-gold/45">{s.room}</span>
                    </span>
                    <span className="flex gap-0.5">
                      {cols.slice(0, 5).map((col) => (
                        <span key={col} className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                      ))}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-primary-gold/70">{shelfCount(c)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {duplicates.length > 0 && (
        <Section title="Em mais de um lugar">
          <ul className="flex flex-col gap-1">
            {duplicates.map(({ g, where }) => (
              <li key={g.id} className="flex items-start gap-1.5 text-[11px] text-amber-100/85">
                <LuTriangleAlert size={12} className="mt-0.5 shrink-0 text-amber-300" />
                <span>
                  <strong className="text-amber-200">{g.name}</strong>: {where.map(formatLocation).join(" e ")}. Se for uma cópia só, tire de um
                  dos lugares.
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title={`Sem lugar (${unplaced.length})`}>
        <button type="button" onClick={() => setShowUnplaced(!showUnplaced)} className="flex items-center gap-1 self-start text-[11px] font-semibold text-primary-gold/70 hover:text-primary-gold">
          <LuChevronDown size={13} className={`transition-transform ${showUnplaced ? "rotate-180" : ""}`} /> {showUnplaced ? "Esconder a lista" : "Ver os jogos da Coleção que ainda não têm lugar"}
        </button>
        {showUnplaced && (
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {unplaced.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-xs text-primary-gold/75">
                {g.image ? (
                  <img src={g.image} alt="" className="h-7 w-5 shrink-0 rounded-[2px] object-cover" loading="lazy" />
                ) : (
                  <span className="h-7 w-5 shrink-0 rounded-[2px] bg-[#3a2a1e]" />
                )}
                <span className="truncate">{g.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
