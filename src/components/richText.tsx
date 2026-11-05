import { Fragment, type ReactNode } from "react";

// Mesmo comportamento de `richText` em clientResponseTemplate.tsx: só **negrito**
// e quebras de linha. Todo o resto é texto puro (o React escapa), então não há
// como injetar HTML pelo editor.
function richTextNodes(text: string): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex) => {
    const parts = line
      .split(/(\*\*[^*]+\*\*)/g)
      .filter((part) => part !== "")
      .map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={`${lineIndex}-${i}`}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={`${lineIndex}-${i}`}>{part}</Fragment>
        ),
      );
    return lineIndex === 0 ? parts : [<br key={`br-${lineIndex}`} />, ...parts];
  });
}

export function RichText({ text }: { text: string }) {
  return <>{richTextNodes(text)}</>;
}

export default RichText;
