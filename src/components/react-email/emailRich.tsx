import { Fragment, type ReactNode } from "react";

// Formatação mínima dos textos editados no admin: "**texto**" vira negrito e
// cada quebra de linha vira <br />. Todo o resto é texto puro (o React
// escapa), então não há como injetar HTML pelo editor.
export function emailRich(text: string, keyPrefix = "r"): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex) => {
    const parts = line
      .split(/(\*\*[^*]+\*\*)/g)
      .filter((part) => part !== "")
      .map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={`${keyPrefix}-${lineIndex}-${i}`}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={`${keyPrefix}-${lineIndex}-${i}`}>{part}</Fragment>
        ),
      );
    return lineIndex === 0 ? parts : [<br key={`${keyPrefix}-br-${lineIndex}`} />, ...parts];
  });
}

/** Igual a emailRich, trocando um marcador (ex.: "{regras}") por um elemento (ex.: link). */
export function emailRichWith(text: string, token: string, node: ReactNode): ReactNode[] {
  const pieces = text.split(token);
  return pieces.flatMap((piece, i) =>
    i === 0 ? emailRich(piece, `p${i}`) : [<Fragment key={`t${i}`}>{node}</Fragment>, ...emailRich(piece, `p${i}`)],
  );
}
