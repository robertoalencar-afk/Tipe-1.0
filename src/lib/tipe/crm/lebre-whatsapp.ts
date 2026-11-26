import { WHATSAPP_NUMBER } from "../contact";

// Lebre no WhatsApp comercial da Tipe: regras puras (sem banco nem rede), testadas em
// lebre-whatsapp.test.ts. Quem chama é lebre-whatsapp.server.ts, a partir do webhook.
//
// Princípios:
// - Só responde quem escreveu para a Tipe, dentro da janela de 24 h da Meta. Nunca inicia conversa.
// - Atende como uma consultora comercial experiente: frases curtas, uma pergunta por vez,
//   sem jargão de robô. Se perguntarem, diz com naturalidade que é a assistente virtual da Tipe.
// - "SAIR" e pedidos de parar encerram na hora e entram na lista de opt-out.
// - Preço especial, contrato, reclamação, cliente atual com problema ou pedido de falar com
//   uma pessoa: passa para a equipe e avisa o cliente de quando vai ter retorno.

export type Ficha = {
  nome?: string | undefined;
  restaurante?: string | undefined;
  tipo?: string | undefined;
  cidade?: string | undefined;
  bairro?: string | undefined;
  mesas?: number | undefined;
  pdv?: string | undefined;
  email?: string | undefined;
  dor?: string | undefined;
  interesse?: string | undefined;
  demo?: string | undefined;
  demoInicio?: string | undefined;
  demoLink?: string | undefined;
  demoEventId?: string | undefined;
};
export type Temperatura = "frio" | "morno" | "quente";
export type Etapa = "novo" | "qualificando" | "qualificado" | "demo" | "cliente" | "perdido";
export type Turno = { autor: "cliente" | "lebre" | "equipe"; texto: string };

export type DecisaoLebre = {
  resposta: string;
  ficha: Ficha;
  humano: boolean;
  motivo?: string | undefined;
};

const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Pedido de descadastro. Mensagem curta e explícita, para não confundir com "sair para jantar". */
export function pedeOptout(texto: string): boolean {
  const t = sem(texto).replace(/[!.?\s]+$/g, "");
  if (/^(sair|parar|pare|stop|cancelar|descadastrar|remover)$/.test(t)) return true;
  return /\b(nao (quero|desejo) (mais )?(receber|mensage)|para de (me )?mandar|me (tira|remove|exclui) da lista|descadastr|nao me mande mais)\b/.test(
    t,
  );
}

/** Pedido direto de falar com uma pessoa. */
export function pedeHumano(texto: string): boolean {
  return /\b(atendente|humano|pessoa real|falar com (alguem|uma pessoa|o roberto|o dono|o responsavel|vendedor|consultor)|ligar pra mim|me liga)\b/.test(
    sem(texto),
  );
}

/** Horário comercial da equipe: segunda a sexta, 8h às 18h de Fortaleza (UTC-3, sem horário de verão). */
export function horarioComercial(agora: Date): boolean {
  const local = new Date(agora.getTime() - 3 * 3600e3);
  const dia = local.getUTCDay();
  const hora = local.getUTCHours();
  return dia >= 1 && dia <= 5 && hora >= 8 && hora < 18;
}

/** Quando a equipe retorna, dito como uma pessoa diria. */
export function retornoEquipe(agora: Date): string {
  if (horarioComercial(agora)) return "ainda hoje";
  const local = new Date(agora.getTime() - 3 * 3600e3);
  const dia = local.getUTCDay();
  const hora = local.getUTCHours();
  if (dia >= 1 && dia <= 4 && hora >= 18) return "amanhã a partir das 8h";
  if (dia >= 1 && dia <= 5 && hora < 8) return "hoje a partir das 8h";
  return "na segunda a partir das 8h";
}

const PDVS = [
  "saipos",
  "consumer",
  "colibri",
  "linx",
  "totvs",
  "chef",
  "goomer",
  "anota ai",
  "stone",
  "cielo",
  "bling",
  "tagme",
  "ifood",
  "sischef",
  "degust",
  "neemo",
  "mobne",
  "wabiz",
  "raffinato",
  "everest",
];

