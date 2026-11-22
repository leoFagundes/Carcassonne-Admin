export type PdfTheme = "black" | "white";

export const PALETTES = {
  black: {
    G: "#e6c56b", // dourado
    G2: "#d4af37", // dourado escuro
    BG: "#121111", // fundo
    BG2: "#1b1a18", // card
    TEXT: "#f4efe3",
    GREEN: "#8fd18f",
  },
  white: {
    G: "#8a6a1c", // dourado com contraste no branco
    G2: "#6b5416",
    BG: "#fdfbf6",
    BG2: "#f5eedf",
    TEXT: "#2b2723",
    GREEN: "#2f7a3a",
  },
} as const;

/** Cor #rrggbb com transparência, em rgba(). */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
