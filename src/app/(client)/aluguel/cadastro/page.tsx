"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiLock, FiMail } from "react-icons/fi";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import Input from "@/components/input";
import AuthBackground from "@/components/authBackground";
import AuthCard, { AuthLink } from "@/components/authCard";
import { AUTH_SCENE } from "@/utils/authScene";
import { useAlert } from "@/contexts/alertProvider";
import { auth } from "@/services/firebaseConfig";
import { accountApi } from "@/services/rentalApi";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { DEFAULT_RENTAL_SETTINGS } from "@/rental/defaults";
import { safeNextPath, withNext } from "@/rental/navigation";
import type { RentalSettingsType } from "@/types";
import ProfileForm from "../profileForm";
import { useRentalCustomer } from "../useRentalCustomer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CadastroCard() {
  const router = useRouter();
  const params = useSearchParams();
  const { addAlert } = useAlert();
  // Destino de quem veio de outra página (ex.: o pedido) — só lido em
  // handlers/efeitos, onde window existe.
  const nextPath = () => safeNextPath(params.get("next"), window.location.origin);
  const { user, customer, loading } = useRentalCustomer();
  const [settings, setSettings] = useState<RentalSettingsType>(DEFAULT_RENTAL_SETTINGS);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Durante a criação da conta o usuário já fica logado; sem isto a tela
  // trocaria para o formulário de perfil antes de terminar o fluxo.
  const [creating, setCreating] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const submitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!loading) setLoadedOnce(true);
  }, [loading]);

  useEffect(() => RentalConfigRepository.subscribeSettings(setSettings), []);

  // Quem já tem cadastro não tem o que fazer aqui.
  useEffect(() => {
    if (customer && !creating && !finished) {
      router.replace(safeNextPath(params.get("next"), window.location.origin) ?? "/aluguel/minha-conta");
    }
  }, [customer, creating, finished, router, params]);

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
    router.replace(nextPath() ?? "/aluguel/minha-conta");
  }

  // Logado, mas sem cadastro (ex.: o CPF já estava em uso): só o perfil.
  const profileOnly = !!user && !customer && !creating;
  // O formulário nunca volta ao "Carregando": o login do Firebase no meio do
  // cadastro faria ele remontar e apagar o que foi digitado.
  const showLoading = loading && !creating && !loadedOnce;

  return (
    <div className="flex flex-col justify-center items-center gap-5 min-h-[100dvh] w-full px-4 py-10">
      <AuthBackground image={AUTH_SCENE.image} lights={AUTH_SCENE.lights} />

      <AuthCard
        eyebrow={profileOnly ? "Complete seu cadastro" : "Nova conta de cliente"}
        onSubmit={() => submitRef.current?.()}
        footer={
          profileOnly ? (
            <>
              Não é você?{" "}
              <AuthLink onClick={() => void signOut(auth)}>Sair e criar outra conta</AuthLink>
            </>
          ) : (
            <>
              Já tem uma conta?{" "}
              <AuthLink onClick={() => router.push(withNext("/aluguel/entrar", nextPath()))}>
                Entrar
              </AuthLink>
            </>
          )
        }
      >
        {/* Já logado (ex.: conta de admin ou cadastro interrompido): só falta o perfil.
            Diz isso claramente, senão parece que a página "não pede e-mail". */}
        {profileOnly && (
          <p className="rounded-lg border border-primary-gold/20 bg-primary-gold/[0.06] px-3 py-2 text-xs leading-relaxed text-primary-gold/80">
            Você já entrou com <strong className="break-all text-primary-gold">{user?.email}</strong>. Falta só
            preencher seus dados para alugar. Quer usar outro e-mail? Toque em “Sair e criar outra conta” lá embaixo.
          </p>
        )}
        {showLoading ? (
          <span className="text-center text-xs text-primary-gold/50">Carregando...</span>
        ) : (
          <ProfileForm
            embedded
            submitRef={submitRef}
            requireCpf={settings.requireCpf}
            requireTerms
            submitLabel={profileOnly ? "Concluir cadastro" : "Criar conta"}
            onBeforeSave={profileOnly ? undefined : createAccount}
            onSaveFailed={() => setCreating(false)}
            onSaved={afterSaved}
            extraFields={
              profileOnly ? undefined : (
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
              )
            }
          />
        )}
      </AuthCard>
      <Link
        href="/aluguel"
        className="relative z-10 flex items-center gap-1.5 text-sm text-primary-gold/70 hover:text-primary-gold"
      >
        <FiArrowLeft size={15} /> Voltar aos jogos
      </Link>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroCard />
    </Suspense>
  );
}
