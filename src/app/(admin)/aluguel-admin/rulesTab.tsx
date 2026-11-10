"use client";

import { useEffect, useMemo, useState } from "react";
import { LuArrowDown, LuArrowUp, LuFilePen, LuPlus, LuTrash, LuTriangleAlert } from "react-icons/lu";
import type { Timestamp } from "firebase/firestore";
import type { RentalRuleSection } from "@/types";
import Input from "@/components/input";
import RichTextEditor from "@/components/richTextEditor";
import { useAlert } from "@/contexts/alertProvider";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";
import { formatStamp } from "./rentalShared";
import { formatRulesVersion, nextRulesVersion, parseRulesVersion, sameRulesVersion } from "@/rental/rulesVersion";

/** Como as seções vão para o banco (título sem espaços nas pontas). */
const clean = (sections: RentalRuleSection[]) =>
  sections.map((s) => ({ id: s.id, title: s.title.trim(), body: s.body }));
const same = (a: RentalRuleSection[], b: RentalRuleSection[]) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));

/**
 * Editor das regras do aluguel. "Salvar rascunho" guarda sem mudar o que o
 * cliente vê; "Publicar" cria uma nova versão (o cliente aceita de novo no
 * próximo pedido) e apaga o rascunho. A barra de salvar fica sempre à mão.
 */
