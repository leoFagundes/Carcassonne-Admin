import type { ReactNode } from "react";
import { parseRich, type BlockNode, type InlineNode } from "@/utils/richMarkup";

// Desenha o texto com a formatação do editor (negrito, itálico, sublinhado,
// riscado, destaque, link, subtítulo, listas e aviso — ver utils/richMarkup).
// Tudo vira elementos React; nada de HTML cru, então não há como injetar
// código pelo editor. Textos antigos (só **negrito** e quebras) continuam iguais.

function renderInline(nodes: InlineNode[], key = "i"): ReactNode[] {
  return nodes.map((node, i) => {
    const k = `${key}-${i}`;
    switch (node.type) {
      case "text":
        return node.text;
      case "bold":
        return <strong key={k} className="font-semibold text-primary-gold">{renderInline(node.children, k)}</strong>;
      case "italic":
        return <em key={k}>{renderInline(node.children, k)}</em>;
      case "underline":
        return <u key={k} className="underline-offset-2">{renderInline(node.children, k)}</u>;
      case "strike":
        return <s key={k} className="opacity-70">{renderInline(node.children, k)}</s>;
      case "mark":
        return (
          <mark key={k} className="rounded px-1 bg-primary-gold/25 text-primary-gold">
            {renderInline(node.children, k)}
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
            {renderInline(node.children, k)}
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
  return <div className={`flex flex-col gap-2 ${className}`}>{parseRich(text).map(renderBlock)}</div>;
}

export default RichText;
