"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuCamera, LuImage, LuImagePlus, LuRefreshCw, LuTrash2, LuX } from "react-icons/lu";
import type { ShelfPhoto } from "@/floorplan/shelves";

/**
 * Foto de referência (como o armário ou a prateleira deve ficar). Não aparece
 * de cara: só um botão; a foto abre grande ao tocar, com trocar e apagar.
 *
 * - `button`: botão com texto (no painel), também para adicionar a primeira foto.
 * - `icon`: só um ícone de câmera, e só quando já tem foto (no desenho do armário).
 */
export default function ReferencePhoto({
  photo,
  what,
  onSave,
  onRemove,
  variant = "button",
  className = "",
}: {
  photo?: ShelfPhoto;
  /** "do armário", "desta prateleira"… */
  what: string;
  onSave: (file: File) => Promise<void>;
  onRemove: () => Promise<void> | void;
  variant?: "button" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmDel(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  useEffect(() => setLoaded(false), [photo?.url]);

  const pick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(file);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível enviar a foto. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  const input = <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onFile} />;

  if (variant === "icon" && !photo) return null;

  return (
    <>
      {input}
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          title={`Ver a foto de referência ${what}`}
          aria-label={`Ver a foto de referência ${what}`}
          className={`flex items-center justify-center rounded-md border border-primary-gold/30 bg-[#14110e]/85 text-primary-gold/80 shadow transition-colors hover:border-primary-gold/70 hover:text-primary-gold ${className}`}
        >
          <LuCamera size={13} />
        </button>
      ) : (
        <span className={`flex flex-col gap-1 ${className}`}>
          <button
            type="button"
            disabled={busy}
            onClick={() => (photo ? setOpen(true) : pick())}
            className="flex items-center gap-1.5 self-start text-[11px] text-primary-gold/65 underline-offset-2 hover:text-primary-gold hover:underline disabled:opacity-60"
          >
            {photo ? <LuImage size={13} /> : <LuImagePlus size={13} />}
            {busy ? "Enviando a foto…" : photo ? `Ver a foto de referência ${what}` : `Adicionar foto de referência ${what}`}
          </button>
          {error && <span className="text-[11px] text-invalid-color">{error}</span>}
        </span>
      )}

      {open &&
        photo &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-3 bg-[#0b0907]/85 p-3 backdrop-blur-sm [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] [padding-top:max(0.75rem,env(safe-area-inset-top))]"
            role="dialog"
            aria-modal="true"
            aria-label={`Foto de referência ${what}`}
            onClick={() => setOpen(false)}
          >
            <div className="flex w-full max-w-4xl items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <span className="truncate text-sm font-bold text-primary-gold">Foto de referência {what}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar a foto"
                title="Fechar (Esc)"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-gold/30 text-primary-gold/80 hover:border-primary-gold/70 hover:text-primary-gold"
              >
                <LuX size={17} />
              </button>
            </div>
            <div className="relative flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {!loaded && <span className="absolute text-xs text-primary-gold/60">Carregando a foto…</span>}
              <img
                src={photo.url}
                alt={`Foto de referência ${what}`}
                onLoad={() => setLoaded(true)}
                className={`max-h-full max-w-full rounded-lg object-contain shadow-card transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
              {confirmDel ? (
                <>
                  <span className="text-xs text-primary-gold/75">Apagar a foto?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(false)}
                    className="rounded-lg border border-primary-gold/30 px-3 py-1.5 text-xs font-semibold text-primary-gold/80 hover:text-primary-gold"
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setOpen(false);
                      await onRemove();
                    }}
                    className="rounded-lg border border-invalid-color/50 bg-invalid-color/15 px-3 py-1.5 text-xs font-semibold text-invalid-color hover:bg-invalid-color/25"
                  >
                    Apagar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={pick}
                    className="flex items-center gap-1.5 rounded-lg border border-primary-gold/40 bg-primary-gold/10 px-3 py-1.5 text-xs font-semibold text-primary-gold hover:bg-primary-gold/20 disabled:opacity-60"
                  >
                    <LuRefreshCw size={13} /> {busy ? "Enviando…" : "Trocar a foto"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-invalid-color/40 px-3 py-1.5 text-xs font-semibold text-invalid-color/90 hover:bg-invalid-color/10"
                  >
                    <LuTrash2 size={13} /> Apagar
                  </button>
                </>
              )}
            </div>
            {error && <p className="text-xs text-invalid-color">{error}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}
