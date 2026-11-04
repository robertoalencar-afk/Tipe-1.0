// Respostas da Lebre que não precisam de IA: perguntas frequentes do site, comandos
// claros do painel e consultas rápidas sobre o salão. Custam zero tokens.
// Funções puras: o servidor passa os dados, aqui só se decide a resposta.

export type RegraAcao =
  | { action: "add_table"; number: string }
  | { action: "set_table_active"; number: string; active: boolean }
  | { action: "close_table"; number: string }
  | { action: "add_waiter"; name: string; email?: string }
  | { action: "invite_waiter"; name: string; email: string }
  | { action: "set_item_available"; name: string; available: boolean };

/** Minúsculas, sem acentos e sem espaços repetidos. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const FAQ: Array<{ chave: RegExp; resposta: string }> = [
  {
    chave: /\b(quanto custa|preco|precos|valor|valores|plano|planos|mensalidade|cobra)\b/,
    resposta:
      "A assinatura é mensal, pelo número de mesas, sem tarifa da TIPE por transação: o restaurante paga só as tarifas do Pagar.me. Os valores serão divulgados no lançamento, e os planos estão em /precos. Dá para testar 30 dias grátis, sem cartão, em /cadastro.",
  },
  {
    chave: /\b(gratis|teste|testar|trial|experimentar)\b/,
    resposta:
      "A TIPE tem 30 dias grátis, sem cartão. Para criar a conta, é só ir em /cadastro. Se quiser ver antes como funciona, abra o /simulador.",
  },
  {
    chave: /\b(pdv|integra|integracao|integracoes|sistema que (eu )?uso|homologad)/,
    resposta:
      "A TIPE tem PDV próprio, o Lançamento TIPE, para lançar os pedidos no próprio painel sem outro sistema. Se você já usa um PDV, dá para conectar pela API TIPE ou pelos conectores (Saipos, Consumer, Linx, TOTVS Chef e outros), com integração assistida pela equipe. Veja em /integracoes.",
  },
  {
    chave: /\b(apple pay|google pay|carteira digital|formas? de pagamento|pix)\b/,
    resposta:
      "Na conta da mesa, o cliente paga com Pix, Apple Pay ou Google Pay, ou escolhe pagar no estabelecimento. O dinheiro cai direto na conta do restaurante, pelo Pagar.me.",
  },
  {
    chave: /\b(como funciona|o que e a tipe|o que a tipe faz|qr ?code|tipe pay)\b/,
    resposta:
      "O carro chefe da TIPE é o Tipe Pay: a conta abre no celular pelo QR Code da mesa, sem baixar nada. O cliente vê os itens, escolhe o que vai pagar, pode dividir um item e paga com Pix, Apple Pay ou Google Pay. Além dele, há o Tipe Order (pedido pelo celular), o Tipe Kitchen (tela da cozinha), o Tipe Staff (área do garçom), o Tipe Restaurant (painel) e a Lebre.",
  },
  {
    chave: /\b(produtos|modulos|funcionalidades|recursos)\b/,
    resposta:
      "Os produtos da TIPE são o Tipe Pay (conta e pagamento pelo QR Code da mesa, o carro chefe), o Tipe Order (cardápio e pedido pelo celular), o Tipe Kitchen (tela da cozinha e do bar), o Tipe Staff (gorjetas e área do garçom), o Tipe Restaurant (painel, caixa e relatórios) e o Tipe AI, que sou eu. O Tipe Guest, de reservas e lista de espera, vem em breve.",
  },
  {
    chave: /\b(cardapio|pedir pelo celular|fazer pedido|tipe order)\b/,
    resposta:
      "Com o Tipe Order, o mesmo QR Code da conta abre o cardápio: o cliente pede pelo celular, o pedido vai para a cozinha e entra na conta da mesa. É um módulo adicional do Tipe Pay.",
  },
  {
    chave: /\b(baixar|aplicativo|app)\b/,
    resposta:
      "Não precisa baixar nada. O cliente lê o QR Code da mesa e a conta abre direto no navegador do celular.",
  },
  {
    chave: /\b(dinheiro|maquininha|pagar no (caixa|estabelecimento))\b/,
    resposta:
      "Dá para pagar no estabelecimento, em dinheiro ou na maquininha. Esse pagamento aparece para o restaurante confirmar.",
  },
  {
    chave: /\b(gorjeta|gorjetas)\b/,
    resposta:
      "Depois que a conta está paga, o cliente pode dar uma gorjeta extra, como um segundo pagamento separado e opcional. 70% vão para quem atendeu e 30% são a taxa da plataforma.",
  },
  {
    chave: /\b(cadastrar|cadastro|criar (a |minha )?conta|comecar)\b/,
    resposta:
      "Para criar a conta do seu restaurante, é só ir em /cadastro. São 30 dias grátis, sem cartão.",
  },
  {
    chave: /\b(whatsapp|falar com|atendente|humano|contato|suporte)\b/,
    resposta: "Para falar com a equipe da TIPE, use o botão do WhatsApp aqui no site.",
  },
];

/** Resposta pronta para perguntas frequentes do site, ou null para mandar à IA.
 * Só responde perguntas curtas que batem com até dois assuntos. */
