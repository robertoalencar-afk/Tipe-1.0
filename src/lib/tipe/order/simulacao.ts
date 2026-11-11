/**
 * Motor do simulador multiformato do Tipe Order (/produtos/order#simulador). Puro e sem
 * React: o estado da simulação, as regras de cada modalidade e as transições ficam aqui;
 * a interface só despacha ações e desenha. Tudo é fictício (restaurante "Maré Alta"):
 * nada toca o Supabase, nenhum pagamento é real.
 *
 * As regras vêm de REGRAS_MODALIDADE (eventos.ts), as mesmas do sistema real:
 * - mesas e pulseira: só pedem depois que a equipe libera/ativa; a cozinha recebe no envio;
 *   a conta se paga pelo Tipe Pay (Pix, Apple Pay, Google Pay ou no estabelecimento) e a
 *   gorjeta extra é um segundo pagamento (70% para quem atendeu).
 * - balcão, retirada e totem: o pedido nasce aguardando pagamento e só vai para a cozinha
 *   quando o caixa cobra; recebe a senha do dia.
 * - delivery: o pedido chega de um canal externo já pago; passa por validação e expedição.
 * - comanda: como mesas, mas identificada pela comanda do cliente.
 * Envio idempotente: a mesma chave de requisição nunca cria dois pedidos.
 */
import { REGRAS_MODALIDADE, type StatusItem } from "./eventos";
import { type Modalidade } from "./modalidades";

export type ItemSim = {
  code: string;
  nome: string;
  desc?: string;
  /** Centavos. */
  preco: number;
  cat: string;
  foto?: string;
  modelo?: string;
  profundidade?: string;
  selo?: string;
  alergenicos?: string[];
  /** Adicionais do totem/balcão (centavos). */
  adicionais?: { code: string; nome: string; preco: number }[];
};

export type LinhaSim = { code: string; qtd: number; obs?: string | undefined; adicionais?: string[] | undefined };

export type StatusPedidoSim = Exclude<StatusItem, "cancelado"> | "expedido";

export type PedidoSim = {
  id: number;
  chave: string;
  itens: LinhaSim[];
  status: StatusPedidoSim;
  hora: string;
  /** Senha do dia (balcão, retirada, totem). */
  senha?: number | undefined;
  /** Nome ou origem externa. */
  cliente?: string | undefined;
  origemExterna?: string | undefined;
  consumo?: "aqui" | "levar" | undefined;
  /** Forma de pagamento quando pago antes de produzir. */
  pagamento?: MetodoCaixa | undefined;
};

export type MetodoPay = "pix" | "apple_pay" | "google_pay" | "estabelecimento";
export type MetodoCaixa = "dinheiro" | "cartao" | "pix" | "terminal";

export type Evento = { hora: string; texto: string };

export type EstadoSim = {
  modalidade: Modalidade;
  /** Mesas: equipe liberou. Pulseira/comanda: equipe ativou e vinculou. */
  liberada: boolean;
  carrinho: Record<string, number>;
  observacoes: Record<string, string>;
  consumo: "aqui" | "levar" | null;
  pedidos: PedidoSim[];
  /** Pago pelo Tipe Pay (mesas, comanda, pulseira), em centavos. */
  pagoCentavos: number;
  ultimoPagamento: { valor: number; metodo: MetodoPay } | null;
  gorjetaExtra: number | null;
  /** Pulseira: posição do cliente informada com consentimento. */
  localizacao: { setor: string; precisaoM: number; hora: string } | null;
  eventos: Evento[];
  proximoId: number;
  proximaSenha: number;
};

export type Acao =
  | { tipo: "liberar" }
  | { tipo: "encerrar" }
  | { tipo: "item"; code: string; delta: number }
  | { tipo: "observacao"; code: string; texto: string }
  | { tipo: "consumo"; valor: "aqui" | "levar" }
  | { tipo: "enviar"; chave: string; cliente?: string | undefined }
  | { tipo: "receber_externo"; chave: string; origem: string; itens: LinhaSim[]; cliente: string }
  | { tipo: "cobrar"; pedidoId: number; metodo: MetodoCaixa }
  | { tipo: "avancar"; pedidoId: number }
  | { tipo: "pagar_conta"; metodo: MetodoPay }
  | { tipo: "gorjeta"; valor: number | null }
  | { tipo: "localizar"; setor: string; precisaoM: number }
  | { tipo: "reiniciar" };

