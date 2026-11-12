"use client";

import React from "react";
import {
  LuAlignCenterHorizontal,
  LuAlignCenterVertical,
  LuAlignEndHorizontal,
  LuAlignEndVertical,
  LuAlignStartHorizontal,
  LuAlignStartVertical,
  LuCopy,
  LuLink,
  LuRotateCcw,
  LuRotateCw,
  LuTrash2,
  LuTriangleAlert,
  LuUnlink,
} from "react-icons/lu";
import { CATEGORY_LABEL, CATEGORY_ORDER, elementTitle, KINDS, suggestedSeats } from "@/floorplan/catalog";
import { formatMeters } from "@/floorplan/geometry";
import type { AlignMode, PlanProblem } from "@/floorplan/editing";
import type { ElementKind, FloorPlan, PlanElement } from "@/floorplan/types";
import { Btn, NumberField, Section, SelectField, TextField } from "./ui";

export interface EditActions {
  add: (kind: ElementKind) => void;
  update: (id: string, patch: Partial<PlanElement>) => void;
  remove: () => void;
  duplicate: () => void;
  align: (mode: AlignMode) => void;
  attach: () => void;
  detach: () => void;
  rotate: (delta: number) => void;
  select: (ids: string[]) => void;
}

const ALIGN: { mode: AlignMode; icon: React.ReactNode; title: string }[] = [
  { mode: "left", icon: <LuAlignStartVertical size={15} />, title: "Alinhar pela esquerda" },
  { mode: "centerX", icon: <LuAlignCenterVertical size={15} />, title: "Centralizar na horizontal" },
  { mode: "right", icon: <LuAlignEndVertical size={15} />, title: "Alinhar pela direita" },
  { mode: "top", icon: <LuAlignStartHorizontal size={15} />, title: "Alinhar por cima" },
  { mode: "centerY", icon: <LuAlignCenterHorizontal size={15} />, title: "Centralizar na vertical" },
  { mode: "bottom", icon: <LuAlignEndHorizontal size={15} />, title: "Alinhar por baixo" },
];

export default function EditPanel({
  plan,
  selection,
  problems,
  snap,
  setSnap,
  lockStructure,
  setLockStructure,
  actions,
}: {
  plan: FloorPlan;
  selection: PlanElement[];
  problems: PlanProblem[];
  snap: boolean;
  setSnap: (v: boolean) => void;
  lockStructure: boolean;
  setLockStructure: (v: boolean) => void;
  actions: EditActions;
}) {
  const one = selection.length === 1 ? selection[0] : null;
  return (
    <div className="flex flex-col gap-3">
      {problems.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-amber-300/35 bg-amber-300/[0.07] p-3 text-xs text-amber-100/90">
          <span className="flex items-center gap-1.5 font-semibold text-amber-200">
            <LuTriangleAlert size={14} /> Antes de salvar
          </span>
          {problems.map((p, i) => (
            <button key={i} type="button" onClick={() => actions.select(p.ids)} className="text-left underline-offset-2 hover:underline">
              {p.message}
            </button>
          ))}
        </div>
      )}

      {one ? (
        <Inspector el={one} plan={plan} actions={actions} />
      ) : selection.length > 1 ? (
        <MultiPanel selection={selection} actions={actions} />
      ) : (
        <Palette actions={actions} />
      )}

      <Section title="Edição">
        <label className="flex items-center justify-between gap-2 text-xs text-primary-gold/75">
          Encaixar na grade de 5 cm
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} className="h-4 w-4 accent-[#e6c56b]" />
        </label>
        <label className="flex items-center justify-between gap-2 text-xs text-primary-gold/75">
          Travar paredes e ambientes
          <input type="checkbox" checked={lockStructure} onChange={(e) => setLockStructure(e.target.checked)} className="h-4 w-4 accent-[#e6c56b]" />
        </label>
        <p className="text-[11px] leading-relaxed text-primary-gold/45">
          Arraste para mover · alças brancas mudam o tamanho · a bolinha dourada gira (segure Alt para girar livre) · Shift ou Ctrl
          escolhe vários · setas movem 5 cm (com Shift, 50 cm) · R gira 90° · Ctrl+Z desfaz · Ctrl+D duplica · Delete exclui.
        </p>
      </Section>
    </div>
  );
}

