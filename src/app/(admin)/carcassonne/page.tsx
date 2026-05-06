"use client";

import Button from "@/components/button";
import Checkbox from "@/components/checkbox";
import { useAlert } from "@/contexts/alertProvider";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import ReserveRepository from "@/services/repositories/ReserveRepository";
import { GeneralConfigsType, ReserveType } from "@/types";
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
} from "react-icons/lu";
import { onAuthStateChanged } from "firebase/auth";
import BoardgameRepository from "@/services/repositories/BoardGameRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import ComboRepository from "@/services/repositories/ComboRepository";
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

  const [dayOfWeekData, setDayOfWeekData] = useState<
    { name: string; reservas: number }[]
  >([]);
  const [dayOfWeekDataAll, setDayOfWeekDataAll] = useState<
    { name: string; reservas: number }[]
  >([]);
  const [chartPeriod, setChartPeriod] = useState<"30d" | "all">("30d");
  const [statusData, setStatusData] = useState<
    { name: string; value: number; fill: string }[]
  >([]);

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

    const dayData = DAY_NAMES.map((name, i) => ({
      name,
      reservas: dowCount[i],
    }));

    // Status pie
    const allConfirmed = reserves.filter(
      (r) => r.status === "confirmed",
    ).length;
    const allCanceled = reserves.filter((r) => r.status === "canceled").length;

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

    // All-time day of week
    const dowCountAll = [0, 0, 0, 0, 0, 0, 0];
    reserves.forEach((r) => {
      if (r.status === "confirmed") {
        const d = new Date(
          Number(r.bookingDate.year),
          Number(r.bookingDate.month) - 1,
          Number(r.bookingDate.day),
        );
        dowCountAll[d.getDay()]++;
      }
    });
    setDayOfWeekDataAll(
      DAY_NAMES.map((name, i) => ({ name, reservas: dowCountAll[i] })),
    );

    setDayOfWeekData(dayData);
    setStatusData([
      { name: "Confirmadas", value: allConfirmed, fill: GOLD },
      { name: "Canceladas", value: allCanceled, fill: RED },
    ]);
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
        ] = await Promise.all([
          getCurrentUserEmail(),
          BoardgameRepository.getAll(),
          MenuItemRepository.getAll(),
          InfoRepository.getAll(),
          ComboRepository.getAll(),
          ReserveRepository.getAll(),
        ]);

        setDatabaseInfo({
          currentUserEmail: userEmail,
          boardgamesQuantity: boardgames.length,
          boardgamesVisible: boardgames.filter((b) => b.isVisible).length,
          boardgamesForSale: boardgames.filter((b) => b.isForSale).length,
          menuItemsQuantity: menuItems.length,
          menuInfosQuantity: menuInfos.length,
          menuCombosQuantity: menuCombos.length,
        });

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

  const saveGeneralConfigs = async () => {
    try {
      if (!localGeneralConfigs || !localGeneralConfigs._id) {
        addAlert("ID Inválido.");
        return;
      }
      await GeneralConfigsRepository.update({ ...localGeneralConfigs });
      window.location.reload();
    } catch (error) {
      addAlert(`Erro ao alterar configurações: ${error}`);
    }
  };

  return (
    <section className="flex flex-col gap-5 w-full h-full pb-24 overflow-y-auto outline-none px-1">
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
          Reservas — este mês
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart — reservas por dia da semana */}
          <div className="bg-secondary-black/40 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <LuCalendarDays size={14} className="text-primary-gold/50" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">
                Reservas por dia da semana
              </span>
              <div className="flex items-center gap-1 ml-auto">
                {(["30d", "all"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                      chartPeriod === p
                        ? "border-primary-gold/50 text-primary-gold bg-primary-gold/10"
                        : "border-primary-gold/15 text-primary-gold/30 hover:border-primary-gold/30 hover:text-primary-gold/60"
                    }`}
                  >
                    {p === "30d" ? "30 dias" : "Total"}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={chartPeriod === "30d" ? dayOfWeekData : dayOfWeekDataAll}
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
                  {(chartPeriod === "30d"
                    ? dayOfWeekData
                    : dayOfWeekDataAll
                  ).map((entry, index) => {
                    const active =
                      chartPeriod === "30d" ? dayOfWeekData : dayOfWeekDataAll;
                    const max = Math.max(...active.map((d) => d.reservas));
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
              <div className="flex flex-col items-end ml-auto">
                <span className="text-[10px] text-primary-gold/25">
                  histórico total
                </span>
                {reserveStats.firstReserveDate && (
                  <span className="text-[10px] text-primary-gold/20">
                    desde {reserveStats.firstReserveDate}
                  </span>
                )}
              </div>
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
        </div>
      </div>
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
        <div className="flex flex-col gap-6 rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 pb-6 flex-1 w-full">
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

        {/* Efeitos de mouse */}
        {/* Efeitos de mouse */}
        <div className="rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 flex flex-col gap-3 w-full md:w-auto md:shrink-0">
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
      </div>{" "}
      {/* end flex-col md:flex-row */}
      {/* ── MURAL DE FOTOS ── */}
      <DragCards />
      {/* Save footer */}
      <div className="fixed bottom-0 left-0 md:left-[220px] right-0 flex px-4 justify-center py-3 bg-primary-black/80 backdrop-blur-[6px] border-t border-primary-gold/10 z-40">
        <Button onClick={saveGeneralConfigs}>Salvar configurações</Button>
      </div>
    </section>
  );
}
