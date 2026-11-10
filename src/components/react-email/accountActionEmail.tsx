import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties } from "react";
import { mergeTemplate, type TemplateValues } from "@/utils/emailTemplates";
import { emailRich } from "./emailRich";

// Mesma paleta clara do e-mail de reserva (clientResponseTemplate).
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
const button: CSSProperties = {
  backgroundColor: color.gold,
  borderRadius: "8px",
  padding: "13px 28px",
  fontSize: "15px",
  fontWeight: 700,
  color: "#ffffff",
  textDecoration: "none",
};
const note: CSSProperties = {
  margin: "20px 0 0",
  fontSize: "13px",
  lineHeight: "1.5",
  color: color.muted,
  textAlign: "center",
};
const divider: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${color.line}`,
  margin: "24px 0 16px",
};
const small: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "12px",
  lineHeight: "1.5",
  color: color.muted,
  wordBreak: "break-all",
};

export const AccountActionEmail = ({
  kind,
  link,
  copy,
}: {
  kind: "verify" | "reset";
  link: string;
  /** Textos editados em Configurações → E-mails; ausente = o padrão. */
  copy?: TemplateValues;
}) => {
  const c = mergeTemplate(kind === "verify" ? "account-verify" : "account-reset", copy);
  const notice = kind === "reset" ? (c.noticeText ?? "").trim() : "";
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{c.previewText}</Preview>
      <Body style={main}>
        <Container>
          <Section style={card}>
            <Text style={brand}>Carcassonne Pub</Text>
            <Section style={contentBox}>
              <Heading style={heading}>{c.heading}</Heading>
              <Text style={lead}>{emailRich(c.intro)}</Text>
              <Section style={{ textAlign: "center" }}>
                <Button href={link} style={button}>
                  {c.buttonLabel}
                </Button>
              </Section>
              {notice && <Text style={note}>{emailRich(notice)}</Text>}
              {c.ignoreText.trim() && <Text style={note}>{emailRich(c.ignoreText)}</Text>}
              <Hr style={divider} />
              <Text style={small}>
                Se o botão não funcionar, copie e cole este endereço no
                navegador:
              </Text>
              <Text style={small}>
                <Link href={link} style={{ color: color.gold }}>
                  {link}
                </Link>
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