export default function RulesTab() {
  const { addAlert } = useAlert();
  const [sections, setSections] = useState<RentalRuleSection[]>([]);
  // O que está salvo agora (rascunho, se houver; senão o publicado): base para "não salvo".
  const [baseline, setBaseline] = useState<RentalRuleSection[]>([]);
  const [published, setPublished] = useState<RentalRuleSection[] | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [draftAt, setDraftAt] = useState<Timestamp | null | "now">(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"draft" | "publish" | "discard" | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Versão da próxima publicação: sugere a atual + 0.1; o admin pode trocar.
  const [versionText, setVersionText] = useState("");
  const [versionTouched, setVersionTouched] = useState(false);
  useEffect(() => {
    if (version !== null && !versionTouched) setVersionText(formatRulesVersion(nextRulesVersion(version)));
  }, [version, versionTouched]);
  const chosenVersion = parseRulesVersion(versionText);

  // Publicado ao vivo (versão e conteúdo); o editor só é preenchido uma vez.
  useEffect(
    () =>
      RentalConfigRepository.subscribeRules((rules) => {
        setVersion(rules.version);
        setPublished(rules.sections);
      }),
    [],
  );

  // Primeira carga: rascunho, se existir; senão a versão publicada.
  useEffect(() => {
    if (loaded || published === null) return;
    let alive = true;
    RentalConfigRepository.getRulesDraft().then((draft) => {
      if (!alive) return;
      const start = draft?.sections ?? published;
      setSections(start);
      setBaseline(start);
      setDraftAt(draft ? (draft.updatedAt ?? "now") : null);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [published, loaded]);

  const dirty = loaded && !same(sections, baseline);
  const differsFromPublished = loaded && published !== null && !same(sections, published);

  // Avisa antes de sair da página com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (id: string, patch: Partial<RentalRuleSection>) =>
    setSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const move = (index: number, delta: -1 | 1) =>
    setSections((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const saveDraft = async () => {
    if (busy) return;
    setBusy("draft");
    const ok = await RentalConfigRepository.saveRulesDraft(clean(sections));
    setBusy(null);
    if (!ok) return addAlert("Não foi possível salvar o rascunho. Tente novamente.");
    setBaseline(sections);
    setDraftAt("now");
    addAlert("Rascunho salvo. O cliente continua vendo a versão publicada.");
  };

  const publish = async () => {
    if (busy) return;
    if (sections.length === 0) return addAlert("Adicione pelo menos uma seção.");
    if (sections.some((s) => !s.title.trim())) return addAlert("Toda seção precisa de um título.");
    if (chosenVersion === null) return addAlert("Versão inválida: use um número com até uma casa decimal (ex.: 3.1).");
    setBusy("publish");
    try {
      const ok = await RentalConfigRepository.publishRules(clean(sections), chosenVersion);
      if (!ok) return addAlert("Não foi possível publicar as regras. Tente novamente.");
      await RentalConfigRepository.deleteRulesDraft();
      setBaseline(sections);
      setDraftAt(null);
      setVersionTouched(false);
      addAlert(`Regras publicadas na versão ${formatRulesVersion(chosenVersion)}!`);
    } finally {
      setBusy(null);
    }
  };

  const discardDraft = async () => {
    if (busy || published === null) return;
    setBusy("discard");
    const ok = await RentalConfigRepository.deleteRulesDraft();
    setBusy(null);
    setConfirmDiscard(false);
    if (!ok) return addAlert("Não foi possível descartar o rascunho. Tente novamente.");
    setSections(published);
    setBaseline(published);
    setDraftAt(null);
    addAlert("Rascunho descartado: voltou para a versão publicada.");
  };

  const status = useMemo(() => {
    if (!loaded) return { text: "Carregando...", warn: false };
    if (dirty) return { text: "Você tem alterações não salvas", warn: true };
    if (draftAt) return { text: "Rascunho salvo · ainda não publicado", warn: false };
    return { text: `Publicado · versão ${version === null ? "—" : formatRulesVersion(version)}`, warn: false };
  }, [loaded, dirty, draftAt, version]);

  const iconBtn =
    "shrink-0 p-1.5 rounded-lg border border-primary-gold/20 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors";

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-primary-gold">Regras do aluguel</h2>
        <span className="text-xs text-primary-gold/50">
          {version === null ? "Carregando..." : `Versão publicada: ${formatRulesVersion(version)}`}
        </span>
      </div>

      {draftAt && (
        <div className="flex flex-col gap-2 rounded-xl border border-sky-300/30 bg-sky-400/[0.06] px-3 py-2.5 text-xs text-sky-100">
          <p className="flex items-start gap-2">
            <LuFilePen size={14} className="shrink-0 mt-0.5" />
            <span>
              Você está editando um <strong>rascunho</strong>
              {draftAt !== "now" && formatStamp(draftAt) ? `, salvo em ${formatStamp(draftAt)}` : ""}. O cliente continua
              vendo a versão {version === null ? "" : formatRulesVersion(version)} publicada até você clicar em Publicar.
            </span>
          </p>
          {confirmDiscard ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Descartar o rascunho e voltar para a versão publicada?</span>
              <button
                type="button"
                onClick={discardDraft}
                disabled={busy !== null}
                className="h-7 px-3 rounded-lg border border-invalid-color/40 text-invalid-color hover:bg-invalid-color/10 cursor-pointer disabled:opacity-40"
              >
                {busy === "discard" ? "Descartando..." : "Sim, descartar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="h-7 px-3 rounded-lg border border-primary-gold/20 text-primary-gold/70 cursor-pointer"
              >
                Manter
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="self-start text-[11px] underline underline-offset-2 opacity-80 hover:opacity-100 cursor-pointer"
            >
              Descartar rascunho
            </button>
          )}
        </div>
      )}

      {sections.map((section, index) => (
        <div
          key={section.id}
          className="flex flex-col gap-2 rounded-xl border border-primary-gold/15 bg-primary-black/30 p-4"
        >
          {/* Botões num cabeçalho próprio: na mesma linha do título, eles saíam da tela no celular. */}
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-[10px] font-semibold uppercase tracking-widest text-primary-gold/40">
              Seção {index + 1}
            </span>
            <button type="button" aria-label="Mover para cima" disabled={index === 0} onClick={() => move(index, -1)} className={iconBtn}>
              <LuArrowUp size={14} />
            </button>
            <button
              type="button"
              aria-label="Mover para baixo"
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
              className={iconBtn}
            >
              <LuArrowDown size={14} />
            </button>
            <button
              type="button"
              aria-label="Remover seção"
              onClick={() => setSections((list) => list.filter((s) => s.id !== section.id))}
              className={iconBtn}
            >
              <LuTrash size={14} />
            </button>
          </div>
          <Input
            labelSpace
            label="Título"
            placeholder="Título da seção"
            value={section.title}
            setValue={(e) => update(section.id, { title: e.target.value })}
            variant
            width="!max-w-none !min-w-0"
          />
          <div className="pt-2">
            <RichTextEditor
              id={`regra-${section.id}`}
              label="Texto"
              placeholder="Texto da seção. Selecione um trecho e use a barra acima para formatar."
              value={section.body}
              onChange={(body) => update(section.id, { body })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setSections((list) => [...list, { id: crypto.randomUUID(), title: "", body: "" }])}
        className="flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-xl border border-dashed border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 cursor-pointer"
      >
        <LuPlus size={14} /> Adicionar seção
      </button>

      <div className="flex flex-col gap-1.5 rounded-xl border border-primary-gold/15 bg-primary-black/25 p-3.5">
        <Input
          labelSpace
          label="Versão desta publicação"
          placeholder="Versão desta publicação (ex.: 3.1)"
          value={versionText}
          setValue={(e) => {
            setVersionText(e.target.value);
            setVersionTouched(true);
          }}
          variant
          width="!w-full sm:!w-[260px] !min-w-0"
        />
        <p className="text-[11px] leading-relaxed text-primary-gold/50">
          {chosenVersion === null
            ? "Use um número com até uma casa decimal, ex.: 3.1."
            : version !== null && sameRulesVersion(chosenVersion, version)
              ? "Mesma versão da atual: use para correções pequenas (erro de digitação). Os clientes não precisam aceitar as regras de novo."
              : version !== null && chosenVersion < version
                ? "Atenção: menor que a versão publicada agora. Os clientes vão aceitar as regras de novo no próximo pedido."
                : `Sobe de 0.1 em 0.1 (2.9 → 3.0). Com a versão ${formatRulesVersion(chosenVersion)}, os clientes aceitam as regras de novo no próximo pedido.`}
          {versionTouched && version !== null && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setVersionTouched(false)}
                className="underline underline-offset-2 hover:text-primary-gold cursor-pointer"
              >
                Usar a sugerida ({formatRulesVersion(nextRulesVersion(version))})
              </button>
            </>
          )}
        </p>
      </div>

      <p className="text-xs text-primary-gold/50">
        “Salvar rascunho” guarda sem mudar o que o cliente vê. “Publicar” coloca as regras no ar com a versão acima.
      </p>

      {/* Salvar sempre à mão */}
      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary-gold/25 bg-primary-black/90 backdrop-blur px-3 py-2.5">
        <span className={`flex items-center gap-1.5 text-xs ${status.warn ? "text-yellow-400/90" : "text-primary-gold/50"}`}>
          {status.warn && <LuTriangleAlert size={13} className="shrink-0" />}
          {status.text}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={saveDraft}
            disabled={!loaded || busy !== null || !dirty}
            className="text-sm px-4 py-2 rounded-xl border border-primary-gold/40 text-primary-gold font-semibold hover:bg-primary-gold/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === "draft" ? "Salvando..." : "Salvar rascunho"}
          </button>
          <button
            type="button"
            onClick={publish}
            // Também dá para publicar só para trocar a versão (mudada à mão).
            disabled={
              !loaded ||
              busy !== null ||
              (!differsFromPublished &&
                !draftAt &&
                !(versionTouched && chosenVersion !== null && version !== null && !sameRulesVersion(chosenVersion, version)))
            }
            className="text-sm px-4 py-2 rounded-xl bg-primary-gold text-primary-black font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === "publish" ? "Publicando..." : chosenVersion === null ? "Publicar" : `Publicar v${formatRulesVersion(chosenVersion)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
