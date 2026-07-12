"use client";

import { useAlert } from "@/contexts/alertProvider";
import BolaoMatchRepository from "@/services/repositories/BolaoMatchRepository";
import BolaoParticipantRepository from "@/services/repositories/BolaoParticipantRepository";
import BolaoTeamRepository from "@/services/repositories/BolaoTeamRepository";
import EventRepository from "@/services/repositories/EventRepository";
import QuizQuestionRepository from "@/services/repositories/QuizQuestionRepository";
import QuizParticipantRepository from "@/services/repositories/QuizParticipantRepository";
import {
  BolaoMatchType,
  BolaoParticipantType,
  BolaoTeamType,
  EventItemType,
  QuizQuestionType,
  QuizParticipantType,
} from "@/types";
import { getLucideIcon } from "@/utils/utilFunctions";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiSkipBack } from "react-icons/fi";
import {
  LuCheck,
  LuClock,
  LuShield,
  LuSwords,
  LuTimer,
  LuTrophy,
  LuX,
} from "react-icons/lu";
import LoaderFullscreen from "@/components/loaderFullscreen";
import { Timestamp } from "firebase/firestore";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

// ── Shared helpers ─────────────────────────────────────────────────────────────

type ScorePair = { scoreA: number; scoreB: number };

function getOrCreateParticipantId(): string {
  const key = "bolao_participant_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function ScorePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onChange(Math.min(99, value + 1))}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-primary-gold/20 bg-primary-black/60 text-primary-gold/70 hover:border-primary-gold/50 hover:text-primary-gold active:scale-95 transition-all cursor-pointer text-lg font-bold select-none"
      >
        +
      </button>
      <span className="w-9 text-center text-primary-gold font-bold text-xl leading-none py-1">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-primary-gold/20 bg-primary-black/60 text-primary-gold/70 hover:border-primary-gold/50 hover:text-primary-gold active:scale-95 transition-all cursor-pointer text-lg font-bold select-none"
      >
        −
      </button>
    </div>
  );
}

function formatTimer(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const m = Math.floor(totalMs / 60000).toString().padStart(2, "0");
  const s = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, "0");
  const ms = (totalMs % 1000).toString().padStart(3, "0");
  return `${m}:${s}.${ms}`;
}

