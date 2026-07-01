"use client";

import Button from "@/components/button";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { GeneralConfigsType, LinkType, ReserveType } from "@/types";
import {
  daysArray,
  daysMap,
  patternGeneralConfigs,
} from "@/utils/patternValues";
import { auth } from "@/services/firebaseConfig";

import React, { useEffect, useRef, useState } from "react";
import {
  LuSettings,
  LuCalendar,
  LuUsers,
  LuTrendingDown,
  LuClock,
  LuCalendarDays,
  LuExternalLink,
  LuCheck,
} from "react-icons/lu";
import { onAuthStateChanged } from "firebase/auth";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import ComboRepository from "@/services/repositories/ComboRepository";
import LinksRepository from "@/services/repositories/LinksRepository";
import Counter from "@/components/mage-ui/text/counter";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Input from "@/components/input";
import OptionsInput from "@/components/optionsInput";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DragCards } from "./drag-cards";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function DateInput({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  function isoToBR(iso: string): string {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const [display, setDisplay] = React.useState(() => isoToBR(value));

  React.useEffect(() => {
    setDisplay(isoToBR(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = raw;
    if (raw.length > 2) formatted = raw.slice(0, 2) + "/" + raw.slice(2);
    if (raw.length > 4) formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);
    setDisplay(formatted);
    if (raw.length === 8) {
      const d = raw.slice(0, 2);
      const m = raw.slice(2, 4);
      const y = raw.slice(4, 8);
      onChange(`${y}-${m}-${d}`);
    } else if (raw.length === 0) {
      onChange("");
    }
  }

  return (
    <div className="flex items-center gap-1.5 bg-primary-black/50 border border-primary-gold/20 rounded-lg px-2.5 py-1.5 focus-within:border-primary-gold/40 transition-colors">
      <LuCalendar size={12} className="text-primary-gold/35 shrink-0" />
      <input
        type="text"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={10}
        className="text-xs bg-transparent text-primary-gold/70 placeholder:text-primary-gold/25 focus:outline-none w-[78px]"
      />
    </div>
  );
}

function SaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        saved
          ? "border-green-600/50 text-green-500 bg-green-600/10"
          : "border-primary-gold/30 text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold hover:bg-primary-gold/5"
      }`}
    >
      {saving ? (
        <span className="animate-pulse">Salvando...</span>
      ) : saved ? (
        <>
          <LuCheck size={14} />
          Salvo
        </>
      ) : (
        "Salvar"
      )}
    </button>
  );
}

const GOLD = "#e6c56b";
const RED = "#cc5826";
const GOLD_DIM = "#d4af37";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs text-primary-gold shadow-lg">
      <p className="font-semibold mb-0.5">{label}</p>
      <p>
        {payload[0].value} reserva{payload[0].value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fill: string } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p style={{ color: payload[0].payload.fill }} className="font-semibold">
        {payload[0].name}: {payload[0].value}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [localGeneralConfigs, setLocalGeneralConfigs] =
    useState<GeneralConfigsType>(patternGeneralConfigs);
  const [loading, setLoading] = useState(true);

  const [databaseInfo, setDatabaseInfo] = useState({
    currentUserEmail: "",
    boardgamesQuantity: 0,
    boardgamesVisible: 0,
    boardgamesForSale: 0,
    menuItemsQuantity: 0,
    menuInfosQuantity: 0,
    menuCombosQuantity: 0,
  });

  const [reserveStats, setReserveStats] = useState({
    totalThisMonth: 0,
    confirmedThisMonth: 0,
    canceledThisMonth: 0,
    peopleThisMonth: 0,
    avgGroupSize: 0,
    cancelRate: 0,
    mostPopularHour: "—",
    mostPopularDay: "—",
    firstReserveDate: "",
  });

  const [rawReserves, setRawReserves] = useState<ReserveType[]>([]);
  const [rawLinks, setRawLinks] = useState<(LinkType & { id: string })[]>([]);
  const [dayOfWeekData, setDayOfWeekData] = useState<
    { name: string; reservas: number }[]
  >([]);
  const [chartPeriod, setChartPeriod] = useState<
    "7d" | "30d" | "3m" | "6m" | "1y" | "all" | "custom"
  >("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const debouncedCustomStart = useDebounce(customStart, 400);
  const debouncedCustomEnd = useDebounce(customEnd, 400);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [firstClickDate, setFirstClickDate] = useState("");
  const [statusData, setStatusData] = useState<
    { name: string; value: number; fill: string }[]
  >([]);
  const [linkClicksData, setLinkClicksData] = useState<
    { name: string; clicks: number }[]
  >([]);
  const [hourData, setHourData] = useState<{ name: string; reservas: number }[]>([]);
  const [groupSizeData, setGroupSizeData] = useState<
    { name: string; reservas: number }[]
  >([]);
  const [groupSizeDetails, setGroupSizeDetails] = useState<
    Record<string, { date: string; code: string }[]>
  >({});
  const [monthlyData, setMonthlyData] = useState<
    { name: string; reservas: number }[]
  >([]);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const { addAlert } = useAlert();
  const muralRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("createimage") === "true") {
      muralRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const getCurrentUserEmail = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        if (user?.email) resolve(user.email);
        else reject("Não autenticado.");
      });
    });

  function computeReserveStats(reserves: ReserveType[]) {
    const now = new Date();
    const thisMonth = reserves.filter((r) => {
      const d = r.bookingDate;
      return (
        Number(d.year) === now.getFullYear() &&
        Number(d.month) === now.getMonth() + 1
      );
    });

    const confirmed = thisMonth.filter((r) => r.status === "confirmed");
    const canceled = thisMonth.filter((r) => r.status === "canceled");
    const people = confirmed.reduce(
      (sum, r) => sum + (r.adults || 0) + (r.childs || 0),
      0,
    );
    const cancelRate =
      thisMonth.length > 0
        ? Math.round((canceled.length / thisMonth.length) * 100)
        : 0;
    const avgGroup =
      confirmed.length > 0
        ? Math.round((people / confirmed.length) * 10) / 10
        : 0;

    // Most popular hour (all confirmed this month)
    const hourCount: Record<string, number> = {};
    confirmed.forEach((r) => {
      if (r.time) hourCount[r.time] = (hourCount[r.time] || 0) + 1;
    });
    const popularHour =
      Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    // Day of week distribution — last 30 days
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);

    const dowCount = [0, 0, 0, 0, 0, 0, 0];
    reserves.forEach((r) => {
      const d = new Date(
        Number(r.bookingDate.year),
        Number(r.bookingDate.month) - 1,
        Number(r.bookingDate.day),
      );
      if (d >= last30 && r.status === "confirmed") {
        dowCount[d.getDay()]++;
      }
    });

    const popularDay =
      DAY_NAMES_FULL[dowCount.indexOf(Math.max(...dowCount))] || "—";

    // First reserve date
    const sorted = [...reserves].sort((a, b) => {
      const tA = a.createdAt
        ? a.createdAt.toDate().getTime()
        : new Date(
            Number(a.bookingDate.year),
            Number(a.bookingDate.month) - 1,
            Number(a.bookingDate.day),
          ).getTime();
      const tB = b.createdAt
        ? b.createdAt.toDate().getTime()
        : new Date(
            Number(b.bookingDate.year),
            Number(b.bookingDate.month) - 1,
            Number(b.bookingDate.day),
          ).getTime();
      return tA - tB;
    });
    const oldest = sorted[0];
    const firstReserveDate = oldest
      ? oldest.createdAt
        ? oldest.createdAt.toDate().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : `${oldest.bookingDate.day}/${oldest.bookingDate.month}/${oldest.bookingDate.year}`
      : "";

    setReserveStats({
      totalThisMonth: thisMonth.length,
      confirmedThisMonth: confirmed.length,
      canceledThisMonth: canceled.length,
      peopleThisMonth: people,
      avgGroupSize: avgGroup,
      cancelRate,
      mostPopularHour: popularHour ? `${popularHour}h` : "—",
      mostPopularDay: popularDay,
      firstReserveDate,
    });
  }

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          userEmail,
          boardgames,
          menuItems,
          menuInfos,
          menuCombos,
          reserves,
          links,
        ] = await Promise.all([
          getCurrentUserEmail(),
          BoardgameRepository.getAll(),
          MenuItemRepository.getAll(),
          InfoRepository.getAll(),
          ComboRepository.getAll(),
          ReserveRepository.getAll(),
          LinksRepository.getAll(),
        ]);

        setRawLinks(links);

        setDatabaseInfo({
          currentUserEmail: userEmail,
          boardgamesQuantity: boardgames.length,
          boardgamesVisible: boardgames.filter((b) => b.isVisible).length,
          boardgamesForSale: boardgames.filter((b) => b.isForSale).length,
          menuItemsQuantity: menuItems.length,
          menuInfosQuantity: menuInfos.length,
          menuCombosQuantity: menuCombos.length,
        });

        setRawReserves(reserves);
        computeReserveStats(reserves);
      } catch (error) {
        addAlert(`Erro ao buscar informações: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    const fetchGeneralConfigs = async () => {
      try {
        const generalConfigs = await GeneralConfigsRepository.get();
        if (!generalConfigs || !generalConfigs._id) {
          addAlert("ID Inválido.");
          return;
        }
        setLocalGeneralConfigs(generalConfigs);
      } catch (error) {
        addAlert(`Erro ao buscar configurações: ${error}`);
      }
    };

    fetchAll();
    fetchGeneralConfigs();
  }, []);

  const [savingSection, setSavingSection] = useState<"reserva" | "efeitos" | null>(null);
  const [savedSection, setSavedSection] = useState<"reserva" | "efeitos" | null>(null);

  const saveSection = async (section: "reserva" | "efeitos") => {
    if (!localGeneralConfigs?._id) { addAlert("ID Inválido."); return; }
    setSavingSection(section);
    try {
      await GeneralConfigsRepository.update({ ...localGeneralConfigs });
      setSavedSection(section);
      addAlert("Configurações salvas com sucesso!");
      setTimeout(() => setSavedSection(null), 2500);
    } catch (error) {
      addAlert(`Erro ao salvar configurações: ${error}`);
    } finally {
      setSavingSection(null);
    }
  };

  function computeChartData(
    reserves: ReserveType[],
    links: (LinkType & { id: string })[],
    period: "7d" | "30d" | "3m" | "6m" | "1y" | "all" | "custom",
    cStart: string,
    cEnd: string,
  ) {
    const endDate =
      period === "custom" && cEnd
        ? new Date(cEnd + "T23:59:59")
        : new Date();
    let startDate: Date | null = null;
    if (period !== "all") {
      if (period === "custom") {
        startDate = cStart ? new Date(cStart + "T00:00:00") : null;
      } else {
        startDate = new Date();
        if (period === "7d") startDate.setDate(startDate.getDate() - 7);
        else if (period === "30d") startDate.setDate(startDate.getDate() - 30);
        else if (period === "3m") startDate.setMonth(startDate.getMonth() - 3);
        else if (period === "6m") startDate.setMonth(startDate.getMonth() - 6);
        else if (period === "1y")
          startDate.setFullYear(startDate.getFullYear() - 1);
      }
    }

    // Reserves
    const filtered = reserves.filter((r) => {
      const d = new Date(
        Number(r.bookingDate.year),
        Number(r.bookingDate.month) - 1,
        Number(r.bookingDate.day),
      );
      return (!startDate || d >= startDate) && d <= endDate;
    });
    const confirmedF = filtered.filter((r) => r.status === "confirmed");
    const canceledF = filtered.filter((r) => r.status === "canceled");
    const dowCount = [0, 0, 0, 0, 0, 0, 0];
    confirmedF.forEach((r) => {
      const d = new Date(
        Number(r.bookingDate.year),
        Number(r.bookingDate.month) - 1,
        Number(r.bookingDate.day),
      );
      dowCount[d.getDay()]++;
    });
    setDayOfWeekData(DAY_NAMES.map((name, i) => ({ name, reservas: dowCount[i] })));
    setStatusData([
      { name: "Confirmadas", value: confirmedF.length, fill: GOLD },
      { name: "Canceladas", value: canceledF.length, fill: RED },
    ]);
    setPeriodTotal(filtered.length);

    // Reservas por horário — normaliza "18:0" → "18:00" antes de agrupar
    const hourCount: Record<string, number> = {};
    confirmedF.forEach((r) => {
      if (!r.time) return;
      const [h, m = "00"] = r.time.split(":");
      const normalized = `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
      hourCount[normalized] = (hourCount[normalized] || 0) + 1;
    });
    setHourData(
      Object.entries(hourCount)
        .sort(([a], [b]) => {
          const [ah, am] = a.split(":").map(Number);
          const [bh, bm] = b.split(":").map(Number);
          return ah * 60 + am - (bh * 60 + bm);
        })
        .map(([name, reservas]) => ({ name: `${name}h`, reservas })),
    );

    // Distribuição de tamanho de grupo — todos os tamanhos reais, sem cap
    const sizeCount: Record<number, number> = {};
    const sizeDetails: Record<string, { date: string; code: string }[]> = {};
    confirmedF.forEach((r) => {
      const size = (r.adults || 0) + (r.childs || 0);
      const label = `${size} pessoa${size === 1 ? "" : "s"}`;
      sizeCount[size] = (sizeCount[size] || 0) + 1;
      if (!sizeDetails[label]) sizeDetails[label] = [];
      const d = r.bookingDate;
      sizeDetails[label].push({
        date: `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`,
        code: r.code,
      });
    });
    setGroupSizeDetails(sizeDetails);
    setGroupSizeData(
      Object.keys(sizeCount)
        .map(Number)
        .sort((a, b) => a - b)
        .map((size) => ({
          name: `${size} pessoa${size === 1 ? "" : "s"}`,
          reservas: sizeCount[size],
        })),
    );

    // First click date (earliest clicksByDay key across all links)
    const allDayKeys = links.flatMap((l) => Object.keys(l.clicksByDay ?? {}));
    if (allDayKeys.length > 0) {
      const earliest = allDayKeys.sort()[0];
      const [y, m, d] = earliest.split("-");
      setFirstClickDate(`${d}/${m}/${y}`);
    } else {
      setFirstClickDate("");
    }

    // Link clicks
    const linkData = links.map((l) => {
      const byDay = l.clicksByDay ?? {};
      const clicks = Object.entries(byDay)
        .filter(([dateStr]) => {
          if (period === "all") return true;
          const d = new Date(dateStr + "T00:00:00");
          return (!startDate || d >= startDate) && d <= endDate;
        })
        .reduce((sum, [, count]) => sum + count, 0);
      return { name: l.name, clicks };
    });
    const sorted = [...linkData].sort((a, b) => b.clicks - a.clicks);
    setLinkClicksData(sorted);
  }

  useEffect(() => {
    if (rawReserves.length > 0 || rawLinks.length > 0) {
      computeChartData(rawReserves, rawLinks, chartPeriod, debouncedCustomStart, debouncedCustomEnd);
    }
  }, [rawReserves, rawLinks, chartPeriod, debouncedCustomStart, debouncedCustomEnd]);

  function computeMonthlyData(reserves: ReserveType[], year: number) {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const counts = Array(12).fill(0);
    reserves.forEach((r) => {
      if (Number(r.bookingDate.year) === year && r.status === "confirmed") {
        counts[Number(r.bookingDate.month) - 1]++;
      }
    });
    setMonthlyData(months.map((name, i) => ({ name, reservas: counts[i] })));
  }

  useEffect(() => {
    if (rawReserves.length > 0) {
      computeMonthlyData(rawReserves, selectedYear);
    }
  }, [rawReserves, selectedYear]);

  return (
    <section className="flex flex-col gap-5 w-full h-full pb-8 overflow-y-auto outline-none px-1">
      {loading && <LoaderFullscreen />}
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-2 w-full">
          <LuSettings size={22} className="text-primary-gold/70 shrink-0" />
          <h1 className="text-lg sm:text-xl font-semibold text-primary-gold">
            Configurações
          </h1>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>
      {/* ── RESERVE STATS ── */}
      <div className="flex flex-col gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
          Resumo — este mês
        </span>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: <LuCalendar size={16} />,
              label: "Total",
              value: reserveStats.totalThisMonth,
              sub: `${reserveStats.confirmedThisMonth} conf. · ${reserveStats.canceledThisMonth} canc.`,
            },
            {
              icon: <LuUsers size={16} />,
              label: "Pessoas",
              value: reserveStats.peopleThisMonth,
              sub: `média ${reserveStats.avgGroupSize} por reserva`,
            },
            {
              icon: <LuTrendingDown size={16} />,
              label: "Cancelamentos",
              value: `${reserveStats.cancelRate}%`,
              sub: `${reserveStats.canceledThisMonth} canceladas`,
              red: reserveStats.cancelRate > 20,
            },
            {
              icon: <LuClock size={16} />,
              label: "Horário popular",
              value: reserveStats.mostPopularHour,
              sub: `dia: ${reserveStats.mostPopularDay}`,
            },
          ].map(({ icon, label, value, sub, red }) => (
            <div
              key={label}
              className="flex flex-col gap-1 bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-3"
            >
              <div
                className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest ${red ? "text-invalid-color/60" : "text-primary-gold/40"}`}
              >
                {icon}
                {label}
              </div>
              <span
                className={`text-2xl font-bold ${red ? "text-invalid-color" : "text-primary-gold"}`}
              >
                {typeof value === "number" ? (
                  <Counter targetValue={value} />
                ) : (
                  value
                )}
              </span>
              <span className="text-[11px] text-primary-gold/35">{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div className="flex flex-col gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
          Estatísticas — por período
        </span>

        {/* Period selector */}
        <div className="flex flex-col gap-2 bg-secondary-black/40 border border-primary-gold/15 rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "7d", label: "7 dias" },
                { key: "30d", label: "30 dias" },
                { key: "3m", label: "3 meses" },
                { key: "6m", label: "6 meses" },
                { key: "1y", label: "1 ano" },
                { key: "all", label: "Total" },
                { key: "custom", label: "Personalizado" },
              ] as {
                key: "7d" | "30d" | "3m" | "6m" | "1y" | "all" | "custom";
                label: string;
              }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartPeriod(key)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  chartPeriod === key
                    ? "border-primary-gold/50 text-primary-gold bg-primary-gold/10"
                    : "border-primary-gold/15 text-primary-gold/30 hover:border-primary-gold/30 hover:text-primary-gold/60"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="text-[10px] text-primary-gold/35 ml-auto whitespace-nowrap">
              {periodTotal} reserva{periodTotal !== 1 ? "s" : ""} no período
            </span>
          </div>
          {chartPeriod === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <DateInput value={customStart} onChange={setCustomStart} />
              <span className="text-[10px] text-primary-gold/30">até</span>
              <DateInput value={customEnd} onChange={setCustomEnd} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart — reservas por dia da semana */}
          <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <LuCalendarDays size={14} className="text-primary-gold/50" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Reservas por dia da semana
              </span>
              {chartPeriod === "all" && reserveStats.firstReserveDate && (
                <span className="text-[10px] text-primary-gold/25 ml-auto">
                  desde {reserveStats.firstReserveDate}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={dayOfWeekData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#e6c56b", fontSize: 11, opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#e6c56b", fontSize: 10, opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "rgba(230,197,107,0.05)" }}
                />
                <Bar dataKey="reservas" radius={[4, 4, 0, 0]}>
                  {dayOfWeekData.map((entry, index) => {
                    const max = Math.max(...dayOfWeekData.map((d) => d.reservas));
                    return (
                      <Cell
                        key={index}
                        fill={
                          entry.reservas === max && max > 0
                            ? GOLD
                            : GOLD_DIM + "60"
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Donut — confirmadas vs canceladas */}
          <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Confirmadas vs Canceladas
              </span>
              {chartPeriod === "all" && reserveStats.firstReserveDate && (
                <span className="text-[10px] text-primary-gold/25 ml-auto">
                  desde {reserveStats.firstReserveDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-3">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.fill }}
                      />
                      <span className="text-xs text-primary-gold/60">
                        {entry.name}
                      </span>
                    </div>
                    <span
                      className="text-xl font-bold ml-4"
                      style={{ color: entry.fill }}
                    >
                      {entry.value}
                    </span>
                    {statusData.reduce((s, e) => s + e.value, 0) > 0 && (
                      <span className="text-[10px] text-primary-gold/30 ml-4">
                        {Math.round(
                          (entry.value /
                            statusData.reduce((s, e) => s + e.value, 0)) *
                            100,
                        )}
                        %
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart — reservas por horário */}
          <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <LuClock size={14} className="text-primary-gold/50" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Reservas por horário
              </span>
              {chartPeriod === "all" && reserveStats.firstReserveDate && (
                <span className="text-[10px] text-primary-gold/25 ml-auto">
                  desde {reserveStats.firstReserveDate}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={hourData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#e6c56b", fontSize: 11, opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#e6c56b", fontSize: 10, opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "rgba(230,197,107,0.05)" }}
                />
                <Bar dataKey="reservas" radius={[4, 4, 0, 0]}>
                  {hourData.map((entry, index) => {
                    const max = Math.max(...hourData.map((d) => d.reservas));
                    return (
                      <Cell
                        key={index}
                        fill={entry.reservas === max && max > 0 ? GOLD : GOLD_DIM + "60"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — distribuição de tamanho de grupo */}
          <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <LuUsers size={14} className="text-primary-gold/50" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Tamanho de grupo
              </span>
              {chartPeriod === "all" && reserveStats.firstReserveDate && (
                <span className="text-[10px] text-primary-gold/25 ml-auto">
                  desde {reserveStats.firstReserveDate}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={groupSizeData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#e6c56b", fontSize: 10, opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#e6c56b", fontSize: 10, opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(230,197,107,0.05)" }}
                  content={(props: any) => {
                    if (!props.active || !props.payload?.length || !props.label) return null;
                    const { label } = props;
                    const items: { date: string; code: string }[] = groupSizeDetails[label] ?? [];
                    return (
                      <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs text-primary-gold shadow-lg max-w-[210px]">
                        <p className="font-semibold mb-1">{label}</p>
                        <p className="text-primary-gold/60 mb-1.5">
                          {props.payload[0].value} reserva{props.payload[0].value !== 1 ? "s" : ""}
                        </p>
                        <div className="flex flex-col gap-0.5 border-t border-primary-gold/10 pt-1.5">
                          {items.slice(0, 6).map((item, i) => (
                            <p key={i} className="text-primary-gold/55">
                              <span className="text-primary-gold/35">#{item.code}</span> — {item.date}
                            </p>
                          ))}
                          {items.length > 6 && (
                            <p className="text-primary-gold/30 italic">+{items.length - 6} mais</p>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="reservas" radius={[4, 4, 0, 0]}>
                  {groupSizeData.map((entry, index) => {
                    const max = Math.max(...groupSizeData.map((d) => d.reservas));
                    return (
                      <Cell
                        key={index}
                        fill={entry.reservas === max && max > 0 ? GOLD : GOLD_DIM + "60"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar chart — reservas mês a mês (anual) */}
        <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LuCalendar size={14} className="text-primary-gold/50" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Reservas por mês
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70 transition-all cursor-pointer"
              >
                ‹
              </button>
              <span className="text-[11px] font-semibold text-primary-gold/60 px-1 min-w-[38px] text-center">
                {selectedYear}
              </span>
              <button
                onClick={() =>
                  setSelectedYear((y) => Math.min(y + 1, new Date().getFullYear()))
                }
                disabled={selectedYear >= new Date().getFullYear()}
                className="text-[10px] px-1.5 py-0.5 rounded border border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={monthlyData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: "#e6c56b", fontSize: 11, opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#e6c56b", fontSize: 10, opacity: 0.4 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomBarTooltip />}
                cursor={{ fill: "rgba(230,197,107,0.05)" }}
              />
              <Bar dataKey="reservas" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, index) => {
                  const max = Math.max(...monthlyData.map((d) => d.reservas));
                  return (
                    <Cell
                      key={index}
                      fill={entry.reservas === max && max > 0 ? GOLD : GOLD_DIM + "60"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* ── LINK CLICKS CHART ── */}
      {linkClicksData.length > 0 && (
        <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LuExternalLink size={14} className="text-primary-gold/50" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Cliques por link
            </span>
            {chartPeriod === "all" && (
              <span className="text-[10px] text-primary-gold/25 ml-auto">
                {firstClickDate ? `desde ${firstClickDate}` : "acumulado histórico"}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={Math.max(160, linkClicksData.length * 36)}>
            <BarChart
              data={linkClicksData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fill: "#e6c56b", fontSize: 10, opacity: 0.4 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: "#e6c56b", fontSize: 11, opacity: 0.65 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-primary-black border border-primary-gold/20 rounded-lg px-3 py-2 text-xs text-primary-gold shadow-lg">
                      <p className="font-semibold mb-0.5">{label}</p>
                      <p>{payload[0].value} clique{payload[0].value !== 1 ? "s" : ""}</p>
                    </div>
                  );
                }}
                cursor={{ fill: "rgba(230,197,107,0.05)" }}
              />
              <Bar dataKey="clicks" radius={[0, 4, 4, 0]}>
                {linkClicksData.map((entry, index) => {
                  const max = Math.max(...linkClicksData.map((d) => d.clicks));
                  return (
                    <Cell
                      key={index}
                      fill={entry.clicks === max && max > 0 ? GOLD : GOLD_DIM + "60"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── DATABASE INFO ── */}
      <div className="flex flex-col gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
          Banco de dados
        </span>
        <div className="rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-0.5 bg-primary-black/30 rounded-lg p-3">
            <span className="text-[10px] text-primary-gold/40 uppercase tracking-widest">
              Usuário ativo
            </span>
            <span className="text-sm text-primary-gold/80 truncate">
              {databaseInfo.currentUserEmail || "Não identificado"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Jogos (total)",
                value: databaseInfo.boardgamesQuantity,
              },
              {
                label: "Jogos visíveis",
                value: databaseInfo.boardgamesVisible,
              },
              { label: "Jogos à venda", value: databaseInfo.boardgamesForSale },
              {
                label: "Itens cardápio",
                value: databaseInfo.menuItemsQuantity,
              },
              { label: "Avisos", value: databaseInfo.menuInfosQuantity },
              { label: "Combos", value: databaseInfo.menuCombosQuantity },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col gap-0.5 bg-primary-black/30 rounded-lg p-3"
              >
                <span className="text-[10px] text-primary-gold/40 uppercase tracking-widest">
                  {label}
                </span>
                <span className="text-xl font-semibold text-primary-gold">
                  <Counter targetValue={value} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ── MOUSE EFFECTS + RESERVE CONFIGS lado a lado ── */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Configurações de reserva */}
        <div className="flex flex-col rounded-xl border border-primary-gold/15 bg-secondary-black/40 overflow-hidden flex-1 w-full">
          <div className="flex flex-col gap-6 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Configurações de reserva
            </span>
            <div className="flex w-full gap-8 flex-wrap text-primary-gold">
              <div className="flex flex-col gap-8">
                <OptionsInput
                  label="Horários disponíveis"
                  placeholder="Horários disponíveis"
                  values={localGeneralConfigs.enabledTimes}
                  setValues={(values) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      enabledTimes: values,
                    })
                  }
                  withIndex={false}
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <OptionsInput
                  label="Dias da semana inválidos"
                  placeholder="Dias da semana inválidos"
                  values={localGeneralConfigs.disabledDays.map(
                    (day) => daysArray[day],
                  )}
                  options={daysArray}
                  setValues={(values) => {
                    const validNumbers = values
                      .map((v) => {
                        if (typeof v === "string") {
                          const lower = v.toLowerCase();
                          if (daysMap.hasOwnProperty(lower)) {
                            return daysMap[lower];
                          } else {
                            addAlert(`Dia digitado é inválido: "${v}"`);
                            return null;
                          }
                        }
                        if (typeof v === "number" && v >= 0 && v <= 6) return v;
                        return null;
                      })
                      .filter((v): v is number => v !== null);

                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      disabledDays: validNumbers,
                    });
                  }}
                  withIndex={false}
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
              </div>
              <div className="flex flex-col gap-8">
                <Input
                  placeholder="Capacidade máxima em um dia"
                  label="Capacidade máxima em um dia"
                  value={localGeneralConfigs.maxCapacityInDay.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      maxCapacityInDay: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <Input
                  placeholder="Capacidade máxima em uma reserva"
                  label="Capacidade máxima em uma reserva"
                  value={localGeneralConfigs.maxCapacityInReserve.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      maxCapacityInReserve: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <Input
                  placeholder="Permitido fazer reserva em até (meses)"
                  label="Permitido fazer reserva em até (meses)"
                  value={localGeneralConfigs.maxMonthsInAdvance.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      maxMonthsInAdvance: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
                <Input
                  placeholder="Aceitar reservas até (hora cheia)"
                  label="Aceitar reservas até (hora cheia)"
                  value={localGeneralConfigs.hoursToCloseReserve.toString()}
                  setValue={(e) =>
                    setLocalGeneralConfigs({
                      ...localGeneralConfigs,
                      hoursToCloseReserve: Number(e.target.value),
                    })
                  }
                  variant
                  width="!sm:w-[300px] !w-[280px]"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end px-4 py-3 border-t border-primary-gold/10 bg-primary-black/20">
            <SaveButton
              saving={savingSection === "reserva"}
              saved={savedSection === "reserva"}
              onClick={() => saveSection("reserva")}
            />
          </div>
        </div>

        {/* Efeitos de mouse */}
        <div className="rounded-xl border border-primary-gold/15 bg-secondary-black/40 overflow-hidden w-full md:w-auto md:shrink-0">
          <div className="p-4 flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
              Efeitos de mouse
            </span>
            <div className="flex flex-col gap-2">
              <Checkbox
                checked={localGeneralConfigs?.clickEffect}
                setChecked={(e) =>
                  setLocalGeneralConfigs({
                    ...localGeneralConfigs,
                    clickEffect: e.target.checked,
                  })
                }
                label="Ativar efeito de clique"
                variant
              />
              <Checkbox
                checked={localGeneralConfigs?.followCursor}
                setChecked={(e) =>
                  setLocalGeneralConfigs({
                    ...localGeneralConfigs,
                    followCursor: e.target.checked,
                  })
                }
                label="Ativar destaque de cursor"
                variant
              />
              <Checkbox
                checked={localGeneralConfigs?.canvasCursor}
                setChecked={(e) =>
                  setLocalGeneralConfigs({
                    ...localGeneralConfigs,
                    canvasCursor: e.target.checked,
                  })
                }
                label="Ativar efeito de cursor"
                variant
              />
            </div>
          </div>
          <div className="flex justify-end px-4 py-3 border-t border-primary-gold/10 bg-primary-black/20">
            <SaveButton
              saving={savingSection === "efeitos"}
              saved={savedSection === "efeitos"}
              onClick={() => saveSection("efeitos")}
            />
          </div>
        </div>
      </div>
      {/* ── MURAL DE FOTOS ── */}
      <DragCards />
    </section>
  );
}
