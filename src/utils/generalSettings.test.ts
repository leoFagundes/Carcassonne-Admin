import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@/types";
import {
  DEFAULT_PUB_INFO,
  disabledAreaFor,
  effectsAllowed,
  formatHour,
  formatPhoneBR,
  mergeEffectsPrefs,
  mergePubInfo,
  mergeShareMeta,
  noticeActive,
  openStatus,
  parseEmails,
  reserveStaffEmails,
  sessionHours,
  spClock,
} from "@/utils/generalSettings";

/** Instante em São Paulo (UTC−3). */
const sp = (iso: string) => Date.parse(`${iso}-03:00`);

describe("mergePubInfo / formatPhoneBR", () => {
  it("vazio cai no padrão; limpa @ e não dígitos; horário inválido vira fechado", () => {
    const info = mergePubInfo({
      address: "  ",
      instagram: "@outro",
      whatsapp: "+55 (61) 98888-7777",
      hours: [{ open: "18:00", close: "02:00" }, { open: "25:00", close: "02:00" }],
    });
    expect(info.address).toBe(DEFAULT_PUB_INFO.address);
    expect(info.instagram).toBe("outro");
    expect(info.whatsapp).toBe("5561988887777");
    expect(info.hours).toHaveLength(7);
    expect(info.hours[0]).toEqual({ open: "18:00", close: "02:00" });
    expect(info.hours[1]).toBeNull();
  });

  it("formata celular e fixo, com ou sem DDI", () => {
    expect(formatPhoneBR("5561999684186")).toBe("(61) 99968-4186");
    expect(formatPhoneBR("6133334444")).toBe("(61) 3333-4444");
    expect(formatPhoneBR("123")).toBe("123");
  });
});

describe("openStatus", () => {
  // 2026-11-06 é sexta-feira.
  const week = (day: OpeningHours | null): (OpeningHours | null)[] => Array(7).fill(day);

  it("sem horário nenhum: desconhecido", () => {
    expect(openStatus(Array(7).fill(null), sp("2026-11-06T20:00:00"))).toEqual({ state: "unknown" });
  });

  it("relógio de São Paulo", () => {
    expect(spClock(sp("2026-11-06T20:30:00"))).toEqual({ weekday: 5, minutes: 20 * 60 + 30 });
  });

  it("aberto no meio do expediente e depois da meia-noite", () => {
    const hours = week({ open: "18:00", close: "02:00" });
    expect(openStatus(hours, sp("2026-11-06T20:00:00"))).toEqual({ state: "open", text: "Aberto agora · fecha às 2h" });
    expect(openStatus(hours, sp("2026-11-07T01:30:00"))).toEqual({ state: "open", text: "Aberto agora · fecha às 2h" });
  });

  it("fechado antes de abrir hoje e depois de fechar", () => {
    const hours = week({ open: "18:30", close: "23:00" });
    expect(openStatus(hours, sp("2026-11-06T10:00:00"))).toEqual({ state: "closed", text: "Fechado · abre hoje às 18h30" });
    expect(openStatus(hours, sp("2026-11-06T23:30:00"))).toEqual({ state: "closed", text: "Fechado · abre amanhã às 18h30" });
  });

  it("pula dias fechados (segunda fechado → abre terça)", () => {
    const hours: (OpeningHours | null)[] = [null, null, { open: "18:00", close: "23:00" }, null, null, null, null];
    // domingo 2026-11-08 à noite
    expect(openStatus(hours, sp("2026-11-08T21:00:00"))).toEqual({ state: "closed", text: "Fechado · abre terça às 18h" });
  });

  it("formatHour", () => {
    expect(formatHour("09:00")).toBe("9h");
    expect(formatHour("18:45")).toBe("18h45");
  });
});

describe("noticeActive", () => {
  it("precisa estar ligado, com texto e no período (inclusive)", () => {
    const base = { enabled: true, text: "Fechado hoje", tone: "info" as const };
    expect(noticeActive(base, "2026-11-06")).toBe(true);
    expect(noticeActive({ ...base, enabled: false }, "2026-11-06")).toBe(false);
    expect(noticeActive({ ...base, text: "  " }, "2026-11-06")).toBe(false);
    expect(noticeActive({ ...base, from: "2026-11-06", to: "2026-11-06" }, "2026-11-06")).toBe(true);
    expect(noticeActive({ ...base, from: "2026-11-07" }, "2026-11-06")).toBe(false);
    expect(noticeActive({ ...base, to: "2026-11-05" }, "2026-11-06")).toBe(false);
    expect(noticeActive(undefined, "2026-11-06")).toBe(false);
  });
});

describe("disabledAreaFor", () => {
  it("casa a página e as subpáginas, só se a área estiver desligada", () => {
    expect(disabledAreaFor("/reserve", { reservas: true })).toBe("reservas");
    expect(disabledAreaFor("/clientCollection/forSale", { ludoteca: true })).toBe("ludoteca");
    expect(disabledAreaFor("/clientCollection", { reservas: true })).toBeNull();
    expect(disabledAreaFor("/reservex", { reservas: true })).toBeNull();
    expect(disabledAreaFor("/linktree", { reservas: true, cardapio: true })).toBeNull();
  });
});

describe("mergeShareMeta / sessionHours / efeitos", () => {
  it("prévia: vazio vira padrão", () => {
    expect(mergeShareMeta({ title: " ", image: "https://x/img.png" })).toMatchObject({
      title: "Carcassonne Pub",
      image: "https://x/img.png",
    });
  });

  it("sessão: 1 a 720 horas, senão 24", () => {
    expect(sessionHours(8)).toBe(8);
    expect(sessionHours(0)).toBe(24);
    expect(sessionHours(1000)).toBe(24);
    expect(sessionHours("8")).toBe(24);
  });

  it("efeitos: padrão protege, e cada opção desliga no aparelho certo", () => {
    const prefs = mergeEffectsPrefs(undefined);
    expect(prefs).toEqual({ respectReducedMotion: true, disableOnTouch: true, intensity: "normal" });
    expect(effectsAllowed(prefs, { reducedMotion: false, touch: false })).toBe(true);
    expect(effectsAllowed(prefs, { reducedMotion: true, touch: false })).toBe(false);
    expect(effectsAllowed(prefs, { reducedMotion: false, touch: true })).toBe(false);
    const loose = mergeEffectsPrefs({ respectReducedMotion: false, disableOnTouch: false, intensity: "strong" });
    expect(effectsAllowed(loose, { reducedMotion: true, touch: true })).toBe(true);
    expect(mergeEffectsPrefs({ intensity: "bogus" as never }).intensity).toBe("normal");
  });
});

describe("e-mails da equipe", () => {
  it("separa por vírgula, ponto e vírgula ou linha; minúsculas; sem repetidos", () => {
    expect(parseEmails("A@x.com, b@y.com;\nnao-email a@x.com")).toEqual({
      valid: ["a@x.com", "b@y.com"],
      invalid: ["nao-email"],
    });
  });

  it("sem lista, o aviso vai para o e-mail do pub", () => {
    expect(reserveStaffEmails(undefined, "pub@x.com")).toEqual(["pub@x.com"]);
    expect(reserveStaffEmails(["a@x.com"], "pub@x.com")).toEqual(["a@x.com"]);
  });
});
