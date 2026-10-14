import type { SiteThemeId, SiteThemeReminder, SiteThemeStyle } from "@/types";

// Registro dos temas sazonais do site. O dourado e o preto do Carcassonne
// continuam sendo as cores principais em todos eles — o tema só soma
// decorações (desenhadas como gravura medieval) e uma cor de destaque.

export interface SiteThemeInfo {
  id: SiteThemeId;
  name: string;
  tagline: string;
  /** Quando costuma ser usado (ajuda a configurar o aviso). */
  season: string;
  /** Cores mostradas no admin — o dourado sempre vem primeiro. */
  swatches: string[];
  /** O que o tema adiciona ao site na versão completa (lista do admin). */
  highlights: string[];
  /** O que fica na versão minimalista. */
  minimal: string[];
}

/** Ordem do calendário (o Padrão primeiro e a Noite de Torneio, sem data, no fim). */
export const SITE_THEME_IDS: SiteThemeId[] = [
  "default",
  "carnaval",
  "stpatricks",
  "pascoa",
  "aniversario",
  "namorados",
  "junina",
  "oktoberfest",
  "halloween",
  "natal",
  "reveillon",
  "torneio",
];

const DECORATED_BARS = "Cabeçalho do cardápio e menu do admin decorados";
const MINIMAL_BARS = "Só a faixa do tema no cabeçalho do cardápio e no menu do admin";

