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

const STAR = (
  <svg
    width="7"
    height="7"
    viewBox="0 0 10 10"
    className="text-primary-gold/50 shrink-0"
  >
    <polygon
      points="5,0 6.5,3.5 10,3.5 7.5,5.5 8.5,9 5,7 1.5,9 2.5,5.5 0,3.5 3.5,3.5"
      fill="currentColor"
    />
  </svg>
);

export default function SignUpPage() {
  const [newUser, setNewUser] = useState<User>({ email: "", password: "" });
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
        newUser.password,
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
    if (e.key === "Enter") createAccount();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }

        @keyframes shimmer-gold {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .text-shimmer-gold {
          background: linear-gradient(135deg, #e6c56b 0%, #f5e09a 40%, #d4af37 70%, #e6c56b 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer-gold 4s linear infinite;
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-in { animation: card-in 0.5s ease both; }
      `}</style>

      <div
        className="flex flex-col justify-center items-center gap-3 bg-cover bg-center min-h-screen w-full px-2"
        style={{ backgroundImage: `url(${carcassonneBackground.src})` }}
      >
        <section className="card-in flex flex-col items-center bg-dark-black/65 border border-primary-gold/25 rounded-2xl backdrop-blur-[4px] p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)] gap-5 w-full max-w-[360px] mx-4 text-primary-gold">
          {/* Title */}
          <div className="flex flex-col items-center gap-2 w-full">
            <h1 className="font-cinzel text-2xl sm:text-3xl text-center text-shimmer-gold tracking-widest uppercase leading-tight">
              Carcassonne Pub
            </h1>
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary-gold/40" />
              {STAR}
              <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase text-primary-gold/50 whitespace-nowrap">
                Criar uma nova conta
              </span>
              {STAR}
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
            </div>
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-3 w-full">
            <Input
              icon={<FiUser size={18} className="text-primary-gold/70" />}
              value={newUser.email}
              setValue={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              placeholder="Email"
              onKeyDown={handleKeyDown}
            />
            <Input
              icon={<FiLock size={18} className="text-primary-gold/70" />}
              value={newUser.password}
              setValue={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              placeholder="Senha"
              type="password"
              onKeyDown={handleKeyDown}
            />
            <Input
              icon={<FiLock size={18} className="text-primary-gold/70" />}
              value={confirmPassword}
              setValue={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar Senha"
              type="password"
              onKeyDown={handleKeyDown}
            />
            <Input
              icon={
                <FiCodesandbox size={18} className="text-primary-gold/70" />
              }
              value={creationToken}
              setValue={(e) => setCreationToken(e.target.value)}
              placeholder="Token de Criação"
              type="password"
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Submit */}
          <div className="w-full">
            <Button onClick={() => createAccount()}>
              {loading ? <Loader /> : "Criar conta"}
            </Button>
          </div>
        </section>

        {/* Back to login */}
        <span
          className="text-primary-gold/60 text-xs cursor-pointer hover:text-primary-gold transition-colors bg-primary-black/50 backdrop-blur-sm py-1.5 px-4 rounded-full border border-primary-gold/15 hover:border-primary-gold/35"
          onClick={() => router.push("/")}
        >
          Já tenho uma conta
        </span>
      </div>
    </>
  );
}