// ── Common styles ──────────────────────────────────────────────────────────────

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
  .font-cinzel { font-family: 'Cinzel', serif; }
  @keyframes shimmer-gold {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .text-shimmer-gold {
    background: linear-gradient(135deg,#e6c56b 0%,#f5e09a 40%,#d4af37 70%,#e6c56b 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer-gold 4s linear infinite;
  }
  @keyframes pulse-dot {
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40%           { opacity: 1;   transform: scale(1); }
  }
  .waiting-dot { animation: pulse-dot 1.4s ease-in-out infinite; }
  .waiting-dot:nth-child(2) { animation-delay: 0.2s; }
  .waiting-dot:nth-child(3) { animation-delay: 0.4s; }
`;

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClientEventoPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { addAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<(EventItemType & { id: string }) | null>(
    null,
  );

  // Subscribe to event in real-time (needed for quiz status changes)
  useEffect(() => {
    const unsub = EventRepository.subscribeToEvent(eventId, (updatedEvent) => {
      setEvent(updatedEvent);
      setLoading(false);
    });
    return () => unsub();
  }, [eventId]);

  if (loading) return <LoaderFullscreen />;

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen text-primary-gold">
        <span>Evento não encontrado.</span>
      </div>
    );
  }

  const EventIcon = getLucideIcon(event.icon);

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="relative flex flex-col items-center w-full min-h-screen text-primary-gold px-4 pb-16 pt-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-5 flex items-center gap-1 cursor-pointer text-primary-gold z-50 p-1"
        >
          <FiSkipBack size={18} />
          <span className="font-semibold text-lg">Voltar</span>
        </button>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 mt-10 mb-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-gold/10 border border-primary-gold/25">
            {EventIcon ? (
              <EventIcon size={28} className="text-primary-gold" />
            ) : (
              <LuTrophy size={28} className="text-primary-gold" />
            )}
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl text-shimmer-gold tracking-widest uppercase">
            {event.name}
          </h1>
          {event.description && (
            <p className="text-sm text-primary-gold/50 max-w-[340px]">
              {event.description}
            </p>
          )}
        </div>

        {/* Route to the right experience */}
        <div className="w-full max-w-[480px]">
          {event.subtype === "quiz" || event.quizStatus !== undefined ? (
            <QuizSection event={event} eventId={eventId} addAlert={addAlert} />
          ) : (
            <BolaoSection event={event} eventId={eventId} addAlert={addAlert} />
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAMPION SCREEN
// ══════════════════════════════════════════════════════════════════════════════

function ChampionScreen({
  participant,
  event,
}: {
  participant: QuizParticipantType;
  event: EventItemType;
}) {
  const { width, height } = useWindowSize();
  return (
    <div className="relative flex flex-col items-center gap-6 text-center py-6">
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={500}
        gravity={0.18}
        style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none" }}
      />

      {/* Crown + trophy */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-yellow-400/20 to-primary-gold/5 border-2 border-yellow-400/50 flex items-center justify-center shadow-[0_0_40px_rgba(250,200,0,0.25)]">
          <LuTrophy size={44} className="text-yellow-400" />
        </div>
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl">👑</span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold text-yellow-400 tracking-wide">Você é o Campeão!</p>
        <p className="text-base text-primary-gold/70 font-medium">{participant.name}</p>
        {participant.mesa && (
          <p className="text-xs text-primary-gold/40">📍 mesa {participant.mesa}</p>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-4xl font-bold text-primary-gold">{participant.totalScore}</span>
          <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">pontos</span>
        </div>
        {participant.timeTakenSeconds !== undefined && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-mono font-semibold text-primary-gold/60">
              {formatTimer(participant.timeTakenSeconds)}
            </span>
            <span className="text-[10px] text-primary-gold/30 uppercase tracking-wider">tempo</span>
          </div>
        )}
      </div>

      {event.quizPrize && (
        <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-base text-yellow-300/90 font-medium">
          🏆 <span>{event.quizPrize}</span>
        </div>
      )}

      <p className="text-xs text-primary-gold/30 mt-2">Parabéns pela vitória! 🎉</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUIZ SECTION
// ══════════════════════════════════════════════════════════════════════════════

const QUIZ_COUNTDOWN_SECONDS = 15;

type ServerPhase =
  | { type: "waiting" }
  | { type: "countdown"; secondsLeft: number }
  | { type: "question"; index: number; timeLeftMs: number }
  | { type: "done" };

function computeServerPhase(
  event: EventItemType,
  questions: (QuizQuestionType & { id: string })[],
  nowMs: number,
): ServerPhase {
  if (!event.quizStartedAt || event.quizStatus !== "running") return { type: "waiting" };
  const startMs = (event.quizStartedAt as Timestamp).toMillis();
  const countdownEndsMs = startMs + QUIZ_COUNTDOWN_SECONDS * 1000;
  if (nowMs < countdownEndsMs) {
    return { type: "countdown", secondsLeft: Math.ceil((countdownEndsMs - nowMs) / 1000) };
  }
  let qStartMs = countdownEndsMs;
  for (let i = 0; i < questions.length; i++) {
    const durationMs = (questions[i].timeSeconds ?? 30) * 1000;
    const qEndMs = qStartMs + durationMs;
    if (nowMs < qEndMs) return { type: "question", index: i, timeLeftMs: qEndMs - nowMs };
    qStartMs = qEndMs;
  }
  return { type: "done" };
}

function QuizSection({
  event,
  eventId,
  addAlert,
}: {
  event: EventItemType & { id: string };
  eventId: string;
  addAlert: (msg: string) => void;
}) {
  const [questions, setQuestions] = useState<(QuizQuestionType & { id: string })[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [name, setName] = useState("");
  const [mesa, setMesa] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingParticipant, setExistingParticipant] = useState<QuizParticipantType | null>(null);

  // Per-question answer flow
  const [answeredThisQuestion, setAnsweredThisQuestion] = useState(false);
  const [lastAnswerTimeMs, setLastAnswerTimeMs] = useState<number | null>(null);
  const [textDraft, setTextDraft] = useState(""); // draft for current text question

  // Answers collected during the quiz (ref so submit always has latest)
  const answersRef = useRef<Record<string, string | number>>({});
  // Time (ms) spent on each question, keyed by questionId
  const questionTimesRef = useRef<Record<string, number>>({});
  // Latest unsent text-question draft, kept in sync on every keystroke so it
  // can be auto-saved if time runs out before the participant clicks "Responder"
  const pendingDraftRef = useRef<{ questionId: string; text: string } | null>(null);
  const participantIdRef = useRef<string>("");
  const submitCalledRef = useRef(false);
  const prevQuizStatusRef = useRef(event.quizStatus);
  const participantUnsubRef = useRef<(() => void) | null>(null);

  // Clock tick (300ms is smooth enough for countdown display)
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 300);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // One-time setup
  useEffect(() => {
    participantIdRef.current = getOrCreateParticipantId();
    loadExistingParticipant();
  }, [eventId]);

  // Live-subscribe to quiz questions so late additions/edits by the admin
  // (e.g. joining the waiting room before setup is finished) are always reflected.
  useEffect(() => {
    const unsub = QuizQuestionRepository.subscribeToEventQuestions(eventId, (fetched) => {
      setQuestions(fetched);
      setQuestionsLoaded(true);
    });
    return () => unsub();
  }, [eventId]);

  // Reset client state when admin resets the quiz (transition to "waiting")
  useEffect(() => {
    if (prevQuizStatusRef.current !== "waiting" && event.quizStatus === "waiting") {
      setSubmitted(false);
      setSubmitting(false);
      setExistingParticipant(null);
      setNameConfirmed(false);
      setName("");
      setMesa("");
      setAnsweredThisQuestion(false);
      setLastAnswerTimeMs(null);
      setTextDraft("");
      answersRef.current = {};
      questionTimesRef.current = {};
      submitCalledRef.current = false;
    }
    prevQuizStatusRef.current = event.quizStatus;
  }, [event.quizStatus]);

  const serverPhase = questionsLoaded
    ? computeServerPhase(event, questions, now)
    : ({ type: "waiting" } as ServerPhase);

  const serverQuestionIndex = serverPhase.type === "question" ? serverPhase.index : -1;

  // Reset per-question state when server advances to next question.
  // Before resetting, auto-save any text draft the participant typed but
  // never clicked "Responder" for — otherwise it's silently discarded when
  // time runs out (or the admin ends the quiz early).
  useEffect(() => {
    const pending = pendingDraftRef.current;
    if (
      pending &&
      pending.text.trim() &&
      answersRef.current[pending.questionId] === undefined
    ) {
      answersRef.current = {
        ...answersRef.current,
        [pending.questionId]: pending.text.trim(),
      };
      const pendingQuestion = questions.find((q) => q.id === pending.questionId);
      if (pendingQuestion) {
        questionTimesRef.current = {
          ...questionTimesRef.current,
          [pending.questionId]: pendingQuestion.timeSeconds * 1000,
        };
      }
    }
    pendingDraftRef.current = null;
    setAnsweredThisQuestion(false);
    setLastAnswerTimeMs(null);
    setTextDraft("");
  }, [serverQuestionIndex]);

  // Auto-submit when all question time expires (server-driven)
  useEffect(() => {
    if (serverPhase.type === "done" && !submitCalledRef.current && questionsLoaded && name.trim()) {
      handleSubmitQuiz();
    }
  }, [serverPhase.type]);

  // Auto-submit when admin manually ends quiz early
  useEffect(() => {
    if (event.quizStatus === "finished" && !submitCalledRef.current && questionsLoaded && !submitted && name.trim()) {
      handleSubmitQuiz();
    }
  }, [event.quizStatus]);

  // Live-subscribe to own participant record once submitted so admin corrections reflect immediately
  useEffect(() => {
    if (!submitted || !participantIdRef.current) return;
    participantUnsubRef.current?.();
    participantUnsubRef.current = QuizParticipantRepository.subscribeToParticipant(
      eventId,
      participantIdRef.current,
      (fresh) => { if (fresh) setExistingParticipant(fresh); }
    );
    return () => { participantUnsubRef.current?.(); };
  }, [submitted]);

  const loadExistingParticipant = async () => {
    try {
      const existing = await QuizParticipantRepository.getByParticipantId(
        eventId,
        participantIdRef.current,
      );
      if (existing) {
        setExistingParticipant(existing);
        setName(existing.name);
        setSubmitted(true);
        submitCalledRef.current = true;
      }
    } catch (error) {
      console.error("Erro ao carregar quiz:", error);
    }
  };

  // Called when user picks an answer for current question
  const handleAnswerQuestion = (questionId: string, answer: string | number) => {
    if (answeredThisQuestion || submitCalledRef.current) return;
    // Record time spent on this specific question using the server timeline
    if (serverPhase.type === "question" && event.quizStartedAt) {
      const startMs = (event.quizStartedAt as Timestamp).toMillis();
      const countdownEndsMs = startMs + QUIZ_COUNTDOWN_SECONDS * 1000;
      let qStartMs = countdownEndsMs;
      for (let i = 0; i < serverPhase.index; i++) {
        qStartMs += (questions[i].timeSeconds ?? 30) * 1000;
      }
      const timeTakenMs = Math.max(0, Date.now() - qStartMs);
      questionTimesRef.current = { ...questionTimesRef.current, [questionId]: timeTakenMs };
      setLastAnswerTimeMs(timeTakenMs);
    }
    answersRef.current = { ...answersRef.current, [questionId]: answer };
    pendingDraftRef.current = null;
    // Always show "Respondido!" — submit happens when server phase moves to "done"
    setAnsweredThisQuestion(true);
  };

  const handleSubmitQuiz = async () => {
    if (submitCalledRef.current || submitted) return;
    if (!name.trim()) return;
    submitCalledRef.current = true;
    setSubmitting(true);

    const processedAnswers: QuizParticipantType["answers"] = {};
    let totalScore = 0;

    questions.forEach((q) => {
      const userAnswer = answersRef.current[q.id];
      if (userAnswer === undefined || userAnswer === "") return;
      if (q.type === "multiple_choice") {
        const isCorrect = typeof userAnswer === "number" && userAnswer === q.correctOption;
        const pointsEarned = isCorrect ? q.points : 0;
        processedAnswers[q.id] = { answer: userAnswer, isCorrect, pointsEarned };
        totalScore += pointsEarned;
      } else {
        processedAnswers[q.id] = { answer: userAnswer as string, pointsEarned: 0 };
      }
    });

    // Tiebreaker: sum of time on correctly answered MC questions only at submission.
    // Text questions are added by the admin when they grade them (async).
    let tiebreakerMs = 0;
    questions.forEach((q) => {
      const ans = processedAnswers[q.id];
      const qTime = questionTimesRef.current[q.id];
      if (qTime === undefined || q.type !== "multiple_choice") return;
      if (ans?.isCorrect === true) tiebreakerMs += qTime;
    });
    const timeTakenSeconds = tiebreakerMs > 0 ? tiebreakerMs / 1000 : undefined;
    const questionTimes = { ...questionTimesRef.current };

    try {
      const id = await QuizParticipantRepository.create({
        eventId,
        participantId: participantIdRef.current,
        name: name.trim(),
        ...(mesa.trim() && { mesa: mesa.trim() }),
        answers: processedAnswers,
        totalScore,
        questionTimes,
        ...(timeTakenSeconds !== undefined && { timeTakenSeconds }),
      });
      if (id) {
        setExistingParticipant({
          eventId,
          participantId: participantIdRef.current,
          name: name.trim(),
          ...(mesa.trim() && { mesa: mesa.trim() }),
          answers: processedAnswers,
          totalScore,
          questionTimes,
          ...(timeTakenSeconds !== undefined && { timeTakenSeconds }),
        });
        setSubmitted(true);
        addAlert("Respostas enviadas! Boa sorte 🧠");
      }
    } catch {
      const existing = await QuizParticipantRepository.getByParticipantId(eventId, participantIdRef.current);
      if (existing) {
        setExistingParticipant(existing);
        setSubmitted(true);
      } else {
        submitCalledRef.current = false;
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUBMITTED VIEW ───────────────────────────────────────────────────────────
  if (submitted && existingParticipant) {
    if (event.quizStatus !== "finished") {
      return (
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 text-center">
          <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-700/30 flex items-center justify-center">
            <LuCheck size={22} className="text-green-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-green-400">Respostas enviadas, {existingParticipant.name}!</p>
            <p className="text-sm text-primary-gold/40">Aguardando o quiz encerrar...</p>
          </div>
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
          </div>
        </div>
      );
    }
    if (!event.quizResultsVisible) {
      return (
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center">
            <LuClock size={22} className="text-primary-gold/50" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-primary-gold/70">Quiz encerrado!</p>
            <p className="text-sm text-primary-gold/40">Aguardando a correção e liberação dos resultados pelo administrador...</p>
          </div>
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
          </div>
        </div>
      );
    }

    // Results revealed — check if this participant is the crowned champion
    const isChampion =
      !!event.quizChampionId && event.quizChampionId === existingParticipant.participantId;
    const textPending = Object.values(existingParticipant.answers).some((a) => a.isCorrect === undefined);

    if (isChampion) return <ChampionScreen participant={existingParticipant} event={event} />;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-primary-gold/5 border border-primary-gold/20 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center">
            <LuTrophy size={22} className="text-primary-gold" />
          </div>
          <div>
            <p className="text-base font-semibold text-primary-gold">Resultado de {existingParticipant.name}</p>
            {existingParticipant.mesa && (
              <p className="text-xs text-primary-gold/40 mt-0.5">📍 {existingParticipant.mesa}</p>
            )}
          </div>
          <div className="flex items-center gap-5 mt-1">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary-gold">{existingParticipant.totalScore}</span>
              <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">pontos</span>
            </div>
            {existingParticipant.timeTakenSeconds !== undefined && (
              <div className="flex flex-col items-center">
                <span className="text-lg font-mono font-semibold text-primary-gold/60">
                  {formatTimer(existingParticipant.timeTakenSeconds)}
                </span>
                <span className="text-[10px] text-primary-gold/30 uppercase tracking-wider">tempo</span>
              </div>
            )}
            {textPending && (
              <div className="flex flex-col items-center">
                <span className="text-sm text-yellow-400">⏳</span>
                <span className="text-[10px] text-yellow-400/50 uppercase tracking-wider">pendente</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-widest text-primary-gold/40">Suas respostas</span>
          {questions.map((q, i) => {
            const ans = existingParticipant.answers[q.id];
            return (
              <div key={q.id} className="flex flex-col gap-1.5 p-3 rounded-xl border border-primary-gold/10 bg-secondary-black/60">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-primary-gold/30 font-mono shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-sm text-primary-gold/80 flex-1">{q.text}</span>
                  <span className="text-[10px] text-primary-gold/30 shrink-0">{q.points}pts</span>
                </div>
                {ans ? (
                  <div className="pl-5">
                    {q.type === "multiple_choice" ? (
                      <div className={`flex items-center gap-1.5 text-sm ${ans.isCorrect === true ? "text-green-400" : ans.isCorrect === false ? "text-red-400" : "text-primary-gold/70"}`}>
                        {ans.isCorrect === true ? <LuCheck size={13} /> : ans.isCorrect === false ? <LuX size={13} /> : null}
                        {q.options?.[ans.answer as number] ?? "?"}
                        <span className="text-xs text-primary-gold/30 ml-1">
                          {ans.pointsEarned !== undefined ? `+${ans.pointsEarned}pts` : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-primary-gold/70 italic">&quot;{ans.answer}&quot;</span>
                        <span className={`text-xs ${ans.isCorrect === true ? "text-green-400" : ans.isCorrect === false ? "text-red-400" : "text-yellow-400/70"}`}>
                          {ans.isCorrect === true ? `✓ Correta (+${ans.pointsEarned}pts)` : ans.isCorrect === false ? "✗ Errada" : "⏳ Aguardando correção"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="pl-5 text-xs text-primary-gold/25 italic">Não respondida</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SUBMITTING ───────────────────────────────────────────────────────────────
  if (submitting) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center animate-pulse">
          <LuCheck size={22} className="text-primary-gold/60" />
        </div>
        <p className="text-sm text-primary-gold/50">Enviando respostas...</p>
      </div>
    );
  }

  // ── QUIZ ENCERRADO SEM PARTICIPAÇÃO ─────────────────────────────────────────
  if (event.quizStatus === "finished" && !submitted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-10">
        <div className="w-14 h-14 rounded-full bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center">
          <LuClock size={22} className="text-primary-gold/40" />
        </div>
        <p className="text-base font-semibold text-primary-gold/60">O quiz foi encerrado</p>
        <p className="text-sm text-primary-gold/35 max-w-[280px]">
          Você não participou desta rodada. Aguarde o próximo quiz!
        </p>
      </div>
    );
  }

  // ── SALA DE ESPERA ───────────────────────────────────────────────────────────
  if (serverPhase.type === "waiting") {
    if (!nameConfirmed) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 p-5 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
            <p className="text-sm text-primary-gold/70 text-center leading-relaxed">
              Insira seu nome para entrar na sala de espera. O quiz começará em breve!
            </p>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/15 to-transparent" />
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-primary-gold/50 uppercase tracking-wider">
                  Seu nome <span className="text-primary-gold/80">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Como você quer ser chamado?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setNameConfirmed(true); }}
                  autoFocus
                  className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-primary-gold/50 uppercase tracking-wider">
                  Número da mesa <span className="text-primary-gold/30 normal-case font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mesa 4"
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => { if (name.trim()) setNameConfirmed(true); }}
              disabled={!name.trim()}
              className="w-full py-3.5 rounded-xl bg-primary-gold text-primary-black font-bold text-sm tracking-wider uppercase transition-all hover:bg-primary-gold/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Entrar na sala de espera
            </button>
          </div>
          {questions.length > 0 && (
            <p className="text-center text-[11px] text-primary-gold/30">
              {questions.length} pergunta{questions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 text-center py-4">
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 w-full">
          <div className="flex flex-col items-center gap-1">
            <p className="text-base font-semibold text-primary-gold">Olá, {name}! 👋</p>
            <p className="text-sm text-primary-gold/50">Você está na sala de espera.</p>
            {mesa && (
              <span className="mt-1 text-xs text-primary-gold/40 bg-primary-gold/5 border border-primary-gold/10 px-2.5 py-1 rounded-full">
                📍 mesa {mesa}
              </span>
            )}
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/15 to-transparent" />
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/50 waiting-dot" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/50 waiting-dot" />
              <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/50 waiting-dot" />
            </div>
            <p className="text-sm text-primary-gold/50">Aguardando o quiz ser iniciado...</p>
            {questions.length > 0 && (
              <p className="text-[11px] text-primary-gold/25">
                {questions.length} pergunta{questions.length !== 1 ? "s" : ""}
              </p>
            )}
            {event.quizPrize && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-gold/5 border border-primary-gold/15 text-sm text-primary-gold/80 mt-1">
                <span>🏆</span>
                <span className="font-medium">{event.quizPrize}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setNameConfirmed(false)}
          className="text-xs text-primary-gold/25 hover:text-primary-gold/50 transition-all cursor-pointer underline underline-offset-2"
        >
          Trocar nome
        </button>
      </div>
    );
  }

  // ── CONTAGEM REGRESSIVA ──────────────────────────────────────────────────────
  if (serverPhase.type === "countdown") {
    const secs = serverPhase.secondsLeft;

    // Name not entered yet — quick entry + countdown
    if (!nameConfirmed) {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-yellow-700/30 bg-yellow-900/10 text-center">
            <p className="text-xs text-yellow-400 uppercase tracking-wider">Quiz começa em</p>
            <span className="text-6xl font-bold font-mono text-yellow-400 leading-none">{secs}</span>
            <p className="text-xs text-yellow-400/60">Corre! Insira seu nome antes que comece 👇</p>
          </div>
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
            <input
              type="text"
              placeholder="Seu nome *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setNameConfirmed(true); }}
              autoFocus
              className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all text-sm"
            />
            <input
              type="text"
              placeholder="Mesa (opcional)"
              value={mesa}
              onChange={(e) => setMesa(e.target.value)}
              className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all text-sm"
            />
            <button
              onClick={() => { if (name.trim()) setNameConfirmed(true); }}
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl bg-primary-gold text-primary-black font-bold text-sm uppercase transition-all active:scale-[0.98] disabled:opacity-30 cursor-pointer"
            >
              Confirmar nome
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-6 text-center py-4">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-primary-gold/20 bg-secondary-black/40 w-full">
          <p className="text-sm text-primary-gold/60 uppercase tracking-widest">Quiz começa em</p>
          <span className={`text-8xl font-bold font-mono leading-none transition-all ${secs <= 5 ? "text-red-400" : "text-primary-gold"}`}>
            {secs}
          </span>
          <p className="text-sm text-primary-gold/40">Prepara-se, {name}! 🧠</p>
          {mesa && (
            <span className="text-xs text-primary-gold/30 bg-primary-gold/5 border border-primary-gold/10 px-2.5 py-1 rounded-full">
              📍 mesa {mesa}
            </span>
          )}
          {event.quizPrize && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-gold/5 border border-primary-gold/10 text-sm text-primary-gold/70 mt-1">
              🏆 <span>{event.quizPrize}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── QUESTÃO ATUAL ────────────────────────────────────────────────────────────
  if (serverPhase.type === "question") {
    const q = questions[serverPhase.index];
    if (!q) return null;

    const timeLeftSecs = Math.ceil(serverPhase.timeLeftMs / 1000);
    const timePct = Math.min(100, (serverPhase.timeLeftMs / (q.timeSeconds * 1000)) * 100);
    const isUrgent = timeLeftSecs <= 5;

    // Already answered — waiting for server to advance
    if (answeredThisQuestion) {
      const waitSecs = Math.ceil(serverPhase.timeLeftMs / 1000);
      const isLastQuestion = serverPhase.index === questions.length - 1;
      return (
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-green-700/20 bg-green-900/10 text-center">
          <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-700/30 flex items-center justify-center">
            <LuCheck size={22} className="text-green-400" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-green-400">Respondido!</p>
            {lastAnswerTimeMs !== null && (
              <p className="text-xl font-mono font-bold text-green-300">
                {(lastAnswerTimeMs / 1000).toFixed(3)}s
              </p>
            )}
            {isLastQuestion ? (
              <p className="text-sm text-primary-gold/40">
                Última questão — aguardando encerramento...{" "}
                <span className="font-mono text-primary-gold/30">{waitSecs}s</span>
              </p>
            ) : (
              <p className="text-sm text-primary-gold/40">
                Próxima questão em{" "}
                <span className="font-mono font-semibold text-primary-gold/70">{waitSecs}s</span>
                <span className="text-primary-gold/25 ml-1">
                  ({serverPhase.index + 1}/{questions.length})
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-gold/30 waiting-dot" />
            <span className="w-2 h-2 rounded-full bg-primary-gold/30 waiting-dot" />
            <span className="w-2 h-2 rounded-full bg-primary-gold/30 waiting-dot" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {/* Name banner if not confirmed yet */}
        {!nameConfirmed && (
          <div className="flex gap-2 p-3 rounded-xl border border-yellow-700/30 bg-yellow-900/10">
            <input
              type="text"
              placeholder="Seu nome *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setNameConfirmed(true); }}
              autoFocus
              className="flex-1 bg-transparent outline-none text-primary-gold placeholder-primary-gold/30 text-sm"
            />
            <button
              onClick={() => { if (name.trim()) setNameConfirmed(true); }}
              disabled={!name.trim()}
              className="text-xs px-3 py-1 rounded-lg bg-primary-gold text-primary-black font-bold disabled:opacity-40 cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        {/* Progress + timer */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs text-primary-gold/40 font-mono">
            {serverPhase.index + 1} / {questions.length}
          </span>
          <span className={`flex items-center gap-1.5 font-mono font-bold text-base ${isUrgent ? "text-red-400" : "text-primary-gold"}`}>
            <LuTimer size={15} />
            {timeLeftSecs}s
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-primary-gold/10 rounded-full overflow-hidden -mt-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isUrgent ? "bg-red-400" : "bg-primary-gold"}`}
            style={{ width: `${timePct}%` }}
          />
        </div>

        {/* Question card */}
        <div className="flex flex-col gap-4 p-5 rounded-2xl border border-primary-gold/15 bg-secondary-black/60">
          <p className="text-base text-primary-gold/90 leading-relaxed text-center font-medium">
            {q.text}
          </p>

          <div className="flex items-center justify-center gap-3 text-[11px] text-primary-gold/30">
            <span>{q.points} pt{q.points !== 1 ? "s" : ""}</span>
          </div>

          {/* Multiple choice */}
          {q.type === "multiple_choice" && q.options && (
            <div className="flex flex-col gap-2.5">
              {q.options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => handleAnswerQuestion(q.id, optIdx)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary-gold/15 bg-primary-black/30 text-sm text-primary-gold/70 text-left transition-all cursor-pointer hover:border-primary-gold/40 hover:bg-primary-gold/5 hover:text-primary-gold active:scale-[0.98]"
                >
                  <span className="w-6 h-6 rounded-full border border-primary-gold/30 shrink-0 flex items-center justify-center text-[10px] text-primary-gold/40 font-mono">
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Text answer */}
          {q.type === "text" && (
            <div className="flex flex-col gap-2">
              <textarea
                rows={3}
                placeholder="Digite sua resposta..."
                value={textDraft}
                onChange={(e) => {
                  setTextDraft(e.target.value);
                  pendingDraftRef.current = { questionId: q.id, text: e.target.value };
                }}
                className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 resize-none transition-all"
              />
              <button
                onClick={() => {
                  if (textDraft.trim()) handleAnswerQuestion(q.id, textDraft.trim());
                  else handleAnswerQuestion(q.id, ""); // skip
                }}
                className="w-full py-3 rounded-xl bg-primary-gold text-primary-black font-bold text-sm uppercase tracking-wider transition-all hover:bg-primary-gold/90 active:scale-[0.98] cursor-pointer"
              >
                {textDraft.trim() ? "Responder" : "Pular"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOLÃO SECTION
// ══════════════════════════════════════════════════════════════════════════════

function BolaoSection({
  event,
  eventId,
  addAlert,
}: {
  event: EventItemType & { id: string };
  eventId: string;
  addAlert: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [teams, setTeams] = useState<(BolaoTeamType & { id: string })[]>([]);
  const [matches, setMatches] = useState<(BolaoMatchType & { id: string })[]>(
    [],
  );
  const [name, setName] = useState("");
  const [scores, setScores] = useState<Record<string, ScorePair>>({});
  const [submitted, setSubmitted] = useState(false);
  const [lockedParticipant, setLockedParticipant] =
    useState<BolaoParticipantType | null>(null);

  const participantIdRef = useRef<string>("");

  useEffect(() => {
    participantIdRef.current = getOrCreateParticipantId();
    fetchBolaoData();
  }, [eventId]);

  const fetchBolaoData = async () => {
    setLoading(true);
    try {
      const [fetchedTeams, fetchedMatches] = await Promise.all([
        BolaoTeamRepository.getByEventId(eventId),
        BolaoMatchRepository.getByEventId(eventId),
      ]);
      setTeams(fetchedTeams);
      setMatches(fetchedMatches);

      const initial: Record<string, ScorePair> = {};
      fetchedMatches.forEach((m) => {
        initial[m.id] = { scoreA: 0, scoreB: 0 };
      });
      setScores(initial);

      const existing = await BolaoParticipantRepository.getByParticipantId(
        eventId,
        participantIdRef.current,
      );
      if (existing) {
        setLockedParticipant(existing);
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Erro ao carregar bolão:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      addAlert("Digite seu nome antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const predictions: BolaoParticipantType["predictions"] = {};
      matches.forEach((m) => {
        predictions[m.id] = scores[m.id];
      });

      const id = await BolaoParticipantRepository.create({
        eventId,
        participantId: participantIdRef.current,
        name: name.trim(),
        predictions,
      });
      if (id) {
        setLockedParticipant({
          eventId,
          participantId: participantIdRef.current,
          name: name.trim(),
          predictions,
        });
        setSubmitted(true);
        addAlert("Palpite enviado! Boa sorte! ⚽");
      }
    } catch {
      addAlert("Erro ao enviar palpite. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const teamById = (id: string) => teams.find((t) => t.id === id);

  if (loading) return <LoaderFullscreen />;

  return (
    <>
      {/* Teams showcase */}
      {teams.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-[500px]">
          {teams.map((team) => (
            <div key={team.id} className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary-gold/20 bg-primary-black/50">
                {team.image ? (
                  <img
                    src={team.image}
                    alt={team.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LuShield size={16} className="text-primary-gold/30" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-primary-gold/50">
                {team.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── LOCKED VIEW ── */}
      {submitted && lockedParticipant ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-900/20 border border-green-700/30 text-center">
            <LuTrophy size={22} className="text-green-500" />
            <p className="text-sm font-semibold text-green-400">
              Palpite enviado, {lockedParticipant.name}!
            </p>
            <p className="text-xs text-green-500/60">
              Seu palpite está bloqueado e não pode ser alterado.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {matches.map((match) => {
              const teamA = teamById(match.teamAId);
              const teamB = teamById(match.teamBId);
              const pred = lockedParticipant.predictions[match.id];
              return (
                <div
                  key={match.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-secondary-black/60"
                >
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="text-sm font-medium text-primary-gold/80">
                      {teamA?.name}
                    </span>
                    {teamA?.image && (
                      <img
                        src={teamA.image}
                        alt={teamA.name}
                        className="w-7 h-7 rounded object-cover border border-primary-gold/10 shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-primary-gold/10 border border-primary-gold/20">
                    <span className="text-primary-gold font-bold text-base w-5 text-center">
                      {pred?.scoreA ?? 0}
                    </span>
                    <span className="text-primary-gold/40 text-xs">x</span>
                    <span className="text-primary-gold font-bold text-base w-5 text-center">
                      {pred?.scoreB ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    {teamB?.image && (
                      <img
                        src={teamB.image}
                        alt={teamB.name}
                        className="w-7 h-7 rounded object-cover border border-primary-gold/10 shrink-0"
                      />
                    )}
                    <span className="text-sm font-medium text-primary-gold/80">
                      {teamB?.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── PREDICTION FORM ── */
        <div className="flex flex-col gap-5">
          {matches.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-primary-gold/40 text-center">
              <LuSwords size={28} />
              <span className="text-sm">Nenhuma partida cadastrada ainda.</span>
            </div>
          ) : (
            <>
              {/* Name input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-primary-gold/60 uppercase tracking-wider">
                  Seu nome
                </label>
                <input
                  type="text"
                  placeholder="Digite seu nome..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-secondary-black/60 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/30 outline-none focus:border-primary-gold/50 transition-all text-sm"
                />
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/20 to-transparent" />

              <div className="flex flex-col gap-2">
                <span className="text-xs text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                  <LuSwords size={12} /> Partidas
                </span>
                {matches.map((match) => {
                  const teamA = teamById(match.teamAId);
                  const teamB = teamById(match.teamBId);
                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-2 p-3 rounded-xl border border-primary-gold/10 bg-secondary-black/60"
                    >
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium text-primary-gold/90 text-right">
                          {teamA?.name ?? "?"}
                        </span>
                        {teamA?.image && (
                          <img
                            src={teamA.image}
                            alt={teamA.name}
                            className="w-8 h-8 rounded object-cover border border-primary-gold/10 shrink-0"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ScorePicker
                          value={scores[match.id]?.scoreA ?? 0}
                          onChange={(v) =>
                            setScores((p) => ({
                              ...p,
                              [match.id]: { ...p[match.id], scoreA: v },
                            }))
                          }
                        />
                        <span className="text-primary-gold/40 text-xs font-bold">
                          ×
                        </span>
                        <ScorePicker
                          value={scores[match.id]?.scoreB ?? 0}
                          onChange={(v) =>
                            setScores((p) => ({
                              ...p,
                              [match.id]: { ...p[match.id], scoreB: v },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {teamB?.image && (
                          <img
                            src={teamB.image}
                            alt={teamB.name}
                            className="w-8 h-8 rounded object-cover border border-primary-gold/10 shrink-0"
                          />
                        )}
                        <span className="text-sm font-medium text-primary-gold/90">
                          {teamB?.name ?? "?"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-primary-gold text-primary-black font-bold text-sm tracking-wider uppercase transition-all hover:bg-primary-gold/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Enviando..." : "Enviar palpite ⚽"}
              </button>

              <p className="text-center text-[10px] text-primary-gold/25">
                Após enviar, seu palpite não poderá ser alterado.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
