import "server-only";
import { render } from "@react-email/components";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { AccountActionEmail } from "@/components/react-email/accountActionEmail";
import { RentalOrderEmail, rentalOrderValues } from "@/components/react-email/rentalOrderEmail";
import { RentalRefundEmail, rentalRefundValues } from "@/components/react-email/rentalRefundEmail";
import { todaySP, addDays } from "@/rental/dates";
import {
  EMAIL_TEMPLATE_COLLECTION,
  fillTemplate,
  mergeTemplate,
  type EmailTemplateId,
  type TemplateValues,
} from "@/utils/emailTemplates";
import { siteUrl } from "./accountEmails";
import { getAdminDb } from "./firebaseAdmin";

// Textos editados dos e-mails automáticos (Configurações → E-mails). Cache
// curto: muitos envios seguidos não leem o banco toda vez, e o que o admin
// salva vale em até um minuto.
const CACHE_MS = 60_000;
const cache = new Map<EmailTemplateId, { at: number; value: TemplateValues }>();

export async function loadEmailTemplate(id: EmailTemplateId): Promise<TemplateValues> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  let value: TemplateValues;
  try {
    const snap = await getAdminDb().collection(EMAIL_TEMPLATE_COLLECTION).doc(id).get();
    value = mergeTemplate(id, snap.exists ? (snap.data() as Record<string, unknown>) : null);
  } catch (error) {
    // Falha na leitura: o e-mail sai com o texto padrão (nunca deixa de sair).
    console.error(`Erro ao ler o modelo de e-mail ${id}; usando o padrão:`, error);
    value = mergeTemplate(id, null);
  }
  cache.set(id, { at: Date.now(), value });
  return value;
}

/** E-mail de exemplo (prévia e teste) com os textos informados. */
function sampleEmail(id: EmailTemplateId, copy: TemplateValues): { subject: string; element: ReactElement } {
  const today = todaySP();
  const link = `${siteUrl()}/conta/acao?mode=exemplo&oobCode=exemplo`;
  switch (id) {
    case "rental-order": {
      const items = [
        { gameName: "Catan", startDate: today, dueDate: addDays(today, 7), price: 4500 },
        { gameName: "Ticket to Ride", startDate: today, dueDate: addDays(today, 7), price: 4500 },
      ];
      const props = {
        customerName: "Maria",
        code: "K7P2QX",
        items,
        total: 9000,
        rulesUrl: `${siteUrl()}/aluguel/regras`,
      };
      return {
        subject: fillTemplate(copy.subject, rentalOrderValues({ ...props, count: items.length })),
        element: <RentalOrderEmail {...props} copy={copy} />,
      };
    }
    case "rental-refund": {
      const props = {
        customerName: "Maria",
        code: "K7P2QX",
        amount: 4500,
        reason: "Você cancelou o aluguel de Catan e devolvemos o valor integral.",
      };
      return {
        subject: fillTemplate(copy.subject, rentalRefundValues(props)),
        element: <RentalRefundEmail {...props} copy={copy} />,
      };
    }
    case "account-verify":
    case "account-reset":
      return {
        subject: copy.subject,
        element: <AccountActionEmail kind={id === "account-verify" ? "verify" : "reset"} link={link} copy={copy} />,
      };
  }
}

/** HTML da prévia do editor, com os textos ainda não salvos. */
export async function renderEmailPreview(
  id: EmailTemplateId,
  draft: Record<string, unknown>,
): Promise<{ html: string; subject: string }> {
  const { subject, element } = sampleEmail(id, mergeTemplate(id, draft));
  return { html: await render(element), subject };
}

const TEST_FROM = "Carcassonne Pub <conta@carcassonnepub.com.br>";

/** Envia o e-mail de exemplo com a versão salva (o assunto ganha "[Teste]"). */
export async function sendEmailTemplateTest(id: EmailTemplateId, to: string): Promise<void> {
  cache.delete(id); // acabou de salvar: lê de novo
  const { subject, element } = sampleEmail(id, await loadEmailTemplate(id));
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: TEST_FROM,
    to,
    subject: `[Teste] ${subject}`,
    react: element,
  });
  if (result.error) throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
}
