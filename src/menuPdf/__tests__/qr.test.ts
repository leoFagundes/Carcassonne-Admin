import { describe, expect, it } from "vitest";
import { qrShape } from "../qr";
import { DEFAULT_OPTIONS, defaultQrUrl, isQrUrl, qrTarget, sanitizeOptions } from "../options";

describe("QR code do cardápio", () => {
  it("gera o desenho: quadrado, com os três cantos de posição", () => {
    const { size, path } = qrShape("https://carcassonnepub.com.br/clientMenu");
    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 17) % 4).toBe(0); // tamanhos válidos: 21, 25, 29…
    // O canto de cima à esquerda começa com uma linha de 7 escuros
    expect(path.startsWith("M0 0h7v1h-7z")).toBe(true);
    expect(path).toContain(`M${size - 7} 0h7v1h-7z`);
  });

  it("link: padrão é o cardápio online do site; aceita só http(s) sem espaços", () => {
    expect(defaultQrUrl("carcassonnepub.com.br")).toBe("https://carcassonnepub.com.br/clientMenu");
    expect(defaultQrUrl("https://www.carcassonnepub.com.br/")).toBe("https://www.carcassonnepub.com.br/clientMenu");
    expect(defaultQrUrl("")).toBe("https://www.carcassonnepub.com.br/clientMenu");
    expect(isQrUrl("https://instagram.com/carcassonnepub")).toBe(true);
    expect(isQrUrl("javascript:alert(1)")).toBe(false);
    expect(isQrUrl("https://com espaço.com")).toBe(false);
    expect(isQrUrl("ftp://x.com")).toBe(false);
    expect(qrTarget({ ...DEFAULT_OPTIONS, qrUrl: "https://instagram.com/x" }, "a.com")).toBe("https://instagram.com/x");
    expect(qrTarget({ ...DEFAULT_OPTIONS, qrUrl: "lixo" }, "a.com")).toBe("https://a.com/clientMenu");
  });

  it("opções: QR desligado e A4 por padrão; papel e link inválidos voltam ao padrão", () => {
    expect(DEFAULT_OPTIONS.qr).toBe(false);
    expect(DEFAULT_OPTIONS.paper).toBe("A4");
    expect(sanitizeOptions({ paper: "A5", qr: true, qrUrl: "https://x.com/a" })).toMatchObject({ paper: "A5", qr: true, qrUrl: "https://x.com/a" });
    expect(sanitizeOptions({ paper: "A3", qrUrl: "javascript:x" })).toMatchObject({ paper: "A4", qrUrl: "" });
  });
});