export function respostaFaq(pergunta: string): string | null {
  const q = normalizar(pergunta);
  if (q.length > 140) return null;
  const achadas = FAQ.filter((f) => f.chave.test(q));
  if (achadas.length === 0 || achadas.length > 2) return null;
  return achadas.map((f) => f.resposta).join(" ");
}

const MESA = String.raw`mesa\s*(?:n(?:umero|o|º)?\.?\s*)?([0-9a-z]{1,8})\b`;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

/** Lê um comando claro do painel. Devolve a ação para o dono confirmar, ou null. */
export function lerComando(pergunta: string, mesasExistentes: string[]): RegraAcao | null {
  const q = normalizar(pergunta);
  if (q.length > 160 || /\?$/.test(q)) return null;
  const existe = (n: string) => mesasExistentes.some((m) => m.toLowerCase() === n.toLowerCase());

  const mesa = new RegExp(MESA).exec(q)?.[1];
  if (mesa) {
    if (/\b(cadastr|cri|adicion|nova)\w*\b/.test(q))
      return { action: "add_table", number: mesa.toUpperCase() };
    if (/\b(fech|liber|encerr|zer)\w*\b/.test(q))
      return { action: "close_table", number: mesa.toUpperCase() };
    if (/\b(desativ|deslig|bloque|inativ)\w*\b/.test(q))
      return { action: "set_table_active", number: mesa.toUpperCase(), active: false };
    if (/\b(abr|ativ|lig|reativ)\w*\b/.test(q)) {
      return existe(mesa)
        ? { action: "set_table_active", number: mesa.toUpperCase(), active: true }
        : { action: "add_table", number: mesa.toUpperCase() };
    }
    return null;
  }

  const email = EMAIL.exec(pergunta)?.[0]?.toLowerCase();
  // O nome sai do texto original para manter os acentos (João, não Joao).
  const original = pergunta.toLowerCase().replace(/\s+/g, " ").trim();
  const garcom =
    /(?:^|\s)(?:gar[cç]om|gar[cç]onete)\s+([a-zà-ÿ][a-zà-ÿ ]{1,60}?)(?=\s+(?:com|no|e-?mail)(?:\s|$)|\s+[a-z0-9._%+-]+@|$)/
      .exec(original)?.[1]
      ?.trim();
  if (garcom) {
    const nome = garcom.replace(
      /(^|\s)(\p{L})/gu,
      (_m, sp: string, c: string) => sp + c.toUpperCase(),
    );
    if (/\b(convid|envi|mand)\w*\b/.test(q) && email)
      return { action: "invite_waiter", name: nome, email };
    if (/\b(cadastr|cri|adicion|nov[oa])\w*\b/.test(q))
      return email
        ? { action: "add_waiter", name: nome, email }
        : { action: "add_waiter", name: nome };
    return null;
  }

  const pausar =
    /^(?:pode\s+)?(?:pausar|pausa|tirar|tira|suspender|suspende|acabou)\s+(?:o |a |os |as |do |da )?(.{2,60}?)(?:\s+do cardapio)?$/.exec(
      q,
    )?.[1];
  if (pausar) return { action: "set_item_available", name: pausar, available: false };
  const voltar =
    /^(?:pode\s+)?(?:reativar|reativa|voltar|volta|liberar|libera)\s+(?:o |a |os |as )?(.{2,60}?)(?:\s+(?:ao|no|pro|para o) cardapio)?$/.exec(
      q,
    )?.[1];
  if (voltar) return { action: "set_item_available", name: voltar, available: true };
  return null;
}

