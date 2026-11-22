/**
 * QR code em desenho vetorial (um caminho SVG), para ficar nítido no PDF em
 * qualquer tamanho. Correção de erro "M": aguenta um pouco de sujeira/dobra.
 */
import qrcode from "qrcode-generator";

export type QrShape = {
  /** Lado em módulos (quadradinhos). */
  size: number;
  /** Caminho SVG dos módulos escuros, em coordenadas de módulo. */
  path: string;
};

export function qrShape(text: string): QrShape {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.isDark(r, c)) {
        c++;
        continue;
      }
      // Junta os escuros seguidos da linha num retângulo só
      let len = 1;
      while (c + len < n && qr.isDark(r, c + len)) len++;
      parts.push(`M${c} ${r}h${len}v1h-${len}z`);
      c += len;
    }
  }
  return { size: n, path: parts.join("") };
}
