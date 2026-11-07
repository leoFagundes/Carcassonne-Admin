"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LuConstruction, LuLock } from "react-icons/lu";

const PASSWORD = "1235";
const STORAGE_KEY = "carcassonne-aluguel-admin-unlocked";

export default function ConstructionGate({
  children,
}: {
  children: ReactNode;
}) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  // Liberado uma vez, vale até fechar a aba.
  useEffect(() => {
    let saved = false;
    try {
      saved = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // armazenamento bloqueado: pede a senha de novo
    }
    setUnlocked(saved);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value !== PASSWORD) {
      setError(true);
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // segue liberado só nesta visita
    }
    setUnlocked(true);
  };

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  return (
    <section className="flex w-full h-full items-center justify-center px-4 py-10">
      <form
        onSubmit={submit}
        className="flex flex-col items-center gap-4 w-full max-w-sm rounded-2xl border border-primary-gold/20 bg-secondary-black/60 p-6 text-center"
      >
        <LuConstruction size={40} className="text-primary-gold/70" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold text-primary-gold">
            Aluguel de Jogos
          </h1>
          <p className="text-sm text-primary-gold/70">
            Esta funcionalidade está em construção e ainda não está disponível.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 w-full text-left">
          <span className="text-xs text-primary-gold/55">
            Senha de acesso para testes
          </span>
          <div
            className={`flex items-center gap-2 rounded-xl border bg-primary-black px-3 h-11 ${
              error
                ? "border-invalid-color/60"
                : "border-primary-gold/20 focus-within:border-primary-gold/60"
            }`}
          >
            <LuLock size={14} className="text-primary-gold/40 shrink-0" />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              className="flex-1 min-w-0 bg-transparent text-sm text-primary-gold outline-none"
            />
          </div>
          {error && (
            <span className="text-xs text-invalid-color">Senha incorreta.</span>
          )}
        </label>
        <button
          type="submit"
          disabled={!value}
          className="w-full h-10 rounded-xl bg-primary-gold text-primary-black text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Entrar
        </button>
      </form>
    </section>
  );
}
