/**
 * Fotos do PDF do cardápio: cada uma é baixada uma vez (as de fora pelo
 * /api/proxy-image, por causa do CORS do Storage), recortada em quadrado e
 * reduzida — o PDF fica leve e não carrega fotos de vários MB.
 */

const cache = new Map<string, Promise<string | null>>();

function fetchUrl(src: string): string {
  return /^https?:\/\//i.test(src) ? `/api/proxy-image?url=${encodeURIComponent(src)}` : src;
}

async function loadBitmap(src: string): Promise<ImageBitmap | HTMLImageElement> {
  const res = await fetch(fetchUrl(src));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new Error(`não é imagem (${blob.type || "?"})`);
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Safari antigo não decodifica alguns formatos aqui: cai para <img>
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Recorta no centro (como object-fit: cover) e reduz para `size` px. PNG se tiver transparência. */
async function toThumb(src: string, size: number): Promise<string> {
  const bmp = await loadBitmap(src);
  const w = "naturalWidth" in bmp ? bmp.naturalWidth : bmp.width;
  const h = "naturalHeight" in bmp ? bmp.naturalHeight : bmp.height;
  if (!w || !h) throw new Error("imagem vazia");
  const side = Math.min(w, h);
  const out = Math.min(size, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
  if ("close" in bmp) bmp.close();
  const data = ctx.getImageData(0, 0, out, out).data;
  let transparent = false;
  for (let i = 3; i < data.length; i += 4)
    if (data[i] < 250) {
      transparent = true;
      break;
    }
  return transparent ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86);
}

/** Miniatura em data URL, ou null se não deu para carregar. */
export function thumb(src: string, size: number): Promise<string | null> {
  const key = `${size}|${src}`;
  let p = cache.get(key);
  if (!p) {
    p = toThumb(src, size).catch((err) => {
      console.warn("[cardápio PDF] foto não carregou:", src, err);
      return null;
    });
    cache.set(key, p);
  }
  return p;
}

/**
 * Prepara várias de uma vez (até `parallel` ao mesmo tempo), avisando o
 * progresso. Devolve o mapa src → data URL (só as que carregaram).
 */
export async function prepareThumbs(
  srcs: string[],
  size: number,
  onProgress?: (done: number, total: number) => void,
  parallel = 6,
): Promise<Map<string, string>> {
  const list = [...new Set(srcs.filter(Boolean))];
  const out = new Map<string, string>();
  let next = 0;
  let done = 0;
  onProgress?.(0, list.length);
  const worker = async () => {
    while (next < list.length) {
      const src = list[next++];
      const data = await thumb(src, size);
      if (data) out.set(src, data);
      onProgress?.(++done, list.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, list.length) }, worker));
  return out;
}
