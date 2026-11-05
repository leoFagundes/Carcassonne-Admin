"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLock, FiMail } from "react-icons/fi";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Input from "@/components/input";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";
import { useAlert } from "@/contexts/alertProvider";
import { auth } from "@/services/firebaseConfig";
import { accountApi } from "@/services/rentalApi";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { DEFAULT_RENTAL_SETTINGS } from "@/rental/defaults";
import type { RentalSettingsType } from "@/types";
import ProfileForm from "../profileForm";
import { useRentalCustomer } from "../useRentalCustomer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CadastroPage() {
  const router = useRouter();
  const { addAlert } = useAlert();
  const { user, customer, loading } = useRentalCustomer();
  const [settings, setSettings] = useState<RentalSettingsType>(DEFAULT_RENTAL_SETTINGS);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Durante a criação da conta o usuário já fica logado; sem isto a tela
  // trocaria para o formulário de perfil antes de terminar o fluxo.
  const [creating, setCreating] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => RentalConfigRepository.subscribeSettings(setSettings), []);

  // Quem já tem cadastro não tem o que fazer aqui.
  useEffect(() => {
    if (customer && !creating && !finished) router.replace("/aluguel/minha-conta");
  }, [customer, creating, finished, router]);

  async function createAccount(): Promise<boolean> {
    if (!EMAIL_RE.test(email)) {
      addAlert("Por favor, insira um e-mail válido!");
      return false;
    }
    if (password.length < 6) {
      addAlert("A senha precisa ter pelo menos 6 caracteres.");
      return false;
    }
    if (password !== confirmPassword) {
      addAlert("As senhas não coincidem!");
      return false;
    }
    setCreating(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: unknown) {
      setCreating(false);
      const code = (error as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        addAlert("Este e-mail já está cadastrado. Entre na sua conta.");
      } else if (code === "auth/weak-password") {
        addAlert("A senha é muito fraca. Use pelo menos 6 caracteres.");
      } else {
        console.error("Erro ao criar conta:", error);
        addAlert("Não foi possível criar a conta. Tente novamente.");
      }
      return false;
    }
  }

  async function afterSaved() {
    setFinished(true);
    setCreating(false);
    if (!auth.currentUser?.emailVerified) {
      const verification = await accountApi.sendVerification("aluguel");
      if (!verification.ok) {
        addAlert(
          "Cadastro salvo, mas não foi possível enviar o e-mail de confirmação. Reenvie na sua conta.",
        );
      }
    }
    router.replace("/aluguel/minha-conta");
  }

  // Logado, mas sem cadastro (ex.: o CPF já estava em uso): só o perfil.
  const profileOnly = !!user && !customer && !creating;

  return (
    <div className="flex flex-col justify-center items-center gap-5 min-h-[100dvh] w-full px-4 py-10">
      <AuthBackground image={AUTH_SCENE.image} lights={AUTH_SCENE.lights} />

      <AuthCard
        eyebrow={profileOnly ? "Complete seu cadastro" : "Nova conta de cliente"}
        onSubmit={() => {}}
        footer={
          profileOnly ? (
            <>Conta: {user?.email}</>
          ) : (
            <>
              Já tem uma conta?{" "}
              <AuthLink onClick={() => router.push("/aluguel/entrar")}>Entrar</AuthLink>
            </>
          )
        }
      >
        {loading ? (
          <span className="text-center text-xs text-primary-gold/50">Carregando...</span>
        ) : profileOnly ? (
          <ProfileForm
            requireCpf={settings.requireCpf}
            requireTerms
            submitLabel="Concluir cadastro"
            onSaved={afterSaved}
          />
        ) : (
          <ProfileForm
            requireCpf={settings.requireCpf}
            requireTerms
            submitLabel="Criar conta"
            onBeforeSave={createAccount}
            onSaveFailed={() => setCreating(false)}
            onSaved={afterSaved}
            extraFields={
              <>
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
                <Input
                  icon={<FiLock size={17} />}
                  label="Confirmar senha"
                  placeholder="Confirmar senha"
                  type="password"
                  value={confirmPassword}
                  setValue={(e) => setConfirmPassword(e.target.value)}
                />
              </>
            }
          />
        )}
      </AuthCard>
    </div>
  );
}
