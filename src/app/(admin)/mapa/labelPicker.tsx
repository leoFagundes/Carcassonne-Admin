"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuChevronDown, LuPencil, LuPlus, LuSearch, LuSparkles, LuTag, LuTrash2, LuX } from "react-icons/lu";
import { labelInfo, sameLabel, typeColor, type ShelfCategory, type SlotLabel } from "@/floorplan/shelves";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

interface Option {
  key: string;
  /** Sua categoria (dá para editar e excluir). */
  custom?: ShelfCategory;
  label: SlotLabel | undefined;
  text: string;
  color?: string;
  count?: number;
  group: "sug" | "none" | "custom" | "type";
}

/**
 * Escolher a etiqueta de um espaço: botão com a plaquinha atual que abre uma
 * lista com busca (setas e Enter funcionam), sugestão no topo, suas
 * categorias, as da Coleção (com quantos jogos cada) e "criar nova".
 */
export default function LabelPicker({
  value,
  customs,
  types,
  suggestion,
  onChange,
  onCreate,
  onEdit,
  onDelete,
}: {
  value: SlotLabel | undefined;
  customs: ShelfCategory[];
  types: { name: string; count: number }[];
  /** Categoria mais comum entre os jogos do espaço. */
  suggestion?: string | null;
  onChange: (label: SlotLabel | undefined) => void;
  /** Abre o formulário de categoria nova (com o nome digitado, se houver). */
  onCreate: (name: string) => void;
  /** Editar nome, cor e filtro de uma categoria sua. */
  onEdit: (c: ShelfCategory) => void;
  /** Excluir uma categoria sua (os espaços com ela ficam sem etiqueta). */
  onDelete: (c: ShelfCategory) => void;
}) {
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const info = labelInfo(value, customs);

  const options = useMemo(() => {
    const all: Option[] = [];
    const nq = norm(q);
    const match = (s: string) => !nq || norm(s).includes(nq);
    if (suggestion && !nq && !sameLabel(value, { kind: "type", name: suggestion }))
      all.push({ key: `sug:${suggestion}`, label: { kind: "type", name: suggestion }, text: suggestion, color: typeColor(suggestion), group: "sug" });
    if (value && !nq) all.push({ key: "none", label: undefined, text: "Sem etiqueta", group: "none" });
    for (const c of customs) if (match(c.name)) all.push({ key: `custom:${c.id}`, label: { kind: "custom", id: c.id }, text: c.name, color: c.color, group: "custom", custom: c });
    for (const t of types) if (match(t.name)) all.push({ key: `type:${t.name}`, label: { kind: "type", name: t.name }, text: t.name, color: typeColor(t.name), count: t.count, group: "type" });
    return all;
  }, [q, customs, types, suggestion, value]);

  useEffect(() => {
    if (!open) return;
    setActive(0);
  }, [q, open]);

  useEffect(() => {
    if (!open) {
      setQ("");
      return;
    }
    // No computador, já deixa a busca pronta para digitar
    if (window.matchMedia?.("(pointer: fine)").matches) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (o: Option) => {
    onChange(o.label);
    setOpen(false);
  };
  const exact = options.some((o) => o.group !== "sug" && norm(o.text) === norm(q));
  const createIndex = options.length; // "criar" é o último item navegável

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(createIndex, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < options.length) pick(options[active]);
      else {
        onCreate(q.trim());
        setOpen(false);
      }
    }
  };

  const heading = (g: Option["group"]) =>
    g === "sug" ? "Sugestão" : g === "custom" ? "Suas categorias" : g === "type" ? "Categorias da Coleção" : null;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Etiqueta do espaço: ${info?.text ?? "sem etiqueta"}`}
        className={`group flex w-full min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
          open ? "border-primary-gold/60 bg-primary-gold/[0.06]" : "border-primary-gold/20 bg-primary-black/60 hover:border-primary-gold/45"
        }`}
      >
        <LuTag size={14} className="shrink-0 text-primary-gold/50" aria-hidden="true" />
        {info ? (
          <span className="flex min-w-0 items-center gap-1.5 rounded-[4px] border border-[#6b4f1f] bg-[linear-gradient(180deg,#f3dda0_0%,#d4ad5c_45%,#a8843f_100%)] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#3a2410]">
            <span className="h-2 w-2 shrink-0 rounded-full border border-[#3a2410]/50" style={{ background: info.color }} />
            <span className="truncate">{info.text}</span>
          </span>
        ) : (
          <span className="truncate text-sm text-primary-gold/55">Escolher etiqueta…</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-primary-gold/45">
          {info?.custom && <span className="hidden sm:inline">sua</span>}
          <LuChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="fp-pick-in flex flex-col overflow-hidden rounded-xl border border-primary-gold/30 bg-[#16120e] shadow-card" onKeyDown={onKey}>
          <style>{`
            @keyframes fpPickIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
            .fp-pick-in { animation: fpPickIn 160ms ease-out both; }
            @media (prefers-reduced-motion: reduce) { .fp-pick-in { animation: none; } }
          `}</style>
          <label className="relative flex items-center border-b border-primary-gold/15">
            <LuSearch size={14} className="pointer-events-none absolute left-2.5 text-primary-gold/40" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar ou criar etiqueta…"
              aria-label="Buscar etiqueta"
              role="combobox"
              aria-expanded="true"
              aria-controls="fp-label-list"
              aria-activedescendant={`fp-label-${active}`}
              className="w-full bg-transparent py-2 pl-8 pr-8 text-sm text-primary-gold outline-none placeholder:text-primary-gold/30"
            />
            {q && (
              <button type="button" aria-label="Limpar busca" onClick={() => setQ("")} className="absolute right-2 text-primary-gold/50 hover:text-primary-gold">
                <LuX size={14} />
              </button>
            )}
          </label>
          <ul id="fp-label-list" ref={listRef} role="listbox" aria-label="Etiquetas" className="max-h-[min(320px,45vh)] overflow-y-auto overscroll-contain py-1">
            {options.map((o, i) => {
              const h = i === 0 || options[i - 1].group !== o.group ? heading(o.group) : null;
              const on = o.group !== "sug" && sameLabel(value, o.label);
              return (
                <React.Fragment key={o.key}>
                  {h && (
                    <li role="presentation" className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-gold/45">
                      {h}
                    </li>
                  )}
                  <li
                    id={`fp-label-${i}`}
                    data-i={i}
                    role="option"
                    aria-selected={on}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(o)}
                    className={`mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      active === i ? "bg-primary-gold/15 text-primary-gold" : "text-primary-gold/80"
                    }`}
                  >
                    {o.group === "none" ? (
                      <LuX size={13} className="shrink-0 text-primary-gold/45" />
                    ) : o.group === "sug" ? (
                      <LuSparkles size={13} className="shrink-0 text-primary-gold/70" />
                    ) : (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {o.group === "sug" ? (
                        <>
                          A maioria aqui é <strong>{o.text}</strong>
                        </>
                      ) : (
                        o.text
                      )}
                    </span>
                    {o.count !== undefined && <span className="shrink-0 tabular-nums text-[11px] text-primary-gold/40">{o.count}</span>}
                    {on && <LuCheck size={14} className="shrink-0 text-primary-gold" />}
                    {o.custom &&
                      (confirmDel === o.custom.id ? (
                        <span className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] text-primary-gold/60">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(null)}
                            className="rounded-md border border-primary-gold/25 px-1.5 py-0.5 text-[11px] font-semibold text-primary-gold/75 hover:text-primary-gold"
                          >
                            Não
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const c = o.custom!;
                              setConfirmDel(null);
                              onDelete(c);
                            }}
                            className="rounded-md border border-invalid-color/50 bg-invalid-color/15 px-1.5 py-0.5 text-[11px] font-semibold text-invalid-color hover:bg-invalid-color/25"
                          >
                            Excluir
                          </button>
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              onEdit(o.custom!);
                              setOpen(false);
                            }}
                            aria-label={`Editar ${o.text}`}
                            title="Editar nome, cor e filtro"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-primary-gold/45 hover:bg-primary-gold/15 hover:text-primary-gold"
                          >
                            <LuPencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDel(o.custom!.id)}
                            aria-label={`Excluir ${o.text}`}
                            title="Excluir a categoria"
                            className="flex h-6 w-6 items-center justify-center rounded-md text-primary-gold/45 hover:bg-invalid-color/15 hover:text-invalid-color"
                          >
                            <LuTrash2 size={12} />
                          </button>
                        </span>
                      ))}
                  </li>
                </React.Fragment>
              );
            })}
            {options.length === 0 && <li className="px-3 py-2 text-xs text-primary-gold/50">Nenhuma etiqueta com esse nome.</li>}
          </ul>
          <button
            type="button"
            data-i={createIndex}
            onMouseEnter={() => setActive(createIndex)}
            onClick={() => {
              onCreate(exact ? "" : q.trim());
              setOpen(false);
            }}
            className={`flex items-center gap-2 border-t border-primary-gold/15 px-3 py-2 text-left text-sm font-semibold ${
              active === createIndex ? "bg-primary-gold/15 text-primary-gold" : "text-primary-gold/75 hover:text-primary-gold"
            }`}
          >
            <LuPlus size={14} className="shrink-0" />
            <span className="min-w-0 truncate">{q.trim() && !exact ? `Criar etiqueta "${q.trim()}"` : "Criar uma categoria nova"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
