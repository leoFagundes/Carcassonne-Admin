/** Regras do /api/proxy-image: só fotos do Firebase Storage. */
const ALLOWED_HOSTS = new Set(["firebasestorage.googleapis.com", "storage.googleapis.com"]);

export const PROXY_MAX_BYTES = 15 * 1024 * 1024;

export function isAllowedImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      (ALLOWED_HOSTS.has(url.hostname) || url.hostname.endsWith(".firebasestorage.app"))
    );
  } catch {
    return false;
  }
}

/**
 * Tipo da imagem pelos primeiros bytes (fotos antigas podem ter sido salvas
 * como "application/octet-stream"). null se não for uma imagem conhecida.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  const at = (i: number, ...v: number[]) => v.every((b, k) => bytes[i + k] === b);
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (at(4, 0x66, 0x74, 0x79, 0x70) && at(8, 0x61, 0x76, 0x69, 0x66)) return "image/avif";
  return null;
}