/** Extração simples, sem IA, do que dá para ter certeza: número de mesas, e-mail e PDV citado. */
export function extrairFatos(texto: string): Ficha {
  const t = sem(texto);
  const out: Ficha = {};
  const mesas = t.match(/(\d{1,3})\s*(mesas?|mesinhas?)\b/);
  if (mesas) out.mesas = Number(mesas[1]);
  const email = texto.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) out.email = email[0].toLowerCase();
  const pdv = PDVS.find((p) => t.includes(p));
  if (pdv) out.pdv = pdv.replace(/\b\w/g, (c) => c.toUpperCase());
  return out;
}

const limpo = (v: unknown, max: number) => {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\s+/g, " ").trim();
  return s && !/^(null|undefined|nao informado|desconhecido|-)$/i.test(s)
    ? s.slice(0, max)
    : undefined;
};

/** Junta a ficha nova na atual: só preenche ou corrige campos com valor; nunca apaga. */
export function mesclarFicha(atual: Ficha, nova: Partial<Record<keyof Ficha, unknown>>): Ficha {
  const out: Ficha = { ...atual };
  const textos = [
    "nome",
    "restaurante",
    "tipo",
    "cidade",
    "bairro",
    "pdv",
    "dor",
    "interesse",
    "demo",
  ] as const;
  for (const k of textos) {
    const v = limpo(nova[k], k === "dor" || k === "interesse" ? 200 : 80);
    if (v) out[k] = v;
  }
  const email = limpo(nova.email, 120);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) out.email = email.toLowerCase();
  const mesas = Number(nova.mesas);
  if (Number.isInteger(mesas) && mesas > 0 && mesas <= 2000) out.mesas = mesas;
  return out;
}

export function temperatura(f: Ficha): Temperatura {
  if (f.demo) return "quente";
  let p = 0;
  if (f.restaurante) p++;
  if (f.mesas && f.mesas >= 8) p++;
  if (f.dor) p++;
  if (f.email) p++;
  if (f.nome) p++;
  return p >= 4 ? "quente" : p >= 2 ? "morno" : "frio";
}

export function etapa(f: Ficha, atual: Etapa): Etapa {
  if (atual === "cliente" || atual === "perdido") return atual;
  if (f.demo) return "demo";
  if (f.restaurante && f.mesas && f.nome) return "qualificado";
  return atual === "novo" ? "qualificando" : atual;
}

/** O que ainda falta saber, na ordem em que uma boa vendedora perguntaria. */
export function proximaPergunta(f: Ficha): keyof Ficha | null {
  const ordem: (keyof Ficha)[] = [
    "nome",
    "restaurante",
    "cidade",
    "mesas",
    "dor",
    "pdv",
    "demo",
    "email",
  ];
  return ordem.find((k) => f[k] === undefined || f[k] === "") ?? null;
}

/**
 * Deixa a resposta com cara de mensagem escrita por gente: sem travessão, sem markdown,
 * sem frases de robô, no máximo um emoji e tamanho de WhatsApp.
 */
