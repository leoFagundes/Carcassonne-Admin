"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Reorder, useDragControls } from "framer-motion";
import {
  LuAlignLeft,
  LuBrain,
  LuCalendarDays,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuClock,
  LuCircleHelp,
  LuCircleSlash,
  LuCrown,
  LuDrama,
  LuGripVertical,
  LuImage,
  LuImagePlus,
  LuInfo,
  LuPencil,
  LuEye,
  LuPlay,
  LuPlus,
  LuRefreshCw,
  LuScissors,
  LuSettings2,
  LuSmartphone,
  LuTimer,
  LuShield,
  LuSquare,
  LuSwords,
  LuToggleLeft,
  LuToggleRight,
  LuTrash,
  LuTrophy,
  LuUsers,
  LuVote,
  LuX,
} from "react-icons/lu";
import { Timestamp, deleteField, updateDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Modal from "@/components/modal";
import EventForms from "@/components/eventForms";
import ImageCropperModal from "@/components/imageCropperModal";
import EventRepository from "@/services/repositories/EventRepository";
import BolaoTeamRepository from "@/services/repositories/BolaoTeamRepository";
import BolaoMatchRepository from "@/services/repositories/BolaoMatchRepository";
import BolaoParticipantRepository from "@/services/repositories/BolaoParticipantRepository";
import QuizQuestionRepository from "@/services/repositories/QuizQuestionRepository";
import QuizParticipantRepository from "@/services/repositories/QuizParticipantRepository";
import VotingEntryRepository from "@/services/repositories/VotingEntryRepository";
import VotingVoteRepository from "@/services/repositories/VotingVoteRepository";
import {
  uploadImageToFirebase,
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
} from "@/services/repositories/FirebaseImageUtils";
import {
  EventItemType,
  BolaoTeamType,
  BolaoMatchType,
  BolaoParticipantType,
  QuizQuestionType,
  QuizParticipantType,
  VotingEntryType,
  VotingVoteType,
} from "@/types";
import { patternEvent } from "@/utils/patternValues";
import { getLucideIcon } from "@/utils/utilFunctions";
import { getTopTiedEntryIds } from "@/utils/votingResults";
import Input from "@/components/input";
import Button from "@/components/button";
import Loader from "@/components/loader";
import Tooltip from "@/components/Tooltip";

// ── Types ──────────────────────────────────────────────────────────────────────

type TeamFormState = { name: string; imageUrl: string };
type MatchFormState = { teamAId: string; teamBId: string; date: string };
type BolaoTab = "times" | "partidas" | "palpites";
type QuizTab = "perguntas" | "participantes";
type QuizQuestionFormState = {
  text: string;
  type: "multiple_choice" | "text";
  options: string[];
  correctOption: number;
  points: number;
  timeSeconds: number;
};
// Uma foto "em espera" (selecionada mas ainda não enviada ao Storage) —
// usada tanto pra criar uma fantasia nova quanto pra adicionar mais ângulos
// a uma fantasia já existente.
type StagedPhoto = {
  key: string;
  originalFile: File;
  croppedFile: File | null;
  previewUrl: string;
};
type CropperContext =
  | { mode: "newEntry"; key: string }
  | { mode: "editEntry"; key: string };

const patternTeamForm: TeamFormState = { name: "", imageUrl: "" };
const patternMatchForm: MatchFormState = { teamAId: "", teamBId: "", date: "" };
const patternQuestionForm: QuizQuestionFormState = {
  text: "",
  type: "multiple_choice",
  options: ["", ""],
  correctOption: 0,
  points: 1,
  timeSeconds: 30,
};

// ── NumberStepper ──────────────────────────────────────────────────────────────

function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-0 rounded-lg border border-primary-gold/20 overflow-hidden bg-primary-black/40">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        className="w-9 h-9 flex items-center justify-center text-primary-gold/60 hover:bg-primary-gold/10 hover:text-primary-gold active:bg-primary-gold/20 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed text-lg font-bold select-none shrink-0"
      >
        −
      </button>
      <span className="min-w-[2.5rem] text-center text-sm font-mono font-semibold text-primary-gold px-1 select-none">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        className="w-9 h-9 flex items-center justify-center text-primary-gold/60 hover:bg-primary-gold/10 hover:text-primary-gold active:bg-primary-gold/20 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed text-lg font-bold select-none shrink-0"
      >
        +
      </button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function SearchParamsTrigger({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("createevento") === "true") {
      onTrigger();
    }
  }, []);
  return null;
}

function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary-gold/5 border border-primary-gold/10 text-xs text-primary-gold/50">
      <LuInfo size={12} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// Envolve uma linha da lista de fantasias num item arrastável (framer-motion
