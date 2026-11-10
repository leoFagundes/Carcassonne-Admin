import type { ReactNode } from "react";
import { parseRich, type BlockNode, type InlineNode } from "@/utils/richMarkup";

// Desenha o texto com a formatação do editor (negrito, itálico, sublinhado,
// riscado, destaque, link, subtítulo, listas e aviso — ver utils/richMarkup).
// Tudo vira elementos React; nada de HTML cru, então não há como injetar
// código pelo editor. Textos antigos (só **negrito** e quebras) continuam iguais.

// Endereços colados soltos no texto (sem [texto](link)) também viram link, com
// o endereço encurtado: um link enorme do Google Maps não estoura o card.
const BARE_URL = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?"']/g;

export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const rest = (u.pathname + u.search).replace(/\/$/, "");
    const host = u.hostname.replace(/^www\./, "");
    return rest.length > 18 ? `${host}${rest.slice(0, 18)}…` : host + rest;
  } catch {
    return url;
  }
}

function linkify(text: string, key: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(BARE_URL)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <a
        key={`${key}-u${at}`}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        title={m[0]}
        className="underline underline-offset-2 text-primary-gold hover:opacity-80"
      >
        {shortUrl(m[0])}
      </a>,
    );
    last = at + m[0].length;
  }
  if (!parts.length) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderInline(nodes: InlineNode[], key = "i", inLink = false): ReactNode[] {
  return nodes.map((node, i) => {
    const k = `${key}-${i}`;
    switch (node.type) {
      case "text":
        return inLink ? node.text : linkify(node.text, k);
      case "bold":
        return <strong key={k} className="font-semibold text-primary-gold">{renderInline(node.children, k, inLink)}</strong>;
      case "italic":
        return <em key={k}>{renderInline(node.children, k, inLink)}</em>;
      case "underline":
        return <u key={k} className="underline-offset-2">{renderInline(node.children, k, inLink)}</u>;
      case "strike":
        return <s key={k} className="opacity-70">{renderInline(node.children, k, inLink)}</s>;
      case "mark":
        return (
          <mark key={k} className="rounded px-1 bg-primary-gold/25 text-primary-gold">
            {renderInline(node.children, k, inLink)}
          </mark>
        );
      case "link": {
        const external = /^https?:/i.test(node.href);
        return (
          <a
            key={k}
            href={node.href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="underline underline-offset-2 text-primary-gold hover:opacity-80"
          >
            {renderInline(node.children, k, true)}
          </a>
        );
      }
    }
  });
}

function renderLines(lines: InlineNode[][], key: string): ReactNode[] {
  return lines.flatMap((line, i) => (i === 0 ? renderInline(line, `${key}-${i}`) : [<br key={`${key}-br-${i}`} />, ...renderInline(line, `${key}-${i}`)]));
}

function renderBlock(block: BlockNode, i: number): ReactNode {
  const key = `b-${i}`;
  switch (block.type) {
    case "paragraph":
      return <p key={key}>{renderLines(block.lines, key)}</p>;
    case "heading":
      return (
        <h4 key={key} className="text-[0.95em] font-semibold text-primary-gold pt-1">
          {renderInline(block.children, key)}
        </h4>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag key={key} className={`flex flex-col gap-1 pl-5 ${block.ordered ? "list-decimal" : "list-disc"} marker:text-primary-gold/60`}>
          {block.items.map((item, j) => (
            <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return (
        <div key={key} className="rounded-lg border-l-2 border-primary-gold/60 bg-primary-gold/[0.07] px-3 py-2">
          {renderLines(block.lines, key)}
        </div>
      );
  }
}

/** Texto formatado em blocos (use dentro de um <div>, não de um <p>). */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`flex flex-col gap-2 min-w-0 break-words [overflow-wrap:anywhere] ${className}`}>{parseRich(text).map(renderBlock)}</div>;
}

export default RichText;