export const SITE_THEMES: Record<SiteThemeId, SiteThemeInfo> = {
  default: {
    id: "default",
    name: "Padrão",
    tagline: "O visual de sempre do Carcassonne",
    season: "O ano todo",
    swatches: ["#e6c56b", "#d4af37", "#121111"],
    highlights: ["Preto e dourado clássicos", "Sem decorações extras"],
    minimal: [],
  },
  carnaval: {
    id: "carnaval",
    name: "Carnaval",
    tagline: "Baile de máscaras na Cité, com confete e serpentina",
    season: "Fevereiro ou março",
    swatches: ["#e6c56b", "#ff3ea5", "#19c3b2", "#8b5cf6"],
    highlights: [
      "Flâmulas em losango e serpentinas penduradas",
      "Serpentinas sendo lançadas pela tela",
      "Confete caindo em duas camadas",
      "Máscaras venezianas, plumas e pandeiro",
      "Chapéu de bobo da corte nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Flâmulas em losango e serpentinas no topo",
      "Um pouco de confete caindo",
      "Chapéu de bobo da corte nos logos",
      MINIMAL_BARS,
    ],
  },
  stpatricks: {
    id: "stpatricks",
    name: "St. Patrick's Day",
    tagline: "Trevos, harpa e o pote de ouro no fim do arco-íris",
    season: "17 de março",
    swatches: ["#e6c56b", "#2fbf71", "#9be7a5", "#f2d36b"],
    highlights: [
      "Guirlanda de trevos com moedas",
      "Arco-íris gravado terminando no pote de ouro",
      "Moeda de ouro rolando pela muralha",
      "Trevos caindo e brilhos dourados",
      "Harpa celta e faixa de nó celta",
      "Cartola verde de duende nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Guirlanda de trevos com moedas",
      "Poucos trevos caindo",
      "Cartola verde de duende nos logos",
      MINIMAL_BARS,
    ],
  },
  pascoa: {
    id: "pascoa",
    name: "Páscoa",
    tagline: "Flâmulas, coelho e ovos na Cité em festa",
    season: "Março ou abril",
    swatches: ["#e6c56b", "#c4a7ff", "#ffb3d1", "#9be7c4"],
    highlights: [
      "Varal de flâmulas medievais",
      "Coelho saltitando diante da muralha",
      "Ninho e ovos decorados",
      "Borboletas e pétalas no ar",
      "Orelhas de coelho nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Varal de flâmulas medievais",
      "Algumas pétalas no ar",
      "Orelhas de coelho nos logos",
      MINIMAL_BARS,
    ],
  },
  aniversario: {
    id: "aniversario",
    name: "Aniversário do Carcassonne",
    tagline: "A festa da casa: meeples, estandartes e bolo",
    season: "Maio (fundado em maio de 2013)",
    swatches: ["#e6c56b", "#c0392b", "#2f6db5", "#2a9d5c"],
    highlights: [
      "Estandartes nas cores dos meeples",
      "Meeples pulando de alegria",
      "Peças do Carcassonne caindo do céu",
      "Dado rolando pela muralha",
      "Bolo de andares com velas acesas",
      "Chapéu de festa nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Estandartes nas cores dos meeples",
      "Algumas peças do Carcassonne caindo",
      "Chapéu de festa nos logos",
      MINIMAL_BARS,
    ],
  },
  namorados: {
    id: "namorados",
    name: "Dia dos Namorados",
    tagline: "Rosas, corações e flechas de cupido",
    season: "12 de junho",
    swatches: ["#e6c56b", "#e8456b", "#ff9eb5", "#7a1f3d"],
    highlights: [
      "Guirlanda de rosas no topo",
      "Flechas de cupido cruzando a tela",
      "Corações subindo e pétalas caindo",
      "Cadeado do amor na muralha",
      "Coroa de rosas nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Guirlanda de rosas no topo",
      "Algumas pétalas caindo",
      "Coroa de rosas nos logos",
      MINIMAL_BARS,
    ],
  },
  junina: {
    id: "junina",
    name: "Festa Junina",
    tagline: "Bandeirinhas, fogueira e balões no arraiá da Cité",
    season: "Junho",
    swatches: ["#e6c56b", "#e63946", "#ffd23f", "#2f6db5"],
    highlights: [
      "Dois varais de bandeirinhas de chita",
      "Fogueira acesa com brasas subindo",
      "Balões de papel subindo devagar",
      "Milho e sanfona",
      "Chapéu de palha nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Um varal de bandeirinhas de chita",
      "Poucas brasas subindo",
      "Chapéu de palha nos logos",
      MINIMAL_BARS,
    ],
  },
  oktoberfest: {
    id: "oktoberfest",
    name: "Oktoberfest",
    tagline: "Canecas brindando, barris e lúpulo",
    season: "Fim de setembro e começo de outubro",
    swatches: ["#e6c56b", "#f2a900", "#2f6db5", "#f8f4ec"],
    highlights: [
      "Flâmulas da Baviera em losangos",
      "Ramos de lúpulo pendurados",
      "Canecas brindando com espuma",
      "Barris, trigo e pretzel",
      "Bolhinhas de chopp subindo",
      "Chapéu tirolês com pena nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Flâmulas da Baviera e ramos de lúpulo",
      "Algumas bolhinhas de chopp subindo",
      "Chapéu tirolês com pena nos logos",
      MINIMAL_BARS,
    ],
  },
  halloween: {
    id: "halloween",
    name: "Halloween",
    tagline: "Lua cheia sobre a Cité, morcegos e abóboras",
    season: "Fim de outubro",
    swatches: ["#e6c56b", "#ff7a1a", "#8b5cf6"],
    highlights: [
      "Muralha e torres da Cité em gravura",
      "Lua cheia riscada, com nuvens passando",
      "Morcegos e um espectro cruzando a tela",
      "Teia dourada com aranha descendo",
      "Abóboras-lanterna com vela acesa",
      "Névoa roxa e brasas subindo",
      "Chapéu de bruxa nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Lua cheia riscada, com nuvens passando",
      "Poucas brasas subindo",
      "Chapéu de bruxa nos logos",
      MINIMAL_BARS,
    ],
  },
  natal: {
    id: "natal",
    name: "Natal",
    tagline: "Guirlanda, lanternas e neve sobre a Cité",
    season: "Dezembro",
    swatches: ["#e6c56b", "#e63946", "#2a9d5c", "#f8f4ec"],
    highlights: [
      "Guirlanda de pinheiro com azevinho",
      "Lanternas de vela balançando",
      "Estrela-guia e estrelas cadentes",
      "Neve em cristais desenhados",
      "Cité nevada entre pinheiros",
      "Coroa dos Reis Magos nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Guirlanda de pinheiro e estrela-guia",
      "Neve fininha caindo",
      "Coroa dos Reis Magos nos logos",
      MINIMAL_BARS,
    ],
  },
  reveillon: {
    id: "reveillon",
    name: "Réveillon",
    tagline: "Fogos sobre a Cité, taças e sinos",
    season: "Fim de dezembro e começo de janeiro",
    swatches: ["#e6c56b", "#f7e7b4", "#cfd8e3", "#1c2a52"],
    highlights: [
      "Fogos de artifício estourando atrás da Cité",
      "Estrelas penduradas e sinos balançando",
      "Taças brindando e champanhe estourando",
      "Purpurina dourada no ar",
      "Cartola nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Estrelas penduradas num fio dourado",
      "Um pouco de purpurina no ar",
      "Cartola nos logos",
      MINIMAL_BARS,
    ],
  },
  torneio: {
    id: "torneio",
    name: "Noite de Torneio",
    tagline: "Estandartes, troféu e dados — para dias de campeonato",
    season: "Dias de campeonato",
    swatches: ["#e6c56b", "#c8323c", "#3b6fd8", "#f8e6a8"],
    highlights: [
      "Estandartes dos dois times",
      "Troféu iluminado diante da Cité",
      "Holofotes varrendo o céu",
      "Espadas cruzadas e escudos",
      "Dado rolando pela muralha",
      "Coroa de louros nos logos",
      DECORATED_BARS,
    ],
    minimal: [
      "Estandartes dos dois times",
      "Um pouco de brilho dourado no ar",
      "Coroa de louros nos logos",
      MINIMAL_BARS,
    ],
  },
};

/** Valor salvo inválido ou ausente vira o tema padrão. */
export function normalizeSiteTheme(value: unknown): SiteThemeId {
  return SITE_THEME_IDS.includes(value as SiteThemeId)
    ? (value as SiteThemeId)
    : "default";
}

