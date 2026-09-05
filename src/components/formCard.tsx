"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { LuTrash, LuX } from "react-icons/lu";
import Loader from "./loader";

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
      className={`bg-secondary-black/95 border border-primary-gold/20 rounded-none sm:rounded-2xl w-full sm:w-[92vw] h-full sm:h-auto max-w-none ${maxWidth} max-h-full sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-primary-gold/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-10 h-10 rounded-lg bg-primary-gold/5 border border-primary-gold/15 flex items-center justify-center shrink-0 text-primary-gold">
              {icon}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-primary-gold truncate">
              {title}
            </span>
            {subtitle && (
              <span className="text-[11px] text-primary-gold/40 truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg border border-primary-gold/20 hover:border-primary-gold/50 text-primary-gold/60 hover:text-primary-gold transition-all cursor-pointer shrink-0"
        >
          <LuX size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
        {children}
      </div>

      {/* ── Footer ── */}
      {!hideFooter && (
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-primary-gold/10 shrink-0">
          {onDelete && (
            <button
              onClick={() => {
                if (confirmingDelete) onDelete();
                else setConfirmingDelete(true);
              }}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer disabled:opacity-40 ${
                confirmingDelete
                  ? "bg-invalid-color/15 border-invalid-color/50 text-invalid-color"
                  : "border-primary-gold/15 text-primary-gold/40 hover:border-invalid-color/40 hover:text-invalid-color"
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
            className="px-3.5 py-2 rounded-lg border border-primary-gold/15 text-primary-gold/40 hover:text-primary-gold hover:border-primary-gold/40 text-xs font-medium transition-all cursor-pointer disabled:opacity-40"
          >
            Cancelar
          </button>
          {onSubmit && (
            <button
              onClick={onSubmit}
              disabled={loading || submitDisabled}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-gold/15 border border-primary-gold/40 text-primary-gold text-xs font-semibold hover:bg-primary-gold/25 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? <Loader /> : submitLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
