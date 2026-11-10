"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LuBadgeDollarSign,
  LuCalendar,
  LuClock,
  LuPackage,
  LuTrophy,
  LuUsers,
} from "react-icons/lu";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RentalCustomerType, RentalGameType, RentalOrderType, RentalType } from "@/types";
import Counter from "@/components/mage-ui/text/counter";
import RentalRepository from "@/services/repositories/RentalRepository";
import RentalOrderRepository from "@/services/repositories/RentalOrderRepository";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import RentalCustomerRepository from "@/services/repositories/RentalCustomerRepository";
import { todaySP } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { withLiveBookings } from "@/rental/payments";
import {
  cancelBreakdown,
  monthlyRentals,
  ordersFrom,
  paymentBreakdown,
  paymentFees,
  periodStart,
  rentalSummary,
  rentalsFrom,
  spDate,
  statusBreakdown,
  topCustomers,
  topGames,
  type RentalStatsPeriod,
} from "@/rental/stats";
import { unitStatus } from "../aluguel-admin/unitsEditor";
import { useExportSheets } from "./stats-export";

const GOLD = "#e6c56b";
const GOLD_DIM = "#d4af37";
const RED = "#cc5826";
const GREEN = "#6ee7b7";
const SKY = "#7dd3fc";
const VIOLET = "#c4b5fd";

const PERIODS: { key: RentalStatsPeriod; label: string }[] = [
  { key: "30d", label: "30 dias" },
  { key: "3m", label: "3 meses" },
  { key: "6m", label: "6 meses" },
  { key: "1y", label: "1 ano" },
  { key: "all", label: "Total" },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Panel({ icon, title, children, aside }: { icon?: ReactNode; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3 min-w-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary-gold/50">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">{title}</span>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ icon, label, value, sub, red }: { icon: ReactNode; label: string; value: ReactNode; sub: string; red?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3 min-w-0">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${red ? "text-invalid-color/60" : "text-primary-gold/40"}`}>
        {icon}
        {label}
      </div>
      <span className={`text-2xl font-bold truncate ${red ? "text-invalid-color" : "text-primary-gold"}`}>{value}</span>
      <span className="text-[11px] text-primary-gold/35">{sub}</span>
    </div>
  );
}

function CountTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: [string, string] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs text-primary-gold shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p>
      <p>{plural(payload[0].value, unit[0], unit[1])}</p>
    </div>
  );
}

