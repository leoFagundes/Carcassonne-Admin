import { describe, expect, it } from "vitest";
import { SITE_LOGOS, siteLogo } from "./siteLogo";

describe("logo padrão", () => {
  it("só 'original' troca; o resto (ou nada salvo) é a atual", () => {
    expect(siteLogo("original")).toBe("original");
    expect(siteLogo("current")).toBe("current");
    expect(siteLogo(undefined)).toBe("current");
    expect(siteLogo("outra")).toBe("current");
    expect(SITE_LOGOS.original.src).toBe("/images/original-logo.svg");
  });
});
