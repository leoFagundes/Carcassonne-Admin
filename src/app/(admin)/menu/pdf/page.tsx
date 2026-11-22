"use client";

import LoaderFullscreen from "@/components/loaderFullscreen";
import Loader from "@/components/loader";
import { useAlert } from "@/contexts/alertProvider";
import { usePubInfo } from "@/contexts/siteConfigProvider";
import ComboRepository from "@/services/repositories/ComboRepository";
import DescriptionRepository from "@/services/repositories/DescriptionTypeRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import { buildMenuModel, type MenuModel } from "@/menuPdf/model";
import { browserLabel, generateMenuPdf, type GenerateStep } from "@/menuPdf/generate";
import type { PdfTheme } from "@/menuPdf/theme";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiSkipBack } from "react-icons/fi";
import { LuDownload, LuExternalLink, LuFileText, LuRefreshCw, LuTriangleAlert } from "react-icons/lu";

type Status =
  | { kind: "idle" }
  | { kind: "working"; step: GenerateStep | null }
  | { kind: "ready"; url: string; pages: number; size: number }
  | { kind: "error"; message: string };

const FILE_NAME = "cardapio-carcassonne.pdf";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary-gold/45">{label}</span>
      <div className="flex items-center gap-1 rounded-lg border border-primary-gold/20 bg-primary-black/30 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all disabled:cursor-default ${
              value === o.value ? "bg-primary-gold/20 text-primary-gold" : "text-primary-gold/50 hover:text-primary-gold/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PDFPage() {
  const [model, setModel] = useState<MenuModel | null>(null);
  const [theme, setTheme] = useState<PdfTheme>("black");
  const [sectionPerPage, setSectionPerPage] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);
  const run = useRef(0);
  const urlRef = useRef<string | null>(null);

  const pub = usePubInfo();
  const { addAlert } = useAlert();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [typesOrder, items, combos, infos, descriptions] = await Promise.all([
          TypesOrderRepository.getAll(),
          MenuItemRepository.getAll(),
          ComboRepository.getAll(),
          InfoRepository.getAll(),
          DescriptionRepository.getAll(),
        ]);
        setModel(buildMenuModel({ items, combos, infos, descriptions, typesOrder }));
      } catch (error) {
        addAlert(`Erro ao carregar o cardápio: ${error}`);
        setStatus({ kind: "error", message: `Não carregou o cardápio (${error instanceof Error ? error.message : String(error)}).` });
      }
    })();
  }, []);

  // Gera de novo quando muda o tema, o jeito das seções ou as informações do pub
  useEffect(() => {
    if (!model) return;
    const me = ++run.current;
    setStatus({ kind: "working", step: null });
    generateMenuPdf({
      model,
      theme,
      pub,
      sectionPerPage,
      onStep: (step) => run.current === me && setStatus({ kind: "working", step }),
    })
      .then(({ blob, pages }) => {
        if (run.current !== me) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setStatus({ kind: "ready", url, pages, size: blob.size });
      })
      .catch((err) => {
        if (run.current !== me) return;
        console.error("[cardápio PDF]", err);
        const detail = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message: detail || "erro desconhecido" });
      });
  }, [model, theme, sectionPerPage, pub, attempt]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const working = status.kind === "working" || (status.kind === "idle" && !model);
  const ready = status.kind === "ready" ? status : null;

  const stepText = useMemo(() => {
    if (status.kind !== "working" || !status.step) return "Preparando…";
    if (status.step.phase === "fotos")
      return status.step.total ? `Preparando as fotos (${status.step.done} de ${status.step.total})…` : "Preparando as fotos…";
    return "Montando as páginas…";
  }, [status]);

  const sizeText = ready ? (ready.size > 1024 * 1024 ? `${(ready.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(ready.size / 1024)} KB`) : "";

  return (
    <div className="flex min-h-full flex-col items-center text-primary-gold">
      {!model && status.kind !== "error" && <LoaderFullscreen />}

      <div className="flex w-full max-w-[980px] flex-col gap-4 py-2 sm:py-4">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.back()}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-primary-gold/20 px-2.5 py-1.5 text-sm text-primary-gold/60 transition-all hover:border-primary-gold/50 hover:text-primary-gold"
          >
            <FiSkipBack size={14} /> Voltar
          </button>
          <LuFileText size={20} className="shrink-0 text-primary-gold/70" />
          <h1 className="text-lg font-semibold sm:text-xl">Cardápio em PDF</h1>
          {model && <span className="text-xs whitespace-nowrap text-primary-gold/40">{model.itemCount} itens visíveis</span>}
        </div>

        {/* Opções e ações */}
        <div className="flex flex-col gap-4 rounded-xl border border-primary-gold/15 bg-secondary-black/60 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <Segmented
              label="Fundo"
              value={theme}
              onChange={setTheme}
              disabled={!model}
              options={[
                { value: "black", label: "Preto" },
                { value: "white", label: "Branco (gasta menos tinta)" },
              ]}
            />
            <Segmented
              label="Seções"
              value={sectionPerPage ? "page" : "flow"}
              onChange={(v) => setSectionPerPage(v === "page")}
              disabled={!model}
              options={[
                { value: "flow", label: "Seguidas" },
                { value: "page", label: "Uma por página" },
              ]}
            />
            <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
              <a
                href={ready?.url}
                target="_blank"
                rel="noopener"
                aria-disabled={!ready}
                onClick={(e) => !ready && e.preventDefault()}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary-gold/20 px-3 py-2 sm:flex-none text-sm text-primary-gold/70 transition-all ${
                  ready ? "cursor-pointer hover:border-primary-gold/50 hover:text-primary-gold" : "pointer-events-none opacity-40"
                }`}
                title="Abre o PDF numa aba nova (dali dá para imprimir)"
              >
                <LuExternalLink size={15} /> Abrir
              </a>
              <a
                href={ready?.url}
                download={FILE_NAME}
                aria-disabled={!ready}
                onClick={(e) => !ready && e.preventDefault()}
                className={`flex flex-[2] items-center justify-center gap-2 rounded-lg bg-gradient-to-b sm:flex-none from-[#f0d382] to-primary-gold px-4 py-2 text-sm font-semibold text-primary-black shadow-[0_8px_20px_-8px_rgba(230,197,107,0.6)] transition-all ${
                  ready ? "cursor-pointer hover:brightness-105" : "pointer-events-none opacity-50"
                }`}
              >
                {working ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-black/25 border-t-primary-black" /> : <LuDownload size={15} />}
                Baixar PDF
              </a>
            </div>
          </div>

          {/* Situação */}
          <div className="flex min-h-5 items-center gap-2 text-xs text-primary-gold/55" aria-live="polite">
            {working && (
              <>
                <Loader />
                <span>{stepText}</span>
              </>
            )}
            {ready && (
              <span>
                Pronto · {ready.pages} {ready.pages === 1 ? "página" : "páginas"} · {sizeText}. Capa com sumário, número em cada página e um marcador
                por seção no leitor de PDF.
              </span>
            )}
          </div>

          {status.kind === "error" && (
            <div className="flex flex-col gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
              <div className="flex items-center gap-2 font-semibold">
                <LuTriangleAlert size={16} /> Não deu para gerar o PDF
              </div>
              <p className="text-xs leading-relaxed text-red-200/80">
                Se acontecer de novo, mande um print desta mensagem:
                <br />
                <code className="break-all text-red-100">{status.message}</code>
                <br />
                <span className="text-red-200/60">{typeof navigator !== "undefined" ? browserLabel() : ""}</span>
              </p>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-red-300/30 px-3 py-1.5 text-xs hover:bg-red-500/10"
              >
                <LuRefreshCw size={13} /> Tentar de novo
              </button>
            </div>
          )}
        </div>

        {/* Pré-visualização: o próprio PDF (só no computador; celular não mostra PDF dentro da página) */}
        <div className="hidden lg:block">
          <div className="relative h-[78vh] min-h-[520px] overflow-hidden rounded-xl border border-primary-gold/15 bg-[#2a2826]">
            {ready ? (
              <iframe key={ready.url} src={`${ready.url}#view=FitH`} title="Pré-visualização do cardápio em PDF" className="h-full w-full" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-primary-gold/45">
                {status.kind === "error" ? "Sem pré-visualização" : (
                  <>
                    <Loader />
                    {stepText}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-primary-gold/45 lg:hidden">
          No celular, toque em <strong className="text-primary-gold/70">Abrir</strong> para ver o PDF ou em{" "}
          <strong className="text-primary-gold/70">Baixar PDF</strong> para salvar.
        </p>
      </div>
    </div>
  );
}
