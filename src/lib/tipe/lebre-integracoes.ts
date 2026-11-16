// A Lebre guia cada integração com o passo a passo do catálogo (/integracoes), sem IA.
// Nunca recebe nem guarda chaves: quem cola a chave é o dono, em Configurar › Integrações.
import {
  CATEGORIAS,
  METODOS,
  SISTEMAS,
  passosPara,
  sistemasDa,
  type MetodoId,
  type Sistema,
} from "@/components/tipe/site/integracoes/catalogo";

const sem = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Apelidos que as pessoas usam para os sistemas do catálogo. */
const APELIDOS: Record<string, string[]> = {
  "linx-degust": ["linx", "degust"],
  "totvs-chef": ["totvs chef", "chef"],
  "anota-ai": ["anota ai", "anotaai"],
  "cardapio-web": ["cardapio web"],
  "99food": ["99 food", "99food"],
  "delivery-much": ["delivery much"],
  "conta-azul": ["conta azul", "contaazul"],
  "olist-erp": ["olist", "tiny"],
  "totvs-protheus": ["protheus"],
  "sap-b1": ["sap", "business one"],
  "focus-nfe": ["focus nfe", "focus"],
  "nfe-io": ["nfe io", "nfeio"],
  "nuvem-fiscal": ["nuvem fiscal"],
  pagarme: ["pagar me", "pagarme"],
  pagseguro: ["pagbank", "pagseguro", "pag seguro"],
  "mercado-pago": ["mercado pago", "mercadopago"],
  planilha: ["planilha", "csv", "excel", "xlsx"],
  "google-planilhas": ["google planilhas", "google sheets", "sheets"],
  "foto-pdf": ["foto do cardapio", "pdf do cardapio"],
  "outro-pdv": ["outro sistema", "api tipe", "webhook", "meu proprio sistema"],
};

/** Acha o sistema citado na pergunta (o nome mais longo vence, para "TOTVS Chef" não virar "TOTVS"). */
export function acharSistema(pergunta: string): Sistema | null {
  const q = ` ${sem(pergunta)} `;
  let melhor: { s: Sistema; n: number } | null = null;
  for (const s of SISTEMAS) {
    for (const nome of [sem(s.nome), sem(s.id), ...(APELIDOS[s.id] ?? [])]) {
      if (nome.length >= 3 && q.includes(` ${nome} `) && (!melhor || nome.length > melhor.n)) melhor = { s, n: nome.length };
    }
  }
  return melhor?.s ?? null;
}

function metodoPedido(q: string, s: Sistema): MetodoId {
  const quer = (m: MetodoId) => s.metodos.includes(m);
  if (/\b(arquivo|planilha|csv|excel|xml|exportar|importar)\b/.test(q) && quer("arquivo")) return "arquivo";
  if (/\b(certificado|csc|nfc ?e|nota)\b/.test(q) && quer("certificado")) return "certificado";
  if (/\b(autoriz|vinculo|portal)\w*/.test(q) && quer("autorizacao")) return "autorizacao";
  if (/\b(webhook|api tipe)\b/.test(q) && quer("webhook")) return "webhook";
  return s.metodos[0]!;
}

const AVISO =
  "Não cole a chave aqui na conversa: ela vai só no painel, em Configurar › Integrações, onde fica guardada criptografada. Eu não guardo chaves, tokens nem senhas.";

/** Passo a passo de um sistema, em texto pronto para a Lebre. */
export function guiaIntegracao(s: Sistema, metodo: MetodoId): string {
  const passos = passosPara(s, metodo)
    .map((p, i) => `${i + 1}. **${p.titulo}**: ${p.texto}`)
    .join("\n");
  const outros = s.metodos.filter((m) => m !== metodo).map((m) => METODOS[m].titulo.toLowerCase());
  return [
    `Para conectar o **${s.nome}** por ${METODOS[metodo].titulo.toLowerCase()}:`,
    passos,
    outros.length ? `Também dá por ${outros.join(" ou ")}. É só me pedir.` : "",
    metodo === "arquivo" || metodo === "webhook" ? "" : AVISO,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Lista as integrações por categoria. */
export function listaIntegracoes(): string {
  const linhas = CATEGORIAS.map(
    (c) => `- **${c.titulo}**: ${sistemasDa(c.id).map((s) => s.nome).join(", ")}`,
  );
  return [
    "Dá para conectar estes sistemas à Tipe:",
    linhas.join("\n"),
    'Diga qual você usa, por exemplo "como integro o iFood?", que eu passo o passo a passo para conseguir a chave. A lista completa está em /integracoes.',
  ].join("\n\n");
}

/** Resposta sem IA para perguntas de integração, ou null para seguir o fluxo normal. */
export function respostaIntegracao(pergunta: string): string | null {
  const q = sem(pergunta);
  if (q.length > 200) return null;
  const falaDeIntegrar = /\b(integr\w*|conect\w*|ligar|token|chave|api|credencia\w*|sincroniz\w*|vincul\w*|configur\w*)\b/.test(q);
  const s = acharSistema(pergunta);
  if (s && (falaDeIntegrar || /\b(como|passo|onde|pegar|conseguir|gerar)\b/.test(q))) return guiaIntegracao(s, metodoPedido(q, s));
  if (/\b(quais|lista|todas)\b.*\bintegra\w*|\bintegra\w*\b.*\b(tem|existem|disponive\w*|aceita\w*)\b/.test(q)) return listaIntegracoes();
  return null;
}

/** Parece uma chave, token ou senha colada na conversa? Então não vai para a IA nem para a memória. */
export function pareceSegredo(texto: string): boolean {
  return (
    /\b(sk|pk|ak|rk)_(live|test)?_?[A-Za-z0-9]{12,}/.test(texto) ||
    /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/.test(texto) ||
    /\b(?=[A-Za-z0-9_-]{28,}\b)(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]+\b/.test(texto) ||
    /\b(senha|password|token|chave|secret)\s*(e|é|:|=)\s*\S{6,}/i.test(texto)
  );
}

export const RESPOSTA_SEGREDO =
  "Opa, isso parece uma chave ou senha, então não usei nem guardei. Cole ela só no painel, em Configurar › Integrações, onde fica criptografada. Se ela já foi mostrada a alguém, gere uma nova no sistema de origem.";
