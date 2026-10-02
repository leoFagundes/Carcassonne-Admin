import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties } from "react";

interface ReservationProps {
  name: string;
  code: string;
  bookingDate: { day: string; month: string; year: string };
  time: string;
  adults: number;
  childs: number;
  email?: string;
  phone?: string;
  observation?: string;
}

const main = {
  backgroundColor: "#fff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const paragraph = { fontSize: 16, lineHeight: "1.5", color: "#333" };

const content = {
  border: "1px solid rgb(0,0,0, 0.1)",
  borderRadius: "3px",
  overflow: "hidden",
};

const image = {
  maxWidth: "100%",
};

const containerImageFooter = {
  padding: "45px 0 0 0",
};

// ── E-mail do cliente ────────────────────────────────────────────────────────

const BANNER_URL =
  "https://firebasestorage.googleapis.com/v0/b/carcassonne-admin.firebasestorage.app/o/reserve%2Freservas.png?alt=media&token=c36a300d-dc25-4079-b71b-55e5014e9311";
const CITY_URL =
  "https://firebasestorage.googleapis.com/v0/b/carcassonne-admin.firebasestorage.app/o/reserve%2Freservas-rodape.png?alt=media&token=5abc2303-2e5f-4e6c-933d-b0b9f5924e79";
const CANCEL_URL = "https://www.carcassonnepub.com.br/cancelreserve";

// Layout claro de propósito: fundo escuro é invertido de forma imprevisível
// pelo "modo escuro" de vários clientes de e-mail (Gmail, Outlook).
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

const clientMain: CSSProperties = {
  backgroundColor: "#f4f1ea",
  fontFamily: main.fontFamily,
  padding: "24px 0",
};
const clientCard: CSSProperties = {
  backgroundColor: "#ffffff",
  border: `1px solid ${color.line}`,
  borderRadius: "14px",
  overflow: "hidden",
};
const clientContent: CSSProperties = { padding: "28px 32px 32px" };
const clientHeading: CSSProperties = {
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
// Código sozinho, sem "#" nem pontuação em volta: assim o "tocar e segurar"
// do celular seleciona exatamente o código. Clientes de e-mail não rodam
// JavaScript, então um botão de copiar de verdade não é possível.
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
const detailsBox: CSSProperties = {
  marginTop: "20px",
  backgroundColor: color.surface,
  border: `1px solid ${color.line}`,
  borderRadius: "12px",
  padding: "4px 18px",
};
const detailRow: CSSProperties = { borderBottom: `1px solid ${color.line}` };
const detailLabel: CSSProperties = {
  padding: "12px 0",
  fontSize: "14px",
  color: color.muted,
  width: "38%",
};
const detailValue: CSSProperties = {
  padding: "12px 0",
  fontSize: "15px",
  fontWeight: 600,
  color: color.text,
  textAlign: "right",
};
const warningBox: CSSProperties = {
  marginTop: "20px",
  backgroundColor: "#fdf2f1",
  borderLeft: "4px solid #d9534f",
  borderRadius: "8px",
  padding: "12px 16px",
};
const warningText: CSSProperties = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#8f2b25",
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
  margin: "28px 0 24px",
};
const cancelTitle: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "16px",
  fontWeight: 700,
  color: color.text,
  textAlign: "center",
};
const cancelText: CSSProperties = {
  margin: "0 0 16px",
  fontSize: "14px",
  lineHeight: "1.6",
  color: color.muted,
  textAlign: "center",
};
// Botão discreto de propósito: cancelar é a ação secundária desse e-mail.
const cancelButton: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #d6cfbf",
  borderRadius: "8px",
  padding: "11px 22px",
  fontSize: "14px",
  fontWeight: 600,
  color: color.body,
  textDecoration: "none",
};
const fallbackLink: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "12px",
  color: color.muted,
  textAlign: "center",
};
const signOff: CSSProperties = {
  margin: "28px 0 0",
  fontSize: "15px",
  lineHeight: "1.6",
  color: color.body,
};

