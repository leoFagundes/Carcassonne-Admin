"use client";

import React, { useRef, useState } from "react";
import {
  LuAlignCenterHorizontal,
  LuAlignCenterVertical,
  LuAlignEndHorizontal,
  LuAlignEndVertical,
  LuAlignStartHorizontal,
  LuAlignStartVertical,
  LuCopy,
  LuImagePlus,
  LuLibrary,
  LuLink,
  LuMove,
  LuRotateCcw,
  LuRotateCw,
  LuRuler,
  LuTrash2,
  LuTriangleAlert,
  LuUnlink,
} from "react-icons/lu";
import { elementTitle, KINDS, suggestedSeats, supportsPolygon } from "@/floorplan/catalog";
import { formatMeters, type Pt } from "@/floorplan/geometry";
import type { AlignMode, PlanProblem } from "@/floorplan/editing";
import type { PaletteItem } from "@/floorplan/palette";
import type { FloorPlan, LevelBackground, PlanElement } from "@/floorplan/types";
import { Btn, NumberField, Section, Seg, SelectField, TextField } from "./ui";
import PaletteGrid from "./paletteGrid";

/** Ferramentas da planta que usam toques no mapa. */
export type EditTool = { kind: "none" } | { kind: "bgMove" } | { kind: "calibrate"; a?: Pt; b?: Pt };

export interface EditActions {
  add: (item: PaletteItem) => void;
  update: (id: string, patch: Partial<PlanElement>) => void;
  remove: () => void;
  duplicate: () => void;
  align: (mode: AlignMode) => void;
  attach: () => void;
  detach: () => void;
  rotate: (delta: number) => void;
  select: (ids: string[]) => void;
  /** Abre o armário de jogos no modo Jogos. */
  organizeShelf: (id: string) => void;
  /** Estante comum vira armário de jogos. */
  toGameShelf: (id: string, as?: "pouf1" | "pouf3") => void;
  setPolygon: (id: string, on: boolean) => void;
  uploadBackground: (file: File) => void;
  updateBackground: (patch: Partial<LevelBackground>) => void;
  removeBackground: () => void;
  /** A distância entre os dois pontos marcados vale `meters` de verdade. */
  calibrate: (meters: number) => void;
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
  level,
  selection,
  problems,
  snap,
  setSnap,
  lockStructure,
  setLockStructure,
  tool,
  setTool,
  uploading,
  actions,
}: {
  plan: FloorPlan;
  level: string;
  selection: PlanElement[];
  problems: PlanProblem[];
  snap: boolean;
  setSnap: (v: boolean) => void;
  lockStructure: boolean;
  setLockStructure: (v: boolean) => void;
  tool: EditTool;
  setTool: (t: EditTool) => void;
  uploading: boolean;
  actions: EditActions;
}) {
  const one = selection.length === 1 ? selection[0] : null;
  const lv = plan.levels.find((l) => l.id === level);
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
        <Section title="Adicionar">
          <p className="-mt-1 text-[11px] text-primary-gold/50">Entra no meio da tela, no andar aberto. Depois é só arrastar.</p>
          <PaletteGrid onAdd={actions.add} />
        </Section>
      )}

      {lv && <BackgroundSection levelName={lv.name} bg={lv.bg} tool={tool} setTool={setTool} uploading={uploading} actions={actions} />}

      <Section title="Edição" collapse={{ id: "edit-help", defaultOpen: false }} summary={`${snap ? "grade de 5 cm" : "sem grade"}${lockStructure ? " · estrutura travada" : ""} · atalhos`}>
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
          escolhe vários · setas movem 5 cm (com Shift, 50 cm) · R gira 90° · Ctrl+Z desfaz · Ctrl+D duplica · Delete exclui · a régua
          fica no canto do mapa.
        </p>
      </Section>
    </div>
  );
}

