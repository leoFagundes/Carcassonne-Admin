"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { ReactNode, useState } from "react";
import {
  LuDices,
  LuPizza,
  LuPlus,
  LuSkipBack,
  LuMenu,
  LuX,
  LuSettings,
} from "react-icons/lu";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import Tooltip from "@/components/Tooltip";

interface ItemProps {
  message: string;
  icon: ReactNode;
  path: string;
  onClick: VoidFunction;
}

function Item({ message, icon, path, onClick }: ItemProps) {
  const pathname = usePathname();
  const isActive = pathname === path;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 w-full p-2 text-primary-black bg-primary-gold/60 border rounded-md cursor-pointer transition-all ease-in ${
        isActive ? "!bg-primary-gold" : ""
      }  hover:scale-[98%]`}
    >
      {icon}
      <h2 className="text-2xl">{message}</h2>
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const pathname = usePathname();

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
        <div className="flex flex-col gap-6 items-center w-full h-full">
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
          <div className="w-full flex flex-col flex-1 gap-4">
            <Item
              onClick={() => {
                router.push("/collection");
                setIsOpen(false);
              }}
              message="Coleção"
              icon={<LuDices size={"20px"} />}
              path="/collection"
            />
            <Item
              onClick={() => {
                router.push("/menu");
                setIsOpen(false);
              }}
              message="Cardápio"
              icon={<LuPizza size={"20px"} />}
              path="/menu"
            />
            <Item
              onClick={() => {
                router.push("/add");
                setIsOpen(false);
              }}
              message="Adicionar"
              icon={<LuPlus size={"20px"} />}
              path="/add"
            />
            {pathname === "/carcassonne" && (
              <Item
                onClick={() => {
                  router.push("/carcassonne");
                  setIsOpen(false);
                }}
                message="Extras"
                icon={<LuSettings size={"20px"} />}
                path={pathname}
              />
            )}
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
