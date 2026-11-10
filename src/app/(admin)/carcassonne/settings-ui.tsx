"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LuCheck, LuInfo, LuTriangleAlert, LuX } from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import GeneralConfigsRepository from "@/services/repositories/GeneralConfigsRepository ";
import type { GeneralConfigsType } from "@/types";
import { patternGeneralConfigs } from "@/utils/patternValues";

// Peças compartilhadas pelos painéis de configuração, que aparecem tanto em
// Configurações quanto na página de cada área (ex.: Reservas).

export function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        saved
          ? "border-green-600/50 text-green-500 bg-green-600/10"
          : "border-primary-gold/30 text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold hover:bg-primary-gold/5"
      }`}
    >
      {saving ? (
        <span className="animate-pulse">Salvando...</span>
      ) : saved ? (
        <>
          <LuCheck size={14} />
          Salvo
        </>
      ) : (
        "Salvar"
      )}
    </button>
  );
}

/** Onde mais a mesma configuração aparece (é a mesma: mudar num lugar muda no outro). */
export interface AlsoIn {
  label: string;
  href: string;
}

export function AlsoInNote({ alsoIn }: { alsoIn?: AlsoIn }) {
  if (!alsoIn) return null;
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-primary-gold/40">
      <LuInfo size={12} className="shrink-0" />
      <span>
        Também disponível em{" "}
        <Link href={alsoIn.href} className="underline underline-offset-2 hover:text-primary-gold">
          {alsoIn.label}
        </Link>
        {" "}— é a mesma configuração.
      </span>
    </p>
  );
}

/** Cartão de uma seção de configurações, com o aviso de alterações e o botão Salvar no rodapé. */
/** Botão "i" ao lado do título: abre a explicação (o que é, onde aparece). */
export function InfoToggle({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Fechar explicação" : `O que é "${title}"?`}
        title="O que é isso?"
        // Só o ícone, sem círculo em volta
        className={`flex items-center justify-center p-0.5 rounded-md transition-colors cursor-pointer ${
          open ? "text-primary-gold" : "text-primary-gold/45 hover:text-primary-gold"
        }`}
      >
        {open ? <LuX size={15} /> : <LuInfo size={16} />}
      </button>
      {open && (
        <div className="basis-full mt-1 flex flex-col gap-1.5 rounded-lg border border-primary-gold/20 bg-primary-gold/[0.05] p-3 text-xs leading-relaxed text-primary-gold/75 [&_strong]:text-primary-gold">
          {children}
        </div>
      )}
    </>
  );
}

export function SettingsPanel({
  title,
  info,
  alsoIn,
  dirty,
  saving,
  saved,
  onSave,
  children,
  className = "",
}: {
  title: string;
  /** Explicação aberta pelo "i" ao lado do título. */
  info?: ReactNode;
  alsoIn?: AlsoIn;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col rounded-xl border border-primary-gold/15 bg-secondary-black/40 overflow-hidden ${className}`}>
      <div className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold uppercase tracking-widest text-primary-gold/45">{title}</span>
            {info && <InfoToggle title={title}>{info}</InfoToggle>}
          </div>
          <AlsoInNote alsoIn={alsoIn} />
        </div>
        {children}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-primary-gold/10 bg-primary-black/20">
        {dirty && !saving ? (
          <span className="flex items-center gap-1.5 text-xs text-yellow-400/90">
            <LuTriangleAlert size={13} className="shrink-0" />
            Você tem alterações não salvas
          </span>
        ) : (
          <span />
        )}
        <SaveButton saving={saving} saved={saved} onClick={onSave} />
      </div>
    </div>
  );
}

// Opções liga/desliga que ainda não existem no banco valem como desligadas.
const sameConfig = (a: unknown, b: unknown) =>
  typeof a === "boolean" || typeof b === "boolean" ? !!a === !!b : JSON.stringify(a) === JSON.stringify(b);

/**
 * Carrega o documento de configurações gerais e salva SÓ os campos desta
 * seção — reservas, efeitos e temas moram no mesmo documento e um painel não
 * pode desfazer o que outro salvou.
 */
export function useGeneralConfigSection<K extends keyof GeneralConfigsType>(fields: readonly K[]) {
  const { addAlert } = useAlert();
  const [configs, setConfigs] = useState<GeneralConfigsType>(patternGeneralConfigs);
  const [snapshot, setSnapshot] = useState<GeneralConfigsType>(patternGeneralConfigs);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    GeneralConfigsRepository.get().then((c) => {
      if (!alive) return;
      if (!c?._id) {
        addAlert("Não foi possível carregar as configurações.");
        return;
      }
      setConfigs(c);
      setSnapshot(c);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
    // Carrega uma vez ao abrir o painel.
  }, []);

  const set = useCallback((patch: Partial<GeneralConfigsType>) => setConfigs((c) => ({ ...c, ...patch })), []);

  const dirty = loaded && fields.some((f) => !sameConfig(configs[f], snapshot[f]));

  const save = async () => {
    if (!loaded || saving) return;
    setSaving(true);
    // Campos ausentes ficam de fora (o Firestore recusa `undefined`).
    const data = Object.fromEntries(
      fields.filter((f) => configs[f] !== undefined).map((f) => [f, configs[f]]),
    ) as Partial<GeneralConfigsType>;
    const ok = await GeneralConfigsRepository.update(data);
    setSaving(false);
    if (!ok) {
      addAlert("Erro ao salvar as configurações. Tente novamente.");
      return;
    }
    setSnapshot((s) => ({ ...s, ...data }));
    setSaved(true);
    addAlert("Configurações salvas com sucesso!");
    setTimeout(() => setSaved(false), 2500);
  };

  return { configs, set, loaded, dirty, saving, saved, save };
}
