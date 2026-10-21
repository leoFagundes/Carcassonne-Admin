"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

/**
 * Card do login e do cadastro: logo, nome da casa, o formulário e um rodapé
 * com o link para a outra tela. O Enter envia o formulário (onSubmit).
 */
export default function AuthCard({
  eyebrow,
  onSubmit,
  footer,
  children,
}: {
  /** Linha pequena sob o nome (ex: "Área do administrador"). */
  eyebrow: string;
  onSubmit: () => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}</style>

      <section className="auth-card relative w-full max-w-[380px] overflow-hidden rounded-2xl border border-primary-gold/20 bg-[#0c0a08]/80 text-primary-gold backdrop-blur-md shadow-[0_30px_80px_-12px_rgba(0,0,0,0.8)]">
        {/* Filete dourado e um brilho suave no topo */}
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-gold/70 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -top-28 h-56 w-80 -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(230,197,107,0.13),transparent_70%)]"
        />

        <div className="relative flex flex-col gap-7 px-7 pt-9 pb-8 sm:px-9">
          <header className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <h1 className="font-cinzel text-[22px] font-semibold uppercase tracking-[0.16em] text-primary-gold leading-none">
                Carcassonne Pub
              </h1>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary-gold/40" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary-gold/50">
                  {eyebrow}
                </span>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary-gold/40" />
              </div>
            </div>
          </header>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="flex flex-col gap-4"
          >
            {children}
          </form>
        </div>

        <div className="relative border-t border-primary-gold/10 bg-black/25 px-7 py-4 text-center text-xs text-primary-gold/45">
          {footer}
        </div>
      </section>

      <p className="auth-card-note text-[10px] uppercase tracking-[0.22em] text-primary-gold/35">
        © {new Date().getFullYear()} Carcassonne Pub ·{" "}
        <Link
          href="/linktree"
          className="text-primary-gold/55 transition-colors hover:text-primary-gold"
        >
          Ir para o site
        </Link>
      </p>
    </>
  );
}

/** Botão principal do card: dourado sólido, com o carregamento por dentro. */
export function AuthSubmit({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group mt-1 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f0d382] to-primary-gold text-sm font-bold tracking-wide text-primary-black shadow-[0_10px_26px_-6px_rgba(230,197,107,0.45)] transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
    >
      {loading ? (
        <span
          aria-label="Carregando"
          className="h-4 w-4 animate-spin rounded-full border-2 border-primary-black/25 border-t-primary-black"
        />
      ) : (
        <>
          {children}
          <FiArrowRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </>
      )}
    </button>
  );
}

/** Link de texto do rodapé do card (ex: "Criar conta"). */
export function AuthLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer font-semibold text-primary-gold/85 underline-offset-4 transition-colors hover:text-primary-gold hover:underline"
    >
      {children}
    </button>
  );
}
