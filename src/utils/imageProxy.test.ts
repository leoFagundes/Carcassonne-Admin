import { describe, expect, it } from "vitest";
import { isAllowedImageUrl, sniffImageType } from "./imageProxy";

describe("proxy de imagens", () => {
  it("aceita só fotos do Firebase Storage por https", () => {
    expect(isAllowedImageUrl("https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/a.jpg?alt=media&token=1")).toBe(true);
    expect(isAllowedImageUrl("https://storage.googleapis.com/bucket/a.png")).toBe(true);
    expect(isAllowedImageUrl("https://meu-app.firebasestorage.app/a.png")).toBe(true);
    expect(isAllowedImageUrl("http://firebasestorage.googleapis.com/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://firebasestorage.googleapis.com:8443/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://evil.com/?firebasestorage.googleapis.com")).toBe(false);
    expect(isAllowedImageUrl("https://firebasestorage.googleapis.com.evil.com/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://user@firebasestorage.googleapis.com/a.jpg")).toBe(false);
    expect(isAllowedImageUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedImageUrl("não é url")).toBe(false);
  });

  it("reconhece a imagem pelos primeiros bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(sniffImageType(new TextEncoder().encode("<html>"))).toBeNull();
  });
});
