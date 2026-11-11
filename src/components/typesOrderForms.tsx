"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Reorder } from "framer-motion";
import { LuInfo, LuLayers, LuListOrdered, LuPlus } from "react-icons/lu";
import { useAlert } from "@/contexts/alertProvider";
import MenuItemRepository from "@/services/repositories/MenuItemRepository";
import TypesOrderRepository from "@/services/repositories/TypesOrderRepository";
import InfoRepository from "@/services/repositories/InfoRepository";
import type { InfoType, MenuItemType, TypeOrderType } from "@/types";
import Input from "./input";
import FormCard from "./formCard";
import { CategoryRow, InfoRow } from "./menuOrganizerRows";
import {
  countItems,
  infosChanged,
  infosToSave,
  missingTypes,
  nameError,
  normalizeInfos,
  normalizeTypes,
  sortInfos,
  typesChanged,
  typesToSave,
} from "@/utils/menuOrganizer";

interface TypesOrderFormsProps {
  currentTypeOrder: TypeOrderType;
  closeForms: VoidFunction;
}

type Tab = "categorias" | "avisos";

/** Troca dois vizinhos de lugar (setas do teclado na alça). */
function moved<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/**
 * Organizar o cardápio: ordem das categorias e subcategorias (com a ilustração
 * dos itens sem foto) e ordem dos avisos. Adicionar e excluir uma categoria
 * grava na hora; o resto fica pendente até "Salvar".
 */
