"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiLock } from "react-icons/fi";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import Input from "@/components/input";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink, AuthSubmit } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";

type Status =
  | "loading"
  | "verified"
  | "form"
  | "reset-done"
  | "invalid";

function ActionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  const loginPath = params.get("from") === "aluguel" ? "/aluguel/entrar" : "/";

  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!oobCode || (mode !== "verifyEmail" && mode !== "resetPassword")) {
        setStatus("invalid");
        return;
      }
      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          if (!cancelled) setStatus("verified");
        } else {
          const accountEmail = await verifyPasswordResetCode(auth, oobCode);
          if (cancelled) return;
          setEmail(accountEmail);
          setStatus("form");
        }
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode]);

  async function submitNewPassword() {
    if (!oobCode) return;
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem!");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("reset-done");
    } catch {
      setStatus("invalid");
    } finally {
      setSaving(false);
    }
  }

  const goLogin = () => router.push(loginPath);
  const footer = <AuthLink onClick={goLogin}>Ir para o login</AuthLink>;

  const message = (text: string) => (
    <p className="text-center text-sm leading-relaxed text-primary-gold/70">
      {text}
    </p>
  );

  if (status === "form") {
    return (
      <AuthCard
        eyebrow="Nova senha"
        onSubmit={submitNewPassword}
        footer={footer}
      >
        {message(`Crie uma nova senha para ${email}.`)}
        <Input
          icon={<FiLock size={17} />}
          label="Nova senha"
          placeholder="Nova senha"
          type="password"
          value={password}
          setValue={(e) => setPassword(e.target.value)}
        />
        <Input
          icon={<FiLock size={17} />}
          label="Confirmar senha"
          placeholder="Confirmar senha"
          type="password"
          value={confirm}
          setValue={(e) => setConfirm(e.target.value)}
        />
        {error && <span className="pl-1 text-[12px] text-red-400">{error}</span>}
        <AuthSubmit loading={saving}>Salvar nova senha</AuthSubmit>
      </AuthCard>
    );
  }

  if (status === "loading") {
    return (
      <AuthCard eyebrow="Conta" onSubmit={() => {}} footer={footer}>
        {message("Verificando o link...")}
      </AuthCard>
    );
  }

  if (status === "verified" || status === "reset-done") {
    return (
      <AuthCard
        eyebrow="Conta"
        onSubmit={goLogin}
        footer={footer}
      >
        {message(
          status === "verified"
            ? "E-mail confirmado!"
            : "Senha alterada com sucesso! Agora é só entrar com a nova senha.",
        )}
        <AuthSubmit loading={false}>Ir para o login</AuthSubmit>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Conta" onSubmit={goLogin} footer={footer}>
      {message("Este link é inválido ou expirou.")}
      <AuthSubmit loading={false}>Pedir novo link</AuthSubmit>
    </AuthCard>
  );
}

export default function AccountActionPage() {
  return (
    <div className="flex flex-col justify-center items-center gap-5 min-h-[100dvh] w-full px-4 py-10">
      <AuthBackground image={AUTH_SCENE.image} lights={AUTH_SCENE.lights} />
      <Suspense fallback={null}>
        <ActionContent />
      </Suspense>
    </div>
  );
}
