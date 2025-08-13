import {
  ClientReservationEmail,
  StaffReservationEmail,
} from "@/emails/Templates";

export async function POST(req) {
  const { to, subject, props, template } = await req.json();

  const component =
    template === "staff" ? (
      <StaffReservationEmail {...props} />
    ) : (
      <ClientReservationEmail {...props} />
    );

  const data = await resend.emails.send({
    from: "Carcassonne Pub <reservas@carcassonnepub.com.br>",
    to,
    subject,
    react: component,
  });

  return Response.json({ success: true, data });
}
