"use client";

import React from "react";
import { KINDS, tableTitle } from "@/floorplan/catalog";
import { boundsOf, toWorld } from "@/floorplan/geometry";
import { STATE_META, type DayStatus } from "@/floorplan/day";
import type { MapReserve, PlanElement, PlanLevel } from "@/floorplan/types";
import { PlanDefs, Shape2D, U } from "./shapes2d";
import { people } from "./dayPanel";

interface PrintInput {
  levels: PlanLevel[];
  elements: PlanElement[];
  status: DayStatus;
  dateLabel: string;
  scopeLabel: string;
}

function LevelSheet({ level, elements, status }: { level: PlanLevel; elements: PlanElement[]; status: DayStatus }) {
  const els = elements
    .map((el, i) => ({ el, i }))
    .filter(({ el }) => el.level === level.id && !(el.kind === "deco" && ["pendant", "projector", "fan", "sconce"].includes(el.variant ?? "")))
    .sort((a, b) => KINDS[a.el.kind].layer - KINDS[b.el.kind].layer || a.i - b.i)
    .map(({ el }) => el);
  const b = boundsOf(els);
  if (!b) return null;
  const pad = 0.4;
  const vb = [(b.minX - pad) * U, (b.minY - pad) * U, (b.maxX - b.minX + pad * 2) * U, (b.maxY - b.minY + pad * 2) * U].join(" ");
  return (
    <section className="sheet">
      <h2>{level.name}</h2>
      <svg viewBox={vb} className="plan">
        <PlanDefs />
        {els.map((el) => {
          const unit = el.kind === "table" ? status.unitOfTable.get(el.id) : undefined;
          return (
            <g key={el.id} transform={`translate(${el.x * U} ${el.y * U}) rotate(${el.rot})`}>
              <Shape2D el={el} paper state={unit?.state} />
            </g>
          );
        })}
        {els
          .filter((el) => (el.kind === "room" && el.label && !el.hideLabel) || el.kind === "table")
          .map((el) => {
            if (el.kind === "room") {
              const p = toWorld(el, el.lx ?? 0, el.ly ?? 0);
              return (
                <text key={`l-${el.id}`} x={p.x * U} y={p.y * U} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={700} letterSpacing={3} fill="#9a917f">
                  {el.label!.toUpperCase()}
                </text>
              );
            }
            const unit = status.unitOfTable.get(el.id);
            const first = unit?.reservations[0];
            const fs = Math.max(14, Math.min(34, Math.min(el.w, el.d) * U * 0.38));
            return (
              <g key={`l-${el.id}`}>
                <text x={el.x * U} y={el.y * U - (first ? fs * 0.3 : 0)} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={800} fill="#111">
                  {el.label}
                </text>
                {first && unit!.tableIds[0] === el.id && (
                  <text x={el.x * U} y={el.y * U + fs * 0.55} textAnchor="middle" dominantBaseline="central" fontSize={Math.max(10, fs * 0.42)} fontWeight={700} fill="#111">
                    {first.time} {first.name.split(" ")[0]}
                    {unit!.reservations.length > 1 ? ` +${unit!.reservations.length - 1}` : ""}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
    </section>
  );
}

function PrintSheet({ levels, elements, status, dateLabel, scopeLabel }: PrintInput) {
  const rows: { r: MapReserve; tables: string }[] = [];
  const seen = new Set<string>();
  for (const u of status.units)
    for (const r of u.reservations) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const units = status.units.filter((x) => x.reservations.some((y) => y.id === r.id));
      rows.push({ r, tables: units.map((x) => x.reserveName).join(" + ") });
    }
  for (const r of status.unassigned) rows.push({ r, tables: "sem mesa" });
  rows.sort((a, b) => a.r.time.localeCompare(b.r.time));
  const c = status.counts;
  return (
    <main>
      <header>
        <h1>Mapa das mesas · {dateLabel}</h1>
        <p>
          {scopeLabel} · {c.free} livres · {c.reserved} reservadas · {c.occupied} ocupadas · {c.blocked} indisponíveis · {c.seatsFree} de {c.seatsTotal} lugares livres
        </p>
        <p className="legend">
          {(["free", "reserved", "occupied", "blocked"] as const).map((s) => (
            <span key={s}>
              <i style={{ background: STATE_META[s].color }} /> {STATE_META[s].label}
            </span>
          ))}
        </p>
      </header>
      {[...levels]
        .sort((a, b) => b.order - a.order)
        .map((l) => (
          <LevelSheet key={l.id} level={l} elements={elements} status={status} />
        ))}
      {rows.length > 0 && (
        <section className="list">
          <h2>Reservas</h2>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Nome</th>
                <th>Pessoas</th>
                <th>Mesa</th>
                <th>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ r, tables }) => (
                <tr key={r.id}>
                  <td>{r.time}</td>
                  <td>{r.name || "Sem nome"}</td>
                  <td>{people(r)}</td>
                  <td>{tables ? tables.split(" + ").map((t) => (/^\d/.test(t) ? tableTitle(t) : t)).join(" + ") : ""}</td>
                  <td>{r.observation ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

const CSS = `
*{box-sizing:border-box}body{margin:0;font-family:"Saira",system-ui,sans-serif;color:#111;background:#fff}
main{padding:14mm}header h1{font-size:18pt;margin:0 0 2mm}header p{margin:0 0 2mm;font-size:9.5pt;color:#333}
.legend span{display:inline-flex;align-items:center;gap:4px;margin-right:12px}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px}
.sheet{page-break-inside:avoid;margin-top:6mm}.sheet h2,.list h2{font-size:12pt;margin:0 0 2mm;text-transform:uppercase;letter-spacing:.12em;color:#555}
.plan{width:100%;max-height:150mm;border:1px solid #ccc;border-radius:4px}
.list{page-break-before:always}table{width:100%;border-collapse:collapse;font-size:9.5pt}th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}
th{font-size:8.5pt;text-transform:uppercase;letter-spacing:.08em;color:#666}
@page{size:A4 landscape;margin:0}
`;

/**
 * Abre uma folha para imprimir. A janela é aberta já no clique (o navegador
 * bloqueia janelas abertas depois de uma espera).
 */
export async function printDay(input: PrintInput): Promise<boolean> {
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return false;
  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Preparando…</title></head><body>Preparando a impressão…</body></html>`);
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = renderToStaticMarkup(<PrintSheet {...input} />);
  win.document.open();
  win.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Mapa das mesas · ${input.dateLabel}</title><style>${CSS}</style></head><body>${html}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
