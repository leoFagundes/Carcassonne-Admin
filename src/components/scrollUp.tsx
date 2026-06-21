"use client";

import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FaArrowUp, FaInfoCircle, FaMusic, FaStar } from "react-icons/fa";
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
}: {
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
  isHidden?: boolean;
}) {
  return (
    <Tooltip direction="left" content={tooltip}>
      <button
        onClick={onClick}
        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-dark-black/85 backdrop-blur-[4px] border border-primary-gold/20 text-primary cursor-pointer transition-all duration-200 hover:border-primary-gold/50 hover:text-primary-gold active:scale-95 ${
          isHidden ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

export default function ScrollUp() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMusicRecommendationEnable, setIsMusicRecommendationEnable] = useState(false);
  const [activeEvents, setActiveEvents] = useState<(EventItemType & { id: string })[]>([]);

  const router = useRouter();

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
    <div className="flex flex-col items-center gap-2 fixed bottom-3 right-3 z-10">
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
    </div>
  );
}
