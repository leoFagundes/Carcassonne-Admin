/**
 * Busca da Ajuda: sem acento, sem diferença de maiúscula, entende sinônimos
 * ("estornar" acha "reembolsar") e ignora palavras como "como", "o", "de".
 * Título vale mais que palavras-chave, que valem mais que o resto do texto.
 */
import type { Guide } from "./types";
import { areaOf } from "./areas";

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPWORDS = new Set(
  "a o as os um uma uns umas de do da dos das no na nos nas em ao aos para pra pro por com sem e ou que como eu meu minha se me te faco fazer quero queria posso consigo onde qual quais quando tem ter esta esse essa isso isto ja la aqui".split(
    " ",
  ),
);

/**
 * Grupos de palavras que significam o mesmo para quem procura. Vale para
 * frases também ("devolver dinheiro"). Tudo já sem acento.
 */
const SYNONYMS: string[][] = [
  ["reembolsar", "reembolso", "estornar", "estorno", "devolver dinheiro", "devolver o dinheiro", "devolucao do dinheiro"],
  ["cancelar", "cancelamento", "desmarcar", "anular", "desistir"],
  ["excluir", "apagar", "deletar", "remover", "limpar"],
  ["esconder", "ocultar", "oculto", "sumir", "tirar do site", "invisivel"],
  ["mostrar", "exibir", "visivel", "aparecer"],
  ["criar", "adicionar", "cadastrar", "novo", "nova", "incluir"],
  ["editar", "alterar", "mudar", "trocar", "corrigir", "atualizar"],
  ["freelancer", "freelancers", "freela", "freelas", "extra", "garcom"],
  ["bloquear", "fechar", "fechado", "feriado"],
  ["imprimir", "impressao", "papel"],
  ["foto", "imagem", "fotos", "imagens"],
  ["preco", "valor", "precos", "valores"],
  ["horario", "hora", "horarios"],
  ["mesa", "mesas"],
  ["jogo", "jogos", "boardgame"],
  ["reserva", "reservas", "agendamento"],
  ["cardapio", "menu"],
  ["aluguel", "alugar", "alugueis", "locacao"],
  ["cliente", "clientes"],
  ["devolucao", "devolveu", "devolver"],
  ["retirada", "retirar", "buscou", "levou"],
  ["pagamento", "pagar", "pago", "pagou"],
  ["pix", "qr code", "qrcode"],
  ["logo", "logotipo", "marca"],
  ["senha", "login", "entrar"],
  ["linktree", "links", "link"],
];

const SYN_LOOKUP = new Map<string, string[]>();
for (const group of SYNONYMS) for (const w of group) SYN_LOOKUP.set(w, group);

/** Divide a busca em "conceitos": frases conhecidas primeiro, depois palavras. Cada conceito tem suas variações. */
export function concepts(query: string): string[][] {
  let rest = ` ${normalize(query)} `;
  const out: string[][] = [];
  const phrases = [...SYN_LOOKUP.keys()].filter((k) => k.includes(" ")).sort((a, b) => b.length - a.length);
  for (const p of phrases) {
    if (rest.includes(` ${p} `)) {
      out.push([p, ...SYN_LOOKUP.get(p)!.filter((w) => w !== p)]);
      rest = rest.replace(` ${p} `, " ");
    }
  }
  for (const word of rest.split(" ")) {
    if (!word || STOPWORDS.has(word)) continue;
    // O que foi digitado vem primeiro (vale um pouco mais), depois os sinônimos
    out.push([word, ...(SYN_LOOKUP.get(word) ?? []).filter((w) => w !== word)]);
  }
  return out;
}

type Indexed = { guide: Guide; title: string; keys: string; summary: string; body: string };

const indexCache = new WeakMap<Guide[], Indexed[]>();
function index(guides: Guide[]): Indexed[] {
  let idx = indexCache.get(guides);
  if (!idx) {
    idx = guides.map((g) => ({
      guide: g,
      title: ` ${normalize(g.title)} `,
      keys: ` ${normalize((g.keywords ?? []).join(" "))} `,
      summary: ` ${normalize(`${g.summary} ${g.section} ${areaOf(g.area).label}`)} `,
      body: ` ${normalize([...(g.steps ?? []), ...(g.points ?? []), ...(g.tips ?? []), g.warning ?? ""].join(" "))} `,
    }));
    indexCache.set(guides, idx);
  }
  return idx;
}

/** Uma variação aparece no texto? Palavra inteira ou começo de palavra (ex.: "reemb" acha "reembolso"). */
function has(text: string, variant: string): boolean {
  return text.includes(` ${variant}`);
}

/** Pontos de um conceito no guia. O 1º da lista é o que a pessoa digitou: achar ele mesmo (não só um sinônimo) vale um pouco mais. */
function conceptScore(item: Indexed, variants: string[]): number {
  let best = 0;
  for (const v of variants) {
    if (v.length < 2) continue;
    if (has(item.title, v)) best = Math.max(best, 10);
    else if (has(item.keys, v)) best = Math.max(best, 7);
    else if (has(item.summary, v)) best = Math.max(best, 4);
    else if (has(item.body, v)) best = Math.max(best, 2);
  }
  const typed = variants[0];
  const literal = best > 0 && typed.length >= 2 && [item.title, item.keys, item.summary, item.body].some((t) => has(t, typed));
  return best + (literal ? 1 : 0);
}

/**
 * Guias que combinam com a busca, do mais ao menos relevante. Primeiro os que
 * têm todos os conceitos; se nenhum tiver, os que têm mais.
 */
export function searchGuides(guides: Guide[], query: string, limit = 30): Guide[] {
  const cs = concepts(query);
  if (!cs.length) return [];
  const scored = index(guides)
    .map((item) => {
      const parts = cs.map((c) => conceptScore(item, c));
      const matched = parts.filter((p) => p > 0).length;
      const score = parts.reduce((a, b) => a + b, 0);
      return { guide: item.guide, matched, score };
    })
    .filter((r) => r.matched > 0);
  const full = scored.filter((r) => r.matched === cs.length);
  const pool = full.length ? full : scored;
  return pool
    .sort((a, b) => b.matched - a.matched || b.score - a.score || a.guide.title.localeCompare(b.guide.title, "pt-BR"))
    .slice(0, limit)
    .map((r) => r.guide);
}
