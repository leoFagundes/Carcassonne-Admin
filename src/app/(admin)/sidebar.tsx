"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  LuDices,
  LuPizza,
  LuMenu,
  LuX,
  LuSettings,
  LuCalendar,
  LuMusic,
  LuExternalLink,
  LuListPlus,
  LuLogOut,
  LuTrophy,
  LuCircleHelp,
} from "react-icons/lu";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import Tooltip from "@/components/Tooltip";
import { MusicRecommendationType } from "@/types";
import MusicRecommendationRepository from "@/services/repositories/MusicRecommendationsRepository";
import EventRepository from "@/services/repositories/EventRepository";
import { useAlert } from "@/contexts/alertProvider";
import { useLogoEasterEgg } from "@/hooks/useLogoEasterEgg";
import ThemeLogoAccessory from "@/components/siteTheme/ThemeLogoAccessory";
import ThemeBand from "@/components/siteTheme/ThemeBand";
import { useSiteThemeReminders } from "@/components/siteTheme/siteThemeContext";
import { SITE_THEMES } from "@/utils/siteThemes";

interface ItemProps {
  message: string;
  icon: ReactNode;
  path: string;
  onClick: VoidFunction;
  notify?: unknown[];
  setSongsToNotify?: React.Dispatch<
    React.SetStateAction<(MusicRecommendationType & { id: string })[]>
  >;
  activeCount?: number;
  /** Nomes dos temas com aviso para ativar (Configurações → Temas). */
  themeReminders?: string[];
}

