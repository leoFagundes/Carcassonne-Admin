/**
 * Formatação simples do texto das regras (e de outros textos do admin), no
 * estilo Markdown. Gera uma árvore; quem desenha é o componente RichText —
 * nada vira HTML cru, então não há como injetar código pelo editor.
 *
 * Em linha (podem ser combinadas, ex.: **negrito com *itálico***):
 *   **negrito**  *itálico*  __sublinhado__  ~~riscado~~  ==destaque==
 *   [texto do link](https://endereco)   ou   [texto](/pagina-do-site)
 *   \* (barra invertida) mostra o caractere literal
 * Por linha:
 *   ## Subtítulo     - item de lista     1. item numerado     > aviso
 *   linha em branco separa parágrafos
 */

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold" | "italic" | "underline" | "strike" | "mark"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export type BlockNode =
  | { type: "paragraph"; lines: InlineNode[][] }
  | { type: "heading"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "quote"; lines: InlineNode[][] };

const PAIRS: { open: string; type: "bold" | "underline" | "strike" | "mark" | "italic" }[] = [
  { open: "**", type: "bold" },
  { open: "__", type: "underline" },
  { open: "~~", type: "strike" },
  { open: "==", type: "mark" },
  { open: "*", type: "italic" },
];

/** Endereço permitido em link: http(s), e-mail, telefone ou página do próprio site. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  if (/^mailto:[^\s]+$/i.test(href) || /^tel:[+\d\s()-]+$/i.test(href)) return href;
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href;
  // "www.algo.com" sem protocolo: completa com https://
  if (/^www\.[^\s]+\.[^\s]+$/i.test(href)) return `https://${href}`;
  return null;
}

/** Fechamento do marcador `token` a partir de `from` (ignora o que está escapado). */
function findClose(text: string, token: string, from: number): number {
  for (let i = from; i <= text.length - token.length; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text.startsWith(token, i)) {
      // "***" fechando negrito com itálico dentro: o negrito fecha nos dois últimos
      if (token === "**" && text.startsWith("***", i)) return i + 1;
      // "*" não fecha no começo de "**" (deixa o negrito para o par certo)
      if (token === "*" && text.startsWith("**", i)) {
        const after = findClose(text, "**", i + 2);
        if (after === -1) return -1;
        i = after + 1;
        continue;
      }
      return i;
    }
  }
  return -1;
}

export function parseInline(text: string): InlineNode[] {
  const out: InlineNode[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ type: "text", text: buf });
    buf = "";
  };

  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && i + 1 < text.length) {
      buf += text[i + 1];
      i += 2;
      continue;
    }

    // [texto](endereço)
    if (ch === "[") {
      const closeText = findClose(text, "]", i + 1);
      if (closeText !== -1 && text[closeText + 1] === "(") {
        const closeUrl = text.indexOf(")", closeText + 2);
        const href = closeUrl === -1 ? null : safeHref(text.slice(closeText + 2, closeUrl));
        const label = text.slice(i + 1, closeText);
        if (href && label) {
          flush();
          out.push({ type: "link", href, children: parseInline(label) });
          i = closeUrl + 1;
          continue;
        }
      }
    }

    const pair = PAIRS.find((p) => text.startsWith(p.open, i));
    if (pair) {
      const start = i + pair.open.length;
      const close = findClose(text, pair.open, start);
      // Conteúdo não vazio e sem espaço logo depois da abertura (evita "2 * 3 * 4")
      if (close > start && text[start] !== " ") {
        flush();
        out.push({ type: pair.type, children: parseInline(text.slice(start, close)) });
        i = close + pair.open.length;
        continue;
      }
    }

    buf += ch;
    i++;
  }
  flush();
  return out;
}

export function parseRich(text: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^#{1,3}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", children: parseInline(heading[1]) });
      i++;
      continue;
    }
    const bullet = /^\s*[-•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: InlineNode[][] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(parseInline(lines[i].replace(re, "")));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: InlineNode[][] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(parseInline(lines[i].replace(/^>\s?/, "")));
        i++;
      }
      blocks.push({ type: "quote", lines: quote });
      continue;
    }
    // Parágrafo: linhas seguidas até uma linha em branco ou outro bloco
    const para: InlineNode[][] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !bullet.test(lines[i]) &&
      !numbered.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      para.push(parseInline(lines[i]));
      i++;
    }
    blocks.push({ type: "paragraph", lines: para });
  }
  return blocks;
}

/** Texto sem marcação (para prévias curtas e contagem). */
export function plainText(nodes: InlineNode[]): string {
  return nodes.map((n) => (n.type === "text" ? n.text : plainText(n.children))).join("");
}
