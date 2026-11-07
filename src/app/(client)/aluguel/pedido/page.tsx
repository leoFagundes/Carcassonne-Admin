"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiTrash2 } from "react-icons/fi";
import { LuShoppingBag } from "react-icons/lu";
import ShowcaseImage from "@/components/showcase/showcaseImage";
import { BOARDGAME_PLACEHOLDER } from "@/app/(client)/clientCollection/collectionUtils";
import type { RentalGameType, RentalRulesType, RentalSettingsType } from "@/types";
import RentalGameRepository from "@/services/repositories/RentalGameRepository";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { accountApi, rentalApi } from "@/services/rentalApi";
import { availabilityFor, availabilityOptions, blockReason, dueDateFor, gapDaysOf, type BlockReason } from "@/rental/availability";
import { withLiveBookings } from "@/rental/payments";
import { addDays, formatDateBR, todaySP, weekdayOf } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { isProfileComplete, ORDER_ERROR_MESSAGES, type OrderErrorCode } from "@/rental/orders";
import { withNext } from "@/rental/navigation";
import { clearPendingOrder, rememberPendingOrder, takePendingOrder } from "@/rental/pendingOrder";
import { useRentalCart } from "../useRentalCart";
import { useRentalCustomer } from "../useRentalCustomer";
import RentalPageShell from "../rentalPageShell";
import RentalSteps from "../rentalSteps";
import { CopyCode, NextSteps, dayLabel } from "../orderBits";
import { RulesLink } from "../rulesSheet";

type Game = RentalGameType & { id: string };


const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const card = "bg-secondary-black/60 border border-primary-gold/15 rounded-xl p-4 flex flex-col gap-3";
const heading = "text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60";
const smallBtn =
  "h-8 px-3 rounded-full border border-primary-gold/40 text-xs text-primary-gold hover:bg-primary-gold/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const mainBtn =
  "h-11 px-4 rounded-xl bg-primary-gold text-primary-black text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";
const ghostBtn =
  "h-11 px-4 rounded-xl border border-primary-gold/40 text-primary-gold text-sm font-semibold hover:bg-primary-gold/10 transition-colors inline-flex items-center justify-center";

