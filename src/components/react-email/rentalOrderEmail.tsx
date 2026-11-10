import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties } from "react";
import { formatDateBR } from "@/rental/dates";
import { formatBRL } from "@/rental/money";
import { fillTemplate, gamesPhrase, mergeTemplate, type TemplateValues } from "@/utils/emailTemplates";
import { emailRich, emailRichWith } from "./emailRich";

export type RentalOrderEmailItem = {
  gameName: string;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** "YYYY-MM-DD" */
  dueDate: string;
  /** Centavos. */
  price: number;
};

export type RentalOrderEmailProps = {
  customerName: string;
  code: string;
  items: RentalOrderEmailItem[];
  /** Centavos. */
  total: number;
  rulesUrl: string;
  /** Pago online (forma do pagamento); ausente = pagamento no balcão. */
  paidOnline?: "pix" | "card" | "other";
  /** Texto do pagamento no lugar do padrão (ex.: pago no balcão, cortesia). */
  paymentNote?: string;
  /** O cliente já levou os jogos (aluguel criado no balcão com retirada na hora). */
  pickedUp?: boolean;
  /** Textos editados em Configurações → E-mails; ausente = o padrão. */
  copy?: TemplateValues;
  /** Endereço do pub (Configurações → Geral); ausente = o padrão. */
  address?: string;
};

const PAID_ONLINE_LABEL: Record<NonNullable<RentalOrderEmailProps["paidOnline"]>, string> = {
  pix: "Pago online via Pix.",
  card: "Pago online via cartão.",
  other: "Pago online via Mercado Pago.",
};

// Mesma paleta clara do e-mail de reserva (clientResponseTemplate): fundo
// escuro é invertido de forma imprevisível pelo "modo escuro" dos clientes.
const color = {
  text: "#1f1d1a",
  body: "#3a3631",
  muted: "#6f6a60",
  gold: "#8a6a14",
  goldSoft: "#fbf5e4",
  goldBorder: "#dcc58a",
  line: "#ece6d8",
  surface: "#faf8f3",
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
const codeBox: CSSProperties = {
  backgroundColor: color.goldSoft,
  border: `1.5px dashed ${color.goldBorder}`,
  borderRadius: "12px",
  padding: "18px 16px",
  textAlign: "center",
};
const codeLabel: CSSProperties = {
  margin: "0",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: color.gold,
};
// Código sozinho, sem pontuação em volta: o "tocar e segurar" do celular
// seleciona exatamente o código.
const codeValue: CSSProperties = {
  margin: "8px 0 6px",
  fontFamily:
    "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: "30px",
  fontWeight: 700,
  letterSpacing: "6px",
  color: color.text,
  userSelect: "all",
  WebkitUserSelect: "all",
};
const codeHint: CSSProperties = {
  margin: "0",
  fontSize: "12px",
  lineHeight: "1.5",
  color: color.muted,
};
const itemsBox: CSSProperties = {
  marginTop: "20px",
  backgroundColor: color.surface,
  border: `1px solid ${color.line}`,
  borderRadius: "12px",
  padding: "4px 18px",
};
const itemRow: CSSProperties = { borderBottom: `1px solid ${color.line}` };
const itemCell: CSSProperties = { padding: "12px 0", verticalAlign: "top" };
const gameName: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "1.4",
  color: color.text,
};
const itemDates: CSSProperties = {
  margin: "0",
  fontSize: "13px",
  lineHeight: "1.5",
  color: color.muted,
};
const priceCell: CSSProperties = {
  padding: "12px 0",
  verticalAlign: "top",
  textAlign: "right",
  fontSize: "15px",
  fontWeight: 600,
  color: color.text,
  whiteSpace: "nowrap",
};
const totalLabel: CSSProperties = {
  padding: "14px 0",
  fontSize: "15px",
  fontWeight: 700,
  color: color.text,
};
const totalValue: CSSProperties = {
  padding: "14px 0",
  textAlign: "right",
  fontSize: "17px",
  fontWeight: 700,
  color: color.gold,
};
const paymentBox: CSSProperties = {
  marginTop: "20px",
  backgroundColor: color.goldSoft,
  borderLeft: `4px solid ${color.gold}`,
  borderRadius: "8px",
  padding: "12px 16px",
};
const paymentText: CSSProperties = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "1.5",
  color: color.body,
};
const addressText: CSSProperties = {
  margin: "18px 0 0",
  fontSize: "13px",
  lineHeight: "1.5",
  color: color.muted,
  textAlign: "center",
};
const divider: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${color.line}`,
  margin: "28px 0 20px",
};
const rulesText: CSSProperties = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "1.6",
  color: color.muted,
  textAlign: "center",
};
const signOff: CSSProperties = {
  margin: "24px 0 0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: color.body,
};

export const RentalOrderEmail = ({
  customerName,
  code,
  items,
  total,
  rulesUrl,
  paidOnline,
  paymentNote,
  pickedUp,
  copy,
  address = "CLN 407 Bloco E Loja 37 — Asa Norte, Brasília/DF",
}: RentalOrderEmailProps) => {
  const count = items.length;
  const c = mergeTemplate("rental-order", copy);
  const values = rentalOrderValues({ customerName, code, count, total });
  const fill = (text: string) => fillTemplate(text, values);
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
              <Text style={lead}>{emailRich(fill(pickedUp ? c.introPickedUp : c.intro))}</Text>

              <Section style={codeBox}>
                <Text style={codeLabel}>{fill(c.codeLabel)}</Text>
                <Text style={codeValue}>{code}</Text>
                <Text style={codeHint}>{fill(c.codeHint)}</Text>
              </Section>

              <Section style={itemsBox}>
                {items.map((item, i) => (
                  <Row key={`${item.gameName}-${i}`} style={itemRow}>
                    <Column style={itemCell}>
                      <Text style={gameName}>{item.gameName}</Text>
                      <Text style={itemDates}>
                        Retirada: {formatDateBR(item.startDate, true)} ·
                        Devolução: {formatDateBR(item.dueDate, true)}
                      </Text>
                    </Column>
                    <Column style={priceCell}>{formatBRL(item.price)}</Column>
                  </Row>
                ))}
                <Row>
                  <Column style={totalLabel}>Total</Column>
                  <Column style={totalValue}>{formatBRL(total)}</Column>
                </Row>
              </Section>

              <Section style={paymentBox}>
                <Text style={paymentText}>
                  💳{" "}
                  <strong>
                    {paymentNote ??
                      (paidOnline
                        ? PAID_ONLINE_LABEL[paidOnline]
                        : "Pagamento no balcão, na retirada.")}
                  </strong>
                </Text>
              </Section>

              <Text style={addressText}>
                📍 {address}
              </Text>

              <Hr style={divider} />

              <Text style={rulesText}>
                {emailRichWith(
                  fill(c.rulesText),
                  "{regras}",
                  <Link href={rulesUrl} style={{ color: color.gold }}>
                    regras do aluguel
                  </Link>,
                )}
              </Text>

              <Text style={signOff}>{emailRich(fill(c.signOff))}</Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

/** Valores das variáveis do e-mail de confirmação (assunto e textos). */
export function rentalOrderValues(o: { customerName: string; code: string; count: number; total: number }): TemplateValues {
  return {
    nome: o.customerName,
    codigo: o.code,
    jogos: gamesPhrase(o.count),
    quantidade: String(o.count),
    total: formatBRL(o.total),
  };
}
