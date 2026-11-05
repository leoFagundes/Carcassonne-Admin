"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiLock, FiMail } from "react-icons/fi";
import { signInWithEmailAndPassword } from "firebase/auth";
import Input from "@/components/input";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink, AuthSubmit } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";
import { useAlert } from "@/contexts/alertProvider";
import { auth } from "@/services/firebaseConfig";
import { accountApi } from "@/services/rentalApi";

/** Só aceita caminhos do próprio site (evita redirecionar para outro domínio). */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
    return next;
  }
  return "/aluguel";
}

function LoginCard() {
  const router = useRouter();
  const params = useSearchParams();
  const { addAlert } = useAlert();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email || !password) {
      addAlert("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace(safeNext(params.get("next")));
    } catch {
      addAlert("E-mail ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!email) {
      addAlert("Digite o e-mail no respectivo campo e depois tente novamente.");
      return;
    }
    const result = await accountApi.sendPasswordReset(email, "aluguel");
    addAlert(
      result.ok ? "Se o e-mail estiver cadastrado, enviaremos as instruções." : result.message,
    );
  }

  return (
    <AuthCard
      eyebrow="Aluguel de jogos"
      onSubmit={login}
      footer={
        <>
          Não tem conta?{" "}
          <AuthLink onClick={() => router.push("/aluguel/cadastro")}>Criar conta</AuthLink>
        </>
      }
    >
      <Input
        icon={<FiMail size={17} />}
        label="E-mail"
        placeholder="E-mail"
        type="email"
        value={email}
        setValue={(e) => setEmail(e.target.value)}
      />
      <Input
        icon={<FiLock size={17} />}
        label="Senha"
        placeholder="Senha"
        type="password"
        value={password}
        setValue={(e) => setPassword(e.target.value)}
      />
      <div className="flex justify-end">
        <AuthLink onClick={forgotPassword}>Esqueci minha senha</AuthLink>
      </div>
      <AuthSubmit loading={loading}>Entrar</AuthSubmit>
    </AuthCard>
  );
}

export default function EntrarPage() {
  return (
    <div className="flex flex-col justify-center items-center gap-5 min-h-[100dvh] w-full px-4 py-10">
      <AuthBackground image={AUTH_SCENE.image} lights={AUTH_SCENE.lights} />
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
