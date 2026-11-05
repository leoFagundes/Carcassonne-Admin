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

type Copy = {
  preview: string;
  title: string;
  lead: string;
  button: string;
  notice: string | null;
  ignore: string;
};

const COPY: Record<"verify" | "reset", Copy> = {
  verify: {
    preview: "Confirme seu e-mail - Carcassonne Pub",
    title: "Confirme seu e-mail ✉️",
    lead: "Falta só um passo. Confirme seu e-mail para continuar usando sua conta no Carcassonne Pub.",
    button: "Confirmar e-mail",
    notice: null,
    ignore: "Se você não criou uma conta, pode ignorar este e-mail.",
  },
  reset: {
    preview: "Redefinir sua senha - Carcassonne Pub",
    title: "Redefinir sua senha 🔑",
    lead: "Recebemos um pedido para criar uma nova senha para a sua conta. Clique no botão abaixo para escolher uma nova.",
    button: "Criar nova senha",
    notice: "Este link vale por 1 hora e só pode ser usado uma vez.",
    ignore:
      "Se você não pediu isso, pode ignorar este e-mail. Sua senha continua a mesma.",
  },
};

export const AccountActionEmail = ({
  kind,
  link,
}: {
  kind: "verify" | "reset";
  link: string;
}) => {
  const c = COPY[kind];
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={main}>
        <Container>
          <Section style={card}>
            <Text style={brand}>Carcassonne Pub</Text>
            <Section style={contentBox}>
              <Heading style={heading}>{c.title}</Heading>
              <Text style={lead}>{c.lead}</Text>
              <Section style={{ textAlign: "center" }}>
                <Button href={link} style={button}>
                  {c.button}
                </Button>
              </Section>
              {c.notice && <Text style={note}>{c.notice}</Text>}
              <Text style={note}>{c.ignore}</Text>
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