function Palette({ actions }: { actions: EditActions }) {
  return (
    <Section title="Adicionar">
      <p className="text-[11px] text-primary-gold/50">Entra no meio da tela, no andar aberto. Depois é só arrastar.</p>
      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/45">{CATEGORY_LABEL[cat]}</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KINDS) as ElementKind[])
              .filter((k) => KINDS[k].category === cat)
              .map((k) => (
                <Btn key={k} onClick={() => actions.add(k)}>
                  {KINDS[k].label}
                </Btn>
              ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function MultiPanel({ selection, actions }: { selection: PlanElement[]; actions: EditActions }) {
  const tables = selection.filter((e) => e.kind === "table");
  const canAttach = tables.length === 1 && selection.some((e) => e.kind !== "table");
  const anyAttached = selection.some((e) => e.parent);
  return (
    <Section title={`${selection.length} escolhidos`} aside={<Btn tone="ghost" onClick={() => actions.select([])}>Limpar</Btn>}>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Alinhar</span>
        <div className="flex flex-wrap gap-1.5">
          {ALIGN.map((a) => (
            <Btn key={a.mode} title={a.title} onClick={() => actions.align(a.mode)}>
              {a.icon}
            </Btn>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {canAttach && (
          <Btn onClick={actions.attach} title="Os outros escolhidos passam a acompanhar a mesa">
            <LuLink size={13} /> Prender à {elementTitle(tables[0])}
          </Btn>
        )}
        {anyAttached && (
          <Btn onClick={actions.detach}>
            <LuUnlink size={13} /> Soltar
          </Btn>
        )}
        <Btn onClick={() => actions.rotate(90)} title="Girar 90° (cada um no lugar)">
          <LuRotateCw size={13} />
        </Btn>
        <Btn onClick={actions.duplicate}>
          <LuCopy size={13} /> Duplicar
        </Btn>
        <Btn tone="danger" onClick={actions.remove}>
          <LuTrash2 size={13} /> Excluir
        </Btn>
      </div>
      <p className="text-[11px] text-primary-gold/45">
        {selection.map((e) => elementTitle(e)).slice(0, 8).join(", ")}
        {selection.length > 8 ? "…" : ""}
      </p>
    </Section>
  );
}

function Inspector({ el, plan, actions }: { el: PlanElement; plan: FloorPlan; actions: EditActions }) {
  const info = KINDS[el.kind];
  const up = (patch: Partial<PlanElement>) => actions.update(el.id, patch);
  const parent = el.parent ? plan.elements.find((e) => e.id === el.parent) : undefined;
  const children = plan.elements.filter((e) => e.parent === el.id);
  const wLabel = info.linear ? "Comprimento" : el.kind === "table" || el.kind === "room" ? "Largura" : "Largura";
  const dLabel = info.linear ? "Espessura" : "Profundidade";

  return (
    <Section
      title={info.label}
      aside={
        <Btn tone="ghost" onClick={() => actions.select([])}>
          Fechar
        </Btn>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {el.kind === "table" ? (
          <>
            <TextField label="Nome da mesa" value={el.label ?? ""} placeholder="Ex.: 12" onCommit={(v) => up({ label: v || undefined })} />
            <NumberField label="Lugares" value={el.seats ?? 0} decimals={0} step={1} min={0} max={99} onCommit={(v) => up({ seats: v })} />
          </>
        ) : info.showsLabel || el.kind === "room" || el.kind === "text" || el.kind === "door" ? (
          <div className="col-span-2">
            <TextField
              label={el.kind === "room" ? "Nome do ambiente" : "Nome"}
              value={el.label ?? ""}
              placeholder={el.kind === "room" ? "Ex.: Salas" : "Opcional"}
              onCommit={(v) => up({ label: v || undefined })}
            />
          </div>
        ) : null}
        {info.variants && (
          <div className="col-span-2">
            <SelectField
              label="Tipo"
              value={el.variant ?? info.variants[0].id}
              options={info.variants}
              onChange={(v) => up({ variant: v })}
            />
          </div>
        )}
        {(el.kind === "pouf" || el.kind === "stair" || (el.kind === "deco" && el.variant === "arches")) && (
          <NumberField
            label={el.kind === "stair" ? "Degraus" : el.kind === "pouf" ? "Pufes" : "Arcos"}
            value={el.count ?? 1}
            decimals={0}
            step={1}
            min={1}
            max={60}
            onCommit={(v) => up({ count: v })}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Posição X" value={el.x} suffix="m" onCommit={(v) => up({ x: v })} />
        <NumberField label="Posição Y" value={el.y} suffix="m" onCommit={(v) => up({ y: v })} />
        <NumberField label={wLabel} value={el.w} suffix="m" min={0.05} max={100} onCommit={(v) => up({ w: v })} />
        <NumberField label={dLabel} value={el.d} suffix="m" min={0.05} max={100} onCommit={(v) => up({ d: v })} />
        <NumberField label="Giro" value={el.rot} suffix="°" decimals={0} step={15} onCommit={(v) => up({ rot: ((v % 360) + 360) % 360 })} />
        <div className="flex items-end gap-1.5">
          <Btn title="Girar 90° para a esquerda" onClick={() => actions.rotate(-90)} className="flex-1">
            <LuRotateCcw size={14} />
          </Btn>
          <Btn title="Girar 90° para a direita" onClick={() => actions.rotate(90)} className="flex-1">
            <LuRotateCw size={14} />
          </Btn>
        </div>
      </div>

      {el.kind === "table" && el.seats !== suggestedSeats(el.w, el.d) && (
        <button type="button" className="self-start text-[11px] text-primary-gold/50 underline-offset-2 hover:underline" onClick={() => up({ seats: suggestedSeats(el.w, el.d) })}>
          Pelo tamanho ({formatMeters(el.w)} × {formatMeters(el.d)}), cabem cerca de {suggestedSeats(el.w, el.d)} lugares. Usar esse número.
        </button>
      )}

      {plan.levels.length > 1 && (
        <SelectField label="Andar" value={el.level} options={plan.levels.map((l) => ({ id: l.id, label: l.name }))} onChange={(v) => up({ level: v })} />
      )}

      {el.kind === "room" && (
        <label className="flex items-center justify-between gap-2 text-xs text-primary-gold/75">
          Mostrar o nome no mapa
          <input type="checkbox" checked={!el.hideLabel} onChange={(e) => up({ hideLabel: e.target.checked ? undefined : true })} className="h-4 w-4 accent-[#e6c56b]" />
        </label>
      )}
      {el.kind === "room" && (
        <p className="text-[11px] leading-relaxed text-primary-gold/45">
          Reserva com o nome do ambiente (ex.: &quot;salas&quot;) marca todas as mesas dentro dele.
        </p>
      )}

      {parent && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-xs text-primary-gold/70">
          <span>
            Preso à <button type="button" className="font-semibold text-primary-gold underline-offset-2 hover:underline" onClick={() => actions.select([parent.id])}>{elementTitle(parent)}</button>: acompanha quando ela se move.
          </span>
          <Btn tone="ghost" onClick={actions.detach}>
            <LuUnlink size={13} /> Soltar
          </Btn>
        </div>
      )}
      {children.length > 0 && (
        <p className="text-[11px] text-primary-gold/55">
          {children.length} {children.length === 1 ? "item preso" : "itens presos"} a {el.kind === "table" ? "esta mesa" : "este elemento"} (
          {children.map((c) => elementTitle(c)).join(", ")}): movem junto.
          {" "}Para prender mais, escolha a mesa e os itens com Shift.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 border-t border-primary-gold/10 pt-2.5">
        <Btn onClick={actions.duplicate}>
          <LuCopy size={13} /> Duplicar
        </Btn>
        <Btn tone="danger" onClick={actions.remove}>
          <LuTrash2 size={13} /> Excluir{children.length ? " (com os presos)" : ""}
        </Btn>
      </div>
    </Section>
  );
}
