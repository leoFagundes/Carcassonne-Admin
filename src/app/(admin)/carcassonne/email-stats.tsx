"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LuRefreshCw, LuTriangleAlert } from "react-icons/lu";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/services/rentalApi";
import type { EmailStatsResult } from "@/services/server/resendStats";
import { useExportSheets } from "./stats-export";

const GOLD = "#e6c56b";
const GOLD_DIM = "#d4af37";

const STATUS: Record<string, { label: string; tone: string }> = {
  delivered: { label: "Entregues", tone: "text-emerald-300" },
  opened: { label: "Abertos", tone: "text-emerald-300" },
  clicked: { label: "Com clique", tone: "text-emerald-300" },
  sent: { label: "Enviados", tone: "text-primary-gold" },
  queued: { label: "Na fila", tone: "text-primary-gold/70" },
  scheduled: { label: "Agendados", tone: "text-primary-gold/70" },
  delivery_delayed: { label: "Atrasados", tone: "text-orange-300" },
  bounced: {
    label: "Voltaram (endereço inválido)",
    tone: "text-invalid-color",
  },
  complained: { label: "Marcados como spam", tone: "text-invalid-color" },
  failed: { label: "Falharam", tone: "text-invalid-color" },
  canceled: { label: "Cancelados", tone: "text-primary-gold/50" },
};

const SENDER_LABEL: Record<string, string> = {
  "reservas@carcassonnepub.com.br": "Reservas",
  "aluguel@carcassonnepub.com.br": "Aluguel",
};

function Meter({
  label,
  value,
  limit,
  sub,
}: {
  label: string;
  value: number;
  limit: number;
  sub: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, limit)) * 100));
  const tone =
    pct >= 90
      ? "bg-invalid-color"
      : pct >= 70
        ? "bg-orange-400"
        : "bg-primary-gold";
  return (
    <div className="flex flex-col gap-2 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3">
      <span className="text-[10px] uppercase tracking-widest text-primary-gold/40">
        {label}
      </span>
      <span className="text-2xl font-bold text-primary-gold tabular-nums">
        {value.toLocaleString("pt-BR")}
        <span className="text-sm font-normal text-primary-gold/40">
          {" "}
          / {limit.toLocaleString("pt-BR")}
        </span>
      </span>
      <div className="h-1.5 w-full rounded-full bg-primary-gold/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-primary-gold/40">{sub}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
        {title}
      </span>
      {children}
    </div>
  );
}