export default function TypesOrderForms({ currentTypeOrder, closeForms }: TypesOrderFormsProps) {
  const { addAlert } = useAlert();
  const [tab, setTab] = useState<Tab>("categorias");
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  // `types` é a versão em edição; `savedTypes` espelha o banco (decide o que
  // gravar); `baselineTypes` é a última versão salva, na ordem da tela (decide
  // se há alterações pendentes)
  const [types, setTypes] = useState<TypeOrderType[]>([]);
  const [savedTypes, setSavedTypes] = useState<TypeOrderType[]>([]);
  const [baselineTypes, setBaselineTypes] = useState<TypeOrderType[]>([]);
  const [infos, setInfos] = useState<InfoType[]>([]);
  const [savedInfos, setSavedInfos] = useState<InfoType[]>([]);
  const [newType, setNewType] = useState(currentTypeOrder.type.name);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [items, order, infoList] = await Promise.all([
          MenuItemRepository.getAll(),
          TypesOrderRepository.getAll(),
          InfoRepository.getAll(),
        ]);
        if (!alive) return;
        const sortedInfos = sortInfos(infoList);
        setMenuItems(items);
        setTypes(order);
        setSavedTypes(order);
        setBaselineTypes(order);
        setInfos(sortedInfos);
        setSavedInfos(sortedInfos);
      } catch (error) {
        addAlert(`Erro ao carregar a organização do cardápio: ${error}`);
      } finally {
        if (alive) setLoadingData(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const typesDirty = typesChanged(types, baselineTypes);
  const infosDirty = infosChanged(infos, savedInfos);
  const dirty = typesDirty || infosDirty;

  useEffect(() => {
    if (!dirty) setConfirmClose(false);
  }, [dirty]);

  const counts = useMemo(() => countItems(menuItems), [menuItems]);
  const missing = useMemo(() => missingTypes(menuItems, types), [menuItems, types]);

  async function addType(raw: string) {
    const error = nameError(raw, types.map((t) => t.type.name), "categoria");
    if (error) return addAlert(error);
    const name = raw.trim();
    setAdding(true);
    const created = await TypesOrderRepository.create({ type: { name, order: types.length, subtypes: [] } });
    setAdding(false);
    if (!created) return addAlert(`Não foi possível adicionar "${name}". Tente novamente.`);
    setTypes((prev) => [...prev, created]);
    setSavedTypes((prev) => [...prev, created]);
    setBaselineTypes((prev) => [...prev, created]);
    setNewType("");
    addAlert(`"${name}" adicionada.`);
  }

  async function deleteType(entry: TypeOrderType) {
    if (!entry.id) {
      addAlert("Categoria não encontrada no banco. Recarregue a página e tente de novo.");
      return;
    }
    const ok = await TypesOrderRepository.delete(entry.id);
    if (!ok) {
      addAlert(`Não foi possível excluir "${entry.type.name}". Tente novamente.`);
      return;
    }
    setTypes((prev) => prev.filter((e) => e.id !== entry.id));
    setSavedTypes((prev) => prev.filter((e) => e.id !== entry.id));
    setBaselineTypes((prev) => prev.filter((e) => e.id !== entry.id));
    addAlert(`"${entry.type.name}" saiu da organização. Os itens continuam no cardápio.`);
  }

  async function save() {
    setSaving(true);
    const failed: string[] = [];
    try {
      if (typesDirty) {
        const nextTypes = normalizeTypes(types);
        const pending = typesToSave(types, savedTypes);
        const okIds = new Set<string>();
        for (const { id, type } of pending) {
          if (await TypesOrderRepository.update(id, { type })) okIds.add(id);
          else failed.push(type.name);
        }
        const before = new Map(savedTypes.map((e) => [e.id, e]));
        const failedIds = new Set(pending.filter((p) => !okIds.has(p.id)).map((p) => p.id));
        setTypes(nextTypes);
        // O que falhou continua como estava no banco, e a tela segue pendente
        setSavedTypes(nextTypes.map((e) => (e.id && failedIds.has(e.id) ? (before.get(e.id) ?? e) : e)));
        if (failedIds.size === 0) setBaselineTypes(nextTypes);
      }

      if (infosDirty) {
        const pending = infosToSave(infos, savedInfos);
        let infosFailed = false;
        for (const { id, orderPriority } of pending) {
          if (!(await InfoRepository.update(id, { orderPriority }))) {
            infosFailed = true;
            failed.push(infos.find((i) => i.id === id)?.name ?? "aviso");
          }
        }
        // Com falha, a ordem dos avisos fica pendente para tentar de novo
        if (!infosFailed) {
          const nextInfos = normalizeInfos(infos);
          setInfos(nextInfos);
          setSavedInfos(nextInfos);
        }
      }

      addAlert(failed.length ? `Não foi possível salvar: ${failed.join(", ")}. Tente novamente.` : "Organização salva!");
    } catch (error) {
      addAlert(`Erro ao salvar: ${error}`);
    } finally {
      setSaving(false);
    }
  }

  const requestClose = () => {
    if (dirty && !confirmClose) setConfirmClose(true);
    else closeForms();
  };

  const footerNote = confirmClose ? (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
      <span className="text-orange-300">Sair sem salvar?</span>
      <button
        type="button"
        onClick={closeForms}
        className="font-semibold text-invalid-color underline underline-offset-2 cursor-pointer"
      >
        Descartar
      </button>
    </div>
  ) : dirty ? (
    <span className="flex items-center gap-1.5 text-[11px] text-orange-300">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300" />
      Alterações não salvas
    </span>
  ) : (
    <span className="text-[11px] text-primary-gold/35">Tudo salvo</span>
  );

  return (
    <FormCard
      title="Organizar cardápio"
      subtitle="Ordem das categorias, imagens dos itens sem foto e avisos"
      icon={<LuListOrdered size={18} />}
      onClose={requestClose}
      maxWidth="sm:max-w-[720px]"
      onSubmit={save}
      submitLabel="Salvar"
      submitDisabled={!dirty || loadingData}
      loading={saving}
      footerNote={footerNote}
      layoutScroll
    >
      <div
        role="tablist"
        aria-label="O que organizar"
        className="grid grid-cols-2 gap-1 rounded-xl border border-primary-gold/15 bg-primary-black/40 p-1"
      >
        {(
          [
            { key: "categorias", label: "Categorias", count: types.length, changed: typesDirty, icon: <LuLayers size={14} /> },
            { key: "avisos", label: "Avisos", count: infos.length, changed: infosDirty, icon: <LuInfo size={14} /> },
          ] as const
        ).map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
                on ? "bg-primary-gold/15 text-primary-gold" : "text-primary-gold/50 hover:text-primary-gold/80"
              }`}
            >
              {t.icon}
              {t.label}
              {!loadingData && <span className="tabular-nums text-primary-gold/40">{t.count}</span>}
              {t.changed && <span aria-label="com alterações" className="h-1.5 w-1.5 rounded-full bg-orange-300" />}
            </button>
          );
        })}
      </div>

      {loadingData ? (
        <div className="flex flex-col gap-2" aria-label="Carregando">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[58px] animate-pulse rounded-xl border border-primary-gold/10 bg-primary-gold/[0.04]" />
          ))}
        </div>
      ) : tab === "categorias" ? (
        <div role="tabpanel" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                label="Nova categoria"
                placeholder="Nova categoria (ex.: Pizzas)"
                value={newType}
                setValue={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !adding) {
                    e.preventDefault();
                    addType(newType);
                  }
                }}
                options={missing}
                variant
                smallInput
                width="!w-full !max-w-none"
              />
              <button
                type="button"
                onClick={() => addType(newType)}
                disabled={adding}
                className="mt-2 flex h-[34px] shrink-0 items-center gap-1 rounded-lg border border-primary-gold/35 bg-primary-gold/10 px-3 text-xs font-semibold text-primary-gold hover:bg-primary-gold/20 disabled:opacity-40 cursor-pointer"
              >
                <LuPlus size={13} /> Adicionar
              </button>
            </div>

            {missing.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-primary-gold/20 p-3">
                <span className="text-[11px] leading-relaxed text-primary-gold/55">
                  Estas categorias estão nos itens, mas fora da lista: aparecem no fim do cardápio e sem ilustração.
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((name) => (
                    <button
                      key={name}
                      type="button"
                      disabled={adding}
                      onClick={() => addType(name)}
                      className="flex items-center gap-1 rounded-full border border-primary-gold/30 px-2.5 py-0.5 text-[11px] text-primary-gold/75 hover:border-primary-gold/60 hover:text-primary-gold disabled:opacity-40 cursor-pointer"
                    >
                      <LuPlus size={11} /> {name}
                      <span className="tabular-nums text-primary-gold/40">{counts.byType.get(name) ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {types.length === 0 ? (
            <p className="rounded-xl border border-primary-gold/10 px-4 py-6 text-center text-xs text-primary-gold/50">
              Nenhuma categoria ainda. Adicione a primeira acima, na ordem em que deve aparecer no cardápio.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] leading-relaxed text-primary-gold/45">
                Arraste pela alça para mudar a ordem. Toque no nome para ver as subcategorias e na imagem para escolher a
                ilustração dos itens sem foto (a da subcategoria vale antes da categoria).
              </p>
              <Reorder.Group axis="y" values={types} onReorder={setTypes} className="flex flex-col gap-2">
                {types.map((entry, index) => (
                  <CategoryRow
                    key={entry.id ?? entry.type.name}
                    entry={entry}
                    position={index + 1}
                    itemCount={counts.byType.get(entry.type.name) ?? 0}
                    subtypeCounts={counts.bySubtype}
                    menuItems={menuItems}
                    onChange={(next) => setTypes((prev) => prev.map((e, i) => (i === index ? next : e)))}
                    onMove={(delta) => setTypes((prev) => moved(prev, index, delta))}
                    onDelete={() => deleteType(entry)}
                    onError={addAlert}
                  />
                ))}
              </Reorder.Group>
            </div>
          )}
        </div>
      ) : (
        <div role="tabpanel" className="flex flex-col gap-2">
          {infos.length === 0 ? (
            <p className="rounded-xl border border-primary-gold/10 px-4 py-6 text-center text-xs text-primary-gold/50">
              Nenhum aviso cadastrado. Crie em Cardápio → + → Aviso.
            </p>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed text-primary-gold/45">
                Arraste pela alça para definir a ordem em que os avisos aparecem no cardápio.
              </p>
              <Reorder.Group axis="y" values={infos} onReorder={setInfos} className="flex flex-col gap-2">
                {infos.map((info, index) => (
                  <InfoRow
                    key={info.id ?? info.name}
                    info={info}
                    position={index + 1}
                    onMove={(delta) => setInfos((prev) => moved(prev, index, delta))}
                  />
                ))}
              </Reorder.Group>
            </>
          )}
        </div>
      )}
    </FormCard>
  );
}
