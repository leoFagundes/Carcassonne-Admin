import {
  ClientReservationEmail,
  StaffReservationEmail,
} from "@/components/react-email/clientResponseTemplate";
import { loadReservationEmailConfig } from "@/services/reservationEmailServer";
import { fillEmailTokens } from "@/utils/reservationEmail";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

resend.domains.verify("d91cd9bd-1176-453e-8fc1-35364d380206");

export async function POST(req) {
  try {
    const { to, subject, props, template } = await req.json();

    let finalSubject = subject;
    let component;
    if (template === "staff") {
      component = <StaffReservationEmail {...props} />;
    } else {
      // O conteúdo do e-mail do cliente é o editado no admin, lido aqui no
      // servidor — nunca vem do navegador de quem está reservando.
      const config = await loadReservationEmailConfig();
      finalSubject = fillEmailTokens(config.subject, props);
      component = <ClientReservationEmail {...props} config={config} />;
    }

    const data = await resend.emails.send({
      from: "Carcassonne Reservas <reservas@carcassonnepub.com.br>",
      to,
      subject: finalSubject,
      react: component,
    });

    if (data.error) {
      return Response.json({
        success: false,
        error: data.error.error || "Erro desconhecido",
      });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        success: false,
        error: error.message || "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
