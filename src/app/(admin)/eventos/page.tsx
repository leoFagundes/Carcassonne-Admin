"use client";

import React, { useEffect, useState } from "react";
import {
  LuCalendarDays,
  LuPencil,
  LuPlus,
  LuSettings2,
  LuShield,
  LuSwords,
  LuToggleLeft,
  LuToggleRight,
  LuTrash,
  LuTrophy,
  LuX,
  LuImage,
  LuUsers,
  LuInfo,
} from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "@/components/loaderFullscreen";
import Modal from "@/components/modal";
import EventForms from "@/components/eventForms";
import EventRepository from "@/services/repositories/EventRepository";
import BolaoTeamRepository from "@/services/repositories/BolaoTeamRepository";
import BolaoMatchRepository from "@/services/repositories/BolaoMatchRepository";
import BolaoParticipantRepository from "@/services/repositories/BolaoParticipantRepository";
import { EventItemType, BolaoTeamType, BolaoMatchType, BolaoParticipantType } from "@/types";
import { patternEvent } from "@/utils/patternValues";
import { getLucideIcon } from "@/utils/utilFunctions";
import Input from "@/components/input";
import Button from "@/components/button";
import Loader from "@/components/loader";
import Tooltip from "@/components/Tooltip";

type TeamFormState = { name: string; imageUrl: string };
type MatchFormState = { teamAId: string; teamBId: string; date: string };
type BolaoTab = "times" | "partidas" | "palpites";

const patternTeamForm: TeamFormState = { name: "", imageUrl: "" };
const patternMatchForm: MatchFormState = { teamAId: "", teamBId: "", date: "" };

