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

export default function Home() {
  const [user, setUser] = useState<User>({
    email: "",
    password: " ",
  });
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
      setUser((prevUser) => ({
        ...prevUser,
        email: storedEmail,
        password: "",
      }));
    } else {
      setUser((prevUser) => ({
        ...prevUser,
        email: "",
        password: "",
      }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("carcassonneAdminEmail", user.email);
  }, [user.email]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        if (currentUser.emailVerified) {
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
        user.password
      );
      if (!authUser.user.emailVerified) {
        addAlert("Você precisa verificar seu e-mail antes de fazer login.");
        return;
      }

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
          "Digite o e-mail no respectivo campo e depois tente novamente."
        );
        return;
      }
      await sendPasswordResetEmail(auth, user.email);
      addAlert("Instruções de recuperação de senha enviadas para seu e-mail.");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Erro ao enviar e-mail de recuperação:", error.message);
        addAlert(`Não encontramos o e-mail: ${user.email}.`);
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      validateAccount();
    }
  };

  return (
    <div
      className="flex flex-col justify-center items-center gap-1 bg-cover bg-center min-h-screen max-h-screen h-screen w-full bg-primary-black"
      style={{
        backgroundImage: `url(${
          carcaPuzzle ? carcassonneBoardgame.src : carcassonneBackground.src
        })`,
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
        <Button onClick={() => validateAccount()}>
          {loading ? <Loader /> : "Entrar"}
        </Button>
      </section>
      <span
        className="text-primary-gold text-sm cursor-pointer hover:underline bg-primary-black/60 py-1 px-2 rounded"
        onClick={() => router.push("/signup")}
      >
        Criar uma conta
      </span>
      {!carcaPuzzle && <Puzzle />}
      {carcaPuzzle && (
        <>
          <div
            onClick={() => {
              const fullUrl = `${window.location.origin}/carcassonne`;
              navigator.clipboard.writeText(fullUrl);
              addAlert("Endereço copiado para a área de transferência");
            }}
            className="absolute bottom-2 left-16 text-primary-gold/50 cursor-pointer hover:text-primary-gold transition"
          >
            {`${window.location.origin}/carcassonne`}
          </div>
          <div className="abosulute w-[240px] sm:flex hidden flex-col absolute top-4 left-4 bg-primary-black/60 rounded-md shadow-card">
            <div
              className="w-full h-[200px] bg-cover bg-center rounded-t-md"
              style={{ backgroundImage: `url(${klausjurgen.src})` }}
            />
            <div className="flex flex-col gap-2 p-2">
              <span className="w-full text-center font-bold text-lg">
                Klaus-Jürgen Wrede
              </span>
              <p className="font-medium text-sm">
                Klaus-Jürgen Wrede é um designer de jogos alemão, mais conhecido
                por ter criado o famoso jogo de tabuleiro Carcassonne, lançado
                em 2000. O jogo se destacou pela sua mecânica inovadora de
                colocação de peças (tiles) e controle de áreas, se tornando um
                clássico moderno e ganhando o prestigiado prêmio Spiel des
                Jahres em 2001.
              </p>
            </div>
          </div>

          <div className="abosulute w-[240px] sm:flex hidden flex-col absolute bottom-4 right-4 bg-primary-black/60 rounded-md shadow-card">
            <div className="flex flex-col gap-2 p-2">
              <span className="w-full text-center font-bold text-lg">
                Fábio Almeida e Salimar Morais
              </span>
              <p className="font-medium text-sm">
                O Carcassonne Pub, pioneiro em jogos de tabuleiro no Distrito
                Federal, foi fundado por Fábio Almeida e Salimar Morais em maio
                de 2013, casal apaixonado por jogos e gastronomia. A inspiração
                surgiu durante uma viagem à Europa, onde observaram pubs com
                estantes de livros disponíveis para os clientes. Eles adaptaram
                essa ideia, substituindo os livros por jogos de tabuleiro,
                criando um ambiente que promove a interação presencial entre as
                pessoas.
              </p>
            </div>
            <div
              className="w-full h-[200px] bg-cover bg-center rounded-b-md"
              style={{ backgroundImage: `url(${fabiosali.src})` }}
            />
          </div>

          <div
            onClick={() => {
              localStorage.setItem("carcaPuzzle", "false");
              window.location.reload();
            }}
            className="absolute bottom-2 bg-primary-black/60 py-2 px-3 rounded-md shadow-card cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <FiArrowLeft className="min-w-[16px]" size={"16px"} /> Voltar a
              visão padrão!
            </span>
          </div>
        </>
      )}
    </div>
  );
}
