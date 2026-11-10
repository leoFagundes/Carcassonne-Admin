"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { LuFileSpreadsheet, LuFileText } from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";

/**
 * Exportar as estatísticas: cada subaba registra as próprias tabelas
 * (useExportSheets) e o botão gera um Excel com uma aba por tabela, ou um PDF
 * da subaba visível do jeito que está na tela.
 */

export type ExportSheet = { name: string; rows: (string | number)[][] };

type Ctx = { set: (key: string, sheets: ExportSheet[] | null) => void; all: () => ExportSheet[] };
const ExportContext = createContext<Ctx | null>(null);

export function StatsExportProvider({ children }: { children: ReactNode }) {
  const store = useRef(new Map<string, ExportSheet[]>());
  const [, bump] = useState(0);
  const value = useMemo<Ctx>(
    () => ({
      set: (key, sheets) => {
        if (sheets) store.current.set(key, sheets);
        else store.current.delete(key);
        bump((n) => n + 1);
      },
      all: () => [...store.current.values()].flat(),
    }),
    [],
  );
  return <ExportContext.Provider value={value}>{children}</ExportContext.Provider>;
}

/** Registra as tabelas desta parte das estatísticas enquanto ela está na tela. */
export function useExportSheets(key: string, sheets: ExportSheet[]) {
  const ctx = useContext(ExportContext);
  const signature = JSON.stringify(sheets);
  useEffect(() => {
    if (!ctx) return;
    ctx.set(key, JSON.parse(signature) as ExportSheet[]);
    return () => ctx.set(key, null);
  }, [ctx, key, signature]);
}

const safeSheetName = (name: string, used: Set<string>) => {
  const base = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 28) || "Planilha";
  let n = 2;
  let out = base;
  while (used.has(out.toLowerCase())) out = `${base.slice(0, 25)} (${n++})`;
  used.add(out.toLowerCase());
  return out;
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportButtons({ targetRef, label }: { targetRef: RefObject<HTMLElement | null>; label: string }) {
  const ctx = useContext(ExportContext);
  const { addAlert } = useAlert();
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const slug = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const toExcel = useCallback(async () => {
    const sheets = ctx?.all() ?? [];
    if (!sheets.length) return addAlert("Nada para exportar nesta aba ainda.");
    setBusy("xlsx");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "Carcassonne Admin";
      const used = new Set<string>();
      for (const sheet of sheets) {
        const ws = wb.addWorksheet(safeSheetName(sheet.name, used));
        sheet.rows.forEach((row) => ws.addRow(row));
        ws.getRow(1).font = { bold: true };
        ws.views = [{ state: "frozen", ySplit: 1 }];
        ws.columns.forEach((col) => {
          let width = 10;
          col.eachCell?.({ includeEmpty: false }, (cell) => {
            width = Math.max(width, String(cell.value ?? "").length + 2);
          });
          col.width = Math.min(width, 60);
        });
      }
      const buffer = await wb.xlsx.writeBuffer();
      download(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `estatisticas-${slug}-${stamp}.xlsx`,
      );
    } catch (error) {
      console.error(error);
      addAlert("Não foi possível gerar o Excel. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }, [ctx, addAlert, slug, stamp]);

  const toPdf = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;
    setBusy("pdf");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdf = (await import("html2pdf.js" as any)).default;
      await html2pdf()
        .set({
          margin: 8,
          filename: `estatisticas-${slug}-${stamp}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#141414", logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css"] },
        })
        .from(el)
        .save();
    } catch (error) {
      console.error(error);
      addAlert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }, [targetRef, addAlert, slug, stamp]);

  const btn =
    "flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/20 text-[11px] text-primary-gold/70 hover:border-primary-gold/50 hover:text-primary-gold transition-colors cursor-pointer disabled:opacity-40";
  return (
    <div className="flex items-center justify-end gap-2" data-html2canvas-ignore="true">
      <span className="text-[11px] text-primary-gold/40 mr-auto sm:mr-0">Exportar {label}:</span>
      <button type="button" onClick={toPdf} disabled={busy !== null} className={btn}>
        <LuFileText size={13} /> {busy === "pdf" ? "Gerando PDF..." : "PDF"}
      </button>
      <button type="button" onClick={toExcel} disabled={busy !== null} className={btn}>
        <LuFileSpreadsheet size={13} /> {busy === "xlsx" ? "Gerando Excel..." : "Excel"}
      </button>
    </div>
  );
}
