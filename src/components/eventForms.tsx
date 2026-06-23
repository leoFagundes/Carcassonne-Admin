"use client";

import React, { useEffect, useRef, useState } from "react";
import { LuSignature, LuText, LuToggleLeft, LuToggleRight, LuChevronDown, LuCheck } from "react-icons/lu";
import Button from "./button";
import Input from "./input";
import { EventItemType } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "./loader";
import Tooltip from "./Tooltip";
import EventRepository from "@/services/repositories/EventRepository";
import { getLucideIcon, normalizeIconName } from "@/utils/utilFunctions";
import IconAutocomplete from "./IconAutoComplete";

interface EventFormsProps {
  currentEvent: EventItemType;
  setCurrentEvent: React.Dispatch<React.SetStateAction<EventItemType>>;
  formType: "edit" | "add";
  closeForms: VoidFunction;
}

export default function EventForms({
  currentEvent,
  setCurrentEvent,
  formType,
  closeForms,
}: EventFormsProps) {
  const [loading, setLoading] = useState(false);
  const [localItem, setLocalItem] = useState<EventItemType>(currentEvent);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const subtypeRef = useRef<HTMLDivElement>(null);
  const IconPreview = getLucideIcon(localItem.icon || "");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subtypeRef.current && !subtypeRef.current.contains(e.target as Node)) {
        setSubtypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { addAlert } = useAlert();

  useEffect(() => {
    setLocalItem(currentEvent);
  }, [currentEvent]);

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
    <>
      <div className="w-full text-center">
        <h1 className="text-xl sm:text-2xl text-gradient-gold">
          {localItem.name ? localItem.name : "Novo Evento"}
        </h1>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent mt-2" />
      </div>

      <div className="flex flex-wrap justify-center py-4 text-primary-gold gap-6 overflow-y-auto px-2 flex-1 min-h-0 w-full">
        <div className="flex flex-col gap-6">
          <Input
            label="Nome"
            placeholder="Ex: Quiz da Copa"
            value={localItem.name}
            setValue={(e) => setLocalItem({ ...localItem, name: e.target.value })}
            variant
            icon={<LuSignature size={20} />}
            width="!w-[250px]"
          />
          <Input
            label="Descrição"
            placeholder="Descrição do evento"
            value={localItem.description}
            setValue={(e) => setLocalItem({ ...localItem, description: e.target.value })}
            variant
            icon={<LuText size={20} />}
            width="!w-[250px]"
          />

          {/* Tipo do evento */}
          <div className="flex flex-col gap-1 w-[250px]" ref={subtypeRef}>
            <span className="text-xs text-primary-gold/60 uppercase tracking-wider">
              Tipo do evento
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSubtypeOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all cursor-pointer ${
                  subtypeOpen
                    ? "border-primary-gold/50 bg-primary-black/50"
                    : "border-primary-gold/20 bg-primary-black/30 hover:border-primary-gold/40"
                } text-primary-gold`}
              >
                <span className="flex items-center gap-2">
                  <span>{localItem.subtype === "bolao" ? "⚽" : "🧠"}</span>
                  <span>{localItem.subtype === "bolao" ? "Bolão" : "Quiz"}</span>
                </span>
                <LuChevronDown
                  size={14}
                  className={`text-primary-gold/40 transition-transform duration-200 ${subtypeOpen ? "rotate-180" : ""}`}
                />
              </button>

              {subtypeOpen && (
                <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-primary-gold/20 bg-[#111008] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                  {(["bolao", "quiz"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setLocalItem({ ...localItem, subtype: opt });
                        setSubtypeOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-all cursor-pointer ${
                        localItem.subtype === opt
                          ? "bg-primary-gold/10 text-primary-gold"
                          : "text-primary-gold/60 hover:bg-primary-gold/5 hover:text-primary-gold"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{opt === "bolao" ? "⚽" : "🧠"}</span>
                        <span>{opt === "bolao" ? "Bolão" : "Quiz"}</span>
                      </span>
                      {localItem.subtype === opt && (
                        <LuCheck size={13} className="text-primary-gold shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quiz prize */}
          {localItem.subtype === "quiz" && (
            <div className="flex flex-col gap-1 w-[250px]">
              <span className="text-xs text-primary-gold/60 uppercase tracking-wider flex items-center gap-1.5">
                🏆 Prêmio do quiz
                <span className="text-primary-gold/30 normal-case font-normal">(opcional)</span>
              </span>
              <input
                type="text"
                placeholder="Ex: Uma rodada de drinks"
                value={localItem.quizPrize ?? ""}
                onChange={(e) =>
                  setLocalItem({ ...localItem, quizPrize: e.target.value })
                }
                className="outline-none text-primary-gold bg-primary-black/30 py-2 px-3 rounded-lg text-sm border border-primary-gold/20 focus:border-primary-gold/50 transition-all w-full"
              />
            </div>
          )}

          {/* Ícone */}
          <div className="flex flex-col gap-2 w-[250px]">
            <IconAutocomplete
              value={localItem.icon}
              onChange={(value) => setLocalItem({ ...localItem, icon: value })}
            />
            <div className="flex items-center gap-2 min-h-[24px]">
              {IconPreview ? (
                <>
                  <IconPreview size={20} />
                  <span className="text-xs text-gray-400">
                    {normalizeIconName(localItem.icon)}
                  </span>
                </>
              ) : localItem.icon ? (
                <span className="text-red-400 text-xs">Ícone inválido</span>
              ) : null}
              <div className="flex flex-col gap-1 justify-center items-center w-full">
                <a
                  href="https://lucide.dev/icons/"
                  target="_blank"
                  className="text-xs underline text-blue-400 text-center"
                >
                  Ver biblioteca completa
                </a>
              </div>
            </div>
          </div>

          {/* Ativo/Inativo */}
          <div className="flex items-center justify-between w-[250px] px-3 py-2.5 rounded-lg border border-primary-gold/20 bg-primary-black/30">
            <span className="text-sm text-primary-gold/80">Evento ativo</span>
            <button
              onClick={() => setLocalItem({ ...localItem, isActive: !localItem.isActive })}
              className="text-primary-gold cursor-pointer transition-colors"
            >
              {localItem.isActive ? (
                <LuToggleRight size={28} className="text-green-500" />
              ) : (
                <LuToggleLeft size={28} className="text-primary-gold/30" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-primary-gold/10 w-full justify-center">
        {formType === "edit" && (
          <Tooltip content="Cuidado, essa ação é irreversível.">
            <Button onClick={handleDelete} isHoverInvalid>
              Excluir
            </Button>
          </Tooltip>
        )}
        <Button onClick={formType === "edit" ? handleEdit : handleCreate}>
          {loading ? <Loader /> : formType === "edit" ? "Salvar" : "Criar"}
        </Button>
      </div>
    </>
  );
}
