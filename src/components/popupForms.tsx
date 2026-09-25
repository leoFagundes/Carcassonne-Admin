"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LuTriangleAlert,
  LuCalendarClock,
  LuChevronLeft,
  LuClock,
  LuExpand,
  LuImage,
  LuPencil,
  LuPlus,
  LuToggleLeft,
  LuToggleRight,
  LuTrash,
  LuX,
} from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import LoaderFullscreen from "./loaderFullscreen";
import Loader from "./loader";
import InputImage from "./inputImage";
import Tooltip from "./Tooltip";
import {
  deleteImageFromFirebase,
  getPathFromFirebaseUrl,
  uploadImageToFirebase,
} from "@/services/repositories/FirebaseImageUtils";
import PopupRepository from "@/services/repositories/PopupRepository";
import { patternPopup } from "@/utils/patternValues";
import { PopupScheduleType, PopupType } from "@/types";
import {
  WEEKDAY_LABELS,
  findConflicts,
  formatScheduleSummary,
  popupsConflict,
} from "@/utils/popupSchedule";

interface PopupFormsProps {
  closeForms: VoidFunction;
}

type ViewMode = "list" | "form";

const labelClass =
  "text-[11px] text-primary-gold/50 uppercase tracking-wider font-semibold";
const inputClass =
  "w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2.5 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all";

function newSchedule(): PopupScheduleType {
  return {
    id: crypto.randomUUID(),
    days: [],
    startTime: "18:00",
    endTime: "22:00",
  };
}

function popupDisplayName(popup: PopupType): string {
  return popup.label?.trim() || popup.title?.trim() || "popup sem nome";
}

