"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LuConstruction, LuLock, LuX } from "react-icons/lu";

const PASSWORD = "1235";

/**
 * Tela "Em desenvolvimento" com senha fixa de testes. Liberada uma vez, vale
 * até fechar a aba (por área: cada `storageKey` libera a sua). Para liberar a
 * funcionalidade de vez, é só tirar o `<ConstructionGate>` em volta dela.
 */
export default function ConstructionGate({
  children,
  title,
  description = "Esta funcionalidade está em desenvolvimento e ainda não está disponível.",
  storageKey,
  onCancel,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  storageKey: string;
  /** Mostra a senha numa janela por cima da página (com botão de fechar). */
  onCancel?: () => void;
}) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let saved = false;
    try {
      saved = sessionStorage.getItem(storageKey) === "1";
    } catch {
      // armazenamento bloqueado: pede a senha de novo
    }
    setUnlocked(saved);
  }, [storageKey]);

  useEffect(() => {
    if (!onCancel || unlocked !== false) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, unlocked]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value !== PASSWORD) {
      setError(true);
      return;
    }
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // segue liberado só nesta visita
    }
    setUnlocked(true);
  };

  if (unlocked === null) return null;
  if (unlocked) return <>{children}</>;

  const form = (
    <form
      onSubmit={submit}
      onClick={(e) => e.stopPropagation()}
      className="relative flex flex-col items-center gap-4 w-full max-w-sm rounded-2xl border border-primary-gold/20 bg-secondary-black/95 p-6 text-center"
    >
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar"
          className="absolute right-3 top-3 text-primary-gold/55 hover:text-primary-gold cursor-pointer"
        >
          <LuX size={18} />
        </button>
      )}
      <LuConstruction size={40} className="text-primary-gold/70" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-primary-gold">{title}</h1>
        <p className="text-sm text-primary-gold/70">{description}</p>
      </div>
      <label className="flex flex-col gap-1.5 w-full text-left">
        <span className="text-xs text-primary-gold/55">Senha de acesso para testes</span>
        <div
          className={`flex items-center gap-2 rounded-xl border bg-primary-black px-3 h-11 ${
            error ? "border-invalid-color/60" : "border-primary-gold/20 focus-within:border-primary-gold/60"
          }`}
        >
          <LuLock size={14} className="text-primary-gold/40 shrink-0" />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            aria-label="Senha de acesso"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            className="flex-1 min-w-0 bg-transparent text-sm text-primary-gold outline-none"
          />
        </div>
        {error && <span className="text-xs text-invalid-color">Senha incorreta.</span>}
      </label>
      <button
        type="submit"
        disabled={!value}
        className="w-full h-10 rounded-xl bg-primary-gold text-primary-black text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Entrar
      </button>
    </form>
  );

  if (onCancel)
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b0907]/55 px-4 backdrop-blur-md"
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {form}
      </div>
    );

  return <section className="flex w-full h-full items-center justify-center px-4 py-10">{form}</section>;
}
