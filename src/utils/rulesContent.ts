/**
 * Texto do regulamento e dos avisos legais: o mesmo na página do site
 * (/rulesAndRegulations) e na página "Regulamento" do PDF do cardápio.
 * Mudou aqui, muda nos dois.
 */

export type LegalNotice = { kind: "smoking" | "minors"; label: string; text: string; law: string };

export const LEGAL_NOTICES: LegalNotice[] = [
  {
    kind: "smoking",
    label: "Proibição",
    text: "É proibido o uso de cigarros, cigarrilhas, charutos, cachimbos ou qualquer outro produto fumígeno, derivado ou não do tabaco, em recinto coletivo fechado, privado ou público.",
    law: "Lei 9.294/1996 Art. 2º",
  },
  {
    kind: "minors",
    label: "Menores de Idade",
    text: "É proibido vender, fornecer, servir, ministrar ou entregar, ainda que gratuitamente, de qualquer forma, a criança ou o adolescente, bebida alcoólica ou produtos que causem dependência.",
    law: "Lei 8.069/1990, Art. 243",
  },
];

export const PAYMENT = {
  label: "Pagamento",
  methods: ["Dinheiro", "Cartões de crédito e débito", "Mastercard, Visa, Elo"],
  note: "Não aceitamos cheque.",
};

export const HOUSE_NOTES = [
  "Cobramos taxa de rolha. Contate um de nossos atendentes.",
  "Proibido o consumo de produtos alimentícios não fornecidos pela casa.",
  "Os preços praticados são em Reais (BRL, R$).",
  "Se beber, não dirija. Disque Saúde: 136.",
];

export const PROCON = "PROCON 151";