export default function PopupForms({ closeForms }: PopupFormsProps) {
  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [popups, setPopups] = useState<(PopupType & { id: string })[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeletePopup, setConfirmDeletePopup] = useState<
    (PopupType & { id: string }) | null
  >(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formPopup, setFormPopup] = useState<PopupType>(patternPopup);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

  const { addAlert } = useAlert();

  const fetchPopups = async () => {
    setLoading(true);
    try {
      setPopups(await PopupRepository.getAll());
    } catch (error) {
      addAlert(`Erro ao carregar popups: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  const conflictsById = useMemo(() => findConflicts(popups), [popups]);

  // Conflitos do rascunho atual (ainda não salvo) contra os popups já
  // existentes — mostra o aviso antes mesmo de salvar.
  const draftConflicts = useMemo(() => {
    if (!formPopup.isActive) return [];
    return popups.filter(
      (p) => p.id !== editingId && popupsConflict(formPopup, p),
    );
  }, [formPopup, popups, editingId]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormPopup(patternPopup);
    setImageFile(null);
    setConfirmDeletePopup(null);
    setView("form");
  };

  const openEditForm = (popup: PopupType & { id: string }) => {
    setEditingId(popup.id);
    setFormPopup(popup);
    setImageFile(null);
    setConfirmDeletePopup(null);
    setView("form");
  };

  const backToList = () => {
    setView("list");
    setEditingId(null);
    setFormPopup(patternPopup);
    setImageFile(null);
    setConfirmDeletePopup(null);
  };

  // ── horários ──

  const addSchedule = () => {
    setFormPopup((p) => ({ ...p, schedules: [...p.schedules, newSchedule()] }));
  };

  const removeSchedule = (id: string) => {
    setFormPopup((p) => ({
      ...p,
      schedules: p.schedules.filter((s) => s.id !== id),
    }));
  };

  const updateSchedule = (id: string, patch: Partial<PopupScheduleType>) => {
    setFormPopup((p) => ({
      ...p,
      schedules: p.schedules.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const toggleScheduleDay = (id: string, day: number) => {
    setFormPopup((p) => ({
      ...p,
      schedules: p.schedules.map((s) =>
        s.id === id
          ? {
              ...s,
              days: s.days.includes(day)
                ? s.days.filter((d) => d !== day)
                : [...s.days, day].sort((a, b) => a - b),
            }
          : s,
      ),
    }));
  };

  // ── salvar / excluir / ativar ──

  const handleSave = async () => {
    if (!formPopup.src && !imageFile) {
      addAlert("Adicione uma imagem antes de continuar.");
      return;
    }
    if (formPopup.schedules.some((s) => s.days.length === 0)) {
      addAlert(
        "Selecione ao menos um dia da semana em cada horário adicionado (ou remova o horário).",
      );
      return;
    }

    setSaving(true);
    try {
      let imageUrl = formPopup.src || "";
      if (imageFile) {
        const { url } = await uploadImageToFirebase(imageFile, "popups");
        imageUrl = url;
        if (editingId && formPopup.src) {
          const oldPath = getPathFromFirebaseUrl(formPopup.src);
          if (oldPath) await deleteImageFromFirebase(oldPath);
        }
      }

      const dataToSave: Omit<PopupType, "id" | "createdAt"> = {
        src: imageUrl,
        label: formPopup.label?.trim() || "",
        title: formPopup.title?.trim() || "",
        description: formPopup.description?.trim() || "",
        isActive: formPopup.isActive,
        schedules: formPopup.schedules,
      };

      if (editingId) {
        await PopupRepository.update(editingId, dataToSave);
        addAlert("Popup atualizado com sucesso!");
      } else {
        await PopupRepository.create(dataToSave);
        addAlert("Popup criado com sucesso!");
      }
      await fetchPopups();
      backToList();
    } catch (error) {
      console.error(error);
      addAlert(`Erro ao salvar popup: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (popup: PopupType & { id: string }) => {
    setSaving(true);
    try {
      if (popup.src) {
        const path = getPathFromFirebaseUrl(popup.src);
        if (path) await deleteImageFromFirebase(path);
      }
      await PopupRepository.delete(popup.id);
      setPopups((prev) => prev.filter((p) => p.id !== popup.id));
      addAlert("Popup excluído.");
      if (view === "form" && editingId === popup.id) backToList();
    } catch (error) {
      addAlert("Erro ao excluir popup.");
      console.error(error);
    } finally {
      setSaving(false);
      setConfirmDeletePopup(null);
    }
  };

  const handleToggleActive = async (popup: PopupType & { id: string }) => {
    try {
      await PopupRepository.update(popup.id, { isActive: !popup.isActive });
      setPopups((prev) =>
        prev.map((p) =>
          p.id === popup.id ? { ...p, isActive: !p.isActive } : p,
        ),
      );
    } catch {
      addAlert("Erro ao atualizar status do popup.");
    }
  };

  return (
    <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[94vw] h-full sm:h-auto max-w-none sm:max-w-[560px] max-h-full sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-primary-gold/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {view === "form" && (
            <button
              onClick={backToList}
              className="p-2 -ml-1 rounded-lg hover:bg-primary-gold/10 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer shrink-0"
            >
              <LuChevronLeft size={18} />
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center shrink-0 text-primary-gold">
            <LuImage size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-primary-gold truncate">
              {view === "list"
                ? "Popups"
                : editingId
                  ? "Editar popup"
                  : "Novo popup"}
            </span>
            <span className="text-[11px] text-primary-gold/40 truncate">
              {view === "list"
                ? `${popups.length} popup${popups.length !== 1 ? "s" : ""} cadastrado${popups.length !== 1 ? "s" : ""}`
                : "Imagem, texto e agendamento"}
            </span>
          </div>
        </div>
        <button
          onClick={closeForms}
          className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer shrink-0"
        >
          <LuX size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4 relative">
        {loading && <LoaderFullscreen />}

        {view === "list" ? (
          <>
            <button
              onClick={openCreateForm}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-sm font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer"
            >
              <LuPlus size={14} /> Novo popup
            </button>

            {popups.length === 0 && !loading ? (
              <div className="flex flex-col items-center gap-2 py-10 text-primary-gold/40 text-center">
                <LuImage size={28} />
                <span className="text-sm">Nenhum popup cadastrado ainda.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {popups.map((popup) => {
                  const conflicts = conflictsById.get(popup.id) ?? [];
                  return (
                    <div
                      key={popup.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        popup.isActive
                          ? "border-primary-gold/30 bg-primary-gold/5"
                          : "border-primary-gold/10 bg-primary-black/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => popup.src && setFullscreenSrc(popup.src)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border border-primary-gold/10 bg-primary-black/50 shrink-0 cursor-zoom-in"
                      >
                        {popup.src && (
                          <>
                            <img
                              src={popup.src}
                              alt={popupDisplayName(popup)}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-md bg-primary-black/70 text-primary-gold flex items-center justify-center">
                              <LuExpand size={8} />
                            </span>
                          </>
                        )}
                      </button>
                      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                        <span className="text-sm font-medium text-primary-gold/90 truncate">
                          {popupDisplayName(popup)}
                        </span>
                        <span className="text-[11px] text-primary-gold/40 truncate">
                          {popup.schedules.length === 0
                            ? "Sempre ativo"
                            : popup.schedules
                                .map(formatScheduleSummary)
                                .join(" · ")}
                        </span>
                        {conflicts.length > 0 && (
                          <Tooltip
                            textWrap
                            direction="bottom"
                            content={`Conflita com: ${conflicts
                              .map((id) => {
                                const other = popups.find((p) => p.id === id);
                                return other
                                  ? popupDisplayName(other)
                                  : "popup";
                              })
                              .join(", ")}`}
                          >
                            <span className="flex items-center gap-1 text-[11px] text-yellow-500 cursor-default w-fit">
                              <LuTriangleAlert size={11} /> Conflito de horário
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      <Tooltip
                        content={popup.isActive ? "Desativar" : "Ativar"}
                      >
                        <button
                          onClick={() => handleToggleActive(popup)}
                          className="p-1.5 rounded-md hover:bg-primary-gold/10 transition-all cursor-pointer shrink-0"
                        >
                          {popup.isActive ? (
                            <LuToggleRight
                              size={20}
                              className="text-green-500"
                            />
                          ) : (
                            <LuToggleLeft
                              size={20}
                              className="text-primary-gold/30"
                            />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content="Editar">
                        <button
                          onClick={() => openEditForm(popup)}
                          className="p-1.5 rounded-md hover:bg-primary-gold/10 text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer shrink-0"
                        >
                          <LuPencil size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Excluir">
                        <button
                          onClick={() => setConfirmDeletePopup(popup)}
                          className="p-1.5 rounded-md hover:bg-invalid-color/10 text-primary-gold/40 hover:text-invalid-color transition-all cursor-pointer shrink-0"
                        >
                          <LuTrash size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2">
              <InputImage
                onChange={(file, previewUrl) => {
                  if (file) {
                    setImageFile(file);
                    setFormPopup((p) => ({ ...p, src: previewUrl ?? "" }));
                  }
                }}
                onCloseImage={() => {
                  setImageFile(null);
                  setFormPopup((p) => ({ ...p, src: "" }));
                }}
                width="!min-w-[200px] !min-h-[200px]"
                previewUrl={formPopup.src}
              />
              {formPopup.src && (
                <button
                  type="button"
                  onClick={() => setFullscreenSrc(formPopup.src)}
                  className="flex items-center gap-1.5 text-xs text-primary-gold/40 hover:text-primary-gold transition-all cursor-pointer"
                >
                  <LuExpand size={12} /> Ver em tela cheia
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Nome interno{" "}
                <span className="text-primary-gold/30 normal-case font-normal">
                  (opcional — só pra você identificar aqui no admin, o cliente
                  nunca vê)
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: Promoção terça de bar"
                value={formPopup.label ?? ""}
                onChange={(e) =>
                  setFormPopup((p) => ({ ...p, label: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Título{" "}
                <span className="text-primary-gold/30 normal-case font-normal">
                  (opcional — aparece pro cliente, abaixo da imagem)
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: Happy Hour todo dia!"
                value={formPopup.title ?? ""}
                onChange={(e) =>
                  setFormPopup((p) => ({ ...p, title: e.target.value }))
                }
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>
                Descrição{" "}
                <span className="text-primary-gold/30 normal-case font-normal">
                  (opcional — aparece pro cliente, abaixo do título)
                </span>
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Chopp em dobro das 18h às 20h"
                value={formPopup.description ?? ""}
                onChange={(e) =>
                  setFormPopup((p) => ({ ...p, description: e.target.value }))
                }
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Status */}
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-primary-gold/15 bg-primary-black/30">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-primary-gold/80">
                  Popup ativo
                </span>
                <span className="text-[11px] text-primary-gold/35">
                  {formPopup.isActive
                    ? "Pode aparecer pros clientes"
                    : "Nunca aparece, mesmo dentro do horário"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormPopup((p) => ({ ...p, isActive: !p.isActive }))
                }
                className="cursor-pointer transition-colors shrink-0"
              >
                {formPopup.isActive ? (
                  <LuToggleRight size={28} className="text-green-500" />
                ) : (
                  <LuToggleLeft size={28} className="text-primary-gold/30" />
                )}
              </button>
            </div>

            {/* Agendamento */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`${labelClass} flex items-center gap-1.5`}>
                  <LuCalendarClock size={12} /> Agendamento
                </span>
                <button
                  type="button"
                  onClick={addSchedule}
                  className="flex items-center gap-1 text-xs text-primary-gold/50 hover:text-primary-gold transition-all cursor-pointer"
                >
                  <LuPlus size={12} /> Adicionar horário
                </button>
              </div>

              {formPopup.schedules.length === 0 ? (
                <div className="px-3.5 py-3 rounded-lg border border-dashed border-primary-gold/15 text-xs text-primary-gold/40">
                  Sem horários definidos — esse popup fica ativo o dia inteiro,
                  todos os dias (enquanto &quot;Popup ativo&quot; estiver
                  ligado).
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {formPopup.schedules.map((schedule, idx) => (
                    <div
                      key={schedule.id}
                      className="flex flex-col gap-2.5 p-3 rounded-lg border border-primary-gold/15 bg-primary-black/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-primary-gold/40 font-medium">
                          Horário {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSchedule(schedule.id)}
                          className="text-primary-gold/30 hover:text-invalid-color transition-all cursor-pointer"
                        >
                          <LuX size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {WEEKDAY_LABELS.map((label, day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleScheduleDay(schedule.id, day)}
                            className={`w-9 h-9 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                              schedule.days.includes(day)
                                ? "bg-primary-gold/20 border-primary-gold/50 text-primary-gold"
                                : "border-primary-gold/15 text-primary-gold/35 hover:border-primary-gold/30"
                            }`}
                          >
                            {label[0]}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">
                            Das
                          </span>
                          <input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) =>
                              updateSchedule(schedule.id, {
                                startTime: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                        <span className="text-primary-gold/30 mt-4">→</span>
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="text-[10px] text-primary-gold/40 uppercase tracking-wider">
                            Até
                          </span>
                          <input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) =>
                              updateSchedule(schedule.id, {
                                endTime: e.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                      {schedule.endTime <= schedule.startTime && (
                        <span className="text-[10px] text-primary-gold/35 flex items-center gap-1">
                          <LuClock size={10} /> Atravessa a meia-noite — termina
                          no dia seguinte
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aviso de conflito */}
            {draftConflicts.length > 0 && (
              <div className="flex items-start gap-2 px-3.5 py-3 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-xs text-yellow-400">
                <LuTriangleAlert size={14} className="shrink-0 mt-0.5" />
                <span>
                  Esse horário conflita com{" "}
                  {draftConflicts
                    .map((p) => `"${popupDisplayName(p)}"`)
                    .join(", ")}
                  . Nos horários sobrepostos, o cliente só vai ver um dos dois.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      {view === "form" && (
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-primary-gold/10 shrink-0">
          {editingId && (
            <button
              onClick={() => {
                const popup = popups.find((p) => p.id === editingId);
                if (popup) setConfirmDeletePopup(popup);
              }}
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:border-invalid-color/40 hover:text-invalid-color text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
            >
              <LuTrash size={13} />
              Excluir
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={backToList}
            disabled={saving}
            className="px-3.5 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader />
            ) : editingId ? (
              "Salvar alterações"
            ) : (
              "Criar popup"
            )}
          </button>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão ── */}
      {confirmDeletePopup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setConfirmDeletePopup(null)}
        >
          <div
            className="bg-secondary-black border border-primary-gold/20 rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-invalid-color/10 border border-invalid-color/20 flex items-center justify-center shrink-0">
                  <LuTrash size={15} className="text-invalid-color" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-primary-gold">
                    Excluir popup
                  </span>
                  <p className="text-sm text-primary-gold/60">
                    Excluir &quot;{popupDisplayName(confirmDeletePopup)}&quot;?
                    A imagem e o agendamento serão apagados e isso não pode
                    ser desfeito.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDeletePopup(null)}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm rounded-lg border border-primary-gold/20 text-primary-gold/50 hover:text-primary-gold hover:border-primary-gold/40 transition-all cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDeletePopup)}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg border border-invalid-color/40 text-invalid-color bg-invalid-color/10 hover:bg-invalid-color/20 transition-all cursor-pointer disabled:opacity-40"
                >
                  {saving ? <Loader /> : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Imagem em tela cheia ── */}
      {fullscreenSrc && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFullscreenSrc(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenSrc(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary-black/70 border border-primary-gold/20 text-primary-gold flex items-center justify-center cursor-pointer"
          >
            <LuX size={18} />
          </button>
          <img
            src={fullscreenSrc}
            alt="Popup em tela cheia"
            className="max-w-[94vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
