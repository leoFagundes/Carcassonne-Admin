"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { ReactNode, useEffect, useState } from "react";
import {
  LuDices,
  LuPizza,
  LuSkipBack,
  LuMenu,
  LuX,
  LuSettings,
  LuCalendar,
  LuMusic,
  LuExternalLink,
  LuListPlus,
  LuLogOut,
} from "react-icons/lu";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import Tooltip from "@/components/Tooltip";
import { MusicRecommendationType } from "@/types";
import MusicRecommendationRepository from "@/services/repositories/MusicRecommendationsRepository";
import { useAlert } from "@/contexts/alertProvider";

interface ItemProps {
  message: string;
  icon: ReactNode;
  path: string;
  onClick: VoidFunction;
  notify?: unknown[];
  setSongsToNotify?: React.Dispatch<
    React.SetStateAction<
      (MusicRecommendationType & { id: string })[]
    >
  >;
}

function Item({ message, icon, path, onClick, notify, setSongsToNotify }: ItemProps) {
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
      <span className="text-sm font-medium">{message}</span>
      {notify && notify.length > 0 && path === "/musicRecommendation" && (
        <div className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-gold text-primary-black text-[10px] font-bold animate-bounce">
          {notify.length}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [songsToNotify, setSongsToNotify] = useState<
    (MusicRecommendationType & { id: string })[]
  >([]);

  const { addAlert } = useAlert();
  const router = useRouter();
  const pathname = usePathname();
  const toggleSidebar = () => setIsOpen(!isOpen);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("songsToNotify") || "[]");
    setSongsToNotify(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("songsToNotify", JSON.stringify(songsToNotify));
  }, [songsToNotify]);

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
            setSongsToNotify((prev) => [...prev, ...newSongs]);
            addAlert(`${newSongs.length} nova música adicionada! 🎵`);

            const updatedIds = [...storedIds, ...newSongs.map((m) => m.id)];
            localStorage.setItem("songsAlreadyNotified", JSON.stringify(updatedIds));
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
    { path: "/myreserves",         message: "Reservas",      icon: <LuCalendar size={17} /> },
    { path: "/collection",         message: "Coleção",       icon: <LuDices size={17} /> },
    { path: "/menu",               message: "Cardápio",      icon: <LuPizza size={17} /> },
    { path: "/musicRecommendation",message: "Músicas",       icon: <LuMusic size={17} /> },
    { path: "/links",              message: "Links",         icon: <LuExternalLink size={17} /> },
    { path: "/add",                message: "Adicionar",     icon: <LuListPlus size={17} /> },
    { path: "/carcassonne",        message: "Configurações", icon: <LuSettings size={17} /> },
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
        <div className="flex flex-col h-full w-full overflow-y-auto">

          {/* Logo section */}
          <div className="flex flex-col items-center gap-3 px-4 pt-6 pb-4 border-b border-primary-gold/10">
            <div className="relative">
              <img
                className="w-[90px]"
                src="images/mascote-3.png"
                alt="meeple"
              />
              <div className="absolute top-2 left-2">
                <Tooltip content="Eu sou o Duque e pego 3" direction="right">
                  <div className="bg-primary-black p-[1px] h-1 w-1 rounded-full" />
                </Tooltip>
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-cinzel text-xs font-semibold text-primary-gold/80 tracking-[0.2em] uppercase">
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
                  router.push(item.path);
                  setIsOpen(false);
                }}
                message={item.message}
                icon={item.icon}
                path={item.path}
                notify={songsToNotify}
                setSongsToNotify={setSongsToNotify}
              />
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-primary-gold/10">
            <div
              onClick={() => { handleLogout(); setIsOpen(false); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-primary-gold/35 hover:text-invalid-color hover:bg-invalid-color/5 select-none"
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
