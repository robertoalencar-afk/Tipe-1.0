// Memória da Lebre: regras puras de o que pode ser lembrado e de como a pessoa pede.
// A Lebre lembra preferências e fatos de operação. Nunca guarda dado sensível.

/** Padrões de dado sensível. Se aparecer qualquer um, a memória não é gravada. */
const SENSIVEL: Array<[RegExp, string]> = [
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, "CPF"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, "CNPJ"],
  [/\b(?:\d[ -]?){13,19}\b/, "número de cartão"],
  [/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, "e-mail"],
  [/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/, "telefone"],
  [
    /\b(senha|password|token|api[ _-]?key|chave pix|cvv|cvc|c[oó]digo de seguran[cç]a|conta banc[aá]ria|ag[eê]ncia|\brg\b)/i,
    "dado de acesso ou pagamento",
  ],
  [
    /\b(doen[cç]a|diagn[oó]stico|hiv|gravid[ea]|religi[aã]o|partido|orienta[cç][aã]o sexual|sal[aá]rio|endere[cç]o|mora (na|no|em))\b/i,
    "dado pessoal sensível",
  ],
];

/** Motivo para não guardar o texto, ou null se pode guardar. */
export function motivoSensivel(texto: string): string | null {
  for (const [re, motivo] of SENSIVEL) if (re.test(texto)) return motivo;
  return null;
}

/** Texto pronto para guardar (curto, sem quebras), ou null se for sensível ou vazio. */
export function limparMemoria(texto: string): string | null {
  const t = texto
    .replace(/\s+/g, " ")
    .replace(/^[\s:,.-]+|[\s.]+$/g, "")
    .trim()
    .slice(0, 200);
  if (t.length < 3 || motivoSensivel(t)) return null;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type PedidoMemoria =
  | { tipo: "lembrar"; texto: string; pessoal: boolean }
  | { tipo: "listar" }
  | { tipo: "esquecer"; tudo: true; pessoal: boolean }
  | { tipo: "esquecer"; tudo: false; trecho: string };

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Lê pedidos diretos sobre a memória ("lembre que...", "o que você lembra?", "esqueça..."). */
export function lerPedidoMemoria(pergunta: string): PedidoMemoria | null {
  const q = sem(pergunta);
  if (
    /^(o que (voce|vc) (lembra|sabe|guardou|anotou)|(me )?mostr\w* (a )?(sua )?memoria|quais (sao )?(as )?suas memorias)/.test(
      q,
    )
  )
    return { tipo: "listar" };
  if (/^(esquec\w*|apag\w*|limp\w*)\s+(tudo|toda a memoria|a memoria|sua memoria)/.test(q))
    return {
      tipo: "esquecer",
      tudo: true,
      pessoal: /\b(sobre mim|de mim|meu|minha|minhas|meus)\b/.test(q),
    };
  const esq = /^(?:esquec\w*|apag\w*)\s+(?:que\s+|a memoria\s+|o que\s+)?(.{3,120})$/.exec(q);
  if (esq) return { tipo: "esquecer", tudo: false, trecho: esq[1]!.replace(/[.?!]+$/, "") };
  const m =
    /^(?:lembr\w*(?:-se)?|anot\w*|guard\w*|grav\w*|aprend\w*)\s+(?:(?:de|para|pra)\s+mim\s+)?(?:que|isso:?|:)\s*(.{3,200})$/i.exec(
      pergunta.trim().replace(/\s+/g, " "),
    );
  if (m) {
    const pessoal =
      /^(?:lembr|anot|guard|grav|aprend)\S*\s+(?:de|para|pra)\s+mim\b/i.test(pergunta.trim()) ||
      /^(eu|me|meu|minha)\b/i.test(m[1]!);
    return { tipo: "lembrar", texto: m[1]!, pessoal };
  }
  return null;
}