/** Estatísticas → E-mails: uso do Resend (hoje, mês, últimos 30 dias, situação e remetentes). */
export default function EmailStats() {
  const [data, setData] = useState<EmailStatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    const result = await adminApi.emailStats(refresh);
    setLoading(false);
    if (!result.ok) return setError(result.message);
    setData(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useExportSheets(
    "emails",
    data?.available
      ? [
          {
            name: "Resumo",
            rows: [
              ["Indicador", "Valor"],
              ["Hoje", data.today],
              ["Limite diário", data.limits.daily],
              ["Este mês", data.thisMonth],
              ["Limite mensal", data.limits.monthly],
              ["Mês passado", data.lastMonth],
            ],
          },
          {
            name: "Por dia (30 dias)",
            rows: [
              ["Data", "E-mails"],
              ...data.daily.map((d) => [
                d.date.split("-").reverse().join("/"),
                d.count,
              ]),
            ],
          },
          {
            name: "Situação no mês",
            rows: [
              ["Situação", "E-mails"],
              ...Object.entries(data.status).map(([k, v]) => [
                STATUS[k]?.label ?? k,
                v,
              ]),
            ],
          },
          {
            name: "Remetentes no mês",
            rows: [
              ["Remetente", "E-mails"],
              ...data.bySender.map((s) => [s.sender, s.count]),
            ],
          },
        ]
      : [],
  );

  const header = (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[11px] text-primary-gold/40">
        {data?.available
          ? `Atualizado às ${new Date(data.generatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
          : ""}
      </span>
      <button
        type="button"
        onClick={() => load(true)}
        disabled={loading}
        className="ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-primary-gold/15 text-primary-gold/55 hover:border-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer disabled:opacity-40"
      >
        <LuRefreshCw size={12} className={loading ? "animate-spin" : ""} />
        {loading ? "Consultando o Resend..." : "Atualizar"}
      </button>
    </div>
  );

  if (error || (data && !data.available)) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <div className="flex items-start gap-2 rounded-xl border border-orange-400/40 bg-orange-500/10 px-3 py-2.5 text-xs text-orange-200">
          <LuTriangleAlert size={14} className="shrink-0 mt-0.5" />
          <span>{error ?? (data && !data.available ? data.reason : "")}</span>
        </div>
      </div>
    );
  }
  if (!data)
    return (
      <p className="text-xs text-primary-gold/50 px-1">
        Consultando o Resend...
      </p>
    );

  const max = Math.max(0, ...data.daily.map((d) => d.count));
  const statusRows = Object.entries(data.status).sort((a, b) => b[1] - a[1]);
  const problems =
    (data.status.bounced ?? 0) +
    (data.status.complained ?? 0) +
    (data.status.failed ?? 0);

  return (
    <div className="flex flex-col gap-5">
      {header}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Meter
          label="Hoje"
          value={data.today}
          limit={data.limits.daily}
          sub="limite diário do plano"
        />
        <Meter
          label="Este mês"
          value={data.thisMonth}
          limit={data.limits.monthly}
          sub={`mês passado: ${data.lastMonth.toLocaleString("pt-BR")}`}
        />
        <div className="flex flex-col gap-2 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-widest text-primary-gold/40">
            Problemas no mês
          </span>
          <span
            className={`text-2xl font-bold tabular-nums ${problems ? "text-invalid-color" : "text-emerald-300"}`}
          >
            {problems}
          </span>
          <span className="text-[11px] text-primary-gold/40">
            voltaram, falharam ou foram marcados como spam
          </span>
        </div>
      </div>

      <Panel title="E-mails por dia · últimos 30 dias">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={data.daily}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) =>
                `${d.slice(8, 10)}/${d.slice(5, 7)}`
              }
              tick={{ fill: GOLD, fontSize: 10, opacity: 0.55 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              tick={{ fill: GOLD, fontSize: 10, opacity: 0.4 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(230,197,107,0.05)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs text-primary-gold shadow-lg">
                    <p className="font-semibold mb-0.5">
                      {String(payload[0].payload.date)
                        .split("-")
                        .reverse()
                        .join("/")}
                    </p>
                    <p>
                      {payload[0].value}{" "}
                      {payload[0].value === 1 ? "e-mail" : "e-mails"}
                    </p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.daily.map((d) => (
                <Cell
                  key={d.date}
                  fill={d.count === max && max > 0 ? GOLD : GOLD_DIM + "60"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Situação no mês">
          {statusRows.length === 0 ? (
            <p className="text-xs text-primary-gold/40">
              Nenhum e-mail neste mês.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {statusRows.map(([key, count]) => {
                const s = STATUS[key] ?? {
                  label: key,
                  tone: "text-primary-gold/70",
                };
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-primary-black/30 px-3 py-2 text-sm"
                  >
                    <span className={s.tone}>{s.label}</span>
                    <span className="font-semibold text-primary-gold tabular-nums">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[10px] text-primary-gold/35">
            É a última situação de cada e-mail. “Abertos” e “Com clique” só
            aparecem se o rastreamento estiver ligado no Resend.
          </p>
        </Panel>

        <Panel title="Quem enviou (mês)">
          {data.bySender.length === 0 ? (
            <p className="text-xs text-primary-gold/40">
              Nenhum e-mail neste mês.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.bySender.map((s) => (
                <li
                  key={s.sender}
                  className="flex items-center justify-between gap-3 rounded-lg bg-primary-black/30 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-primary-gold/85">
                    {SENDER_LABEL[s.sender] ?? s.sender}
                    {SENDER_LABEL[s.sender] && (
                      <span className="ml-1.5 text-[11px] text-primary-gold/40">
                        {s.sender}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-primary-gold tabular-nums">
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Últimos e-mails">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-primary-gold/40">
                <th className="py-1.5 pr-3 font-semibold">Quando</th>
                <th className="py-1.5 pr-3 font-semibold">Para</th>
                <th className="py-1.5 pr-3 font-semibold">Assunto</th>
                <th className="py-1.5 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((e) => {
                const s = STATUS[e.status] ?? {
                  label: e.status,
                  tone: "text-primary-gold/70",
                };
                return (
                  <tr
                    key={e.id}
                    className="border-t border-primary-gold/10 align-top"
                  >
                    <td className="py-1.5 pr-3 whitespace-nowrap text-primary-gold/60">
                      {e.at
                        ? new Date(e.at).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-primary-gold/80 break-all">
                      {e.to}
                    </td>
                    <td className="py-1.5 pr-3 text-primary-gold/80">
                      {e.subject}
                    </td>
                    <td className={`py-1.5 whitespace-nowrap ${s.tone}`}>
                      {s.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* <p className="flex items-start gap-1.5 text-[11px] text-primary-gold/40 leading-relaxed">
        <LuMail size={12} className="shrink-0 mt-0.5" />
        <span>
          Os limites mostrados são os do plano grátis do Resend (100 por dia, 3.000 por mês). Se o pub mudar de plano,
          ajuste as variáveis RESEND_DAILY_LIMIT e RESEND_MONTHLY_LIMIT na Vercel.
          {data.truncated ? " Muitos e-mails: a contagem do mês passado pode estar incompleta." : ""}
        </span>
      </p> */}
    </div>
  );
}
