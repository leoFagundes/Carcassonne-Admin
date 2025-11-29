"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { ReactNode, useEffect, useState } from "react";
import {
  LuDices,
  LuPizza,
  LuPlus,
  LuSkipBack,
  LuMenu,
  LuX,
  LuSettings,
  LuCalendar,
  LuMusic,
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
      (MusicRecommendationType & {
        id: string;
      })[]
    >
  >;
}

function Item({
  message,
  icon,
  path,
  onClick,
  notify,
  setSongsToNotify,
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
      className={`relative flex items-center gap-2 w-full p-2 text-primary-black bg-primary-gold/60 border rounded-md cursor-pointer transition-all ease-in ${
        isActive ? "!bg-primary-gold" : ""
      }  hover:scale-[98%]`}
    >
      {icon}
      <h2 className="text-2xl">{message}</h2>
      {notify && notify.length > 0 && path === "/musicRecommendation" && (
        <div className="shadow-card flex justify-center items-center absolute -top-0 -right-1 rounded-full w-2 h-2 p-3 bg-primary-gold animate-bounce">
          <span className="text-primary-black font-semibold">
            {notify.length}
          </span>
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
  const toggleSidebar = () => setIsOpen(!isOpen);
  const pathname = usePathname();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("songsToNotify") || "[]");
    setSongsToNotify(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("songsToNotify", JSON.stringify(songsToNotify));
  }, [songsToNotify]);

  useEffect(() => {
    const interval: NodeJS.Timeout = setInterval(checkUpdates, 10000); // a cada 10s

    async function checkUpdates() {
      try {
        const lastUpdate = await MusicRecommendationRepository.getLastUpdate();

        // @ts-expect-error: propriedade custom no window
        if (!window.lastMusicUpdate || lastUpdate !== window.lastMusicUpdate) {
          const recommendations = await MusicRecommendationRepository.getAll();

          // @ts-expect-error: propriedade custom no window
          window.lastMusicUpdate = lastUpdate;

          // === Verificação de novas músicas ===
          const storedIds = JSON.parse(
            localStorage.getItem("songsAlreadyNotified") || "[]"
          );

          // IDs das músicas atuais
          // const currentIds = recommendations.map((music) => music.id);

          // músicas novas (que ainda não estão no localStorage)
          const newSongs = recommendations.filter(
            (music) => music.id && !storedIds.includes(music.id)
          );

          if (newSongs.length > 0) {
            setSongsToNotify((prev) => [...prev, ...newSongs]);
            addAlert(`${newSongs.length} nova música adicionada! 🎵`);

            // salva todos os IDs (antigos + novos)
            const updatedIds = [...storedIds, ...newSongs.map((m) => m.id)];
            localStorage.setItem(
              "songsAlreadyNotified",
              JSON.stringify(updatedIds)
            );
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
      icon: <LuCalendar size={20} />,
    },
    { path: "/collection", message: "Coleção", icon: <LuDices size={20} /> },
    { path: "/menu", message: "Cardápio", icon: <LuPizza size={20} /> },
    {
      path: "/musicRecommendation",
      message: "Músicas",
      icon: <LuMusic size={20} />,
    },
    { path: "/add", message: "Adicionar", icon: <LuPlus size={20} /> },
    { path: "/carcassonne", message: "Extras", icon: <LuSettings size={20} /> },
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
      {/* Botão para mobile */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-50 md:hidden text-primary-gold cursor-pointer transform bg-primary-black/80 rounded-full p-2 transition-transform duration-300 ease-in-out ${
          isOpen && "translate-x-[190px] shadow-card"
        }`}
      >
        {isOpen ? <LuX size={30} /> : <LuMenu size={30} />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-[200px] bg-primary-black/80 p-4 z-40 rounded-md backdrop-blur-[1px] shadow-card transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        md:relative md:translate-x-0 md:flex`}
      >
        <div className="flex flex-col gap-6 items-center w-full h-full overflow-y-auto px-1 py-2">
          <div className="relative flex flex-col justify-center items-center gap-1">
            <img
              className="right-16 w-[150px]"
              src="images/mascote-3.png"
              alt="meeple"
            />
            <h2 className="text-primary-gold -mt-1 text-lg">Administração</h2>
            <div className="absolute top-2">
              <Tooltip content="Eu sou o Duque e pego 3" direction="right">
                <div className=" bg-primary-black p-[1px] h-1 w-1 rounded-full"></div>
              </Tooltip>
            </div>
          </div>
          <div className="w-full flex flex-col flex-1 gap-3">
            {menuItems.map((item) => (
              <Item
                key={item.path}
                onClick={() => router.push(item.path)}
                message={item.message}
                icon={item.icon}
                path={item.path}
                notify={songsToNotify}
                setSongsToNotify={setSongsToNotify}
              />
            ))}
          </div>

          <Item
            onClick={() => {
              handleLogout();
              setIsOpen(false);
            }}
            message="Sair"
            icon={<LuSkipBack size={"20px"} />}
            path={pathname}
          />
        </div>
      </div>
    </>
  );
}
