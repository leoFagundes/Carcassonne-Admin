"use client";

import { useEffect, useState } from "react";
import { LuLock, LuMailCheck, LuPencil } from "react-icons/lu";
import Modal from "@/components/modal";
import ReservationEmailForms from "@/components/reservationEmailForms";

/** E-mails que o site envia e que não têm editor (o texto está no código). */
const AUTOMATIC_EMAILS = [
  {
    title: "Confirmação do aluguel",
    description: "Enviado ao cliente quando um pedido de aluguel é confirmado (código, jogos, datas e endereço).",
  },
  {
    title: "Confirmação de e-mail",
    description: "Enviado ao criar uma conta — de cliente do aluguel ou de administrador.",
  },
  {
    title: "Redefinição de senha",
    description: "Enviado pelo \"Esqueci minha senha\" do admin e do aluguel. O link vale por 1 hora.",
  },
];

/**
 * Aba "E-mails" das Configurações: o editor do e-mail de reserva (antes só
 * na página Adicionar) e a lista dos e-mails automáticos.
 */
export default function EmailsTab({
  openEditorOnLoad = false,
  onEditorOpened,
}: {
  openEditorOnLoad?: boolean;
  /** Avisa que o pedido de abrir já foi atendido (não reabre ao voltar à aba). */
  onEditorOpened?: () => void;
}) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (!openEditorOnLoad) return;
    setIsEditorOpen(true);
    onEditorOpened?.();
  }, [openEditorOnLoad, onEditorOpened]);

  return (
    <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
      <section className="flex flex-col gap-3 rounded-2xl border border-primary-gold/20 bg-secondary-black/50 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary-gold/10 border border-primary-gold/15 text-primary-gold shrink-0">
            <LuMailCheck size={20} />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-base font-semibold text-primary-gold">E-mail de reserva</h2>
            <p className="text-xs text-primary-gold/55 leading-relaxed">
              O e-mail que o cliente recebe ao fazer uma reserva: assunto, imagens, textos, aviso,
              endereço e assinatura. Dá para usar variáveis como {"{nome}"} e {"{data}"}, ver a prévia
              no computador e no celular e enviar um teste.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="self-end flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary-gold text-primary-black text-sm font-semibold hover:bg-primary-gold/90 transition-colors cursor-pointer"
        >
          <LuPencil size={14} /> Editar e-mail
        </button>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-primary-gold/10 bg-secondary-black/30 p-4">
        <div className="flex items-center gap-2 text-primary-gold/60">
          <LuLock size={13} />
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            E-mails automáticos
          </span>
        </div>
        <p className="text-xs text-primary-gold/45">
          Saem com o visual do Carcassonne Pub e não têm editor por aqui.
        </p>
        <ul className="flex flex-col gap-1.5">
          {AUTOMATIC_EMAILS.map((email) => (
            <li
              key={email.title}
              className="flex flex-col gap-0.5 rounded-lg border border-primary-gold/10 px-3 py-2"
            >
              <span className="text-sm text-primary-gold/85">{email.title}</span>
              <span className="text-xs text-primary-gold/45">{email.description}</span>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        noPadding
        isFixed
        patternCloseButton={false}
      >
        <ReservationEmailForms closeForms={() => setIsEditorOpen(false)} />
      </Modal>
    </div>
  );
}
