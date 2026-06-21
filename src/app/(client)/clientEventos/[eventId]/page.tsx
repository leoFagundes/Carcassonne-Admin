"use client";

import { useAlert } from "@/contexts/alertProvider";
import BolaoMatchRepository from "@/services/repositories/BolaoMatchRepository";
import BolaoParticipantRepository from "@/services/repositories/BolaoParticipantRepository";
import BolaoTeamRepository from "@/services/repositories/BolaoTeamRepository";
import EventRepository from "@/services/repositories/EventRepository";
import {
  BolaoMatchType,
  BolaoParticipantType,
  BolaoTeamType,
  EventItemType,
} from "@/types";
import { getLucideIcon } from "@/utils/utilFunctions";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiSkipBack } from "react-icons/fi";
import { LuShield, LuSwords, LuTrophy } from "react-icons/lu";
import LoaderFullscreen from "@/components/loaderFullscreen";

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

function ScorePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
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

export default function ClientBolaoPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();
  const { addAlert } = useAlert();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [event, setEvent] = useState<EventItemType | null>(null);
  const [teams, setTeams] = useState<(BolaoTeamType & { id: string })[]>([]);
  const [matches, setMatches] = useState<(BolaoMatchType & { id: string })[]>([]);

  const [name, setName] = useState("");
  const [scores, setScores] = useState<Record<string, ScorePair>>({});

  const [submitted, setSubmitted] = useState(false);
  const [lockedParticipant, setLockedParticipant] = useState<BolaoParticipantType | null>(null);

  const participantIdRef = useRef<string>("");

  useEffect(() => {
    participantIdRef.current = getOrCreateParticipantId();
    fetchAll();
  }, [eventId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fetchedEvent, fetchedTeams, fetchedMatches] = await Promise.all([
        EventRepository.getAll().then((all) => all.find((e) => e.id === eventId) ?? null),
        BolaoTeamRepository.getByEventId(eventId),
        BolaoMatchRepository.getByEventId(eventId),
      ]);

      setEvent(fetchedEvent);
      setTeams(fetchedTeams);
      setMatches(fetchedMatches);

      // Initialize score pairs
      const initial: Record<string, ScorePair> = {};
      fetchedMatches.forEach((m) => { initial[m.id] = { scoreA: 0, scoreB: 0 }; });
      setScores(initial);

      // Check if already submitted
      const existing = await BolaoParticipantRepository.getByParticipantId(
        eventId,
        participantIdRef.current
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
    const allFilled = matches.every(
      (m) => scores[m.id] !== undefined
    );
    if (!allFilled) {
      addAlert("Preencha o placar de todas as partidas.");
      return;
    }

    setSubmitting(true);
    try {
      const predictions: BolaoParticipantType["predictions"] = {};
      matches.forEach((m) => { predictions[m.id] = scores[m.id]; });

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
    } catch (error) {
      console.error("Erro ao enviar palpite:", error);
      addAlert("Erro ao enviar palpite. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const teamById = (id: string) => teams.find((t) => t.id === id);

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
      <style>{`
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
      `}</style>

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
            <p className="text-sm text-primary-gold/50 max-w-[340px]">{event.description}</p>
          )}
        </div>

        {/* Teams showcase */}
        {teams.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-[500px]">
            {teams.map((team) => (
              <div key={team.id} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary-gold/20 bg-primary-black/50">
                  {team.image ? (
                    <img src={team.image} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LuShield size={16} className="text-primary-gold/30" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-primary-gold/50">{team.name}</span>
              </div>
            ))}
          </div>
        )}

        <div className="w-full max-w-[480px]">
          {/* ── LOCKED VIEW (already submitted) ── */}
          {submitted && lockedParticipant ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-900/20 border border-green-700/30 text-center">
                <LuTrophy size={22} className="text-green-500" />
                <p className="text-sm font-semibold text-green-400">
                  Palpite enviado, {lockedParticipant.name}!
                </p>
                <p className="text-xs text-green-500/60">Seu palpite está bloqueado e não pode ser alterado.</p>
              </div>

              <div className="flex flex-col gap-2">
                {matches.map((match) => {
                  const teamA = teamById(match.teamAId);
                  const teamB = teamById(match.teamBId);
                  const pred = lockedParticipant.predictions[match.id];
                  return (
                    <div key={match.id} className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-secondary-black/60">
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium text-primary-gold/80">{teamA?.name}</span>
                        {teamA?.image && <img src={teamA.image} alt={teamA.name} className="w-7 h-7 rounded object-cover border border-primary-gold/10 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-primary-gold/10 border border-primary-gold/20">
                        <span className="text-primary-gold font-bold text-base w-5 text-center">{pred?.scoreA ?? 0}</span>
                        <span className="text-primary-gold/40 text-xs">x</span>
                        <span className="text-primary-gold font-bold text-base w-5 text-center">{pred?.scoreB ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {teamB?.image && <img src={teamB.image} alt={teamB.name} className="w-7 h-7 rounded object-cover border border-primary-gold/10 shrink-0" />}
                        <span className="text-sm font-medium text-primary-gold/80">{teamB?.name}</span>
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
                    <label className="text-xs text-primary-gold/60 uppercase tracking-wider">Seu nome</label>
                    <input
                      type="text"
                      placeholder="Digite seu nome..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-secondary-black/60 border border-primary-gold/20 rounded-xl px-4 py-3 text-primary-gold placeholder-primary-gold/30 outline-none focus:border-primary-gold/50 transition-all text-sm"
                    />
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/20 to-transparent" />

                  {/* Matches */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                      <LuSwords size={12} /> Partidas
                    </span>
                    {matches.map((match) => {
                      const teamA = teamById(match.teamAId);
                      const teamB = teamById(match.teamBId);
                      return (
                        <div key={match.id} className="flex items-center gap-2 p-3 rounded-xl border border-primary-gold/10 bg-secondary-black/60">
                          {/* Team A */}
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-sm font-medium text-primary-gold/90 text-right">{teamA?.name ?? "?"}</span>
                            {teamA?.image && <img src={teamA.image} alt={teamA.name} className="w-8 h-8 rounded object-cover border border-primary-gold/10 shrink-0" />}
                          </div>

                          {/* Score inputs */}
                          <div className="flex items-center gap-2 shrink-0">
                            <ScorePicker
                              value={scores[match.id]?.scoreA ?? 0}
                              onChange={(v) => setScores((p) => ({ ...p, [match.id]: { ...p[match.id], scoreA: v } }))}
                            />
                            <span className="text-primary-gold/40 text-xs font-bold">×</span>
                            <ScorePicker
                              value={scores[match.id]?.scoreB ?? 0}
                              onChange={(v) => setScores((p) => ({ ...p, [match.id]: { ...p[match.id], scoreB: v } }))}
                            />
                          </div>

                          {/* Team B */}
                          <div className="flex items-center gap-2 flex-1">
                            {teamB?.image && <img src={teamB.image} alt={teamB.name} className="w-8 h-8 rounded object-cover border border-primary-gold/10 shrink-0" />}
                            <span className="text-sm font-medium text-primary-gold/90">{teamB?.name ?? "?"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit */}
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
        </div>
      </div>
    </>
  );
}