function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary-gold/5 border border-primary-gold/10 text-xs text-primary-gold/50">
      <LuInfo size={12} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function FlagPreview({ url, name, size = 8 }: { url: string; name?: string; size?: number }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt={name ?? "flag"}
      className={`w-${size} h-${size} rounded object-cover border border-primary-gold/20 shrink-0`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export default function EventosPage() {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<(EventItemType & { id: string })[]>([]);

  const [eventFormsModal, setEventFormsModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventItemType>(patternEvent);

  // Bolão modal
  const [bolaoModal, setBolaoModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<(EventItemType & { id: string }) | null>(null);
  const [bolaoTab, setBolaoTab] = useState<BolaoTab>("times");

  // Teams
  const [teams, setTeams] = useState<(BolaoTeamType & { id: string })[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamForm, setTeamForm] = useState<TeamFormState>(patternTeamForm);
  const [editingTeam, setEditingTeam] = useState<(BolaoTeamType & { id: string }) | null>(null);
  const [teamSaving, setTeamSaving] = useState(false);

  // Matches
  const [matches, setMatches] = useState<(BolaoMatchType & { id: string })[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchForm, setMatchForm] = useState<MatchFormState>(patternMatchForm);
  const [matchSaving, setMatchSaving] = useState(false);

  // Participants
  const [participants, setParticipants] = useState<(BolaoParticipantType & { id: string })[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const { addAlert } = useAlert();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const fetched = await EventRepository.getAll();
      setEvents(fetched);
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
    } catch (error) {
      addAlert("Erro ao carregar times.");
      console.error(error);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchMatches = async (eventId: string) => {
    setMatchesLoading(true);
    try {
      setMatches(await BolaoMatchRepository.getByEventId(eventId));
    } catch (error) {
      addAlert("Erro ao carregar partidas.");
      console.error(error);
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchParticipants = async (eventId: string) => {
    setParticipantsLoading(true);
    try {
      setParticipants(await BolaoParticipantRepository.getByEventId(eventId));
    } catch (error) {
      addAlert("Erro ao carregar palpites.");
      console.error(error);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleDeleteParticipant = async (participant: BolaoParticipantType & { id: string }) => {
    if (!window.confirm(`Excluir o palpite de "${participant.name}"?`)) return;
    try {
      await BolaoParticipantRepository.delete(participant.id);
      setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
      addAlert(`Palpite de "${participant.name}" excluído.`);
    } catch (error) {
      addAlert("Erro ao excluir palpite.");
      console.error(error);
    }
  };

  const handleDeleteAllParticipants = async () => {
    if (!selectedEvent) return;
    if (!window.confirm(`Excluir TODOS os ${participants.length} palpites deste evento? Essa ação é irreversível.`)) return;
    try {
      await BolaoParticipantRepository.deleteAllByEventId(selectedEvent.id);
      setParticipants([]);
      addAlert("Todos os palpites foram excluídos.");
    } catch (error) {
      addAlert("Erro ao excluir palpites.");
      console.error(error);
    }
  };

  const openBolaoModal = (event: EventItemType & { id: string }) => {
    setSelectedEvent(event);
    setBolaoModal(true);
    setBolaoTab("times");
    setTeamForm(patternTeamForm);
    setEditingTeam(null);
    setMatchForm(patternMatchForm);
    fetchTeams(event.id);
    fetchMatches(event.id);
    fetchParticipants(event.id);
  };

  const handleToggleActive = async (event: EventItemType & { id: string }) => {
    try {
      await EventRepository.update(event.id, { isActive: !event.isActive });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isActive: !e.isActive } : e))
      );
    } catch (error) {
      addAlert("Erro ao atualizar status do evento.");
      console.error(error);
    }
  };

  // ── Team handlers ──────────────────────────────────────────────

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
          { id, name: teamForm.name.trim(), image: teamForm.imageUrl.trim(), eventId: selectedEvent.id },
        ]);
        setTeamForm(patternTeamForm);
        addAlert(`Time "${teamForm.name}" adicionado!`);
      }
    } catch (error) {
      addAlert("Erro ao adicionar time.");
      console.error(error);
    } finally {
      setTeamSaving(false);
    }
  };

  const handleSaveEditTeam = async () => {
    if (!editingTeam || !editingTeam.name.trim()) {
      addAlert("Preencha o nome do time.");
      return;
    }
    setTeamSaving(true);
    try {
      await BolaoTeamRepository.update(editingTeam.id, {
        name: editingTeam.name.trim(),
        image: editingTeam.image.trim(),
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === editingTeam.id
            ? { ...t, name: editingTeam.name.trim(), image: editingTeam.image.trim() }
            : t
        )
      );
      setEditingTeam(null);
      setTeamForm(patternTeamForm);
      addAlert(`Time "${editingTeam.name}" atualizado!`);
    } catch (error) {
      addAlert("Erro ao atualizar time.");
      console.error(error);
    } finally {
      setTeamSaving(false);
    }
  };

  const handleDeleteTeam = async (team: BolaoTeamType & { id: string }) => {
    if (!window.confirm(`Deletar o time "${team.name}"?`)) return;
    try {
      await BolaoTeamRepository.delete(team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      addAlert(`Time "${team.name}" removido.`);
    } catch (error) {
      addAlert("Erro ao remover time.");
      console.error(error);
    }
  };

  // ── Match handlers ─────────────────────────────────────────────

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
    } catch (error) {
      addAlert("Erro ao adicionar partida.");
      console.error(error);
    } finally {
      setMatchSaving(false);
    }
  };

  const handleDeleteMatch = async (match: BolaoMatchType & { id: string }) => {
    const teamA = teams.find((t) => t.id === match.teamAId)?.name ?? "?";
    const teamB = teams.find((t) => t.id === match.teamBId)?.name ?? "?";
    if (!window.confirm(`Deletar a partida ${teamA} x ${teamB}?`)) return;
    try {
      await BolaoMatchRepository.delete(match.id);
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
      addAlert("Partida removida.");
    } catch (error) {
      addAlert("Erro ao remover partida.");
      console.error(error);
    }
  };

  // ── Empty state ────────────────────────────────────────────────

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-secondary-black border border-primary-gold/10">
        <LuCalendarDays size={34} className="text-primary-gold/20" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-primary-gold/60">Nenhum evento cadastrado</p>
        <p className="text-sm text-primary-gold/30 max-w-[260px]">
          Crie seu primeiro evento clicando no botão <span className="text-primary-gold">+</span> acima.
        </p>
      </div>
      <button
        onClick={() => { setCurrentEvent(patternEvent); setEventFormsModal(true); }}
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

  return (
    <section className="flex flex-col gap-5 w-full h-full overflow-y-auto">
      {loading && <LoaderFullscreen />}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center gap-4 w-full">
          <div className="flex items-center gap-2">
            <LuCalendarDays size={32} className="text-primary-gold/70 shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-3xl font-semibold text-primary-gold">Eventos</h1>
              <span className="text-xs text-primary-gold/40">
                {events.length} {events.length === 1 ? "evento" : "eventos"} cadastrado{events.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <Tooltip direction="bottom" content="Criar novo evento">
            <button
              onClick={() => { setCurrentEvent(patternEvent); setEventFormsModal(true); }}
              className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuPlus size={14} />
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
                  {Icon ? <Icon size={22} className="text-primary-gold" /> : <LuCalendarDays size={22} className="text-primary-gold/40" />}
                </div>
                <div className="flex flex-col flex-1 overflow-hidden gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-primary-gold truncate">{event.name}</span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-gold/10 border border-primary-gold/20 text-primary-gold/60 uppercase tracking-wider">
                      {event.subtype === "bolao" ? "Bolão" : event.subtype}
                    </span>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${event.isActive ? "bg-green-900/20 border-green-700/30 text-green-500" : "bg-primary-gold/5 border-primary-gold/10 text-primary-gold/30"}`}>
                      {event.isActive ? "ativo" : "inativo"}
                    </span>
                  </div>
                  <span className="text-xs text-primary-gold/40 truncate">{event.description}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip content={event.isActive ? "Desativar evento (some dos clientes)" : "Ativar evento (aparece para os clientes)"}>
                    <button onClick={() => handleToggleActive(event)} className="p-1.5 rounded-md hover:bg-primary-gold/10 transition-all cursor-pointer">
                      {event.isActive ? <LuToggleRight size={18} className="text-green-500" /> : <LuToggleLeft size={18} className="text-primary-gold/30" />}
                    </button>
                  </Tooltip>
                  {event.subtype === "bolao" && (
                    <Tooltip content="Gerenciar times, partidas e palpites">
                      <button onClick={() => openBolaoModal(event)} className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer">
                        <LuSettings2 size={15} />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="Editar nome, descrição e ícone">
                    <button onClick={() => { setCurrentEvent(event); setEventFormsModal(true); }} className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer">
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
      <Modal isOpen={eventFormsModal} onClose={() => setEventFormsModal(false)}>
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

      {/* Bolão management modal */}
      <Modal isOpen={bolaoModal} onClose={() => setBolaoModal(false)} noPadding patternCloseButton={false}>
        <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-2xl w-[95vw] max-w-[580px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary-gold/10 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-primary-gold">{selectedEvent?.name}</span>
              <div className="flex items-center gap-3 text-[11px] text-primary-gold/40">
                <span className="flex items-center gap-1"><LuShield size={11} /> {teams.length} time{teams.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1"><LuSwords size={11} /> {matches.length} partida{matches.length !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1"><LuUsers size={11} /> {participants.length} palpite{participants.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <button
              onClick={() => { setBolaoModal(false); setEditingTeam(null); setTeamForm(patternTeamForm); }}
              className="p-1.5 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer"
            >
              <LuX size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-primary-gold/10 shrink-0">
            {(["times", "partidas", "palpites"] as BolaoTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setBolaoTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  bolaoTab === tab
                    ? "text-primary-gold border-b-2 border-primary-gold"
                    : "text-primary-gold/40 hover:text-primary-gold/70"
                }`}
              >
                {tab === "times" && <LuShield size={13} />}
                {tab === "partidas" && <LuSwords size={13} />}
                {tab === "palpites" && <LuTrophy size={13} />}
                {tab === "times" ? "Times" : tab === "partidas" ? "Partidas" : "Palpites"}
                {tab === "palpites" && participants.length > 0 && (
                  <span className="ml-1 text-[10px] bg-primary-gold/20 text-primary-gold px-1.5 py-0.5 rounded-full">
                    {participants.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">

            {/* ── TIMES TAB ── */}
            {bolaoTab === "times" && (
              <>
                <TabHint>
                  Adicione os times participantes do bolão. Cole a URL de uma imagem para exibir a bandeira de cada time.
                  Os times cadastrados aqui serão usados para montar as partidas.
                </TabHint>

                {teamsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader /></div>
                ) : teams.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-primary-gold/40">
                    <LuShield size={28} />
                    <span className="text-sm">Nenhum time adicionado ainda</span>
                    <span className="text-xs text-center max-w-[240px]">Use o formulário abaixo para cadastrar os times participantes.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0 flex items-center justify-center">
                          {team.image ? (
                            <img src={team.image} alt={team.name} className="w-full h-full object-cover" />
                          ) : (
                            <LuShield size={16} className="text-primary-gold/20" />
                          )}
                        </div>
                        {editingTeam?.id === team.id ? (
                          <div className="flex flex-1 flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Input
                                placeholder="Nome do time"
                                value={editingTeam.name}
                                setValue={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                width="!w-[150px] !py-1 !text-sm"
                              />
                              <Input
                                placeholder="URL da bandeira"
                                value={editingTeam.image}
                                setValue={(e) => setEditingTeam({ ...editingTeam, image: e.target.value })}
                                width="!w-[180px] !py-1 !text-sm"
                              />
                              {editingTeam.image && (
                                <FlagPreview url={editingTeam.image} name={editingTeam.name} size={8} />
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button onClick={handleSaveEditTeam}>{teamSaving ? <Loader /> : "Salvar"}</Button>
                              <Button onClick={() => { setEditingTeam(null); setTeamForm(patternTeamForm); }} isHoverInvalid>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium text-primary-gold/90">{team.name}</span>
                              {team.image && (
                                <span className="text-[10px] text-primary-gold/30 truncate max-w-[200px]">{team.image}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Tooltip content="Editar time" direction="left">
                                <button onClick={() => { setEditingTeam(team); setTeamForm(patternTeamForm); }} className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer">
                                  <LuPencil size={13} />
                                </button>
                              </Tooltip>
                              <Tooltip content="Remover time" direction="left">
                                <button onClick={() => handleDeleteTeam(team)} className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer">
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
                        setValue={(e) => setTeamForm((p) => ({ ...p, name: e.target.value }))}
                        width="!w-[160px]"
                      />
                      <div className="flex items-end gap-2">
                        <Input
                          label="URL da bandeira"
                          placeholder="https://..."
                          value={teamForm.imageUrl}
                          setValue={(e) => setTeamForm((p) => ({ ...p, imageUrl: e.target.value }))}
                          width="!w-[180px]"
                        />
                        {teamForm.imageUrl ? (
                          <FlagPreview url={teamForm.imageUrl} name={teamForm.name} size={10} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border border-dashed border-primary-gold/15 flex items-center justify-center shrink-0">
                            <LuImage size={14} className="text-primary-gold/20" />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleAddTeam}>{teamSaving ? <Loader /> : "Adicionar time"}</Button>
                  </div>
                )}
              </>
            )}

            {/* ── PARTIDAS TAB ── */}
            {bolaoTab === "partidas" && (
              <>
                <TabHint>
                  Monte as partidas do bolão selecionando dois times. Os participantes vão palpitar o placar de cada partida cadastrada aqui.
                </TabHint>

                {matchesLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader /></div>
                ) : matches.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-primary-gold/40">
                    <LuSwords size={28} />
                    <span className="text-sm">Nenhuma partida cadastrada ainda</span>
                    <span className="text-xs text-center max-w-[240px]">{teams.length < 2 ? "Cadastre pelo menos 2 times na aba Times primeiro." : "Use o formulário abaixo para criar as partidas."}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {matches.map((match) => {
                      const teamA = teamById(match.teamAId);
                      const teamB = teamById(match.teamBId);
                      return (
                        <div key={match.id} className="flex items-center gap-3 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30">
                          {/* Team A */}
                          <div className="flex items-center gap-2 flex-1">
                            {teamA?.image && <img src={teamA.image} alt={teamA.name} className="w-7 h-7 rounded object-cover border border-primary-gold/10" />}
                            <span className="text-sm text-primary-gold/90 font-medium">{teamA?.name ?? "?"}</span>
                          </div>
                          <span className="text-xs text-primary-gold/40 font-bold shrink-0">vs</span>
                          {/* Team B */}
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="text-sm text-primary-gold/90 font-medium">{teamB?.name ?? "?"}</span>
                            {teamB?.image && <img src={teamB.image} alt={teamB.name} className="w-7 h-7 rounded object-cover border border-primary-gold/10" />}
                          </div>
                          {match.date && (
                            <span className="text-[10px] text-primary-gold/30 shrink-0 bg-primary-gold/5 px-1.5 py-0.5 rounded border border-primary-gold/10">{match.date}</span>
                          )}
                          <Tooltip content="Remover partida" direction="left">
                            <button onClick={() => handleDeleteMatch(match)} className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer shrink-0">
                              <LuTrash size={13} />
                            </button>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add match form */}
                {teams.length < 2 ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-primary-gold/40 text-sm text-center border border-dashed border-primary-gold/10 rounded-xl">
                    <LuShield size={20} />
                    <span>Cadastre pelo menos 2 times na aba <strong className="text-primary-gold/60">Times</strong> antes de criar partidas.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-4 rounded-xl border border-primary-gold/10 bg-primary-black/20">
                    <span className="text-xs font-semibold text-primary-gold/50 uppercase tracking-wider flex items-center gap-1.5">
                      <LuPlus size={12} /> Adicionar partida
                    </span>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <span className="text-xs text-primary-gold/60 mb-1 block">Time A</span>
                          <select
                            className={selectClass}
                            value={matchForm.teamAId}
                            onChange={(e) => setMatchForm((p) => ({ ...p, teamAId: e.target.value }))}
                          >
                            <option value="">Selecionar time</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <span className="text-primary-gold/40 font-bold pt-5">vs</span>
                        <div className="flex-1">
                          <span className="text-xs text-primary-gold/60 mb-1 block">Time B</span>
                          <select
                            className={selectClass}
                            value={matchForm.teamBId}
                            onChange={(e) => setMatchForm((p) => ({ ...p, teamBId: e.target.value }))}
                          >
                            <option value="">Selecionar time</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Preview dos times selecionados */}
                      {(selectedTeamA || selectedTeamB) && (
                        <div className="flex items-center justify-center gap-3 py-2 rounded-lg bg-primary-gold/5 border border-primary-gold/10">
                          <div className="flex items-center gap-2">
                            {selectedTeamA?.image && <FlagPreview url={selectedTeamA.image} name={selectedTeamA.name} size={6} />}
                            <span className="text-xs text-primary-gold/70 font-medium">{selectedTeamA?.name ?? "—"}</span>
                          </div>
                          <span className="text-primary-gold/30 text-xs font-bold">vs</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-primary-gold/70 font-medium">{selectedTeamB?.name ?? "—"}</span>
                            {selectedTeamB?.image && <FlagPreview url={selectedTeamB.image} name={selectedTeamB.name} size={6} />}
                          </div>
                        </div>
                      )}

                      <div className="flex items-end gap-3 pt-4">
                        <Input
                          label="Data (opcional)"
                          placeholder="Data (ex: 14/06)"
                          value={matchForm.date}
                          setValue={(e) => setMatchForm((p) => ({ ...p, date: e.target.value }))}
                          width="!w-[140px]"
                        />
                        <Button onClick={handleAddMatch}>{matchSaving ? <Loader /> : "Adicionar"}</Button>
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
                  Palpites enviados pelos participantes. Ao excluir o palpite de alguém, essa pessoa poderá enviar um novo.
                </TabHint>

                {participantsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader /></div>
                ) : participants.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-primary-gold/40 text-center">
                    <LuTrophy size={28} />
                    <span className="text-sm">Nenhum palpite enviado ainda.</span>
                    <span className="text-xs max-w-[240px]">Os palpites aparecem aqui assim que os participantes enviarem pela página do evento.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Summary */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-primary-gold/50 flex items-center gap-1.5">
                        <LuUsers size={12} /> {participants.length} participante{participants.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-primary-gold/30">{matches.length} partida{matches.length !== 1 ? "s" : ""} no bolão</span>
                    </div>

                    {participants.map((participant, index) => (
                      <div key={participant.id} className="flex flex-col gap-2 p-3 rounded-xl border border-primary-gold/10 bg-primary-black/30">
                        {/* Participant header */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-primary-gold/30 font-mono w-5 text-right shrink-0">{index + 1}.</span>
                          <span className="text-sm font-semibold text-primary-gold flex-1">{participant.name}</span>
                          <Tooltip content={`Excluir palpite de ${participant.name}`} direction="left">
                            <button
                              onClick={() => handleDeleteParticipant(participant)}
                              className="p-1 rounded-md hover:bg-invalid-color/10 text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                            >
                              <LuTrash size={12} />
                            </button>
                          </Tooltip>
                        </div>

                        {/* Predictions per match */}
                        <div className="flex flex-col gap-1 pl-7">
                          {matches.map((match) => {
                            const teamA = teams.find((t) => t.id === match.teamAId);
                            const teamB = teams.find((t) => t.id === match.teamBId);
                            const pred = participant.predictions?.[match.id];
                            return (
                              <div key={match.id} className="flex items-center gap-2 text-xs text-primary-gold/70">
                                <div className="flex items-center gap-1 flex-1 justify-end">
                                  {teamA?.image && <img src={teamA.image} alt={teamA.name} className="w-4 h-4 rounded object-cover" />}
                                  <span>{teamA?.name ?? "?"}</span>
                                </div>
                                <span className="shrink-0 font-bold text-primary-gold px-2 py-0.5 bg-primary-gold/10 rounded border border-primary-gold/20">
                                  {pred?.scoreA ?? "-"} × {pred?.scoreB ?? "-"}
                                </span>
                                <div className="flex items-center gap-1 flex-1">
                                  <span>{teamB?.name ?? "?"}</span>
                                  {teamB?.image && <img src={teamB.image} alt={teamB.name} className="w-4 h-4 rounded object-cover" />}
                                </div>
                              </div>
                            );
                          })}
                          {matches.length === 0 && (
                            <span className="text-xs text-primary-gold/30 italic">Sem partidas cadastradas</span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Delete all */}
                    <button
                      onClick={handleDeleteAllParticipants}
                      className="flex items-center gap-2 text-primary-gold/30 hover:text-invalid-color border border-primary-gold/10 hover:border-invalid-color/30 rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all duration-200 mt-1"
                    >
                      <LuTrash size={13} className="shrink-0" />
                      <span className="italic">Excluir todos os palpites</span>
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </Modal>
    </section>
  );
}
