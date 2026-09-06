import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
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
              <Text style={paragraph}>
                Olá <strong>{name}</strong>!
              </Text>

              <Text style={paragraph}>
                Recebemos sua solicitação de reserva no{" "}
                <strong>Carcassonne Pub</strong> e estamos muito felizes por
                você querer passar esse momento conosco!
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
                reserva recebido aqui:{" "}
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
