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
  const resend = new Resend(process.env.RESEND_API_KEY);
  const staff = staffEmail?.trim();
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    ...(staff && staff.toLowerCase() !== to.toLowerCase() ? { bcc: staff } : {}),
    subject: `🎲 Aluguel confirmado — código ${props.code} · Carcassonne Pub`,
    react: <RentalOrderEmail {...props} />,
  });
  if (result.error) {
    throw new Error(`Falha ao enviar e-mail: ${result.error.message}`);
  }
}

/** E-mail de reembolso do pedido (valor, motivo e prazo típico). */
export async function sendRefundEmail(to: string, props: RentalRefundEmailProps): Promise<void> {
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
