import "server-only";
import { Resend } from "resend";
import {
  RentalOrderEmail,
  rentalOrderValues,
  type RentalOrderEmailProps,
} from "@/components/react-email/rentalOrderEmail";
import {
  RentalRefundEmail,
  rentalRefundValues,
  type RentalRefundEmailProps,
} from "@/components/react-email/rentalRefundEmail";
import { fillTemplate } from "@/utils/emailTemplates";
import { loadEmailTemplate } from "./emailTemplatesServer";
import { siteUrl } from "./accountEmails";
import { loadGeneralConfigs } from "@/services/generalConfigsServer";
import { mergePubInfo } from "@/utils/generalSettings";

const FROM_ADDRESS = "Carcassonne Pub <aluguel@carcassonnepub.com.br>";

export function rentalRulesUrl(): string {
  return `${siteUrl()}/aluguel/regras`;
}

/** E-mail de confirmação do pedido; a equipe recebe uma cópia oculta se configurada. */
export async function sendOrderConfirmation(
  to: string,
  props: RentalOrderEmailProps,
  staffEmail?: string,
): Promise<void> {
  const staff = staffEmail?.trim();
  const customer = to.trim();
  // Cliente sem e-mail (cadastrado no balcão): só a equipe recebe, se configurada.
  if (!customer && !staff) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Endereço salvo em Configurações → Geral (falha na leitura → o padrão).
  const address = mergePubInfo((await loadGeneralConfigs())?.pubInfo).address;
  // Textos editados em Configurações → E-mails (falha na leitura → o padrão).
  const copy = await loadEmailTemplate("rental-order");
  const values = rentalOrderValues({
    customerName: props.customerName,
    code: props.code,
    count: props.items.length,
    total: props.total,
  });
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: customer || staff!,
    ...(customer && staff && staff.toLowerCase() !== customer.toLowerCase() ? { bcc: staff } : {}),
    subject: fillTemplate(copy.subject, values),
    react: <RentalOrderEmail {...props} address={address} copy={copy} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
}

/** E-mail de reembolso do pedido (valor, motivo e prazo típico). */
export async function sendRefundEmail(to: string, props: RentalRefundEmailProps): Promise<void> {
  if (!to.trim()) return; // cliente sem e-mail (cadastrado no balcão)
  const resend = new Resend(process.env.RESEND_API_KEY);
  const copy = await loadEmailTemplate("rental-refund");
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: fillTemplate(copy.subject, rentalRefundValues(props)),
    react: <RentalRefundEmail {...props} copy={copy} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
}
