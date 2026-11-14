"use client";

import React, { useMemo, useState } from "react";
import { LuClock, LuGauge, LuSearch, LuShapes, LuUsers } from "react-icons/lu";
import { hasRule, matchesRule, type CatalogGame, type CategoryRule } from "@/floorplan/shelves";
import { difficultiesOptions } from "@/utils/patternValues";

const PLAYERS = [1, 2, 3, 4, 5, 6, 7, 8, 10];
const TIMES = [15, 30, 45, 60, 90, 120];

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
        on ? "border-primary-gold bg-primary-gold text-primary-black" : "border-primary-gold/20 text-primary-gold/70 hover:border-primary-gold/50 hover:text-primary-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-gold/50">
        {icon} {title}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

/** Número de jogadores escrito no nome ("Jogos para 2" → 2). */
export function playersFromName(name: string): number | null {
  const m = /\bpara\s+(\d{1,2})\b/i.exec(name);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 99 ? n : null;
}

/**
 * Filtro de uma categoria criada pelo gerente: jogadores, duração,
 * dificuldade e categorias da Coleção. Mostra na hora quantos jogos combinam.
 */
export default function RuleEditor({
  rule,
  onChange,
  catalog,
  types,
}: {
  rule: CategoryRule | undefined;
  onChange: (rule: CategoryRule | undefined) => void;
  catalog: CatalogGame[];
  types: { name: string; count: number }[];
}) {
  const r = rule ?? {};
  const [typeQ, setTypeQ] = useState("");
  const set = (patch: Partial<CategoryRule>) => {
    const next: CategoryRule = { ...r, ...patch };
    for (const k of Object.keys(next) as (keyof CategoryRule)[]) {
      const v = next[k];
      if (v === undefined || v === false || (Array.isArray(v) && v.length === 0)) delete next[k];
    }
    if (!next.players) delete next.exact;
    onChange(hasRule(next) ? next : undefined);
  };
  const toggle = (list: string[] | undefined, v: string) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

  // Dificuldades que existem na Coleção, na ordem de leve a pesado
  const diffs = useMemo(() => {
    const seen = new Set(catalog.map((g) => g.difficulty).filter((d): d is string => !!d));
    const ordered = difficultiesOptions.filter((d) => seen.has(d));
    return [...ordered, ...[...seen].filter((d) => !ordered.includes(d))];
  }, [catalog]);
  const shownTypes = useMemo(() => {
    const q = typeQ.trim().toLowerCase();
    const list = q ? types.filter((t) => t.name.toLowerCase().includes(q)) : types;
    // As escolhidas sempre aparecem
    return [...types.filter((t) => r.types?.includes(t.name) && !list.includes(t)), ...list];
  }, [types, typeQ, r.types]);
  const count = useMemo(() => (hasRule(rule) ? catalog.filter((g) => matchesRule(g, rule)).length : null), [catalog, rule]);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-primary-gold/15 bg-primary-black/40 p-2.5">
      <Row icon={<LuUsers size={12} />} title="Jogadores">
        {PLAYERS.map((n) => (
          <Chip key={n} on={r.players === n} onClick={() => set({ players: r.players === n ? undefined : n })} title={`Dá para jogar com ${n}`}>
            {n}
          </Chip>
        ))}
      </Row>
      {r.players && (
        <label className="-mt-1 flex items-center gap-1.5 text-[11px] text-primary-gold/65">
          <input type="checkbox" checked={!!r.exact} onChange={(e) => set({ exact: e.target.checked || undefined })} className="accent-[#e6c56b]" />
          Só jogos feitos exatamente para {r.players} (ex.: só para 2)
        </label>
      )}
      <Row icon={<LuClock size={12} />} title="Duração">
        {TIMES.map((t) => (
          <Chip key={t} on={r.maxTime === t} onClick={() => set({ maxTime: r.maxTime === t ? undefined : t })}>
            até {t} min
          </Chip>
        ))}
      </Row>
      {diffs.length > 0 && (
        <Row icon={<LuGauge size={12} />} title="Dificuldade (uma delas)">
          {diffs.map((d) => (
            <Chip key={d} on={!!r.difficulty?.includes(d)} onClick={() => set({ difficulty: toggle(r.difficulty, d) })}>
              {d}
            </Chip>
          ))}
        </Row>
      )}
      {types.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-gold/50">
            <LuShapes size={12} /> Categorias da Coleção (uma delas)
          </span>
          {types.length > 10 && (
            <label className="relative flex items-center">
              <LuSearch size={12} className="pointer-events-none absolute left-2 text-primary-gold/40" />
              <input
                value={typeQ}
                onChange={(e) => setTypeQ(e.target.value)}
                placeholder="Buscar categoria…"
                aria-label="Buscar categoria da Coleção"
                className="w-full rounded-md border border-primary-gold/15 bg-primary-black/60 py-1 pl-6 pr-2 text-xs text-primary-gold outline-none placeholder:text-primary-gold/30 focus:border-primary-gold/50"
              />
            </label>
          )}
          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
            {shownTypes.map((t) => (
              <Chip key={t.name} on={!!r.types?.includes(t.name)} onClick={() => set({ types: toggle(r.types, t.name) })}>
                {t.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <p className="text-[11px] text-primary-gold/60" aria-live="polite">
        {count === null
          ? "Sem filtro: escolha acima o que os jogos dessa plaquinha têm em comum."
          : catalog.length === 0
            ? "A Coleção ainda está carregando…"
            : `${count} ${count === 1 ? "jogo da Coleção combina" : "jogos da Coleção combinam"} com o filtro.`}
      </p>
    </div>
  );
}
