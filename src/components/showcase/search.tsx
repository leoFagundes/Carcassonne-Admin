import type { ReactNode } from "react";

// Busca das vitrines: ignora acentos e maiúsculas ("pao de queijo" acha "Pão
// de Queijo", "estrategia" acha "Estratégia").
const DIACRITICS = /[̀-ͯ]/g;

/** Texto sem acento e minúsculo, com a posição de cada letra no texto original. */
export function fold(text: string) {
  let folded = "";
  const positions: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const plain = text[i].normalize("NFD").replace(DIACRITICS, "").toLowerCase();
    for (let k = 0; k < plain.length; k++) positions.push(i);
    folded += plain;
  }
  return { folded, positions };
}

export const foldText = (text: string) => fold(text).folded;

/** Palavras da busca, já sem acento ("Pão  de" → ["pao", "de"]). */
export const searchWords = (query: string) => foldText(query).split(/\s+/).filter(Boolean);

/** Destaca no texto os trechos que batem com a busca. */
export function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const { folded, positions } = fold(text);
  const marked = new Array<boolean>(text.length).fill(false);
  for (const word of words) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) {
      const end = positions[at + word.length - 1] + 1;
      for (let k = positions[at]; k < end; k++) marked[k] = true;
    }
  }

  const parts: ReactNode[] = [];
  for (let i = 0; i < text.length; ) {
    let j = i;
    while (j < text.length && marked[j] === marked[i]) j++;
    const chunk = text.slice(i, j);
    parts.push(
      marked[i] ? (
        <mark key={i} className="bg-primary-gold/20 text-primary-gold rounded-[3px] px-px">
          {chunk}
        </mark>
      ) : (
        <span key={i}>{chunk}</span>
      ),
    );
    i = j;
  }
  return <>{parts}</>;
}