export function humanizar(texto: string): string {
  let s = texto
    .replace(/\r/g, "")
    .replace(/\*\*(.+?)\*\*/g, "*$1*") // converte negrito para a marcação do WhatsApp
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[_~`]/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(
      /\b(como (uma )?(ia|intelig[eê]ncia artificial|modelo de linguagem)[^.!?]*[.!?])/gi,
      "",
    )
    .replace(/^(ótima|excelente|boa) pergunta[!.,]?[ \t]*/gimu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  let emojis = 0;
  s = s.replace(/\p{Extended_Pictographic}️?/gu, (e) => (++emojis <= 1 ? e : ""));
  if (s.length > 700) {
    const corte = s.slice(0, 700);
    const fim = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("? "), corte.lastIndexOf("\n"));
    s = (fim > 300 ? corte.slice(0, fim + 1) : corte).trim();
  }
  return s.replace(/ {2,}/g, " ");
}

/** Recupera o texto mesmo quando o provedor devolve JSON incompleto ou aninhado. */
function respostaEmJson(texto: string): string | undefined {
  const match = texto.match(/"resposta"\s*:\s*("(?:\\.|[^"\\])*")/s);
  if (!match) return undefined;
  try {
    const valor: unknown = JSON.parse(match[1]!);
    return typeof valor === "string" ? valor : undefined;
  } catch {
    return undefined;
  }
}

/** Lê a decisão do modelo sem permitir que a estrutura técnica vire mensagem do WhatsApp. */
export function lerDecisao(bruto: string, ficha: Ficha): DecisaoLebre {
  let candidato = bruto.trim();
  let recuperada: string | undefined;
  const fichaNova: Record<string, unknown> = {};
  let humano = false;
  let motivo: string | undefined;

  for (let nivel = 0; nivel < 4; nivel++) {
    let j: Record<string, unknown> | undefined;
    try {
      j = JSON.parse(candidato) as Record<string, unknown>;
    } catch {
      const ini = candidato.indexOf("{");
      const fim = candidato.lastIndexOf("}");
      if (ini >= 0 && fim > ini) {
        try {
          j = JSON.parse(candidato.slice(ini, fim + 1)) as Record<string, unknown>;
        } catch {
          j = undefined;
        }
      }
    }

    if (j && typeof j["resposta"] === "string") {
      if (j["ficha"] && typeof j["ficha"] === "object" && !Array.isArray(j["ficha"]))
        Object.assign(fichaNova, j["ficha"]);
      humano ||= j["humano"] === true;
      motivo = limpo(j["motivo"], 300) ?? motivo;
      candidato = (j["resposta"] as string).trim();
    } else {
      const extraida = respostaEmJson(candidato);
      if (!extraida) break;
      candidato = extraida.trim();
      recuperada = candidato;
    }

    let interna: unknown;
    try {
      interna = JSON.parse(candidato);
    } catch {
      interna = undefined;
    }
    if (interna && typeof interna === "object" && "resposta" in interna) continue;

    const pareceEstrutura = /^\s*\{\s*"(?:resposta|ficha|humano)"\s*:/i.test(candidato);
    if (pareceEstrutura) {
      const extraida = respostaEmJson(candidato);
      if (extraida) {
        candidato = extraida.trim();
        recuperada = candidato;
        continue;
      }
      break;
    }

    return {
      resposta: humanizar(candidato),
      ficha: mesclarFicha(ficha, fichaNova),
      humano,
      ...(motivo ? { motivo } : {}),
    };
  }

  if (recuperada && !/^\s*\{\s*"(?:resposta|ficha|humano)"\s*:/i.test(recuperada)) {
    return {
      resposta: humanizar(recuperada),
      ficha: mesclarFicha(ficha, fichaNova),
      humano,
      ...(motivo ? { motivo } : {}),
    };
  }

  const temObjetoDeDecisao = /^\s*\{\s*"(?:resposta|ficha|humano)"\s*:/i.test(bruto);
  if (temObjetoDeDecisao) {
    return {
      resposta: "Desculpa, tive um problema para preparar minha resposta. Vou chamar alguém da equipe para continuar com você.",
      ficha: mesclarFicha(ficha, fichaNova),
      humano: true,
      motivo: "Resposta automática em formato inválido",
    };
  }

  const texto = bruto.replace(/\x60{3}[a-z]*|\x60{3}/gi, "").trim();
  return { resposta: humanizar(texto), ficha, humano: false };
}

export const OPTOUT_RESPOSTA =
  "Pronto, você não vai mais receber mensagens da Tipe por aqui. Se um dia quiser conversar, é só escrever. Um abraço!";

export function respostaHumano(f: Ficha, agora: Date): string {
  const nome = f.nome ? `, ${f.nome.split(" ")[0]}` : "";
  return `Combinado${nome}. Já passei sua conversa para o Roberto, da equipe da Tipe, e ele te responde por aqui ${retornoEquipe(agora)}.`;
}

/** Fatos comerciais e roteiro da conversa. `fatos` vem de lebre.functions (os mesmos do site). */
export function promptComercial(o: {
  fatos: string;
  ficha: Ficha;
  agora: Date;
  primeira: boolean;
}): string {
  const falta = proximaPergunta(o.ficha);
  const comercial = horarioComercial(o.agora);
  return `Você é a Lebre, assistente da Tipe no WhatsApp comercial (85) 3179-0290. Quem escreve para cá quase sempre é dono, sócio ou gerente de restaurante, bar ou café querendo conhecer a Tipe.

Seu papel é o de uma consultora comercial experiente e simpática, que entende de restaurante: escuta, entende a operação da casa, mostra como a Tipe resolve a dor dela e conduz para uma demonstração de 20 minutos com o Roberto, fundador da Tipe.

Como escrever (isto é WhatsApp, não e-mail):
- Mensagens curtas, de 1 a 3 frases. Uma pergunta por vez, no fim.
- Tom de gente: natural, educado, direto, caloroso. Português do Brasil do dia a dia, sem gíria forçada.
- Nada de listas, títulos, markdown, asteriscos, sublinhados, crases ou travessões. Escreva texto simples, sem marcadores de formatação.
- No máximo um emoji, e só quando combinar. Nunca em assunto de dinheiro, erro ou reclamação.
- Nunca comece com "Olá! Como posso ajudar?" depois da primeira mensagem, nem com "Ótima pergunta".
- Use o primeiro nome da pessoa quando souber, sem exagerar.
- Entenda mensagens mesmo com erros de digitação e ortografia. Corrija silenciosamente o sentido ao responder e registre os campos da ficha comercial com ortografia correta. Preserve nomes próprios e marcas; se não tiver certeza da grafia, pergunte com naturalidade em vez de adivinhar. Nunca chame atenção para os erros do cliente.
- Responda primeiro ao que a pessoa acabou de dizer. Depois, faça no máximo uma pergunta curta e clara. Nunca use placeholders como "qual cidade mesmo" nem peça novamente algo que já esteja na ficha.
- Se a pessoa disser "não entendi", explique de novo com palavras mais simples e sem repetir o parágrafo anterior. Se pedir para começar de novo, preserve a ficha e recomece pelo primeiro dado que ainda falta; nunca apague nem pergunte novamente o que já foi informado.
- Não diga que é humana. Se perguntarem se é robô ou IA, responda com naturalidade que é a assistente virtual da Tipe e que o Roberto entra na conversa quando a pessoa quiser.
${o.primeira ? "- Esta é a primeira resposta: seja breve, apresente-se como Lebre, assistente virtual da Tipe, e faça somente uma pergunta: como a pessoa prefere ser chamada. Não pergunte também o nome do restaurante nesta mesma mensagem." : ""}

Se faltar o nome da pessoa, pergunte apenas como ela prefere ser chamada. Depois, se faltar o restaurante, pergunte de forma direta, por exemplo: \"Qual é o nome do restaurante?\". Para cidade, use uma pergunta natural e específica, como: \"Em que cidade fica o restaurante?\". Não use \"mesmo\" se o assunto ainda não foi perguntado.

Roteiro de vendas (sem parecer roteiro):
1. Entender: nome, restaurante, cidade, tamanho (número de mesas), maior dor hoje (fila no caixa na hora da conta, demora para fechar mesa, divisão de conta, pedido errado, gorjeta da equipe, falta de controle) e qual PDV usa.
2. Conectar a dor ao produto certo com um exemplo concreto. Quando a dor for demora no pagamento, explique de forma específica: com o Tipe Pay, o cliente pode pagar a conta pelo celular, sem precisar esperar o garçom trazer a conta ou enfrentar a fila do caixa. Evite frases genéricas como “reduz a demora no atendimento”. Só afirme integração com o PDV se os fatos públicos abaixo confirmarem.
3. Para a demonstração de 20 minutos, pergunte somente o dia e horário (segunda a sexta, 8h às 18h), uma pergunta por vez. Não peça e-mail: o link será enviado nesta conversa de WhatsApp. Depois de a agenda confirmar o horário, encerre com confirmação clara; diga que o link do Google Meet será enviado por aqui no dia anterior. Não diga que está agendado antes da confirmação da agenda.
4. Se a pessoa só quiser ver sozinha, indique tipe.digital/simulador e siga a conversa.
${falta ? `Próxima informação que falta na ficha: ${falta}. Pergunte com naturalidade, se couber na conversa.` : "A ficha está completa: foque em marcar a demonstração ou tirar dúvidas."}

Passe para a equipe (humano = true) quando: pedirem desconto, condição especial, contrato ou proposta formal; for cliente atual com problema; houver reclamação; pedirem para falar com uma pessoa; ou você não tiver certeza da resposta. Nesses casos, diga que o Roberto responde ${comercial ? "ainda hoje" : "no próximo horário comercial"} e não invente nada.

Regras firmes: use apenas os fatos abaixo. Não invente preço, prazo, integração, cliente ou resultado. Não peça CPF, CNPJ, cartão, senha ou dados bancários. Não prometa desconto.

Fatos da Tipe:
${o.fatos}

Ficha atual do contato (JSON): ${JSON.stringify(o.ficha)}

Responda SOMENTE com um JSON, sem texto fora dele:
{"resposta": "mensagem para o cliente", "ficha": {"nome": "", "restaurante": "", "tipo": "", "cidade": "", "bairro": "", "mesas": 0, "pdv": "", "email": "", "dor": "", "interesse": "", "demo": "dia e horário que a pessoa pediu"}, "humano": false, "motivo": ""}
Na ficha, preencha só o que a pessoa disse com clareza; deixe vazio o resto.`;
}

/** Histórico em texto para o modelo (últimas mensagens, mais antigas primeiro). */
export function historicoTexto(turnos: Turno[]): string {
  return turnos
    .slice(-14)
    .map(
      (t) =>
        `${t.autor === "cliente" ? "Cliente" : t.autor === "lebre" ? "Lebre" : "Equipe Tipe"}: ${t.texto.slice(0, 1200)}`,
    )
    .join("\n");
}

/** Links prontos para começar conversa no número oficial, por origem (site, Instagram, QR impresso). */
export const NUMERO_COMERCIAL = WHATSAPP_NUMBER;
export const ENTRADAS = [
  {
    origem: "site",
    rotulo: "Site",
    texto: "Olá! Vim pelo site e quero conhecer a Tipe para o meu restaurante.",
  },
  {
    origem: "instagram",
    rotulo: "Instagram",
    texto: "Oi! Vi a Tipe no Instagram e quero saber como funciona no meu restaurante.",
  },
  {
    origem: "qr",
    rotulo: "QR em evento ou panfleto",
    texto: "Olá! Peguei o QR da Tipe e quero agendar uma demonstração.",
  },
  { origem: "indicacao", rotulo: "Indicação", texto: "Olá! Fui indicado e quero conhecer a Tipe." },
] as const;

export function linkEntrada(texto: string, numero: string = NUMERO_COMERCIAL) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Descobre a origem pela primeira mensagem (os textos dos links acima). */
export function origemPelaMensagem(texto: string): string | null {
  const t = sem(texto);
  if (t.includes("pelo site")) return "site";
  if (t.includes("instagram")) return "instagram";
  if (t.includes("qr da tipe")) return "qr";
  if (t.includes("fui indicad")) return "indicacao";
  return null;
}

/**
 * Modelos para enviar à aprovação da Meta (WhatsApp Manager › Modelos de mensagem).
 * Fora da janela de 24 h só eles podem ser enviados, e só para quem deu opt-in.
 */
export const MODELOS_META = [
  {
    nome: "tipe_retomar_conversa",
    categoria: "Marketing",
    corpo:
      "Oi, {{1}}! Aqui é o Roberto, da Tipe. Ficou alguma dúvida sobre o pagamento da conta pelo celular no {{2}}? Se quiser, separo 20 minutos para te mostrar funcionando. Responda SAIR para não receber mais mensagens.",
    exemplo: ["Carla", "Bistrô da Praia"],
  },
  {
    nome: "tipe_confirmar_demo",
    categoria: "Utilidade",
    corpo:
      "Olá, {{1}}. Sua demonstração da Tipe está confirmada para {{2}}. O link da videochamada é {{3}}. Se precisar mudar o horário, é só responder esta mensagem.",
    exemplo: ["Carla", "quinta, 15h", "meet.google.com/abc-defg-hij"],
  },
  {
    nome: "tipe_lembrete_demo",
    categoria: "Utilidade",
    corpo: "Oi, {{1}}! Passando para lembrar da nossa demonstração da Tipe hoje às {{2}}. Até já!",
    exemplo: ["Carla", "15h"],
  },
] as const;
