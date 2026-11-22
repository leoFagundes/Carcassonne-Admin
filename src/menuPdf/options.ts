/**
 * Personalização do PDF do cardápio: o que entra e o que sai. Fica salva no
 * navegador de quem usa (cada um com a sua).
 */
import type { MenuModel } from "./model";
import type { PdfTheme } from "./theme";

export type PdfPaper = "A4" | "A5";
/** Cards (com foto) ou lista clássica (nome ······ preço, sem foto). */
export type PdfStyle = "cards" | "list";
/** Tamanho da letra dos itens: pequena, normal, grande, muito grande. */
export type PdfFontSize = "S" | "M" | "L" | "XL";

export const FONT_SCALE: Record<PdfFontSize, number> = { S: 0.9, M: 1, L: 1.15, XL: 1.32 };

export type PdfOptions = {
  theme: PdfTheme;
  /** A4 (folha comum) ou A5 (meia folha: cardápio de mesa, folheto). */
  paper: PdfPaper;
  style: PdfStyle;
  fontSize: PdfFontSize;
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
  /** Página de regulamento e avisos legais (o mesmo texto do site). */
  rules: boolean;
  /** Última página minimalista, para o verso. */
  backPage: boolean;
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
  /** Borda de cada tipo de página. */
  frames: PdfFrames;
};

/** Sem borda, dupla (a da capa) ou ingresso (a do verso, com os cantos recortados). */
export type FrameStyle = "none" | "double" | "ticket";
export type FramePage = "cover" | "content" | "rules" | "back";
export type PdfFrames = Record<FramePage, FrameStyle>;

export const FRAME_STYLES: FrameStyle[] = ["none", "double", "ticket"];
export const FRAME_PAGES: FramePage[] = ["cover", "content", "rules", "back"];
export const DEFAULT_FRAMES: PdfFrames = { cover: "double", content: "none", rules: "ticket", back: "ticket" };

export function sanitizeFrames(raw: unknown): PdfFrames {
  const out = { ...DEFAULT_FRAMES };
  if (!raw || typeof raw !== "object") return out;
  for (const page of FRAME_PAGES) {
    const v = (raw as Record<string, unknown>)[page];
    if (typeof v === "string" && (FRAME_STYLES as string[]).includes(v)) out[page] = v as FrameStyle;
  }
  return out;
}

export const DEFAULT_OPTIONS: PdfOptions = {
  theme: "black",
  paper: "A4",
  style: "cards",
  fontSize: "M",
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
  rules: false,
  backPage: true,
  showHidden: false,
  photos: true,
  descriptions: true,
  extras: true,
  badges: true,
  subtitles: true,
  hidden: [],
  frames: DEFAULT_FRAMES,
};

export const OPTIONS_STORAGE_KEY = "cardapio-pdf-opcoes";

/** Versão do que fica salvo: quando um padrão muda, quem tinha o antigo salvo recebe o novo uma vez. */
export const OPTIONS_VERSION = 2;

/** Lê o salvo no navegador (com as migrações de versão). */
export function loadSavedOptions(raw: unknown): PdfOptions {
  const out = sanitizeOptions(raw);
  const version = raw && typeof raw === "object" ? (raw as { v?: unknown }).v : undefined;
  // v2: o verso passou a vir ligado
  if (version !== OPTIONS_VERSION) out.backPage = true;
  return out;
}

/** O que vai para o navegador. */
export const optionsToSave = (opts: PdfOptions) => ({ ...opts, v: OPTIONS_VERSION });

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
  "rules",
  "backPage",
  "showHidden",
  "photos",
  "descriptions",
  "extras",
  "badges",
  "subtitles",
] as const satisfies readonly (keyof PdfOptions)[];

/** Lê o que veio do navegador; o que faltar ou estiver estranho volta ao padrão. */
export function sanitizeOptions(raw: unknown): PdfOptions {
  const out: PdfOptions = { ...DEFAULT_OPTIONS, hidden: [], frames: { ...DEFAULT_FRAMES } };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  out.frames = sanitizeFrames(r.frames);
  if (r.theme === "black" || r.theme === "white") out.theme = r.theme;
  if (r.paper === "A4" || r.paper === "A5") out.paper = r.paper;
  if (r.style === "cards" || r.style === "list") out.style = r.style;
  if (typeof r.fontSize === "string" && r.fontSize in FONT_SCALE) out.fontSize = r.fontSize as PdfFontSize;
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
  // Só o domínio: o site pode estar cadastrado com um caminho (ex.: carcassonnepub.com.br/linktree)
  const host =
    website
      .trim()
      .replace(/^https?:\/\//i, "")
      .split(/[/?#]/)[0] || "www.carcassonnepub.com.br";
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
