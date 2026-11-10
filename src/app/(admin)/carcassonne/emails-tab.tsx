"use client";

import { useEffect, useState } from "react";
import { LuKeyRound, LuMailCheck, LuPackage, LuPencil, LuUndo2, LuUserCheck } from "react-icons/lu";
import Modal from "@/components/modal";
import ReservationEmailForms from "@/components/reservationEmailForms";
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/utils/emailTemplates";
import TemplateEmailEditor from "./template-email-editor";

/** Os outros e-mails automáticos: textos editáveis (o visual segue o do pub). */
const EDITABLE: { id: EmailTemplateId; icon: React.ReactNode }[] = [
  { id: "rental-order", icon: <LuPackage size={16} /> },
  { id: "rental-refund", icon: <LuUndo2 size={16} /> },
  { id: "account-verify", icon: <LuUserCheck size={16} /> },
  { id: "account-reset", icon: <LuKeyRound size={16} /> },
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
  const [templateOpen, setTemplateOpen] = useState<EmailTemplateId | null>(null);

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

      <section className="flex flex-col gap-2 rounded-2xl border border-primary-gold/15 bg-secondary-black/40 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary-gold/60">
          Outros e-mails automáticos
        </span>
        <p className="text-xs text-primary-gold/45">
          Assunto e textos editáveis, com variáveis, prévia e teste. O visual segue o do Carcassonne Pub; os dados do
          pedido (jogos, datas, valores, link) entram sozinhos.
        </p>
        <ul className="flex flex-col gap-1.5">
          {EDITABLE.map(({ id, icon }) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-primary-gold/10 px-3 py-2.5"
            >
              <span className="shrink-0 text-primary-gold/60">{icon}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm text-primary-gold/85">{EMAIL_TEMPLATES[id].title}</span>
                <span className="text-xs text-primary-gold/45">{EMAIL_TEMPLATES[id].description}</span>
              </span>
              <button
                type="button"
                onClick={() => setTemplateOpen(id)}
                className="flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-lg border border-primary-gold/25 text-xs text-primary-gold/80 hover:border-primary-gold/60 hover:text-primary-gold cursor-pointer"
              >
                <LuPencil size={12} /> Editar
              </button>
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

      <Modal
        isOpen={templateOpen !== null}
        onClose={() => setTemplateOpen(null)}
        noPadding
        isFixed
        patternCloseButton={false}
      >
        {templateOpen && (
          <TemplateEmailEditor key={templateOpen} id={templateOpen} onClose={() => setTemplateOpen(null)} />
        )}
      </Modal>
    </div>
  );
}
