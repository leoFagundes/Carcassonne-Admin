"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiCheck, FiCopy } from "react-icons/fi";
import { formatBRL } from "@/rental/money";

/**
 * Pix gerado na hora, na própria página do pedido: QR para ler no app do banco
 * e o "copia e cola" (no celular é o jeito mais fácil). A confirmação chega
 * sozinha: a página ouve o pedido em tempo real.
 */
export default function PixPayBox({ code, amount }: { code: string; amount: number }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <section className="flex flex-col items-center gap-4 rounded-xl border border-primary-gold/25 bg-secondary-black/60 p-4 sm:p-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="font-cinzel text-lg text-primary-gold">Pague com Pix</h2>
        <p className="text-xs text-primary-gold/60">
          {formatBRL(amount)} · a confirmação aparece aqui sozinha, em segundos.
        </p>
      </div>

      <div className="rounded-xl bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
        <QRCodeSVG value={code} size={216} level="M" marginSize={0} bgColor="#ffffff" fgColor="#111111" />
      </div>

      <ol className="flex w-full max-w-sm flex-col gap-1.5 text-xs text-primary-gold/70">
        <li>
          <strong className="text-primary-gold">1.</strong> Abra o app do seu banco e escolha <strong>Pix</strong>.
        </li>
        <li>
          <strong className="text-primary-gold">2.</strong> Leia o QR Code, ou use <strong>Pix copia e cola</strong> com o
          código abaixo (melhor opção no celular).
        </li>
        <li>
          <strong className="text-primary-gold">3.</strong> Confirme o pagamento. Pronto: esta página muda sozinha.
        </li>
      </ol>

      <div className="flex w-full max-w-sm flex-col gap-2">
        <code className="block max-h-20 overflow-y-auto break-all rounded-lg border border-primary-gold/15 bg-primary-black/50 px-3 py-2 text-[11px] leading-relaxed text-primary-gold/60 select-all">
          {code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-gold text-sm font-semibold text-primary-black transition-colors hover:bg-primary-gold/90 cursor-pointer"
        >
          {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
          {copied ? "Código copiado!" : "Copiar código Pix"}
        </button>
        {copyFailed && (
          <p className="text-center text-[11px] text-orange-200">
            Não deu para copiar automaticamente. Toque no código acima, selecione tudo e copie.
          </p>
        )}
      </div>
    </section>
  );
}
