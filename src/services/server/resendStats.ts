import "server-only";

/**
 * Estatísticas dos e-mails enviados pelo Resend (Configurações → Estatísticas
 * → E-mails). Lê a lista de e-mails da API (GET /emails, do mais novo para o
 * mais antigo) até cobrir o mês passado. Precisa de uma chave com "Full access"
 * (RESEND_STATS_API_KEY); a de envio não lê. O consumo do plano não vem pela API:
 * os limites (padrão do plano grátis) podem ser trocados por variáveis.
 */

type ResendEmail = {
  id: string;
  to?: string[] | string;
  from?: string;
  subject?: string;
  created_at?: string;
  last_event?: string;
};

export interface EmailStats {
  available: true;
  limits: { daily: number; monthly: number };
  today: number;
  thisMonth: number;
  lastMonth: number;
  /** Últimos 30 dias, do mais antigo para hoje. */
  daily: { date: string; count: number }[];
  status: Record<string, number>;
  bySender: { sender: string; count: number }[];
  recent: { id: string; to: string; subject: string; status: string; at: string }[];
  /** A lista foi cortada antes de cobrir o mês passado inteiro (muito volume). */
  truncated: boolean;
  generatedAt: number;
}

export type EmailStatsResult = EmailStats | { available: false; reason: string };

const PAGE = 100;
const MAX_PAGES = 15;
const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; value: EmailStatsResult } | null = null;

const spDate = (ms: number) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function limitFromEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}

async function fetchEmails(key: string, untilDay: string): Promise<{ emails: ResendEmail[]; truncated: boolean } | string> {
  const emails: ResendEmail[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL("https://api.resend.com/emails");
    url.searchParams.set("limit", String(PAGE));
    if (after) url.searchParams.set("after", after);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      return "A chave do Resend só pode enviar e-mails, não ler. Crie no Resend uma chave com “Full access” e coloque na Vercel como RESEND_STATS_API_KEY (a de envio continua igual).";
    }
    if (res.status === 404 || res.status === 405) return "A conta do Resend não liberou a lista de e-mails pela API.";
    if (res.status === 429) {
      await sleep(1200);
      page--;
      continue;
    }
    if (!res.ok) return `O Resend respondeu com erro (${res.status}). Tente de novo em instantes.`;
    const body = (await res.json()) as { data?: ResendEmail[]; has_more?: boolean };
    const data = Array.isArray(body.data) ? body.data : [];
    emails.push(...data);
    const oldest = data.at(-1)?.created_at;
    if (!body.has_more || !data.length || (oldest && spDate(Date.parse(oldest)) < untilDay)) {
      return { emails, truncated: false };
    }
    after = data.at(-1)!.id;
    await sleep(550); // limite da API: 2 por segundo
  }
  return { emails, truncated: true };
}

export async function loadEmailStats(force = false): Promise<EmailStatsResult> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  // Chave própria para leitura (Full access); a de envio costuma ser "Sending access" e não lê a lista.
  const key = process.env.RESEND_STATS_API_KEY || process.env.RESEND_API_KEY;
  if (!key) return { available: false, reason: "Nenhuma chave do Resend configurada no servidor (RESEND_STATS_API_KEY)." };

  const now = Date.now();
  const today = spDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const prev = new Date(`${monthStart}T12:00:00Z`);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  const lastMonthStart = prev.toISOString().slice(0, 10);
  const start30 = spDate(now - 29 * 86400000);
  const untilDay = start30 < lastMonthStart ? start30 : lastMonthStart;

  let fetched: Awaited<ReturnType<typeof fetchEmails>>;
  try {
    fetched = await fetchEmails(key, untilDay);
  } catch (error) {
    console.error("Erro ao ler os e-mails do Resend:", error);
    return { available: false, reason: "Não foi possível falar com o Resend agora." };
  }
  if (typeof fetched === "string") return { available: false, reason: fetched };

  const days = new Map<string, number>();
  for (let i = 29; i >= 0; i--) days.set(spDate(now - i * 86400000), 0);
  const status: Record<string, number> = {};
  const senders = new Map<string, number>();
  let todayCount = 0;
  let thisMonth = 0;
  let lastMonth = 0;

  for (const e of fetched.emails) {
    const ms = e.created_at ? Date.parse(e.created_at) : NaN;
    if (!Number.isFinite(ms)) continue;
    const day = spDate(ms);
    if (days.has(day)) days.set(day, (days.get(day) ?? 0) + 1);
    if (day === today) todayCount++;
    if (day >= monthStart) {
      thisMonth++;
      const st = e.last_event ?? "sent";
      status[st] = (status[st] ?? 0) + 1;
      const sender = (e.from ?? "").replace(/.*</, "").replace(/>.*/, "").trim() || "desconhecido";
      senders.set(sender, (senders.get(sender) ?? 0) + 1);
    } else if (day >= lastMonthStart) {
      lastMonth++;
    }
  }

  const value: EmailStats = {
    available: true,
    limits: { daily: limitFromEnv("RESEND_DAILY_LIMIT", 100), monthly: limitFromEnv("RESEND_MONTHLY_LIMIT", 3000) },
    today: todayCount,
    thisMonth,
    lastMonth,
    daily: [...days.entries()].map(([date, count]) => ({ date, count })),
    status,
    bySender: [...senders.entries()].map(([sender, count]) => ({ sender, count })).sort((a, b) => b.count - a.count),
    recent: fetched.emails.slice(0, 12).map((e) => ({
      id: e.id,
      to: Array.isArray(e.to) ? e.to.join(", ") : (e.to ?? ""),
      subject: e.subject ?? "",
      status: e.last_event ?? "sent",
      at: e.created_at ?? "",
    })),
    truncated: fetched.truncated,
    generatedAt: now,
  };
  cache = { at: now, value };
  return value;
}
