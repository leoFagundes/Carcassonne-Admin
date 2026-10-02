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
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ReservationEmailConfigType } from "@/types";
import {
  DEFAULT_RESERVATION_EMAIL,
  fillEmailTokens,
  formatWeekday,
  mergeReservationEmailConfig,
} from "@/utils/reservationEmail";

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
  /** Conteúdo editado no admin; sem isso usa o conteúdo padrão. */
  config?: Partial<ReservationEmailConfigType> | null;
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

// Fixo de propósito (não editável no admin): mudar esse link quebraria o
// cancelamento.
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
// Banner e rodapé ficam dentro do card, formando o topo e a base dele. O
// arredondamento vai na própria imagem (13px = 14px do card menos 1px de
// borda) porque nem todo cliente de e-mail respeita o overflow do card.
const bannerImage: CSSProperties = { ...image, borderRadius: "13px 13px 0 0" };
const footerImage: CSSProperties = { ...image, borderRadius: "0 0 13px 13px" };
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
// Observação é texto livre (pode ser longo), então fica em linha inteira,
// com o rótulo em cima, em vez de rótulo/valor lado a lado.
const observationCell: CSSProperties = { padding: "12px 0" };
const observationLabel: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "14px",
  lineHeight: "1.5",
  color: color.muted,
};
const observationValue: CSSProperties = {
  margin: "0",
  fontSize: "15px",
  lineHeight: "1.5",
  color: color.text,
  wordBreak: "break-word",
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

// Formatação mínima permitida nos textos editados no admin: "**texto**" vira
// negrito e cada quebra de linha vira <br />. Todo o resto é texto puro (o
// React escapa), então não há como injetar HTML pelo editor.
function richText(text: string): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex) => {
    const parts = line
      .split(/(\*\*[^*]+\*\*)/g)
      .filter((part) => part !== "")
      .map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={`${lineIndex}-${i}`}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={`${lineIndex}-${i}`}>{part}</Fragment>
        ),
      );
    return lineIndex === 0 ? parts : [<br key={`br-${lineIndex}`} />, ...parts];
  });
}

// Texto digitado pelo cliente: só as quebras de linha são respeitadas, sem
// nenhuma formatação.
function plainText(text: string): ReactNode[] {
  return text
    .split("\n")
    .flatMap((line, i) => (i === 0 ? [line] : [<br key={i} />, line]));
}

export const ClientReservationEmail = ({
  name,
  code,
  bookingDate,
  time,
  adults,
  childs,
  observation,
  config,
}: ReservationProps) => {
  const c = mergeReservationEmailConfig(config);
  const data = { name, code, bookingDate, time, adults, childs };
  const fill = (text: string) => fillEmailTokens(text, data);
  const people = adults + childs;
  const note = observation?.trim();

  return (
    <Html lang="pt-BR">
      <Head />
      {c.previewText.trim() && <Preview>{fill(c.previewText)}</Preview>}
      <Body style={clientMain}>
        <Container>
          <Section style={clientCard}>
            {c.bannerUrl && (
              <Img
                style={bannerImage}
                width={620}
                src={c.bannerUrl}
                alt="Carcassonne Pub"
              />
            )}

            <Section style={clientContent}>
              {c.heading.trim() && (
                <Heading style={clientHeading}>{fill(c.heading)}</Heading>
              )}
              {c.intro.trim() && (
                <Text style={lead}>{richText(fill(c.intro))}</Text>
              )}

              <Section style={codeBox}>
                {c.codeLabel.trim() && (
                  <Text style={codeLabel}>{fill(c.codeLabel)}</Text>
                )}
                <Text style={codeValue}>{code}</Text>
                {c.codeHint.trim() && (
                  <Text style={codeHint}>{richText(fill(c.codeHint))}</Text>
                )}
              </Section>

              <Section style={detailsBox}>
                <Row style={detailRow}>
                  <Column style={detailLabel}>🗓️ Data</Column>
                  <Column style={detailValue}>
                    {formatWeekday(bookingDate)}, {bookingDate.day}/
                    {bookingDate.month}/{bookingDate.year}
                  </Column>
                </Row>
                <Row style={detailRow}>
                  <Column style={detailLabel}>⏰ Horário</Column>
                  <Column style={detailValue}>{time}h</Column>
                </Row>
                <Row style={note ? detailRow : undefined}>
                  <Column style={detailLabel}>👥 Pessoas</Column>
                  <Column style={detailValue}>
                    {people} {people === 1 ? "pessoa" : "pessoas"}
                  </Column>
                </Row>
                {note && (
                  <Row>
                    <Column style={observationCell}>
                      <Text style={observationLabel}>📝 Observação</Text>
                      <Text style={observationValue}>{plainText(note)}</Text>
                    </Column>
                  </Row>
                )}
              </Section>

              {c.showWarning && c.warningText.trim() && (
                <Section style={warningBox}>
                  <Text style={warningText}>
                    {richText(fill(c.warningText))}
                  </Text>
                </Section>
              )}

              {c.showAddress && c.addressText.trim() && (
                <Text style={addressText}>{richText(fill(c.addressText))}</Text>
              )}

              <Hr style={divider} />

              {c.cancelTitle.trim() && (
                <Text style={cancelTitle}>{fill(c.cancelTitle)}</Text>
              )}
              {c.cancelText.trim() && (
                <Text style={cancelText}>{richText(fill(c.cancelText))}</Text>
              )}
              <Section style={{ textAlign: "center" }}>
                <Button href={CANCEL_URL} style={cancelButton}>
                  {fill(c.cancelButtonLabel).trim() ||
                    DEFAULT_RESERVATION_EMAIL.cancelButtonLabel}
                </Button>
              </Section>
              <Text style={fallbackLink}>
                Se o botão não funcionar, acesse{" "}
                <Link href={CANCEL_URL} style={{ color: color.gold }}>
                  carcassonnepub.com.br/cancelreserve
                </Link>
              </Text>

              {c.signOff.trim() && (
                <Text style={signOff}>{richText(fill(c.signOff))}</Text>
              )}
            </Section>

            {c.footerImageUrl && (
              <Img
                style={footerImage}
                width={620}
                src={c.footerImageUrl}
                alt=""
              />
            )}
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
