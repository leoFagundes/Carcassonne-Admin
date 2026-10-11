"use client";

import { useMemo, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { LuChevronRight, LuSearch, LuSearchX, LuVegan, LuX } from "react-icons/lu";
import Modal from "@/components/modal";
import { useBackToClose } from "@/components/useBackToClose";
import { Highlight, foldText, searchWords } from "@/components/showcase/search";
import type { MenuItemType } from "@/types";

const PLACEHOLDER_IMAGE = "/images/placeholder-menu.svg";

/**
 * Itens com todas as palavras buscadas (no nome, na descrição ou na
 * categoria). Primeiro os que começam com a busca, depois os que têm tudo no
 * nome e por fim os que só batem na descrição/categoria.
 */
function searchItems(items: MenuItemType[], query: string) {
  const words = searchWords(query);
  if (!words.length) return { words, results: [] as MenuItemType[] };
  const phrase = words.join(" ");
  const results = items
    .flatMap((item) => {
      const name = foldText(item.name);
      const all = [name, item.description, item.type, item.subtype]
        .map((text) => foldText(text ?? ""))
        .join(" ");
      if (!words.every((word) => all.includes(word))) return [];
      const rank = name.startsWith(phrase) ? 0 : words.every((word) => name.includes(word)) ? 1 : 2;
      return [{ item, rank }];
    })
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name, "pt-BR"))
    .map(({ item }) => item);
  return { words, results };
}

function EmptyState({ icon: Icon, title, text }: { icon: IconType; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center px-6 py-14">
      <span className="flex items-center justify-center w-12 h-12 rounded-full border border-primary-gold/20 bg-secondary-black/60 text-primary-gold/60">
        <Icon size={20} />
      </span>
      <span className="text-sm font-semibold text-primary-gold/80">{title}</span>
      <span className="text-xs text-primary-gold/45">{text}</span>
    </div>
  );
}

/**
 * Busca do cardápio: os itens aparecem filtrados na hora, dentro do modal.
 * Tocar num item fecha a busca e leva a página até ele (`onPick`).
 */
export default function MenuSearch({
  isOpen,
  onClose,
  items,
  onPick,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItemType[];
  onPick: (item: MenuItemType) => void;
}) {
  // Fica guardada entre uma abertura e outra (dá para ir de item em item)
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { words, results } = useMemo(() => searchItems(items, query), [items, query]);
  // "Voltar" do celular fecha a busca em vez de sair do cardápio
  useBackToClose(isOpen, onClose);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isFixed noPadding patternCloseButton={false}>
      {/* No computador, clicar fora do painel fecha */}
      <div
        className="w-full h-full flex justify-center sm:items-start sm:bg-black/55 sm:pt-[9vh]"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Procurar no cardápio"
          onClick={(e) => e.stopPropagation()}
          className="w-full h-full flex flex-col overflow-hidden bg-primary-black sm:w-[480px] sm:h-auto sm:max-h-[78vh] sm:rounded-2xl sm:border sm:border-primary-gold/20 sm:bg-secondary-black/95 sm:shadow-[0_24px_70px_rgba(0,0,0,0.6)]"
        >
          {/* Campo de busca */}
          <div className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-3 border-b border-primary-gold/10">
            <label className="flex-1 flex items-center gap-2 min-w-0 px-3 py-2.5 rounded-xl bg-secondary-black/80 border border-primary-gold/25 focus-within:border-primary-gold/60 transition-colors">
              <LuSearch size={17} className="text-primary-gold/60 shrink-0" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // (o Esc fecha pela camada, como o "voltar" do celular)
                  if (e.key === "Enter" && results[0]) onPick(results[0]);
                }}
                placeholder="Procurar no cardápio..."
                // 16px: abaixo disso o iPhone dá zoom ao focar o campo
                className="flex-1 min-w-0 bg-transparent outline-none text-base text-primary-gold placeholder:text-primary-gold/35"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Limpar a busca"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-primary-gold/50 hover:text-primary-gold transition-colors cursor-pointer"
                >
                  <LuX size={16} />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 px-1 py-2 text-sm text-primary-gold/70 hover:text-primary-gold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {/* Resultados, filtrados enquanto digita */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2">
            {!words.length ? (
              <EmptyState
                icon={LuSearch}
                title="O que você procura?"
                text="Digite o nome de um prato, bebida ou ingrediente."
              />
            ) : results.length === 0 ? (
              <EmptyState
                icon={LuSearchX}
                title="Nada encontrado"
                text={`Nenhum item com “${query.trim()}”.`}
              />
            ) : (
              <>
                <span className="block px-2 pt-1 pb-2 text-[11px] uppercase tracking-widest text-primary-gold/40">
                  {results.length} {results.length === 1 ? "item" : "itens"}
                </span>
                {results.map((item) => (
                  <button
                    key={item.id ?? item.name}
                    type="button"
                    onClick={() => onPick(item)}
                    className="w-full flex items-start gap-3 p-2 rounded-xl text-left hover:bg-primary-gold/5 active:bg-primary-gold/10 transition-colors cursor-pointer"
                  >
                    <img
                      src={item.image || PLACEHOLDER_IMAGE}
                      alt=""
                      loading="lazy"
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-primary-gold/10"
                    />
                    {/* Tudo numa coluna só: o preço pode ser longo (vários
                        tamanhos) e quebra a linha sem espremer o nome */}
                    <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm font-semibold text-primary-gold leading-snug break-words">
                        <Highlight text={item.name} words={words} />
                        {item.isVegan && (
                          <LuVegan
                            size={13}
                            aria-label="Vegano"
                            className="inline-block ml-1.5 -mt-0.5 text-primary-gold/70"
                          />
                        )}
                      </span>
                      <span className="text-[11px] text-primary-gold/45 truncate">
                        {item.subtype ? `${item.type} · ${item.subtype}` : item.type}
                      </span>
                      {item.value && (
                        <span className="text-[11px] font-semibold text-primary-gold/85 leading-snug break-words">
                          {item.value}
                        </span>
                      )}
                      {item.description && (
                        <span className="text-[11px] text-primary-gold/55 line-clamp-1">
                          <Highlight text={item.description} words={words} />
                        </span>
                      )}
                    </span>
                    <LuChevronRight size={16} className="self-center text-primary-gold/30 shrink-0" />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
