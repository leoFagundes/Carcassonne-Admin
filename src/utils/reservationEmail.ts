import { ReservationEmailConfigType } from "@/types";

// Módulo sem Firebase nem React de propósito: é usado tanto pelo editor no
// admin (navegador) quanto pelas rotas que montam e enviam o e-mail (servidor).

export const RESERVATION_EMAIL_DOC = {
  collection: "email-templates",
  id: "client-reservation",
} as const;

export type ReservationEmailData = {
  name: string;
  code: string;
  bookingDate: { day: string; month: string; year: string };
  time: string;
  adults: number;
  childs: number;
};

export const DEFAULT_RESERVATION_EMAIL: ReservationEmailConfigType = {
  subject: "🍻 Reserva confirmada — {data_curta} às {horario}h · Carcassonne Pub",
  previewText:
    "Reserva confirmada para {data_curta} às {horario}h · código {codigo}",
  bannerUrl:
    "https://firebasestorage.googleapis.com/v0/b/carcassonne-admin.firebasestorage.app/o/reserve%2Freservas.png?alt=media&token=c36a300d-dc25-4079-b71b-55e5014e9311",
  heading: "Reserva confirmada! 🍻",
  intro:
    "Olá, **{nome}**! Sua reserva no **Carcassonne Pub** está confirmada — estamos muito felizes por você querer passar esse momento com a gente.",
  codeLabel: "Código da reserva",
  codeHint:
    "Toque e segure o código para copiar. Guarde-o: você vai precisar dele se quiser cancelar.",
  showWarning: true,
  warningText:
    "⚠️ As reservas são válidas até **19:30**. Depois desse horário, não conseguimos garantir a disponibilidade da mesa.",
  showAddress: true,
  addressText: "📍 CLN 407 Bloco E Loja 37 — Asa Norte, Brasília/DF",
  cancelTitle: "Precisa cancelar?",
  cancelText:
    "Sem problemas — é só abrir a página de cancelamento e informar o código acima.",
  cancelButtonLabel: "Cancelar reserva",
  signOff: "Nos vemos em breve! 🍺\n**Equipe Carcassonne Pub**",
  footerImageUrl:
    "https://firebasestorage.googleapis.com/v0/b/carcassonne-admin.firebasestorage.app/o/reserve%2Freservas-rodape.png?alt=media&token=5abc2303-2e5f-4e6c-933d-b0b9f5924e79",
};

export const RESERVATION_EMAIL_VARIABLES = [
  { token: "{nome}", description: "Nome do cliente" },
  { token: "{codigo}", description: "Código da reserva" },
  { token: "{data}", description: "Data completa (12/10/2026)" },
  { token: "{data_curta}", description: "Data curta (12/10)" },
  { token: "{dia_semana}", description: "Dia da semana (Sábado)" },
  { token: "{horario}", description: "Horário (19:00)" },
  { token: "{pessoas}", description: "Quantidade de pessoas" },
] as const;

/**
 * Junta o que veio do banco (ou do editor) com o conteúdo padrão. Campo
 * ausente ou com tipo errado cai no padrão — o e-mail nunca sai quebrado.
 */
export function mergeReservationEmailConfig(
  source?: Partial<ReservationEmailConfigType> | Record<string, unknown> | null,
): ReservationEmailConfigType {
  const merged = { ...DEFAULT_RESERVATION_EMAIL };
  if (!source) return merged;
  const values = source as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_RESERVATION_EMAIL) as (keyof ReservationEmailConfigType)[]) {
    if (typeof values[key] === typeof DEFAULT_RESERVATION_EMAIL[key]) {
      (merged as Record<string, unknown>)[key] = values[key];
    }
  }
  return merged;
}

export function formatWeekday(bookingDate: ReservationEmailData["bookingDate"]) {
  const date = new Date(
    Number(bookingDate.year),
    Number(bookingDate.month) - 1,
    Number(bookingDate.day),
  );
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
}

/** Troca {nome}, {codigo}, etc. pelos dados da reserva. */
export function fillEmailTokens(text: string, data: ReservationEmailData): string {
  const { day, month, year } = data.bookingDate;
  const values: Record<string, string> = {
    "{nome}": data.name,
    "{codigo}": data.code,
    "{data}": `${day}/${month}/${year}`,
    "{data_curta}": `${day}/${month}`,
    "{dia_semana}": formatWeekday(data.bookingDate),
    "{horario}": data.time,
    "{pessoas}": String(data.adults + data.childs),
  };
  return text.replace(/\{[a-z_]+\}/g, (token) => values[token] ?? token);
}

/** Reserva de exemplo usada na pré-visualização e no e-mail de teste. */
export function buildSampleReservationData(): ReservationEmailData {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return {
    name: "Maria",
    code: "h4kw9tmz",
    bookingDate: {
      day: String(date.getDate()).padStart(2, "0"),
      month: String(date.getMonth() + 1).padStart(2, "0"),
      year: String(date.getFullYear()),
    },
    time: "19:00",
    adults: 4,
    childs: 0,
  };
}
