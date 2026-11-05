"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiTrash2 } from "react-icons/fi";
import type { RentalGameType, RentalRulesType, RentalSettingsType } from "@/types";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { accountApi, rentalApi } from "@/services/rentalApi";
import { availabilityFor } from "@/rental/availability";
import { addDays, formatDateBR, todaySP, weekdayOf } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { isProfileComplete, ORDER_ERROR_MESSAGES, type OrderErrorCode } from "@/rental/orders";
import { withNext } from "@/rental/navigation";
import { useRentalCart } from "../useRentalCart";
import { useRentalCustomer } from "../useRentalCustomer";
import RentalHeader from "../rentalHeader";
import { RulesLink } from "../rulesSheet";

type Game = RentalGameType & { id: string };

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const card = "bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3";
const heading = "text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60";
const smallBtn =
  "h-8 px-3 rounded-full border border-primary-gold/40 text-xs text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/** Checkout do aluguel: revisão do carrinho, data de retirada e confirmação. */
export default function PedidoPage() {
  const router = useRouter();
  const cart = useRentalCart();
  const { user, customer, loading, emailVerified, reloadUser } = useRentalCustomer();
  const [games, setGames] = useState<Game[] | null>(null);
  const [settings, setSettings] = useState<RentalSettingsType | null>(null);
  const [rules, setRules] = useState<RentalRulesType | null>(null);
  const [today, setToday] = useState(() => todaySP());
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flaggedId, setFlaggedId] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [done, setDone] = useState<{ code: string } | null>(null);

  useEffect(() => RentalGameRepository.subscribeToAll(setGames), []);
  useEffect(() => RentalConfigRepository.subscribeSettings(setSettings), []);
  useEffect(() => RentalConfigRepository.subscribeRules(setRules), []);
  useEffect(() => {
    const id = setInterval(() => setToday(todaySP()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dates = useMemo(() => {
    if (!settings) return [];
    return Array.from({ length: settings.maxAdvanceDays + 1 }, (_, i) => {
      const date = addDays(today, i);
      return { date, enabled: settings.pickupWeekdays.includes(weekdayOf(date)) };
    });
  }, [settings, today]);

  const startDate = useMemo(() => {
    const chosen = dates.find((d) => d.date === chosenDate && d.enabled);
    return chosen?.date ?? dates.find((d) => d.enabled)?.date ?? null;
  }, [dates, chosenDate]);

  const items = useMemo(
    () =>
      cart.gameIds.map((id) => {
        const game = games?.find((g) => g.id === id);
        return { id, game: game && game.isActive ? game : null };
      }),
    [cart.gameIds, games],
  );

  const validGames = items.flatMap((i) => (i.game ? [i.game] : []));
  const hasInvalid = items.some((i) => !i.game);
  const tooMany = !!settings && cart.gameIds.length > settings.maxGamesPerOrder;
  const total = validGames.reduce((sum, g) => sum + g.price, 0);

  function changeDate(date: string) {
    setChosenDate(date);
    setError(null);
    setFlaggedId(null);
  }

  async function resend() {
    setVerifyBusy(true);
    const result = await accountApi.sendVerification("aluguel");
    setVerifyMsg(result.ok ? "E-mail de confirmação enviado." : result.message);
    setVerifyBusy(false);
  }

  async function confirmedEmail() {
    setVerifyBusy(true);
    try {
      await reloadUser();
      setVerifyMsg(null);
    } catch {
      setVerifyMsg("Não foi possível verificar agora. Tente novamente.");
    }
    setVerifyBusy(false);
  }

  async function submit() {
    if (!settings || !rules || !startDate || sending) return;
    if (!user) {
      router.push("/aluguel/entrar?next=/aluguel/pedido");
      return;
    }
    if (!isProfileComplete(customer, settings.requireCpf)) {
      router.push(withNext("/aluguel/minha-conta", "/aluguel/pedido"));
      return;
    }
    if (!emailVerified) return;
    setSending(true);
    setError(null);
    setFlaggedId(null);
    const result = await rentalApi.createOrder({
      gameIds: cart.gameIds,
      startDate,
      rulesVersion: rules.version,
    });
    setSending(false);
    if (result.ok) {
      cart.clear();
      setDone({ code: result.data.code });
      return;
    }
    const known = ORDER_ERROR_MESSAGES[result.code as OrderErrorCode];
    setError(result.message || known || "Erro inesperado. Tente novamente.");
    setFlaggedId(result.gameId ?? null);
  }

  const dataReady = games !== null && settings !== null && rules !== null;
  const needsLogin = !loading && !user;
  const needsProfile =
    !loading && !!user && !!settings && !isProfileComplete(customer, settings.requireCpf);
  const needsVerify = !loading && !!user && !emailVerified && !needsProfile;
  const blocked =
    !dataReady ||
    loading ||
    sending ||
    cart.gameIds.length === 0 ||
    hasInvalid ||
    tooMany ||
    !startDate ||
    settings?.isEnabled === false ||
    (!needsLogin && !needsProfile && (!accepted || needsVerify));

  let buttonLabel = "Confirmar aluguel";
  if (sending) buttonLabel = "Enviando...";
  else if (needsLogin) buttonLabel = "Entrar para confirmar";
  else if (needsProfile) buttonLabel = "Completar cadastro";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}</style>
      <div className="relative min-h-screen text-primary-gold flex flex-col pb-14 pt-4 gap-5">
        <RentalHeader cartCount={cart.gameIds.length} />
        <main className="flex flex-col gap-4 w-full max-w-2xl mx-auto px-4">
          <Link
            href="/aluguel"
            className="self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/70 hover:text-primary-gold transition-colors"
          >
            <FiArrowLeft size={15} />
            <span className="text-sm font-medium">Voltar aos jogos</span>
          </Link>
          <h1 className="font-cinzel text-xl sm:text-3xl text-center tracking-widest uppercase">
            Seu pedido
          </h1>

          {done ? (
            <section className={`${card} items-center text-center`}>
              <FiCheckCircle size={36} className="text-green-400" />
              <h2 className="font-cinzel text-lg">Aluguel confirmado!</h2>
              <p className="text-sm text-primary-gold/80">Código do pedido</p>
              <p className="font-mono text-2xl tracking-widest text-primary-gold">{done.code}</p>
              <p className="text-sm text-primary-gold/70">
                Retire os jogos no balcão do Carcassonne Pub e pague na retirada.
              </p>
              <Link href="/aluguel/minha-conta" className={`${smallBtn} flex items-center`}>
                Ver meus aluguéis
              </Link>
            </section>
          ) : !games || !settings || !rules ? (
            <p className="text-sm text-primary-gold/55 text-center">Carregando...</p>
          ) : cart.gameIds.length === 0 ? (
            <section className={`${card} items-center text-center`}>
              <p className="text-sm text-primary-gold/75">Seu pedido está vazio.</p>
              <Link href="/aluguel" className={`${smallBtn} flex items-center`}>
                Escolher jogos
              </Link>
            </section>
          ) : (
            <>
              {settings.isEnabled === false && (
                <p
                  role="alert"
                  className="px-3 py-2 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200"
                >
                  {ORDER_ERROR_MESSAGES.service_disabled}
                </p>
              )}

              <section className={card}>
                <h2 className={heading}>Jogos</h2>
                <ul className="flex flex-col gap-2">
                  {items.map(({ id, game }) => {
                    const av = game && startDate ? availabilityFor(game, startDate, today) : null;
                    const next = av && !av.ok ? av.nextStart : null;
                    const canUseNext = !!next && dates.some((d) => d.date === next && d.enabled);
                    const flagged = flaggedId === id || (av !== null && !av.ok);
                    return (
                      <li
                        key={id}
                        className={`flex flex-col gap-1.5 p-2.5 rounded-lg border ${
                          flagged
                            ? "border-orange-400/50 bg-orange-500/10"
                            : "border-primary-gold/10"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-sm min-w-0 break-words ${
                              game ? "" : "line-through text-primary-gold/50"
                            }`}
                          >
                            {game ? game.name : "Jogo removido"}
                          </span>
                          <button
                            type="button"
                            onClick={() => cart.remove(id)}
                            aria-label={`Remover ${game ? game.name : "item"} do pedido`}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full border border-primary-gold/20 text-primary-gold/70 hover:text-primary-gold hover:border-primary-gold/50 cursor-pointer"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                        {!game && <p className="text-xs text-orange-200">não está mais disponível</p>}
                        {av && (
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            {av.ok ? (
                              <span className="text-green-400">Disponível</span>
                            ) : (
                              <span className="text-orange-200">
                                {av.nextStart
                                  ? `Disponível a partir de ${formatDateBR(av.nextStart)}`
                                  : "Indisponível para esta data"}
                              </span>
                            )}
                            {canUseNext && next && (
                              <button
                                type="button"
                                className={smallBtn}
                                onClick={() => changeDate(next)}
                              >
                                Usar esta data
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {tooMany && (
                  <p role="alert" className="text-xs text-orange-200">
                    Você pode alugar no máximo {settings.maxGamesPerOrder} jogos por pedido.
                    Remova {cart.gameIds.length - settings.maxGamesPerOrder} para continuar.
                  </p>
                )}
                {hasInvalid && (
                  <p className="text-xs text-orange-200">
                    Remova os jogos indisponíveis para continuar.
                  </p>
                )}
              </section>

              <section className={card}>
                <h2 className={heading}>Data de retirada</h2>
                {startDate === null ? (
                  <p className="text-sm text-orange-200">
                    Não há datas de retirada disponíveis no momento.
                  </p>
                ) : (
                  <div
                    className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                    role="radiogroup"
                    aria-label="Data de retirada"
                  >
                    {dates.map(({ date, enabled }) => {
                      const selected = date === startDate;
                      return (
                        <button
                          key={date}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={!enabled}
                          onClick={() => changeDate(date)}
                          className={`flex flex-col items-center py-1.5 rounded-lg border text-xs transition-colors ${
                            selected
                              ? "border-primary-gold/70 bg-primary-gold/15 text-primary-gold"
                              : enabled
                                ? "border-primary-gold/20 text-primary-gold/80 hover:border-primary-gold/50 cursor-pointer"
                                : "border-primary-gold/10 text-primary-gold/25 line-through cursor-not-allowed"
                          }`}
                        >
                          <span className="uppercase text-[10px]">{WEEKDAYS[weekdayOf(date)]}</span>
                          <span className="text-sm font-semibold">{formatDateBR(date)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className={card}>
                <h2 className={heading}>Resumo</h2>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {validGames.map((g) => (
                    <li key={g.id} className="flex justify-between gap-3">
                      <span className="min-w-0 break-words">
                        {g.name}
                        {startDate && (
                          <span className="block text-xs text-primary-gold/55">
                            Devolução até {formatDateBR(addDays(startDate, g.rentalDays), true)}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0">{formatBRL(g.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-primary-gold/15 pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatBRL(total)}</span>
                </div>
                <p className="text-xs text-primary-gold/60">Pagamento no balcão, na retirada.</p>
              </section>

              <label className="flex items-start gap-2.5 text-sm text-primary-gold/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-[#e6c56b]"
                />
                <span>
                  Li e aceito as{" "}
                  <RulesLink className="underline text-primary-gold cursor-pointer">
                    regras do aluguel
                  </RulesLink>{" "}
                  (versão {rules.version}).
                </span>
              </label>

              {needsVerify && (
                <div
                  role="status"
                  className="flex flex-col gap-2 px-3 py-2.5 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200"
                >
                  <p className="break-words">
                    Confirme seu e-mail para alugar jogos. Enviamos um link de confirmação para{" "}
                    {user?.email}.
                  </p>
                  {verifyMsg && <p>{verifyMsg}</p>}
                  <div className="flex gap-2">
                    <button type="button" disabled={verifyBusy} onClick={resend} className={smallBtn}>
                      Reenviar
                    </button>
                    <button
                      type="button"
                      disabled={verifyBusy}
                      onClick={confirmedEmail}
                      className={smallBtn}
                    >
                      Já confirmei
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="px-3 py-2 rounded-xl border border-red-400/40 bg-red-500/10 text-sm text-red-200"
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={blocked}
                className="h-11 rounded-xl bg-primary-gold text-primary-black font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonLabel}
              </button>
            </>
          )}
        </main>
      </div>
    </>
  );
}
