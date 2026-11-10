// Textos editáveis dos e-mails automáticos (Configurações → E-mails), além do
// de reserva, que tem editor próprio. Sem Firebase nem React de propósito: é
// usado pelo editor no navegador e pelo servidor que envia os e-mails.

export type EmailTemplateId = "rental-order" | "rental-refund" | "account-verify" | "account-reset";

export const EMAIL_TEMPLATE_COLLECTION = "email-templates";

export type TemplateValues = Record<string, string>;

export interface TemplateField {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  /** Não pode ficar vazio (ex.: assunto, texto do botão). */
  required?: boolean;
}

export interface EmailTemplateDef {
  id: EmailTemplateId;
  title: string;
  description: string;
  fields: TemplateField[];
  defaults: TemplateValues;
  variables: { token: string; description: string }[];
  /** Dados de exemplo da prévia e do e-mail de teste. */
  sample: TemplateValues;
}

const BOLD = "Use **texto** para negrito. Enter quebra a linha.";

const SUBJECT: TemplateField = { key: "subject", label: "Assunto", required: true };
const PREVIEW: TemplateField = {
  key: "previewText",
  label: "Texto de prévia",
  hint: "Aparece ao lado do assunto na caixa de entrada.",
};
const HEADING: TemplateField = { key: "heading", label: "Título" };
const SIGN_OFF: TemplateField = { key: "signOff", label: "Assinatura", multiline: true, hint: BOLD };