function formatBookingDate(bookingDate: ReservationProps["bookingDate"]) {
  const date = new Date(
    Number(bookingDate.year),
    Number(bookingDate.month) - 1,
    Number(bookingDate.day),
  );
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${bookingDate.day}/${bookingDate.month}/${bookingDate.year}`;
}

export const ClientReservationEmail = ({
  name,
  code,
  bookingDate,
  time,
  adults,
  childs,
}: ReservationProps) => {
  const people = adults + childs;

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`Reserva confirmada para ${bookingDate.day}/${bookingDate.month} às ${time}h · código ${code}`}</Preview>
      <Body style={clientMain}>
        <Container>
          <Section style={clientCard}>
            <Img
              style={image}
              width={620}
              src={BANNER_URL}
              alt="Carcassonne Pub"
            />

            <Section style={clientContent}>
              <Heading style={clientHeading}>Reserva confirmada! 🍻</Heading>
              <Text style={lead}>
                Olá, <strong>{name}</strong>! Sua reserva no{" "}
                <strong>Carcassonne Pub</strong> está confirmada — estamos muito
                felizes por você querer passar esse momento com a gente.
              </Text>

              <Section style={codeBox}>
                <Text style={codeLabel}>Código da reserva</Text>
                <Text style={codeValue}>{code}</Text>
                <Text style={codeHint}>
                  Toque e segure o código para copiar. Guarde-o: você vai
                  precisar dele se quiser cancelar.
                </Text>
              </Section>

              <Section style={detailsBox}>
                <Row style={detailRow}>
                  <Column style={detailLabel}>🗓️ Data</Column>
                  <Column style={detailValue}>
                    {formatBookingDate(bookingDate)}
                  </Column>
                </Row>
                <Row style={detailRow}>
                  <Column style={detailLabel}>⏰ Horário</Column>
                  <Column style={detailValue}>{time}h</Column>
                </Row>
                <Row>
                  <Column style={detailLabel}>👥 Pessoas</Column>
                  <Column style={detailValue}>
                    {people} {people === 1 ? "pessoa" : "pessoas"}
                  </Column>
                </Row>
              </Section>

              <Section style={warningBox}>
                <Text style={warningText}>
                  ⚠️ As reservas são válidas até <strong>19:30</strong>. Depois
                  desse horário, não conseguimos garantir a disponibilidade da
                  mesa.
                </Text>
              </Section>

              <Text style={addressText}>
                📍 CLN 407 Bloco E Loja 37 — Asa Norte, Brasília/DF
              </Text>

              <Hr style={divider} />

              <Text style={cancelTitle}>Precisa cancelar?</Text>
              <Text style={cancelText}>
                Sem problemas — é só abrir a página de cancelamento e informar o
                código acima.
              </Text>
              <Section style={{ textAlign: "center" }}>
                <Button href={CANCEL_URL} style={cancelButton}>
                  Cancelar reserva
                </Button>
              </Section>
              <Text style={fallbackLink}>
                Se o botão não funcionar, acesse{" "}
                <Link href={CANCEL_URL} style={{ color: color.gold }}>
                  carcassonnepub.com.br/cancelreserve
                </Link>
              </Text>

              <Text style={signOff}>
                Nos vemos em breve! 🍺
                <br />
                <strong>Equipe Carcassonne Pub</strong>
              </Text>
            </Section>
          </Section>

          <Section style={containerImageFooter}>
            <Img style={image} width={620} src={CITY_URL} alt="" />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export const StaffReservationEmail = ({
  name,
  code,
  bookingDate,
  time,
  adults,
  childs,
  email,
  phone,
  observation,
}: ReservationProps) => {
  return (
    <Html>
      <Head />
      <Preview>Nova reserva recebida - Carcassonne Pub</Preview>
      <Body style={main}>
        <Container>
          <Section style={content}>
            <Row>
              <Img
                style={image}
                width={620}
                src={
                  "https://firebasestorage.googleapis.com/v0/b/carcassonne-admin.firebasestorage.app/o/reserve%2Fbanner.png?alt=media&token=ca0e51d0-c489-44e3-b0e4-c21dd7e4dfef"
                }
                alt="banner carcassonne"
              />
            </Row>
            <Row
              style={{
                paddingRight: 32,
                paddingTop: 20,
                paddingBottom: 20,
                paddingLeft: 32,
              }}
            >
              <Heading style={{ fontSize: 20, marginBottom: "10px" }}>
                Nova solicitação de reserva recebida!
              </Heading>

              <Text style={paragraph}>
                <strong>Nome do cliente:</strong> {name}
                <br />
                📧 <strong>Email:</strong> {email}
                <br />
                📱 <strong>Telefone:</strong> {phone}
              </Text>

              <Text style={paragraph}>
                <strong>Código da reserva:</strong> #{code}
                <br />
                🗓️ <strong>Data:</strong>{" "}
                {`${bookingDate.day}/${bookingDate.month}/${bookingDate.year}`}
                <br />⏰ <strong>Horário:</strong> {time}h
                <br />
                👥 <strong>Quantidade de pessoas:</strong> {adults + childs}
                {/* Distinção adultos/crianças removida das reservas —
                    detalhamento comentado, fica só o total de pessoas acima.
                (Adultos: {adults} | Crianças: {childs})
                */}
              </Text>

              {observation && (
                <Text style={paragraph}>
                  📝 <strong>Observações do cliente:</strong> {observation}
                </Text>
              )}

              <Text style={{ ...paragraph, fontSize: 14, color: "#777" }}>
                <strong>
                  Enviado automaticamente pelo sistema de reservas
                </strong>
              </Text>
            </Row>
          </Section>
          <Section style={containerImageFooter}>
            <Img
              style={image}
              width={620}
              src={
                "https://firebasestorage.googleapis.com/v0/b/carcassonne-admin.firebasestorage.app/o/reserve%2Fcity.png?alt=media&token=92481a4d-4268-4270-b693-f664b5244e20"
              }
              alt="city"
            />
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
