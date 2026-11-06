import type {
  EffectsIntensity,
  EffectsPrefs,
  OpeningHours,
  PubInfo,
  ShareMeta,
  SiteArea,
  SiteNotice,
} from "@/types";

/**
 * Configurações → Geral: valores padrão e regras puras (sem React nem banco).
 * Datas e horas no fuso de São Paulo.
 */

// ---------- Informações do pub ----------

export const DEFAULT_PUB_INFO: PubInfo = {
  address: "CLN 407 Bloco E Loja 37 — Asa Norte, Brasília/DF",
  mapsUrl: "https://www.google.com/maps/place/CLN+407+Bloco+E+-+Loja+37+-+Asa+Norte,+Brasília+-+DF",
  whatsapp: "5561999684186",
  instagram: "carcassonnepub",
  facebook: "CARCASSONNEPUB",
  email: "carcassonnepub@gmail.com",
  website: "carcassonnepub.com.br",
  hours: [null, null, null, null, null, null, null],
};

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanHours(raw: unknown): (OpeningHours | null)[] {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: 7 }, (_, i) => {
    const day = list[i] as Partial<OpeningHours> | null | undefined;
    return day && HM.test(String(day.open)) && HM.test(String(day.close))
      ? { open: String(day.open), close: String(day.close) }
      : null;
  });
}

/** Salvo + padrão: campo vazio ou ausente cai no padrão (horário vazio = não informado). */
export function mergePubInfo(saved?: Partial<PubInfo>): PubInfo {
  const pick = (key: Exclude<keyof PubInfo, "hours">) => {
    const value = saved?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : DEFAULT_PUB_INFO[key];
  };
  return {
    address: pick("address"),
    mapsUrl: pick("mapsUrl"),
    whatsapp: pick("whatsapp").replace(/\D/g, ""),
    instagram: pick("instagram").replace(/^@/, ""),
    facebook: pick("facebook"),
    email: pick("email"),
    website: pick("website"),
    hours: cleanHours(saved?.hours),
  };
}

/** "5561999684186" → "(61) 99968-4186" (sem o DDI 55). */
export function formatPhoneBR(digits: string): string {
  const d = digits.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export const whatsappUrl = (digits: string) => `https://wa.me/${digits.replace(/\D/g, "")}`;
export const instagramUrl = (handle: string) => `https://www.instagram.com/${handle.replace(/^@/, "")}`;
export const facebookUrl = (page: string) => `https://www.facebook.com/${page}`;

// ---------- Aberto agora ----------

export const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const toMinutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/** "18:00" → "18h"; "18:30" → "18h30". */
export const formatHour = (hm: string) => (hm.endsWith(":00") ? `${Number(hm.slice(0, 2))}h` : `${Number(hm.slice(0, 2))}h${hm.slice(3)}`);

/** Dia da semana (0 = domingo) e minutos do dia em São Paulo. */
export function spClock(nowMs: number): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenStatus =
  | { state: "unknown" }
  | { state: "open"; text: string }
  | { state: "closed"; text: string };

/**
 * Situação agora: aberto (até quando) ou fechado (quando abre). Considera o
 * expediente que passa da meia-noite (fecha 02:00 = madrugada do dia seguinte).
 * Sem nenhum horário informado → "unknown" (o selo não aparece).
 */
export function openStatus(hours: (OpeningHours | null)[], nowMs: number): OpenStatus {
  if (!hours.some(Boolean)) return { state: "unknown" };
  const { weekday, minutes } = spClock(nowMs);

  const today = hours[weekday];
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    const overnight = close <= open;
    if (minutes >= open && (overnight || minutes < close)) {
      return { state: "open", text: `Aberto agora · fecha às ${formatHour(today.close)}` };
    }
  }
  const yesterday = hours[(weekday + 6) % 7];
  if (yesterday && toMinutes(yesterday.close) <= toMinutes(yesterday.open) && minutes < toMinutes(yesterday.close)) {
    return { state: "open", text: `Aberto agora · fecha às ${formatHour(yesterday.close)}` };
  }

  if (today && minutes < toMinutes(today.open)) {
    return { state: "closed", text: `Fechado · abre hoje às ${formatHour(today.open)}` };
  }
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = hours[(weekday + ahead) % 7];
    if (!day) continue;
    const when = ahead === 1 ? "amanhã" : WEEKDAYS[(weekday + ahead) % 7];
    return { state: "closed", text: `Fechado · abre ${when} às ${formatHour(day.open)}` };
  }
  return { state: "closed", text: "Fechado" };
}

// ---------- Aviso no site ----------

export const DEFAULT_NOTICE: SiteNotice = { enabled: false, text: "", tone: "info" };