// Reorder), soltando o handle de arrastar pro conteúdo via render-prop pra
// não duplicar o JSX de exibição/edição em dois lugares.
function DraggableEntryItem({
  entry,
  children,
}: {
  entry: VotingEntryType & { id: string };
  children: (dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const dragControls = useDragControls();
  const dragHandle = (
    <button
      type="button"
      onPointerDown={(e) => dragControls.start(e)}
      className="cursor-grab active:cursor-grabbing touch-none text-primary-gold/30 hover:text-primary-gold/60 transition-colors shrink-0 p-1 -ml-1"
    >
      <LuGripVertical size={15} />
    </button>
  );
  return (
    <Reorder.Item
      value={entry}
      dragListener={false}
      dragControls={dragControls}
    >
      {children(dragHandle)}
    </Reorder.Item>
  );
}

function FlagPreview({
  url,
  name,
  size = 8,
}: {
  url: string;
  name?: string;
  size?: number;
}) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt={name ?? "flag"}
      className={`w-${size} h-${size} rounded object-cover border border-primary-gold/20 shrink-0`}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function EventosPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<(EventItemType & { id: string })[]>([]);

  const [eventFormsModal, setEventFormsModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventItemType>(patternEvent);

  // Management modal (bolão OR quiz)
  const [managementModal, setManagementModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<
    (EventItemType & { id: string }) | null
  >(null);

  // ── Bolão state ──────────────────────────────────────────────────────────────
  const [bolaoTab, setBolaoTab] = useState<BolaoTab>("times");
  const [teams, setTeams] = useState<(BolaoTeamType & { id: string })[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamForm, setTeamForm] = useState<TeamFormState>(patternTeamForm);
  const [editingTeam, setEditingTeam] = useState<
    (BolaoTeamType & { id: string }) | null
  >(null);
  const [teamSaving, setTeamSaving] = useState(false);
  const [matches, setMatches] = useState<(BolaoMatchType & { id: string })[]>(
    [],
  );
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchForm, setMatchForm] = useState<MatchFormState>(patternMatchForm);
  const [matchSaving, setMatchSaving] = useState(false);
  const [participants, setParticipants] = useState<
    (BolaoParticipantType & { id: string })[]
  >([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // ── Quiz state ───────────────────────────────────────────────────────────────
  const [quizTab, setQuizTab] = useState<QuizTab>("perguntas");
  const [questions, setQuestions] = useState<
    (QuizQuestionType & { id: string })[]
  >([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionForm, setQuestionForm] =
    useState<QuizQuestionFormState>(patternQuestionForm);
  const [editingQuestion, setEditingQuestion] = useState<
    (QuizQuestionType & { id: string }) | null
  >(null);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [quizParticipants, setQuizParticipants] = useState<
    (QuizParticipantType & { id: string })[]
  >([]);
  const [quizParticipantsLoading, setQuizParticipantsLoading] = useState(false);
  const [expandedParticipantId, setExpandedParticipantId] = useState<
    string | null
  >(null);
  const [quizActionLoading, setQuizActionLoading] = useState(false);

  // ── Votação state ────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<(VotingEntryType & { id: string })[]>(
    [],
  );
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [votes, setVotes] = useState<(VotingVoteType & { id: string })[]>([]);
  const [votingActionLoading, setVotingActionLoading] = useState(false);
  const [savingEntriesOrder, setSavingEntriesOrder] = useState(false);
  const entriesUnsubRef = useRef<(() => void) | null>(null);
  const votesUnsubRef = useRef<(() => void) | null>(null);

  // Cadastro de uma nova fantasia: nome único + várias fotos (ângulos)
  // ficam "em espera" até o admin confirmar o salvamento. Depois de salvar,
  // o formulário volta a ficar vazio pra cadastrar a próxima fantasia.
  const [newEntryName, setNewEntryName] = useState("");
  const [newEntryPhotos, setNewEntryPhotos] = useState<StagedPhoto[]>([]);
  const [entrySaving, setEntrySaving] = useState(false);

  // Edição de uma fantasia já cadastrada (nome, fotos existentes que ficam
  // ou são removidas, e novas fotos a adicionar)
  const [editingEntry, setEditingEntry] = useState<
    (VotingEntryType & { id: string }) | null
  >(null);
  const [editingEntryName, setEditingEntryName] = useState("");
  const [editingEntryExistingImages, setEditingEntryExistingImages] = useState<
    string[]
  >([]);
  const [editingEntryNewPhotos, setEditingEntryNewPhotos] = useState<
    StagedPhoto[]
  >([]);
  const [editingEntrySaving, setEditingEntrySaving] = useState(false);

  // Modal de recorte compartilhado entre o cadastro em lote e a edição
  const [cropperContext, setCropperContext] = useState<CropperContext | null>(
    null,
  );
  const [cropperFile, setCropperFile] = useState<File | null>(null);

  const voteCountByEntry = React.useMemo(() => {
    const counts: Record<string, number> = {};
    votes.forEach((v) => {
      counts[v.entryId] = (counts[v.entryId] ?? 0) + 1;
    });
    return counts;
  }, [votes]);

  const topTiedEntryIds = React.useMemo(
    () => getTopTiedEntryIds(entries, voteCountByEntry),
    [entries, voteCountByEntry],
  );

  // Light tick for admin current-question indicator (only when quiz running)
  const [adminTick, setAdminTick] = useState(0);
  const quizParticipantsUnsubRef = useRef<(() => void) | null>(null);
  const selectedEventUnsubRef = useRef<(() => void) | null>(null);

  const { addAlert } = useAlert();

  const [simpleConfirmModal, setSimpleConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [deleteTypedModal, setDeleteTypedModal] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const [deleteTypedInput, setDeleteTypedInput] = useState("");

  // ── Admin current-question indicator ─────────────────────────────────────────

  useEffect(() => {
    if (selectedEvent?.quizStatus !== "running") return;
    const interval = setInterval(() => setAdminTick((t) => t + 1), 500);
    return () => clearInterval(interval);
  }, [selectedEvent?.quizStatus]);

  const adminCurrentQuestion = React.useMemo(() => {
    if (
      selectedEvent?.quizStatus !== "running" ||
      !selectedEvent.quizStartedAt ||
      questions.length === 0
    )
      return null;
    const startMs = (selectedEvent.quizStartedAt as Timestamp).toMillis();
    const countdownEndsMs = startMs + 15_000;
    const nowMs = Date.now();
    if (nowMs < countdownEndsMs) {
      return {
        phase: "countdown" as const,
        secondsLeft: Math.ceil((countdownEndsMs - nowMs) / 1000),
      };
    }
    const elapsed = nowMs - countdownEndsMs;
    let cumulative = 0;
    for (let i = 0; i < questions.length; i++) {
      const durationSeconds = questions[i].timeSeconds ?? 30;
      cumulative += durationSeconds * 1000;
      if (elapsed < cumulative)
        return {
          phase: "question" as const,
          index: i,
          secondsLeft: Math.ceil((cumulative - elapsed) / 1000),
          durationSeconds,
        };
    }
    return { phase: "done" as const };
  }, [
    adminTick,
    selectedEvent?.quizStatus,
    selectedEvent?.quizStartedAt,
    questions,
  ]);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchEvents = async () => {
    setLoading(true);
    try {
      setEvents(await EventRepository.getAll());
    } catch (error) {
      addAlert("Erro ao carregar eventos.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchTeams = async (eventId: string) => {
    setTeamsLoading(true);
    try {
      setTeams(await BolaoTeamRepository.getByEventId(eventId));
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchMatches = async (eventId: string) => {
    setMatchesLoading(true);
    try {
      setMatches(await BolaoMatchRepository.getByEventId(eventId));
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchParticipants = async (eventId: string) => {
    setParticipantsLoading(true);
    try {
      setParticipants(await BolaoParticipantRepository.getByEventId(eventId));
    } finally {
      setParticipantsLoading(false);
    }
  };

  const fetchQuizQuestions = async (eventId: string) => {
    setQuestionsLoading(true);
    try {
      setQuestions(await QuizQuestionRepository.getByEventId(eventId));
    } finally {
      setQuestionsLoading(false);
    }
  };

  // ── Modal open ────────────────────────────────────────────────────────────────

  const openManagementModal = (event: EventItemType & { id: string }) => {
    setSelectedEvent(event);
    setManagementModal(true);
    // Subscribe to event doc so selectedEvent stays in sync with Firestore
    if (selectedEventUnsubRef.current) selectedEventUnsubRef.current();
    selectedEventUnsubRef.current = EventRepository.subscribeToEvent(
      event.id,
      (updated) => {
        if (updated) setSelectedEvent(updated);
      },
    );
    if (event.subtype === "bolao") {
      setBolaoTab("times");
      setTeamForm(patternTeamForm);
      setEditingTeam(null);
      setMatchForm(patternMatchForm);
      fetchTeams(event.id);
      fetchMatches(event.id);
      fetchParticipants(event.id);
    } else if (event.subtype === "votacao") {
      setNewEntryName("");
      setNewEntryPhotos([]);
      setEditingEntry(null);
      setCropperContext(null);
      setCropperFile(null);
      // real-time subscriptions for entries and votes
      if (entriesUnsubRef.current) entriesUnsubRef.current();
      setEntriesLoading(true);
      entriesUnsubRef.current = VotingEntryRepository.subscribeToEventEntries(
        event.id,
        (updated) => {
          setEntries(updated);
          setEntriesLoading(false);
        },
      );
      if (votesUnsubRef.current) votesUnsubRef.current();
      votesUnsubRef.current = VotingVoteRepository.subscribeToEventVotes(
        event.id,
        (updated) => setVotes(updated),
      );
    } else {
      setQuizTab("perguntas");
      setQuestionForm(patternQuestionForm);
      setEditingQuestion(null);
      setExpandedParticipantId(null);
      fetchQuizQuestions(event.id);
      // real-time subscription for participants
      if (quizParticipantsUnsubRef.current) quizParticipantsUnsubRef.current();
      setQuizParticipantsLoading(true);
      quizParticipantsUnsubRef.current =
        QuizParticipantRepository.subscribeToEventParticipants(
          event.id,
          (updated) => {
            setQuizParticipants(updated);
            setQuizParticipantsLoading(false);
          },
        );
    }
  };

  const handleToggleActive = async (event: EventItemType & { id: string }) => {
    try {
      await EventRepository.update(event.id, { isActive: !event.isActive });
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, isActive: !e.isActive } : e,
        ),
      );
    } catch {
      addAlert("Erro ao atualizar status do evento.");
    }
  };

  // ── Bolão handlers ────────────────────────────────────────────────────────────

  const handleAddTeam = async () => {
    if (!selectedEvent || !teamForm.name.trim()) {
      addAlert("Preencha o nome do time.");
      return;
    }
    setTeamSaving(true);
    try {
      const id = await BolaoTeamRepository.create({
        name: teamForm.name.trim(),
        image: teamForm.imageUrl.trim(),
        eventId: selectedEvent.id,
      });
      if (id) {
        setTeams((prev) => [
          ...prev,
          {
            id,
            name: teamForm.name.trim(),
            image: teamForm.imageUrl.trim(),
            eventId: selectedEvent.id,
          },
        ]);
        setTeamForm(patternTeamForm);
        addAlert(`Time "${teamForm.name}" adicionado!`);
      }
    } catch {
      addAlert("Erro ao adicionar time.");
    } finally {
      setTeamSaving(false);
    }
  };

  const handleSaveEditTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) return;
    setTeamSaving(true);
    try {
      await BolaoTeamRepository.update(editingTeam.id, {
        name: editingTeam.name.trim(),
        image: editingTeam.image.trim(),
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === editingTeam.id
            ? {
                ...t,
                name: editingTeam.name.trim(),
                image: editingTeam.image.trim(),
              }
            : t,
        ),
      );
      setEditingTeam(null);
      addAlert(`Time "${editingTeam.name}" atualizado!`);
    } catch {
      addAlert("Erro ao atualizar time.");
    } finally {
      setTeamSaving(false);
    }
  };

  const handleDeleteTeam = (team: BolaoTeamType & { id: string }) => {
    setSimpleConfirmModal({
      message: `Deletar o time "${team.name}"?`,
      onConfirm: async () => {
        try {
          await BolaoTeamRepository.delete(team.id);
          setTeams((prev) => prev.filter((t) => t.id !== team.id));
          addAlert(`Time "${team.name}" removido.`);
        } catch {
          addAlert("Erro ao remover time.");
        }
      },
    });
  };

  const handleAddMatch = async () => {
    if (!selectedEvent || !matchForm.teamAId || !matchForm.teamBId) {
      addAlert("Selecione os dois times da partida.");
      return;
    }
    if (matchForm.teamAId === matchForm.teamBId) {
      addAlert("Os dois times não podem ser iguais.");
      return;
    }
    setMatchSaving(true);
    try {
      const id = await BolaoMatchRepository.create({
        eventId: selectedEvent.id,
        teamAId: matchForm.teamAId,
        teamBId: matchForm.teamBId,
        date: matchForm.date.trim(),
        order: matches.length,
      });
      if (id) {
        setMatches((prev) => [
          ...prev,
          {
            id,
            eventId: selectedEvent.id,
            teamAId: matchForm.teamAId,
            teamBId: matchForm.teamBId,
            date: matchForm.date.trim(),
            order: prev.length,
          },
        ]);
        setMatchForm(patternMatchForm);
        addAlert("Partida adicionada!");
      }
    } catch {
      addAlert("Erro ao adicionar partida.");
    } finally {
      setMatchSaving(false);
    }
  };

  const handleDeleteMatch = (match: BolaoMatchType & { id: string }) => {
    const teamA = teams.find((t) => t.id === match.teamAId)?.name ?? "?";
    const teamB = teams.find((t) => t.id === match.teamBId)?.name ?? "?";
    setSimpleConfirmModal({
      message: `Deletar a partida ${teamA} x ${teamB}?`,
      onConfirm: async () => {
        try {
          await BolaoMatchRepository.delete(match.id);
          setMatches((prev) => prev.filter((m) => m.id !== match.id));
          addAlert("Partida removida.");
        } catch {
          addAlert("Erro ao remover partida.");
        }
      },
    });
  };

  const handleDeleteParticipant = (
    participant: BolaoParticipantType & { id: string },
  ) => {
    setSimpleConfirmModal({
      message: `Excluir o palpite de "${participant.name}"?`,
      onConfirm: async () => {
        try {
          await BolaoParticipantRepository.delete(participant.id);
          setParticipants((prev) =>
            prev.filter((p) => p.id !== participant.id),
          );
          addAlert(`Palpite de "${participant.name}" excluído.`);
        } catch {
          addAlert("Erro ao excluir palpite.");
        }
      },
    });
  };

  const handleDeleteAllParticipants = () => {
    if (!selectedEvent) return;
    setDeleteTypedInput("");
    setDeleteTypedModal({
      title: `Excluir todos os ${participants.length} palpites`,
      description:
        "Isso irá remover permanentemente todos os palpites do bolão. Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        try {
          await BolaoParticipantRepository.deleteAllByEventId(selectedEvent.id);
          setParticipants([]);
          addAlert("Todos os palpites foram excluídos.");
        } catch {
          addAlert("Erro ao excluir palpites.");
        }
      },
    });
  };

  // ── Votação handlers ─────────────────────────────────────────────────────────

  // Seleciona uma ou mais fotos de uma vez PRA UMA MESMA fantasia (ângulos
  // diferentes) — ficam "em espera" até o admin salvar.
  const handleNewEntryFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const newStaged: StagedPhoto[] = files.map((file) => ({
      key: crypto.randomUUID(),
      originalFile: file,
      croppedFile: null,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewEntryPhotos((prev) => [...prev, ...newStaged]);
  };

  const handleRemoveNewEntryPhoto = (key: string) => {
    setNewEntryPhotos((prev) => prev.filter((p) => p.key !== key));
  };

  const handleCropNewEntryPhoto = (key: string) => {
    const staged = newEntryPhotos.find((p) => p.key === key);
    if (!staged) return;
    setCropperContext({ mode: "newEntry", key });
    setCropperFile(staged.croppedFile ?? staged.originalFile);
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (!cropperContext) return;
    const previewUrl = URL.createObjectURL(croppedFile);
    if (cropperContext.mode === "newEntry") {
      setNewEntryPhotos((prev) =>
        prev.map((p) =>
          p.key === cropperContext.key ? { ...p, croppedFile, previewUrl } : p,
        ),
      );
    } else {
      setEditingEntryNewPhotos((prev) =>
        prev.map((p) =>
          p.key === cropperContext.key ? { ...p, croppedFile, previewUrl } : p,
        ),
      );
    }
    setCropperContext(null);
    setCropperFile(null);
  };

  const handleSaveNewEntry = async () => {
    if (!selectedEvent || !newEntryName.trim()) {
      addAlert("Preencha o nome da fantasia.");
      return;
    }
    if (newEntryPhotos.length === 0) {
      addAlert("Selecione ao menos uma foto.");
      return;
    }
    setEntrySaving(true);
    try {
      const images: string[] = [];
      for (const staged of newEntryPhotos) {
        const fileToUpload = staged.croppedFile ?? staged.originalFile;
        const { url } = await uploadImageToFirebase(
          fileToUpload,
          "voting-entries",
        );
        images.push(url);
      }
      await VotingEntryRepository.create({
        eventId: selectedEvent.id,
        name: newEntryName.trim(),
        images,
        order: entries.length,
      });
      addAlert(`Fantasia "${newEntryName.trim()}" adicionada!`);
      setNewEntryName("");
      setNewEntryPhotos([]);
    } catch (error) {
      addAlert("Erro ao adicionar fantasia.");
      console.error(error);
    } finally {
      setEntrySaving(false);
    }
  };

  const handleStartEditEntry = (entry: VotingEntryType & { id: string }) => {
    setEditingEntry(entry);
    setEditingEntryName(entry.name);
    setEditingEntryExistingImages(entry.images ?? []);
    setEditingEntryNewPhotos([]);
  };

  const handleEditEntryFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const newStaged: StagedPhoto[] = files.map((file) => ({
      key: crypto.randomUUID(),
      originalFile: file,
      croppedFile: null,
      previewUrl: URL.createObjectURL(file),
    }));
    setEditingEntryNewPhotos((prev) => [...prev, ...newStaged]);
  };

  const handleRemoveEditEntryNewPhoto = (key: string) => {
    setEditingEntryNewPhotos((prev) => prev.filter((p) => p.key !== key));
  };

  const handleCropEditEntryPhoto = (key: string) => {
    const staged = editingEntryNewPhotos.find((p) => p.key === key);
    if (!staged) return;
    setCropperContext({ mode: "editEntry", key });
    setCropperFile(staged.croppedFile ?? staged.originalFile);
  };

  const handleRemoveEditEntryExistingImage = (url: string) => {
    setEditingEntryExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const handleSaveEditEntry = async () => {
    if (!editingEntry || !editingEntryName.trim()) {
      addAlert("Preencha o nome da fantasia.");
      return;
    }
    if (
      editingEntryExistingImages.length === 0 &&
      editingEntryNewPhotos.length === 0
    ) {
      addAlert("A fantasia precisa ter ao menos uma foto.");
      return;
    }
    setEditingEntrySaving(true);
    try {
      const newUrls: string[] = [];
      for (const staged of editingEntryNewPhotos) {
        const fileToUpload = staged.croppedFile ?? staged.originalFile;
        const { url } = await uploadImageToFirebase(
          fileToUpload,
          "voting-entries",
        );
        newUrls.push(url);
      }
      const finalImages = [...editingEntryExistingImages, ...newUrls];

      // Fotos que existiam antes e foram removidas na edição — apaga do
      // Storage pra não ficar acumulando lixo.
      const removedUrls = (editingEntry.images ?? []).filter(
        (url) => !editingEntryExistingImages.includes(url),
      );
      await Promise.all(
        removedUrls.map(async (url) => {
          const path = getPathFromFirebaseUrl(url);
          if (path) await deleteImageFromFirebase(path);
        }),
      );

      await VotingEntryRepository.update(editingEntry.id, {
        name: editingEntryName.trim(),
        images: finalImages,
      });
      setEditingEntry(null);
      addAlert("Fantasia atualizada!");
    } catch {
      addAlert("Erro ao atualizar fantasia.");
    } finally {
      setEditingEntrySaving(false);
    }
  };

  const handleDeleteEntry = (entry: VotingEntryType & { id: string }) => {
    setSimpleConfirmModal({
      message: `Remover a fantasia "${entry.name}"? Os votos recebidos por ela também serão perdidos.`,
      onConfirm: async () => {
        try {
          await Promise.all(
            (entry.images ?? []).map(async (url) => {
              const path = getPathFromFirebaseUrl(url);
              if (path) await deleteImageFromFirebase(path);
            }),
          );
          await VotingEntryRepository.delete(entry.id);
          addAlert(`Fantasia "${entry.name}" removida.`);
        } catch {
          addAlert("Erro ao remover fantasia.");
        }
      },
    });
  };

  // Arrastar reordena só localmente (visual, imediato) — a nova ordem só
  // vale de verdade pro público depois de "Salvar ordem".
  const handleReorderEntries = (
    newOrder: (VotingEntryType & { id: string })[],
  ) => {
    setEntries(newOrder);
  };

  const handleSaveEntriesOrder = async () => {
    setSavingEntriesOrder(true);
    try {
      await Promise.all(
        entries.map((entry, index) =>
          VotingEntryRepository.update(entry.id, { order: index }),
        ),
      );
      addAlert("Ordem das fantasias salva!");
    } catch {
      addAlert("Erro ao salvar a ordem das fantasias.");
    } finally {
      setSavingEntriesOrder(false);
    }
  };

  const handleToggleAllowClientSubmissions = async () => {
    if (!selectedEvent) return;
    const next = !selectedEvent.votacaoAllowClientSubmissions;
    try {
      await EventRepository.update(selectedEvent.id, {
        votacaoAllowClientSubmissions: next,
        // Desligar o principal também desliga o "várias por cliente", pra
        // não ficar um sub-toggle ativo escondido sem efeito nenhum.
        ...(!next && { votacaoAllowMultipleClientSubmissions: false }),
      });
      const updated = {
        ...selectedEvent,
        votacaoAllowClientSubmissions: next,
        ...(!next && { votacaoAllowMultipleClientSubmissions: false }),
      };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
    } catch {
      addAlert("Erro ao atualizar essa configuração.");
    }
  };

  const handleToggleAllowMultipleClientSubmissions = async () => {
    if (!selectedEvent) return;
    const next = !selectedEvent.votacaoAllowMultipleClientSubmissions;
    try {
      await EventRepository.update(selectedEvent.id, {
        votacaoAllowMultipleClientSubmissions: next,
      });
      const updated = {
        ...selectedEvent,
        votacaoAllowMultipleClientSubmissions: next,
      };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
    } catch {
      addAlert("Erro ao atualizar essa configuração.");
    }
  };

  const handleOpenVoting = async () => {
    if (!selectedEvent) return;
    if (entries.length < 2) {
      addAlert("Cadastre ao menos 2 fantasias antes de abrir a votação.");
      return;
    }
    setVotingActionLoading(true);
    try {
      await EventRepository.openVoting(selectedEvent.id);
      const updated = { ...selectedEvent, votacaoStatus: "aberta" as const };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
      addAlert("Votação aberta! O público já pode votar.");
    } catch {
      addAlert("Erro ao abrir votação.");
    } finally {
      setVotingActionLoading(false);
    }
  };

  const handleCloseVoting = async () => {
    if (!selectedEvent) return;
    setVotingActionLoading(true);
    try {
      await EventRepository.closeVoting(selectedEvent.id);
      const updated = {
        ...selectedEvent,
        votacaoStatus: "encerrada" as const,
      };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
      addAlert("Votação encerrada!");
    } catch {
      addAlert("Erro ao encerrar votação.");
    } finally {
      setVotingActionLoading(false);
    }
  };

  const handleShowVotingResults = async () => {
    if (!selectedEvent) return;
    setVotingActionLoading(true);
    try {
      await EventRepository.showVotingResults(selectedEvent.id);
      const updated = { ...selectedEvent, votacaoResultsVisible: true };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
      addAlert("Resultado liberado para o público!");
    } catch {
      addAlert("Erro ao liberar resultado.");
    } finally {
      setVotingActionLoading(false);
    }
  };

  // Desempate do 1º lugar: sem isso, quem empatar no topo divide a vitória.
  const handleSetVotacaoChampion = async (
    entry: VotingEntryType & { id: string },
  ) => {
    if (!selectedEvent) return;
    const isChampion = selectedEvent.votacaoChampionId === entry.id;
    setVotingActionLoading(true);
    try {
      if (isChampion) {
        await EventRepository.update(selectedEvent.id, {
          votacaoChampionId: "",
        });
        setSelectedEvent({ ...selectedEvent, votacaoChampionId: "" });
      } else {
        await EventRepository.setVotacaoChampion(selectedEvent.id, entry.id);
        setSelectedEvent({ ...selectedEvent, votacaoChampionId: entry.id });
        addAlert(`🏆 "${entry.name}" definida como vencedora!`);
      }
    } catch {
      addAlert("Erro ao definir a vencedora.");
    } finally {
      setVotingActionLoading(false);
    }
  };

  const handleResetVoting = () => {
    if (!selectedEvent) return;
    setDeleteTypedInput("");
    setDeleteTypedModal({
      title: `Reiniciar a votação`,
      description:
        "Isso vai apagar todos os votos registrados e reabrir a votação para cadastro. As fantasias cadastradas serão mantidas. Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        setVotingActionLoading(true);
        try {
          await Promise.all([
            EventRepository.resetVoting(selectedEvent.id),
            VotingVoteRepository.deleteAllByEventId(selectedEvent.id),
          ]);
          const updated = {
            ...selectedEvent,
            votacaoStatus: "cadastro" as const,
            votacaoResultsVisible: false,
            votacaoChampionId: undefined,
          };
          setSelectedEvent(updated);
          setEvents((prev) =>
            prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
          );
          addAlert("Votação reiniciada. Todos os votos foram removidos.");
        } catch {
          addAlert("Erro ao reiniciar votação.");
        } finally {
          setVotingActionLoading(false);
        }
      },
    });
  };

  // ── Quiz handlers ─────────────────────────────────────────────────────────────

  const handleAddQuestion = async () => {
    if (!selectedEvent || !questionForm.text.trim()) {
      addAlert("Digite o texto da pergunta.");
      return;
    }
    if (
      questionForm.type === "multiple_choice" &&
      questionForm.options.some((o) => !o.trim())
    ) {
      addAlert("Preencha todas as opções antes de adicionar.");
      return;
    }
    setQuestionSaving(true);
    try {
      const data: QuizQuestionType = {
        eventId: selectedEvent.id,
        text: questionForm.text.trim(),
        type: questionForm.type,
        points: questionForm.points,
        timeSeconds: questionForm.timeSeconds,
        order:
          questions.length > 0
            ? Math.max(...questions.map((q) => q.order ?? 0)) + 1
            : 0,
        ...(questionForm.type === "multiple_choice" && {
          options: questionForm.options.map((o) => o.trim()),
          correctOption: questionForm.correctOption,
        }),
      };
      const id = await QuizQuestionRepository.create(data);
      if (id) {
        setQuestions((prev) => [...prev, { id, ...data }]);
        setQuestionForm(patternQuestionForm);
        addAlert("Pergunta adicionada!");
      }
    } catch {
      addAlert("Erro ao adicionar pergunta.");
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleSaveEditQuestion = async () => {
    if (!editingQuestion || !editingQuestion.text.trim()) return;
    setQuestionSaving(true);
    try {
      const data: Partial<QuizQuestionType> = {
        text: editingQuestion.text.trim(),
        type: editingQuestion.type,
        points: editingQuestion.points,
        timeSeconds: editingQuestion.timeSeconds ?? 30,
        ...(editingQuestion.type === "multiple_choice" && {
          options: editingQuestion.options ?? [],
          correctOption: editingQuestion.correctOption ?? 0,
        }),
      };
      await QuizQuestionRepository.update(editingQuestion.id, data);
      setQuestions((prev) =>
        prev.map((q) => (q.id === editingQuestion.id ? { ...q, ...data } : q)),
      );
      setEditingQuestion(null);
      addAlert("Pergunta atualizada!");
    } catch {
      addAlert("Erro ao atualizar pergunta.");
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleDeleteQuestion = (q: QuizQuestionType & { id: string }) => {
    setSimpleConfirmModal({
      message: `Deletar a pergunta "${q.text.substring(0, 40)}..."?`,
      onConfirm: async () => {
        try {
          await QuizQuestionRepository.delete(q.id);
          setQuestions((prev) => prev.filter((item) => item.id !== q.id));
          addAlert("Pergunta removida.");
        } catch {
          addAlert("Erro ao remover pergunta.");
        }
      },
    });
  };

  const handleGradeAnswer = async (
    participant: QuizParticipantType & { id: string },
    question: QuizQuestionType & { id: string },
    isCorrect: boolean,
  ) => {
    const oldPoints = participant.answers[question.id]?.pointsEarned ?? 0;
    const pointsEarned = isCorrect ? question.points : 0;
    const newTotalScore = participant.totalScore - oldPoints + pointsEarned;

    const updatedAnswers = {
      ...participant.answers,
      [question.id]: {
        ...participant.answers[question.id],
        isCorrect,
        pointsEarned,
      },
    };

    // Recalculate tiebreaker time: sum of per-correct-question times (MC + text when correct)
    const qTimes = participant.questionTimes ?? {};
    let tiebreakerMs = 0;
    questions.forEach((q) => {
      const qTime = qTimes[q.id];
      if (qTime === undefined) return;
      const ans =
        q.id === question.id
          ? { isCorrect, pointsEarned }
          : updatedAnswers[q.id];
      if (ans?.isCorrect === true) tiebreakerMs += qTime;
    });
    const newTimeTakenSeconds =
      tiebreakerMs > 0 ? tiebreakerMs / 1000 : undefined;

    setQuizParticipants((prev) =>
      prev
        .map((p) =>
          p.id === participant.id
            ? {
                ...p,
                answers: updatedAnswers,
                totalScore: newTotalScore,
                timeTakenSeconds: newTimeTakenSeconds,
              }
            : p,
        )
        .sort((a, b) => {
          if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
          return (a.timeTakenSeconds ?? 99999) - (b.timeTakenSeconds ?? 99999);
        }),
    );

    // Use updateDoc directly so we can deleteField() when timeTakenSeconds goes to undefined
    const participantDocRef = doc(db, "quiz-participants", participant.id);
    await updateDoc(participantDocRef, {
      answers: updatedAnswers,
      totalScore: newTotalScore,
      timeTakenSeconds:
        newTimeTakenSeconds !== undefined ? newTimeTakenSeconds : deleteField(),
    });
  };

  const handleDeleteQuizParticipant = (
    participant: QuizParticipantType & { id: string },
  ) => {
    setSimpleConfirmModal({
      message: `Excluir respostas de "${participant.name}"?`,
      onConfirm: async () => {
        try {
          await QuizParticipantRepository.delete(participant.id);
          setQuizParticipants((prev) =>
            prev.filter((p) => p.id !== participant.id),
          );
          addAlert(`Respostas de "${participant.name}" excluídas.`);
        } catch {
          addAlert("Erro ao excluir participante.");
        }
      },
    });
  };

  const handleDeleteAllQuizParticipants = () => {
    if (!selectedEvent) return;
    setDeleteTypedInput("");
    setDeleteTypedModal({
      title: `Excluir todas as respostas de ${quizParticipants.length} participantes`,
      description:
        "Isso irá remover permanentemente todas as respostas desta rodada do quiz. Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        try {
          await QuizParticipantRepository.deleteAllByEventId(selectedEvent.id);
          setQuizParticipants([]);
          addAlert("Todas as respostas foram excluídas.");
        } catch {
          addAlert("Erro ao excluir participantes.");
        }
      },
    });
  };

  const handleSetChampion = async (
    participant: QuizParticipantType & { id: string },
  ) => {
    if (!selectedEvent) return;
    const isChampion =
      selectedEvent.quizChampionId === participant.participantId;
    setQuizActionLoading(true);
    try {
      if (isChampion) {
        // Unset champion — use resetQuiz won't work here; call update directly
        await EventRepository.update(selectedEvent.id, { quizChampionId: "" });
        setSelectedEvent({ ...selectedEvent, quizChampionId: "" });
      } else {
        await EventRepository.setQuizChampion(
          selectedEvent.id,
          participant.participantId,
        );
        setSelectedEvent({
          ...selectedEvent,
          quizChampionId: participant.participantId,
        });
        addAlert(`🏆 ${participant.name} definido como campeão!`);
      }
    } catch {
      addAlert("Erro ao definir campeão.");
    } finally {
      setQuizActionLoading(false);
    }
  };

  const handleShowResults = async () => {
    if (!selectedEvent) return;
    setQuizActionLoading(true);
    try {
      await EventRepository.showQuizResults(selectedEvent.id);
      const updated = { ...selectedEvent, quizResultsVisible: true };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
      addAlert("Resultados liberados para os participantes!");
    } catch {
      addAlert("Erro ao liberar resultados.");
    } finally {
      setQuizActionLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedEvent) return;
    if (questions.length === 0) {
      addAlert("Adicione ao menos uma pergunta antes de iniciar o quiz.");
      return;
    }
    setQuizActionLoading(true);
    try {
      await EventRepository.startQuiz(selectedEvent.id);
      const updated = {
        ...selectedEvent,
        quizStatus: "running" as const,
        quizStartedAt: Timestamp.now(),
      };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
      addAlert("Quiz iniciado! Os participantes já podem responder.");
    } catch {
      addAlert("Erro ao iniciar quiz.");
    } finally {
      setQuizActionLoading(false);
    }
  };

  const handleEndQuiz = async () => {
    if (!selectedEvent || selectedEvent.quizStatus !== "running") return;
    setQuizActionLoading(true);
    try {
      await EventRepository.endQuiz(selectedEvent.id);
      const updated = { ...selectedEvent, quizStatus: "finished" as const };
      setSelectedEvent(updated);
      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
      );
      addAlert("Quiz encerrado!");
    } catch {
      addAlert("Erro ao encerrar quiz.");
    } finally {
      setQuizActionLoading(false);
    }
  };

  const handleResetQuiz = () => {
    if (!selectedEvent) return;
    setDeleteTypedInput("");
    setDeleteTypedModal({
      title: "Reiniciar o quiz",
      description:
        "Isso vai apagar todos os participantes e respostas desta rodada. Esta ação não pode ser desfeita.",
      onConfirm: async () => {
        setQuizActionLoading(true);
        try {
          await Promise.all([
            EventRepository.resetQuiz(selectedEvent.id),
            QuizParticipantRepository.deleteAllByEventId(selectedEvent.id),
          ]);
          const updated = {
            ...selectedEvent,
            quizStatus: "waiting" as const,
            quizResultsVisible: false,
            quizChampionId: undefined,
          };
          setSelectedEvent(updated);
          setEvents((prev) =>
            prev.map((e) => (e.id === selectedEvent.id ? updated : e)),
          );
          setQuizParticipants([]);
          addAlert("Quiz reiniciado. Todos os participantes foram removidos.");
        } catch {
          addAlert("Erro ao reiniciar quiz.");
        } finally {
          setQuizActionLoading(false);
        }
      },
    });
  };

  // ── UI Helpers ────────────────────────────────────────────────────────────────

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-secondary-black border border-primary-gold/10">
        <LuCalendarDays size={34} className="text-primary-gold/20" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-primary-gold/60">
          Nenhum evento cadastrado
        </p>
        <p className="text-sm text-primary-gold/30 max-w-[260px]">
          Crie seu primeiro evento clicando no botão{" "}
          <span className="text-primary-gold">+</span> acima.
        </p>
      </div>
      <button
        onClick={() => {
          setCurrentEvent(patternEvent);
          setEventFormsModal(true);
        }}
        className="mt-1 px-5 py-2 rounded-lg bg-primary-gold/10 border border-primary-gold/30 text-primary-gold text-sm font-medium hover:bg-primary-gold/20 transition-all duration-200 cursor-pointer"
      >
        Criar primeiro evento
      </button>
    </div>
  );

  const teamById = (id: string) => teams.find((t) => t.id === id);
  const selectClass =
    "cursor-pointer appearance-none w-full outline-none text-primary-gold bg-primary-black py-2 px-3 rounded-sm text-sm border border-primary-gold/30";
  const selectedTeamA = teams.find((t) => t.id === matchForm.teamAId);
  const selectedTeamB = teams.find((t) => t.id === matchForm.teamBId);

  const quizStatusLabel = (status?: string) => {
    if (status === "running") return "Em andamento";
    if (status === "finished") return "Encerrado";
    return "Aguardando";
  };

  const quizStatusClass = (status?: string) => {
    if (status === "running")
      return "bg-green-900/30 border-green-700/30 text-green-400";
    if (status === "finished")
      return "bg-primary-gold/5 border-primary-gold/10 text-primary-gold/40";
    return "bg-yellow-900/20 border-yellow-700/20 text-yellow-500";
  };

  const votacaoStatusLabel = (status?: string) => {
    if (status === "aberta") return "Votação aberta";
    if (status === "encerrada") return "Encerrada";
    return "Cadastro";
  };

  const votacaoStatusClass = (status?: string) => {
    if (status === "aberta")
      return "bg-green-900/30 border-green-700/30 text-green-400";
    if (status === "encerrada")
      return "bg-primary-gold/5 border-primary-gold/10 text-primary-gold/40";
    return "bg-yellow-900/20 border-yellow-700/20 text-yellow-500";
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto">
      {loading && <LoaderFullscreen />}

      <Suspense>
        <SearchParamsTrigger
          onTrigger={() => {
            setCurrentEvent(patternEvent);
            setEventFormsModal(true);
          }}
        />
      </Suspense>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <LuCalendarDays
              size={32}
              className="text-primary-gold/70 shrink-0"
            />
            <div className="flex flex-col">
              <h1 className="text-3xl font-semibold text-primary-gold">
                Eventos
              </h1>
              <span className="text-xs text-primary-gold/40">
                {events.length} {events.length === 1 ? "evento" : "eventos"}{" "}
                cadastrado
                {events.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <Tooltip direction="bottom" content="Criar novo evento">
            <button
              onClick={() => {
                setCurrentEvent(patternEvent);
                setEventFormsModal(true);
              }}
              className="p-2.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuPlus size={16} />
            </button>
          </Tooltip>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent" />
      </div>

      {/* Events list */}
      <section className="flex flex-col items-center gap-4 px-2">
        {events.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          events.map((event) => {
            const Icon = getLucideIcon(event.icon);
            return (
              <div
                key={event.id}
                className="w-full max-w-[600px] flex items-center gap-4 p-4 rounded-xl bg-secondary-black border border-primary-gold/10 hover:border-primary-gold/30 transition-all duration-200 shadow-card"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary-gold/5 border border-primary-gold/10 shrink-0">
                  {Icon ? (
                    <Icon size={22} className="text-primary-gold" />
                  ) : (
                    <LuCalendarDays
                      size={22}
                      className="text-primary-gold/40"
                    />
                  )}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary-gold truncate">
                      {event.name}
                    </span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60 uppercase tracking-wider">
                      {event.subtype === "bolao"
                        ? "Bolão"
                        : event.subtype === "quiz"
                          ? "Quiz"
                          : "Votação"}
                    </span>
                    {event.subtype === "quiz" && (
                      <span
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${quizStatusClass(event.quizStatus)}`}
                      >
                        {quizStatusLabel(event.quizStatus)}
                      </span>
                    )}
                    {event.subtype === "votacao" && (
                      <span
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${votacaoStatusClass(event.votacaoStatus)}`}
                      >
                        {votacaoStatusLabel(event.votacaoStatus)}
                      </span>
                    )}
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        event.isActive
                          ? "bg-green-900/20 border-green-700/30 text-green-500"
                          : "bg-primary-gold/5 border-primary-gold/10 text-primary-gold/30"
                      }`}
                    >
                      {event.isActive ? "ativo" : "inativo"}
                    </span>
                  </div>
                  <span className="text-xs text-primary-gold/40 truncate">
                    {event.description}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip
                    content={
                      event.isActive
                        ? "Desativar evento (some dos clientes)"
                        : "Ativar evento (aparece para os clientes)"
                    }
                  >
                    <button
                      onClick={() => handleToggleActive(event)}
                      className="p-1.5 rounded-md hover:bg-primary-gold/10 transition-all cursor-pointer"
                    >
                      {event.isActive ? (
                        <LuToggleRight size={18} className="text-green-500" />
                      ) : (
                        <LuToggleLeft
                          size={18}
                          className="text-primary-gold/30"
                        />
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip
                    content={
                      event.subtype === "bolao"
                        ? "Gerenciar times, partidas e palpites"
                        : event.subtype === "votacao"
                          ? "Gerenciar fantasias e votos"
                          : "Gerenciar perguntas e participantes"
                    }
                  >
                    <button
                      onClick={() => openManagementModal(event)}
                      className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
                    >
                      <LuSettings2 size={15} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Editar nome, descrição e ícone">
                    <button
                      onClick={() => {
                        setCurrentEvent(event);
                        setEventFormsModal(true);
                      }}
                      className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
                    >
                      <LuPencil size={15} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Event create/edit modal */}
      <Modal
        isOpen={eventFormsModal}
        onClose={() => setEventFormsModal(false)}
        noPadding
        patternCloseButton={false}
      >
        <EventForms
          currentEvent={currentEvent}
          setCurrentEvent={setCurrentEvent}
          formType={currentEvent.id ? "edit" : "add"}
          closeForms={() => {
            setCurrentEvent(patternEvent);
            setEventFormsModal(false);
            fetchEvents();
          }}
        />
      </Modal>

      {/* Management modal (bolão OR quiz) */}
      <Modal
        isOpen={managementModal}
        onClose={() => setManagementModal(false)}
        noPadding
        patternCloseButton={false}
      >
        <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[95vw] h-full sm:h-auto max-w-none sm:max-w-[580px] max-h-full sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* ── Modal Header ── */}
          <div className="flex flex-col border-b border-primary-gold/10 shrink-0">
            {/* Row 1: info + close */}
            <div className="flex items-center justify-between px-5 py-3 gap-3">
              {selectedEvent?.subtype === "quiz" ? (
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <LuBrain
                      size={14}
                      className="text-primary-gold/60 shrink-0"
                    />
                    <span className="text-sm font-semibold text-primary-gold truncate">
                      {selectedEvent.name}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${quizStatusClass(selectedEvent.quizStatus)}`}
                    >
                      {quizStatusLabel(selectedEvent.quizStatus)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-primary-gold/40">
                    <span className="flex items-center gap-1">
                      <LuCircleHelp size={11} /> {questions.length} pergunta
                      {questions.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <LuUsers size={11} /> {quizParticipants.length}{" "}
                      participante{quizParticipants.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ) : selectedEvent?.subtype === "votacao" ? (
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <LuDrama
                      size={14}
                      className="text-primary-gold/60 shrink-0"
                    />
                    <span className="text-sm font-semibold text-primary-gold truncate">
                      {selectedEvent.name}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${votacaoStatusClass(selectedEvent.votacaoStatus)}`}
                    >
                      {votacaoStatusLabel(selectedEvent.votacaoStatus)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-primary-gold/40">
                    <span className="flex items-center gap-1">
                      <LuDrama size={11} /> {entries.length} fantasia
                      {entries.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <LuVote size={11} /> {votes.length} voto
                      {votes.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-primary-gold">
                    {selectedEvent?.name}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-primary-gold/40">
                    <span className="flex items-center gap-1">
                      <LuShield size={11} /> {teams.length} time
                      {teams.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <LuSwords size={11} /> {matches.length} partida
                      {matches.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <LuUsers size={11} /> {participants.length} palpite
                      {participants.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setManagementModal(false);
                  setEditingTeam(null);
                  setTeamForm(patternTeamForm);
                  setEditingQuestion(null);
                  setNewEntryName("");
                  setNewEntryPhotos([]);
                  setEditingEntry(null);
                  setCropperContext(null);
                  setCropperFile(null);
                  if (quizParticipantsUnsubRef.current) {
                    quizParticipantsUnsubRef.current();
                    quizParticipantsUnsubRef.current = null;
                  }
                  if (selectedEventUnsubRef.current) {
                    selectedEventUnsubRef.current();
                    selectedEventUnsubRef.current = null;
                  }
                  if (entriesUnsubRef.current) {
                    entriesUnsubRef.current();
                    entriesUnsubRef.current = null;
                  }
                  if (votesUnsubRef.current) {
                    votesUnsubRef.current();
                    votesUnsubRef.current = null;
                  }
                }}
                className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer shrink-0"
              >
                <LuX size={16} />
              </button>
            </div>

            {/* Row 2: quiz control buttons (only when quiz) */}
            {selectedEvent?.subtype === "quiz" && (
              <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                {(selectedEvent.quizStatus ?? "waiting") === "waiting" && (
                  <button
                    onClick={handleStartQuiz}
                    disabled={quizActionLoading || questions.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-green-700/20 border border-green-700/30 text-green-400 text-xs font-medium hover:bg-green-700/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {quizActionLoading ? (
                      <Loader />
                    ) : (
                      <>
                        <LuPlay size={13} /> Iniciar
                      </>
                    )}
                  </button>
                )}
                {selectedEvent.quizStatus === "running" && (
                  <button
                    onClick={handleEndQuiz}
                    disabled={quizActionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-xs font-medium hover:bg-red-900/30 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {quizActionLoading ? (
                      <Loader />
                    ) : (
                      <>
                        <LuSquare size={13} /> Encerrar
                      </>
                    )}
                  </button>
                )}
                {selectedEvent.quizStatus === "finished" &&
                  !selectedEvent.quizResultsVisible && (
                    <button
                      onClick={handleShowResults}
                      disabled={quizActionLoading}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {quizActionLoading ? (
                        <Loader />
                      ) : (
                        <>
                          <LuEye size={13} /> Liberar Resultados
                        </>
                      )}
                    </button>
                  )}
                {selectedEvent.quizStatus === "finished" && (
                  <button
                    onClick={handleResetQuiz}
                    disabled={quizActionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60 text-xs font-medium hover:bg-primary-gold/20 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {quizActionLoading ? (
                      <Loader />
                    ) : (
                      <>
                        <LuRefreshCw size={13} /> Reiniciar
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Row 2: votação control buttons (only when votação) */}
            {selectedEvent?.subtype === "votacao" && (
              <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                {(selectedEvent.votacaoStatus ?? "cadastro") === "cadastro" && (
                  <button
                    onClick={handleOpenVoting}
                    disabled={votingActionLoading || entries.length < 2}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-green-700/20 border border-green-700/30 text-green-400 text-xs font-medium hover:bg-green-700/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {votingActionLoading ? (
                      <Loader />
                    ) : (
                      <>
                        <LuPlay size={13} /> Abrir Votação
                      </>
                    )}
                  </button>
                )}
                {selectedEvent.votacaoStatus === "aberta" && (
                  <button
                    onClick={handleCloseVoting}
                    disabled={votingActionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 text-xs font-medium hover:bg-red-900/30 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {votingActionLoading ? (
                      <Loader />
                    ) : (
                      <>
                        <LuSquare size={13} /> Encerrar Votação
                      </>
                    )}
                  </button>
                )}
                {selectedEvent.votacaoStatus === "encerrada" &&
                  !selectedEvent.votacaoResultsVisible && (
                    <button
                      onClick={handleShowVotingResults}
                      disabled={votingActionLoading}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {votingActionLoading ? (
                        <Loader />
                      ) : (
                        <>
                          <LuEye size={13} /> Liberar Resultado
                        </>
                      )}
                    </button>
                  )}
                {selectedEvent.votacaoStatus === "encerrada" && (
                  <button
                    onClick={handleResetVoting}
                    disabled={votingActionLoading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60 text-xs font-medium hover:bg-primary-gold/20 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {votingActionLoading ? (
                      <Loader />
                    ) : (
                      <>
                        <LuRefreshCw size={13} /> Reiniciar
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ── Live panel (quiz em andamento) ── */}
            {selectedEvent?.subtype === "quiz" && adminCurrentQuestion && (
              <div className="mx-5 mb-3 rounded-xl border border-green-700/25 bg-green-900/10 px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Ao vivo
                  </span>
                  {adminCurrentQuestion.phase === "question" && (
                    <span className="text-[11px] text-primary-gold/40 font-mono">
                      Pergunta {adminCurrentQuestion.index + 1} de{" "}
                      {questions.length}
                    </span>
                  )}
                </div>

                {adminCurrentQuestion.phase === "countdown" && (
                  <p className="text-sm text-yellow-400">
                    ⏳ Contagem regressiva — o quiz começa em{" "}
                    <span className="font-mono font-bold">
                      {adminCurrentQuestion.secondsLeft}s
                    </span>
                  </p>
                )}

                {adminCurrentQuestion.phase === "question" && (
                  <>
                    <p className="text-sm text-primary-gold/90 leading-snug">
                      {questions[adminCurrentQuestion.index]?.text}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-primary-gold/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            adminCurrentQuestion.secondsLeft <= 5
                              ? "bg-red-400"
                              : "bg-green-400"
                          }`}
                          style={{
                            width: `${Math.min(100, (adminCurrentQuestion.secondsLeft / adminCurrentQuestion.durationSeconds) * 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold shrink-0 ${
                          adminCurrentQuestion.secondsLeft <= 5
                            ? "text-red-400"
                            : "text-primary-gold/70"
                        }`}
                      >
                        {adminCurrentQuestion.secondsLeft}s
                      </span>
                    </div>
                  </>
                )}

                {adminCurrentQuestion.phase === "done" && (
                  <p className="text-sm text-primary-gold/60">
                    Tempo das perguntas esgotado — as respostas já foram
                    coletadas. Clique em <strong>Encerrar</strong> para liberar
                    a correção.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Tabs ── */}
          {selectedEvent?.subtype !== "votacao" && (
            <div className="flex border-b border-primary-gold/10 shrink-0">
              {selectedEvent?.subtype === "quiz"
                ? (["perguntas", "participantes"] as QuizTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setQuizTab(tab)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-all cursor-pointer ${
                        quizTab === tab
                          ? "text-primary-gold border-b-2 border-primary-gold"
                          : "text-primary-gold/40 hover:text-primary-gold/70"
                      }`}
                    >
                      {tab === "perguntas" ? (
                        <LuCircleHelp size={14} />
                      ) : (
                        <LuUsers size={14} />
                      )}
                      {tab === "perguntas" ? "Perguntas" : "Participantes"}
                      {tab === "participantes" &&
                        quizParticipants.length > 0 && (
                          <span className="ml-1 text-[10px] bg-primary-gold/20 text-primary-gold px-1.5 py-0.5 rounded-full">
                            {quizParticipants.length}
                          </span>
                        )}
                    </button>
                  ))
                : (["times", "partidas", "palpites"] as BolaoTab[]).map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setBolaoTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-all cursor-pointer ${
                          bolaoTab === tab
                            ? "text-primary-gold border-b-2 border-primary-gold"
                            : "text-primary-gold/40 hover:text-primary-gold/70"
                        }`}
                      >
                        {tab === "times" && <LuShield size={14} />}
                        {tab === "partidas" && <LuSwords size={14} />}
                        {tab === "palpites" && <LuTrophy size={14} />}
                        {tab === "times"
                          ? "Times"
                          : tab === "partidas"
                            ? "Partidas"
                            : "Palpites"}
                        {tab === "palpites" && participants.length > 0 && (
                          <span className="ml-1 text-[10px] bg-primary-gold/20 text-primary-gold px-1.5 py-0.5 rounded-full">
                            {participants.length}
                          </span>
                        )}
                      </button>
                    ),
                  )}
            </div>
          )}

          {/* ── Tab content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
            {/* ═══════════════════════════════════════════════════
                QUIZ TABS
            ═══════════════════════════════════════════════════ */}

            {selectedEvent?.subtype === "quiz" && (
              <>
                {/* ── PERGUNTAS TAB ── */}
                {quizTab === "perguntas" && (
                  <>
                    <TabHint>
                      Crie as perguntas do quiz. Múltipla escolha é corrigida
                      automaticamente; perguntas de texto ficam aguardando sua
                      correção na aba Participantes.
                    </TabHint>

                    {selectedEvent.quizStatus === "running" && (
                      <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-xs text-yellow-400/80 text-center">
                        ⚠️ Quiz em andamento — edição de perguntas desabilitada
                      </div>
                    )}

                    {/* Question list */}
                    {questionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader />
                      </div>
                    ) : questions.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-primary-gold/40">
                        <LuCircleHelp size={28} />
                        <span className="text-sm">
                          Nenhuma pergunta adicionada ainda
                        </span>
                        <span className="text-xs text-center max-w-[240px]">
                          Use o formulário abaixo para criar as perguntas do
                          quiz.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="flex flex-col gap-2 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30"
                          >
                            {editingQuestion?.id === q.id ? (
                              /* ── Inline edit ── */
                              <div className="flex flex-col gap-3">
                                <textarea
                                  value={editingQuestion.text}
                                  onChange={(e) =>
                                    setEditingQuestion({
                                      ...editingQuestion,
                                      text: e.target.value,
                                    })
                                  }
                                  rows={2}
                                  className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2 text-sm text-primary-gold outline-none focus:border-primary-gold/50 resize-none"
                                />
                                <div className="flex items-center gap-3 flex-wrap">
                                  <select
                                    value={editingQuestion.type}
                                    onChange={(e) =>
                                      setEditingQuestion({
                                        ...editingQuestion,
                                        type: e.target.value as
                                          | "multiple_choice"
                                          | "text",
                                      })
                                    }
                                    className={
                                      selectClass + " !w-auto !py-1 !text-xs"
                                    }
                                  >
                                    <option value="multiple_choice">
                                      Múltipla escolha
                                    </option>
                                    <option value="text">Texto livre</option>
                                  </select>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">
                                      Tempo
                                    </span>
                                    <NumberStepper
                                      value={editingQuestion.timeSeconds ?? 30}
                                      onChange={(v) =>
                                        setEditingQuestion({
                                          ...editingQuestion,
                                          timeSeconds: v,
                                        })
                                      }
                                      min={5}
                                      max={300}
                                      step={5}
                                      suffix="s"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">
                                      Pontos
                                    </span>
                                    <NumberStepper
                                      value={editingQuestion.points}
                                      onChange={(v) =>
                                        setEditingQuestion({
                                          ...editingQuestion,
                                          points: v,
                                        })
                                      }
                                      min={1}
                                      max={100}
                                    />
                                  </div>
                                </div>
                                {editingQuestion.type === "multiple_choice" && (
                                  <div className="flex flex-col gap-1.5">
                                    {(editingQuestion.options ?? []).map(
                                      (opt, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-2"
                                        >
                                          <button
                                            onClick={() =>
                                              setEditingQuestion({
                                                ...editingQuestion,
                                                correctOption: i,
                                              })
                                            }
                                            className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
                                              editingQuestion.correctOption ===
                                              i
                                                ? "bg-green-500 border-green-500"
                                                : "border-primary-gold/30 hover:border-primary-gold"
                                            }`}
                                          />
                                          <input
                                            value={opt}
                                            onChange={(e) => {
                                              const newOpts = [
                                                ...(editingQuestion.options ??
                                                  []),
                                              ];
                                              newOpts[i] = e.target.value;
                                              setEditingQuestion({
                                                ...editingQuestion,
                                                options: newOpts,
                                              });
                                            }}
                                            placeholder={`Opção ${i + 1}`}
                                            className="flex-1 bg-primary-black/50 border border-primary-gold/15 rounded px-2 py-1 text-xs text-primary-gold outline-none focus:border-primary-gold/40"
                                          />
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-1">
                                  <Button onClick={handleSaveEditQuestion}>
                                    {questionSaving ? <Loader /> : "Salvar"}
                                  </Button>
                                  <Button
                                    onClick={() => setEditingQuestion(null)}
                                    isHoverInvalid
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* ── Question display ── */
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-xs text-primary-gold/30 font-mono shrink-0 mt-0.5 w-5 text-right">
                                    {idx + 1}.
                                  </span>
                                  <div className="flex flex-col gap-1 flex-1">
                                    <span className="text-sm text-primary-gold/90">
                                      {q.text}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                                          q.type === "multiple_choice"
                                            ? "bg-blue-900/20 border-blue-700/20 text-blue-400"
                                            : "bg-purple-900/20 border-purple-700/20 text-purple-400"
                                        }`}
                                      >
                                        {q.type === "multiple_choice"
                                          ? "Múltipla escolha"
                                          : "Texto livre"}
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60 flex items-center gap-1">
                                        <LuClock size={9} />{" "}
                                        {q.timeSeconds ?? 30}s
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60">
                                        {q.points} pt{q.points !== 1 ? "s" : ""}
                                      </span>
                                    </div>
                                    {q.type === "multiple_choice" &&
                                      q.options && (
                                        <div className="flex flex-col gap-0.5 mt-1">
                                          {q.options.map((opt, i) => (
                                            <div
                                              key={i}
                                              className={`flex items-center gap-1.5 text-xs ${
                                                i === q.correctOption
                                                  ? "text-green-400"
                                                  : "text-primary-gold/40"
                                              }`}
                                            >
                                              {i === q.correctOption ? (
                                                <LuCheck
                                                  size={11}
                                                  className="shrink-0"
                                                />
                                              ) : (
                                                <span className="w-2.5 h-2.5 rounded-full border border-primary-gold/20 shrink-0 inline-block" />
                                              )}
                                              {opt || (
                                                <em className="opacity-40">
                                                  vazio
                                                </em>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    {q.type === "text" && (
                                      <div className="flex items-center gap-1 text-xs text-primary-gold/30 mt-0.5">
                                        <LuAlignLeft size={11} />
                                        <span>
                                          Resposta aberta — corrigida
                                          manualmente
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {selectedEvent.quizStatus !== "running" && (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Tooltip
                                        content="Editar"
                                        direction="left"
                                      >
                                        <button
                                          onClick={() => setEditingQuestion(q)}
                                          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-primary-gold/10 text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer"
                                        >
                                          <LuPencil size={14} />
                                        </button>
                                      </Tooltip>
                                      <Tooltip
                                        content="Remover"
                                        direction="left"
                                      >
                                        <button
                                          onClick={() =>
                                            handleDeleteQuestion(q)
                                          }
                                          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer"
                                        >
                                          <LuTrash size={14} />
                                        </button>
                                      </Tooltip>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add question form */}
                    {!editingQuestion &&
                      selectedEvent.quizStatus !== "running" && (
                        <div className="flex flex-col gap-3 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
                          <span className="text-xs font-semibold text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                            <LuPlus size={12} /> Adicionar pergunta
                          </span>

                          <textarea
                            value={questionForm.text}
                            onChange={(e) =>
                              setQuestionForm((p) => ({
                                ...p,
                                text: e.target.value,
                              }))
                            }
                            rows={2}
                            placeholder="Texto da pergunta..."
                            className="w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 resize-none transition-all"
                          />

                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-primary-gold/50 uppercase tracking-wider">
                                Tipo
                              </span>
                              <select
                                value={questionForm.type}
                                onChange={(e) =>
                                  setQuestionForm((p) => ({
                                    ...p,
                                    type: e.target.value as
                                      | "multiple_choice"
                                      | "text",
                                  }))
                                }
                                className={
                                  selectClass + " !w-auto !py-1.5 !text-xs"
                                }
                              >
                                <option value="multiple_choice">
                                  Múltipla escolha
                                </option>
                                <option value="text">Texto livre</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-primary-gold/50 uppercase tracking-wider">
                                Tempo
                              </span>
                              <NumberStepper
                                value={questionForm.timeSeconds}
                                onChange={(v) =>
                                  setQuestionForm((p) => ({
                                    ...p,
                                    timeSeconds: v,
                                  }))
                                }
                                min={5}
                                max={300}
                                step={5}
                                suffix="s"
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-primary-gold/50 uppercase tracking-wider">
                                Pontos
                              </span>
                              <NumberStepper
                                value={questionForm.points}
                                onChange={(v) =>
                                  setQuestionForm((p) => ({ ...p, points: v }))
                                }
                                min={1}
                                max={100}
                              />
                            </div>
                          </div>

                          {/* Options (MC) */}
                          {questionForm.type === "multiple_choice" && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] text-primary-gold/50 uppercase tracking-wider">
                                Opções — clique no círculo para marcar a correta
                              </span>
                              {questionForm.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <button
                                    onClick={() =>
                                      setQuestionForm((p) => ({
                                        ...p,
                                        correctOption: i,
                                      }))
                                    }
                                    className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all cursor-pointer ${
                                      questionForm.correctOption === i
                                        ? "bg-green-500 border-green-500"
                                        : "border-primary-gold/30 hover:border-primary-gold"
                                    }`}
                                  />
                                  <input
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...questionForm.options];
                                      newOpts[i] = e.target.value;
                                      setQuestionForm((p) => ({
                                        ...p,
                                        options: newOpts,
                                      }));
                                    }}
                                    placeholder={`Opção ${i + 1}`}
                                    className="flex-1 bg-primary-black/50 border border-primary-gold/15 rounded px-2 py-1.5 text-xs text-primary-gold placeholder-primary-gold/20 outline-none focus:border-primary-gold/40 transition-all"
                                  />
                                  {questionForm.options.length > 2 && (
                                    <button
                                      onClick={() => {
                                        const newOpts =
                                          questionForm.options.filter(
                                            (_, idx) => idx !== i,
                                          );
                                        const newCorrect =
                                          questionForm.correctOption >=
                                          newOpts.length
                                            ? newOpts.length - 1
                                            : questionForm.correctOption;
                                        setQuestionForm((p) => ({
                                          ...p,
                                          options: newOpts,
                                          correctOption: newCorrect,
                                        }));
                                      }}
                                      className="text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                                    >
                                      <LuX size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {questionForm.options.length < 6 && (
                                <button
                                  onClick={() =>
                                    setQuestionForm((p) => ({
                                      ...p,
                                      options: [...p.options, ""],
                                    }))
                                  }
                                  className="flex items-center gap-1 text-xs text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer w-fit"
                                >
                                  <LuPlus size={11} /> Adicionar opção
                                </button>
                              )}
                            </div>
                          )}

                          <Button onClick={handleAddQuestion}>
                            {questionSaving ? <Loader /> : "Adicionar pergunta"}
                          </Button>
                        </div>
                      )}

                    {/* Warning if quiz running */}
                    {selectedEvent?.quizStatus === "running" && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-900/20 border border-yellow-700/20 text-xs text-yellow-400">
                        <LuInfo size={12} className="shrink-0" />
                        <span>
                          O quiz está em andamento. Mudanças nas perguntas não
                          afetam respostas já enviadas.
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* ── PARTICIPANTES TAB ── */}
                {quizTab === "participantes" && (
                  <>
                    <TabHint>
                      Respostas enviadas pelos participantes. Corrija as
                      questões de texto clicando em ✓ ou ✗. A pontuação é
                      atualizada automaticamente.
                    </TabHint>

                    {quizParticipantsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader />
                      </div>
                    ) : quizParticipants.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-primary-gold/40 text-center">
                        <LuUsers size={28} />
                        <span className="text-sm">
                          Nenhum participante ainda.
                        </span>
                        <span className="text-xs max-w-[240px]">
                          As respostas aparecem aqui quando o quiz estiver em
                          andamento e os participantes enviarem.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Leaderboard header */}
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs text-primary-gold/50 flex items-center gap-1.5">
                            <LuUsers size={12} /> {quizParticipants.length}{" "}
                            participante
                            {quizParticipants.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-primary-gold/30">
                            {questions.length} pergunta
                            {questions.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {quizParticipants.map((participant, rank) => {
                          const answers = Object.values(participant.answers);
                          const correct = answers.filter(
                            (a) => a.isCorrect === true,
                          ).length;
                          const wrong = answers.filter(
                            (a) => a.isCorrect === false,
                          ).length;
                          const pending = answers.filter(
                            (a) => a.isCorrect === undefined,
                          ).length;
                          const isExpanded =
                            expandedParticipantId === participant.id;

                          return (
                            <div
                              key={participant.id}
                              className="flex flex-col rounded-xl border border-primary-gold/10 bg-primary-black/30 overflow-hidden"
                            >
                              {/* Participant header */}
                              <div
                                className="flex items-start gap-2 p-3 cursor-pointer hover:bg-primary-gold/5 transition-all"
                                onClick={() =>
                                  setExpandedParticipantId(
                                    isExpanded ? null : participant.id,
                                  )
                                }
                              >
                                <span className="text-xs text-primary-gold/30 font-mono w-5 text-right shrink-0 mt-0.5">
                                  {rank + 1}.
                                </span>
                                <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-semibold text-primary-gold truncate">
                                      {participant.name}
                                    </span>
                                    {participant.mesa && (
                                      <span className="shrink-0 text-[10px] text-primary-gold/40 bg-primary-gold/5 border border-primary-gold/10 px-1.5 py-0.5 rounded-full">
                                        📍 {participant.mesa}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                                    <span className="font-bold text-primary-gold text-sm">
                                      {participant.totalScore}
                                      <span className="text-[10px] font-normal text-primary-gold/40 ml-0.5">
                                        pts
                                      </span>
                                    </span>
                                    <span className="text-green-400 flex items-center gap-0.5">
                                      <LuCheck size={10} />
                                      {correct}
                                    </span>
                                    <span className="text-red-400 flex items-center gap-0.5">
                                      <LuX size={10} />
                                      {wrong}
                                    </span>
                                    {pending > 0 && (
                                      <span className="text-yellow-400">
                                        ⏳{pending}
                                      </span>
                                    )}
                                    {participant.timeTakenSeconds !==
                                      undefined && (
                                      <Tooltip
                                        textWrap
                                        content="Soma do tempo apenas das questões respondidas corretamente"
                                        direction="bottom"
                                      >
                                        <span className="text-primary-gold/30 flex items-center gap-0.5 font-mono cursor-default">
                                          <LuTimer size={10} />
                                          {formatTimer(
                                            participant.timeTakenSeconds,
                                          )}
                                        </span>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isExpanded ? (
                                    <LuChevronUp
                                      size={16}
                                      className="text-primary-gold/40 mx-1"
                                    />
                                  ) : (
                                    <LuChevronDown
                                      size={16}
                                      className="text-primary-gold/40 mx-1"
                                    />
                                  )}
                                  <Tooltip
                                    content={
                                      selectedEvent?.quizChampionId ===
                                      participant.participantId
                                        ? "Remover coroa"
                                        : `Coroar ${participant.name} como campeão`
                                    }
                                    direction="left"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetChampion(participant);
                                      }}
                                      disabled={quizActionLoading}
                                      className={`w-9 h-9 flex items-center justify-center rounded-md transition-all cursor-pointer disabled:opacity-40 ${
                                        selectedEvent?.quizChampionId ===
                                        participant.participantId
                                          ? "text-yellow-400 bg-yellow-400/10"
                                          : "text-primary-gold/30 hover:text-yellow-400 hover:bg-yellow-400/10"
                                      }`}
                                    >
                                      <LuCrown size={15} />
                                    </button>
                                  </Tooltip>
                                  <Tooltip
                                    content={`Excluir respostas de ${participant.name}`}
                                    direction="left"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuizParticipant(
                                          participant,
                                        );
                                      }}
                                      className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-invalid-color/10 text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer"
                                    >
                                      <LuTrash size={14} />
                                    </button>
                                  </Tooltip>
                                </div>
                              </div>

                              {/* Expanded answers */}
                              {isExpanded && (
                                <div className="flex flex-col gap-2 px-3 pb-3 border-t border-primary-gold/10 pt-3">
                                  {questions.map((q, qi) => {
                                    const ans = participant.answers[q.id];
                                    if (!ans) {
                                      return (
                                        <div
                                          key={q.id}
                                          className="flex items-start gap-2 text-xs rounded-lg p-2 bg-yellow-900/10 border border-yellow-700/20"
                                        >
                                          <span className="text-primary-gold/30 font-mono shrink-0 w-4 text-right mt-0.5">
                                            {qi + 1}.
                                          </span>
                                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                                            <span className="text-primary-gold/50 leading-snug">
                                              {q.text}
                                            </span>
                                            <span className="flex items-center gap-1 text-yellow-400/80 font-medium">
                                              <LuCircleSlash size={11} />
                                              Não respondida
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    const qTimeMs =
                                      participant.questionTimes?.[q.id];
                                    return (
                                      <div
                                        key={q.id}
                                        className="flex items-start gap-2 text-xs rounded-lg p-2 bg-primary-black/30"
                                      >
                                        <span className="text-primary-gold/30 font-mono shrink-0 w-4 text-right mt-0.5">
                                          {qi + 1}.
                                        </span>
                                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-primary-gold/60 leading-snug">
                                              {q.text}
                                            </span>
                                            {qTimeMs !== undefined && (
                                              <span className="text-primary-gold/30 font-mono shrink-0 text-[10px]">
                                                {(qTimeMs / 1000).toFixed(3)}s
                                              </span>
                                            )}
                                          </div>
                                          {q.type === "multiple_choice" ? (
                                            <div className="flex flex-col gap-0.5">
                                              <span
                                                className={
                                                  ans.isCorrect
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                                }
                                              >
                                                {ans.isCorrect ? "✓" : "✗"}{" "}
                                                {q.options?.[
                                                  ans.answer as number
                                                ] ?? "?"}
                                              </span>
                                              {!ans.isCorrect && (
                                                <span className="text-primary-gold/30">
                                                  Correta:{" "}
                                                  {
                                                    q.options?.[
                                                      q.correctOption ?? 0
                                                    ]
                                                  }
                                                </span>
                                              )}
                                              <span className="text-primary-gold/25">
                                                {ans.pointsEarned ?? 0} pts
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col gap-1.5">
                                              <span className="text-primary-gold/80 bg-primary-black/40 rounded px-2 py-1 italic">
                                                &quot;{ans.answer}&quot;
                                              </span>
                                              {ans.isCorrect === undefined ? (
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() =>
                                                      handleGradeAnswer(
                                                        participant,
                                                        q,
                                                        true,
                                                      )
                                                    }
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg bg-green-900/30 border border-green-700/30 text-green-400 text-xs font-medium hover:bg-green-900/50 cursor-pointer transition-all"
                                                  >
                                                    <LuCheck size={13} />
                                                    Correta (+{q.points}pts)
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      handleGradeAnswer(
                                                        participant,
                                                        q,
                                                        false,
                                                      )
                                                    }
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg bg-red-900/20 border border-red-700/20 text-red-400 text-xs font-medium hover:bg-red-900/30 cursor-pointer transition-all"
                                                  >
                                                    <LuX size={13} /> Errada
                                                  </button>
                                                </div>
                                              ) : (
                                                <div className="flex items-center justify-between gap-2">
                                                  <span
                                                    className={
                                                      ans.isCorrect
                                                        ? "text-green-400"
                                                        : "text-red-400"
                                                    }
                                                  >
                                                    {ans.isCorrect
                                                      ? "✓ Correta"
                                                      : "✗ Errada"}{" "}
                                                    — {ans.pointsEarned ?? 0}{" "}
                                                    pts
                                                  </span>
                                                  <button
                                                    onClick={() =>
                                                      handleGradeAnswer(
                                                        participant,
                                                        q,
                                                        !ans.isCorrect,
                                                      )
                                                    }
                                                    className="px-2.5 py-1.5 -mr-1 text-[11px] text-primary-gold/40 hover:text-primary-gold underline cursor-pointer"
                                                  >
                                                    corrigir
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          onClick={handleDeleteAllQuizParticipants}
                          className="flex items-center gap-2 text-primary-gold/30 hover:text-invalid-color border border-primary-gold/10 hover:border-invalid-color/30 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 mt-1"
                        >
                          <LuTrash size={13} className="shrink-0" />
                          <span className="italic">
                            Excluir todas as respostas
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════
                VOTAÇÃO TAB
            ═══════════════════════════════════════════════════ */}

            {selectedEvent?.subtype === "votacao" && (
              <>
                <TabHint>
                  Cadastre cada fantasia com nome + uma ou mais fotos (dá pra
                  fotografar vários ângulos e selecionar tudo de uma vez, além
                  de recortar cada foto do seu jeito). Depois de salvar, o
                  formulário fica pronto pra cadastrar a próxima. Quando
                  terminar, use o botão <strong>Abrir Votação</strong> no topo.
                  A contagem de votos só aparece pro público depois que você
                  encerrar e liberar o resultado.
                </TabHint>

                <div className="rounded-lg border border-primary-gold/15 bg-primary-black/30 divide-y divide-primary-gold/10">
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm text-primary-gold/80">
                        Clientes podem enviar fotos
                      </span>
                      <span className="text-[11px] text-primary-gold/35">
                        {selectedEvent?.votacaoAllowClientSubmissions
                          ? "Ativado — o público pode cadastrar a própria fantasia durante o cadastro"
                          : "Desativado (padrão) — só você cadastra as fantasias"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAllowClientSubmissions}
                      className="cursor-pointer transition-colors shrink-0"
                    >
                      {selectedEvent?.votacaoAllowClientSubmissions ? (
                        <LuToggleRight size={28} className="text-green-500" />
                      ) : (
                        <LuToggleLeft
                          size={28}
                          className="text-primary-gold/30"
                        />
                      )}
                    </button>
                  </div>

                  {selectedEvent?.votacaoAllowClientSubmissions && (
                    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-primary-gold/70">
                          Permitir várias fantasias por cliente
                        </span>
                        <span className="text-[11px] text-primary-gold/35">
                          {selectedEvent?.votacaoAllowMultipleClientSubmissions
                            ? "Ativado — cada dispositivo pode enviar quantas quiser"
                            : "Desativado (padrão) — 1 fantasia por dispositivo"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleAllowMultipleClientSubmissions}
                        className="cursor-pointer transition-colors shrink-0"
                      >
                        {selectedEvent?.votacaoAllowMultipleClientSubmissions ? (
                          <LuToggleRight
                            size={26}
                            className="text-green-500"
                          />
                        ) : (
                          <LuToggleLeft
                            size={26}
                            className="text-primary-gold/30"
                          />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {selectedEvent?.votacaoStatus === "encerrada" &&
                  topTiedEntryIds.length > 0 && (
                    <div className="flex flex-col gap-2.5 p-3.5 rounded-lg border border-yellow-700/30 bg-yellow-900/10">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-400">
                        <LuCrown size={13} />
                        Empate no 1º lugar
                      </div>
                      <p className="text-[11px] text-yellow-400/70">
                        {selectedEvent.votacaoChampionId
                          ? "Você escolheu a vencedora abaixo — clique nela de novo pra desfazer e voltar a dividir a vitória."
                          : "Escolha uma vencedora entre as empatadas, ou deixe assim pra dividirem o 1º lugar (isso fica visível pro público)."}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {topTiedEntryIds.map((entryId) => {
                          const entry = entries.find((e) => e.id === entryId);
                          if (!entry) return null;
                          const isChampion =
                            selectedEvent.votacaoChampionId === entry.id;
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => handleSetVotacaoChampion(entry)}
                              disabled={votingActionLoading}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                                isChampion
                                  ? "border-yellow-500/50 bg-yellow-500/10"
                                  : "border-primary-gold/10 bg-primary-black/20 hover:border-primary-gold/25"
                              }`}
                            >
                              <div className="w-9 h-9 rounded-md overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0">
                                {entry.images?.[0] && (
                                  <img
                                    src={entry.images[0]}
                                    alt={entry.name}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="text-sm text-primary-gold/90 flex-1 text-left truncate">
                                {entry.name}
                              </span>
                              <LuCrown
                                size={15}
                                className={
                                  isChampion
                                    ? "text-yellow-400"
                                    : "text-primary-gold/20"
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {entriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader />
                  </div>
                ) : entries.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-primary-gold/40">
                    <LuDrama size={28} />
                    <span className="text-sm">
                      Nenhuma fantasia cadastrada ainda
                    </span>
                    <span className="text-xs text-center max-w-[240px]">
                      Use o formulário abaixo para cadastrar as fantasias
                      participantes.
                    </span>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={entries}
                    onReorder={handleReorderEntries}
                    className="flex flex-col gap-2"
                  >
                    {entries.map((entry, index) => (
                      <DraggableEntryItem key={entry.id} entry={entry}>
                        {(dragHandle) =>
                          editingEntry?.id === entry.id ? (
                            <div className="flex flex-col gap-3 p-3 rounded-xl border border-primary-gold/30 bg-primary-black/30">
                              <Input
                                placeholder="Nome da fantasia"
                                value={editingEntryName}
                                setValue={(e) =>
                                  setEditingEntryName(e.target.value)
                                }
                                width="!w-full"
                              />

                              {/* Fotos já existentes — clique no X pra remover */}
                              {editingEntryExistingImages.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editingEntryExistingImages.map((url) => (
                                    <div
                                      key={url}
                                      className="relative shrink-0"
                                    >
                                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50">
                                        <img
                                          src={url}
                                          alt="Foto"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveEditEntryExistingImage(
                                            url,
                                          )
                                        }
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-invalid-color text-white flex items-center justify-center cursor-pointer"
                                      >
                                        <LuX size={11} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Novas fotos adicionadas nesta edição */}
                              {editingEntryNewPhotos.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {editingEntryNewPhotos.map((staged) => (
                                    <div
                                      key={staged.key}
                                      className="relative shrink-0"
                                    >
                                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-primary-gold/30 bg-primary-black/50">
                                        <img
                                          src={staged.previewUrl}
                                          alt="Prévia"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCropEditEntryPhoto(staged.key)
                                        }
                                        className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary-gold text-primary-black flex items-center justify-center cursor-pointer"
                                      >
                                        <LuScissors size={10} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveEditEntryNewPhoto(
                                            staged.key,
                                          )
                                        }
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-invalid-color text-white flex items-center justify-center cursor-pointer"
                                      >
                                        <LuX size={11} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <label className="flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary-gold/30 hover:border-primary-gold/60 text-xs text-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all">
                                <LuImagePlus size={14} />
                                Adicionar mais fotos
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={handleEditEntryFilesSelected}
                                />
                              </label>

                              <div className="flex gap-1">
                                <Button onClick={handleSaveEditEntry}>
                                  {editingEntrySaving ? <Loader /> : "Salvar"}
                                </Button>
                                <Button
                                  onClick={() => setEditingEntry(null)}
                                  isHoverInvalid
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30">
                              {dragHandle}
                              <span className="text-xs text-primary-gold/30 font-mono w-4 text-right shrink-0">
                                {index + 1}.
                              </span>
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0 flex items-center justify-center">
                                {entry.images?.[0] ? (
                                  <img
                                    src={entry.images[0]}
                                    alt={entry.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <LuDrama
                                    size={16}
                                    className="text-primary-gold/20"
                                  />
                                )}
                                {entry.images?.length > 1 && (
                                  <span className="absolute bottom-0 right-0 text-[9px] font-bold bg-primary-black/80 text-primary-gold px-1 rounded-tl-md">
                                    +{entry.images.length - 1}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                                <span className="text-sm font-medium text-primary-gold/90 truncate">
                                  {entry.name}
                                </span>
                                {entry.submittedByClient && (
                                  <span className="flex items-center gap-1 text-[10px] text-primary-gold/35 w-fit">
                                    <LuSmartphone size={10} /> Enviado pelo
                                    cliente
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 flex items-center gap-1 text-xs text-primary-gold/50 bg-primary-gold/5 border border-primary-gold/10 px-2 py-1 rounded-full">
                                <LuVote size={11} />
                                {voteCountByEntry[entry.id] ?? 0}
                              </span>
                              <Tooltip
                                content="Editar fantasia"
                                direction="left"
                              >
                                <button
                                  onClick={() => handleStartEditEntry(entry)}
                                  className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer shrink-0"
                                >
                                  <LuPencil size={13} />
                                </button>
                              </Tooltip>
                              <Tooltip
                                content="Remover fantasia"
                                direction="left"
                              >
                                <button
                                  onClick={() => handleDeleteEntry(entry)}
                                  className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                                >
                                  <LuTrash size={13} />
                                </button>
                              </Tooltip>
                            </div>
                          )
                        }
                      </DraggableEntryItem>
                    ))}
                  </Reorder.Group>
                )}

                {entries.length > 1 && (
                  <div className="flex items-center justify-between gap-2 -mt-1 px-1">
                    <span className="text-[11px] text-primary-gold/30">
                      Arraste pelo{" "}
                      <LuGripVertical size={10} className="inline -mt-0.5" />{" "}
                      pra reordenar
                    </span>
                    <button
                      onClick={handleSaveEntriesOrder}
                      disabled={savingEntriesOrder}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-gold/10 border border-primary-gold/30 text-primary-gold text-xs font-medium hover:bg-primary-gold/20 transition-all cursor-pointer disabled:opacity-40"
                    >
                      {savingEntriesOrder ? <Loader /> : "Salvar ordem"}
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
                  <span className="text-xs font-semibold text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                    <LuPlus size={12} /> Nova fantasia
                  </span>

                  <Input
                    placeholder="Nome da fantasia"
                    value={newEntryName}
                    setValue={(e) => setNewEntryName(e.target.value)}
                    width="!w-full"
                  />

                  <label className="flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-primary-gold/30 hover:border-primary-gold/60 text-sm text-primary-gold/60 hover:text-primary-gold cursor-pointer transition-all">
                    <LuImagePlus size={16} />
                    Selecionar fotos (pode escolher vários ângulos de uma vez)
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleNewEntryFilesSelected}
                    />
                  </label>

                  {newEntryPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newEntryPhotos.map((staged) => (
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
                            onClick={() => handleCropNewEntryPhoto(staged.key)}
                            className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary-gold text-primary-black flex items-center justify-center cursor-pointer"
                          >
                            <LuScissors size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveNewEntryPhoto(staged.key)
                            }
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-invalid-color text-white flex items-center justify-center cursor-pointer"
                          >
                            <LuX size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={handleSaveNewEntry}>
                    {entrySaving ? <Loader /> : "Salvar fantasia"}
                  </Button>
                </div>
              </>
            )}

            {/* ═══════════════════════════════════════════════════
                BOLÃO TABS
            ═══════════════════════════════════════════════════ */}

            {selectedEvent?.subtype === "bolao" && (
              <>
                {/* ── TIMES TAB ── */}
                {bolaoTab === "times" && (
                  <>
                    <TabHint>
                      Adicione os times participantes do bolão. Cole a URL de
                      uma imagem para exibir a bandeira de cada time. Os times
                      cadastrados aqui serão usados para montar as partidas.
                    </TabHint>

                    {teamsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader />
                      </div>
                    ) : teams.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-primary-gold/40">
                        <LuShield size={28} />
                        <span className="text-sm">
                          Nenhum time adicionado ainda
                        </span>
                        <span className="text-xs text-center max-w-[240px]">
                          Use o formulário abaixo para cadastrar os times
                          participantes.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {teams.map((team) => (
                          <div
                            key={team.id}
                            className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0 flex items-center justify-center">
                              {team.image ? (
                                <img
                                  src={team.image}
                                  alt={team.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <LuShield
                                  size={16}
                                  className="text-primary-gold/20"
                                />
                              )}
                            </div>
                            {editingTeam?.id === team.id ? (
                              <div className="flex flex-1 flex-col gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Input
                                    placeholder="Nome do time"
                                    value={editingTeam.name}
                                    setValue={(e) =>
                                      setEditingTeam({
                                        ...editingTeam,
                                        name: e.target.value,
                                      })
                                    }
                                    width="!w-[150px] !py-1 !text-sm"
                                  />
                                  <Input
                                    placeholder="URL da bandeira"
                                    value={editingTeam.image}
                                    setValue={(e) =>
                                      setEditingTeam({
                                        ...editingTeam,
                                        image: e.target.value,
                                      })
                                    }
                                    width="!w-[180px] !py-1 !text-sm"
                                  />
                                  {editingTeam.image && (
                                    <FlagPreview
                                      url={editingTeam.image}
                                      name={editingTeam.name}
                                      size={8}
                                    />
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button onClick={handleSaveEditTeam}>
                                    {teamSaving ? <Loader /> : "Salvar"}
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setEditingTeam(null);
                                      setTeamForm(patternTeamForm);
                                    }}
                                    isHoverInvalid
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col flex-1">
                                  <span className="text-sm font-medium text-primary-gold/90">
                                    {team.name}
                                  </span>
                                  {team.image && (
                                    <span className="text-[10px] text-primary-gold/30 truncate max-w-[200px]">
                                      {team.image}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Tooltip
                                    content="Editar time"
                                    direction="left"
                                  >
                                    <button
                                      onClick={() => {
                                        setEditingTeam(team);
                                        setTeamForm(patternTeamForm);
                                      }}
                                      className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer"
                                    >
                                      <LuPencil size={13} />
                                    </button>
                                  </Tooltip>
                                  <Tooltip
                                    content="Remover time"
                                    direction="left"
                                  >
                                    <button
                                      onClick={() => handleDeleteTeam(team)}
                                      className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer"
                                    >
                                      <LuTrash size={13} />
                                    </button>
                                  </Tooltip>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {!editingTeam && (
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
                        <span className="text-xs font-semibold text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                          <LuPlus size={12} /> Adicionar time
                        </span>
                        <div className="flex items-end gap-3 flex-wrap pt-4">
                          <Input
                            label="Nome do time"
                            placeholder="Ex: Brasil"
                            value={teamForm.name}
                            setValue={(e) =>
                              setTeamForm((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                            width="!w-[160px]"
                          />
                          <div className="flex items-end gap-2">
                            <Input
                              label="URL da bandeira"
                              placeholder="https://..."
                              value={teamForm.imageUrl}
                              setValue={(e) =>
                                setTeamForm((p) => ({
                                  ...p,
                                  imageUrl: e.target.value,
                                }))
                              }
                              width="!w-[180px]"
                            />
                            {teamForm.imageUrl ? (
                              <FlagPreview
                                url={teamForm.imageUrl}
                                name={teamForm.name}
                                size={10}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg border border-dashed border-primary-gold/15 flex items-center justify-center shrink-0">
                                <LuImage
                                  size={14}
                                  className="text-primary-gold/20"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <Button onClick={handleAddTeam}>
                          {teamSaving ? <Loader /> : "Adicionar time"}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* ── PARTIDAS TAB ── */}
                {bolaoTab === "partidas" && (
                  <>
                    <TabHint>
                      Monte as partidas do bolão selecionando dois times. Os
                      participantes vão palpitar o placar de cada partida
                      cadastrada aqui.
                    </TabHint>

                    {matchesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader />
                      </div>
                    ) : matches.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-primary-gold/40">
                        <LuSwords size={28} />
                        <span className="text-sm">
                          Nenhuma partida cadastrada ainda
                        </span>
                        {teams.length < 2 ? (
                          <>
                            <span className="text-xs text-center max-w-[240px]">
                              É necessário ter ao menos 2 times para criar uma
                              partida.
                            </span>
                            <button
                              onClick={() => setBolaoTab("times")}
                              className="mt-1 px-4 py-1.5 rounded-lg bg-primary-gold/10 border border-primary-gold/30 text-primary-gold text-xs font-medium hover:bg-primary-gold/20 transition-all cursor-pointer"
                            >
                              Ir para Times →
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-center max-w-[240px]">
                            Use o formulário abaixo para criar as partidas.
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {matches.map((match) => {
                          const teamA = teamById(match.teamAId);
                          const teamB = teamById(match.teamBId);
                          return (
                            <div
                              key={match.id}
                              className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {teamA?.image && (
                                  <img
                                    src={teamA.image}
                                    alt={teamA.name}
                                    className="w-7 h-7 rounded object-cover border border-primary-gold/10"
                                  />
                                )}
                                <span className="text-sm text-primary-gold/90 font-medium">
                                  {teamA?.name ?? "?"}
                                </span>
                              </div>
                              <span className="text-xs text-primary-gold/40 font-bold shrink-0">
                                vs
                              </span>
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-sm text-primary-gold/90 font-medium">
                                  {teamB?.name ?? "?"}
                                </span>
                                {teamB?.image && (
                                  <img
                                    src={teamB.image}
                                    alt={teamB.name}
                                    className="w-7 h-7 rounded object-cover border border-primary-gold/10"
                                  />
                                )}
                              </div>
                              {match.date && (
                                <span className="text-[10px] text-primary-gold/30 shrink-0 bg-primary-gold/5 px-1.5 py-0.5 rounded border border-primary-gold/10">
                                  {match.date}
                                </span>
                              )}
                              <Tooltip
                                content="Remover partida"
                                direction="left"
                              >
                                <button
                                  onClick={() => handleDeleteMatch(match)}
                                  className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                                >
                                  <LuTrash size={13} />
                                </button>
                              </Tooltip>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {teams.length < 2 ? (
                      <div className="flex flex-col items-center gap-2 py-4 text-primary-gold/40 text-sm text-center border border-dashed border-primary-gold/10 rounded-xl">
                        <LuShield size={20} />
                        <span>
                          Cadastre pelo menos 2 times na aba{" "}
                          <strong className="text-primary-gold/60">
                            Times
                          </strong>{" "}
                          antes de criar partidas.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
                        <span className="text-xs font-semibold text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                          <LuPlus size={12} /> Adicionar partida
                        </span>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <span className="text-xs text-primary-gold/60 mb-1 block">
                                Time A
                              </span>
                              <select
                                className={selectClass}
                                value={matchForm.teamAId}
                                onChange={(e) =>
                                  setMatchForm((p) => ({
                                    ...p,
                                    teamAId: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecionar time</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <span className="text-primary-gold/40 font-bold pt-5">
                              vs
                            </span>
                            <div className="flex-1">
                              <span className="text-xs text-primary-gold/60 mb-1 block">
                                Time B
                              </span>
                              <select
                                className={selectClass}
                                value={matchForm.teamBId}
                                onChange={(e) =>
                                  setMatchForm((p) => ({
                                    ...p,
                                    teamBId: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecionar time</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {(selectedTeamA || selectedTeamB) && (
                            <div className="flex items-center justify-center gap-3 py-2 rounded-lg bg-primary-gold/5 border border-primary-gold/10">
                              <div className="flex items-center gap-2">
                                {selectedTeamA?.image && (
                                  <FlagPreview
                                    url={selectedTeamA.image}
                                    name={selectedTeamA.name}
                                    size={6}
                                  />
                                )}
                                <span className="text-xs text-primary-gold/70 font-medium">
                                  {selectedTeamA?.name ?? "—"}
                                </span>
                              </div>
                              <span className="text-primary-gold/30 text-xs font-bold">
                                vs
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-primary-gold/70 font-medium">
                                  {selectedTeamB?.name ?? "—"}
                                </span>
                                {selectedTeamB?.image && (
                                  <FlagPreview
                                    url={selectedTeamB.image}
                                    name={selectedTeamB.name}
                                    size={6}
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-end gap-3 pt-4">
                            <Input
                              label="Data (opcional)"
                              placeholder="Data (ex: 14/06)"
                              value={matchForm.date}
                              setValue={(e) =>
                                setMatchForm((p) => ({
                                  ...p,
                                  date: e.target.value,
                                }))
                              }
                              width="!w-[140px]"
                            />
                            <Button onClick={handleAddMatch}>
                              {matchSaving ? <Loader /> : "Adicionar"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── PALPITES TAB ── */}
                {bolaoTab === "palpites" && (
                  <>
                    <TabHint>
                      Palpites enviados pelos participantes. Ao excluir o
                      palpite de alguém, essa pessoa poderá enviar um novo.
                    </TabHint>

                    {participantsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader />
                      </div>
                    ) : participants.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-primary-gold/40 text-center">
                        <LuTrophy size={28} />
                        <span className="text-sm">
                          Nenhum palpite enviado ainda.
                        </span>
                        <span className="text-xs max-w-[240px]">
                          Os palpites aparecem aqui assim que os participantes
                          enviarem pela página do evento.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs text-primary-gold/50 flex items-center gap-1.5">
                            <LuUsers size={12} /> {participants.length}{" "}
                            participante
                            {participants.length !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-primary-gold/30">
                            {matches.length} partida
                            {matches.length !== 1 ? "s" : ""} no bolão
                          </span>
                        </div>

                        {participants.map((participant, index) => (
                          <div
                            key={participant.id}
                            className="flex flex-col gap-2 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-primary-gold/30 font-mono w-5 text-right shrink-0">
                                {index + 1}.
                              </span>
                              <span className="text-sm font-semibold text-primary-gold flex-1">
                                {participant.name}
                              </span>
                              <Tooltip
                                content={`Excluir palpite de ${participant.name}`}
                                direction="left"
                              >
                                <button
                                  onClick={() =>
                                    handleDeleteParticipant(participant)
                                  }
                                  className="p-1 rounded-md hover:bg-invalid-color/10 text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                                >
                                  <LuTrash size={12} />
                                </button>
                              </Tooltip>
                            </div>
                            <div className="flex flex-col gap-1 pl-7">
                              {matches.map((match) => {
                                const teamA = teams.find(
                                  (t) => t.id === match.teamAId,
                                );
                                const teamB = teams.find(
                                  (t) => t.id === match.teamBId,
                                );
                                const pred =
                                  participant.predictions?.[match.id];
                                return (
                                  <div
                                    key={match.id}
                                    className="flex items-center gap-2 text-xs text-primary-gold/70"
                                  >
                                    <div className="flex items-center gap-1 flex-1 justify-end">
                                      {teamA?.image && (
                                        <img
                                          src={teamA.image}
                                          alt={teamA.name}
                                          className="w-4 h-4 rounded object-cover"
                                        />
                                      )}
                                      <span>{teamA?.name ?? "?"}</span>
                                    </div>
                                    <span className="shrink-0 font-bold text-primary-gold px-2 py-0.5 bg-primary-gold/10 rounded border border-primary-gold/20">
                                      {pred?.scoreA ?? "-"} ×{" "}
                                      {pred?.scoreB ?? "-"}
                                    </span>
                                    <div className="flex items-center gap-1 flex-1">
                                      <span>{teamB?.name ?? "?"}</span>
                                      {teamB?.image && (
                                        <img
                                          src={teamB.image}
                                          alt={teamB.name}
                                          className="w-4 h-4 rounded object-cover"
                                        />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {matches.length === 0 && (
                                <span className="text-xs text-primary-gold/30 italic">
                                  Sem partidas cadastradas
                                </span>
                              )}
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={handleDeleteAllParticipants}
                          className="flex items-center gap-2 text-primary-gold/30 hover:text-invalid-color border border-primary-gold/10 hover:border-invalid-color/30 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 mt-1"
                        >
                          <LuTrash size={13} className="shrink-0" />
                          <span className="italic">
                            Excluir todos os palpites
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de recorte de imagem (cadastro em lote + edição de fantasia) */}
      <ImageCropperModal
        isOpen={!!cropperContext}
        file={cropperFile}
        onCancel={() => {
          setCropperContext(null);
          setCropperFile(null);
        }}
        onConfirm={handleCropConfirm}
      />

      {/* Modal de confirmação simples */}
      {simpleConfirmModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setSimpleConfirmModal(null)}
        >
          <div
            className="bg-secondary-black border border-primary-gold/20 rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex flex-col gap-4">
              <p className="text-sm text-primary-gold/80">
                {simpleConfirmModal.message}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setSimpleConfirmModal(null)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold hover:border-primary-gold/40 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    simpleConfirmModal.onConfirm();
                    setSimpleConfirmModal(null);
                  }}
                  className="px-4 py-1.5 text-sm rounded-lg border border-invalid-color/40 text-invalid-color bg-invalid-color/10 hover:bg-invalid-color/20 transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação destrutiva com digitação */}
      {deleteTypedModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setDeleteTypedModal(null)}
        >
          <div
            className="bg-secondary-black border border-invalid-color/30 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-invalid-color/20">
              <span className="text-sm font-semibold text-invalid-color flex items-center gap-2">
                <LuTrash size={14} />
                {deleteTypedModal.title}
              </span>
              <button
                onClick={() => setDeleteTypedModal(null)}
                className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
              >
                <LuX size={13} />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <p className="text-sm text-primary-gold/60">
                {deleteTypedModal.description}
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-primary-gold/40">
                  Digite{" "}
                  <span className="font-mono font-bold text-invalid-color/80">
                    EXCLUIR
                  </span>{" "}
                  para confirmar
                </label>
                <input
                  type="text"
                  value={deleteTypedInput}
                  onChange={(e) => setDeleteTypedInput(e.target.value)}
                  placeholder="EXCLUIR"
                  autoFocus
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      deleteTypedInput.toUpperCase() === "EXCLUIR"
                    ) {
                      deleteTypedModal.onConfirm();
                      setDeleteTypedModal(null);
                    }
                  }}
                  className="bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2 text-sm text-primary-gold placeholder:text-primary-gold/20 focus:outline-none focus:border-invalid-color/40 transition-colors font-mono"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteTypedModal(null)}
                  className="px-4 py-1.5 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold hover:border-primary-gold/40 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  disabled={deleteTypedInput.toUpperCase() !== "EXCLUIR"}
                  onClick={() => {
                    deleteTypedModal.onConfirm();
                    setDeleteTypedModal(null);
                  }}
                  className="px-4 py-1.5 text-sm rounded-lg border border-invalid-color/40 text-invalid-color bg-invalid-color/10 hover:bg-invalid-color/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
