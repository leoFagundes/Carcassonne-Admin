"use client";

import Input from "@/components/input";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiLock, FiUser } from "react-icons/fi";
import Button from "@/components/button";
import { useRouter } from "next/navigation";
import carcassonneBackground from "../../public/images/carcassonne-bg.png";
import carcassonneBoardgame from "../../public/images/carcassonne-boardgame.png";
import fabiosali from "../../public/images/fabio&sali.png";
import klausjurgen from "../../public/images/klausjurgen.png";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { User } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import Loader from "@/components/loader";
import Puzzle from "@/components/puzzle";
import { SESSION_DURATION } from "./(admin)/sessionTimer";

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

export default function Home() {
  const [user, setUser] = useState<User>({ email: "", password: " " });
  const [loading, setLoading] = useState(false);
  const [carcaPuzzle, setCarcaPuzzle] = useState(false);

  const router = useRouter();
  const { addAlert } = useAlert();

  useEffect(() => {
    const storedValue = localStorage.getItem("carcaPuzzle");
    setCarcaPuzzle(storedValue === "true");
  }, []);

  useEffect(() => {
    const imagesToPreload = [
      carcassonneBackground.src,
      carcassonneBoardgame.src,
      fabiosali.src,
      klausjurgen.src,
    ];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const storedEmail = localStorage.getItem("carcassonneAdminEmail");
    if (storedEmail) {
      setUser((prev) => ({ ...prev, email: storedEmail, password: "" }));
    } else {
      setUser((prev) => ({ ...prev, email: "", password: "" }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("carcassonneAdminEmail", user.email);
  }, [user.email]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const expiresAt = localStorage.getItem("session_expires_at");
        if (expiresAt && Date.now() > Number(expiresAt)) return;
        if (currentUser.emailVerified) {
          setLoading(true);
          addAlert("Sua sessão está ativa.");
          router.push("/myreserves");
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function validateAccount() {
    setLoading(true);
    try {
      const authUser: UserCredential = await signInWithEmailAndPassword(
        auth,
        user.email,
        user.password,
      );
      if (!authUser.user.emailVerified) {
        addAlert("Você precisa verificar seu e-mail antes de fazer login.");
        return;
      }
      localStorage.setItem(
        "session_expires_at",
        String(Date.now() + SESSION_DURATION),
      );
      router.push("/myreserves");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Erro ao fazer login:", error.message);
        addAlert("Usuário ou senha inválidos.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    try {
      if (!user.email) {
        addAlert(
          "Digite o e-mail no respectivo campo e depois tente novamente.",
        );
        return;
      }
      await sendPasswordResetEmail(auth, user.email);
      addAlert("Instruções de recuperação de senha enviadas para seu e-mail.");
    } catch (error: unknown) {
      if (error instanceof Error) {
        addAlert(`Não encontramos o e-mail: ${user.email}.`);
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") validateAccount();
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
        style={{
          backgroundImage: `url(${carcaPuzzle ? carcassonneBoardgame.src : carcassonneBackground.src})`,
        }}
      >
        {/* ── LOGIN CARD ── */}
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
                Área de Administrador
              </span>
              {STAR}
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary-gold/40" />
            </div>
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-3 w-full">
            <Input
              icon={<FiUser size={18} className="text-primary-gold/70" />}
              value={user.email}
              setValue={(e) => setUser({ ...user, email: e.target.value })}
              placeholder="Email"
              onKeyDown={handleKeyDown}
            />
            <Input
              icon={<FiLock size={18} className="text-primary-gold/70" />}
              value={user.password}
              setValue={(e) => setUser({ ...user, password: e.target.value })}
              placeholder="Senha"
              type="password"
              onKeyDown={handleKeyDown}
            />
            <div className="flex w-full justify-end">
              <span
                className="text-primary-gold/50 text-xs cursor-pointer hover:text-primary-gold transition-colors"
                onClick={handleForgotPassword}
              >
                Esqueci minha senha
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="w-full">
            <Button onClick={() => validateAccount()}>
              {loading ? <Loader /> : "Entrar"}
            </Button>
          </div>
        </section>

        {/* Sign up link */}
        <span
          className="text-primary-gold/60 text-xs cursor-pointer hover:text-primary-gold transition-colors bg-primary-black/50 backdrop-blur-sm py-1.5 px-4 rounded-full border border-primary-gold/15 hover:border-primary-gold/35"
          onClick={() => router.push("/signup")}
        >
          Criar uma conta
        </span>

        {/* Puzzle dots — não mexer */}
        {!carcaPuzzle && <Puzzle />}

        {/* ── PUZZLE SOLVED VIEW ── */}
        {carcaPuzzle && (
          <>
            {/* Klaus-Jürgen Wrede — top left */}
            <div className="w-[260px] sm:flex hidden flex-col absolute top-4 left-4 rounded-2xl border border-primary-gold/25 bg-primary-black/80 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div
                className="w-full h-[200px] bg-cover bg-top"
                style={{ backgroundImage: `url(${klausjurgen.src})` }}
              />
              <div className="flex flex-col gap-2 p-4 border-t border-primary-gold/10">
                <span className="font-cinzel text-sm font-semibold text-center text-primary-gold/90 tracking-wide">
                  Klaus-Jürgen Wrede
                </span>
                <p className="text-[11px] text-primary-gold/65 leading-relaxed">
                  Klaus-Jürgen Wrede é um designer de jogos alemão, mais
                  conhecido por ter criado o famoso jogo de tabuleiro
                  Carcassonne, lançado em 2000. O jogo se destacou pela sua
                  mecânica inovadora de colocação de peças (tiles) e controle de
                  áreas, se tornando um clássico moderno e ganhando o
                  prestigiado prêmio Spiel des Jahres em 2001.
                </p>
              </div>
            </div>

            {/* Fábio & Salimar — bottom right */}
            <div className="w-[260px] sm:flex hidden flex-col absolute bottom-4 right-4 rounded-2xl border border-primary-gold/25 bg-primary-black/80 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="flex flex-col gap-2 p-4 border-b border-primary-gold/10">
                <span className="font-cinzel text-sm font-semibold text-center text-primary-gold/90 tracking-wide">
                  Fábio Almeida e Salimar Morais
                </span>
                <p className="text-[11px] text-primary-gold/65 leading-relaxed">
                  O Carcassonne Pub, pioneiro em jogos de tabuleiro no Distrito
                  Federal, foi fundado por Fábio Almeida e Salimar Morais em
                  maio de 2013, casal apaixonado por jogos e gastronomia. A
                  inspiração surgiu durante uma viagem à Europa, onde observaram
                  pubs com estantes de livros disponíveis para os clientes. Eles
                  adaptaram essa ideia, substituindo os livros por jogos de
                  tabuleiro, criando um ambiente que promove a interação
                  presencial entre as pessoas.
                </p>
              </div>
              <div
                className="w-full h-[180px] bg-cover bg-center"
                style={{ backgroundImage: `url(${fabiosali.src})` }}
              />
            </div>

            {/* Voltar */}
            <div
              onClick={() => {
                localStorage.setItem("carcaPuzzle", "false");
                window.location.reload();
              }}
              className="absolute bottom-14 flex items-center gap-2 text-xs text-primary-gold/60 hover:text-primary-gold border border-primary-gold/20 hover:border-primary-gold/50 bg-primary-black/60 backdrop-blur-sm py-2 px-4 rounded-xl cursor-pointer transition-all shadow-card"
            >
              <FiArrowLeft size={13} /> Voltar à visão padrão
            </div>
          </>
        )}
      </div>
    </>
  );
}