/** O aviso aparece hoje? (ligado, com texto e dentro do período). */
export function noticeActive(notice: SiteNotice | undefined, today: string): boolean {
  if (!notice?.enabled || !notice.text?.trim()) return false;
  if (notice.from && today < notice.from) return false;
  if (notice.to && today > notice.to) return false;
  return true;
}

// ---------- Áreas do site ----------

export const AREAS: { key: SiteArea; label: string; paths: string[] }[] = [
  { key: "reservas", label: "Reservas", paths: ["/reserve", "/cancelreserve"] },
  { key: "ludoteca", label: "Ludoteca", paths: ["/clientCollection"] },
  { key: "cardapio", label: "Cardápio", paths: ["/clientMenu"] },
  { key: "eventos", label: "Eventos", paths: ["/clientEventos"] },
];

export const DEFAULT_AREA_MESSAGE = "Esta área está temporariamente indisponível. Volte em breve!";

/** Área desligada a que a página pertence, ou null. */
export function disabledAreaFor(
  pathname: string,
  disabled: Partial<Record<SiteArea, boolean>> | undefined,
): SiteArea | null {
  for (const area of AREAS) {
    if (!disabled?.[area.key]) continue;
    if (area.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return area.key;
  }
  return null;
}

// ---------- Prévia ao compartilhar ----------

export const DEFAULT_SHARE_META: ShareMeta = {
  title: "Carcassonne Pub",
  description: "Board games, drinks e boa companhia na Asa Norte, em Brasília. Reserve sua mesa, veja o cardápio e a ludoteca.",
  image: "",
};

export function mergeShareMeta(saved?: Partial<ShareMeta>): ShareMeta {
  const pick = (key: keyof ShareMeta) => (saved?.[key]?.trim() ? saved[key]!.trim() : DEFAULT_SHARE_META[key]);
  return { title: pick("title"), description: pick("description"), image: pick("image") };
}

// ---------- Sessão do admin ----------

export const SESSION_HOUR_OPTIONS = [
  { hours: 8, label: "8 horas" },
  { hours: 24, label: "1 dia" },
  { hours: 72, label: "3 dias" },
  { hours: 168, label: "7 dias" },
];
export const DEFAULT_SESSION_HOURS = 24;

/** Horas válidas (1 a 720); inválido → 24. */
export function sessionHours(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 720
    ? Math.round(value)
    : DEFAULT_SESSION_HOURS;
}

// ---------- Efeitos de mouse ----------

export const DEFAULT_EFFECTS_PREFS: EffectsPrefs = {
  respectReducedMotion: true,
  disableOnTouch: true,
  intensity: "normal",
};

export function mergeEffectsPrefs(saved?: Partial<EffectsPrefs>): EffectsPrefs {
  const intensity: EffectsIntensity =
    saved?.intensity === "soft" || saved?.intensity === "strong" ? saved.intensity : "normal";
  return {
    respectReducedMotion: saved?.respectReducedMotion ?? DEFAULT_EFFECTS_PREFS.respectReducedMotion,
    disableOnTouch: saved?.disableOnTouch ?? DEFAULT_EFFECTS_PREFS.disableOnTouch,
    intensity,
  };
}

/** Parâmetros do efeito de clique para cada intensidade. */
export function sparkSettings(intensity: EffectsIntensity): { sparkCount: number; sparkSize: number; sparkRadius: number } {
  if (intensity === "soft") return { sparkCount: 5, sparkSize: 7, sparkRadius: 10 };
  if (intensity === "strong") return { sparkCount: 12, sparkSize: 14, sparkRadius: 24 };
  return { sparkCount: 8, sparkSize: 10, sparkRadius: 15 };
}

/** Efeitos ligados neste aparelho? */
export function effectsAllowed(prefs: EffectsPrefs, device: { reducedMotion: boolean; touch: boolean }): boolean {
  if (prefs.respectReducedMotion && device.reducedMotion) return false;
  if (prefs.disableOnTouch && device.touch) return false;
  return true;
}

// ---------- E-mails da equipe ----------

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Texto com e-mails separados por vírgula, ponto e vírgula ou linha → lista válida, sem repetidos. */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const valid = [...new Set(parts.filter((p) => EMAIL.test(p)))];
  const invalid = parts.filter((p) => !EMAIL.test(p));
  return { valid, invalid };
}

/** Para onde vai o aviso de nova reserva: a lista salva, ou o e-mail do pub. */
export function reserveStaffEmails(saved: string[] | undefined, pubEmail: string): string[] {
  const list = (saved ?? []).filter((e) => EMAIL.test(e));
  return list.length ? list : [pubEmail];
}
