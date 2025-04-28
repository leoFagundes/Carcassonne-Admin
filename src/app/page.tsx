"use client";

import Input from "@/components/input";
import { useEffect, useState } from "react";
import { FiLock, FiUser } from "react-icons/fi";
import Button from "@/components/button";
import { useRouter } from "next/navigation";
import carcassonneBackground from "../../public/images/carcassonne-bg.png";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { User } from "@/types";
import { useAlert } from "@/contexts/alertProvider";

export default function Home() {
  const [user, setUser] = useState<User>({
    email: "",
    password: "",
  });

  const { addAlert } = useAlert();

  useEffect(() => {
    const storedEmail = localStorage.getItem("carcassonneAdminEmail");
    if (storedEmail) {
      setUser((prevUser) => ({
        ...prevUser,
        email: storedEmail,
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("carcassonneAdminEmail", user.email);
  }, [user.email]);

  const router = useRouter();

  async function validateAccount() {
    try {
      await signInWithEmailAndPassword(auth, user.email, user.password);
      router.push("/collection");
    } catch (error: any) {
      console.error("Erro ao fazer login:", error.message);
      addAlert("Usuário ou senha inválidos.");
    }
  }

  async function handleForgotPassword() {
    try {
      if (!user.email) {
        addAlert(
          "Digite o e-mail no respectivo campo e depois tente novamente."
        );
        return;
      }
      await sendPasswordResetEmail(auth, user.email);
      addAlert("Instruções de recuperação de senha enviadas para seu e-mail.");
    } catch (error: any) {
      console.error("Erro ao enviar e-mail de recuperação:", error.message);
      addAlert(`Não encontramos o e-mail: ${user.email}.`);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      validateAccount();
    }
  };

  return (
    <div
      className="flex justify-center items-center bg-cover bg-center min-h-screen w-full bg-primary-black"
      style={{
        backgroundImage: `url(${carcassonneBackground.src})`,
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
            value={user.email}
            setValue={(e) => setUser({ ...user, email: e.target.value })}
            placeholder="Email"
            onKeyDown={handleKeyDown}
          />
          <Input
            icon={<FiLock size={"20px"} className="text-primary-gold" />}
            value={user.password}
            setValue={(e) => setUser({ ...user, password: e.target.value })}
            placeholder="Senha"
            type="password"
            onKeyDown={handleKeyDown}
          />
          <div className="flex w-full justify-end px-2">
            <span
              className="text-primary-gold text-xs cursor-pointer hover:underline"
              onClick={handleForgotPassword}
            >
              Esqueci minha senha
            </span>
          </div>
        </div>
        <Button onClick={() => validateAccount()}>Entrar</Button>
      </section>
    </div>
  );
}
