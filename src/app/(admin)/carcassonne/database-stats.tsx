"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import {
  LuBookOpen,
  LuCalendarCheck,
  LuChevronRight,
  LuCircleCheck,
  LuGlobe,
  LuLightbulb,
  LuPackage,
  LuRefreshCw,
  LuTrophy,
  LuTriangleAlert,
  LuUsers,
  LuUtensils,
} from "react-icons/lu";
import { db } from "@/services/firebaseConfig";
import type { LinkType, RentalGameType } from "@/types";
import { todaySP } from "@/rental/dates";
import { healthItems, rentalGameGaps, staleLinks, type HealthItem } from "@/utils/databaseHealth";
import { useExportSheets } from "./stats-export";

/**
 * Banco de dados: números de cada área e a "saúde dos dados".
 * Usa a contagem do Firestore (1 leitura a cada 1.000 documentos) em vez de
 * baixar as coleções inteiras.
 */

const COUNTS = {
  boardgames: ["boardgames"],
  boardgamesVisible: ["boardgames", where("isVisible", "==", true)],
  boardgamesForSale: ["boardgames", where("isForSale", "==", true)],
  boardgamesNoImage: ["boardgames", where("image", "==", "")],
  boardgamesNoDescription: ["boardgames", where("description", "==", "")],
  menuItems: ["menuItems"],
  menuVisible: ["menuItems", where("isVisible", "==", true)],
  menuNoPrice: ["menuItems", where("value", "==", "")],
  infos: ["infos"],
  combos: ["combos"],
  popups: ["popups"],
  popupsActive: ["popups", where("isActive", "==", true)],
  reserves: ["reserves"],
  reservesConfirmed: ["reserves", where("status", "==", "confirmed")],
  tables: ["tables"],
  rentalCustomers: ["rentalCustomers"],
  rentals: ["rentals"],
  rentalsFinished: ["rentals", where("status", "in", ["returned", "canceled"])],
  rentalOrders: ["rentalOrders"],
  events: ["events"],
  quizQuestions: ["quiz-questions"],
  quizParticipants: ["quiz-participants"],
  bolaoParticipants: ["bolao-participants"],
  votingEntries: ["voting-entries"],
  links: ["links"],
  carcaImages: ["carcaImages"],
  musicRecommendations: ["musicRecommendations"],
  snakeScores: ["snakeScores"],
  admins: ["admins"],
  adminRequests: ["adminRequests"],
  freelancers: ["freelancers"],
} satisfies Record<string, [string, ...QueryConstraint[]]>;

type CountKey = keyof typeof COUNTS;

/** Nomes legíveis para o Excel. */
const COUNT_LABELS: Record<string, string> = {
  boardgames: "Ludoteca: jogos",
  boardgamesVisible: "Ludoteca: visíveis",
  boardgamesForSale: "Ludoteca: à venda",
  boardgamesNoImage: "Ludoteca: sem imagem",
  boardgamesNoDescription: "Ludoteca: sem descrição",
  menuItems: "Cardápio: itens",
  menuVisible: "Cardápio: itens visíveis",
  menuNoPrice: "Cardápio: sem preço",
  infos: "Cardápio: avisos",
  combos: "Cardápio: combos",
  popups: "Cardápio: popups",
  popupsActive: "Cardápio: popups ativos",
  reserves: "Reservas",
  reservesConfirmed: "Reservas confirmadas",
  tables: "Mesas",
  rentalCustomers: "Aluguel: clientes",
  rentals: "Aluguel: aluguéis",
  rentalsFinished: "Aluguel: encerrados",
  rentalOrders: "Aluguel: pedidos",
  events: "Eventos",
  quizQuestions: "Quiz: perguntas",
  quizParticipants: "Quiz: participantes",
  bolaoParticipants: "Bolão: participantes",
  votingEntries: "Votação: opções",
  links: "Links",
  carcaImages: "Mural: fotos",
  musicRecommendations: "Músicas sugeridas",
  snakeScores: "Recordes da cobrinha",
  admins: "Administradores",
  adminRequests: "Pedidos de acesso",
  freelancers: "Freelancers",
};
type Counts = Record<CountKey, number | null>;