export const EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplateDef> = {
  "rental-order": {
    id: "rental-order",
    title: "Confirmação do aluguel",
    description:
      "Enviado ao cliente quando o pedido de aluguel é confirmado: código, jogos, datas, pagamento e endereço.",
    fields: [
      SUBJECT,
      PREVIEW,
      HEADING,
      { key: "intro", label: "Texto de abertura", multiline: true, hint: BOLD },
      {
        key: "introPickedUp",
        label: "Abertura quando o cliente já levou",
        multiline: true,
        hint: "Usado quando o aluguel é criado no balcão e o cliente já sai com os jogos.",
      },
      { key: "codeLabel", label: "Rótulo do código" },
      { key: "codeHint", label: "Dica abaixo do código" },
      {
        key: "rulesText",
        label: "Texto sobre as regras",
        multiline: true,
        hint: "{regras} vira o link para as regras do aluguel.",
      },
      SIGN_OFF,
    ],
    defaults: {
      subject: "🎲 Aluguel confirmado — código {codigo} · Carcassonne Pub",
      previewText: "Aluguel confirmado · código {codigo}",
      heading: "Aluguel confirmado! 🎲",
      intro:
        "Olá, **{nome}**! Separamos {jogos} do seu pedido. Apresente o código abaixo no balcão na hora da retirada.",
      introPickedUp: "Olá, **{nome}**! Você já está com {jogos} do pedido. Confira abaixo a data de devolução.",
      codeLabel: "Código do aluguel",
      codeHint: "Toque e segure o código para copiar.",
      rulesText: "Antes de retirar, confira as {regras} (prazos, atrasos e cuidados com os jogos).",
      signOff: "Bom jogo! 🎲\n**Equipe Carcassonne Pub**",
    },
    variables: [
      { token: "{nome}", description: "Nome do cliente" },
      { token: "{codigo}", description: "Código do pedido" },
      { token: "{jogos}", description: "“o jogo” ou “os 3 jogos”" },
      { token: "{quantidade}", description: "Quantidade de jogos" },
      { token: "{total}", description: "Total do pedido (R$)" },
      { token: "{regras}", description: "Link “regras do aluguel”" },
    ],
    sample: { nome: "Maria", codigo: "K7P2QX", jogos: "os 2 jogos", quantidade: "2", total: "R$ 90,00" },
  },
  "rental-refund": {
    id: "rental-refund",
    title: "Reembolso do aluguel",
    description: "Enviado ao cliente quando um valor do pedido pago online é devolvido.",
    fields: [
      SUBJECT,
      PREVIEW,
      HEADING,
      {
        key: "intro",
        label: "Texto de abertura",
        multiline: true,
        hint: "{motivo} é a frase do motivo (ex.: cancelamento, pagamento a mais).",
      },
      { key: "amountLabel", label: "Rótulo do valor" },
      { key: "amountHint", label: "Dica abaixo do valor" },
      { key: "infoText", label: "Aviso do prazo", multiline: true, hint: BOLD },
      SIGN_OFF,
    ],
    defaults: {
      subject: "Reembolso do pedido {codigo} · Carcassonne Pub",
      previewText: "Reembolso de {valor} do pedido {codigo}",
      heading: "Reembolso a caminho",
      intro: "Olá, **{nome}**! {motivo}",
      amountLabel: "Reembolso do pedido {codigo}",
      amountHint: "Devolvido na mesma forma de pagamento.",
      infoText: "⏱️ **Pix: na hora · cartão: conforme a operadora.**",
      signOff: "Até a próxima! 🎲\n**Equipe Carcassonne Pub**",
    },
    variables: [
      { token: "{nome}", description: "Nome do cliente" },
      { token: "{codigo}", description: "Código do pedido" },
      { token: "{valor}", description: "Valor devolvido (R$)" },
      { token: "{motivo}", description: "Motivo do reembolso" },
    ],
    sample: {
      nome: "Maria",
      codigo: "K7P2QX",
      valor: "R$ 45,00",
      motivo: "Você cancelou o aluguel de Catan e devolvemos o valor integral.",
    },
  },
  "account-verify": {
    id: "account-verify",
    title: "Confirmação de e-mail",
    description: "Enviado ao criar uma conta, de cliente do aluguel ou de administrador.",
    fields: [
      SUBJECT,
      PREVIEW,
      HEADING,
      { key: "intro", label: "Texto", multiline: true, hint: BOLD },
      { key: "buttonLabel", label: "Texto do botão", required: true },
      { key: "ignoreText", label: "Aviso no fim", multiline: true },
    ],
    defaults: {
      subject: "Confirme seu e-mail - Carcassonne Pub",
      previewText: "Confirme seu e-mail - Carcassonne Pub",
      heading: "Confirme seu e-mail ✉️",
      intro: "Falta só um passo. Confirme seu e-mail para continuar usando sua conta no Carcassonne Pub.",
      buttonLabel: "Confirmar e-mail",
      ignoreText: "Se você não criou uma conta, pode ignorar este e-mail.",
    },
    variables: [],
    sample: {},
  },
  "account-reset": {
    id: "account-reset",
    title: "Redefinição de senha",
    description: "Enviado pelo “Esqueci minha senha” do admin e do aluguel. O link vale por 1 hora.",
    fields: [
      SUBJECT,
      PREVIEW,
      HEADING,
      { key: "intro", label: "Texto", multiline: true, hint: BOLD },
      { key: "buttonLabel", label: "Texto do botão", required: true },
      { key: "noticeText", label: "Aviso da validade", multiline: true },
      { key: "ignoreText", label: "Aviso no fim", multiline: true },
    ],
    defaults: {
      subject: "Redefinir sua senha - Carcassonne Pub",
      previewText: "Redefinir sua senha - Carcassonne Pub",
      heading: "Redefinir sua senha 🔑",
      intro:
        "Recebemos um pedido para criar uma nova senha para a sua conta. Clique no botão abaixo para escolher uma nova.",
      buttonLabel: "Criar nova senha",
      noticeText: "Este link vale por 1 hora e só pode ser usado uma vez.",
      ignoreText: "Se você não pediu isso, pode ignorar este e-mail. Sua senha continua a mesma.",
    },
    variables: [],
    sample: {},
  },
};

export const EMAIL_TEMPLATE_IDS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateId[];

export const isEmailTemplateId = (id: unknown): id is EmailTemplateId =>
  typeof id === "string" && (EMAIL_TEMPLATE_IDS as string[]).includes(id);

const MAX_FIELD = 2000;

/**
 * Junta o salvo com o padrão: campo ausente, que não é texto ou vazio
 * (quando obrigatório) cai no padrão. O e-mail nunca sai quebrado.
 */
export function mergeTemplate(id: EmailTemplateId, source?: Record<string, unknown> | null): TemplateValues {
  const def = EMAIL_TEMPLATES[id];
  const out: TemplateValues = { ...def.defaults };
  if (!source) return out;
  for (const field of def.fields) {
    const v = source[field.key];
    if (typeof v !== "string") continue;
    if (field.required && !v.trim()) continue;
    out[field.key] = v.slice(0, MAX_FIELD);
  }
  return out;
}

/** Troca {nome}, {codigo}… pelos valores; token desconhecido fica como está. */
export function fillTemplate(text: string, values: TemplateValues): string {
  return text.replace(/\{([a-z_]+)\}/g, (token, key: string) => values[key] ?? token);
}

/** "o jogo" / "os 3 jogos". */
export const gamesPhrase = (count: number) => (count === 1 ? "o jogo" : `os ${count} jogos`);
