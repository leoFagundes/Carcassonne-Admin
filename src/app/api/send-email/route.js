import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

resend.domains.verify("d91cd9bd-1176-453e-8fc1-35364d380206");

export async function POST(req) {
  try {
    const { to, subject, message } = await req.json();

    const data = await resend.emails.send({
      from: "Carcassonne <carcassonnepub@gmail.com>",
      to,
      subject: subject,
      html: `<div>${message}</div>`,
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