/** Conta uma coleção (com filtros); falha vira null ("—") sem derrubar o resto. */
async function count([name, ...constraints]: [string, ...QueryConstraint[]]): Promise<number | null> {
  try {
    const snap = await getCountFromServer(query(collection(db, name), ...constraints));
    return snap.data().count;
  } catch (error) {
    console.error(`Erro ao contar ${name}: `, error);
    return null;
  }
}

interface RentalGamesInfo {
  games: number;
  copies: number;
  noCopies: number;
  noImage: number;
}

async function rentalGamesInfo(): Promise<RentalGamesInfo | null> {
  try {
    const snap = await getDocs(collection(db, "rentalGames"));
    const games = snap.docs.map((d) => d.data() as RentalGameType);
    const gaps = rentalGameGaps(games);
    return {
      games: games.length,
      copies: games.reduce((sum, g) => sum + (g.units ?? []).length, 0),
      noCopies: gaps.noCopies,
      noImage: gaps.noImage,
    };
  } catch (error) {
    console.error("Erro ao ler os jogos de aluguel: ", error);
    return null;
  }
}

const show = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("pt-BR"));

function AreaCard({
  icon,
  title,
  href,
  main,
  rows,
}: {
  icon: ReactNode;
  title: string;
  href: string;
  main: { label: string; value: number | null | undefined };
  rows: { label: string; value: number | null | undefined }[];
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4 hover:border-primary-gold/40 transition-colors"
    >
      <div className="flex items-center gap-2 text-primary-gold/50">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">{title}</span>
        <LuChevronRight size={14} className="ml-auto text-primary-gold/25 group-hover:text-primary-gold/70 transition-colors" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-primary-gold">{show(main.value)}</span>
        <span className="text-xs text-primary-gold/45">{main.label}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col min-w-0">
            <dt className="text-[10px] uppercase tracking-wider text-primary-gold/35 truncate">{r.label}</dt>
            <dd className="text-sm font-semibold text-primary-gold/80">{show(r.value)}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

export default function DatabaseStats({ links }: { links: (LinkType & { id: string })[] }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [rental, setRental] = useState<RentalGamesInfo | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const keys = Object.keys(COUNTS) as CountKey[];
    const [values, rentalInfo] = await Promise.all([
      Promise.all(keys.map((k) => count(COUNTS[k] as [string, ...QueryConstraint[]]))),
      rentalGamesInfo(),
    ]);
    setCounts(Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Counts);
    setRental(rentalInfo);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useExportSheets(
    "banco",
    counts
      ? [
          {
            name: "Banco de dados",
            rows: [
              ["Item", "Quantidade"],
              ...(Object.entries(counts) as [string, number | null][]).map(([k, v]) => [COUNT_LABELS[k] ?? k, v ?? "—"]),
              ["Aluguel: jogos", rental?.games ?? "—"],
              ["Aluguel: cópias", rental?.copies ?? "—"],
            ],
          },
        ]
      : [],
  );

  if (!counts) return <p className="text-xs text-primary-gold/50 px-1">Contando os dados...</p>;

  const health: HealthItem[] = healthItems({
    boardgamesNoImage: counts.boardgamesNoImage ?? 0,
    boardgamesNoDescription: counts.boardgamesNoDescription ?? 0,
    menuNoPrice: counts.menuNoPrice ?? 0,
    rentalGamesNoCopies: rental?.noCopies ?? 0,
    rentalGamesNoImage: rental?.noImage ?? 0,
    staleLinks: staleLinks(links, todaySP()),
    pendingAdminRequests: counts.adminRequests ?? 0,
    finishedRentals: counts.rentalsFinished ?? 0,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-primary-gold/40">
          {updatedAt
            ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </span>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-primary-gold/15 text-primary-gold/55 hover:border-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer disabled:opacity-40"
        >
          <LuRefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* Saúde dos dados */}
      <div className="flex flex-col gap-2 rounded-xl border border-primary-gold/15 bg-secondary-black/40 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/45">Saúde dos dados</span>
        {health.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-300">
            <LuCircleCheck size={16} /> Tudo em ordem: nada faltando por aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {health.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-2.5 rounded-lg bg-primary-black/30 px-3 py-2 text-sm hover:bg-primary-black/50 transition-colors"
                >
                  {item.tone === "warn" ? (
                    <LuTriangleAlert size={15} className="shrink-0 mt-0.5 text-orange-300" />
                  ) : (
                    <LuLightbulb size={15} className="shrink-0 mt-0.5 text-primary-gold/50" />
                  )}
                  <span className="flex-1 min-w-0 text-primary-gold/80">{item.text}</span>
                  <span className="shrink-0 text-[11px] text-primary-gold/35 group-hover:text-primary-gold transition-colors">
                    Resolver →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Áreas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AreaCard
          icon={<LuBookOpen size={14} />}
          title="Ludoteca"
          href="/collection"
          main={{ label: "jogos", value: counts.boardgames }}
          rows={[
            { label: "Visíveis", value: counts.boardgamesVisible },
            { label: "À venda", value: counts.boardgamesForSale },
          ]}
        />
        <AreaCard
          icon={<LuUtensils size={14} />}
          title="Cardápio"
          href="/menu"
          main={{ label: "itens", value: counts.menuItems }}
          rows={[
            { label: "Itens visíveis", value: counts.menuVisible },
            { label: "Combos", value: counts.combos },
            { label: "Avisos", value: counts.infos },
            { label: "Popups ativos", value: counts.popupsActive },
          ]}
        />
        <AreaCard
          icon={<LuCalendarCheck size={14} />}
          title="Reservas"
          href="/myreserves"
          main={{ label: "reservas", value: counts.reserves }}
          rows={[
            { label: "Confirmadas", value: counts.reservesConfirmed },
            { label: "Mesas", value: counts.tables },
          ]}
        />
        <AreaCard
          icon={<LuPackage size={14} />}
          title="Aluguel"
          href="/aluguel-admin"
          main={{ label: "jogos para aluguel", value: rental?.games ?? null }}
          rows={[
            { label: "Cópias", value: rental?.copies ?? null },
            { label: "Clientes", value: counts.rentalCustomers },
            { label: "Aluguéis", value: counts.rentals },
            { label: "Pedidos", value: counts.rentalOrders },
          ]}
        />
        <AreaCard
          icon={<LuTrophy size={14} />}
          title="Eventos"
          href="/eventos"
          main={{ label: "eventos", value: counts.events }}
          rows={[
            { label: "Perguntas do quiz", value: counts.quizQuestions },
            { label: "Participantes do quiz", value: counts.quizParticipants },
            { label: "Participantes do bolão", value: counts.bolaoParticipants },
            { label: "Opções de votação", value: counts.votingEntries },
          ]}
        />
        <AreaCard
          icon={<LuGlobe size={14} />}
          title="Site"
          href="/links"
          main={{ label: "links", value: counts.links }}
          rows={[
            { label: "Fotos do mural", value: counts.carcaImages },
            { label: "Músicas sugeridas", value: counts.musicRecommendations },
            { label: "Recordes da cobrinha", value: counts.snakeScores },
          ]}
        />
        <AreaCard
          icon={<LuUsers size={14} />}
          title="Equipe"
          href="/usuarios"
          main={{ label: "administradores", value: counts.admins }}
          rows={[
            { label: "Pedidos de acesso", value: counts.adminRequests },
            { label: "Freelancers", value: counts.freelancers },
          ]}
        />
      </div>
    </div>
  );
}