/** Rosca com legenda (valor e %) ao lado. */
function Donut({ data }: { data: { name: string; value: number; fill: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-xs text-primary-gold/40 py-6 text-center">Sem dados no período.</p>;
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={170}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs shadow-lg">
                  <p style={{ color: (payload[0].payload as { fill: string }).fill }} className="font-semibold">
                    {payload[0].name}: {payload[0].value}
                  </p>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2.5 min-w-0">
        {data.map((d) => (
          <div key={d.name} className="flex flex-col">
            <span className="flex items-center gap-2 text-xs text-primary-gold/60">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
              {d.name}
            </span>
            <span className="ml-[18px] text-base font-bold" style={{ color: d.fill }}>
              {d.value}
              <span className="ml-1.5 text-[10px] font-normal text-primary-gold/30">{Math.round((d.value / total) * 100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const barFill = (value: number, max: number) => (value === max && max > 0 ? GOLD : GOLD_DIM + "60");

export default function RentalStats() {
  const [rentals, setRentals] = useState<(RentalType & { id: string })[] | null>(null);
  const [orders, setOrders] = useState<(RentalOrderType & { id: string })[]>([]);
  const [games, setGames] = useState<(RentalGameType & { id: string })[]>([]);
  const [customers, setCustomers] = useState<(RentalCustomerType & { id: string })[]>([]);
  const [period, setPeriod] = useState<RentalStatsPeriod>("30d");
  const [year, setYear] = useState(() => Number(todaySP().slice(0, 4)));

  useEffect(() => {
    const unsubs = [
      RentalRepository.subscribeToAll(setRentals),
      RentalOrderRepository.subscribeToAll(setOrders),
      RentalGameRepository.subscribeToAll(setGames),
      RentalCustomerRepository.subscribeToAll(setCustomers),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const today = todaySP();
  const start = periodStart(period, today);

  const stats = useMemo(() => {
    const all = rentals ?? [];
    const inPeriod = rentalsFrom(all, start);
    const ordersInPeriod = ordersFrom(orders, start);
    const status = statusBreakdown(inPeriod);
    const cancels = cancelBreakdown(inPeriod);
    const payment = paymentBreakdown(ordersInPeriod);
    const fees = paymentFees(ordersInPeriod);
    return {
      summary: rentalSummary(inPeriod, orders, start),
      fees,
      games: topGames(inPeriod, 8),
      customers: topCustomers(inPeriod, 5),
      status: [
        { name: "Devolvidos", value: status.returned, fill: GREEN },
        { name: "Em andamento", value: status.ongoing, fill: SKY },
        { name: "Cancelados", value: status.canceled, fill: RED },
      ],
      cancels: [
        { name: "Pelo cliente", value: cancels.customer, fill: GOLD },
        { name: "Pelo admin", value: cancels.admin, fill: RED },
        { name: "Prazo de pagamento", value: cancels.system, fill: VIOLET },
      ],
      payment: [
        { name: "Balcão", value: payment.counter, fill: GOLD },
        { name: "Pix", value: payment.pix, fill: GREEN },
        { name: "Cartão", value: payment.card, fill: SKY },
        { name: "Saldo Mercado Pago", value: payment.other, fill: VIOLET },
      ].filter((d) => d.value > 0 || d.name === "Balcão"),
      hasOnline: payment.pix + payment.card + payment.other > 0,
      newCustomers: customers.filter((c) => {
        const ms = c.createdAt?.toMillis?.();
        return ms !== undefined && (!start || spDate(ms) >= start);
      }).length,
    };
  }, [rentals, orders, customers, start]);

  // "Agora": independe do período.
  const now = useMemo(() => {
    const nowMs = Date.now();
    let units = 0;
    let out = 0;
    for (const game of games) {
      const live = withLiveBookings(game, nowMs);
      for (const unit of game.units) {
        const s = unitStatus(live, unit, today);
        if (s === "unavailable") continue;
        units++;
        if (s === "rented" || s === "overdue") out++;
      }
    }
    const all = rentals ?? [];
    return {
      units,
      out,
      overdue: all.filter((r) => r.status === "picked_up" && r.dueDate < today).length,
      pickupsToday: all.filter((r) => r.status === "reserved" && r.startDate === today).length,
      returnsToday: all.filter((r) => r.status === "picked_up" && r.dueDate === today).length,
    };
  }, [games, rentals, today]);

  const monthly = useMemo(() => monthlyRentals(rentals ?? [], year), [rentals, year]);

  // Excel: valores em reais (número), uma aba por tabela.
  const brl = (c: number) => Math.round(c) / 100;
  const periodName = PERIODS.find((p) => p.key === period)?.label ?? "";
  useExportSheets("aluguel", [
    {
      name: `Resumo (${periodName})`,
      rows: [
        ["Indicador", "Valor"],
        ["Aluguéis (sem cancelados)", stats.summary.rentals],
        ["Cancelados", stats.summary.canceled],
        ["Receita (R$)", brl(stats.summary.revenue)],
        ["Reembolsado (R$)", brl(stats.summary.refunded)],
        ["Devoluções atrasadas (%)", stats.summary.lateRate],
        ["Clientes", stats.summary.customers],
        ["Contas novas", stats.newCustomers],
        ["Pago online (R$)", brl(stats.fees.gross)],
        ["Taxas do Mercado Pago (R$)", brl(stats.fees.fees)],
        ["Líquido recebido (R$)", brl(stats.fees.net)],
        ["Pedidos sem a taxa guardada", stats.fees.missing],
        ["Cópias fora agora", now.out],
        ["Cópias ativas", now.units],
        ["Atrasados agora", now.overdue],
      ],
    },
    { name: "Jogos mais alugados", rows: [["Jogo", "Aluguéis"], ...stats.games.map((g) => [g.name, g.aluguéis])] },
    { name: "Situação dos aluguéis", rows: [["Situação", "Aluguéis"], ...stats.status.map((d) => [d.name, d.value])] },
    { name: "Como pagaram", rows: [["Forma", "Pedidos"], ...stats.payment.map((d) => [d.name, d.value])] },
    { name: "Quem cancelou", rows: [["Quem", "Aluguéis"], ...stats.cancels.map((d) => [d.name, d.value])] },
    { name: "Clientes que mais alugaram", rows: [["Cliente", "Aluguéis"], ...stats.customers.map((c) => [c.name, c.count])] },
    { name: `Aluguéis por mês ${year}`, rows: [["Mês", "Aluguéis"], ...monthly.map((m) => [m.name, m.aluguéis])] },
  ]);
  const thisYear = Number(today.slice(0, 4));

  if (rentals === null) return <p className="text-xs text-primary-gold/50 px-1">Carregando estatísticas do aluguel...</p>;

  const { summary } = stats;
  const gamesMax = Math.max(0, ...stats.games.map((g) => g.aluguéis));
  const monthMax = Math.max(0, ...monthly.map((m) => m.aluguéis));

  return (
    <div className="flex flex-col gap-5">
      {/* Agora */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">Agora</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi
            icon={<LuPackage size={16} />}
            label="Cópias fora"
            value={`${now.out}/${now.units}`}
            sub={now.units ? `${Math.round((now.out / now.units) * 100)}% do acervo alugado` : "nenhuma cópia ativa"}
          />
          <Kpi icon={<LuClock size={16} />} label="Atrasados" value={<Counter targetValue={now.overdue} />} sub="retirados com prazo vencido" red={now.overdue > 0} />
          <Kpi icon={<LuCalendar size={16} />} label="Retiradas hoje" value={<Counter targetValue={now.pickupsToday} />} sub="reservas para hoje" />
          <Kpi icon={<LuCalendar size={16} />} label="Devoluções hoje" value={<Counter targetValue={now.returnsToday} />} sub="prazo vence hoje" />
        </div>
      </div>

      {/* Período */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">Por período</span>
        <div className="flex flex-wrap items-center gap-1.5 bg-secondary-black/40 border border-primary-gold/15 rounded-xl px-4 py-3">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                period === key
                  ? "border-primary-gold/50 text-primary-gold bg-primary-gold/10"
                  : "border-primary-gold/15 text-primary-gold/30 hover:border-primary-gold/30 hover:text-primary-gold/60"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] text-primary-gold/35 ml-auto whitespace-nowrap">pela data de retirada</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi
            icon={<LuPackage size={16} />}
            label="Aluguéis"
            value={<Counter targetValue={summary.rentals} />}
            sub={plural(summary.canceled, "cancelado", "cancelados")}
          />
          <Kpi
            icon={<LuBadgeDollarSign size={16} />}
            label="Receita"
            value={formatBRL(summary.revenue)}
            sub={summary.refunded ? `${formatBRL(summary.refunded)} reembolsados` : "sem reembolsos"}
          />
          <Kpi
            icon={<LuClock size={16} />}
            label="Devoluções atrasadas"
            value={`${summary.lateRate}%`}
            sub={`${summary.lateReturns} de ${plural(summary.returned, "devolvido", "devolvidos")}`}
            red={summary.lateRate > 20}
          />
          <Kpi
            icon={<LuUsers size={16} />}
            label="Clientes"
            value={<Counter targetValue={summary.customers} />}
            sub={`${plural(stats.newCustomers, "conta nova", "contas novas")}`}
          />
        </div>

        {stats.fees.paidOnline > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Kpi
              icon={<LuBadgeDollarSign size={16} />}
              label="Pago online"
              value={formatBRL(stats.fees.gross)}
              sub={plural(stats.fees.paidOnline, "pedido pago pelo site", "pedidos pagos pelo site")}
            />
            <Kpi
              icon={<LuBadgeDollarSign size={16} />}
              label="Taxas do Mercado Pago"
              value={formatBRL(stats.fees.fees)}
              sub={
                stats.fees.grossKnown > 0
                  ? `${((stats.fees.fees / stats.fees.grossKnown) * 100).toFixed(1).replace(".", ",")}% do valor pago${
                      stats.fees.missing ? ` · ${stats.fees.missing} sem dado` : ""
                    }`
                  : plural(stats.fees.missing, "pedido sem a taxa guardada", "pedidos sem a taxa guardada")
              }
            />
            <Kpi
              icon={<LuBadgeDollarSign size={16} />}
              label="Líquido recebido"
              value={formatBRL(stats.fees.net)}
              sub={stats.fees.missing ? "sem contar os pedidos sem taxa guardada" : "o que caiu na conta do pub"}
            />
          </div>
        )}
        {stats.fees.missing > 0 && (
          <p className="text-[11px] text-primary-gold/40 -mt-1">
            Pedidos pagos antes desta versão não têm a taxa guardada: abra o pedido e use “Consultar no Mercado Pago” para
            completar.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel icon={<LuTrophy size={14} />} title="Jogos mais alugados">
            {stats.games.length === 0 ? (
              <p className="text-xs text-primary-gold/40 py-6 text-center">Sem aluguéis no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(150, stats.games.length * 32)}>
                <BarChart data={stats.games} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: GOLD, fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: GOLD, fontSize: 11, opacity: 0.65 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CountTooltip unit={["aluguel", "aluguéis"]} />} cursor={{ fill: "rgba(230,197,107,0.05)" }} />
                  <Bar dataKey="aluguéis" radius={[0, 4, 4, 0]}>
                    {stats.games.map((g) => (
                      <Cell key={g.name} fill={barFill(g.aluguéis, gamesMax)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Situação dos aluguéis">
            <Donut data={stats.status} />
          </Panel>

          <Panel title="Como pagaram">
            <Donut data={stats.payment} />
            {!stats.hasOnline && (
              <p className="text-[10px] text-primary-gold/30">Nenhum pagamento online no período.</p>
            )}
          </Panel>

          <Panel title="Quem cancelou">
            <Donut data={stats.cancels} />
          </Panel>

          <Panel icon={<LuUsers size={14} />} title="Clientes que mais alugaram">
            {stats.customers.length === 0 ? (
              <p className="text-xs text-primary-gold/40 py-6 text-center">Sem aluguéis no período.</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {stats.customers.map((c, i) => (
                  <li key={c.uid} className="flex items-center gap-3 rounded-lg bg-primary-black/30 px-3 py-2 text-sm">
                    <span className="w-5 text-xs font-semibold text-primary-gold/40">{i + 1}º</span>
                    <span className="flex-1 min-w-0 truncate text-primary-gold/85">{c.name}</span>
                    <span className="text-xs text-primary-gold/55">{plural(c.count, "aluguel", "aluguéis")}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {/* Por mês */}
      <Panel
        icon={<LuCalendar size={14} />}
        title="Aluguéis por mês"
        aside={
          <span className="flex items-center gap-1">
            <button
              onClick={() => setYear((y) => y - 1)}
              aria-label="Ano anterior"
              className="text-[10px] px-1.5 py-0.5 rounded border border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70 transition-all cursor-pointer"
            >
              ‹
            </button>
            <span className="text-[11px] font-semibold text-primary-gold/60 px-1 min-w-[38px] text-center">{year}</span>
            <button
              onClick={() => setYear((y) => Math.min(y + 1, thisYear))}
              disabled={year >= thisYear}
              aria-label="Próximo ano"
              className="text-[10px] px-1.5 py-0.5 rounded border border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </span>
        }
      >
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: GOLD, fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: GOLD, fontSize: 10, opacity: 0.4 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CountTooltip unit={["aluguel", "aluguéis"]} />} cursor={{ fill: "rgba(230,197,107,0.05)" }} />
            <Bar dataKey="aluguéis" radius={[4, 4, 0, 0]}>
              {monthly.map((m) => (
                <Cell key={m.name} fill={barFill(m.aluguéis, monthMax)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
