import { render } from "@react-email/components";
import { ClientReservationEmail } from "@/components/react-email/clientResponseTemplate";
import {
  mergeReservationEmailConfig,
  type ReservationEmailData,
} from "@/utils/reservationEmail";

// Só gera o HTML do e-mail para a pré-visualização do editor — não envia
// nada. Usa o mesmo componente do envio real, então o que o admin vê é
// exatamente o que o cliente recebe.
export async function POST(req: Request) {
  try {
    const { config, data } = (await req.json()) as {
      config: Record<string, unknown>;
      data: ReservationEmailData;
    };
    const html = await render(
      <ClientReservationEmail
        {...data}
        config={mergeReservationEmailConfig(config)}
      />,
    );
    return Response.json({ html });
  } catch (error) {
    console.error("Erro ao gerar a pré-visualização do e-mail:", error);
    return Response.json(
      { error: "Erro ao gerar a pré-visualização." },
      { status: 500 },
    );
  }
}
