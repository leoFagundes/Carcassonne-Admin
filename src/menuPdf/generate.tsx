/**
 * Gera o PDF do cardápio no navegador. É texto de verdade (não uma foto da
 * tela), então não esbarra no limite de tamanho de imagem do iPad/Safari nem
 * na memória de computadores mais fracos.
 *
 * Monta duas vezes: a 1ª descobre em que página cai cada seção, a 2ª escreve
 * esses números no sumário (que tem o mesmo tamanho, então nada muda de lugar).
 */
import type { PubInfo } from "@/types";
import type { MenuModel } from "./model";
import type { PdfTheme } from "./theme";
import { prepareThumbs, thumb } from "./images";

export type GenerateStep = { phase: "fotos"; done: number; total: number } | { phase: "montando" };

let fontsReady = false;

const LOGO = "/images/[oficial]-logo.png";
const THUMB_PX = 168;

export async function generateMenuPdf({
  model,
  theme,
  pub,
  sectionPerPage,
  onStep,
}: {
  model: MenuModel;
  theme: PdfTheme;
  pub: PubInfo;
  sectionPerPage: boolean;
  onStep?: (s: GenerateStep) => void;
}): Promise<{ blob: Blob; pages: number }> {
  const [{ pdf, Font }, { MenuDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./MenuDocument")]);

  if (!fontsReady) {
    const f = (name: string) => `${window.location.origin}/fonts/pdf/${name}.woff`;
    Font.register({
      family: "Cinzel",
      fonts: [
        { src: f("cinzel-latin-600-normal"), fontWeight: 600 },
        { src: f("cinzel-latin-700-normal"), fontWeight: 700 },
      ],
    });
    Font.register({
      family: "Lato",
      fonts: [
        { src: f("lato-latin-400-normal"), fontWeight: 400 },
        { src: f("lato-latin-700-normal"), fontWeight: 700 },
        { src: f("lato-latin-400-italic"), fontWeight: 400, fontStyle: "italic" },
      ],
    });
    // Sem hifenizar palavras (a regra padrão é do inglês)
    Font.registerHyphenationCallback((word) => [word]);
    fontsReady = true;
  }

  // Fotos: as dos itens; para as que não carregarem, a ilustração da categoria
  const all = model.sections.flatMap((s) => s.groups.flatMap((g) => g.items));
  const progress = (done: number, total: number) => onStep?.({ phase: "fotos", done, total });
  const images = await prepareThumbs(all.map((i) => i.image), THUMB_PX, progress);
  const missing = all.filter((i) => !images.has(i.image)).map((i) => i.fallback);
  if (missing.length) for (const [k, v] of await prepareThumbs(missing, THUMB_PX)) images.set(k, v);
  const logo = await thumb(LOGO, 360);

  onStep?.({ phase: "montando" });
  const generatedAt = new Date();
  const base = { model, theme, pub, images, logo, sectionPerPage, generatedAt };

  const record = { pages: {} as Record<string, number>, total: 0 };
  const first = await pdf(<MenuDocument {...base} tocPages={null} record={record} />).toBlob();
  if (!Object.keys(record.pages).length) return { blob: first, pages: record.total };

  const tocPages = { ...record.pages };
  const blob = await pdf(<MenuDocument {...base} tocPages={tocPages} record={record} />).toBlob();
  return { blob, pages: record.total };
}

/** Texto curto do navegador, para a mensagem de erro (ajuda a descobrir o que falhou). */
export function browserLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPad|Macintosh.*Mobile|Macintosh(?=.*Safari)(?!.*Chrome)/.test(ua) && navigator.maxTouchPoints > 1
    ? "iPad"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : "outro sistema";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "outro navegador";
  return `${browser} · ${os}`;
}
