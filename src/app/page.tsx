"use client";

import Input from "@/components/input";
import { useState } from "react";
import { FiLock, FiUser } from "react-icons/fi";
import Button from "@/components/button";
import { useRouter } from "next/navigation";
import carcassoneBackground from "../../public/images/carcassonne-bg.png";

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  function validateAccount() {
    router.push("collection");
  }

  return (
    <div
      className="flex justify-center items-center bg-cover bg-center min-h-screen w-full bg-primary-black"
      style={{
        backgroundImage: `url(${carcassoneBackground.src})`,
      }}
    >
      <section className="flex items-center justify-center flex-col bg-black/60 rounded-md backdrop-blur-[1px] p-8 shadow-card gap-5">
        <div className="flex flex-col items-center justify-center gap-1">
          <h1 className="text-gradient-gold text-primary text-4xl sm:text-5xl text-center">
            Carcassonne Pub
          </h1>
          <h1 className="text-gradient-gold text-xl sm:text-2xl">
            Área de Administrador
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <Input
            icon={<FiUser size={"20px"} className="text-primary-gold" />}
            value={username}
            setValue={(e) => setUsername(e.target.value)}
            placeholder="Usuário"
          />
          <Input
            icon={<FiLock size={"20px"} className="text-primary-gold" />}
            value={password}
            setValue={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            type="password"
          />
        </div>
        <Button onClick={() => validateAccount()}>Entrar</Button>
      </section>
    </div>
  );
}
