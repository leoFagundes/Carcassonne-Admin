"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { LuTrash, LuX } from "react-icons/lu";

interface FormCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: VoidFunction;
  children: ReactNode;
  /** Largura máxima do card no desktop (mobile é sempre tela cheia) */
  maxWidth?: string;
  /** Botão principal do rodapé; sem onSubmit o rodapé só mostra Cancelar/Excluir */
  onSubmit?: VoidFunction;
  submitLabel?: string;
  submitDisabled?: boolean;
  /** Botão Excluir com confirmação em dois cliques */
  onDelete?: VoidFunction;
  loading?: boolean;
  /** Oculta o rodapé por completo (forms com ações próprias no corpo) */
  hideFooter?: boolean;
}

export default function FormCard({
  title,
  subtitle,
  icon,
  onClose,
  children,
  maxWidth = "sm:max-w-[440px]",
  onSubmit,
  submitLabel = "Salvar",
  submitDisabled = false,
  onDelete,
  loading = false,
  hideFooter = false,
}: FormCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Excluir exige um segundo clique; volta ao normal depois de alguns segundos
  useEffect(() => {
    if (!confirmingDelete) return;
    const t = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmingDelete]);

  return (
    <div
      className={`relative bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[92vw] h-full sm:h-auto max-w-none ${maxWidth} max-h-full sm:max-h-[90vh] flex flex-col overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.6)]`}
    >
      {/* Brilho dourado no topo do cartão */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,rgba(230,197,107,0.09),transparent_70%)]"
      />

      {/* ── Header ── */}
      <div className="relative flex items-center justify-between gap-3 px-5 sm:px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-gold/20 to-primary-gold/5 border border-primary-gold/30 flex items-center justify-center shrink-0 text-primary-gold shadow-[0_0_18px_rgba(230,197,107,0.08)]">
              {icon}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-base font-semibold text-primary-gold truncate leading-tight">
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] text-primary-gold/45 truncate mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="p-2 rounded-full border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold hover:bg-primary-gold/5 transition-all cursor-pointer shrink-0"
        >
          <LuX size={16} />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="h-px shrink-0 mx-5 sm:mx-6 bg-gradient-to-r from-transparent via-primary-gold/25 to-transparent"
      />

      {/* ── Body ── */}
      <div className="relative flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-6 flex flex-col gap-4">
        {children}
      </div>

      {/* ── Footer ── */}
      {!hideFooter && (
        <div className="flex items-center gap-2 px-5 sm:px-6 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-primary-gold/10 bg-primary-black/30 shrink-0">
          {onDelete && (
            <button
              onClick={() => {
                if (confirmingDelete) onDelete();
                else setConfirmingDelete(true);
              }}
              disabled={loading}
              className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-xs font-medium transition-all cursor-pointer disabled:opacity-40 ${
                confirmingDelete
                  ? "bg-invalid-color/15 border-invalid-color/50 text-invalid-color"
                  : "border-primary-gold/15 text-primary-gold/45 hover:border-invalid-color/40 hover:text-invalid-color"
              }`}
            >
              <LuTrash size={13} />
              {confirmingDelete ? "Confirmar exclusão?" : "Excluir"}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 rounded-xl border border-primary-gold/15 text-primary-gold/55 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
          >
            Cancelar
          </button>
          {onSubmit && (
            <button
              onClick={onSubmit}
              disabled={loading || submitDisabled}
              className="flex items-center justify-center gap-1.5 h-9 min-w-[96px] px-5 rounded-xl bg-gradient-to-b from-[#f0d382] to-primary-gold text-primary-black text-xs font-bold shadow-[0_6px_18px_rgba(230,197,107,0.2)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                // Spinner escuro: o dourado do Loader some no fundo dourado
                <span
                  aria-label="Salvando"
                  className="w-4 h-4 rounded-full border-2 border-primary-black/25 border-t-primary-black animate-spin"
                />
              ) : (
                submitLabel
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
