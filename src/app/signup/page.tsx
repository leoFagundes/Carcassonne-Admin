"use client";

import Input from "@/components/input";
import { useState } from "react";
import { FiLock, FiMail } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { accountApi } from "@/services/rentalApi";
import { auth } from "@/services/firebaseConfig";
import { User } from "@/types";
import { useAlert } from "@/contexts/alertProvider";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink, AuthSubmit } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";
import AdminRepository from "@/services/repositories/AdminRepository";

export default function SignUpPage() {
  const [newUser, setNewUser] = useState<User>({ email: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { addAlert } = useAlert();
  const router = useRouter();

  // A conta criada aqui não tem acesso nenhum até um admin aprovar o pedido
  // em Usuários — é isso que protege o admin, não um token no navegador.
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password,
      );
      const { user } = userCredential;
      const verification = await accountApi.sendVerification("admin");
      if (!verification.ok) {
        addAlert(
          "Conta criada, mas não foi possível enviar o e-mail de verificação. Fale com um administrador.",
        );
      }
      // Usa o e-mail como o Firebase salvou (minúsculo) — as regras comparam
      // com o e-mail do token.
      const requested = await AdminRepository.requestAccess(
        user.uid,
        user.email ?? newUser.email,
      );
      await signOut(auth);
      if (!requested) {
        addAlert(
          "Conta criada, mas não foi possível enviar o pedido de acesso. Fale com um administrador.",
        );
        router.push("/");
        return;
      }
      addAlert(
        "Conta criada! Verifique seu e-mail e aguarde um administrador aprovar seu acesso.",
      );
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
        <span className="pl-1 text-[11px] text-primary-gold/35">
          O acesso é liberado depois que um administrador aprovar seu pedido.
        </span>
        <AuthSubmit loading={loading}>Criar conta</AuthSubmit>
      </AuthCard>
    </div>
  );
}