export type Contexto = {
  cardapio: Record<string, ItemSim>;
  /** Relógio injetável (testes). */
  agora: () => string;
  /** Nome de quem atende (garçom/atendente). */
  atendente: string;
  /** Rótulo do local: "Mesa 12", "Pulseira 0421", "Balcão". */
  local: string;
  /** Taxa de serviço do restaurante (0.1 = 10%). */
  servico: number;
};

export const SERVICO_PADRAO = 0.1;
export const PASSOS_STATUS: Record<StatusPedidoSim, { rotulo: string; proximo?: StatusPedidoSim; acao?: string }> = {
  aguardando_pagamento: { rotulo: "Aguardando pagamento" },
  recebido: { rotulo: "Recebido", proximo: "preparando", acao: "Começar preparo" },
  preparando: { rotulo: "Preparando", proximo: "pronto", acao: "Marcar pronto" },
  pronto: { rotulo: "Pronto", proximo: "entregue", acao: "Entregue" },
  entregue: { rotulo: "Entregue" },
  expedido: { rotulo: "Expedido" },
};

export function estadoInicial(modalidade: Modalidade): EstadoSim {
  return {
    modalidade,
    liberada: false,
    carrinho: {},
    observacoes: {},
    consumo: null,
    pedidos: [],
    pagoCentavos: 0,
    ultimoPagamento: null,
    gorjetaExtra: null,
    localizacao: null,
    eventos: [],
    proximoId: 1,
    proximaSenha: 41,
  };
}

/** A modalidade exige liberação/ativação pela equipe antes do primeiro pedido? */
export const exigeLiberacao = (m: Modalidade) =>
  m === "mesas" || m === "comanda" || m === "pulseira";

/** O pagamento acontece antes de produzir (senha + caixa)? */
export const pagaAntes = (m: Modalidade) => REGRAS_MODALIDADE[m].cozinhaApos === "pagamento";

/** A conta se fecha pelo Tipe Pay no celular do cliente? */
export const pagaPeloPay = (m: Modalidade) => REGRAS_MODALIDADE[m].pagamentoPor === "tipe_pay";

export const linhasDoCarrinho = (e: EstadoSim): LinhaSim[] =>
  Object.entries(e.carrinho)
    .filter(([, q]) => q > 0)
    .map(([code, qtd]) => ({ code, qtd, obs: e.observacoes[code] || undefined }));

export const totalLinhas = (linhas: LinhaSim[], cardapio: Record<string, ItemSim>) =>
  linhas.reduce((s, l) => {
    const it = cardapio[l.code];
    if (!it) return s;
    const extras = (l.adicionais ?? []).reduce(
      (a, c) => a + (it.adicionais?.find((x) => x.code === c)?.preco ?? 0),
      0,
    );
    return s + (it.preco + extras) * l.qtd;
  }, 0);

/** Conta da mesa/comanda: itens de todos os pedidos (menos cancelados) + serviço. */
export function conta(e: EstadoSim, ctx: Contexto) {
  const subtotal = e.pedidos.reduce((s, p) => s + totalLinhas(p.itens, ctx.cardapio), 0);
  const servico = pagaPeloPay(e.modalidade) ? Math.round(subtotal * ctx.servico) : 0;
  const total = subtotal + servico;
  return { subtotal, servico, total, aPagar: Math.max(0, total - e.pagoCentavos) };
}

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const NOME_PAY: Record<MetodoPay, string> = {
  pix: "Pix",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  estabelecimento: "no estabelecimento",
};
const NOME_CAIXA: Record<MetodoCaixa, string> = {
  dinheiro: "dinheiro",
  cartao: "cartão na maquininha",
  pix: "Pix",
  terminal: "no terminal do totem",
};

function anotar(e: EstadoSim, ctx: Contexto, texto: string): EstadoSim {
  return { ...e, eventos: [{ hora: ctx.agora(), texto }, ...e.eventos].slice(0, 8) };
}

