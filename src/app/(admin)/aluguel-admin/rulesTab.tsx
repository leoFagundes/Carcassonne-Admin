"use client";

import { useEffect, useState } from "react";
import { LuArrowDown, LuArrowUp, LuPlus, LuTrash } from "react-icons/lu";
import type { RentalRuleSection } from "@/types";
import Input from "@/components/input";
import { RichText } from "@/components/richText";
import { useAlert } from "@/contexts/alertProvider";
import RentalConfigRepository from "@/services/repositories/RentalConfigRepository";

export default function RulesTab() {
  const { addAlert } = useAlert();
  const [sections, setSections] = useState<RentalRuleSection[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Só a primeira leitura preenche o editor; depois disso as edições locais não são sobrescritas.
  useEffect(() => {
    let first = true;
    const unsub = RentalConfigRepository.subscribeRules((rules) => {
      setVersion(rules.version);
      if (first) {
        first = false;
        setSections(rules.sections);
        setLoaded(true);
      }
    });
    return () => unsub();
  }, []);

  const update = (id: string, patch: Partial<RentalRuleSection>) =>
    setSections((list) =>
      list.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  const move = (index: number, delta: -1 | 1) =>
    setSections((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const publish = async () => {
    if (sections.length === 0) {
      addAlert("Adicione pelo menos uma seção.");
      return;
    }
    if (sections.some((s) => !s.title.trim())) {
      addAlert("Toda seção precisa de um título.");
      return;
    }
    setSaving(true);
    try {
      const ok = await RentalConfigRepository.publishRules(
        sections.map((s) => ({
          id: s.id,
          title: s.title.trim(),
          body: s.body,
        })),
      );
      addAlert(
        ok
          ? "Regras publicadas!"
          : "Não foi possível publicar as regras. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };

  const iconBtn =
    "shrink-0 p-1.5 rounded-lg border border-primary-gold/20 text-primary-gold/60 hover:text-primary-gold hover:border-primary-gold/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors";

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-primary-gold">
          Regras do aluguel
        </h2>
        <span className="text-xs text-primary-gold/50">
          {version === null ? "Carregando..." : `Versão atual: ${version}`}
        </span>
      </div>

      {sections.map((section, index) => (
        <div
          key={section.id}
          className="flex flex-col gap-5 rounded-xl border border-primary-gold/15 bg-primary-black/30 px-4 py-5"
        >
          {/* Botões num cabeçalho próprio: na mesma linha do título, eles
              saíam da tela em celulares (o campo tem largura mínima). */}
          <div className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-[10px] font-semibold uppercase tracking-widest text-primary-gold/40">
              Seção {index + 1}
            </span>
            <button
              type="button"
              aria-label="Mover para cima"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className={iconBtn}
            >
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
              onClick={() =>
                setSections((list) => list.filter((s) => s.id !== section.id))
              }
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
          <Input
            labelSpace
            label="Texto"
            placeholder="Texto da seção (use **negrito** e quebras de linha)"
            value={section.body}
            setValue={(e) => update(section.id, { body: e.target.value })}
            variant
            multiline
            rows={5}
            width="!max-w-none"
          />
          {section.body.trim() && (
            <div className="rounded-lg bg-secondary-black/60 border border-primary-gold/10 p-3 text-sm text-primary-white/90">
              <span className="block text-[10px] uppercase tracking-widest text-primary-gold/50 mb-1">
                Prévia
              </span>
              <RichText text={section.body} />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setSections((list) => [
            ...list,
            { id: crypto.randomUUID(), title: "", body: "" },
          ])
        }
        className="flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-xl border border-dashed border-primary-gold/30 text-primary-gold/80 hover:text-primary-gold hover:border-primary-gold/60 cursor-pointer"
      >
        <LuPlus size={14} /> Adicionar seção
      </button>

      <p className="text-xs text-primary-gold/50">
        Publicar exige que clientes aceitem a nova versão no próximo pedido.
      </p>
      <button
        type="button"
        onClick={publish}
        disabled={saving || !loaded}
        className="self-start text-sm px-5 py-2 rounded-xl bg-primary-gold text-primary-black font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Publicando..." : "Publicar regras"}
      </button>
    </div>
  );
}