/** Por que o jogo não sai nessa data, em palavras do cliente. */
function reasonText(r: BlockReason, gapDays: number): string {
  if (r.kind === "no_copies") return "Este jogo está sem cópias disponíveis no momento.";
  const all = r.copies > 1 ? `As ${r.copies} cópias estão ocupadas nessa data. ` : "";
  const gap = gapDays > 1 ? ` O pub deixa ${gapDays} dias de folga entre um aluguel e outro.` : "";
  if (r.kind === "with_customer") return `${all}Está com outro cliente até ${formatDateBR(r.until)}.${gap}`;
  if (r.kind === "reserved") {
    return `${all}Já reservado por outro cliente de ${formatDateBR(r.from)} a ${formatDateBR(r.to)}.${gap}`;
  }
  return `${all}Já reservado de ${formatDateBR(r.from)} a ${formatDateBR(r.to)}, e o pub não permite reservar para depois de outro cliente.`;
}

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
  const [redirecting, setRedirecting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; startDate: string; dueDate?: string; total: number } | null>(null);

  // Voltou do Mercado Pago (botão voltar, página recarregada ou restaurada do cache):
  // o pedido já existe, então a tela certa é a página dele, não um checkout travado.
  useEffect(() => {
    const pending = takePendingOrder();
    if (pending) router.replace(`/aluguel/pedido/${encodeURIComponent(pending)}`);
  }, [router]);
  useEffect(() => {
    if (!createdOrderId) return;
    const onShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      clearPendingOrder();
      setRedirecting(false);
      router.replace(`/aluguel/pedido/${encodeURIComponent(createdOrderId)}`);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [createdOrderId, router]);

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

  const online = settings?.onlinePayment?.enabled === true;

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
    if (!result.ok || !online) setSending(false);
    if (result.ok) {
      cart.clear();
      if (online) {
        rememberPendingOrder(result.data.orderId);
        setCreatedOrderId(result.data.orderId);
        setRedirecting(true);
        if (result.data.checkoutUrl) {
          // Segue para o Mercado Pago na mesma aba.
          window.location.assign(result.data.checkoutUrl);
        } else {
          // Pedido criado, mas sem link de pagamento: a página do pedido reabre o checkout.
          router.push(`/aluguel/pedido/${encodeURIComponent(result.data.orderId)}`);
        }
        return;
      }
      const dues = validGames.map((g) => dueDateFor(startDate, g.rentalDays, availabilityOptions(settings))).sort();
      setDone({ code: result.data.code, startDate, dueDate: dues[0], total });
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

  let buttonLabel = online ? "Ir para o pagamento" : "Confirmar aluguel";
  if (sending) buttonLabel = online ? "Abrindo o pagamento..." : "Enviando...";
  else if (needsLogin) buttonLabel = "Entrar para confirmar";
  else if (needsProfile) buttonLabel = "Completar cadastro";

  const avOpts = availabilityOptions(settings);
  const liveGames = validGames.map((g) => withLiveBookings(g, Date.now()));
  /** Primeira/última data liberada para retirada em que o jogo está livre (para sugerir). */
  const okOn = (game: Game, date: string) =>
    availabilityFor(withLiveBookings(game, Date.now()), date, today, avOpts).ok;
  const busyDates = new Set(
    dates
      .filter((d) => d.enabled && liveGames.some((g) => !availabilityFor(g, d.date, today, avOpts).ok))
      .map((d) => d.date),
  );
  const returnDates = startDate ? validGames.map((g) => dueDateFor(startDate, g.rentalDays, avOpts)) : [];
  const firstReturn = returnDates.length ? [...returnDates].sort()[0] : undefined;
  const showSteps = !redirecting && !done && dataReady && cart.gameIds.length > 0;

  return (
    <RentalPageShell
      title={done ? "Aluguel confirmado" : "Seu pedido"}
      cartCount={cart.gameIds.length}
      top={
        done ? (
          <RentalSteps current="retirada" online={false} />
        ) : showSteps ? (
          <RentalSteps current="pedido" online={online} />
        ) : null
      }
    >
      {redirecting ? (
        <section className={`${card} items-center text-center py-8`} role="status">
          <span
            aria-hidden="true"
            className="w-10 h-10 rounded-full border-2 border-primary-gold/25 border-t-primary-gold animate-spin"
          />
          <h2 className="font-cinzel text-lg">Levando você ao pagamento…</h2>
          <p className="text-sm text-primary-gold/70">
            Suas cópias já estão reservadas. Não feche esta página.
          </p>
        </section>
      ) : done ? (
        <>
          <section className={`${card} items-center text-center py-6`}>
            <FiCheckCircle size={44} className="text-emerald-400" />
            <h2 className="font-cinzel text-xl">Tudo certo!</h2>
            <p className="text-sm text-primary-gold/75 max-w-sm">
              Seus jogos estão reservados. Mandamos os detalhes para o seu e-mail.
            </p>
            <CopyCode code={done.code} />
          </section>
          <NextSteps
            mode="pickup"
            startDate={done.startDate}
            dueDate={done.dueDate}
            code={done.code}
            payAtCounter={done.total}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/aluguel/minha-conta" className={`${mainBtn} flex-1`}>
              Ver meus aluguéis
            </Link>
            <Link href="/aluguel" className={`${ghostBtn} flex-1`}>
              Continuar vendo jogos
            </Link>
          </div>
        </>
      ) : !games || !settings || !rules ? (
        <p className="text-sm text-primary-gold/55 text-center">Carregando...</p>
      ) : cart.gameIds.length === 0 ? (
        <section className={`${card} items-center text-center py-8`}>
          <LuShoppingBag size={36} className="text-primary-gold/50" />
          <h2 className="font-cinzel text-lg">Seu pedido está vazio</h2>
          <p className="text-sm text-primary-gold/70">Escolha os jogos que quer levar para casa.</p>
          <Link href="/aluguel" className={mainBtn}>
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

          {/* 1. Jogos */}
          <section className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={heading}>
                1. Jogos <span className="text-primary-gold/40">({cart.gameIds.length})</span>
              </h2>
              <Link href="/aluguel" className="text-xs text-primary-gold/60 underline underline-offset-2 hover:text-primary-gold">
                + Adicionar mais
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {items.map(({ id, game }) => {
                const av =
                  game && startDate
                    ? availabilityFor(withLiveBookings(game, Date.now()), startDate, today, availabilityOptions(settings))
                    : null;
                const reason =
                  game && startDate && av && !av.ok
                    ? blockReason(withLiveBookings(game, Date.now()), startDate, today, avOpts)
                    : null;
                // Datas liberadas mais próximas, antes e depois, em que este jogo sai.
                const open = game && av && !av.ok && startDate ? dates.filter((d) => d.enabled && okOn(game, d.date)) : [];
                const before = startDate ? [...open].reverse().find((d) => d.date < startDate)?.date : undefined;
                const after = startDate ? open.find((d) => d.date > startDate)?.date : undefined;
                const flagged = flaggedId === id || (av !== null && !av.ok) || !game;
                return (
                  <li
                    key={id}
                    className={`flex gap-3 p-2.5 rounded-lg border ${
                      flagged ? "border-orange-400/50 bg-orange-500/10" : "border-primary-gold/10 bg-primary-black/30"
                    }`}
                  >
                    <ShowcaseImage
                      src={game?.image ?? ""}
                      placeholder={BOARDGAME_PLACEHOLDER}
                      className="w-14 h-14 rounded-lg shrink-0"
                    />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-medium min-w-0 break-words ${game ? "" : "line-through text-primary-gold/50"}`}>
                          {game ? game.name : "Jogo removido"}
                        </span>
                        {game && <span className="shrink-0 text-sm font-semibold">{formatBRL(game.price)}</span>}
                      </div>
                      {!game ? (
                        <span className="text-xs text-orange-200">Não está mais disponível — remova para continuar.</span>
                      ) : av && !av.ok ? (
                        <div className="flex flex-col gap-1 text-xs text-orange-200">
                          <span className="font-semibold">Não sai em {formatDateBR(startDate!)}.</span>
                          {reason && <span className="text-orange-100/85">{reasonText(reason, gapDaysOf(avOpts))}</span>}
                          {settings.allowQueue === false && !after && reason && reason.kind !== "no_copies" && (
                            <span className="text-orange-100/85">
                              Depois disso, o pub só libera novas reservas quando a cópia voltar.
                            </span>
                          )}
                          <span className="text-orange-100/85">
                            {before || after
                              ? "Escolha uma destas datas para retirar:"
                              : `Nenhuma data livre nos próximos ${settings.maxAdvanceDays} dias. Remova o jogo para seguir com os outros.`}
                          </span>
                        </div>
                      ) : (
                        startDate && (
                          <span className="text-xs text-primary-gold/55">
                            Fica com você {game.rentalDays} {game.rentalDays === 1 ? "dia" : "dias"} · devolva até{" "}
                            {formatDateBR(dueDateFor(startDate, game.rentalDays, avOpts))}
                            {dueDateFor(startDate, game.rentalDays, avOpts) !== addDays(startDate, game.rentalDays) &&
                              ` (o pub não abre em ${formatDateBR(addDays(startDate, game.rentalDays))}, então vai para o próximo dia aberto)`}
                          </span>
                        )
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {[before, after].filter((d): d is string => !!d).map((d) => (
                          <button key={d} type="button" className={smallBtn} onClick={() => changeDate(d)}>
                            Retirar {dayLabel(d)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => cart.remove(id)}
                          className="flex items-center gap-1 text-[11px] text-primary-gold/50 hover:text-red-300 cursor-pointer"
                        >
                          <FiTrash2 size={12} /> Remover
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {tooMany && (
              <p role="alert" className="text-xs text-orange-200">
                Você pode alugar no máximo {settings.maxGamesPerOrder} jogos por pedido. Remova{" "}
                {cart.gameIds.length - settings.maxGamesPerOrder} para continuar.
              </p>
            )}
          </section>

          {/* 2. Retirada */}
          <section className={card}>
            <h2 className={heading}>2. Quando você vai retirar?</h2>
            {startDate === null ? (
              <p className="text-sm text-orange-200">Não há datas de retirada disponíveis no momento.</p>
            ) : (
              <>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Data de retirada">
                  {dates.map(({ date, enabled }) => {
                    const selected = date === startDate;
                    const busy = enabled && busyDates.has(date);
                    return (
                      <button
                        key={date}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!enabled}
                        onClick={() => changeDate(date)}
                        title={!enabled ? "Sem retirada neste dia" : busy ? "Algum jogo do pedido já está reservado nesse período" : undefined}
                        className={`relative flex flex-col items-center py-2 rounded-lg border text-xs transition-colors ${
                          selected
                            ? "border-primary-gold bg-primary-gold text-primary-black"
                            : enabled
                              ? "border-primary-gold/20 text-primary-gold/80 hover:border-primary-gold/50 cursor-pointer"
                              : "border-primary-gold/5 text-primary-gold/20 cursor-not-allowed"
                        }`}
                      >
                        <span className="uppercase text-[10px]">
                          {date === today ? "hoje" : WEEKDAYS[weekdayOf(date)]}
                        </span>
                        <span className={`text-sm font-semibold ${busy && !selected ? "line-through decoration-orange-300/70" : ""}`}>
                          {formatDateBR(date)}
                        </span>
                        {busy && (
                          <span
                            aria-label="Ocupado para algum jogo do pedido"
                            className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${selected ? "bg-primary-black" : "bg-orange-400"}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {busyDates.size > 0 && (
                  <p className="flex items-center gap-1.5 text-[11px] text-primary-gold/55">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" /> Datas riscadas: algum jogo do seu pedido não
                    está livre nesse dia (o motivo aparece no jogo).
                  </p>
                )}
                <p className="text-xs text-primary-gold/60">
                  Retirada no balcão do Carcassonne a partir de <strong className="text-primary-gold">{dayLabel(startDate)}</strong>
                  {firstReturn && (
                    <>
                      {" "}· devolução até <strong className="text-primary-gold">{dayLabel(firstReturn)}</strong>
                    </>
                  )}
                  .
                </p>
              </>
            )}
          </section>

          {/* 3. Confirmar: o que falta para concluir */}
          <section className={card}>
            <h2 className={heading}>3. Confirmar</h2>
            {needsLogin ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-primary-gold/80">Para confirmar, entre na sua conta ou crie uma — leva um minuto.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href={withNext("/aluguel/entrar", "/aluguel/pedido")} className={`${mainBtn} flex-1`}>
                    Entrar
                  </Link>
                  <Link href={withNext("/aluguel/cadastro", "/aluguel/pedido")} className={`${ghostBtn} flex-1`}>
                    Criar conta
                  </Link>
                </div>
              </div>
            ) : needsProfile ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-primary-gold/80">Falta completar seu cadastro (nome, WhatsApp e CPF).</p>
                <Link href={withNext("/aluguel/minha-conta", "/aluguel/pedido")} className={mainBtn}>
                  Completar cadastro
                </Link>
              </div>
            ) : (
              <>
                {needsVerify && (
                  <div
                    role="status"
                    className="flex flex-col gap-2 px-3 py-2.5 rounded-xl border border-orange-400/40 bg-orange-500/10 text-xs text-orange-200"
                  >
                    <p className="break-words">
                      Confirme seu e-mail para alugar. Enviamos um link para {user?.email}.
                    </p>
                    {verifyMsg && <p>{verifyMsg}</p>}
                    <div className="flex gap-2">
                      <button type="button" disabled={verifyBusy} onClick={resend} className={smallBtn}>
                        Reenviar
                      </button>
                      <button type="button" disabled={verifyBusy} onClick={confirmedEmail} className={smallBtn}>
                        Já confirmei
                      </button>
                    </div>
                  </div>
                )}
                <label className="flex items-start gap-2.5 text-sm text-primary-gold/85 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-[#e6c56b]"
                  />
                  <span>
                    Li e aceito as{" "}
                    <RulesLink className="underline text-primary-gold cursor-pointer">regras do aluguel</RulesLink>{" "}
                    (versão {rules.version}).
                  </span>
                </label>
              </>
            )}
            <p className="text-xs text-primary-gold/55">
              {online
                ? `Pagamento online, por Pix ou cartão. Suas cópias ficam reservadas por ${settings.onlinePayment.holdMinutes} minutos enquanto você paga.`
                : "Pagamento no balcão, na retirada."}
            </p>
          </section>

          {error && (
            <p role="alert" className="px-3 py-2 rounded-xl border border-red-400/40 bg-red-500/10 text-sm text-red-200">
              {error}
            </p>
          )}

          {/* Total e botão sempre à mão */}
          {!needsLogin && !needsProfile && (
            <div className="sticky bottom-3 z-30 flex items-center gap-3 rounded-2xl border border-primary-gold/30 bg-primary-black/90 backdrop-blur p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-primary-gold/55">Total</span>
                <span className="text-lg font-bold">{formatBRL(total)}</span>
              </div>
              <button type="button" onClick={submit} disabled={blocked} className={`${mainBtn} flex-1`}>
                {buttonLabel}
              </button>
            </div>
          )}
          {!needsLogin && !needsProfile && !accepted && (
            <p className="-mt-2 text-center text-[11px] text-primary-gold/45">
              Aceite as regras para continuar.
            </p>
          )}
        </>
      )}
    </RentalPageShell>
  );
}
