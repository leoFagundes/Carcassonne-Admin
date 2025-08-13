import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
const warning = { ...paragraph, color: "#d9534f" };

export const ClientReservationEmail = ({
  name,
  code,
  bookingDate,
  time,
  adults,
  childs,
}: ReservationProps) => {
  return (
    <Html>
      <Head />
      <Preview>🍻 Sobre a sua reserva no Carcassonne Pub</Preview>
      <Body style={main}>
        <Container>
          <Section>
            <Text style={paragraph}>
              Olá <strong>{name}</strong>!
            </Text>

            <Text style={paragraph}>
              Recebemos sua solicitação de reserva no{" "}
              <strong>Carcassonne Pub</strong> e estamos muito felizes por você
              querer passar esse momento conosco!
            </Text>

            <Text style={paragraph}>
              <strong>Código:</strong> #{code}
              <br />
              🗓️ <strong>Data:</strong>{" "}
              {`${bookingDate.day}/${bookingDate.month}/${bookingDate.year}`}
              <br />⏰ <strong>Horário:</strong> {time}h
              <br />
              👥 <strong>Quantidade de pessoas:</strong> {adults + childs}{" "}
              pessoas
            </Text>

            <Text style={warning}>
              ⚠️ Lembramos que as reservas são válidas até{" "}
              <strong>19:30</strong>. Após esse horário, não conseguimos
              garantir a disponibilidade da mesa.
            </Text>

            <Text style={paragraph}>
              Caso precise cancelar sua reserva, por favor utilize o código da
              reserva recebido neste email aqui:{" "}
              <Link href="https://www.carcassonnepub.com.br/cancelreserve">
                https://www.carcassonnepub.com.br/cancelreserve
              </Link>
              .
            </Text>

            <Text style={paragraph}>
              Nos vemos em breve! 🍺
              <br />
              <strong>Equipe Carcassonne Pub</strong>
            </Text>
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
      <Preview>📩 Nova reserva recebida - Carcassonne Pub</Preview>
      <Body style={main}>
        <Container>
          <Section>
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
              👥 <strong>Quantidade de pessoas:</strong> {adults + childs}{" "}
              (Adultos: {adults} | Crianças: {childs})
            </Text>

            {observation && (
              <Text style={paragraph}>
                📝 <strong>Observações do cliente:</strong> {observation}
              </Text>
            )}

            <Text style={{ ...paragraph, fontSize: 14, color: "#777" }}>
              <strong>Enviado automaticamente pelo sistema de reservas</strong>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
