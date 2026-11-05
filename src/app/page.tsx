"use client";

import Input from "@/components/input";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiLock, FiMail } from "react-icons/fi";
import { useRouter } from "next/navigation";
import carcassonneBoardgame from "../../public/images/carcassonne-boardgame.png";
import fabiosali from "../../public/images/fabio&sali.png";
import klausjurgen from "../../public/images/klausjurgen.png";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { AdminAccessStatus, User } from "@/types";
import AdminRepository from "@/services/repositories/AdminRepository";
import { useAlert } from "@/contexts/alertProvider";
import Puzzle from "@/components/puzzle";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink, AuthSubmit } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";
import { SESSION_DURATION } from "./(admin)/sessionTimer";

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
      AUTH_SCENE.image.src,
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const expiresAt = localStorage.getItem("session_expires_at");
        if (expiresAt && Date.now() > Number(expiresAt)) return;
        if (currentUser.emailVerified) {
          // Sessão ativa de uma conta que não é admin (ex.: cliente do
          // aluguel) não redireciona — o login segue disponível.
          const status = await AdminRepository.getAccessStatus(
            currentUser.uid,
          ).catch(() => "none" as const);
          if (status !== "admin") return;
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

      let status: AdminAccessStatus;
      try {
        status = await AdminRepository.getAccessStatus(authUser.user.uid);
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        await signOut(auth);
        addAlert("Não foi possível verificar seu acesso. Tente novamente.");
        return;
      }
      if (status !== "admin") {
        await signOut(auth);
        addAlert(
          status === "pending"
            ? "Seu acesso está aguardando a aprovação de um administrador."
            : "Esta conta não tem acesso à área do administrador.",
        );
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

  return (
    <>
      <div className="flex flex-col justify-center items-center gap-5 min-h-[100dvh] w-full px-4 py-10">
        {/* Cena de fundo viva na tela inteira (o login não usa o tema do site) */}
        <AuthBackground
          image={carcaPuzzle ? carcassonneBoardgame : AUTH_SCENE.image}
          lights={carcaPuzzle ? [] : AUTH_SCENE.lights}
        />

        {/* ── LOGIN CARD ── */}
        <AuthCard
          eyebrow="Área do administrador"
          onSubmit={validateAccount}
          footer={
            <>
              Ainda não tem acesso?{" "}
              <AuthLink onClick={() => router.push("/signup")}>Criar conta</AuthLink>
            </>
          }
        >
          <Input
            icon={<FiMail size={17} />}
            label="E-mail"
            placeholder="E-mail"
            type="email"
            value={user.email}
            setValue={(e) => setUser({ ...user, email: e.target.value })}
          />
          <div className="flex flex-col gap-2">
            <Input
              icon={<FiLock size={17} />}
              label="Senha"
              placeholder="Senha"
              type="password"
              value={user.password}
              setValue={(e) => setUser({ ...user, password: e.target.value })}
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              className="self-end cursor-pointer text-[11px] text-primary-gold/45 transition-colors hover:text-primary-gold"
            >
              Esqueci minha senha
            </button>
          </div>
          <AuthSubmit loading={loading}>Entrar</AuthSubmit>
        </AuthCard>

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