function Item({
  message,
  icon,
  path,
  onClick,
  notify,
  setSongsToNotify,
  activeCount,
  themeReminders,
}: ItemProps) {
  const pathname = usePathname();
  const isActive = pathname === path;

  return (
    <div
      onClick={() => {
        if (path === "/musicRecommendation" && setSongsToNotify) {
          localStorage.setItem("songsToNotify", JSON.stringify([]));
          setSongsToNotify([]);
        }
        onClick();
      }}
      className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 select-none ${
        isActive
          ? "bg-primary-gold/10 border border-primary-gold/25 text-primary-gold"
          : "text-primary-gold/55 border border-transparent hover:text-primary-gold/90 hover:bg-primary-gold/5"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-primary-gold" />
      )}
      <span className="shrink-0">{icon}</span>
      <span className="text-lg font-light">{message}</span>
      {notify &&
        notify.length > 0 &&
        path === "/musicRecommendation" &&
        !isActive && (
          <div className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-gold text-primary-black text-[10px] font-bold animate-pulse">
            {notify.length}
          </div>
        )}
      {path === "/eventos" && !!activeCount && (
        <Tooltip
          content={`${activeCount} evento${activeCount !== 1 ? "s" : ""} ativado${activeCount !== 1 ? "s" : ""}`}
          direction="right"
          portal
        >
          <div className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-primary-black text-[10px] font-bold">
            {activeCount}
          </div>
        </Tooltip>
      )}
      {path === "/carcassonne" && themeReminders && themeReminders.length > 0 && (
        <Tooltip
          content={`Tema para ativar: ${themeReminders.join(", ")}`}
          direction="right"
          portal
        >
          <div className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff9a3c] text-primary-black text-[10px] font-bold animate-pulse">
            {themeReminders.length}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [songsToNotify, setSongsToNotify] = useState<
    (MusicRecommendationType & { id: string })[]
  >([]);
  const [activeEventsCount, setActiveEventsCount] = useState(0);

  const { addAlert } = useAlert();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const toggleSidebar = () => setIsOpen(!isOpen);
  const onLogoClick = useLogoEasterEgg();
  // Avisos de tema (período configurado em Configurações → Temas)
  const { pending: pendingThemeReminders } = useSiteThemeReminders();
  const themeReminderNames = pendingThemeReminders.map(
    ({ theme }) => SITE_THEMES[theme].name,
  );

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("songsToNotify") || "[]");
    setSongsToNotify(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("songsToNotify", JSON.stringify(songsToNotify));
  }, [songsToNotify]);

  // Limpa o badge automaticamente ao entrar na página de músicas
  useEffect(() => {
    if (pathname === "/musicRecommendation") {
      localStorage.setItem("songsToNotify", JSON.stringify([]));
      setSongsToNotify([]);
    }
  }, [pathname]);

  useEffect(() => {
    const unsub = EventRepository.subscribeToAll((events) => {
      setActiveEventsCount(events.filter((e) => e.isActive).length);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const interval: NodeJS.Timeout = setInterval(checkUpdates, 10000);

    async function checkUpdates() {
      try {
        const lastUpdate = await MusicRecommendationRepository.getLastUpdate();

        // @ts-expect-error: propriedade custom no window
        if (!window.lastMusicUpdate || lastUpdate !== window.lastMusicUpdate) {
          const recommendations = await MusicRecommendationRepository.getAll();

          // @ts-expect-error: propriedade custom no window
          window.lastMusicUpdate = lastUpdate;

          const storedIds = JSON.parse(
            localStorage.getItem("songsAlreadyNotified") || "[]",
          );

          const newSongs = recommendations.filter(
            (music) => music.id && !storedIds.includes(music.id),
          );

          if (newSongs.length > 0) {
            const updatedIds = [...storedIds, ...newSongs.map((m) => m.id)];
            localStorage.setItem(
              "songsAlreadyNotified",
              JSON.stringify(updatedIds),
            );

            // Não acumula notificações se já está na página de músicas
            if (pathnameRef.current !== "/musicRecommendation") {
              setSongsToNotify((prev) => [...prev, ...newSongs]);
              addAlert(`${newSongs.length} nova música adicionada! 🎵`);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao checar atualizações:", error);
      }
    }

    checkUpdates();
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    {
      path: "/myreserves",
      message: "Reservas",
      icon: <LuCalendar size={18} />,
    },
    { path: "/collection", message: "Coleção", icon: <LuDices size={18} /> },
    { path: "/menu", message: "Cardápio", icon: <LuPizza size={18} /> },
    {
      path: "/musicRecommendation",
      message: "Músicas",
      icon: <LuMusic size={18} />,
    },
    { path: "/links", message: "Links", icon: <LuExternalLink size={18} /> },
    { path: "/eventos", message: "Eventos", icon: <LuTrophy size={18} /> },
    { path: "/add", message: "Adicionar", icon: <LuListPlus size={18} /> },
    {
      path: "/carcassonne",
      message: "Configurações",
      icon: <LuSettings size={18} />,
    },
  ];

  async function handleLogout() {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}</style>

      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-3 left-3 z-50 md:hidden flex items-center justify-center w-9 h-9 bg-secondary-black/95 border border-primary-gold/20 rounded-lg text-primary-gold/70 hover:text-primary-gold cursor-pointer transition-all duration-300 ${
          isOpen && "translate-x-[212px]"
        }`}
      >
        {isOpen ? <LuX size={17} /> : <LuMenu size={17} />}
        {/* Menu fechado no celular: o aviso de tema aparece no próprio botão */}
        {!isOpen && themeReminderNames.length > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ff9a3c] border border-secondary-black animate-pulse" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[220px] bg-secondary-black border-r border-primary-gold/15 z-40 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:flex md:flex-shrink-0`}
      >
        {/* Decoração do tema ativo (Configurações → Temas), atrás dos itens */}
        <ThemeBand variant="sidebar" />
        <div className="flex flex-col h-full w-full overflow-y-auto">
          {/* Logo section */}
          <div className="flex flex-col items-center gap-3 px-4 pt-6 pb-4 border-b border-primary-gold/10">
            <div className="relative isolate">
              <img
                className="w-[120px] contrast-[1.1] brightness-90 cursor-pointer"
                src="images/[oficial]-logo.png"
                alt="meeple"
                onClick={onLogoClick}
              />
              <div className="absolute top-2 left-2">
                <Tooltip content="Eu sou o Duque e pego 3" direction="right" portal>
                  <div className="bg-primary-black p-[1px] h-1 w-1 rounded-full" />
                </Tooltip>
              </div>
              {/* Enfeite do tema ativo (Configurações → Temas) */}
              <ThemeLogoAccessory placement="corner" />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-cinzel text-sm font-semibold text-primary-gold/80 tracking-[0.2em] uppercase">
                Carcassonne
              </span>
              <span className="text-[10px] text-primary-gold/35 tracking-widest uppercase">
                Administração
              </span>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 p-3 flex-1">
            {menuItems.map((item) => (
              <Item
                key={item.path}
                onClick={() => {
                  // Com aviso de tema, Configurações abre direto na aba Temas
                  router.push(
                    item.path === "/carcassonne" && themeReminderNames.length > 0
                      ? "/carcassonne?tab=temas"
                      : item.path,
                  );
                  setIsOpen(false);
                }}
                message={item.message}
                icon={item.icon}
                path={item.path}
                notify={songsToNotify}
                setSongsToNotify={setSongsToNotify}
                activeCount={
                  item.path === "/eventos" ? activeEventsCount : undefined
                }
                themeReminders={themeReminderNames}
              />
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="p-3 border-t border-primary-gold/10 space-y-1">
            <div
              onClick={() => {
                router.push("/ajuda");
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 select-none ${
                pathname === "/ajuda"
                  ? "bg-primary-gold/10 border border-primary-gold/25 text-primary-gold"
                  : "text-primary-gold/35 border border-transparent hover:text-primary-gold/70 hover:bg-primary-gold/5"
              }`}
            >
              <LuCircleHelp size={17} className="shrink-0" />
              <span className="text-sm font-medium">Ajuda</span>
            </div>
            <div
              onClick={() => {
                handleLogout();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-primary-gold/35 hover:text-invalid-color hover:bg-invalid-color/5 select-none border border-transparent"
            >
              <LuLogOut size={17} className="shrink-0" />
              <span className="text-sm font-medium">Sair</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
