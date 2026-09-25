"use client";

import { useAlert } from "@/contexts/alertProvider";
import BolaoMatchRepository from "@/services/repositories/BolaoMatchRepository";
import BolaoParticipantRepository from "@/services/repositories/BolaoParticipantRepository";
import BolaoTeamRepository from "@/services/repositories/BolaoTeamRepository";
import EventRepository from "@/services/repositories/EventRepository";
import QuizQuestionRepository from "@/services/repositories/QuizQuestionRepository";
import QuizParticipantRepository from "@/services/repositories/QuizParticipantRepository";
import VotingEntryRepository from "@/services/repositories/VotingEntryRepository";
import VotingVoteRepository from "@/services/repositories/VotingVoteRepository";
import {
  BolaoMatchType,
  BolaoParticipantType,
  BolaoTeamType,
  EventItemType,
  QuizQuestionType,
  QuizParticipantType,
  VotingEntryType,
  VotingVoteType,
} from "@/types";
import { getLucideIcon } from "@/utils/utilFunctions";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { FiSkipBack } from "react-icons/fi";
import {
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuDrama,
  LuExpand,
  LuImagePlus,
  LuImages,
  LuPencil,
  LuScissors,
  LuShield,
  LuSwords,
  LuTimer,
  LuTrophy,
  LuVote,
  LuX,
} from "react-icons/lu";
import LoaderFullscreen from "@/components/loaderFullscreen";
import ImageCropperModal from "@/components/imageCropperModal";
import {
  computeRankedGroups,
  RankedGroup,
} from "@/utils/votingResults";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
  uploadImageToFirebase,
} from "@/services/repositories/FirebaseImageUtils";
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
  const m = Math.floor(totalMs / 60000)
    .toString()
    .padStart(2, "0");
  const s = Math.floor((totalMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");
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
  @keyframes podium-rise {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .podium-col { animation: podium-rise 0.55s ease-out both; }
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
          ) : event.subtype === "votacao" ? (
            <VotingSection
              event={event}
              eventId={eventId}
              addAlert={addAlert}
            />
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
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      {/* Crown + trophy */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-yellow-400/20 to-primary-gold/5 border-2 border-yellow-400/50 flex items-center justify-center shadow-[0_0_40px_rgba(250,200,0,0.25)]">
          <LuTrophy size={44} className="text-yellow-400" />
        </div>
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl">
          👑
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold text-yellow-400 tracking-wide">
          Você é o Campeão!
        </p>
        <p className="text-base text-primary-gold/70 font-medium">
          {participant.name}
        </p>
        {participant.mesa && (
          <p className="text-xs text-primary-gold/40">
            📍 mesa {participant.mesa}
          </p>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-4xl font-bold text-primary-gold">
            {participant.totalScore}
          </span>
          <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">
            pontos
          </span>
        </div>
        {participant.timeTakenSeconds !== undefined && (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xl font-mono font-semibold text-primary-gold/60">
              {formatTimer(participant.timeTakenSeconds)}
            </span>
            <span className="text-[10px] text-primary-gold/30 uppercase tracking-wider">
              tempo
            </span>
          </div>
        )}
      </div>

      {event.quizPrize && (
        <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-base text-yellow-300/90 font-medium">
          🏆 <span>{event.quizPrize}</span>
        </div>
      )}

      <p className="text-xs text-primary-gold/30 mt-2">
        Parabéns pela vitória! 🎉
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PODIUM
// ══════════════════════════════════════════════════════════════════════════════

const PODIUM_META: Record<
  number,
  {
    medal: string;
    height: string;
    name: string;
    pedestal: string;
    delay: string;
  }
> = {
  1: {
    medal: "👑",
    height: "h-24",
    name: "text-yellow-400",
    pedestal:
      "from-yellow-400/15 to-yellow-400/[0.03] border-yellow-400/30 text-yellow-400",
    delay: "0.05s",
  },
  2: {
    medal: "🥈",
    height: "h-16",
    name: "text-zinc-300",
    pedestal:
      "from-zinc-400/15 to-zinc-400/[0.03] border-zinc-400/25 text-zinc-400",
    delay: "0.3s",
  },
  3: {
    medal: "🥉",
    height: "h-12",
    name: "text-amber-600",
    pedestal:
      "from-amber-600/15 to-amber-600/[0.03] border-amber-700/30 text-amber-600",
    delay: "0.45s",
  },
};

function QuizPodium({
  participants,
  championId,
  selfParticipantId,
}: {
  participants: (QuizParticipantType & { id: string })[];
  championId: string;
  selfParticipantId?: string;
}) {
  // O campeão coroado pelo admin ocupa o 1º lugar; os demais seguem a
  // ordenação padrão (pontos desc, tempo asc) que já vem do repositório.
  const champion = participants.find((p) => p.participantId === championId);
  const rest = participants.filter((p) => p.participantId !== championId);
  const ranked = champion ? [champion, ...rest] : participants;
  const top3 = ranked.slice(0, 3);
  if (top3.length === 0) return null;

  // Disposição clássica: 2º à esquerda, 1º no centro, 3º à direita
  const slots = [
    top3[1] && { participant: top3[1], rank: 2 },
    { participant: top3[0], rank: 1 },
    top3[2] && { participant: top3[2], rank: 3 },
  ].filter(Boolean) as {
    participant: QuizParticipantType & { id: string };
    rank: number;
  }[];

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
      <span className="text-center text-[11px] uppercase tracking-widest text-primary-gold/40">
        🏆 Pódio
      </span>
      <div className="flex items-end justify-center gap-2">
        {slots.map(({ participant, rank }) => {
          const meta = PODIUM_META[rank];
          const isSelf = participant.participantId === selfParticipantId;
          return (
            <div
              key={participant.id}
              className="podium-col flex flex-col items-center gap-1 flex-1 min-w-0 max-w-[130px]"
              style={{ animationDelay: meta.delay }}
            >
              <span className={rank === 1 ? "text-3xl" : "text-2xl"}>
                {meta.medal}
              </span>
              <span
                className={`text-sm font-semibold truncate max-w-full ${meta.name}`}
              >
                {participant.name}
              </span>
              {participant.mesa && (
                <span className="text-[10px] text-primary-gold/35 truncate max-w-full">
                  📍 {participant.mesa}
                </span>
              )}
              <span className="text-base font-bold text-primary-gold leading-none">
                {participant.totalScore}
                <span className="text-[10px] font-normal text-primary-gold/40 ml-0.5">
                  pts
                </span>
              </span>
              {participant.timeTakenSeconds !== undefined && (
                <span className="text-[10px] font-mono text-primary-gold/40">
                  {formatTimer(participant.timeTakenSeconds)}
                </span>
              )}
              {isSelf && (
                <span className="text-[9px] uppercase tracking-wider bg-primary-gold text-primary-black font-bold px-1.5 py-0.5 rounded-full">
                  você
                </span>
              )}
              <div
                className={`w-full ${meta.height} mt-1 rounded-t-lg border border-b-0 bg-gradient-to-t ${meta.pedestal} flex items-start justify-center pt-1.5`}
              >
                <span className="text-xl font-bold opacity-50">{rank}º</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/30 to-transparent -mt-4" />
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
  if (!event.quizStartedAt || event.quizStatus !== "running")
    return { type: "waiting" };
  const startMs = (event.quizStartedAt as Timestamp).toMillis();
  const countdownEndsMs = startMs + QUIZ_COUNTDOWN_SECONDS * 1000;
  if (nowMs < countdownEndsMs) {
    return {
      type: "countdown",
      secondsLeft: Math.ceil((countdownEndsMs - nowMs) / 1000),
    };
  }
  let qStartMs = countdownEndsMs;
  for (let i = 0; i < questions.length; i++) {
    const durationMs = (questions[i].timeSeconds ?? 30) * 1000;
    const qEndMs = qStartMs + durationMs;
    if (nowMs < qEndMs)
      return { type: "question", index: i, timeLeftMs: qEndMs - nowMs };
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
  const [questions, setQuestions] = useState<
    (QuizQuestionType & { id: string })[]
  >([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [name, setName] = useState("");
  const [mesa, setMesa] = useState("");
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingParticipant, setExistingParticipant] =
    useState<QuizParticipantType | null>(null);
  const [allParticipants, setAllParticipants] = useState<
    (QuizParticipantType & { id: string })[]
  >([]);

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
  const pendingDraftRef = useRef<{ questionId: string; text: string } | null>(
    null,
  );
  const participantIdRef = useRef<string>("");
  const submitCalledRef = useRef(false);
  const prevQuizStatusRef = useRef(event.quizStatus);
  const participantUnsubRef = useRef<(() => void) | null>(null);

  // Clock tick (300ms is smooth enough for countdown display)
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 300);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // One-time setup
  useEffect(() => {
    participantIdRef.current = getOrCreateParticipantId();
    loadExistingParticipant();
  }, [eventId]);

  // Live-subscribe to quiz questions so late additions/edits by the admin
  // (e.g. joining the waiting room before setup is finished) are always reflected.
  useEffect(() => {
    const unsub = QuizQuestionRepository.subscribeToEventQuestions(
      eventId,
      (fetched) => {
        setQuestions(fetched);
        setQuestionsLoaded(true);
      },
    );
    return () => unsub();
  }, [eventId]);

  // Reset client state when admin resets the quiz (transition to "waiting")
  useEffect(() => {
    if (
      prevQuizStatusRef.current !== "waiting" &&
      event.quizStatus === "waiting"
    ) {
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

  const serverQuestionIndex =
    serverPhase.type === "question" ? serverPhase.index : -1;

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
      const pendingQuestion = questions.find(
        (q) => q.id === pending.questionId,
      );
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
    if (
      serverPhase.type === "done" &&
      !submitCalledRef.current &&
      questionsLoaded &&
      name.trim()
    ) {
      handleSubmitQuiz();
    }
  }, [serverPhase.type]);

  // Auto-submit when admin manually ends quiz early
  useEffect(() => {
    if (
      event.quizStatus === "finished" &&
      !submitCalledRef.current &&
      questionsLoaded &&
      !submitted &&
      name.trim()
    ) {
      handleSubmitQuiz();
    }
  }, [event.quizStatus]);

  // Podium data: subscribe to the full participant list only after the quiz
  // ended, results were released and a champion was crowned by the admin.
  useEffect(() => {
    if (
      event.quizStatus !== "finished" ||
      !event.quizResultsVisible ||
      !event.quizChampionId
    ) {
      setAllParticipants([]);
      return;
    }
    const unsub = QuizParticipantRepository.subscribeToEventParticipants(
      eventId,
      setAllParticipants,
    );
    return () => unsub();
  }, [
    event.quizStatus,
    event.quizResultsVisible,
    event.quizChampionId,
    eventId,
  ]);

  // Live-subscribe to own participant record once submitted so admin corrections reflect immediately
  useEffect(() => {
    if (!submitted || !participantIdRef.current) return;
    participantUnsubRef.current?.();
    participantUnsubRef.current =
      QuizParticipantRepository.subscribeToParticipant(
        eventId,
        participantIdRef.current,
        (fresh) => {
          if (fresh) setExistingParticipant(fresh);
        },
      );
    return () => {
      participantUnsubRef.current?.();
    };
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
  const handleAnswerQuestion = (
    questionId: string,
    answer: string | number,
  ) => {
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
      questionTimesRef.current = {
        ...questionTimesRef.current,
        [questionId]: timeTakenMs,
      };
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
        const isCorrect =
          typeof userAnswer === "number" && userAnswer === q.correctOption;
        const pointsEarned = isCorrect ? q.points : 0;
        processedAnswers[q.id] = {
          answer: userAnswer,
          isCorrect,
          pointsEarned,
        };
        totalScore += pointsEarned;
      } else {
        processedAnswers[q.id] = {
          answer: userAnswer as string,
          pointsEarned: 0,
        };
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
      const existing = await QuizParticipantRepository.getByParticipantId(
        eventId,
        participantIdRef.current,
      );
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
            <p className="text-base font-semibold text-green-400">
              Respostas enviadas, {existingParticipant.name}!
            </p>
            <p className="text-sm text-primary-gold/40">
              Aguardando o quiz encerrar...
            </p>
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
            <p className="text-base font-semibold text-primary-gold/70">
              Quiz encerrado!
            </p>
            <p className="text-sm text-primary-gold/40">
              Aguardando a correção e liberação dos resultados pelo
              administrador...
            </p>
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
      !!event.quizChampionId &&
      event.quizChampionId === existingParticipant.participantId;
    const textPending = Object.values(existingParticipant.answers).some(
      (a) => a.isCorrect === undefined,
    );

    const podium = event.quizChampionId && allParticipants.length > 0 && (
      <QuizPodium
        participants={allParticipants}
        championId={event.quizChampionId}
        selfParticipantId={existingParticipant.participantId}
      />
    );

    if (isChampion)
      return (
        <div className="flex flex-col gap-6">
          <ChampionScreen participant={existingParticipant} event={event} />
          {podium}
        </div>
      );

    return (
      <div className="flex flex-col gap-5">
        {podium}
        <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-primary-gold/5 border border-primary-gold/20 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center">
            <LuTrophy size={22} className="text-primary-gold" />
          </div>
          <div>
            <p className="text-base font-semibold text-primary-gold">
              Resultado de {existingParticipant.name}
            </p>
            {existingParticipant.mesa && (
              <p className="text-xs text-primary-gold/40 mt-0.5">
                📍 {existingParticipant.mesa}
              </p>
            )}
          </div>
          <div className="flex items-center gap-5 mt-1">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary-gold">
                {existingParticipant.totalScore}
              </span>
              <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">
                pontos
              </span>
            </div>
            {existingParticipant.timeTakenSeconds !== undefined && (
              <div className="flex flex-col items-center">
                <span className="text-lg font-mono font-semibold text-primary-gold/60">
                  {formatTimer(existingParticipant.timeTakenSeconds)}
                </span>
                <span className="text-[10px] text-primary-gold/30 uppercase tracking-wider">
                  tempo
                </span>
              </div>
            )}
            {textPending && (
              <div className="flex flex-col items-center">
                <span className="text-sm text-yellow-400">⏳</span>
                <span className="text-[10px] text-yellow-400/50 uppercase tracking-wider">
                  pendente
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-widest text-primary-gold/40">
            Suas respostas
          </span>
          {questions.map((q, i) => {
            const ans = existingParticipant.answers[q.id];
            return (
              <div
                key={q.id}
                className="flex flex-col gap-1.5 p-3 rounded-xl border border-primary-gold/10 bg-secondary-black/60"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-primary-gold/30 font-mono shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <span className="text-sm text-primary-gold/80 flex-1">
                    {q.text}
                  </span>
                  <span className="text-[10px] text-primary-gold/30 shrink-0">
                    {q.points}pts
                  </span>
                </div>
                {ans ? (
                  <div className="pl-5">
                    {q.type === "multiple_choice" ? (
                      <div
                        className={`flex items-center gap-1.5 text-sm ${ans.isCorrect === true ? "text-green-400" : ans.isCorrect === false ? "text-red-400" : "text-primary-gold/70"}`}
                      >
                        {ans.isCorrect === true ? (
                          <LuCheck size={13} />
                        ) : ans.isCorrect === false ? (
                          <LuX size={13} />
                        ) : null}
                        {q.options?.[ans.answer as number] ?? "?"}
                        <span className="text-xs text-primary-gold/30 ml-1">
                          {ans.pointsEarned !== undefined
                            ? `+${ans.pointsEarned}pts`
                            : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-primary-gold/70 italic">
                          &quot;{ans.answer}&quot;
                        </span>
                        <span
                          className={`text-xs ${ans.isCorrect === true ? "text-green-400" : ans.isCorrect === false ? "text-red-400" : "text-yellow-400/70"}`}
                        >
                          {ans.isCorrect === true
                            ? `✓ Correta (+${ans.pointsEarned}pts)`
                            : ans.isCorrect === false
                              ? "✗ Errada"
                              : "⏳ Aguardando correção"}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="pl-5 text-xs text-primary-gold/25 italic">
                    Não respondida
                  </span>
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
        <p className="text-base font-semibold text-primary-gold/60">
          O quiz foi encerrado
        </p>
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
              Insira seu nome para entrar na sala de espera. O quiz começará em
              breve!
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim())
                      setNameConfirmed(true);
                  }}
                  autoFocus
                  className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-primary-gold/50 uppercase tracking-wider">
                  Número da mesa{" "}
                  <span className="text-primary-gold/30 normal-case font-normal">
                    (opcional)
                  </span>
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
              onClick={() => {
                if (name.trim()) setNameConfirmed(true);
              }}
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
            <p className="text-base font-semibold text-primary-gold">
              Olá, {name}! 👋
            </p>
            <p className="text-sm text-primary-gold/50">
              Você está na sala de espera.
            </p>
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
            <p className="text-sm text-primary-gold/50">
              Aguardando o quiz ser iniciado pelo administrador...
            </p>
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
            <p className="text-xs text-yellow-400 uppercase tracking-wider">
              Quiz começa em
            </p>
            <span className="text-6xl font-bold font-mono text-yellow-400 leading-none">
              {secs}
            </span>
            <p className="text-xs text-yellow-400/60">
              Corre! Insira seu nome antes que comece 👇
            </p>
          </div>
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
            <input
              type="text"
              placeholder="Seu nome *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) setNameConfirmed(true);
              }}
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
              onClick={() => {
                if (name.trim()) setNameConfirmed(true);
              }}
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
          <p className="text-sm text-primary-gold/60 uppercase tracking-widest">
            Quiz começa em
          </p>
          <span
            className={`text-8xl font-bold font-mono leading-none transition-all ${secs <= 5 ? "text-red-400" : "text-primary-gold"}`}
          >
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
    const timePct = Math.min(
      100,
      (serverPhase.timeLeftMs / (q.timeSeconds * 1000)) * 100,
    );
    const isUrgent = timeLeftSecs <= 5;

    // Joined mid-quiz — name must be confirmed before answering anything,
    // otherwise the answers are recorded locally but never submitted (no name
    // means the auto-submit effects skip them) and the person is silently
    // lost — never appears in the final results. Block here instead of
    // showing an easy-to-miss inline banner alongside the question.
    if (!nameConfirmed) {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-yellow-700/30 bg-yellow-900/10 text-center">
            <p className="text-xs text-yellow-400 uppercase tracking-wider">
              O quiz já começou!
            </p>
            <p className="text-sm text-yellow-400/70">
              Pergunta {serverPhase.index + 1} de {questions.length} —{" "}
              {timeLeftSecs}s restantes
            </p>
            <p className="text-xs text-yellow-400/60">
              Insira seu nome para participar 👇
            </p>
          </div>
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
            <input
              type="text"
              placeholder="Seu nome *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) setNameConfirmed(true);
              }}
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
              onClick={() => {
                if (name.trim()) setNameConfirmed(true);
              }}
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl bg-primary-gold text-primary-black font-bold text-sm uppercase transition-all active:scale-[0.98] disabled:opacity-30 cursor-pointer"
            >
              Entrar no quiz
            </button>
          </div>
        </div>
      );
    }

    // Already answered — waiting for server to advance
    if (answeredThisQuestion) {
      const waitSecs = Math.ceil(serverPhase.timeLeftMs / 1000);
      const isLastQuestion = serverPhase.index === questions.length - 1;
      return (
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center">
            <LuCheck size={22} className="text-primary-gold/70" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-semibold text-primary-gold">
              Respondido!
            </p>
            {lastAnswerTimeMs !== null && (
              <p className="text-xl font-mono font-bold text-primary-gold/80">
                {(lastAnswerTimeMs / 1000).toFixed(3)}s
              </p>
            )}
            {isLastQuestion ? (
              <p className="text-sm text-primary-gold/40">
                Última questão — aguardando encerramento...{" "}
                <span className="font-mono text-primary-gold/30">
                  {waitSecs}s
                </span>
              </p>
            ) : (
              <p className="text-sm text-primary-gold/40">
                Próxima questão em{" "}
                <span className="font-mono font-semibold text-primary-gold/70">
                  {waitSecs}s
                </span>
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
        {/* Progress + timer */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs text-primary-gold/40 font-mono">
            {serverPhase.index + 1} / {questions.length}
          </span>
          <span
            className={`flex items-center gap-1.5 font-mono font-bold text-base ${isUrgent ? "text-red-400" : "text-primary-gold"}`}
          >
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
            <span>
              {q.points} pt{q.points !== 1 ? "s" : ""}
            </span>
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
                  pendingDraftRef.current = {
                    questionId: q.id,
                    text: e.target.value,
                  };
                }}
                className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-xl px-4 py-3 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 resize-none transition-all"
              />
              <button
                onClick={() => {
                  if (textDraft.trim())
                    handleAnswerQuestion(q.id, textDraft.trim());
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

  // ── TEMPO ESGOTADO ───────────────────────────────────────────────────────────
  // Reached right when the local timeline finishes (before the auto-submit
  // effect runs) or by someone who opens the page after every question's time
  // has already run out but the admin hasn't clicked "encerrar" yet. Without
  // this, both cases fell through every branch above and rendered nothing.
  if (serverPhase.type === "done") {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-10">
        <div className="w-14 h-14 rounded-full bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center">
          <LuClock size={22} className="text-primary-gold/40" />
        </div>
        <p className="text-base font-semibold text-primary-gold/60">
          Tempo esgotado!
        </p>
        <p className="text-sm text-primary-gold/35 max-w-[280px]">
          As perguntas já terminaram. Aguarde o administrador encerrar e liberar
          os resultados.
        </p>
      </div>
    );
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOLÃO SECTION
// ══════════════════════════════════════════════════════════════════════════════

function BolaoSection({
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

// ══════════════════════════════════════════════════════════════════════════════
// VOTAÇÃO — medalhas
// ══════════════════════════════════════════════════════════════════════════════

const VOTING_MEDAL_SRC: Record<number, string> = {
  1: "/svg/medalha-ouro.svg",
  2: "/svg/medalha-prata.svg",
  3: "/svg/medalha-bronze.svg",
};
const VOTING_PODIUM_META: Record<
  number,
  { height: string; name: string; pedestal: string; delay: string }
> = {
  1: {
    height: "h-24",
    name: "text-yellow-400",
    pedestal:
      "from-yellow-400/15 to-yellow-400/[0.03] border-yellow-400/30 text-yellow-400",
    delay: "0.05s",
  },
  2: {
    height: "h-16",
    name: "text-zinc-300",
    pedestal:
      "from-zinc-400/15 to-zinc-400/[0.03] border-zinc-400/25 text-zinc-400",
    delay: "0.3s",
  },
  3: {
    height: "h-12",
    name: "text-amber-600",
    pedestal:
      "from-amber-600/15 to-amber-600/[0.03] border-amber-700/30 text-amber-600",
    delay: "0.45s",
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// VOTAÇÃO PODIUM
// ══════════════════════════════════════════════════════════════════════════════

function VotingPodium({
  groups,
  entries,
  onExpand,
}: {
  groups: RankedGroup[];
  entries: (VotingEntryType & { id: string })[];
  onExpand: (entry: VotingEntryType & { id: string }) => void;
}) {
  const top3Groups = groups.slice(0, 3);
  if (top3Groups.length === 0) return null;

  // Disposição clássica: 2º à esquerda, 1º no centro, 3º à direita
  const slots = [
    top3Groups[1] && { group: top3Groups[1], rank: 2 },
    { group: top3Groups[0], rank: 1 },
    top3Groups[2] && { group: top3Groups[2], rank: 3 },
  ].filter(Boolean) as { group: RankedGroup; rank: number }[];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
      <span className="text-center text-[11px] uppercase tracking-widest text-primary-gold/40">
        Pódio
      </span>
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {slots.map(({ group, rank }) => {
          const meta = VOTING_PODIUM_META[rank];
          const groupEntries = group.entryIds
            .map((id) => entries.find((e) => e.id === id))
            .filter((e): e is VotingEntryType & { id: string } => !!e);
          const isTied = groupEntries.length > 1;
          return (
            <div
              key={group.entryIds.join("-")}
              className="podium-col flex flex-col items-center gap-1.5 flex-1 min-w-0 max-w-[150px]"
              style={{ animationDelay: meta.delay }}
            >
              <img
                src={VOTING_MEDAL_SRC[rank]}
                alt={`${rank}º lugar`}
                className={rank === 1 ? "w-10 h-10" : "w-8 h-8"}
              />
              <div className="flex items-end justify-center">
                {groupEntries.map((entry, i) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onExpand(entry)}
                    className={`relative rounded-full overflow-hidden border-2 bg-primary-black/50 shrink-0 cursor-zoom-in active:brightness-75 transition-[filter] ${
                      isTied
                        ? "w-12 h-12 border-secondary-black"
                        : "w-16 h-16 border-primary-gold/25"
                    } ${isTied && i > 0 ? "-ml-3" : ""}`}
                    style={isTied ? { zIndex: groupEntries.length - i } : undefined}
                  >
                    {entry.images?.[0] && (
                      <img
                        src={entry.images[0]}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {!isTied && (
                      <span className="absolute bottom-0 left-0 w-5 h-5 rounded-full bg-primary-black/70 text-primary-gold flex items-center justify-center">
                        <LuExpand size={9} />
                      </span>
                    )}
                    {!isTied && entry.images?.length > 1 && (
                      <span className="absolute bottom-0 right-0 flex items-center gap-0.5 text-[8px] font-bold bg-primary-black/80 text-primary-gold px-1 rounded-tl-md">
                        <LuImages size={8} /> {entry.images.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <span
                className={`text-sm font-semibold truncate max-w-full ${meta.name}`}
              >
                {groupEntries.map((e) => e.name).join(" & ")}
              </span>
              {isTied && (
                <span className="text-[10px] text-primary-gold/40 flex items-center gap-1">
                  🤝 Empate
                </span>
              )}
              <span className="text-[11px] font-mono text-primary-gold/40 flex items-center gap-1">
                <LuVote size={10} /> {group.votes}
              </span>
              <div
                className={`w-full ${meta.height} mt-1 rounded-t-lg border border-b-0 bg-gradient-to-t ${meta.pedestal} flex items-start justify-center pt-1.5`}
              >
                <span className="text-xl font-bold opacity-50">{rank}º</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/30 to-transparent -mt-4" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VOTAÇÃO SECTION
// ══════════════════════════════════════════════════════════════════════════════

function VotingSection({
  event,
  eventId,
  addAlert,
}: {
  event: EventItemType & { id: string };
  eventId: string;
  addAlert: (msg: string) => void;
}) {
  const [entries, setEntries] = useState<(VotingEntryType & { id: string })[]>(
    [],
  );
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [myVotes, setMyVotes] = useState<(VotingVoteType & { id: string })[]>(
    [],
  );
  const [votesLoaded, setVotesLoaded] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [allVotes, setAllVotes] = useState<(VotingVoteType & { id: string })[]>(
    [],
  );
  const [lightbox, setLightbox] = useState<{
    images: string[];
    name: string;
    startIndex: number;
  } | null>(null);
  const participantIdRef = useRef<string>("");

  useEffect(() => {
    participantIdRef.current = getOrCreateParticipantId();
  }, []);

  // Live-subscribe to entries so newly cadastradas fantasias appear without refresh
  useEffect(() => {
    const unsub = VotingEntryRepository.subscribeToEventEntries(
      eventId,
      (fetched) => {
        setEntries(fetched);
        setEntriesLoaded(true);
      },
    );
    return () => unsub();
  }, [eventId]);

  // Sabe se (e em quê) esse dispositivo já votou — depois de votar, o voto
  // fica travado (não dá mais pra trocar), então isso decide se mostra a
  // grade de seleção ou a tela de "você já votou".
  useEffect(() => {
    const unsub = VotingVoteRepository.subscribeToParticipantVotes(
      eventId,
      getOrCreateParticipantId(),
      (votes) => {
        setMyVotes(votes);
        setVotesLoaded(true);
      },
    );
    return () => unsub();
  }, [eventId]);

  // Full vote tally — só é necessário depois que o admin libera o resultado
  useEffect(() => {
    if (event.votacaoStatus !== "encerrada" || !event.votacaoResultsVisible) {
      setAllVotes([]);
      return;
    }
    const unsub = VotingVoteRepository.subscribeToEventVotes(
      eventId,
      setAllVotes,
    );
    return () => unsub();
  }, [eventId, event.votacaoStatus, event.votacaoResultsVisible]);

  // Toca num card pra selecionar/desmarcar — no máximo 2 escolhidos por vez.
  const toggleSelectEntry = (entryId: string) => {
    setSelectedEntryIds((prev) => {
      if (prev.includes(entryId)) return prev.filter((id) => id !== entryId);
      if (prev.length >= 2) {
        addAlert(
          "Você já escolheu 2 fantasias — toque em uma delas pra trocar.",
        );
        return prev;
      }
      return [...prev, entryId];
    });
  };

  // Confirma as 2 escolhas — depois disso o voto fica travado, sem volta.
  const handleSubmitVotes = async () => {
    if (selectedEntryIds.length !== 2 || submittingVotes || myVotes.length === 2)
      return;
    setSubmittingVotes(true);
    try {
      const participantId =
        participantIdRef.current || getOrCreateParticipantId();
      // Guarda contra corrida: confere se já não votou antes de criar
      const existing = await VotingVoteRepository.getAllByParticipantId(
        eventId,
        participantId,
      );
      if (existing.length > 0) {
        addAlert("Você já votou!");
        return;
      }
      await Promise.all(
        selectedEntryIds.map((entryId) =>
          VotingVoteRepository.create({ eventId, participantId, entryId }),
        ),
      );
      addAlert("Voto registrado! Obrigado por participar 🎭");
    } catch {
      addAlert("Erro ao registrar seu voto.");
    } finally {
      setSubmittingVotes(false);
    }
  };

  const openLightbox = (
    entry: VotingEntryType & { id: string },
    startIndex = 0,
  ) => {
    if (!entry.images || entry.images.length === 0) return;
    setLightbox({ images: entry.images, name: entry.name, startIndex });
  };

  if (!entriesLoaded || !votesLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
        </div>
      </div>
    );
  }

  let body: React.ReactNode;

  if ((event.votacaoStatus ?? "cadastro") === "cadastro") {
    // ── Cadastro ainda em andamento ──
    body = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center">
            <LuDrama size={22} className="text-primary-gold/60" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-primary-gold/80">
              As fantasias ainda estão sendo cadastradas
            </p>
            <p className="text-sm text-primary-gold/40">
              Volte em instantes — a votação abre em breve!
            </p>
          </div>
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/40 waiting-dot" />
          </div>
        </div>
        {event.votacaoAllowClientSubmissions && (
          <ClientEntryManager
            eventId={eventId}
            entries={entries}
            allowMultiple={!!event.votacaoAllowMultipleClientSubmissions}
            addAlert={addAlert}
          />
        )}
      </div>
    );
  } else if (
    event.votacaoStatus === "encerrada" &&
    !event.votacaoResultsVisible
  ) {
    // ── Votação encerrada, aguardando liberação do resultado ──
    body = (
      <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 text-center">
        <div className="w-12 h-12 rounded-full bg-primary-gold/10 border border-primary-gold/20 flex items-center justify-center">
          <LuVote size={22} className="text-primary-gold/60" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-primary-gold/80">
            Votação encerrada!
          </p>
          <p className="text-sm text-primary-gold/40">
            Aguardando a liberação do resultado pelo administrador...
          </p>
        </div>
        <div className="flex gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
        </div>
      </div>
    );
  } else if (event.votacaoStatus === "encerrada") {
    // ── Resultado liberado ──
    const voteCountByEntry: Record<string, number> = {};
    allVotes.forEach((v) => {
      voteCountByEntry[v.entryId] = (voteCountByEntry[v.entryId] ?? 0) + 1;
    });
    const groups = computeRankedGroups(
      entries,
      voteCountByEntry,
      event.votacaoChampionId,
    );

    body = (
      <div className="flex flex-col gap-5">
        <VotingPodium
          groups={groups}
          entries={entries}
          onExpand={(entry) => openLightbox(entry)}
        />
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const groupEntries = group.entryIds
              .map((id) => entries.find((e) => e.id === id))
              .filter((e): e is VotingEntryType & { id: string } => !!e);
            const isTied = groupEntries.length > 1;
            return (
              <div
                key={group.entryIds.join("-")}
                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                  group.rank === 1
                    ? "border-yellow-500/40 bg-yellow-500/[0.06]"
                    : "border-primary-gold/10 bg-secondary-black/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {group.rank <= 3 ? (
                    <img
                      src={VOTING_MEDAL_SRC[group.rank]}
                      alt={`${group.rank}º lugar`}
                      className="w-5 h-5 shrink-0"
                    />
                  ) : (
                    <span className="text-xs text-primary-gold/30 font-mono shrink-0">
                      {group.rank}º
                    </span>
                  )}
                  {isTied && (
                    <span className="text-[10px] text-primary-gold/50 bg-primary-gold/5 border border-primary-gold/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      🤝 Empate
                    </span>
                  )}
                  <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary-gold bg-primary-gold/10 border border-primary-gold/20 px-2 py-1 rounded-full ml-auto">
                    <LuVote size={11} />
                    {group.votes}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {groupEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openLightbox(entry)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0 cursor-zoom-in active:brightness-75 transition-[filter]"
                      >
                        {entry.images?.[0] && (
                          <img
                            src={entry.images[0]}
                            alt={entry.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {entry.images?.length > 1 && (
                          <span className="absolute bottom-0 right-0 flex items-center gap-0.5 text-[8px] font-bold bg-primary-black/80 text-primary-gold px-1 rounded-tl-md">
                            <LuImages size={8} /> {entry.images.length}
                          </span>
                        )}
                      </button>
                      <span className="text-sm font-medium text-primary-gold/90 flex-1 truncate">
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else {
    // ── Votação aberta ──
    if (myVotes.length === 2) {
      // Já votou — o voto fica travado, sem volta. Mostra o que escolheu.
      const votedEntries = entries.filter((e) =>
        myVotes.some((v) => v.entryId === e.id),
      );
      body = (
        <div className="flex flex-col items-center gap-5 p-6 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <LuCheck size={22} className="text-green-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-primary-gold/90">
              Voto registrado!
            </p>
            <p className="text-sm text-primary-gold/40">
              Aguarde a votação encerrar e o resultado ser liberado.
            </p>
          </div>
          {votedEntries.length > 0 && (
            <div className="flex gap-3 w-full justify-center">
              {votedEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openLightbox(entry)}
                  className="flex flex-col items-center gap-2 flex-1 max-w-[140px]"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden border border-primary-gold/20 bg-primary-black/50 cursor-zoom-in">
                    {entry.images?.[0] && (
                      <img
                        src={entry.images[0]}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-primary-gold/80 truncate w-full">
                    {entry.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
            <span className="w-2.5 h-2.5 rounded-full bg-primary-gold/30 waiting-dot" />
          </div>
        </div>
      );
    } else {
      body = (
        <div className="flex flex-col gap-4 pb-24">
          <p className="text-center text-sm text-primary-gold/50">
            Escolha exatamente <strong>2 fantasias</strong> favoritas e toque
            em Votar. Depois de confirmar, não dá pra trocar.
          </p>

          {entries.length === 0 ? (
            <p className="text-center text-sm text-primary-gold/30 py-8">
              Nenhuma fantasia cadastrada ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entries.map((entry) => {
                const isSelected = selectedEntryIds.includes(entry.id);
                const selectionFull =
                  selectedEntryIds.length >= 2 && !isSelected;
                return (
                  <div
                    key={entry.id}
                    className={`relative flex flex-col gap-3 p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-primary-gold bg-primary-gold/10"
                        : selectionFull
                          ? "border-primary-gold/10 bg-secondary-black/40 opacity-50"
                          : "border-primary-gold/15 bg-secondary-black/40"
                    }`}
                  >
                    <EntryPhotoCarousel
                      images={entry.images ?? []}
                      name={entry.name}
                      onExpand={(startIndex) =>
                        openLightbox(entry, startIndex)
                      }
                    />
                    <span className="text-base font-semibold text-primary-gold/90 truncate">
                      {entry.name}
                    </span>
                    {isSelected && (
                      <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-primary-gold text-primary-black flex items-center justify-center shadow-lg pointer-events-none">
                        <LuCheck size={14} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleSelectEntry(entry.id)}
                      disabled={selectionFull}
                      className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                        isSelected
                          ? "bg-primary-gold text-primary-black cursor-pointer"
                          : "bg-primary-gold/10 border border-primary-gold/40 text-primary-gold hover:bg-primary-gold/20 cursor-pointer disabled:cursor-not-allowed"
                      }`}
                    >
                      {isSelected ? "Selecionada ✓" : "Selecionar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  }

  const showVoteBar =
    event.votacaoStatus === "aberta" &&
    entries.length > 0 &&
    myVotes.length !== 2;

  return (
    <>
      {body}
      {showVoteBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-primary-black/95 backdrop-blur-sm border-t border-primary-gold/15 px-4 py-3">
          <div className="max-w-[480px] mx-auto flex items-center gap-3">
            <span className="text-xs text-primary-gold/50 shrink-0">
              {selectedEntryIds.length}/2 selecionadas
            </span>
            <button
              type="button"
              onClick={handleSubmitVotes}
              disabled={selectedEntryIds.length !== 2 || submittingVotes}
              className="flex-1 py-3 rounded-xl bg-primary-gold text-primary-black font-bold text-sm tracking-wider uppercase transition-all hover:bg-primary-gold/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {submittingVotes ? "Enviando..." : "Votar"}
            </button>
          </div>
        </div>
      )}
      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          name={lightbox.name}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CADASTRO DE FANTASIA PELO PRÓPRIO CLIENTE (opcional, controlado pelo admin)
// ══════════════════════════════════════════════════════════════════════════════

type ClientStagedPhoto = {
  key: string;
  originalFile: File;
  croppedFile: File | null;
  previewUrl: string;
};

// IDs das fantasias que ESSE dispositivo enviou, por evento — guardado no
// localStorage porque não existe login: é a única forma de saber "essa é a
// minha fantasia, deixa eu editar" quando a pessoa volta à página.
function mySubmittedEntriesKey(eventId: string): string {
  return `votacao_my_entries_${eventId}`;
}

function getMySubmittedEntryIds(eventId: string): string[] {
  try {
    const raw = localStorage.getItem(mySubmittedEntriesKey(eventId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addMySubmittedEntryId(eventId: string, entryId: string) {
  try {
    const current = getMySubmittedEntryIds(eventId);
    if (!current.includes(entryId)) {
      localStorage.setItem(
        mySubmittedEntriesKey(eventId),
        JSON.stringify([...current, entryId]),
      );
    }
  } catch {
    // localStorage indisponível (modo privado etc.) — só significa que a
    // pessoa não vai conseguir editar depois, sem quebrar o envio.
  }
}

function ClientEntryManager({
  eventId,
  entries,
  allowMultiple,
  addAlert,
}: {
  eventId: string;
  entries: (VotingEntryType & { id: string })[];
  allowMultiple: boolean;
  addAlert: (msg: string) => void;
}) {
  const [myEntryIds, setMyEntryIds] = useState<string[]>(() =>
    getMySubmittedEntryIds(eventId),
  );
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Só considera fantasias que ainda existem (o admin pode ter excluído).
  const myEntries = entries.filter((e) => myEntryIds.includes(e.id));
  const canAddNew = allowMultiple || myEntries.length === 0;

  const handleSubmitted = (entryId: string) => {
    addMySubmittedEntryId(eventId, entryId);
    setMyEntryIds((prev) => (prev.includes(entryId) ? prev : [...prev, entryId]));
  };

  return (
    <div className="flex flex-col gap-3">
      {myEntries.map((entry) =>
        editingEntryId === entry.id ? (
          <ClientEntryEditForm
            key={entry.id}
            entry={entry}
            addAlert={addAlert}
            onCancel={() => setEditingEntryId(null)}
            onSaved={() => setEditingEntryId(null)}
          />
        ) : (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 rounded-2xl border border-primary-gold/30 bg-primary-gold/5"
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0">
              {entry.images?.[0] && (
                <img
                  src={entry.images[0]}
                  alt={entry.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0 gap-0.5">
              <span className="text-sm font-semibold text-primary-gold/90 truncate">
                {entry.name}
              </span>
              <span className="text-[11px] text-primary-gold/40">
                Sua fantasia enviada
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditingEntryId(entry.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary-gold/20 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer shrink-0"
            >
              <LuPencil size={12} /> Editar
            </button>
          </div>
        ),
      )}

      {canAddNew && (
        <ClientEntrySubmissionForm
          eventId={eventId}
          addAlert={addAlert}
          onSubmitted={handleSubmitted}
        />
      )}

      {!canAddNew && (
        <p className="text-xs text-primary-gold/35 text-center">
          Você já enviou sua fantasia — pode editar ela acima até a votação
          abrir.
        </p>
      )}
    </div>
  );
}

function ClientEntrySubmissionForm({
  eventId,
  addAlert,
  onSubmitted,
}: {
  eventId: string;
  addAlert: (msg: string) => void;
  onSubmitted: (entryId: string) => void;
}) {
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<ClientStagedPhoto[]>([]);
  const [cropperKey, setCropperKey] = useState<string | null>(null);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: crypto.randomUUID(),
        originalFile: file,
        croppedFile: null,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePhoto = (key: string) => {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  };

  const openCropper = (key: string) => {
    const staged = photos.find((p) => p.key === key);
    if (!staged) return;
    setCropperKey(key);
    setCropperFile(staged.croppedFile ?? staged.originalFile);
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (!cropperKey) return;
    const previewUrl = URL.createObjectURL(croppedFile);
    setPhotos((prev) =>
      prev.map((p) =>
        p.key === cropperKey ? { ...p, croppedFile, previewUrl } : p,
      ),
    );
    setCropperKey(null);
    setCropperFile(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      addAlert("Digite o nome da fantasia.");
      return;
    }
    if (photos.length === 0) {
      addAlert("Selecione ao menos uma foto.");
      return;
    }
    setSubmitting(true);
    try {
      const images: string[] = [];
      for (const staged of photos) {
        const fileToUpload = staged.croppedFile ?? staged.originalFile;
        const { url } = await uploadImageToFirebase(
          fileToUpload,
          "voting-entries",
        );
        images.push(url);
      }
      const id = await VotingEntryRepository.create({
        eventId,
        name: name.trim(),
        images,
        submittedByClient: true,
      });
      if (id) {
        addAlert("Fantasia enviada! 🎭");
        setName("");
        setPhotos([]);
        onSubmitted(id);
      } else {
        addAlert("Erro ao enviar sua fantasia.");
      }
    } catch {
      addAlert("Erro ao enviar sua fantasia.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary-gold/15 bg-secondary-black/40">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-primary-gold/90">
          Quer participar?
        </span>
        <span className="text-xs text-primary-gold/40">
          Cadastre sua fantasia — foto(s) + nome.
        </span>
      </div>

      <input
        type="text"
        placeholder="Nome da fantasia"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2.5 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all"
      />

      <label className="flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-primary-gold/30 hover:border-primary-gold/60 text-sm text-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all">
        <LuImagePlus size={16} />
        Selecionar fotos
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </label>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((staged) => (
            <div key={staged.key} className="relative shrink-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50">
                <img
                  src={staged.previewUrl}
                  alt="Prévia"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => openCropper(staged.key)}
                className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary-gold text-primary-black flex items-center justify-center cursor-pointer"
              >
                <LuScissors size={10} />
              </button>
              <button
                type="button"
                onClick={() => removePhoto(staged.key)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-invalid-color text-white flex items-center justify-center cursor-pointer"
              >
                <LuX size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 rounded-xl bg-primary-gold text-primary-black font-bold text-sm tracking-wider uppercase transition-all hover:bg-primary-gold/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {submitting ? "Enviando..." : "Enviar fantasia"}
      </button>

      <ImageCropperModal
        isOpen={!!cropperKey}
        file={cropperFile}
        onCancel={() => {
          setCropperKey(null);
          setCropperFile(null);
        }}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

function ClientEntryEditForm({
  entry,
  addAlert,
  onCancel,
  onSaved,
}: {
  entry: VotingEntryType & { id: string };
  addAlert: (msg: string) => void;
  onCancel: VoidFunction;
  onSaved: VoidFunction;
}) {
  const [name, setName] = useState(entry.name);
  const [existingImages, setExistingImages] = useState<string[]>(
    entry.images ?? [],
  );
  const [newPhotos, setNewPhotos] = useState<ClientStagedPhoto[]>([]);
  const [cropperKey, setCropperKey] = useState<string | null>(null);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setNewPhotos((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: crypto.randomUUID(),
        originalFile: file,
        croppedFile: null,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const removeNewPhoto = (key: string) => {
    setNewPhotos((prev) => prev.filter((p) => p.key !== key));
  };

  const openCropper = (key: string) => {
    const staged = newPhotos.find((p) => p.key === key);
    if (!staged) return;
    setCropperKey(key);
    setCropperFile(staged.croppedFile ?? staged.originalFile);
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (!cropperKey) return;
    const previewUrl = URL.createObjectURL(croppedFile);
    setNewPhotos((prev) =>
      prev.map((p) =>
        p.key === cropperKey ? { ...p, croppedFile, previewUrl } : p,
      ),
    );
    setCropperKey(null);
    setCropperFile(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addAlert("Digite o nome da fantasia.");
      return;
    }
    if (existingImages.length === 0 && newPhotos.length === 0) {
      addAlert("A fantasia precisa ter ao menos uma foto.");
      return;
    }
    setSaving(true);
    try {
      const newUrls: string[] = [];
      for (const staged of newPhotos) {
        const fileToUpload = staged.croppedFile ?? staged.originalFile;
        const { url } = await uploadImageToFirebase(
          fileToUpload,
          "voting-entries",
        );
        newUrls.push(url);
      }
      const finalImages = [...existingImages, ...newUrls];

      // Fotos que existiam antes e foram removidas nessa edição — apaga do
      // Storage pra não ficar acumulando lixo.
      const removedUrls = (entry.images ?? []).filter(
        (url) => !existingImages.includes(url),
      );
      await Promise.all(
        removedUrls.map(async (url) => {
          const path = getPathFromFirebaseUrl(url);
          if (path) await deleteImageFromFirebase(path);
        }),
      );

      await VotingEntryRepository.update(entry.id, {
        name: name.trim(),
        images: finalImages,
      });
      addAlert("Fantasia atualizada!");
      onSaved();
    } catch {
      addAlert("Erro ao atualizar sua fantasia.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary-gold/40 bg-primary-black/30">
      <input
        type="text"
        placeholder="Nome da fantasia"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2.5 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all"
      />

      {existingImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingImages.map((url) => (
            <div key={url} className="relative shrink-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50">
                <img
                  src={url}
                  alt="Foto"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExistingImage(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-invalid-color text-white flex items-center justify-center cursor-pointer"
              >
                <LuX size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {newPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {newPhotos.map((staged) => (
            <div key={staged.key} className="relative shrink-0">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary-gold/30 bg-primary-black/50">
                <img
                  src={staged.previewUrl}
                  alt="Prévia"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => openCropper(staged.key)}
                className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary-gold text-primary-black flex items-center justify-center cursor-pointer"
              >
                <LuScissors size={10} />
              </button>
              <button
                type="button"
                onClick={() => removeNewPhoto(staged.key)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-invalid-color text-white flex items-center justify-center cursor-pointer"
              >
                <LuX size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-primary-gold/30 hover:border-primary-gold/60 text-xs text-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all">
        <LuImagePlus size={14} />
        Adicionar mais fotos
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-primary-gold text-primary-black font-bold text-sm tracking-wider uppercase transition-all hover:bg-primary-gold/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold hover:border-primary-gold/40 text-sm font-medium transition-all cursor-pointer disabled:opacity-40"
        >
          Cancelar
        </button>
      </div>

      <ImageCropperModal
        isOpen={!!cropperKey}
        file={cropperFile}
        onCancel={() => {
          setCropperKey(null);
          setCropperFile(null);
        }}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARROSSEL DE FOTOS DA FANTASIA
// ══════════════════════════════════════════════════════════════════════════════

function EntryPhotoCarousel({
  images,
  name,
  onExpand,
}: {
  images: string[];
  name: string;
  onExpand: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const hasMultiple = images.length > 1;
  const dragStartX = useRef<number | null>(null);

  // Pré-carrega todos os ângulos assim que o card aparece — sem isso, cada
  // troca de foto dispara um novo download e o slide trava por um instante.
  useEffect(() => {
    images.forEach((src) => {
      const img = new window.Image();
      img.onload = () => setLoaded((prev) => new Set(prev).add(src));
      img.src = src;
    });
  }, [images]);

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
  };
  const handleDragEnd = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1);
    dragStartX.current = null;
  };

  const current = images[index];
  const currentLoaded = current ? loaded.has(current) : false;

  return (
    <div
      className="relative aspect-[3/4] w-full rounded-xl overflow-hidden border border-primary-gold/10 bg-primary-black/50 flex items-center justify-center select-none touch-pan-y"
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseUp={(e) => handleDragEnd(e.clientX)}
      onMouseLeave={() => {
        dragStartX.current = null;
      }}
    >
      {images.length > 0 ? (
        <>
          {!currentLoaded && (
            <div className="absolute inset-0 bg-primary-gold/[0.06] animate-pulse" />
          )}
          <img
            src={current}
            alt={`${name} — foto ${index + 1} de ${images.length}`}
            onLoad={() => setLoaded((prev) => new Set(prev).add(current))}
            className={`w-full h-full object-cover cursor-zoom-in transition-opacity duration-200 ${
              currentLoaded ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => onExpand(index)}
          />
        </>
      ) : (
        <LuDrama size={32} className="text-primary-gold/20" />
      )}

      {images.length > 0 && (
        <span className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-primary-black/60 backdrop-blur-sm text-primary-gold flex items-center justify-center pointer-events-none">
          <LuExpand size={14} />
        </span>
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary-black/60 backdrop-blur-sm text-primary-gold flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <LuChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary-black/60 backdrop-blur-sm text-primary-gold flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          >
            <LuChevronRight size={18} />
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-4 bg-primary-gold"
                    : "w-1.5 bg-primary-gold/30"
                }`}
              />
            ))}
          </div>
          <span className="absolute top-2.5 right-2.5 flex items-center gap-0.5 text-[10px] font-bold bg-primary-black/70 text-primary-gold px-1.5 py-0.5 rounded-full">
            <LuImages size={10} /> {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LIGHTBOX — foto em tela cheia
// ══════════════════════════════════════════════════════════════════════════════

function PhotoLightbox({
  images,
  name,
  startIndex,
  onClose,
}: {
  images: string[];
  name: string;
  startIndex: number;
  onClose: VoidFunction;
}) {
  const [index, setIndex] = useState(startIndex);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Mesma lógica do carrossel: pré-carrega os outros ângulos pra não travar
  // ao navegar dentro do lightbox.
  useEffect(() => {
    images.forEach((src) => {
      const img = new window.Image();
      img.onload = () => setLoaded((prev) => new Set(prev).add(src));
      img.src = src;
    });
  }, [images]);

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
  };

  const handleDragStart = (clientX: number) => {
    dragStartX.current = clientX;
  };
  const handleDragEnd = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    if (Math.abs(delta) > 40) go(delta > 0 ? -1 : 1);
    dragStartX.current = null;
  };

  const current = images[index];
  const currentLoaded = current ? loaded.has(current) : false;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-sm flex flex-col items-center justify-center px-2"
      onClick={onClose}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseUp={(e) => handleDragEnd(e.clientX)}
      onMouseLeave={() => {
        dragStartX.current = null;
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary-black/70 border border-primary-gold/20 text-primary-gold flex items-center justify-center cursor-pointer z-10"
      >
        <LuX size={18} />
      </button>

      <span className="absolute top-4 left-4 right-16 text-sm font-medium text-primary-gold/80 truncate">
        {name}
      </span>

      <div className="relative flex items-center justify-center max-w-[94vw] max-h-[76vh]">
        {!currentLoaded && (
          <div className="w-[70vw] max-w-[420px] aspect-[3/4] rounded-lg bg-primary-gold/[0.06] animate-pulse" />
        )}
        <img
          src={current}
          alt={`${name} — foto ${index + 1} de ${images.length}`}
          onLoad={() => setLoaded((prev) => new Set(prev).add(current))}
          className={`max-w-[94vw] max-h-[76vh] object-contain rounded-lg transition-opacity duration-200 ${
            currentLoaded ? "opacity-100" : "hidden"
          }`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="w-11 h-11 rounded-full bg-primary-black/60 border border-primary-gold/20 text-primary-gold flex items-center justify-center cursor-pointer active:scale-90 transition-transform shrink-0"
          >
            <LuChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-5 bg-primary-gold"
                      : "w-1.5 bg-primary-gold/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-primary-gold/50">
              {index + 1} / {images.length}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="w-11 h-11 rounded-full bg-primary-black/60 border border-primary-gold/20 text-primary-gold flex items-center justify-center cursor-pointer active:scale-90 transition-transform shrink-0"
          >
            <LuChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
