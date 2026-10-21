"use client";

import Input from "@/components/input";
import { useState } from "react";
import { FiKey, FiLock, FiMail } from "react-icons/fi";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/services/firebaseConfig";
import { User } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink, AuthSubmit } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";

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

  return (
    <div className="flex flex-col justify-center items-center gap-5 min-h-[100dvh] w-full px-4 py-10">
      {/* Cena de fundo viva na tela inteira (o cadastro não usa o tema do site) */}
      <AuthBackground image={AUTH_SCENE.image} lights={AUTH_SCENE.lights} />

      <AuthCard
        eyebrow="Nova conta de administrador"
        onSubmit={createAccount}
        footer={
          <>
            Já tem uma conta? <AuthLink onClick={() => router.push("/")}>Entrar</AuthLink>
          </>
        }
      >
        <Input
          icon={<FiMail size={17} />}
          label="E-mail"
          placeholder="E-mail"
          type="email"
          value={newUser.email}
          setValue={(e) => setNewUser({ ...newUser, email: e.target.value })}
        />
        <Input
          icon={<FiLock size={17} />}
          label="Senha"
          placeholder="Senha"
          type="password"
          value={newUser.password}
          setValue={(e) => setNewUser({ ...newUser, password: e.target.value })}
        />
        <Input
          icon={<FiLock size={17} />}
          label="Confirmar senha"
          placeholder="Confirmar senha"
          type="password"
          value={confirmPassword}
          setValue={(e) => setConfirmPassword(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <Input
            icon={<FiKey size={17} />}
            label="Token de criação"
            placeholder="Token de criação"
            type="password"
            value={creationToken}
            setValue={(e) => setCreationToken(e.target.value)}
          />
          <span className="pl-1 text-[11px] text-primary-gold/35">
            Fornecido pela administração do Carcassonne Pub.
          </span>
        </div>
        <AuthSubmit loading={loading}>Criar conta</AuthSubmit>
      </AuthCard>
    </div>
  );
}