export function reduzir(e: EstadoSim, a: Acao, ctx: Contexto): EstadoSim {
  const m = e.modalidade;
  switch (a.tipo) {
    case "reiniciar":
      return estadoInicial(m);

    case "liberar": {
      if (e.liberada) return e;
      const texto =
        m === "pulseira"
          ? `${ctx.atendente} ativou a ${ctx.local} e vinculou à comanda de Rafael`
          : m === "comanda"
            ? `${ctx.atendente} abriu a ${ctx.local} para Rafael`
            : `${ctx.atendente} liberou os pedidos pelo celular na ${ctx.local}`;
      return anotar({ ...e, liberada: true }, ctx, texto);
    }
    case "encerrar": {
      if (!e.liberada) return e;
      const c = conta(e, ctx);
      // Pulseira/comanda só encerram quitadas: regra da mesa vale para a comanda.
      if ((m === "pulseira" || m === "comanda") && c.aPagar > 0) {
        return anotar(e, ctx, `A ${ctx.local} só encerra depois de paga (${brl(c.aPagar)} em aberto)`);
      }
      const texto =
        m === "pulseira"
          ? `${ctx.atendente} encerrou a comanda; a ${ctx.local} foi limpa e voltou ao estoque`
          : `${ctx.atendente} encerrou os pedidos pelo celular na ${ctx.local}`;
      return anotar({ ...e, liberada: false, localizacao: null }, ctx, texto);
    }

    case "item": {
      if (!ctx.cardapio[a.code]) return e;
      const q = Math.max(0, Math.min(20, (e.carrinho[a.code] ?? 0) + a.delta));
      return { ...e, carrinho: { ...e.carrinho, [a.code]: q } };
    }
    case "observacao":
      return { ...e, observacoes: { ...e.observacoes, [a.code]: a.texto.slice(0, 140) } };
    case "consumo":
      return { ...e, consumo: a.valor };

    case "enviar": {
      const linhas = linhasDoCarrinho(e);
      if (!linhas.length) return e;
      if (exigeLiberacao(m) && !e.liberada) return e;
      if (m === "totem" && !e.consumo) return e;
      // Idempotência: a mesma chave devolve o mesmo pedido, nunca cria outro.
      if (e.pedidos.some((p) => p.chave === a.chave)) return e;
      const antes = pagaAntes(m);
      const id = e.proximoId;
      const pedido: PedidoSim = {
        id,
        chave: a.chave,
        itens: linhas,
        status: antes ? "aguardando_pagamento" : "recebido",
        hora: ctx.agora(),
        senha: antes ? e.proximaSenha : undefined,
        cliente: a.cliente,
        consumo: m === "totem" ? (e.consumo ?? undefined) : undefined,
      };
      const qtd = linhas.reduce((s, l) => s + l.qtd, 0);
      const total = totalLinhas(linhas, ctx.cardapio);
      const texto = antes
        ? `Pedido #${id} · senha ${pedido.senha}: ${qtd} ${qtd === 1 ? "item" : "itens"} · ${brl(total)} · aguardando o caixa`
        : `Pedido #${id} da ${ctx.local}: ${qtd} ${qtd === 1 ? "item" : "itens"} · ${brl(total)} · foi para a cozinha`;
      return anotar(
        {
          ...e,
          pedidos: [...e.pedidos, pedido],
          carrinho: {},
          observacoes: {},
          proximoId: id + 1,
          proximaSenha: antes ? e.proximaSenha + 1 : e.proximaSenha,
        },
        ctx,
        texto,
      );
    }

    case "receber_externo": {
      if (m !== "delivery") return e;
      if (e.pedidos.some((p) => p.chave === a.chave)) return e;
      const id = e.proximoId;
      const pedido: PedidoSim = {
        id,
        chave: a.chave,
        itens: a.itens,
        status: "recebido",
        hora: ctx.agora(),
        cliente: a.cliente,
        origemExterna: a.origem,
      };
      return anotar(
        { ...e, pedidos: [...e.pedidos, pedido], proximoId: id + 1 },
        ctx,
        `Pedido #${id} recebido de ${a.origem} (${a.cliente}) · validado · foi para a cozinha`,
      );
    }

    case "cobrar": {
      const p = e.pedidos.find((x) => x.id === a.pedidoId);
      if (!p || p.status !== "aguardando_pagamento") return e;
      const total = totalLinhas(p.itens, ctx.cardapio);
      return anotar(
        {
          ...e,
          pedidos: e.pedidos.map((x) =>
            x.id === p.id ? { ...x, status: "recebido", pagamento: a.metodo } : x,
          ),
        },
        ctx,
        `Senha ${p.senha} paga (${brl(total)} em ${NOME_CAIXA[a.metodo]}) · foi para a cozinha`,
      );
    }

    case "avancar": {
      const p = e.pedidos.find((x) => x.id === a.pedidoId);
      if (!p) return e;
      let prox = PASSOS_STATUS[p.status].proximo;
      if (!prox) return e;
      // Delivery: pronto vira expedido (não "entregue na mesa").
      if (m === "delivery" && prox === "entregue") prox = "expedido";
      const novo = { ...e, pedidos: e.pedidos.map((x) => (x.id === p.id ? { ...x, status: prox! } : x)) };
      if (prox === "pronto") {
        const texto = p.senha
          ? `Senha ${p.senha} pronta · chamada no painel`
          : m === "delivery"
            ? `Pedido #${p.id} pronto para expedição`
            : `Pedido #${p.id} pronto · ${ctx.atendente} foi avisada`;
        return anotar(novo, ctx, texto);
      }
      if (prox === "expedido") return anotar(novo, ctx, `Pedido #${p.id} expedido para ${p.cliente ?? "o entregador"}`);
      if (prox === "entregue" && p.senha) return anotar(novo, ctx, `Senha ${p.senha} retirada`);
      return novo;
    }

    case "pagar_conta": {
      if (!pagaPeloPay(m)) return e;
      const c = conta(e, ctx);
      if (c.aPagar <= 0) return e;
      const texto =
        a.metodo === "estabelecimento"
          ? `${ctx.local} vai pagar ${brl(c.aPagar)} no estabelecimento · ${ctx.atendente} confirma no caixa`
          : `${ctx.local} pagou ${brl(c.aPagar)} com ${NOME_PAY[a.metodo]}`;
      return anotar(
        { ...e, pagoCentavos: e.pagoCentavos + c.aPagar, ultimoPagamento: { valor: c.aPagar, metodo: a.metodo } },
        ctx,
        texto,
      );
    }

    case "gorjeta": {
      if (!e.ultimoPagamento) return e;
      if (a.valor === null) return { ...e, gorjetaExtra: 0 };
      // Mínimo R$ 2,00, máximo o valor pago; 70% para quem atendeu, 30% para a Tipe.
      if (a.valor < 200 || a.valor > e.ultimoPagamento.valor) return e;
      const garcom = Math.round(a.valor * 0.7);
      return anotar(
        { ...e, gorjetaExtra: a.valor },
        ctx,
        `Gorjeta extra de ${brl(a.valor)} (segundo pagamento): ${brl(garcom)} para ${ctx.atendente}`,
      );
    }

    case "localizar": {
      if (m !== "pulseira" || !e.liberada) return e;
      const hora = ctx.agora();
      return anotar(
        { ...e, localizacao: { setor: a.setor, precisaoM: a.precisaoM, hora } },
        ctx,
        `Rafael compartilhou a localização: ${a.setor} (precisão ~${a.precisaoM} m, ${hora})`,
      );
    }
  }
}

/** Passo da jornada para a dica contextual (0..4). */
export function passoAtual(e: EstadoSim, ctx: Contexto): number {
  const temPedido = e.pedidos.length > 0;
  if (exigeLiberacao(e.modalidade) && !e.liberada && !temPedido) return 0;
  if (!temPedido) return 1;
  if (pagaAntes(e.modalidade)) {
    if (e.pedidos.some((p) => p.status === "aguardando_pagamento")) return 2;
    if (e.pedidos.some((p) => p.status === "recebido" || p.status === "preparando")) return 3;
    return 4;
  }
  if (e.modalidade === "delivery") {
    if (e.pedidos.some((p) => p.status !== "expedido")) return 2;
    return 4;
  }
  const c = conta(e, ctx);
  if (e.pedidos.some((p) => p.status !== "entregue") && e.pagoCentavos === 0) return 2;
  if (c.aPagar > 0) return 3;
  return 4;
}
