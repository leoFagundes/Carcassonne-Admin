import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties } from "react";
import { formatBRL } from "@/rental/money";
import { fillTemplate, mergeTemplate, type TemplateValues } from "@/utils/emailTemplates";
import { emailRich } from "./emailRich";

export type RentalRefundEmailProps = {
  customerName: string;
  code: string;
  /** Centavos. */
  amount: number;
  /** Uma frase explicando o motivo do reembolso. */
  reason: string;
  /** Textos editados em Configurações → E-mails; ausente = o padrão. */
  copy?: TemplateValues;
};

/** Valores das variáveis do e-mail de reembolso (assunto e textos). */
export function rentalRefundValues(p: Pick<RentalRefundEmailProps, "customerName" | "code" | "amount" | "reason">): TemplateValues {
  return { nome: p.customerName, codigo: p.code, valor: formatBRL(p.amount), motivo: p.reason };
}

// Mesma paleta clara do e-mail de confirmação do aluguel (rentalOrderEmail).
const color = {
  text: "#1f1d1a",
  body: "#3a3631",
  muted: "#6f6a60",
  gold: "#8a6a14",
  goldSoft: "#fbf5e4",
  goldBorder: "#dcc58a",
  line: "#ece6d8",
};

const main: CSSProperties = {
  backgroundColor: "#f4f1ea",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: "24px 0",
};
const card: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${color.line}`,
  borderRadius: "14px",
  overflow: "hidden",
};
const brand: CSSProperties = {
  margin: "0",
  padding: "22px 32px",
  backgroundColor: color.goldSoft,
  borderBottom: `1px solid ${color.goldBorder}`,
  textAlign: "center",
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "4px",
  textTransform: "uppercase",
  color: color.gold,
};
const contentBox: CSSProperties = { padding: "28px 32px 32px" };
const heading: CSSProperties = {
  margin: "0 0 10px",
  fontSize: "24px",
  lineHeight: "1.3",
  color: color.text,
};
const lead: CSSProperties = {
  margin: "0 0 24px",
  fontSize: "16px",
  lineHeight: "1.6",
  color: color.body,
};
const amountBox: CSSProperties = {
  backgroundColor: color.goldSoft,
  border: `1.5px dashed ${color.goldBorder}`,
  borderRadius: "12px",
  padding: "18px 16px",
  textAlign: "center",
};
const amountLabel: CSSProperties = {
  margin: "0",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: color.gold,
};
const amountValue: CSSProperties = {
  margin: "8px 0 6px",
  fontSize: "30px",
  fontWeight: 700,
  color: color.text,
};
const amountHint: CSSProperties = {
  margin: "0",
  fontSize: "12px",
  lineHeight: "1.5",
  color: color.muted,
};
const infoBox: CSSProperties = {
  marginTop: "20px",
  backgroundColor: color.goldSoft,
  borderLeft: `4px solid ${color.gold}`,
  borderRadius: "8px",
  padding: "12px 16px",
};
const infoText: CSSProperties = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "1.5",
  color: color.body,
};
const signOff: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: color.body,
};

export const RentalRefundEmail = ({ customerName, code, amount, reason, copy }: RentalRefundEmailProps) => {
  const c = mergeTemplate("rental-refund", copy);
  const fill = (text: string) => fillTemplate(text, rentalRefundValues({ customerName, code, amount, reason }));
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{fill(c.previewText)}</Preview>
      <Body style={main}>
        <Container>
          <Section style={card}>
            <Text style={brand}>Carcassonne Pub</Text>
            <Section style={contentBox}>
              <Heading style={heading}>{fill(c.heading)}</Heading>
              <Text style={lead}>{emailRich(fill(c.intro))}</Text>

              <Section style={amountBox}>
                <Text style={amountLabel}>{fill(c.amountLabel)}</Text>
                <Text style={amountValue}>{formatBRL(amount)}</Text>
                <Text style={amountHint}>{fill(c.amountHint)}</Text>
              </Section>

              {c.infoText.trim() && (
                <Section style={infoBox}>
                  <Text style={infoText}>{emailRich(fill(c.infoText))}</Text>
                </Section>
              )}

              <Text style={signOff}>{emailRich(fill(c.signOff))}</Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
