"use client";

import Input from "@/components/input";
import { useState } from "react";
import { FiCodesandbox, FiLock, FiUser } from "react-icons/fi";
import Button from "@/components/button";
import { useRouter } from "next/navigation";
import carcassonneBackground from "../../../public/images/carcassonne-bg.png";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { User } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "@/components/loader";

export default function SignUpPage() {
  const [newUser, setNewUser] = useState<User>({
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creationToken, setCreationToken] = useState("");
  const [loading, setLoading] = useState(false);

  const { addAlert } = useAlert();
  const router = useRouter();

  const creationTokenEnv = process.env.NEXT_PUBLIC_CREATION_TOKEN;

  async function createAccount() {
    setLoading(true);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
        addAlert("Por favor, insira um e-mail válido!");
        return;
      }

      if (newUser.password !== confirmPassword) {
        addAlert("As senhas não coincidem!");
        return;
      }

      if (creationToken !== creationTokenEnv) {
        addAlert("Token de criação inválido!");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );

      await sendEmailVerification(userCredential.user);

      addAlert("Conta criada! Verifique seu e-mail para ativar a conta.");

      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Erro ao criar conta:", error.message);
        addAlert("Erro ao criar conta: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      createAccount();
    }
  };

  return (
    <div
      className="flex flex-col justify-center items-center gap-1 bg-cover bg-center min-h-screen w-full bg-primary-black"
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
            Criar uma nova conta
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 w-full">
          <Input
            icon={<FiUser size={"20px"} className="text-primary-gold" />}
            value={newUser.email}
            setValue={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="Email"
            onKeyDown={handleKeyDown}
          />
          <Input
            icon={<FiLock size={"20px"} className="text-primary-gold" />}
            value={newUser.password}
            setValue={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            placeholder="Senha"
            type="password"
            onKeyDown={handleKeyDown}
          />
          <Input
            icon={<FiLock size={"20px"} className="text-primary-gold" />}
            value={confirmPassword}
            setValue={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar Senha"
            type="password"
            onKeyDown={handleKeyDown}
          />
          <Input
            icon={<FiCodesandbox size={"20px"} className="text-primary-gold" />}
            value={creationToken}
            setValue={(e) => setCreationToken(e.target.value)}
            placeholder="Token de Criação"
            type="password"
            onKeyDown={handleKeyDown}
          />
        </div>
        <Button onClick={() => createAccount()}>
          {loading ? <Loader /> : "Criar conta"}
        </Button>
      </section>
      <span
        className="text-primary-gold text-sm cursor-pointer hover:underline bg-primary-black/60 py-1 px-2 rounded"
        onClick={() => router.push("/")}
      >
        Já tenho uma conta
      </span>
    </div>
  );
}
