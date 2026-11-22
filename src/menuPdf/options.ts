/**
 * Personalização do PDF do cardápio: o que entra e o que sai. Fica salva no
 * navegador de quem usa (cada um com a sua).
 */
import type { MenuModel } from "./model";
import type { PdfTheme } from "./theme";

export type PdfOptions = {
  theme: PdfTheme;
  /** Cada seção começa numa página nova. */
  sectionPerPage: boolean;
  // Partes do PDF
  cover: boolean;
  toc: boolean;
  legend: boolean;
  /** Cabeçalho e rodapé (com o número das páginas). */
  pageChrome: boolean;
  infos: boolean;
  combos: boolean;
  // Nos itens
  photos: boolean;
  descriptions: boolean;
  /** Acompanhamentos e observações. */
  extras: boolean;
  /** Selos Destaque e Vegano (e a borda do destaque). */
  badges: boolean;
  /** Frase de cada categoria (ex.: "Life is too short for bad snacks"). */
  subtitles: boolean;
  /** Categorias que ficam de fora (pelo nome). */
  hidden: string[];
};

export const DEFAULT_OPTIONS: PdfOptions = {
  theme: "black",
  sectionPerPage: false,
  cover: true,
  toc: true,
  legend: true,
  pageChrome: true,
  infos: true,
  combos: true,
  photos: true,
  descriptions: true,
  extras: true,
  badges: true,
  subtitles: true,
  hidden: [],
};

export const OPTIONS_STORAGE_KEY = "cardapio-pdf-opcoes";

const FLAGS = [
  "sectionPerPage",
  "cover",
  "toc",
  "legend",
  "pageChrome",
  "infos",
  "combos",
  "photos",
  "descriptions",
  "extras",
  "badges",
  "subtitles",
] as const satisfies readonly (keyof PdfOptions)[];

/** Lê o que veio do navegador; o que faltar ou estiver estranho volta ao padrão. */
export function sanitizeOptions(raw: unknown): PdfOptions {
  const out: PdfOptions = { ...DEFAULT_OPTIONS, hidden: [] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (r.theme === "black" || r.theme === "white") out.theme = r.theme;
  for (const k of FLAGS) if (typeof r[k] === "boolean") out[k] = r[k];
  if (Array.isArray(r.hidden))
    out.hidden = [...new Set(r.hidden.filter((h): h is string => typeof h === "string" && h.length > 0 && h.length <= 200))].slice(0, 200);
  return out;
}

/** O cardápio só com as partes escolhidas. */
export function applyOptions(model: MenuModel, opts: PdfOptions): MenuModel {
  const hidden = new Set(opts.hidden);
  const sections = model.sections.filter((s) => !hidden.has(s.title));
  return {
    infos: opts.infos ? model.infos : [],
    combos: opts.combos ? model.combos : [],
    sections,
    itemCount: sections.reduce((n, s) => n + s.count, 0),
  };
}

export function isEmpty(model: MenuModel): boolean {
  return !model.infos.length && !model.combos.length && !model.sections.length;
}
