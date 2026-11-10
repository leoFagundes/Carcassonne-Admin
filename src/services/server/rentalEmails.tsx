import "server-only";
import { Resend } from "resend";
import {
  RentalOrderEmail,
  type RentalOrderEmailProps,
} from "@/components/react-email/rentalOrderEmail";
import {
  RentalRefundEmail,
  type RentalRefundEmailProps,
} from "@/components/react-email/rentalRefundEmail";
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
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: customer || staff!,
    ...(customer && staff && staff.toLowerCase() !== customer.toLowerCase() ? { bcc: staff } : {}),
    subject: `🎲 Aluguel confirmado — código ${props.code} · Carcassonne Pub`,
    react: <RentalOrderEmail {...props} address={address} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
}

/** E-mail de reembolso do pedido (valor, motivo e prazo típico). */
export async function sendRefundEmail(to: string, props: RentalRefundEmailProps): Promise<void> {
  if (!to.trim()) return; // cliente sem e-mail (cadastrado no balcão)
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Reembolso do pedido ${props.code} · Carcassonne Pub`,
    react: <RentalRefundEmail {...props} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
}
