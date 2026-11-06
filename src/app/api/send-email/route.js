import {
  ClientReservationEmail,
  StaffReservationEmail,
} from "@/components/react-email/clientResponseTemplate";
import { loadReservationEmailConfig } from "@/services/reservationEmailServer";
import { fillEmailTokens } from "@/utils/reservationEmail";
import { loadGeneralConfigs } from "@/services/generalConfigsServer";
import { mergePubInfo, reserveStaffEmails } from "@/utils/generalSettings";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

resend.domains.verify("d91cd9bd-1176-453e-8fc1-35364d380206");

export async function POST(req) {
  try {
    const body = await req.json();
    const { subject, props, template } = body;
    let to = body.to;

    let finalSubject = subject;
    let component;
    if (template === "staff") {
      // O aviso de nova reserva vai para a equipe definida no admin
      // (Configurações → Geral → E-mails da equipe), nunca para quem o navegador pedir.
      const configs = await loadGeneralConfigs();
      to = reserveStaffEmails(configs?.staffReserveEmails, mergePubInfo(configs?.pubInfo).email);
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