/** Último tema visto no aparelho — aplicado na hora, antes de o banco responder. */
export const SITE_THEME_CACHE_KEY = "carcassonne-site-theme";
/** Versão (completa/minimalista) do último tema visto no aparelho. */
export const SITE_THEME_STYLE_CACHE_KEY = "carcassonne-site-theme-style";

// ── Versões dos temas ────────────────────────────────────────────────────────

export type SiteThemeStyles = Partial<Record<SiteThemeId, SiteThemeStyle>>;

export const SITE_THEME_STYLE_LABELS: Record<SiteThemeStyle, string> = {
  full: "Completa",
  minimal: "Minimalista",
};

export const normalizeThemeStyle = (value: unknown): SiteThemeStyle =>
  value === "minimal" ? "minimal" : "full";

/** Só aceita versões bem formadas vindas do banco (a completa é o padrão). */
export function normalizeThemeStyles(value: unknown): SiteThemeStyles {
  if (!value || typeof value !== "object") return {};
  const result: SiteThemeStyles = {};
  for (const [theme, style] of Object.entries(value as Record<string, unknown>)) {
    if (SITE_THEME_IDS.includes(theme as SiteThemeId) && style === "minimal") {
      result[theme as SiteThemeId] = "minimal";
    }
  }
  return result;
}

// ── Avisos de tema ───────────────────────────────────────────────────────────

export type SiteThemeReminders = Partial<Record<SiteThemeId, SiteThemeReminder>>;

const MONTH_DAY = /^\d{2}-\d{2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Aviso que se repete todo ano (datas só com mês e dia: "MM-DD"). */
export const isYearlyReminder = (reminder: SiteThemeReminder) =>
  MONTH_DAY.test(reminder.start);

/** Só aceita avisos bem formados vindos do banco. */
export function normalizeReminders(value: unknown): SiteThemeReminders {
  if (!value || typeof value !== "object") return {};
  const result: SiteThemeReminders = {};
  for (const [theme, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SITE_THEME_IDS.includes(theme as SiteThemeId) || !raw || typeof raw !== "object") continue;
    const { start, end, enabled } = raw as Record<string, unknown>;
    if (typeof start !== "string" || typeof end !== "string") continue;
    const yearly = MONTH_DAY.test(start) && MONTH_DAY.test(end);
    const dated = ISO_DATE.test(start) && ISO_DATE.test(end);
    if (yearly || dated) {
      result[theme as SiteThemeId] = { start, end, enabled: enabled !== false };
    }
  }
  return result;
}

/** Data de hoje no fuso do aparelho, como "YYYY-MM-DD". */
export function todayISO(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "06-01" → "01/06"; "2026-06-01" → "01/06/2026" */
export function formatReminderDate(value: string) {
  return value.split("-").reverse().join("/");
}

/** "todo ano, de 20/10 a 31/10" ou "de 20/10/2026 a 31/10/2026" */
export function describeReminderPeriod(reminder: SiteThemeReminder) {
  const period = `de ${formatReminderDate(reminder.start)} a ${formatReminderDate(reminder.end)}`;
  return isYearlyReminder(reminder) ? `todo ano, ${period}` : period;
}

export type ReminderStatus = "upcoming" | "active" | "expired";

export function reminderStatus(reminder: SiteThemeReminder, today = todayISO()): ReminderStatus {
  if (isYearlyReminder(reminder)) {
    // Só dia e mês; o período pode atravessar a virada do ano (26/12 a 02/01)
    const day = today.slice(5);
    const { start, end } = reminder;
    const inside = start <= end ? day >= start && day <= end : day >= start || day <= end;
    return inside ? "active" : "upcoming";
  }
  if (today < reminder.start) return "upcoming";
  if (today > reminder.end) return "expired";
  return "active";
}

/** Dias até o próximo começo do aviso (no ano que vem, se o deste já passou). */
export function daysUntilReminder(reminder: SiteThemeReminder, today = todayISO()) {
  const [year, month, day] = today.split("-").map(Number);
  const from = Date.UTC(year, month - 1, day);
  const parts = reminder.start.split("-").map(Number);
  let start: number;
  if (isYearlyReminder(reminder)) {
    const [startMonth, startDay] = parts;
    start = Date.UTC(year, startMonth - 1, startDay);
    if (start < from) start = Date.UTC(year + 1, startMonth - 1, startDay);
  } else {
    const [startYear, startMonth, startDay] = parts;
    start = Date.UTC(startYear, startMonth - 1, startDay);
  }
  return Math.max(0, Math.round((start - from) / 86_400_000));
}

export interface PendingThemeReminder {
  theme: SiteThemeId;
  reminder: SiteThemeReminder;
}

/** Temas com aviso ligado, dentro do período e que não estão no ar. */
export function pendingThemeReminders(
  reminders: SiteThemeReminders,
  liveTheme: SiteThemeId,
  today = todayISO(),
): PendingThemeReminder[] {
  return SITE_THEME_IDS.flatMap((theme) => {
    const reminder = reminders[theme];
    if (
      !reminder ||
      !reminder.enabled ||
      theme === liveTheme ||
      reminderStatus(reminder, today) !== "active"
    ) {
      return [];
    }
    return [{ theme, reminder }];
  });
}