export type SalaoResumo = {
  mesas: Array<{ number: string; active: boolean }>;
  mesasComConta: string[];
  mesasAguardando: string[];
  pendentes: number;
  valorAberto: number;
  garcons: Array<{ name: string; active: boolean; comAcesso: boolean }>;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const lista = (itens: string[]) =>
  itens.length <= 1
    ? itens.join("")
    : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;

/** Responde consultas rápidas sobre o salão com os dados do painel, sem IA. */
export function respostaSalao(pergunta: string, s: SalaoResumo): string | null {
  const q = normalizar(pergunta);
  if (q.length > 120) return null;
  if (
    /\b(aguardando|pendente|pendentes|confirmar|confirmacao)\b/.test(q) &&
    /\b(pagamento|pagamentos|mesa|mesas|confirm)/.test(q)
  ) {
    return s.mesasAguardando.length
      ? `Há ${s.pendentes} ${s.pendentes === 1 ? "pagamento presencial aguardando" : "pagamentos presenciais aguardando"} confirmação, ${s.mesasAguardando.length === 1 ? "na mesa" : "nas mesas"} ${lista(s.mesasAguardando)}. Você confirma ou recusa no painel.`
      : "Nenhum pagamento presencial está aguardando confirmação agora.";
  }
  if (/\b(quanto|valor|total)\b/.test(q) && /\b(aberto|abertas|falta|receber)\b/.test(q)) {
    return `O valor em aberto nas mesas é de aproximadamente ${brl(s.valorAberto)}, sem a taxa de serviço.`;
  }
  if (/\b(mesas?)\b/.test(q) && /\b(abertas?|ocupadas?|com conta|movimento)\b/.test(q)) {
    return s.mesasComConta.length
      ? `${s.mesasComConta.length === 1 ? "A mesa com conta aberta é a" : "As mesas com conta aberta são"} ${lista(s.mesasComConta)}.`
      : "Nenhuma mesa está com conta aberta agora.";
  }
  if (/\b(quantas|quais|lista)\b/.test(q) && /\bmesas\b/.test(q)) {
    const ativas = s.mesas.filter((m) => m.active).map((m) => m.number);
    const inativas = s.mesas.filter((m) => !m.active).map((m) => m.number);
    if (!s.mesas.length)
      return 'Ainda não há mesas cadastradas. Quer que eu cadastre? Diga, por exemplo, "cadastrar mesa 1".';
    return `Vocês têm ${ativas.length} ${ativas.length === 1 ? "mesa ativa" : "mesas ativas"}${ativas.length ? ` (${lista(ativas)})` : ""}${inativas.length ? ` e ${inativas.length} ${inativas.length === 1 ? "inativa" : "inativas"} (${lista(inativas)})` : ""}.`;
  }
  if (/\b(garcons|garcom|equipe)\b/.test(q) && /\b(quais|quem|quantos|lista|equipe)\b/.test(q)) {
    const ativos = s.garcons.filter((g) => g.active);
    if (!ativos.length)
      return 'Ainda não há garçons ativos na equipe. Para cadastrar, diga "cadastrar garçom" e o nome.';
    const semAcesso = ativos.filter((g) => !g.comAcesso).map((g) => g.name);
    return `A equipe tem ${ativos.length} ${ativos.length === 1 ? "garçom ativo" : "garçons ativos"}: ${lista(ativos.map((g) => g.name))}.${semAcesso.length ? ` Ainda sem acesso ao app: ${lista(semAcesso)}.` : ""}`;
  }
  return null;
}
