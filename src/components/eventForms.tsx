"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as LucideIcons from "lucide-react";
import {
  LuCalendarDays,
  LuSearch,
  LuToggleLeft,
  LuToggleRight,
  LuTrash,
  LuX,
} from "react-icons/lu";
import { EventItemType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import EventRepository from "@/services/repositories/EventRepository";
import { getLucideIcon, normalizeIconName } from "@/utils/utilFunctions";

interface EventFormsProps {
  currentEvent: EventItemType;
  setCurrentEvent: React.Dispatch<React.SetStateAction<EventItemType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

const labelClass =
  "text-[11px] text-primary-gold/50 uppercase tracking-wider font-semibold";
const inputClass =
  "w-full bg-primary-black/50 border border-primary-gold/20 rounded-lg px-3 py-2.5 text-sm text-primary-gold placeholder-primary-gold/25 outline-none focus:border-primary-gold/50 transition-all";

export default function EventForms({
  currentEvent,
  setCurrentEvent,
  formType,
  closeForms,
}: EventFormsProps) {
  const [loading, setLoading] = useState(false);
  const [localItem, setLocalItem] = useState<EventItemType>(currentEvent);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Icon autocomplete (inline, estilizado para combinar com o card)
  const [iconOpen, setIconOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const IconPreview = getLucideIcon(localItem.icon || "");

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentEvent);
    setConfirmingDelete(false);
  }, [currentEvent]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (iconRef.current && !iconRef.current.contains(e.target as Node)) {
        setIconOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Excluir exige um segundo clique; volta ao normal depois de alguns segundos
  useEffect(() => {
    if (!confirmingDelete) return;
    const t = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmingDelete]);

  const iconMatches = useMemo(() => {
    if (!localItem.icon) return [];
    const normalized = normalizeIconName(localItem.icon).toLowerCase();
    return Object.keys(LucideIcons)
      .filter((name) => name.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [localItem.icon]);

  const isValid = (event: EventItemType) =>
    event.name.trim() !== "" && event.description.trim() !== "";

  const handleCreate = async () => {
    if (!isValid(localItem)) {
      addAlert("Preencha nome e descrição.");
      return;
    }
    setLoading(true);
    try {
      await EventRepository.create({
        name: localItem.name,
        description: localItem.description,
        icon: normalizeIconName(localItem.icon),
        subtype: localItem.subtype,
        isActive: localItem.isActive,
        ...(localItem.subtype === "quiz" && {
          quizStatus: "waiting",
          quizPrize: localItem.quizPrize,
        }),
      });
      addAlert(`Evento "${localItem.name}" criado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao criar evento: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!isValid(localItem) || !localItem.id) {
      addAlert("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      await EventRepository.update(localItem.id, {
        name: localItem.name,
        description: localItem.description,
        icon: normalizeIconName(localItem.icon),
        subtype: localItem.subtype,
        isActive: localItem.isActive,
        ...(localItem.subtype === "quiz" && {
          quizPrize: localItem.quizPrize,
          // Evento convertido para quiz (ou criado antes desse campo existir)
          // precisa do status inicial, senão os controles de iniciar não aparecem
          ...(localItem.quizStatus === undefined && {
            quizStatus: "waiting" as const,
          }),
        }),
      });
      setCurrentEvent(localItem);
      addAlert(`Evento "${localItem.name}" atualizado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao editar evento: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentEvent.id) {
      addAlert("ID inválido.");
      return;
    }
    setLoading(true);
    try {
      await EventRepository.delete(currentEvent.id);
      addAlert(`Evento "${currentEvent.name}" deletado com sucesso!`);
      closeForms();
    } catch (error) {
      addAlert(`Erro ao deletar evento: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[92vw] h-full sm:h-auto max-w-none sm:max-w-[440px] max-h-full sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-primary-gold/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center shrink-0">
            {IconPreview ? (
              <IconPreview size={18} className="text-primary-gold" />
            ) : (
              <LuCalendarDays size={18} className="text-primary-gold/40" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-primary-gold truncate">
              {localItem.name || "Novo Evento"}
            </span>
            <span className="text-[11px] text-primary-gold/40">
              {formType === "edit" ? "Editar evento" : "Criar novo evento"}
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
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Nome */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Nome <span className="text-primary-gold/80">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Quiz da Copa"
            value={localItem.name}
            onChange={(e) =>
              setLocalItem({ ...localItem, name: e.target.value })
            }
            className={inputClass}
          />
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Descrição <span className="text-primary-gold/80">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="Descrição curta do evento"
            value={localItem.description}
            onChange={(e) =>
              setLocalItem({ ...localItem, description: e.target.value })
            }
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Tipo do evento */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Tipo do evento</label>
          <div className="grid grid-cols-2 gap-2">
            {(["bolao", "quiz"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLocalItem({ ...localItem, subtype: opt })}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                  localItem.subtype === opt
                    ? "bg-primary-gold/10 border-primary-gold/50 text-primary-gold font-medium"
                    : "border-primary-gold/15 text-primary-gold/40 hover:border-primary-gold/30 hover:text-primary-gold/70"
                }`}
              >
                <span>{opt === "bolao" ? "⚽" : "🧠"}</span>
                <span>{opt === "bolao" ? "Bolão" : "Quiz"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prêmio (quiz) */}
        {localItem.subtype === "quiz" && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              🏆 Prêmio do quiz{" "}
              <span className="text-primary-gold/30 normal-case font-normal">
                (opcional)
              </span>
            </label>
            <input
              type="text"
              placeholder="Ex: Uma rodada de drinks"
              value={localItem.quizPrize ?? ""}
              onChange={(e) =>
                setLocalItem({ ...localItem, quizPrize: e.target.value })
              }
              className={inputClass}
            />
          </div>
        )}

        {/* Ícone */}
        <div className="flex flex-col gap-1.5" ref={iconRef}>
          <label className={labelClass}>
            Ícone{" "}
            <span className="text-primary-gold/30 normal-case font-normal">
              (
              <a
                href="https://lucide.dev/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary-gold/60 transition-colors"
              >
                ver biblioteca
              </a>
              )
            </span>
          </label>
          <div className="relative">
            <LuSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-gold/35 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar ícone... Ex: Trophy"
              value={localItem.icon}
              onChange={(e) => {
                setLocalItem({ ...localItem, icon: e.target.value });
                setIconOpen(true);
              }}
              onFocus={() => setIconOpen(true)}
              className={`${inputClass} !pl-8`}
            />
            {iconOpen && localItem.icon && iconMatches.length > 0 && (
              <div className="absolute top-full mt-1.5 w-full max-h-52 overflow-y-auto rounded-xl border border-primary-gold/20 bg-[#111008] shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50">
                {iconMatches.map((name) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const Icon = (LucideIcons as any)[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setLocalItem({ ...localItem, icon: name });
                        setIconOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-primary-gold/60 hover:bg-primary-gold/5 hover:text-primary-gold transition-all cursor-pointer text-left"
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {localItem.icon && !IconPreview && (
            <span className="text-xs text-invalid-color/80">
              Ícone inválido — escolha um da lista
            </span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-primary-gold/15 bg-primary-black/30">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-primary-gold/80">Evento ativo</span>
            <span className="text-[11px] text-primary-gold/35">
              {localItem.isActive
                ? "Visível para os clientes"
                : "Oculto dos clientes"}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setLocalItem({ ...localItem, isActive: !localItem.isActive })
            }
            className="cursor-pointer transition-colors shrink-0"
          >
            {localItem.isActive ? (
              <LuToggleRight size={28} className="text-green-500" />
            ) : (
              <LuToggleLeft size={28} className="text-primary-gold/30" />
            )}
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-primary-gold/10 shrink-0">
        {formType === "edit" && (
          <button
            onClick={() => {
              if (confirmingDelete) handleDelete();
              else setConfirmingDelete(true);
            }}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer disabled:opacity-40 ${
              confirmingDelete
                ? "bg-invalid-color/15 border-invalid-color/50 text-invalid-color"
                : "border-primary-gold/15 text-primary-gold/40 hover:border-invalid-color/40 hover:text-invalid-color"
            }`}
          >
            <LuTrash size={13} />
            {confirmingDelete ? "Confirmar exclusão?" : "Excluir"}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={closeForms}
          disabled={loading}
          className="px-3.5 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          onClick={formType === "edit" ? handleEdit : handleCreate}
          disabled={loading || !isValid(localItem)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader />
          ) : formType === "edit" ? (
            "Salvar alterações"
          ) : (
            "Criar evento"
          )}
        </button>
      </div>
    </div>
  );
}
