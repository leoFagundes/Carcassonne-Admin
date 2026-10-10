"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FaArrowUp, FaInfoCircle, FaMusic, FaSearch, FaStar } from "react-icons/fa";
import Tooltip from "./Tooltip";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import EventRepository from "@/services/repositories/EventRepository";
import { EventItemType } from "@/types";
import { getLucideIcon } from "@/utils/utilFunctions";
import { LuTrophy } from "react-icons/lu";

function FloatingButton({
  onClick,
  tooltip,
  children,
  isHidden,
  accent,
  pulse,
}: {
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
  isHidden?: boolean;
  /** Ação principal da página (ex: busca do cardápio), em dourado. */
  accent?: boolean;
  /** Anel dourado pulsando para chamar atenção (dica da primeira visita). */
  pulse?: boolean;
}) {
  return (
    <Tooltip direction="left" content={tooltip}>
      <button
        onClick={onClick}
        aria-label={tooltip}
        className={`flex items-center justify-center w-12 h-12 rounded-xl bg-dark-black/85 backdrop-blur-[4px] border cursor-pointer transition-all duration-200 hover:border-primary-gold/50 hover:text-primary-gold active:scale-95 ${
          accent
            ? "border-primary-gold/45 text-primary-gold shadow-[0_0_14px_rgba(230,197,107,0.18)]"
            : "border-primary-gold/20 text-primary"
        } ${isHidden ? "opacity-0 pointer-events-none" : "opacity-100"} ${
          pulse ? "fab-pulse" : ""
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

// Guarda que a dica da busca já foi mostrada neste aparelho
const SEARCH_HINT_KEY = "carcassonne-menu-search-hint";

export default function ScrollUp({
  onSearch,
  searchHintReady = true,
}: {
  onSearch?: () => void;
  /** A dica da busca espera a página ficar livre (carregada, sem popup aberto). */
  searchHintReady?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMusicRecommendationEnable, setIsMusicRecommendationEnable] = useState(false);
  const [activeEvents, setActiveEvents] = useState<(EventItemType & { id: string })[]>([]);
  const [searchHint, setSearchHint] = useState<"off" | "on" | "leaving">("off");
  const hasSearch = !!onSearch;

  const router = useRouter();

  // Primeira visita ao cardápio: a lupa pulsa e um balão mostra onde buscar
  useEffect(() => {
    if (!hasSearch || !searchHintReady) return;
    try {
      if (localStorage.getItem(SEARCH_HINT_KEY)) return;
    } catch {
      // Sem acesso ao armazenamento: melhor não mostrar a cada visita
      return;
    }
    const timers = [
      window.setTimeout(() => {
        setSearchHint("on");
        try {
          localStorage.setItem(SEARCH_HINT_KEY, "1");
        } catch {
          // segue sem guardar
        }
      }, 1200),
      window.setTimeout(() => setSearchHint("leaving"), 6000),
      window.setTimeout(() => setSearchHint("off"), 6400),
    ];
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      setSearchHint("off");
    };
  }, [hasSearch, searchHintReady]);

  useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > 100);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [configs, events] = await Promise.all([
          GeneralConfigsRepository.get(),
          EventRepository.getAll(),
        ]);
        if (configs) setIsMusicRecommendationEnable(configs.isMusicRecommendationEnable);
        setActiveEvents(events.filter((e) => e.isActive));
      } catch (error) {
        console.error("Não foi possível carregar as configurações gerais.", error);
      }
    }
    fetchData();
  }, []);

  return (
    // floating-bottom (globals.css): sobe um pouco quando há um tema ativo
    <div className="flex flex-col items-center gap-3 fixed right-3 z-10 floating-bottom">
      <FloatingButton
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        tooltip="Voltar ao topo"
        isHidden={!isVisible}
      >
        <FaArrowUp size={16} />
      </FloatingButton>

      {isMusicRecommendationEnable && (
        <FloatingButton
          onClick={() => router.push("/clientMusicRecommendation")}
          tooltip="Recomende uma música"
        >
          <FaMusic size={16} />
        </FloatingButton>
      )}

      {activeEvents.map((event) => {
        const Icon = getLucideIcon(event.icon);
        return (
          <FloatingButton
            key={event.id}
            onClick={() => router.push(`/clientEventos/${event.id}`)}
            tooltip={event.name}
          >
            {Icon ? <Icon size={16} /> : <LuTrophy size={16} />}
          </FloatingButton>
        );
      })}

      <FloatingButton
        onClick={() => window.open("https://search.google.com/local/writereview?placeid=ChIJ534KOao7WpMRZ6NS_UuEtY4", "_blank")}
        tooltip="Avalie-nos no Google"
      >
        <FaStar size={16} />
      </FloatingButton>

      <FloatingButton
        onClick={() => router.push("/rulesAndRegulations")}
        tooltip="Contato e regulamentos"
      >
        <FaInfoCircle size={16} />
      </FloatingButton>

      {/* Busca (só no cardápio): por último, mais perto do polegar */}
      {onSearch && (
        <div className="relative">
          {searchHint !== "off" && (
            <span
              aria-hidden="true"
              className={`fab-hint ${searchHint === "leaving" ? "fab-hint-leaving" : ""}`}
            >
              Busque no cardápio
            </span>
          )}
          <FloatingButton
            onClick={() => {
              setSearchHint("off");
              onSearch();
            }}
            tooltip="Procurar no cardápio"
            accent
            pulse={searchHint === "on"}
          >
            <FaSearch size={16} />
          </FloatingButton>
        </div>
      )}
    </div>
  );
}
