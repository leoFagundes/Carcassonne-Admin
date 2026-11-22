/**
 * Personalização do PDF do cardápio: o que entra e o que sai. Fica salva no
 * navegador de quem usa (cada um com a sua).
 */
import type { MenuModel } from "./model";
import type { PdfTheme } from "./theme";

export type PdfPaper = "A4" | "A5";

export type PdfOptions = {
  theme: PdfTheme;
  /** A4 (folha comum) ou A5 (meia folha: cardápio de mesa, folheto). */
  paper: PdfPaper;
  /** Cada seção começa numa página nova. */
  sectionPerPage: boolean;
  // Partes do PDF
  cover: boolean;
  /** Sem capa: logo, nome e endereço no topo da 1ª página. */
  masthead: boolean;
  toc: boolean;
  legend: boolean;
  /** Cabeçalho e rodapé (com o número das páginas). */
  pageChrome: boolean;
  /** QR code para o cardápio online. */
  qr: boolean;
  /** Para onde o QR leva; vazio = cardápio online do site. */
  qrUrl: string;
  infos: boolean;
  combos: boolean;
  // Nos itens
  /** Também os itens escondidos no site. */
  showHidden: boolean;
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
  paper: "A4",
  sectionPerPage: false,
  cover: true,
  masthead: true,
  toc: true,
  legend: true,
  pageChrome: true,
  qr: false,
  qrUrl: "",
  infos: true,
  combos: true,
  showHidden: false,
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
  "masthead",
  "toc",
  "legend",
  "pageChrome",
  "qr",
  "infos",
  "combos",
  "showHidden",
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
  if (r.paper === "A4" || r.paper === "A5") out.paper = r.paper;
  if (typeof r.qrUrl === "string" && isQrUrl(r.qrUrl))
    out.qrUrl = r.qrUrl.trim();
  for (const k of FLAGS) if (typeof r[k] === "boolean") out[k] = r[k];
  if (Array.isArray(r.hidden))
    out.hidden = [
      ...new Set(
        r.hidden.filter(
          (h): h is string =>
            typeof h === "string" && h.length > 0 && h.length <= 200,
        ),
      ),
    ].slice(0, 200);
  return out;
}

/** Link que dá para pôr no QR: http(s), sem espaços, até 300 letras. */
export function isQrUrl(url: string): boolean {
  const u = url.trim();
  if (!u || u.length > 300 || /\s/.test(u)) return false;
  try {
    const parsed = new URL(u);
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      !!parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

/** Cardápio online do site (o endereço do site vem das configurações gerais). */
export function defaultQrUrl(website: string): string {
  const host =
    website
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "") || "www.carcassonnepub.com.br";
  return `https://${host}/clientMenu`;
}

/** O link que vai no QR: o escolhido, ou o cardápio online. */
export function qrTarget(opts: PdfOptions, website: string): string {
  return opts.qrUrl && isQrUrl(opts.qrUrl)
    ? opts.qrUrl.trim()
    : defaultQrUrl(website);
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