function BackgroundSection({
  levelName,
  bg,
  tool,
  setTool,
  uploading,
  actions,
}: {
  levelName: string;
  bg?: LevelBackground;
  tool: EditTool;
  setTool: (t: EditTool) => void;
  uploading: boolean;
  actions: EditActions;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [real, setReal] = useState("");
  const pick = () => fileRef.current?.click();
  const measured = tool.kind === "calibrate" && tool.a && tool.b ? Math.hypot(tool.b.x - tool.a.x, tool.b.y - tool.a.y) : null;
  const realN = Number(real.replace(",", "."));
  return (
    <Section
      title={`Fundo do ${levelName.toLowerCase()}`}
      collapse={{ id: "edit-bg", defaultOpen: false }}
      summary={bg ? "com imagem" : "desenhar por cima de uma foto"}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) actions.uploadBackground(f);
          e.target.value = "";
        }}
      />
      {!bg ? (
        <>
          <p className="text-[11px] leading-relaxed text-primary-gold/55">
            Suba uma foto ou print da planta (até do PDF) e desenhe por cima. Depois marque uma medida que você conhece, como uma
            parede, e o mapa acerta a escala da imagem.
          </p>
          <Btn onClick={pick} disabled={uploading} className="self-start">
            <LuImagePlus size={14} /> {uploading ? "Enviando…" : "Escolher imagem"}
          </Btn>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">
              Transparência <span>{Math.round(bg.opacity * 100)}%</span>
            </span>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(bg.opacity * 100)}
              onChange={(e) => actions.updateBackground({ opacity: Number(e.target.value) / 100 })}
              className="accent-[#e6c56b]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            <Btn active={tool.kind === "bgMove"} onClick={() => setTool(tool.kind === "bgMove" ? { kind: "none" } : { kind: "bgMove" })}>
              <LuMove size={13} /> Mover a imagem
            </Btn>
            <Btn active={tool.kind === "calibrate"} onClick={() => setTool(tool.kind === "calibrate" ? { kind: "none" } : { kind: "calibrate" })}>
              <LuRuler size={13} /> Acertar a escala
            </Btn>
            <Btn tone="ghost" onClick={pick} disabled={uploading}>
              {uploading ? "Enviando…" : "Trocar"}
            </Btn>
            <Btn tone="ghost" onClick={actions.removeBackground}>
              Remover
            </Btn>
          </div>
          {tool.kind === "bgMove" && <p className="text-[11px] text-primary-gold/55">Arraste a imagem no mapa. Os outros itens ficam parados.</p>}
          {tool.kind === "calibrate" && (
            <div className="flex flex-col gap-2 rounded-lg border border-primary-gold/25 bg-primary-gold/[0.05] p-2.5 text-[11px] text-primary-gold/75">
              {!measured ? (
                <span>
                  {tool.a ? "Agora toque no fim da medida." : "Toque no começo de uma medida que você conhece (ex.: a ponta de uma parede)."}
                </span>
              ) : (
                <>
                  <span>
                    Na imagem, essa linha mede <strong className="text-primary-gold">{formatMeters(measured)}</strong>. Quanto ela mede de verdade?
                  </span>
                  <span className="flex items-end gap-1.5">
                    <label className="flex flex-1 flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Medida real</span>
                      <input
                        inputMode="decimal"
                        value={real}
                        onChange={(e) => setReal(e.target.value)}
                        placeholder="Ex.: 6,60"
                        className="w-full rounded-lg border border-primary-gold/20 bg-primary-black/70 px-2 py-1.5 text-sm text-primary-gold outline-none focus:border-primary-gold/60"
                      />
                    </label>
                    <Btn
                      tone="primary"
                      disabled={!(realN > 0.05 && realN < 400)}
                      onClick={() => {
                        actions.calibrate(realN);
                        setReal("");
                      }}
                    >
                      Aplicar
                    </Btn>
                  </span>
                  <button type="button" onClick={() => setTool({ kind: "calibrate" })} className="self-start text-primary-gold/55 underline-offset-2 hover:underline">
                    Marcar de novo
                  </button>
                </>
              )}
            </div>
          )}
          <p className="text-[11px] text-primary-gold/45">
            {formatMeters(bg.w)} × {formatMeters(bg.h)} na planta. A imagem só aparece aqui, no modo Planta.
          </p>
        </>
      )}
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
  const poly = !!el.points && el.points.length >= 3;
  const round = el.kind === "table" && el.shape === "round";
  const wLabel = info.linear ? "Comprimento" : round ? "Diâmetro (largura)" : "Largura";
  const dLabel = info.linear ? "Espessura" : round ? "Diâmetro (fundo)" : "Profundidade";
  const seatsHint = el.kind === "table" ? suggestedSeats(el.w, el.d, el.shape) : 0;

  return (
    <Section
      title={elementTitle({ kind: el.kind, variant: el.variant })}
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
        {el.kind === "table" && (
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Formato</span>
            <Seg
              label="Formato da mesa"
              size="sm"
              value={round ? "round" : "rect"}
              onChange={(v) => up({ shape: v === "round" ? "round" : undefined })}
              options={[
                { id: "rect", label: "Retangular" },
                { id: "round", label: "Redonda / oval" },
              ]}
            />
          </div>
        )}
        {supportsPolygon(el.kind) && (
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-gold/50">Formato</span>
            <Seg
              label="Formato"
              size="sm"
              value={poly ? "poly" : "rect"}
              onChange={(v) => actions.setPolygon(el.id, v === "poly")}
              options={[
                { id: "rect", label: "Retângulo" },
                { id: "poly", label: "Livre (em L, recortes…)" },
              ]}
            />
            {poly && (
              <span className="text-[11px] leading-snug text-primary-gold/50">
                {el.points!.length} pontos. Arraste os pontos brancos; toque no + para criar um ponto no meio do lado; toque duas
                vezes num ponto para apagar.
              </span>
            )}
          </div>
        )}
        {info.variants && (
          <div className="col-span-2">
            <SelectField label="Tipo" value={el.variant ?? info.variants[0].id} options={info.variants} onChange={(v) => up({ variant: v })} />
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

      {el.kind === "table" && el.seats !== seatsHint && (
        <button type="button" className="self-start text-left text-[11px] text-primary-gold/50 underline-offset-2 hover:underline" onClick={() => up({ seats: seatsHint })}>
          Pelo tamanho ({formatMeters(el.w)} × {formatMeters(el.d)}{round ? ", redonda" : ""}), cabem cerca de {seatsHint} lugares. Usar esse número.
        </button>
      )}

      {el.kind === "gameshelf" && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-primary-gold/25 bg-primary-gold/[0.05] p-2.5 text-[11px] text-primary-gold/70">
          {el.variant === "pouf1" || el.variant === "pouf3" ? (
            <span>
              Pufe que abre e guarda jogos: em <strong>Jogos</strong>, o tampo levanta e você guarda os jogos dentro
              {el.variant === "pouf3" ? " de cada um dos 3 lugares" : ""}. Continua sendo um lugar para sentar.
            </span>
          ) : el.variant === "understair" ? (
            <span>
              Armário embaixo da escada: em <strong>Jogos</strong>, a porta de correr abre e aparecem as 3 prateleiras grandes (a de baixo é a
              mais comprida; as de cima encurtam com a escada). O lado baixo fica à esquerda de quem olha a frente (a linha clara); gire 180° se a escada sobe para o outro
              lado.
            </span>
          ) : (
            <span>
              Armário de jogos: em <strong>Jogos</strong>, ele abre de frente para guardar os jogos e dar etiquetas às prateleiras. A
              frente do móvel é o lado com a linha clara.
            </span>
          )}
          <Btn tone="primary" className="self-start" onClick={() => actions.organizeShelf(el.id)}>
            <LuLibrary size={13} /> Organizar os jogos
          </Btn>
        </div>
      )}
      {(el.kind === "shelf" || el.kind === "cabinet") && (
        <Btn className="self-start" onClick={() => actions.toGameShelf(el.id)} title="Passa a guardar jogos (com prateleiras, gaveta e etiquetas)">
          <LuLibrary size={13} /> Transformar em armário de jogos
        </Btn>
      )}
      {el.kind === "pouf" && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-primary-gold/15 p-2.5 text-[11px] text-primary-gold/65">
          Esses pufes abrem para guardar jogos?
          <span className="flex flex-wrap gap-1.5">
            <Btn onClick={() => actions.toGameShelf(el.id, "pouf1")} title="Cada pufe vira um pufe-baú separado, no mesmo lugar">
              <LuLibrary size={13} /> {Math.max(1, el.count ?? 3) > 1 ? `${Math.max(1, el.count ?? 3)} pufes-baú de 1 lugar` : "Pufe-baú de 1 lugar"}
            </Btn>
            <Btn onClick={() => actions.toGameShelf(el.id, "pouf3")} title="Um pufe comprido, com 3 lugares que abrem">
              <LuLibrary size={13} /> Pufe-baú de 3 lugares
            </Btn>
          </span>
        </div>
      )}

      {plan.levels.length > 1 && (
        <SelectField label="Andar" value={el.level} options={plan.levels.map((l) => ({ id: l.id, label: l.name }))} onChange={(v) => up({ level: v })} />
      )}

      {el.kind === "room" && (
        <>
          <label className="flex items-center justify-between gap-2 text-xs text-primary-gold/75">
            Mostrar o nome no mapa
            <input type="checkbox" checked={!el.hideLabel} onChange={(e) => up({ hideLabel: e.target.checked ? undefined : true })} className="h-4 w-4 accent-[#e6c56b]" />
          </label>
          <p className="text-[11px] leading-relaxed text-primary-gold/45">
            Reserva com o nome do ambiente (ex.: &quot;salas&quot;) usa todas as mesas dentro dele; com a sincronização ligada, elas
            aparecem juntas.
          </p>
        </>
      )}

      {parent && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary-gold/10 bg-primary-black/40 px-2 py-1.5 text-xs text-primary-gold/70">
          <span>
            Preso à{" "}
            <button type="button" className="font-semibold text-primary-gold underline-offset-2 hover:underline" onClick={() => actions.select([parent.id])}>
              {elementTitle(parent)}
            </button>
            : acompanha quando ela se move.
          </span>
          <Btn tone="ghost" onClick={actions.detach}>
            <LuUnlink size={13} /> Soltar
          </Btn>
        </div>
      )}
      {children.length > 0 && (
        <p className="text-[11px] text-primary-gold/55">
          {children.length} {children.length === 1 ? "item preso" : "itens presos"} a {el.kind === "table" ? "esta mesa" : "este elemento"} (
          {children.map((c) => elementTitle(c)).join(", ")}): movem junto. Para prender mais, escolha a mesa e os itens com Shift.
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
